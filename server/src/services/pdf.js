import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_LIGHT = path.resolve(__dirname, '..', '..', 'assets', 'logo-light.png');

const BRAND = '#1f3a5f';
const ACCENT = '#c79a3a';

/**
 * Generate an RFQ PDF for a vendor and stream it to `res`.
 * data = { requirement, items, vendor, dueDate, link, fromName }
 */
export function streamRfqPdf(res, data) {
  const { requirement, items, vendor, dueDate, link, fromName } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="RFQ-${requirement.ref_no}-${slug(vendor.name)}.pdf"`
  );
  doc.pipe(res);

  // Header band with the D'Decor logo
  doc.rect(0, 0, doc.page.width, 84).fill(BRAND);
  let headerTextX = 48;
  if (fs.existsSync(LOGO_LIGHT)) {
    try { doc.image(LOGO_LIGHT, 48, 26, { height: 30 }); headerTextX = 48; } catch { /* ignore */ }
  }
  doc.fill('#ffffff').fontSize(12).font('Helvetica-Bold')
    .text('Yarn Procurement · Request for Quotation', doc.page.width - 320, 34, { width: 272, align: 'right' });
  doc.fillColor('#000');

  let y = 110;
  doc.fontSize(10).font('Helvetica');
  const leftCol = 48;
  const rightCol = 320;

  doc.font('Helvetica-Bold').text('RFQ Ref:', leftCol, y);
  doc.font('Helvetica').text(requirement.ref_no, leftCol + 70, y);
  doc.font('Helvetica-Bold').text('Date:', rightCol, y);
  doc.font('Helvetica').text(new Date().toLocaleDateString('en-IN'), rightCol + 70, y);
  y += 16;

  doc.font('Helvetica-Bold').text('To (Vendor):', leftCol, y);
  doc.font('Helvetica').text(vendor.name, leftCol + 70, y);
  doc.font('Helvetica-Bold').text('Quote by:', rightCol, y);
  doc.font('Helvetica').text(dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : '—', rightCol + 70, y);
  y += 16;

  doc.font('Helvetica-Bold').text('Subject:', leftCol, y);
  doc.font('Helvetica').text(requirement.title, leftCol + 70, y, { width: 460 });
  y += 28;

  doc.fontSize(10).fillColor('#333').font('Helvetica')
    .text(
      `Dear ${vendor.contact_person || vendor.name},\n\nPlease quote your best rates for the following yarn requirement. ` +
      `Kindly mention price per Kg, applicable GST, lead time and payment terms against each item.`,
      leftCol, y, { width: 500 }
    );
  y = doc.y + 14;

  // Items table
  const cols = [
    { key: 'line', label: '#', w: 24 },
    { key: 'mat_code', label: 'Mat Code', w: 90 },
    { key: 'description', label: 'Description', w: 210 },
    { key: 'qty', label: 'Qty (Kg)', w: 70, align: 'right' },
    { key: 'price', label: 'Your Price/Kg', w: 105, align: 'right' },
  ];
  const tableX = leftCol;
  const rowH = 22;

  function drawRow(cells, opts = {}) {
    let x = tableX;
    if (opts.head) doc.rect(tableX, y, sum(cols.map((c) => c.w)), rowH).fill(BRAND);
    else if (opts.zebra) doc.rect(tableX, y, sum(cols.map((c) => c.w)), rowH).fill('#f3f5f8');
    doc.fillColor(opts.head ? '#ffffff' : '#000').font(opts.head ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    cols.forEach((c, i) => {
      doc.text(String(cells[i] ?? ''), x + 4, y + 6, { width: c.w - 8, align: c.align || 'left' });
      x += c.w;
    });
    doc.fillColor('#000');
    y += rowH;
  }

  drawRow(cols.map((c) => c.label), { head: true });
  items.forEach((it, idx) => {
    if (y > doc.page.height - 120) { doc.addPage(); y = 60; drawRow(cols.map((c) => c.label), { head: true }); }
    drawRow(
      [idx + 1, it.mat_code || '', it.description || '', fmt(it.required_qty_kg), ''],
      { zebra: idx % 2 === 0 }
    );
  });

  y += 18;
  doc.fontSize(10).font('Helvetica-Bold').fillColor(ACCENT).text('Please also confirm:', leftCol, y);
  doc.fillColor('#333').font('Helvetica').fontSize(10);
  y = doc.y + 4;
  ['Lead time (days) for delivery', 'Payment terms', 'Quote validity', 'Applicable certifications (Oeko-Tex / GOTS / GRS)'].forEach((t) => {
    doc.text('•  ' + t, leftCol + 8, y); y = doc.y + 2;
  });

  if (link) {
    y = doc.y + 14;
    doc.rect(leftCol, y, 500, 50).fill('#eef3fb');
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(10)
      .text('Submit your quote online (fastest):', leftCol + 12, y + 8);
    doc.fillColor('#1155cc').font('Helvetica').fontSize(9)
      .text(link, leftCol + 12, y + 26, { width: 476, link, underline: true });
    doc.fillColor('#000');
    y += 64;
  }

  doc.moveDown(2);
  doc.fillColor('#333').fontSize(10).font('Helvetica')
    .text(`Regards,\n${fromName || 'Yarn Procurement Team'}\nD'Decor Home Fabrics`, leftCol, doc.y + 8);

  doc.end();
}

const slug = (s) => String(s).replace(/[^a-z0-9]+/gi, '_').slice(0, 24);
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('en-IN'));
