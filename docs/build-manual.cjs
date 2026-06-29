/* Generates the D'Decor Yarn Procurement Portal — User Manual (PDF).
   User-facing only (no tech/deploy details). Branded with the D'Decor logo and
   illustrative screen mockups. Run:  node docs/build-manual.cjs            */

const fs = require('fs');
const path = require('path');
const PDFDocument = require(path.join(__dirname, '..', 'server', 'node_modules', 'pdfkit'));

const ROOT = path.join(__dirname, '..');
const LOGO_LIGHT = path.join(ROOT, 'client', 'public', 'logo-light.png'); // for dark backgrounds
const LOGO_DARK = path.join(ROOT, 'client', 'public', 'logo-dark.png');   // for light backgrounds
const OUT = path.join(__dirname, 'Yarn-Procurement-Portal-User-Manual.pdf');

// ---- palette (brand) ------------------------------------------------------
const C = {
  ink: '#15203B', indigo: '#22335B', indigoD: '#1A2848', indigoXD: '#131E38',
  marigold: '#C8932A', marigoldD: '#A9791E', sage: '#2F7D5B', clay: '#B5462E',
  paper: '#F4F5F8', surface2: '#EEF1F8', line: '#E4E7EE',
  slate: '#64748B', slate4: '#94A3B8', white: '#FFFFFF', purple: '#2A1E4D',
};

const doc = new PDFDocument({ size: 'A4', margin: 54, autoFirstPage: false, bufferPages: true,
  info: { Title: "D'Decor Yarn Procurement Portal — User Manual", Author: "D'Decor" } });
doc.pipe(fs.createWriteStream(OUT));

const PW = doc.page ? doc.page.width : 595.28;
const W = 595.28, H = 841.89, M = 54, CW = W - M * 2;
const TOP = 78, BOTTOM = H - 64;

const F = { reg: 'Helvetica', bold: 'Helvetica-Bold', it: 'Helvetica-Oblique' };

let coverMode = true;
let pageNum = 0;
let inChrome = false;

function chrome() {
  inChrome = true;
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0; // don't let footer text trigger a page break
  // header
  try { doc.image(LOGO_DARK, M, 30, { height: 13 }); } catch (e) {}
  doc.font(F.bold).fontSize(7.5).fillColor(C.slate4)
     .text('YARN PROCUREMENT PORTAL', M + 90, 33, { characterSpacing: 1.5, lineBreak: false });
  doc.moveTo(M, 52).lineTo(W - M, 52).lineWidth(0.6).strokeColor(C.line).stroke();
  // footer
  doc.moveTo(M, H - 44).lineTo(W - M, H - 44).lineWidth(0.6).strokeColor(C.line).stroke();
  doc.font(F.reg).fontSize(8).fillColor(C.slate4)
     .text("D'Decor  ·  Yarn Sourcing Desk", M, H - 38, { width: CW, align: 'left', lineBreak: false });
  doc.font(F.reg).fontSize(8).fillColor(C.slate4)
     .text('User Manual  ·  Page ' + pageNum, M, H - 38, { width: CW, align: 'right', lineBreak: false });
  doc.fillColor(C.ink);
  doc.page.margins.bottom = savedBottom;
  inChrome = false;
}

doc.on('pageAdded', () => { if (coverMode || inChrome) return; pageNum++; chrome(); doc.x = M; doc.y = TOP; });

// ---- helpers --------------------------------------------------------------
function ensure(h) { if (doc.y + h > BOTTOM) doc.addPage(); }
function gap(h = 10) { doc.y += h; }

