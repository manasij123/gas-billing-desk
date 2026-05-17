export function lineValue(row) {
  const rate = Number(row.rate) || 0;
  const qn = Number(row.qtyNo) || 0;
  const qc = Number(row.qtyCum) || 0;
  if (row.ratePer === 'NO') return Math.round(qn * rate * 100) / 100;
  return Math.round(qc * rate * 100) / 100;
}

export function computeTotals(items) {
  let taxable = 0;
  let cgst = 0;
  let sgst = 0;
  for (const row of items) {
    const base = lineValue(row);
    taxable += base;
    const t = Number(row.taxPct) === 12 ? 12 : 18;
    const half = t / 2 / 100;
    cgst += base * half;
    sgst += base * half;
  }
  taxable = Math.round(taxable * 100) / 100;
  cgst = Math.round(cgst * 100) / 100;
  sgst = Math.round(sgst * 100) / 100;
  const grand = Math.round((taxable + cgst + sgst) * 100) / 100;
  return { taxable, cgst, sgst, grand };
}

export function taxLabelsForLines(items) {
  const pcts = new Set(items.map((i) => (Number(i.taxPct) === 12 ? 12 : 18)));
  if (pcts.size !== 1) return { cgst: '—', sgst: '—' };
  const p = [...pcts][0];
  return { cgst: `${p / 2}%`, sgst: `${p / 2}%` };
}
