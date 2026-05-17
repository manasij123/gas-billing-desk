import { useMemo, useState } from 'react';
import { useGasApp } from '../state/GasAppContext.jsx';
import { stockBadge } from '../lib/stockStatus.js';
import { todayDdMmYyyy } from '../lib/dates.js';
import { uid } from '../utils/id.js';

export default function PurchasePage() {
  const { suppliers, stockByProductId, purchaseSeq, savePurchase, fullCatalog, getLowFilledFor } = useGasApp();
  const defaultPid = fullCatalog[0]?.id ?? 'io-7cum';
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState(todayDdMmYyyy());
  const [vehicleNo, setVehicleNo] = useState(''); // Added vehicleNo state
  const [lines, setLines] = useState([{ id: uid(), productId: defaultPid, qty: '' }]);
  const [msg, setMsg] = useState('');

  const supplier = suppliers.find((s) => s.id === supplierId);

  const fy = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const fyStart = m >= 3 ? y : y - 1;
    return `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
  }, []);

  const challanLabel = `PUR/MIG/${fy}/${String(purchaseSeq).padStart(4, '0')}`;

  function addLine() {
    setLines((l) => [...l, { id: uid(), productId: fullCatalog[0]?.id ?? 'io-7cum', qty: '' }]);
  }

  function updateLine(id, patch) {
    setLines((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeLine(id) {
    setLines((l) => (l.length <= 1 ? l : l.filter((x) => x.id !== id)));
  }

  function handleSave() {
    setMsg('');
    const parsed = [];
    for (const ln of lines) {
      const q = Math.max(0, Math.floor(Number(ln.qty) || 0));
      if (q <= 0) continue;
      parsed.push({ productId: ln.productId, qty: q });
    }
    if (!supplierId) {
      setMsg('Select supplier.');
      return;
    }
    if (parsed.length === 0) {
      setMsg('Enter at least one quantity.');
      return;
    }

    const res = savePurchase({
      challanLabel,
      supplierId,
      supplierName: supplier?.name ?? '',
      refNo,
      refDate,
      vehicleNo,
      lines: parsed,
    });

    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setMsg('Purchase saved. Filled stock increased, empty pool reduced.');
    setLines([{ id: uid(), productId: fullCatalog[0]?.id ?? 'io-7cum', qty: '' }]);
    setRefNo('');
    setVehicleNo('');
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Purchase (supplier)</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Record cylinders received filled from supplier (e.g. Narayan Oxygen). On save: <strong>filled +qty</strong>,{' '}
        <strong>empty −qty</strong> (empties returned in swap).
      </p>

      <div className="mt-6 max-w-3xl space-y-4 rounded-xl border border-gold/25 bg-white p-5 shadow-sm">
        {msg && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.includes('saved') ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'
            }`}
          >
            {msg}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Desk challan ref</label>
            <div className="mt-1 rounded-lg border border-gold/35 bg-gold-muted px-3 py-2 font-mono text-sm text-brand-emerald">
              {challanLabel}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Supplier invoice / ref</label>
            <input
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Ref date</label>
            <input
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Vehicle</label>
            <input
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="border-t border-gold/20 pt-4">
          <h2 className="text-sm font-bold text-slate-800">Lines</h2>
          <div className="mt-3 space-y-3">
            {lines.map((ln) => {
              const st = stockByProductId[ln.productId];
              const cat = fullCatalog.find((g) => g.id === ln.productId);
              const b = cat && st ? stockBadge(st.filled, getLowFilledFor(cat.id)) : null;
              return (
                <div key={ln.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-gold/20 bg-gold-muted p-3">
                  <div className="min-w-[200px] flex-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Product</label>
                    <select
                      value={ln.productId}
                      onChange={(e) => updateLine(ln.id, { productId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    >
                      {fullCatalog.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Qty</label>
                    <input
                      inputMode="numeric"
                      value={ln.qty}
                      onChange={(e) => updateLine(ln.id, { qty: e.target.value })}
                      placeholder="0"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="text-xs text-slate-600">
                    Empty avail: <strong>{st?.empty ?? 0}</strong>
                    {b && (
                      <span className="ml-2 rounded bg-white px-1.5 py-0.5 font-semibold text-emerald-800">{b.label}</span>
                    )}
                  </div>
                  <button type="button" onClick={() => removeLine(ln.id)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addLine} className="mt-2 text-sm font-semibold text-brand-emerald hover:underline">
            + Line
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-brand-emerald px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-900"
        >
          Save purchase &amp; update stock
        </button>
      </div>
    </div>
  );
}
