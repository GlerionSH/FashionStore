import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { getEnv } from '../../../../lib/env';

export const prerender = false;

type OrderRow = {
	id: string;
	email: string | null;
	subtotal_cents: number;
	discount_cents: number;
	total_cents: number;
	paid_at: string | null;
	invoice_number: string | null;
	invoice_issued_at: string | null;
	invoice_token: string | null;
};

type OrderItemRow = {
	name: string;
	qty: number;
	size: string | null;
	price_cents: number;
	line_total_cents: number;
};

const formatEURFromCents = (cents: number) =>
	new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);

const formatDate = (iso: string | null) => {
	if (!iso) return '';
	try {
		return new Date(iso).toLocaleDateString('es-ES');
	} catch {
		return '';
	}
};

const toPdfBuffer = (doc: PDFKit.PDFDocument) =>
	new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);
		doc.end();
	});

const drawInvoicePdf = (order: OrderRow, items: OrderItemRow[]) => {
	const doc = new PDFDocument({ size: 'A4', margin: 50 });

	// Layout constants
	const M = 50;
	const pageW = doc.page.width;
	const contentW = pageW - M * 2;

	// Column widths (total = 530 on A4 with 50pt margin)
	const col = { product: 260, size: 60, qty: 50, price: 80, amount: 80 };
	const tableX = M;

	// Column X positions (calculated from sums)
	const xProduct = tableX;
	const xSize = xProduct + col.product;
	const xQty = xSize + col.size;
	const xPrice = xQty + col.qty;
	const xAmount = xPrice + col.price;

	// ─────────────── HEADER ───────────────
	doc.font('Helvetica-Bold').fontSize(20).fillColor('#111111');
	doc.text('FASHION STORE', M, M, { width: contentW, align: 'left' });

	doc.font('Helvetica').fontSize(11).fillColor('#6b7280');
	doc.text('FACTURA', M, M, { width: contentW, align: 'right' });

	doc.moveDown(1.5);
	doc.moveTo(M, doc.y).lineTo(M + contentW, doc.y).lineWidth(0.5).strokeColor('#d1d5db').stroke();
	doc.moveDown(1.5);

	// ─────────────── INFO CARDS ───────────────
	const cardGap = 16;
	const cardW = (contentW - cardGap) / 2;
	const cardH = 90;
	const cardY = doc.y;

	const drawCard = (x: number, title: string, lines: Array<[string, string]>) => {
		doc.save();
		doc.roundedRect(x, cardY, cardW, cardH, 8).fillAndStroke('#f9fafb', '#e5e7eb');
		doc.fillColor('#111111').font('Helvetica-Bold').fontSize(10).text(title, x + 14, cardY + 12);
		let ly = cardY + 30;
		for (const [label, value] of lines) {
			doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text(label, x + 14, ly);
			doc.fillColor('#111111').font('Helvetica').fontSize(10).text(value, x + 14, ly + 11, { width: cardW - 28 });
			ly += 28;
		}
		doc.restore();
	};

	drawCard(M, 'Datos de factura', [
		['Número', order.invoice_number ?? order.id],
		['Fecha', formatDate(order.invoice_issued_at || order.paid_at)],
	]);
	drawCard(M + cardW + cardGap, 'Cliente', [['Email', order.email ?? '—']]);

	doc.y = cardY + cardH + 24;

	// ─────────────── TABLE HEADER ───────────────
	const drawTableHeader = () => {
		const headerY = doc.y;
		doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280');

		doc.text('Producto', xProduct, headerY, { width: col.product });
		doc.text('Talla', xSize, headerY, { width: col.size, align: 'center' });
		doc.text('Cant.', xQty, headerY, { width: col.qty, align: 'center' });
		doc.text('Precio', xPrice, headerY, { width: col.price, align: 'right' });
		doc.text('Importe', xAmount, headerY, { width: col.amount, align: 'right' });

		doc.y = headerY + 14;
		doc.moveTo(tableX, doc.y).lineTo(tableX + contentW, doc.y).lineWidth(0.5).strokeColor('#d1d5db').stroke();
		doc.y += 8;
	};

	drawTableHeader();

	// ─────────────── TABLE ROWS ───────────────
	const minRowH = 20;
	const cellPadY = 5;
	let rowIdx = 0;

	for (const it of items) {
		// Calculate row height based on product name wrap
		doc.font('Helvetica').fontSize(10);
		const productText = it.name || 'Producto';
		const productH = doc.heightOfString(productText, { width: col.product - 4 });
		const rowH = Math.max(minRowH, productH) + cellPadY * 2;

		// Page break if needed (leave space for totals box ~120pt)
		if (doc.y + rowH > doc.page.height - M - 120) {
			doc.addPage();
			doc.y = M;
			drawTableHeader();
		}

		const rowTop = doc.y;

		// Zebra stripe
		if (rowIdx % 2 === 1) {
			doc.save();
			doc.rect(tableX, rowTop, contentW, rowH).fill('#f9fafb');
			doc.restore();
		}

		// Draw row content
		doc.font('Helvetica').fontSize(10).fillColor('#111111');

		// Product (left, wrap)
		doc.text(productText, xProduct, rowTop + cellPadY, { width: col.product - 4 });

		// Size (center)
		const sizeText = it.size ?? '—';
		doc.text(sizeText, xSize, rowTop + cellPadY, { width: col.size, align: 'center' });

		// Qty (center)
		doc.text(String(it.qty), xQty, rowTop + cellPadY, { width: col.qty, align: 'center' });

		// Price (right)
		doc.text(formatEURFromCents(it.price_cents), xPrice, rowTop + cellPadY, { width: col.price, align: 'right' });

		// Amount (right)
		doc.text(formatEURFromCents(it.line_total_cents), xAmount, rowTop + cellPadY, { width: col.amount, align: 'right' });

		doc.y = rowTop + rowH;
		rowIdx++;
	}

	// Bottom border of table
	doc.moveTo(tableX, doc.y).lineTo(tableX + contentW, doc.y).lineWidth(0.5).strokeColor('#d1d5db').stroke();
	doc.y += 20;

	// ─────────────── TOTALS BOX ───────────────
	const boxW = 200;
	const boxH = 90;

	// Page break if totals box won't fit
	if (doc.y + boxH > doc.page.height - M) {
		doc.addPage();
		doc.y = M;
	}

	const boxX = tableX + contentW - boxW;
	const boxY = doc.y;

	doc.save();
	doc.roundedRect(boxX, boxY, boxW, boxH, 8).fillAndStroke('#f9fafb', '#e5e7eb');
	doc.restore();

	const drawTotalLine = (label: string, value: string, y: number, bold = false) => {
		const font = bold ? 'Helvetica-Bold' : 'Helvetica';
		const fontSize = bold ? 11 : 10;
		doc.font(font).fontSize(fontSize).fillColor('#111111');
		doc.text(label, boxX + 14, y, { width: boxW - 28, align: 'left', continued: false });
		doc.text(value, boxX + 14, y, { width: boxW - 28, align: 'right' });
	};

	drawTotalLine('Subtotal', formatEURFromCents(order.subtotal_cents), boxY + 16);
	const discountText = order.discount_cents > 0 ? '−' + formatEURFromCents(order.discount_cents) : formatEURFromCents(0);
	drawTotalLine('Descuento', discountText, boxY + 38);
	drawTotalLine('Total', formatEURFromCents(order.total_cents), boxY + 60, true);

	return doc;
};

