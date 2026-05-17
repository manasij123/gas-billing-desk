import { useState, useMemo } from 'react';
import { useGasApp } from '../state/GasAppContext.jsx';
import NavIcon from '../components/NavIcon.jsx';

export default function CylinderTrackerPage() {
  const { customerHoldings, customers, fullCatalog, recordCylinderReturn } = useGasApp();
  const [msg, setMsg] = useState('');

  const holdingsDetailed = useMemo(() => {
    return customerHoldings.map(h => {
      const customer = customers.find(c => c.id === h.customerId);
      const product = fullCatalog.find(p => p.id === h.productId);
      return { ...h, customerName: customer?.name || 'Unknown', productLabel: product?.label || h.productId };
    });
  }, [customerHoldings, customers, fullCatalog]);

  function handleReturn(h) {
    const qty = prompt(`How many empty cylinders returned by ${h.customerName} for ${h.productLabel}?`, h.qty);
    if (qty === null) return;
    
    const res = recordCylinderReturn(h.customerId, h.productId, qty);
    if (res.ok) {
      setMsg(`Recorded return of ${qty} cylinders.`);
      setTimeout(() => setMsg(''), 3000);
    } else {
      alert(res.error);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-brand-purple p-3 text-white shadow-lg shadow-brand-purple/20">
          <NavIcon id="tracker" active={true} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cylinder Tracker</h1>
          <p className="text-[10px] font-bold text-brand-purple uppercase tracking-widest mt-1">Manage Empty Returns (Paoana)</p>
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 border border-emerald-100">
          {msg}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <table className="w-full text-left text-sm border-separate border-spacing-0">
          <thead className="bg-brand-blue text-[10px] font-black uppercase tracking-widest text-blue-100">
            <tr>
              <th className="px-6 py-5 border-b border-blue-800">Customer Name</th>
              <th className="px-6 py-5 border-b border-blue-800">Product</th>
              <th className="px-6 py-5 border-b border-blue-800 text-center">Pending Qty</th>
              <th className="px-6 py-5 border-b border-blue-800 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holdingsDetailed.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                  No cylinders are currently with customers.
                </td>
              </tr>
            ) : (
              holdingsDetailed.map((h, idx) => (
                <tr key={`${h.customerId}-${h.productId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{h.customerName}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{h.productLabel}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-black text-brand-purple">
                      {h.qty} Nos
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleReturn(h)}
                      className="rounded-xl bg-brand-emerald px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-md hover:brightness-95 transition-all"
                    >
                      Mark Return
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}