function h1(text, kicker) {
  ensure(80);
  if (kicker) doc.font(F.bold).fontSize(8.5).fillColor(C.marigoldD).text(kicker.toUpperCase(), { characterSpacing: 1.4 });
  doc.font(F.bold).fontSize(20).fillColor(C.ink).text(text, { lineGap: 1 });
  doc.moveTo(M, doc.y + 4).lineTo(M + 48, doc.y + 4).lineWidth(2.5).strokeColor(C.marigold).stroke();
  gap(16);
}
function h2(text) {
  ensure(40); gap(4);
  doc.font(F.bold).fontSize(13).fillColor(C.indigo).text(text);
  gap(6);
}
function p(text, opts = {}) {
  ensure(26);
  doc.font(opts.bold ? F.bold : F.reg).fontSize(opts.size || 10.5).fillColor(opts.color || '#33404F')
     .text(text, { align: opts.align || 'left', lineGap: 3, width: CW });
  gap(opts.gap == null ? 8 : opts.gap);
}
function bullet(text, opts = {}) {
  ensure(22);
  const x = M + 4, y = doc.y + 4;
  doc.circle(x + 2, y + 3, 1.8).fillColor(opts.dot || C.marigold).fill();
  doc.font(F.reg).fontSize(10).fillColor('#33404F')
     .text(text, x + 14, doc.y, { width: CW - 18, lineGap: 2.5 });
  gap(6);
}
function numStep(n, title, text) {
  ensure(40);
  const y = doc.y;
  doc.circle(M + 9, y + 9, 9).fillColor(C.indigo).fill();
  doc.font(F.bold).fontSize(10).fillColor(C.white).text(String(n), M, y + 4.5, { width: 18, align: 'center' });
  doc.font(F.bold).fontSize(11).fillColor(C.ink).text(title, M + 26, y + 1, { width: CW - 26 });
  doc.font(F.reg).fontSize(10).fillColor('#33404F').text(text, M + 26, doc.y + 1, { width: CW - 26, lineGap: 2.5 });
  gap(12);
}
function callout(title, text, tone = 'indigo') {
  const map = { indigo: [C.surface2, C.indigo], gold: ['#FBF4E4', C.marigoldD], sage: ['#E8F3EC', C.sage] };
  const [bg, bar] = map[tone] || map.indigo;
  doc.font(F.reg).fontSize(9.8);
  const th = doc.heightOfString(text, { width: CW - 34, lineGap: 2.5 });
  const boxH = th + (title ? 30 : 20);
  ensure(boxH + 8);
  const y = doc.y;
  doc.roundedRect(M, y, CW, boxH, 7).fillColor(bg).fill();
  doc.rect(M, y, 4, boxH).fillColor(bar).fill();
  let ty = y + 11;
  if (title) { doc.font(F.bold).fontSize(10).fillColor(bar).text(title, M + 16, ty); ty = doc.y + 2; }
  doc.font(F.reg).fontSize(9.8).fillColor('#3A4658').text(text, M + 16, ty, { width: CW - 34, lineGap: 2.5 });
  doc.y = y + boxH; gap(12);
}

