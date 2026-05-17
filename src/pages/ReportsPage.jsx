import { useMemo } from 'react';
import { useGasApp } from '../state/GasAppContext.jsx';
import { parseInvoiceDate, yyyymm } from '../lib/dates.js';

export default function ReportsPage() {
  const { invoices, purchases, customers, fullCatalog } = useGasApp();

  const catLabel = (id) => fullCatalog.find((g) => g.id === id)?.label ?? id;

  const monthly = useMemo(() => {
    const saleBy = {};
    const purBy = {};
    for (const inv of invoices) {
      const k = yyyymm(parseInvoiceDate(inv.invoiceDate));
      saleBy[k] = (saleBy[k] || 0) + (inv.totals?.grand || 0);
    }
    for (const p of purchases) {
      const k = yyyymm(new Date(p.savedAt));
      purBy[k] = (purBy[k] || 0) + p.lines.reduce((s, l) => s + l.qty, 0);
    }
    const keys = [...new Set([...Object.keys(saleBy), ...Object.keys(purBy)])].sort().reverse().slice(0, 12);
    return keys.map((k) => ({
      month: k,
      sales: Math.round((saleBy[k] || 0) * 100) / 100,
      purchaseCyl: purBy[k] || 0,
    }));
  }, [invoices, purchases]);

  const topCustomers = useMemo(() => {
    const m = {};
    for (const inv of invoices) {
      const id = inv.customerId || 'unknown';
      m[id] = (m[id] || 0) + (inv.totals?.grand || 0);
    }
    return Object.entries(m)
      .map(([id, total]) => ({
        id,
        name: customers.find((c) => c.id === id)?.name ?? id,
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [invoices, customers]);

  const productPerf = useMemo(() => {
    const m = {};
    for (const inv of invoices) {
      for (const ln of inv.lines || []) {
        if (!ln.productId) continue;
        m[ln.productId] = m[ln.productId] || { qty: 0, value: 0 };
        const q = Number(ln.qtyNo) || 0;
        const v = Number(ln.value) || 0;
        m[ln.productId].qty += q;
        m[ln.productId].value += v;
      }
    }
    return Object.entries(m)
      .map(([id, x]) => ({
        id,
        label: catLabel(id),
        qty: x.qty,
        value: Math.round(x.value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [invoices, fullCatalog]);

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-600">From saved invoices &amp; purchases in this browser.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gold/25 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Monthly sales (₹)</h2>
          {monthly.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No data yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="py-1">Month</th>
                  <th className="py-1 text-right">Sales</th>
                  <th className="py-1 text-right">Purchase (cyl)</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((r) => (
                  <tr key={r.month} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs">{r.month}</td>
                    <td className="py-2 text-right font-semibold text-brand-emerald">
                      ₹{r.sales.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 text-right text-slate-700">{r.purchaseCyl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-gold/25 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Top customers (by billed value)</h2>
          {topCustomers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No invoices yet.</p>
          ) : (
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm">
              {topCustomers.map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span className="font-medium text-slate-800">{r.name}</span>
                  <span className="font-semibold text-brand-emerald">₹{r.total.toLocaleString('en-IN')}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-gold/25 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Product performance (saved invoices)</h2>
        {productPerf.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No catalog-linked lines in saved invoices yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1">Product</th>
                <th className="py-1 text-right">Cylinders (sum Qty No)</th>
                <th className="py-1 text-right">Taxable value</th>
              </tr>
            </thead>
            <tbody>
              {productPerf.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2">{r.label}</td>
                  <td className="py-2 text-right">{r.qty}</td>
                  <td className="py-2 text-right font-medium">₹{r.value.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
