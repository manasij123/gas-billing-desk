import { GAS_CATALOG } from '../data/gasCatalog.js';

export function stockBadge(filled, lowFilled) {
  if (filled <= 0) return { label: 'OUT', tone: 'out' };
  if (filled <= lowFilled) return { label: 'LOW', tone: 'low' };
  return { label: 'OK', tone: 'ok' };
}

export function catalogById() {
  const m = {};
  for (const p of GAS_CATALOG) m[p.id] = p;
  return m;
}