// ---- screen mockup ("dummy screenshot") -----------------------------------
function mockup(caption, variant) {
  const boxW = CW, boxH = 232;
  ensure(boxH + 26);
  const x = M, y = doc.y;
  // window
  doc.roundedRect(x, y, boxW, boxH, 9).fillColor(C.white).strokeColor(C.line).lineWidth(1).fillAndStroke();
  // title bar
  doc.roundedRect(x, y, boxW, 22, 9).fillColor('#F1F3F8').fill();
  doc.rect(x, y + 12, boxW, 10).fillColor('#F1F3F8').fill();
  [0, 1, 2].forEach((i) => doc.circle(x + 14 + i * 11, y + 11, 3).fillColor(['#E0738B', '#E6C15A', '#5FB98A'][i]).fill());
  doc.roundedRect(x + 60, y + 6, boxW - 200, 11, 5).fillColor('#E6E9F1').fill();
  doc.font(F.reg).fontSize(6.5).fillColor(C.slate4).text('yp.ddecor.com', x + 68, y + 8.5);
  // sidebar (gradient-ish: two bands)
  const sbW = 96, sbX = x, sbY = y + 22, sbH = boxH - 22;
  doc.rect(sbX, sbY, sbW, sbH).fillColor(C.indigoD).fill();
  doc.rect(sbX, sbY + sbH * 0.6, sbW, sbH * 0.4).fillColor(C.indigoXD).fill();
  try { doc.image(LOGO_LIGHT, sbX + 12, sbY + 12, { height: 12 }); } catch (e) {}
  ['Dashboard', 'Requirements', 'Vendors', 'Yarn & Prices', 'Awards'].forEach((t, i) => {
    const ny = sbY + 36 + i * 20;
    if (i === (variant === 'compare' ? 1 : 0)) {
      doc.save().fillColor(C.white).fillOpacity(0.14).roundedRect(sbX + 8, ny - 3, sbW - 16, 16, 4).fill().restore();
    }
    doc.font(F.reg).fontSize(7).fillColor('#C7D0E6').text(t, sbX + 14, ny);
  });
  // content area
  const cX = sbX + sbW + 16, cY = sbY + 14, cW = boxW - sbW - 32;
  doc.font(F.bold).fontSize(11).fillColor(C.ink).text(mockTitle(variant), cX, cY, { width: cW });
  const innerY = cY + 22;
  drawVariant(variant, cX, innerY, cW, sbY + sbH - innerY - 14);
  // caption
  doc.y = y + boxH + 7;
  doc.font(F.it).fontSize(8.5).fillColor(C.slate4).text('Illustration:  ' + caption, M, doc.y, { width: CW, align: 'center' });
  gap(16);
  doc.fillColor(C.ink);
}
function mockTitle(v) {
  return ({ dashboard: 'Dashboard', form: 'New Requirement', compare: 'Quote Comparison',
    portal: 'Vendor Quote — D\'Decor', vendors: 'Vendor Master', login: 'Sign in' })[v] || 'Portal';
}
function pill(x, y, w, label, fill, txt) {
  doc.roundedRect(x, y, w, 12, 6).fillColor(fill).fill();
  doc.font(F.bold).fontSize(6.5).fillColor(txt).text(label, x, y + 3.2, { width: w, align: 'center' });
}
function bar(x, y, w, h, col) { doc.roundedRect(x, y, w, h, 2).fillColor(col).fill(); }
function drawVariant(v, x, y, w, h) {
  if (v === 'dashboard') {
    const cardW = (w - 24) / 4;
    ['Pending', 'Quoting', 'To Award', 'Savings'].forEach((t, i) => {
      const cx = x + i * (cardW + 8);
      doc.roundedRect(cx, y, cardW, 40, 5).fillColor(C.surface2).fill();
      doc.rect(cx, y, 3, 40).fillColor([C.marigold, C.indigo, C.sage, C.marigoldD][i]).fill();
      doc.font(F.reg).fontSize(6).fillColor(C.slate).text(t, cx + 8, y + 7);
      doc.font(F.bold).fontSize(13).fillColor(C.ink).text(String([3, 5, 2, 'Rs1.2L'][i]), cx + 8, y + 16);
    });
    // chart placeholder
    const gy = y + 52;
    doc.roundedRect(x, gy, w, h - 56, 5).fillColor('#FBFCFE').strokeColor(C.line).fillAndStroke();
    doc.font(F.reg).fontSize(7).fillColor(C.slate4).text('Yarn market price trend', x + 8, gy + 6);
    // fake line
    doc.lineWidth(1.5).strokeColor(C.indigo);
    let px = x + 10, py = gy + (h - 56) - 14;
    doc.moveTo(px, py);
    [0.3, -0.5, 0.2, -0.7, 0.4, -0.3, 0.5].forEach((d, i) => { px += (w - 20) / 7; py += d * 18; doc.lineTo(px, py); });
    doc.stroke();
  } else if (v === 'form') {
    ['Title of requirement', 'Material / yarn code', 'Required quantity (Kg)', 'Needed by'].forEach((t, i) => {
      const fy = y + i * 26;
      doc.font(F.reg).fontSize(6.5).fillColor(C.slate).text(t.toUpperCase(), x, fy);
      doc.roundedRect(x, fy + 9, w * (i === 2 ? 0.5 : 0.9), 12, 3).fillColor('#FBFCFE').strokeColor(C.line).fillAndStroke();
    });
    pill(x, y + 4 * 26 + 2, 70, 'SUBMIT', C.marigold, C.white);
  } else if (v === 'compare') {
    const cols = ['Gimatex', 'RSWM', 'Nitin'];
    const cw = (w - 16) / 3;
    cols.forEach((c, i) => {
      const cx = x + i * (cw + 8);
      const best = i === 0;
      doc.roundedRect(cx, y, cw, h - 6, 5).fillColor(best ? '#FBF4E4' : '#FBFCFE')
         .strokeColor(best ? C.marigold : C.line).lineWidth(best ? 1.3 : 1).fillAndStroke();
      if (best) pill(cx + 8, y + 6, 54, 'BEST', C.marigold, C.white);
      doc.font(F.bold).fontSize(8).fillColor(C.ink).text(c, cx + 8, y + (best ? 22 : 8));
      doc.font(F.reg).fontSize(6.5).fillColor(C.slate).text('Rs ' + [175, 180, 185][i] + '/Kg', cx + 8, y + (best ? 34 : 20));
      bar(cx + 8, y + (best ? 48 : 34), cw - 16, 5, best ? C.sage : '#D9DEE8');
      doc.font(F.reg).fontSize(6).fillColor(C.slate4).text('Lead ' + [15, 20, 25][i] + 'd · ' + [4.5, 4.0, 3.8][i] + ' / 5', cx + 8, y + (best ? 58 : 44));
    });
  } else if (v === 'portal') {
    doc.font(F.reg).fontSize(7).fillColor(C.slate).text('Please enter your best rates:', x, y);
    ['2/30 Spun Polyester — 5,000 Kg', '1/30 Combed Cotton — 2,000 Kg'].forEach((t, i) => {
      const fy = y + 16 + i * 30;
      doc.roundedRect(x, fy, w, 26, 4).fillColor('#FBFCFE').strokeColor(C.line).fillAndStroke();
      doc.font(F.reg).fontSize(6.8).fillColor(C.ink).text(t, x + 8, fy + 5);
      doc.roundedRect(x + w - 92, fy + 4, 40, 16, 3).fillColor(C.white).strokeColor(C.line).fillAndStroke();
      doc.font(F.reg).fontSize(6).fillColor(C.slate4).text('Rs/Kg', x + w - 86, fy + 9);
      doc.roundedRect(x + w - 48, fy + 4, 40, 16, 3).fillColor(C.white).strokeColor(C.line).fillAndStroke();
      doc.font(F.reg).fontSize(6).fillColor(C.slate4).text('GST%', x + w - 42, fy + 9);
    });
    pill(x, y + 16 + 2 * 30 + 4, 90, 'SUBMIT QUOTE', C.sage, C.white);
  } else if (v === 'vendors') {
    for (let i = 0; i < 3; i++) {
      const cw = (w - 16) / 3, cx = x + i * (cw + 8);
      doc.roundedRect(cx, y, cw, h - 6, 5).fillColor('#FBFCFE').strokeColor(C.line).fillAndStroke();
      doc.font(F.bold).fontSize(7.5).fillColor(C.ink).text(['Gimatex', 'RSWM', 'Nitin'][i], cx + 8, y + 8);
      doc.font(F.reg).fontSize(7).fillColor(C.marigold).text('Rating 4.5 / 5', cx + 8, y + 20);
      pill(cx + 8, y + h - 26, cw - 16, ['OEKO-TEX', 'GOTS', 'GRS'][i], C.surface2, C.indigo);
    }
  } else if (v === 'login') {
    doc.font(F.reg).fontSize(7).fillColor(C.slate).text('Email', x, y);
    doc.roundedRect(x, y + 10, w * 0.7, 13, 3).fillColor('#FBFCFE').strokeColor(C.line).fillAndStroke();
    doc.font(F.reg).fontSize(7).fillColor(C.slate).text('Password', x, y + 32);
    doc.roundedRect(x, y + 42, w * 0.7, 13, 3).fillColor('#FBFCFE').strokeColor(C.line).fillAndStroke();
    pill(x, y + 64, 64, 'SIGN IN', C.indigo, C.white);
  }
  doc.fillColor(C.ink);
}

