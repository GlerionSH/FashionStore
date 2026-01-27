import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/database/supabaseServer';

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

	// Load return
	const { data: ret, error: loadError } = await (adminSb as any)
		.from('fs_returns')
		.select('id,status')
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

	console.info('[admin/returns/review]', { returnId, action, newStatus });

	return json(200, { ok: true, status: newStatus });
};
