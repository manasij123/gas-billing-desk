import { useEffect, useMemo, useState } from 'react';
import { useGasApp } from '../state/GasAppContext.jsx';
import { stockBadge } from '../lib/stockStatus.js';
import { isTodayDdMmYyyy, parseInvoiceDate, yyyymm } from '../lib/dates.js';

export default function DashboardPage({ onNavigate }) {
  const {
    invoices,
    stockByProductId,
    customerHoldings,
    updateSellerProfile,
    sellerProfile,
    resetAllData,
    fullCatalog,
    getLowFilledFor,
  } = useGasApp();
  const [biz, setBiz] = useState(sellerProfile);

  useEffect(() => {
    setBiz(sellerProfile);
  }, [sellerProfile]);

  const todaySales = useMemo(() => {
    let s = 0;
    for (const inv of invoices) {
      if (isTodayDdMmYyyy(inv.invoiceDate)) s += inv.totals?.grand || 0;
    }
    return Math.round(s * 100) / 100;
  }, [invoices]);

  const monthKey = yyyymm(new Date());
  const monthSales = useMemo(() => {
    let s = 0;
    for (const inv of invoices) {
      if (yyyymm(parseInvoiceDate(inv.invoiceDate)) === monthKey) s += inv.totals?.grand || 0;
    }
    return Math.round(s * 100) / 100;
  }, [invoices, monthKey]);

  const cylinders = useMemo(() => {
    let f = 0;
    let e = 0;
    for (const p of fullCatalog) {
      const st = stockByProductId[p.id] || { filled: 0, empty: 0 };
      f += st.filled;
      e += st.empty;
    }
    return { filled: f, empty: e };
  }, [stockByProductId, fullCatalog]);

  const totalCylOut = useMemo(() => {
    return customerHoldings.reduce((sum, h) => sum + h.qty, 0);
  }, [customerHoldings]);

  const lowAlerts = useMemo(() => {
    const a = [];
    for (const p of fullCatalog) {
      const st = stockByProductId[p.id] || { filled: 0, empty: 0 };
      const low = getLowFilledFor(p.id);
      const b = stockBadge(st.filled, low);
      if (b.tone !== 'ok') a.push({ ...p, filled: st.filled, badge: b, low });
    }
    return a;
  }, [stockByProductId, fullCatalog, getLowFilledFor]);

  function applyBusinessEdits() {
    updateSellerProfile(biz);
    alert('Business profile updated for invoices.');
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Today&apos;s pulse — sales, cylinders, and stock alerts at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="rounded-lg bg-brand-emerald px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            New invoice
          </button>
          <button
            type="button"
            onClick={() => onNavigate('purchase')}
            className="rounded-lg border border-brand-emerald px-4 py-2 text-sm font-semibold text-brand-emerald hover:bg-emerald-50"
          >
            Supplier receive
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's sales" value={`₹${todaySales.toLocaleString('en-IN')}`} hint="GST invoices saved today" />
        <StatCard
          title="This month revenue"
          value={`₹${monthSales.toLocaleString('en-IN')}`}
          hint={monthKey}
        />
        <StatCard title="Filled cylinders (all SKUs)" value={String(cylinders.filled)} hint="Ready to sell" />
        <StatCard title="Empty cylinders (yard)" value={String(cylinders.empty)} hint="Refill pool" />
        <StatCard title="Cylinders with Customers" value={String(totalCylOut)} hint="Paoana (Pending)" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gold/25 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Low stock</h2>
          {lowAlerts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">All products above low threshold.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lowAlerts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-gold/20 bg-gold-muted px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-800">{p.label}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      p.badge.tone === 'out' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {p.badge.label} · {p.filled} filled
                    <span className="ml-1 font-normal text-slate-500">(≤{p.low})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gold/25 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Recent invoices</h2>
          {invoices.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No saved invoices yet. Open Sales / Billing.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {invoices.slice(0, 8).map((inv) => (
                <li key={inv.id} className="flex justify-between gap-2 py-2 text-sm">
                  <span className="font-medium text-slate-800">{inv.invoiceNo}</span>
                  <span className="text-slate-500">{inv.invoiceDate}</span>
                  <span className="font-semibold text-brand-emerald">
                    ₹{(inv.totals?.grand ?? 0).toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-brand-emerald/20 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Business profile (invoice header)</h2>
        <p className="mt-1 text-xs text-slate-500">Shown as seller on GST invoice — MURSHIDABAD INDUSTRIAL GASES.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Legal name" value={biz.name} onChange={(v) => setBiz((b) => ({ ...b, name: v }))} />
          <Field label="Phones" value={biz.phones} onChange={(v) => setBiz((b) => ({ ...b, phones: v }))} />
          <Field label="GSTN" value={biz.gstn} onChange={(v) => setBiz((b) => ({ ...b, gstn: v }))} />
          <Field label="State code" value={biz.stateCode} onChange={(v) => setBiz((b) => ({ ...b, stateCode: v }))} />
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Head office (multi-line ok)</label>
            <textarea
              value={biz.headOffice}
              onChange={(e) => setBiz((b) => ({ ...b, headOffice: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Godown / factory line</label>
            <input
              value={biz.factory}
              onChange={(e) => setBiz((b) => ({ ...b, factory: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyBusinessEdits}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-emerald-950 hover:brightness-95"
          >
            Save profile
          </button>
          <button
            type="button"
            onClick={() => setBiz(sellerProfile)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset form
          </button>
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-slate-400">
        <button type="button" className="underline hover:text-slate-600" onClick={() => {
          if (confirm('Erase ALL local data and reset demo stock?')) resetAllData();
        }}>
          Reset all local data
        </button>
      </p>
    </div>
  );
}

function StatCard({ title, value, hint }) {
  return (
    <div className="rounded-xl border border-gold/30 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-brand-emerald">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