// ---- role card ------------------------------------------------------------
function roleCards(list) {
  const colW = (CW - 12) / 2;
  let i = 0;
  while (i < list.length) {
    ensure(78);
    const rowY = doc.y;
    for (let c = 0; c < 2 && i < list.length; c++, i++) {
      const r = list[i];
      const x = M + c * (colW + 12);
      doc.roundedRect(x, rowY, colW, 70, 7).fillColor(C.white).strokeColor(C.line).lineWidth(1).fillAndStroke();
      doc.rect(x, rowY, 4, 70).fillColor(r.color).fill();
      doc.font(F.bold).fontSize(11).fillColor(C.ink).text(r.name, x + 14, rowY + 11, { width: colW - 22 });
      doc.font(F.reg).fontSize(8.8).fillColor(C.slate).text(r.does, x + 14, rowY + 28, { width: colW - 24, lineGap: 2 });
    }
    doc.y = rowY + 70; gap(12);
  }
}

// ===========================================================================
//  COVER
// ===========================================================================
doc.addPage();
doc.rect(0, 0, W, H).fillColor(C.indigoXD).fill();
doc.rect(0, 0, W, H * 0.52).fillColor(C.purple).fill();
doc.rect(0, H * 0.52, W, H * 0.48).fillColor(C.indigoXD).fill();
// faint vertical hairlines texture
doc.save(); doc.opacity(0.06);
for (let gx = 40; gx < W; gx += 26) doc.moveTo(gx, 0).lineTo(gx, H).lineWidth(1).strokeColor('#FFFFFF').stroke();
doc.opacity(1); doc.restore();
try { doc.image(LOGO_LIGHT, M, 90, { width: 168 }); } catch (e) {}
doc.font(F.bold).fontSize(9).fillColor('#D9B86A').text('YARN SOURCING DESK', M, 250, { characterSpacing: 2 });
doc.font(F.bold).fontSize(40).fillColor(C.white).text('Yarn Procurement', M, 280, { lineGap: -4 });
doc.font(F.bold).fontSize(40).fillColor(C.white).text('Portal', M);
doc.font(F.reg).fontSize(15).fillColor('#B9C2DC').text('User Manual', M, doc.y + 8);
doc.moveTo(M, 430).lineTo(M + 60, 430).lineWidth(3).strokeColor(C.marigold).stroke();
doc.font(F.reg).fontSize(11).fillColor('#AEB8D4')
   .text('From requirement to the right vendor — one clear thread.\nRaise · Approve · Send RFQ · Compare · Award.',
     M, 448, { width: 360, lineGap: 4 });