export const GET: APIRoute = async ({ params, request }) => {
	const orderId = params.orderId;
	const token = new URL(request.url).searchParams.get('token');

	if (!orderId) {
		return new Response('Missing orderId', { status: 400 });
	}
	if (!token) {
		return new Response('Missing token', { status: 400 });
	}

	const supabaseUrl = getEnv('SUPABASE_URL') ?? getEnv('PUBLIC_SUPABASE_URL');
	const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

	if (!supabaseUrl || !serviceRoleKey) {
		return new Response('Supabase not configured', { status: 500 });
	}

	const adminSb = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false },
	});

	const { data: order, error: orderError } = await adminSb
		.from('fs_orders')
		.select('id,email,subtotal_cents,discount_cents,total_cents,paid_at,invoice_number,invoice_issued_at,invoice_token')
		.eq('id', orderId)
		.maybeSingle();

	if (orderError) {
		return new Response('Error loading order', { status: 500 });
	}
	if (!order?.id) {
		return new Response('Order not found', { status: 404 });
	}
	if (!order.invoice_token || order.invoice_token !== token) {
		return new Response('Forbidden', { status: 403 });
	}

	const { data: items, error: itemsError } = await adminSb
		.from('fs_order_items')
		.select('name,qty,size,price_cents,line_total_cents')
		.eq('order_id', orderId)
		.order('created_at', { ascending: true });

	if (itemsError) {
		return new Response('Error loading items', { status: 500 });
	}

	const doc = drawInvoicePdf(order as OrderRow, Array.isArray(items) ? (items as OrderItemRow[]) : []);
	const pdf = await toPdfBuffer(doc);
	const pdfBody = new Uint8Array(pdf);

	const fileNameSafe = (order.invoice_number || order.id).replace(/[^a-zA-Z0-9_-]+/g, '_');

	return new Response(pdfBody, {
		status: 200,
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="factura-${fileNameSafe}.pdf"`,
			'Cache-Control': 'no-store, max-age=0',
		},
	});
};
