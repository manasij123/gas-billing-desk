export function todayDdMmYyyy() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function parseInvoiceDate(str) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(str).trim());
  if (!m) return new Date();
  const d = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const y = Number(m[3]);
  return new Date(y, mo, d);
}

export function yyyymm(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isTodayDdMmYyyy(str) {
  const a = parseInvoiceDate(str);
  const t = new Date();
  return a.getDate() === t.getDate() && a.getMonth() === t.getMonth() && a.getFullYear() === t.getFullYear();
}