doc.font(F.reg).fontSize(9).fillColor('#8C97B8')
   .text("D'Decor Exports Pvt. Ltd.   ·   Yarn Procurement Portal   ·   Edition 1.0", M, H - 90, { width: CW });
doc.font(F.reg).fontSize(8).fillColor('#6E7899').text('Confidential — for internal use by the D\'Decor sourcing team.', M, H - 74);

// switch to content pages
coverMode = false;

// ===========================================================================
//  1. WELCOME
// ===========================================================================
doc.addPage();
h1('Welcome', 'Getting started');
p('The Yarn Procurement Portal is the single place where the yarn sourcing desk turns a need for yarn into a confident purchasing decision. It carries every requirement from the moment it is raised, through approval, vendor quotations and a side-by-side comparison, to the final award — with a clear record at every step.');
p('This manual walks you through the portal screen by screen. It is written for everyday users — no technical knowledge is needed. Use the role guide to see what you can do, then follow the workflow chapter to run a requirement end to end.');
callout('In one sentence', 'Raise a requirement, send it to several vendors at once, let the portal compare their quotes on price, delivery, payment terms and rating, and award the best one — with last purchase prices and certificate alerts always in view.', 'gold');
h2('What the portal does for you');
bullet('Keeps requirements, approvals, quotes and awards in one organised place.');
bullet('Invites multiple vendors with a single click and collects their rates online.');
bullet('Builds an automatic comparison and highlights the recommended vendor.');
bullet('Remembers the last purchase price so you always know if a quote is competitive.');
bullet('Tracks vendor certificates and warns you before they expire.');
bullet('Shows live yarn market price trends to support negotiation.');

