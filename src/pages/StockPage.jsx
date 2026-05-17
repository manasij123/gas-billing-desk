import { useMemo, useState } from 'react';
import { useGasApp } from '../state/GasAppContext.jsx';
import { stockBadge } from '../lib/stockStatus.js';
import { isBuiltInProductId } from '../lib/catalogMerge.js';

const SUBS = [
  { id: 'inventory', label: 'All SKUs' },
  { id: 'alerts', label: 'Low & out' },
  { id: 'adjust', label: 'Adjust stock' },
  { id: 'newsku', label: 'New item' },
  { id: 'backup', label: 'Backup & Restore' },
];

export default function StockPage() {
  const {
    stockByProductId,
    fullCatalog,
    getLowFilledFor,
    setRateOverride,
    adjustStock,
    addCatalogItem,
    removeCatalogItem,
    setLowFilledOverride,
    exportData,
    importData,
  } = useGasApp();
  const [sub, setSub] = useState('inventory');
  const [adjProduct, setAdjProduct] = useState(() => fullCatalog[0]?.id ?? '');
  const [adjFilled, setAdjFilled] = useState('0');
  const [adjEmpty, setAdjEmpty] = useState('0');
  const [adjMsg, setAdjMsg] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newHsn, setNewHsn] = useState('');
  const [newLow, setNewLow] = useState('5');
  const [newRate, setNewRate] = useState('0');
  const [newMsg, setNewMsg] = useState('');

  const rows = useMemo(
    () =>
      fullCatalog.map((p) => {
        const st = stockByProductId[p.id] || { filled: 0, empty: 0 };
        const low = getLowFilledFor(p.id);
        const b = stockBadge(st.filled, low);
        return { ...p, st, low, b };
      }),
    [fullCatalog, stockByProductId, getLowFilledFor]
  );

  const alertRows = useMemo(() => rows.filter((r) => r.b.tone !== 'ok'), [rows]);

  function submitAdjust(e) {
    e.preventDefault();
    setAdjMsg('');
    const res = adjustStock(adjProduct, adjFilled, adjEmpty);
    if (!res.ok) setAdjMsg(res.error);
    else {
      setAdjMsg('Stock updated.');
      setAdjFilled('0');
      setAdjEmpty('0');
    }
  }

  function submitNewSku(e) {
    e.preventDefault();
    setNewMsg('');
    if (!newLabel.trim()) {
      setNewMsg('Enter product name.');
      return;
    }
    const id = addCatalogItem({
      label: newLabel.trim(),
      hsn: newHsn.trim() || '00000000',
      defaultRate: Number(newRate) || 0,
      lowFilled: Math.max(0, Math.floor(Number(newLow) || 5)),
    });
    setNewMsg(`Added SKU. You can set opening counts under Adjust stock.`);
    setNewLabel('');
    setNewHsn('');
    setNewLow('5');
    setNewRate('0');
    setAdjProduct(id);
    setSub('adjust');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        if (confirm('Importing will overwrite current data. Continue?')) {
          importData(json);
        }
      } catch (err) { alert('Invalid file'); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Stock / Inventory</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Purchase receive increases <strong>filled</strong> and reduces <strong>empty</strong>; sales invoice does the
        opposite. Use <strong>Adjust stock</strong> for opening balance, physical count, or damage.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSub(s.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              sub === s.id ? 'bg-brand-emerald text-white' : 'border border-gold/35 bg-white text-slate-700 hover:bg-gold-muted'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {(sub === 'inventory' || sub === 'alerts') && (
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-brand-blue text-[10px] font-black uppercase tracking-widest text-blue-100">
              <tr>
                <th className="px-6 py-5 border-b border-blue-800">Product Specification</th>
                <th className="px-6 py-5 border-b border-blue-800 text-right">Stock (Filled)</th>
                <th className="px-6 py-5 border-b border-blue-800 text-right">Stock (Empty)</th>
                <th className="px-6 py-5 border-b border-blue-800">Status</th>
                <th className="px-6 py-5 border-b border-blue-800 text-right">Fixed Rate</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/15">
              {(sub === 'alerts' ? alertRows : rows).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    {sub === 'alerts' ? 'No low or out-of-stock SKUs right now.' : 'No products.'}
                  </td>
                </tr>
              ) : (
                (sub === 'alerts' ? alertRows : rows).map((p) => (
                  <tr key={p.id} className="hover:bg-gold-muted">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.label}
                      {!isBuiltInProductId(p.id) && (
                        <span className="ml-2 text-[10px] font-normal uppercase text-gold">Custom</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.hsn}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-green">{p.st.filled}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{p.st.empty}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          p.b.tone === 'out'
                            ? 'bg-brand-red/10 text-brand-red'
                            : p.b.tone === 'low'
                              ? 'bg-brand-gold/10 text-brand-gold'
                              : 'bg-brand-green/10 text-brand-green'
                        }`}
                      >
                        {p.b.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        className="w-20 rounded border border-slate-300 px-1 py-1 text-right text-xs"
                        key={`rate-${p.id}-${p.defaultRate}`}
                        defaultValue={p.defaultRate}
                        onBlur={(e) => {
                          setRateOverride(p.id, Number(e.target.value));
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        className="w-16 rounded border border-slate-300 px-1 py-1 text-right text-xs"
                        key={`low-${p.id}-${p.low}`}
                        defaultValue={p.low}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === '') setLowFilledOverride(p.id, NaN);
                          else setLowFilledOverride(p.id, Number(v));
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!isBuiltInProductId(p.id) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Remove this custom SKU and its stock row?')) removeCatalogItem(p.id);
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {sub === 'adjust' && (
        <form
          onSubmit={submitAdjust}
          className="mt-6 max-w-lg space-y-4 rounded-xl border border-gold/25 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-emerald">Adjust counts</h2>
          <p className="text-xs text-slate-600">
            Enter <strong>+10</strong> or <strong>-2</strong> for filled / empty. Saves immediately to the same stock
            used by Purchase &amp; Sales.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-600">Product</label>
            <select
              value={adjProduct}
              onChange={(e) => setAdjProduct(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {fullCatalog.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Δ Filled cylinders</label>
              <input
                value={adjFilled}
                onChange={(e) => setAdjFilled(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Δ Empty cylinders</label>
              <input
                value={adjEmpty}
                onChange={(e) => setAdjEmpty(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {adjMsg && <p className="text-sm text-brand-emerald">{adjMsg}</p>}
          <button type="submit" className="rounded-lg bg-brand-emerald px-5 py-2.5 text-sm font-bold text-white">
            Apply adjustment
          </button>
        </form>
      )}

      {sub === 'newsku' && (
        <form
          onSubmit={submitNewSku}
          className="mt-6 max-w-lg space-y-4 rounded-xl border border-gold/25 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-emerald">New catalog item</h2>
          <p className="text-xs text-slate-600">Appears in Purchase, Sales line picker, and stock. Starts at 0 / 0 unless you adjust.</p>
          <div>
            <label className="text-xs font-semibold text-slate-600">Product name *</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. CO₂ – 6.8 kg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">HSN</label>
              <input
                value={newHsn}
                onChange={(e) => setNewHsn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="28112100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Default Rate (Fixed)</label>
              <input
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Low-stock alert at (filled ≤)</label>
              <input
                value={newLow}
                onChange={(e) => setNewLow(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {newMsg && <p className="text-sm text-emerald-800">{newMsg}</p>}
          <button type="submit" className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-emerald-950">
            Add item
          </button>
        </form>
      )}

      {sub === 'backup' && (
        <div className="mt-6 max-w-lg space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Data Management</h2>
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Export Data</p>
              <p className="mt-1 text-sm text-blue-600">Save all invoices, customers, and stock as a JSON file.</p>
              <button onClick={exportData} className="mt-3 btn bg-brand-blue text-white px-4 py-2 rounded-lg text-sm font-bold">
                Download Backup
              </button>
            </div>
            
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Restore Data</p>
              <p className="mt-1 text-sm text-emerald-600">Upload a previously saved backup file.</p>
              <label className="mt-3 inline-block cursor-pointer bg-brand-emerald text-white px-4 py-2 rounded-lg text-sm font-bold">
                Select JSON File
                <input type="file" accept=".json" hidden onChange={handleImport} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
