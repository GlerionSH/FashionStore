import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/database/supabaseServer';
import { sendReturnReviewedEmail } from '../../../../../lib/services/returnEmail';

export const prerender = false;

const json = (status: number, data: unknown) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const POST: APIRoute = async ({ params, request }) => {
	const adminSb = getSupabaseAdmin();
	if (!adminSb) {
		return json(500, { error: 'supabase_not_configured' });
	}

	const returnId = params.returnId;
	if (!returnId) {
		return json(400, { error: 'returnId_required' });
	}

	let body: { action?: string; notes?: string };
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'invalid_json' });
	}

	const { action, notes } = body;

	if (!action || !['approve', 'reject'].includes(action)) {
		return json(400, { error: 'action_must_be_approve_or_reject' });
	}

	// Load return (with order email + items for email)
	const { data: ret, error: loadError } = await (adminSb as any)
		.from('fs_returns')
		.select(
			'id,order_id,status,reason,notes,requested_at,fs_orders(id,email),fs_return_items(qty,line_total_cents,fs_order_items(name,size))'
		)
		.eq('id', returnId)
		.maybeSingle();

	if (loadError) {
		console.error('[admin/returns/review] load error', loadError);
		return json(500, { error: 'return_load_failed' });
	}

	if (!ret) {
		return json(404, { error: 'return_not_found' });
	}

	if (ret.status !== 'requested') {
		return json(400, { error: 'return_not_in_requested_status', current_status: ret.status });
	}

	const newStatus = action === 'approve' ? 'approved' : 'rejected';

	const { error: updateError } = await (adminSb as any)
		.from('fs_returns')
		.update({
			status: newStatus,
			reviewed_at: new Date().toISOString(),
			reviewed_by: 'admin', // Could be admin email if available
			notes: notes?.trim() || null,
		})
		.eq('id', returnId);

	if (updateError) {
		console.error('[admin/returns/review] update error', updateError);
		return json(500, { error: 'return_update_failed' });
	}

	// Send email (non-fatal). Dedupe is enforced by status transition requested -> (approved|rejected).
	try {
		const to = ret.fs_orders?.email ?? null;
		if (to) {
			const itemsForEmail = (ret.fs_return_items ?? []).map((ri: any) => ({
				name: ri.fs_order_items?.name ?? 'Producto',
				size: ri.fs_order_items?.size ?? null,
				qty: ri.qty,
				line_total_cents: ri.line_total_cents,
			}));

			await sendReturnReviewedEmail({
				to,
				ret: {
					id: ret.id,
					order_id: ret.order_id,
					status: newStatus,
					reason: ret.reason ?? null,
					notes: notes?.trim() || null,
				},
				items: itemsForEmail,
				order: { id: ret.order_id, email: to },
				action: action as any,
				reason: action === 'reject' ? (notes?.trim() || null) : null,
			});

			const { error: flagError } = await (adminSb as any)
				.from('fs_returns')
				.update({ email_sent_reviewed_at: new Date().toISOString() })
				.eq('id', returnId);
			if (flagError) {
				console.error('[admin/returns/review] email flag update error (non-fatal)', flagError);
			}
		}
	} catch (emailErr) {
		console.error('[admin/returns/review] email error (non-fatal)', emailErr);
	}

	console.info('[admin/returns/review]', { returnId, action, newStatus });

	return json(200, { ok: true, status: newStatus });
};