// ===========================================================================
//  2. ROLES
// ===========================================================================
doc.addPage();
h1('Who does what', 'Roles & access');
p('Everyone signs in with their own account. What you see and can do depends on your role. If you need access changed, contact your portal administrator.');
roleCards([
  { name: 'Requisitioner', color: C.slate, does: 'Raises yarn requirements and edits them before approval.' },
  { name: 'Procurement', color: C.indigo, does: 'Sends RFQs to vendors, records quotes, manages the vendor and yarn masters.' },
  { name: 'Department Head', color: C.marigold, does: 'Approves or rejects requirements and awards the order from the comparison.' },
  { name: 'Administrator', color: C.sage, does: 'Everything above, plus managing user accounts.' },
]);
callout('A quick word on the workflow', 'A requirement moves through clear stages — Requested, Approved, RFQ Sent, Collecting Quotes, Ready to Award, and Awarded. The coloured tracker at the top of every requirement shows exactly where it stands.');
h2('Signing in');
p('Open the portal in your browser, enter your email and password, and you will land on your dashboard. You can switch between a light and a dark (purple) appearance at any time using the toggle at the bottom of the menu.');
mockup('The sign-in screen. Enter your work email and password to continue.', 'login');

// ===========================================================================
//  3. DASHBOARD
// ===========================================================================
doc.addPage();
h1('Your dashboard', 'The home screen');
p('The dashboard is your starting point each day. At a glance it shows how many requirements are waiting for approval, how many are out collecting quotes, which are ready to award, and the savings achieved so far. Below the figures, a live chart tracks yarn market prices.');
mockup('The dashboard — key figures across the top and the yarn price trend below.', 'dashboard');
bullet('Click any figure to jump straight to that list of requirements.');
bullet('The left-hand menu takes you to Requirements, Vendor Master, Yarn & Prices and Awards.');
bullet('Certificate expiry warnings appear here so nothing slips past its renewal date.');

// ===========================================================================
//  4. WORKFLOW
// ===========================================================================
doc.addPage();
h1('Running a requirement', 'The core workflow');
p('This is the heart of the portal — the journey from a yarn need to an awarded order. Each step is handled by the right role, and the portal moves the requirement forward automatically.');
numStep(1, 'Raise the requirement  (Requisitioner)', 'Choose New Requirement, give it a title, add the yarn items and quantities, and submit. The last purchase price fills in automatically for reference.');
numStep(2, 'Approve it  (Department Head)', 'The department head opens the requirement and approves it (or rejects it with a reason). Only approved requirements can go out to vendors.');
numStep(3, 'Send the RFQ  (Procurement)', 'Pick the vendors to invite. Each receives a unique link to quote online; you can also share a ready-made email or a printable PDF.');
numStep(4, 'Collect quotes  (Vendors / Procurement)', 'Vendors submit their rates through their link, or procurement enters quotes received by phone or email on their behalf.');
numStep(5, 'Compare  (Procurement / Head)', 'The portal builds a side-by-side comparison and recommends a vendor. Decision weights can be tuned live.');
numStep(6, 'Award  (Department Head)', 'The head selects the vendor for each item and awards. The awarded price becomes the new "last purchase price".');

