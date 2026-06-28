import ExcelJS from 'exceljs';

const BRAND = 'FF1F3A5F';
const HEAD = 'FF2E5288';
const BEST = 'FFE7F4E4';
const LIGHT = 'FFF3F5F8';

/**
 * Build the comparison workbook (matches the "Yarn Price Comparison" format,
 * extended with landed price, scores and recommendation) and write to res.
 */
export async function streamComparisonXlsx(res, comparison) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "D'Decor Yarn Procurement Portal";
  const ws = wb.addWorksheet('Comparison', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 4 }],
  });

  const { requirement, vendors, items } = comparison;

  // Title
  ws.mergeCells(1, 1, 1, 4 + vendors.length * 3);
  const title = ws.getCell(1, 1);
  title.value = `Yarn Price Comparison  —  ${requirement.ref_no}  —  ${requirement.title}`;
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  title.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 26;

  // Header rows: base columns + per-vendor group
  const baseCols = ['Mat Code', 'Description', 'Req Qty (Kg)', 'Last PO Price/Kg'];
  const headerRow1 = ['', '', '', ''];
  const headerRow2 = [...baseCols];

  vendors.forEach((v) => {
    headerRow1.push(`${v.vendor_name}  (★${v.rating})`, '', '');
    headerRow2.push('Price/Kg', 'Lead/Pay', 'Score');
  });

  const r2 = ws.addRow([]); // spacer to align (row 2 empty)
  const rH1 = ws.addRow(headerRow1); // row 3 - vendor names
  const rH2 = ws.addRow(headerRow2); // row 4 - sub headers

  // merge vendor name across its 3 cols
  vendors.forEach((v, i) => {
    const start = 5 + i * 3;
    ws.mergeCells(rH1.number, start, rH1.number, start + 2);
  });

  [rH1, rH2].forEach((row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thin();
    });
  });

  // Data rows
  items.forEach((row) => {
    const it = row.item;
    const data = [it.mat_code, it.description, it.required_qty_kg, it.last_po_price];
    row.cells.forEach((c) => {
      if (!c.has_quote) {
        data.push('—', 'no response', '');
      } else if (c.no_quote || !c.quoted) {
        data.push('No quote', '', '');
      } else {
        data.push(
          round2(c.landed_price),
          `${c.lead_time_days ?? '?'}d / ${c.payment_terms ?? '?'}`,
          c.total_score ?? ''
        );
      }
    });
    const xlRow = ws.addRow(data);
    xlRow.getCell(3).numFmt = '#,##0';
    xlRow.getCell(4).numFmt = '#,##0.00';

    // highlight recommended vendor cells
    vendors.forEach((v, i) => {
      const startCol = 5 + i * 3;
      const cell = row.cells[i];
      if (cell && cell.quoted) xlRow.getCell(startCol).numFmt = '#,##0.00';
      if (v.vendor_id === row.recommended_vendor_id) {
        for (let k = 0; k < 3; k++) {
          xlRow.getCell(startCol + k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BEST } };
        }
      }
    });
    xlRow.eachCell((cell) => (cell.border = thin()));
  });

  // Recommendation note row
  ws.addRow([]);
  const noteRow = ws.addRow(['Recommended vendor per item is highlighted in green (best weighted score).']);
  noteRow.getCell(1).font = { italic: true, color: { argb: 'FF555555' } };

  // widths
  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 38;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 15;
  vendors.forEach((_, i) => {
    ws.getColumn(5 + i * 3).width = 12;
    ws.getColumn(6 + i * 3).width = 18;
    ws.getColumn(7 + i * 3).width = 8;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Comparison-${requirement.ref_no}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

function thin() {
  const s = { style: 'thin', color: { argb: 'FFD0D5DD' } };
  return { top: s, left: s, bottom: s, right: s };
}
const round2 = (n) => (n == null ? n : Math.round(n * 100) / 100);
