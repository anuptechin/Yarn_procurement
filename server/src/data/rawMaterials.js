// Catalog of tracked raw materials + the conversion formulas used in the
// "Raw Material Price Trend" workbook. Verified against the sheet:
//   Per Kg  = Candy / 355.62
//   Rs/Candy = USD-INR x indexCents x 355.62 / 0.4536 / 100
export const CANDY_KG = 355.62;

export const perKgFromCandy = (candy) =>
  candy == null || candy === '' ? null : Number(candy) / CANDY_KG;

export const rsCandyFromIndex = (usd, indexCents) =>
  usd == null || indexCents == null || usd === '' || indexCents === '' ? null
    : (Number(usd) * CANDY_KG * Number(indexCents)) / 0.4536 / 100;

// kind: 'input' (typed in) | 'computed' (derived via `compute`)
// compute: { type:'per_kg', src } | { type:'rs_candy', index }   (USD comes from usd_rate)
// col = source column in the "Raw Trend" sheet (importer only)
export const RAW_MATERIALS = [
  { code: 'usd_rate', name: 'USD / INR rate', grp: 'FX', unit: 'Rs/$', kind: 'input', col: 3 },

  { code: 'cotlook_a', name: 'Cotlook A Index', grp: 'Cotton Index', unit: 'Cents/lb', kind: 'input', col: 4 },
  { code: 'cotlook_a_candy', name: 'Cotlook A — Rs/Candy', grp: 'Cotton Index', unit: 'Rs/Candy', kind: 'computed', compute: { type: 'rs_candy', index: 'cotlook_a' }, col: 5 },
  { code: 'ice', name: 'ICE Price', grp: 'Cotton Index', unit: 'Cents/lb', kind: 'input', col: 6 },
  { code: 'ice_candy', name: 'ICE — Rs/Candy', grp: 'Cotton Index', unit: 'Rs/Candy', kind: 'computed', compute: { type: 'rs_candy', index: 'ice' }, col: 7 },

  { code: 'shankar6_candy', name: 'Shankar-6 (29mm)', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'input', col: 8 },
  { code: 'shankar6_perkg', name: 'Shankar-6 — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'shankar6_candy' }, col: 9 },
  { code: 'mech_candy', name: 'MECH (30mm)', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'input', col: 10 },
  { code: 'mech_perkg', name: 'MECH — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'mech_candy' }, col: 11 },
  { code: 'mcu_candy', name: 'MCU 5 (31mm)', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'input', col: 12 },
  { code: 'mcu_perkg', name: 'MCU 5 — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'mcu_candy' }, col: 13 },
  { code: 'dch_candy', name: 'DCH 32 (32-34mm)', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'input', col: 14 },
  { code: 'dch_perkg', name: 'DCH 32 — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'dch_candy' }, col: 15 },
  { code: 'organic_candy', name: 'Organic Premium', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'input', col: 16 },
  { code: 'organic_perkg', name: 'Organic Premium — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'organic_candy' }, col: 17 },
  { code: 'fairtrade_candy', name: 'Fair Trade Premium', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'input', col: 18 },
  { code: 'fairtrade_perkg', name: 'Fair Trade Premium — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'fairtrade_candy' }, col: 19 },
  { code: 'bci_candy', name: 'BCI Premium', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'input', col: 20 },
  { code: 'bci_perkg', name: 'BCI Premium — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'bci_candy' }, col: 21 },
  { code: 'aus_cents', name: 'Australian (30mm)', grp: 'Cotton Variety', unit: 'Cents/lb', kind: 'input', col: 22 },
  { code: 'aus_candy', name: 'Australian (29mm) — Rs/Candy', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'computed', compute: { type: 'rs_candy', index: 'aus_cents' }, col: 23 },
  { code: 'aus_perkg', name: 'Australian (29mm) — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'aus_candy' }, col: 24 },
  { code: 'emot_cents', name: 'EMOT (28-29mm)', grp: 'Cotton Variety', unit: 'Cents/lb', kind: 'input', col: 25 },
  { code: 'emot_candy', name: 'EMOT (28-29mm) — Rs/Candy', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'computed', compute: { type: 'rs_candy', index: 'emot_cents' }, col: 26 },
  { code: 'emot_perkg', name: 'EMOT (28-29mm) — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'emot_candy' }, col: 27 },
  { code: 'african_cents', name: 'African (29mm)', grp: 'Cotton Variety', unit: 'Cents/lb', kind: 'input', col: 28 },
  { code: 'african_candy', name: 'African (29mm) — Rs/Candy', grp: 'Cotton Variety', unit: 'Rs/Candy', kind: 'computed', compute: { type: 'rs_candy', index: 'african_cents' }, col: 29 },
  { code: 'african_perkg', name: 'African (29mm) — Per Kg', grp: 'Cotton Variety', unit: 'Rs/Kg', kind: 'computed', compute: { type: 'per_kg', src: 'african_candy' }, col: 30 },

  { code: 'waste_droppings', name: 'Droppings', grp: 'Cotton Waste', unit: 'Rs/Kg', kind: 'input', col: 33 },
  { code: 'waste_flatstrip', name: 'Flat Strip', grp: 'Cotton Waste', unit: 'Rs/Kg', kind: 'input', col: 34 },
  { code: 'waste_comber_noil', name: 'Comber Noil', grp: 'Cotton Waste', unit: 'Rs/Kg', kind: 'input', col: 35 },
  { code: 'waste_roving_ends', name: 'Roving Ends', grp: 'Cotton Waste', unit: 'Rs/Kg', kind: 'input', col: 36 },
  { code: 'waste_hard', name: 'Hard Waste', grp: 'Cotton Waste', unit: 'Rs/Kg', kind: 'input', col: 37 },
  { code: 'waste_fan_sweeping', name: 'Fan / Sweeping Waste', grp: 'Cotton Waste', unit: 'Rs/Kg', kind: 'input', col: 38 },
  { code: 'waste_filter_dust', name: 'Filter Plant Dust', grp: 'Cotton Waste', unit: 'Rs/Kg', kind: 'input', col: 39 },

  { code: 'pta', name: 'PTA (86%)', grp: 'Polyester', unit: 'Rs/Kg', kind: 'input', col: 40 },
  { code: 'meg', name: 'MEG (34%)', grp: 'Polyester', unit: 'Rs/Kg', kind: 'input', col: 41 },
  { code: 'melt', name: 'Melt', grp: 'Polyester', unit: 'Rs/Kg', kind: 'input', col: 42 },
  { code: 'psf_14', name: 'PSF 1.4 Denier SD', grp: 'Polyester', unit: 'Rs/Kg', kind: 'input', col: 43 },
  { code: 'psf_12', name: 'PSF 1.2 Denier SD', grp: 'Polyester', unit: 'Rs/Kg', kind: 'input', col: 44 },
  { code: 'psf_10', name: 'PSF 1.0 Denier SD', grp: 'Polyester', unit: 'Rs/Kg', kind: 'input', col: 45 },

  { code: 'brent', name: 'Brent Crude / Barrel', grp: 'Crude', unit: '$/Barrel', kind: 'input', col: 46 },

  { code: 'linen_eur', name: 'Linen (Long Fibre, Europe)', grp: 'Linen', unit: 'EUR/Kg', kind: 'input', col: 31 },
  { code: 'viscose', name: 'Viscose (1.2D)', grp: 'Viscose', unit: 'Rs/Kg', kind: 'input', col: 32 },
];

export const GROUP_ORDER = ['FX', 'Cotton Index', 'Cotton Variety', 'Cotton Waste', 'Polyester', 'Crude', 'Linen', 'Viscose'];

// Given a map of input {code: value}, return a full {code: value} including computed series.
export function computeAll(inputs) {
  const out = { ...inputs };
  const byCode = Object.fromEntries(RAW_MATERIALS.map((m) => [m.code, m]));
  // pass 1: rs_candy (depends on usd_rate + an index input)
  for (const m of RAW_MATERIALS) {
    if (m.kind === 'computed' && m.compute.type === 'rs_candy') {
      const v = rsCandyFromIndex(out.usd_rate, out[m.compute.index]);
      if (v != null) out[m.code] = v;
    }
  }
  // pass 2: per_kg (may depend on a computed candy from pass 1)
  for (const m of RAW_MATERIALS) {
    if (m.kind === 'computed' && m.compute.type === 'per_kg') {
      const v = perKgFromCandy(out[m.compute.src]);
      if (v != null) out[m.code] = v;
    }
  }
  void byCode;
  return out;
}