doc.addPage();
h2('Step 1 — Raise a requirement');
p('A requirement is a list of the yarns you need and how much of each. Add each item by its material code; the description, last purchase price and last supplier appear automatically so you can see the history while you type.');
mockup('Creating a new requirement. Add each yarn line with its quantity and target date.', 'form');
callout('Tip', 'Set a realistic "needed by" date and priority. These help procurement plan the RFQ due dates and help the department head triage what to approve first.', 'sage');

h2('Step 2 — Approval');
p('The department head reviews the requirement and approves it with a single click, or rejects it with a short reason that is recorded and visible to the requisitioner. Until a requirement is approved, vendors cannot be invited.');

doc.addPage();
h2('Step 3 — Send the RFQ to vendors');
p('Open an approved requirement and choose Send / add RFQ, then tick the vendors you want to invite and set an optional due date. Each vendor gets their own secure quote link. For every vendor you can:');
bullet('Copy a ready-to-send email containing the link, or open it directly in Outlook.');
bullet('Copy just the link to paste into your own message or a chat.');
bullet('Download a neat PDF of the RFQ to attach.');
callout('Automatic emailing', 'If your organisation has switched on email sending, the portal can deliver these RFQs and reminders for you. If not, you simply send the prepared draft from your own mailbox — nothing is lost either way.');

h2('Step 4 — Vendors submit their quotes');
p('Vendors open their link — no login needed — see exactly the items requested, and enter a price per Kg, GST, delivery lead time, payment terms and any remarks. They can save and come back until the due date. If a vendor sends rates another way, procurement records them using Enter quote.');
mockup('The vendor’s quote page. They fill in rates per item and submit — no account required.', 'portal');

// ===========================================================================
//  5. COMPARISON & AWARD
// ===========================================================================
doc.addPage();
h1('Comparing & awarding', 'Making the call');
p('Once quotes start arriving, the portal lays them out side by side for each item — price, delivery time, payment terms, vendor rating and the saving against the last purchase price. A recommended vendor is highlighted so the obvious choice stands out, while the full picture stays visible.');
mockup('The comparison — vendors side by side, with the recommended option marked Best.', 'compare');
h2('Tuning the recommendation');
p('The recommendation balances price, lead time, payment terms and rating. You can adjust how much each factor matters using the decision weights, and the scores update instantly — useful when delivery speed matters more than a small price difference, or vice versa.');
h2('Awarding the order');
p('The department head selects the winning vendor for each item and awards. The chosen prices are saved as the new "last purchase price", so the next time this yarn is needed, everyone immediately sees the most recent benchmark.');
callout('Why the saving matters', 'Every award records the difference against the previous purchase price. Over time the Awards & Savings screen adds these up, giving the desk a clear picture of the value it has delivered.', 'gold');

// ===========================================================================
//  6. VENDORS & YARN
// ===========================================================================
doc.addPage();
h1('Vendors & yarn', 'Master data');
h2('Vendor master');
p('The vendor master holds every spinner and trader you source from — contact details, GST number, rating, default payment terms and lead time, and their quality certificates. Each vendor card shows their rating and certificate status at a glance.');
mockup('The vendor master — ratings and certificate status visible on each card.', 'vendors');
bullet('Add or edit vendors, and mark them inactive to retire them without losing history.');
bullet('Record certificates (OEKO-TEX, GOTS, GRS and others) with their expiry dates.');
bullet('The portal warns you when a certificate is within 30 days of expiry — so renewals are never missed.');
h2('Yarn & prices');
p('The yarn master lists every material with its code, description and category. Alongside it, the portal keeps a price history — both your own purchase prices and the wider market trend — so you can see how each yarn has moved over time and quote-check with confidence.');

// ===========================================================================
//  7. REMINDERS
// ===========================================================================
doc.addPage();
h1('Reminders & follow-up', 'Keeping quotes on time');
p('Vendors sometimes need a nudge. On any requirement, procurement can send a polite reminder to a single vendor who has not yet responded, or nudge every pending vendor at once. The portal keeps count of how many reminders each vendor has had and when the last one was sent.');
bullet('Use Remind next to a vendor who is still to quote.');
bullet('Use Nudge pending to remind everyone outstanding in one click.');
bullet('Vendors who have already quoted or declined are never reminded.');
callout('Gentle by design', 'Reminders are courteous and include the same quote link, so a vendor can respond immediately. If automatic emailing is off, the portal still prepares the reminder for you to send manually.', 'sage');

h2('Theme & comfort');
p('The portal offers a light appearance and a dark purple appearance. Choose whichever is easier on your eyes using the toggle at the bottom of the menu — your choice is remembered for next time.');

// ===========================================================================
//  8. ADMIN (light touch)
// ===========================================================================
doc.addPage();
h1('Administration', 'For administrators');
p('Administrators can manage who has access to the portal. From the Users screen you can add a new colleague, set their role, reset a password, or deactivate someone who has left — all without losing any of the history they were part of.');
bullet('Add a user with their name, email and role.');
bullet('Change a role or reset a password at any time.');
bullet('Deactivate (rather than delete) to keep records intact.');
callout('Activity record', 'For oversight, the portal keeps a record of key actions — who raised, approved, quoted or awarded what, and when. This gives administrators a clear, trustworthy history of activity across the desk.');

// ===========================================================================
//  9. FAQ + GLOSSARY
// ===========================================================================
doc.addPage();
h1('Questions & terms', 'Quick reference');
h2('Frequently asked');
const faqs = [
  ['Can I edit a requirement after submitting?', 'Yes, until it is approved. After approval, ask procurement or the department head.'],
  ['A vendor says their link doesn’t work.', 'Re-send the RFQ from the requirement; a fresh link is generated for them.'],
  ['Do vendors need an account?', 'No. They quote through their personal link without signing in.'],
  ['Where does the “last PO price” come from?', 'It is the most recent awarded price for that yarn, updated automatically each time you award.'],
  ['Can two vendors win the same requirement?', 'Yes — the department head can award different items to different vendors.'],
];
faqs.forEach(([q, a]) => {
  ensure(40);
  doc.font(F.bold).fontSize(10).fillColor(C.indigo).text(q, { width: CW });
  doc.font(F.reg).fontSize(10).fillColor('#33404F').text(a, { width: CW, lineGap: 2.5 });
  gap(9);
});
h2('Glossary');
const gloss = [
  ['Requirement', 'A request for one or more yarns, with quantities — the start of the process.'],
  ['RFQ', 'Request for Quotation — the invitation sent to vendors to quote on a requirement.'],
  ['Quote', 'A vendor’s offered prices and terms for the requested yarns.'],
  ['Comparison', 'The side-by-side view that scores vendors and recommends one.'],
  ['Award', 'The decision that assigns a requirement’s items to the chosen vendor(s).'],
  ['Last PO price', 'The most recent purchase price for a yarn, used as a benchmark.'],
];
gloss.forEach(([t, d]) => {
  ensure(26);
  const y = doc.y;
  doc.font(F.bold).fontSize(9.5).fillColor(C.ink).text(t, M, y, { width: 110 });
  doc.font(F.reg).fontSize(9.5).fillColor('#33404F').text(d, M + 120, y, { width: CW - 120, lineGap: 2 });
  gap(7);
});

// ---- back note ----
doc.addPage();
gap(120);
try { doc.image(LOGO_DARK, M, doc.y, { width: 150 }); } catch (e) {}
gap(60);
doc.font(F.bold).fontSize(15).fillColor(C.ink).text('One clear thread, from need to order.');
gap(6);
doc.font(F.reg).fontSize(10.5).fillColor(C.slate).text('Thank you for using the Yarn Procurement Portal. For help or access, contact your portal administrator.', { width: 380, lineGap: 3 });

doc.end();
console.log('Wrote', OUT);
