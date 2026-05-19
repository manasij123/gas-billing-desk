import { useEffect, useMemo, useState } from 'react';
import InvoiceA4Preview from '../components/InvoiceA4Preview.jsx';
import { useGasApp } from '../state/GasAppContext.jsx';
import { computeTotals, lineValue, taxLabelsForLines } from '../lib/billingMath.js';
import { todayDdMmYyyy, parseInvoiceDate } from '../lib/dates.js';
import { uid } from '../utils/id.js'; // Import uid from utils
import { stockBadge } from '../lib/stockStatus.js';

const PAYMENT_MODES = ['Cash', 'Credit', 'Bank Transfer', 'UPI'];

function fySegmentFromDdMmYyyy(dateStr) {
  const d = parseInvoiceDate(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth();
  const fyStart = m >= 3 ? y : y - 1;
  return `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
}

function emptyLine() {
  return {
    id: uid(),
    productId: '',
    description: '',
    hsn: '28044090',
    qtyNo: '',
    qtyCum: '',
    qtyKg: '0',
    rate: '',
    ratePer: 'CUM',
    taxPct: 18,
  };
}

function resolveRequestedAmount(value, fallback, upperBound = Number.POSITIVE_INFINITY) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return Math.max(0, fallback);
  return Math.max(0, Math.min(n, upperBound));
}

export default function SalesBillingPage() {
  const {
    customers,
    sellerProfile,
    stockByProductId,
    invoiceSeq,
    saveInvoice,
    addCustomer,
    fullCatalog,
    createPaymentIntent,
    processPaymentWebhook,
    getLowFilledFor,
  } = useGasApp();

  const [invoiceDate, setInvoiceDate] = useState(todayDdMmYyyy());
  const fy = fySegmentFromDdMmYyyy(invoiceDate);
  const invoiceNo = `MIG/${fy}/${String(invoiceSeq).padStart(5, '0')}`;

  const [paymentMode, setPaymentMode] = useState('Cash');
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [customerQuery, setCustomerQuery] = useState('');
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [draftCustomer, setDraftCustomer] = useState({
    name: '',
    address: '',
    state: 'WEST BENGAL',
    stateCode: '19',
    gstNo: '',
    pan: '',
    phone: '',
  });
  const [vehicleNo, setVehicleNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [poNo, setPoNo] = useState('');
  const [poDate, setPoDate] = useState('');
  const [batchNo, setBatchNo] = useState('MIG-BT-001');
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [saveMsg, setSaveMsg] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [showExtraDetails, setShowDetails] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle', 'sent', 'confirmed'
  const [cashProvided, setCashProvided] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (!customers.find((c) => c.id === customerId) && customers[0]) setCustomerId(customers[0].id);
  }, [customers, customerId]);

  const buyer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? { name: '', address: '', state: '', stateCode: '' },
    [customers, customerId]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.gstNo?.toLowerCase().includes(q)
    );
  }, [customers, customerQuery]);

  const totals = useMemo(() => computeTotals(items), [items]);
  const taxLabels = useMemo(() => taxLabelsForLines(items), [items]);

  const requestAmount = useMemo(
    () => resolveRequestedAmount(receivedAmount, totals.grand, totals.grand),
    [receivedAmount, totals.grand]
  );

  // Filterable catalog based on Meta-style UX
  const changeToReturn = useMemo(() => {
    const provided = Number(cashProvided) || 0;
    return provided > totals.grand ? provided - totals.grand : 0;
  }, [cashProvided, totals.grand]);

  const CATEGORIES = ['All', 'Oxygen', 'Nitrogen', 'Argon', 'CO2', 'DA'];
  const filteredCatalog = useMemo(() => {
    return fullCatalog.filter(p => {
      const matchesSearch = p.label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCategory === 'All' || p.label.toUpperCase().includes(activeCategory.toUpperCase());
      return matchesSearch && matchesCat;
    });
  }, [fullCatalog, searchTerm, activeCategory]);

  function handleCatalogClick(product) {
    setItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, qtyNo: (Number(item.qtyNo) || 0) + 1 }
            : item
        );
      }
      const newLine = { ...emptyLine(), productId: product.id, description: product.label, hsn: product.hsn, rate: String(product.defaultRate || ''), ratePer: product.defaultRatePer, qtyNo: '1' };
      return [...prev, newLine];
    });
  }

  const previewLines = useMemo(
    () =>
      items
        .filter((r) => r.description.trim())
        .map((row, idx) => ({
          id: row.id,
          sl: idx + 1,
          description: row.description,
          hsn: row.hsn,
          qtyNo: Number(row.qtyNo) || 0,
          qtyCum: Number(row.qtyCum) || 0,
          qtyKg: Number(row.qtyKg) || 0,
          rate: Number(row.rate) || 0,
          ratePer: row.ratePer,
          value: lineValue(row),
        })),
    [items]
  );

  const stockIssues = useMemo(() => {
    const issues = [];
    for (const row of items) {
      if (!row.productId || !row.description.trim()) continue;
      const need = Math.max(0, Math.floor(Number(row.qtyNo) || 0));
      if (need <= 0) continue;
      const st = stockByProductId[row.productId];
      const cat = fullCatalog.find((g) => g.id === row.productId);
      const label = cat?.label ?? row.productId;
      if (!st || st.filled < need) {
        issues.push({
          id: row.id,
          label,
          need,
          have: st?.filled ?? 0,
          out: !st || st.filled <= 0,
        });
      }
    }
    return issues;
  }, [items, stockByProductId]);

  useEffect(() => {
    document.title = `Sales — ₹${totals.grand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }, [totals.grand]);

  function updateItem(id, patch) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeItem(id) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  function chgQty(id, delta) {
    setItems(prev => prev.map(r => {
      if (r.id === id) {
        const next = Math.max(1, (Number(r.qtyNo) || 0) + delta);
        return { ...r, qtyNo: String(next) };
      }
      return r;
    }));
  }

  function addBlankRow() {
    setItems((prev) => [...prev, emptyLine()]);
  }

  function saveNewCustomer() {
    if (!draftCustomer.name.trim()) return;
    const id = addCustomer({
      name: draftCustomer.name.trim(),
      address: draftCustomer.address.trim(),
      state: draftCustomer.state.trim(),
      stateCode: draftCustomer.stateCode.trim(),
      gstNo: draftCustomer.gstNo.trim(),
      pan: draftCustomer.pan.trim(),
      phone: draftCustomer.phone.trim(),
    });
    setCustomerId(id);
    setNewCustomerOpen(false);
    setCustomerQuery('');
    setDraftCustomer({
      name: '',
      address: '',
      state: 'WEST BENGAL',
      stateCode: '19',
      gstNo: '',
      pan: '',
      phone: '',
    });
  }

  function handlePrint() {
    const el = document.getElementById('invoice-print-root');
    el?.scrollIntoView({ block: 'start', behavior: 'auto' });
    requestAnimationFrame(() => {
      window.print();
    });
  }

  async function handleGenerateInStoreQr() {
    setSaveMsg('');
    const amountToPay = requestAmount;
    if (amountToPay <= 0) {
      setSaveMsg('Invalid amount for QR generation.');
      return;
    }

    // Validation for stock before payment
    const filledLines = items.filter((r) => r.description.trim());
    for (const row of filledLines) {
      if (!row.productId) continue;
      const need = Math.max(0, Math.floor(Number(row.qtyNo) || 0));
      const st = stockByProductId[row.productId];
      if (!st || st.filled < need) {
        setSaveMsg(`Insufficient stock for ${row.description}.`);
        return;
      }
    }

    const upiLink = `upi://pay?pa=murshidabadindustrialgases@bank&pn=MIG&am=${amountToPay}&cu=INR`;
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`);

    setPaymentStatus('sent');
    setSaveMsg(
      amountToPay < totals.grand
        ? `Partial UPI QR generated for ₹${amountToPay}. Balance ₹${(totals.grand - amountToPay).toLocaleString('en-IN', { minimumFractionDigits: 2 })} will remain pending.`
        : `In-Store QR generated for ₹${amountToPay}. Awaiting scan...`
    );

    setTimeout(() => {
      setPaymentStatus('confirmed');
      setReceivedAmount(String(amountToPay));
      setPaymentMode('UPI');
      setQrCodeUrl('');
      setSaveMsg(
        amountToPay < totals.grand
          ? 'Partial payment confirmed. The "Save" button is now active.'
          : 'Payment Confirmed! The "Save" button is now active.'
      );
    }, 8000);
  }

  async function handleSendPaymentLink() {
    setSaveMsg('');
    const filledLines = items.filter((r) => r.description.trim());
    if (!customerId || !buyer.name) {
      setSaveMsg('Select a customer before generating link.');
      return;
    }
    if (filledLines.length === 0) {
      setSaveMsg('Add at least one line item.');
      return;
    }

    // Stock validation before requesting payment
    for (const row of filledLines) {
      if (!row.productId) continue;
      const need = Math.max(0, Math.floor(Number(row.qtyNo) || 0));
      const st = stockByProductId[row.productId];
      if (!st || st.filled < need) {
        setSaveMsg(`Insufficient stock for ${row.description}.`);
        return;
      }
    }

    // 1. Create Payment Intent via "Gateway"
    const intentAmount = requestAmount;
    const intent = await createPaymentIntent(intentAmount, customerId, { fy, invoiceNo });
    
    const message = `*MIG PAYMENT REQUEST*\nDear ${buyer.name}, your bill for ₹${intentAmount.toLocaleString('en-IN')} is ready.\nSecure Payment Link: ${intent.link}\n- Murshidabad Industrial Gases`;
    
    window.open(`https://wa.me/91${buyer.phone}?text=${encodeURIComponent(message)}`, '_blank');
    
    setPaymentStatus('sent');
    setSaveMsg('Payment link sent. Awaiting secure confirmation from Gateway Server...');

    // 2. Simulate Server Webhook after customer "pays"
    setTimeout(() => {
      processPaymentWebhook(intent.id);
      setPaymentStatus('confirmed');
      setReceivedAmount(String(intentAmount));
      setPaymentMode('Bank Transfer');
      setSaveMsg(
        intentAmount < totals.grand
          ? `Partial payment received for ₹${intentAmount}. Save the invoice to keep balance pending.`
          : 'Payment Received! The "Save" button is now active.'
      );
    }, 7000);
  }

  function handleSaveInvoice() {
    setSaveMsg('');
    const filledLines = items.filter((r) => r.description.trim());
    if (!customerId || !buyer.name) {
      setSaveMsg('Select a customer.');
      return;
    }
    if (filledLines.length === 0) {
      setSaveMsg('Add at least one line item.');
      return;
    }

    const stockMoves = [];
    for (const row of filledLines) {
      if (!row.productId) continue;
      const need = Math.max(0, Math.floor(Number(row.qtyNo) || 0));
      if (need <= 0) {
        setSaveMsg(`Set QTY IN NO (cylinders) for stock-tracked line: ${row.description.slice(0, 40)}…`);
        return;
      }
      stockMoves.push({ productId: row.productId, qtyNo: need });
    }

    if (stockMoves.length === 0) {
      setSaveMsg('Choose a catalog product for each line (or we cannot adjust stock).');
      return;
    }

    for (const m of stockMoves) {
      const st = stockByProductId[m.productId];
      if (!st || st.filled < m.qtyNo) {
        setSaveMsg('Insufficient filled stock for one or more lines. Check warnings.');
        return;
      }
    }

    const payload = {
      invoiceNo,
      invoiceDate,
      paymentMode,
      transactionId,
      customerId,
      buyerSnapshot: { ...buyer },
      vehicleNo,
      challanNo,
      challanDate,
      poNo,
      poDate,
      batchNo,
      lines: filledLines.map((r) => ({ ...r, value: lineValue(r) })),
      totals,
      stockMoves,
      receivedAmount: Number(receivedAmount) || 0,
      paymentDueDate,
    };

    const res = saveInvoice(payload);
    if (!res.ok) {
      setSaveMsg(res.error);
      return;
    }

    setSaveMsg(`Saved invoice ${res.id}. Stock updated.`);
    setItems([]);
    setVehicleNo('');
    setTransactionId('');
    setChallanNo('');
    setChallanDate('');
    setPoNo('');
    setPoDate('');
    setReceivedAmount('');
    setPaymentDueDate('');
    setCashProvided('');
    setQrCodeUrl('');
    setPaymentStatus('idle');
  }

  return (
    <div className="sales-billing-layout flex min-h-full flex-col lg:flex-row bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
        }
      ` }} />
      <div className="print-root-hidden w-full shrink-0 border-b border-blue-100 bg-white lg:w-[460px] lg:border-b-0 lg:border-r shadow-xl z-10">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur-lg px-6 py-5">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Sales Terminal</h1>
          <p className="text-[10px] font-bold text-brand-purple uppercase tracking-widest mt-1">Transaction Processing</p>
        </div>
        <div className="space-y-8 p-6">
          <div className="rounded-3xl border border-blue-50 bg-blue-50/30 p-5 shadow-inner">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">Invoice ID</div>
                <div className="font-mono text-lg font-black text-blue-900">{invoiceNo}</div>
              </div>
              <div className="ml-auto flex flex-col items-end gap-2">
                <input
                  value={invoiceDate}
                  disabled={paymentStatus !== 'idle'}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-purple/20"
                />
                <div className="inline-flex rounded-xl bg-white p-1 shadow-md border border-slate-100">
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={paymentStatus !== 'idle'}
                      onClick={() => setPaymentMode(m)}
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition-all ${
                        paymentMode === m ? 'bg-brand-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {stockIssues.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <div className="font-bold">Stock warning</div>
              <ul className="mt-1 list-inside list-disc text-xs">
                {stockIssues.map((x) => (
                  <li key={x.id}>
                    {x.label}: need {x.need} filled, have {x.have}
                    {x.out ? ' — OUT OF STOCK' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {saveMsg && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                saveMsg.startsWith('Saved') ? 'border border-emerald-200 bg-emerald-50 text-emerald-900' : 'border border-amber-200 bg-amber-50 text-amber-950'
              }`}
            >
              {saveMsg}
            </div>
          )}

          <section>
            <h2 className="text-xs font-bold uppercase text-slate-500">Customer</h2>
            <input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              disabled={paymentStatus !== 'idle'}
              placeholder="Search…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={paymentStatus !== 'idle'}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNewCustomerOpen((v) => !v)}
              className="mt-2 text-xs font-semibold text-brand-emerald hover:underline"
            >
              {newCustomerOpen ? 'Close new customer' : '+ New customer'}
            </button>
            {newCustomerOpen && (
              <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                <input
                  placeholder="Name *"
                  value={draftCustomer.name}
                  onChange={(e) => setDraftCustomer((d) => ({ ...d, name: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <textarea
                  placeholder="Address"
                  value={draftCustomer.address}
                  onChange={(e) => setDraftCustomer((d) => ({ ...d, address: e.target.value }))}
                  rows={2}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="State"
                    value={draftCustomer.state}
                    disabled={paymentStatus !== 'idle'}
                    onChange={(e) => setDraftCustomer((d) => ({ ...d, state: e.target.value }))}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <input
                    placeholder="Code"
                    value={draftCustomer.stateCode}
                    disabled={paymentStatus !== 'idle'}
                    onChange={(e) => setDraftCustomer((d) => ({ ...d, stateCode: e.target.value }))}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveNewCustomer}
                  className="w-full rounded-lg bg-brand-emerald py-2 text-sm font-semibold text-white"
                >
                  Save customer
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <button 
              type="button" 
              onClick={() => setShowDetails(!showExtraDetails)}
              disabled={paymentStatus !== 'idle'}
              className="flex w-full items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"
            >
              <span>Transaction Details</span>
              <i className={`fa-solid ${showExtraDetails ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            </button>
            {showExtraDetails && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Vehicle No" value={vehicleNo} disabled={paymentStatus !== 'idle'} onChange={setVehicleNo} />
                <Field label="Challan No" value={challanNo} disabled={paymentStatus !== 'idle'} onChange={setChallanNo} />
                <Field label="Challan date" value={challanDate} disabled={paymentStatus !== 'idle'} onChange={setChallanDate} />
                <Field label="PO No" value={poNo} disabled={paymentStatus !== 'idle'} onChange={setPoNo} />
                <Field label="PO date" value={poDate} disabled={paymentStatus !== 'idle'} onChange={setPoDate} />
                <Field label="Batch no" value={batchNo} disabled={paymentStatus !== 'idle'} onChange={setBatchNo} />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Payment Reconciliation</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount Received (₹)" value={receivedAmount} disabled={paymentStatus !== 'idle'} onChange={setReceivedAmount} />
              <Field label="Due Date" value={paymentDueDate} disabled={paymentStatus !== 'idle'} onChange={setPaymentDueDate} hint="DD/MM/YYYY" />
            </div>
            {paymentMode === 'Cash' && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-amber-200/50 pt-4">
                <Field 
                  label="Cash Provided (₹)" 
                  value={cashProvided} 
                  onChange={setCashProvided} 
                  disabled={paymentStatus === 'confirmed'}
                />
                <div className="flex flex-col justify-end">
                   <div className="text-[10px] font-black uppercase text-amber-600">Change to Return</div>
                   <div className="text-lg font-black text-slate-900">₹{changeToReturn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
          </section>

          {paymentMode !== 'Cash' && (
            <section className="rounded-2xl border border-brand-blue/10 bg-brand-blue/5 p-4">
              <Field label="UTR / Transaction ID" value={transactionId} onChange={setTransactionId} />
            </section>
          )}

          <section>
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase text-slate-500">Quick Product Select</h2>
                  <button type="button" onClick={addBlankRow} className="text-[10px] font-bold text-brand-emerald hover:underline">
                    + Manual Line
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      disabled={paymentStatus !== 'idle'}
                      onClick={() => setActiveCategory(cat)}
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold transition-all ${
                        activeCategory === cat ? 'bg-brand-emerald text-white shadow-md' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input
                    value={searchTerm}
                    disabled={paymentStatus !== 'idle'}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search catalog..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-sm focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-1 custom-sidebar-nav ${paymentStatus !== 'idle' ? 'opacity-50 pointer-events-none' : ''}`}>
                {filteredCatalog.map(p => {
                  const st = stockByProductId[p.id];
                  const b = stockBadge(st?.filled ?? 0, getLowFilledFor(p.id));
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleCatalogClick(p)}
                      className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-brand-emerald hover:shadow-md active:scale-95"
                    >
                      <div className="text-[10px] font-bold text-slate-400">{p.hsn}</div>
                      <div className="mt-0.5 text-xs font-black text-slate-800 line-clamp-1">{p.label}</div>
                      <div className="mt-2 flex w-full items-center justify-between">
                        <span className="text-[10px] font-bold text-brand-emerald">₹{p.defaultRate}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                          b.tone === 'out' ? 'bg-red-100 text-red-700' : b.tone === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {st?.filled ?? 0}F
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <h2 className="text-xs font-bold uppercase text-slate-500">Cart / Line items</h2>
              {items.map((row) => {
                const cat = row.productId ? fullCatalog.find((g) => g.id === row.productId) : null;
                const st = row.productId ? stockByProductId[row.productId] : null;
                const b = cat && st ? stockBadge(st.filled, getLowFilledFor(cat.id)) : null;
                return (
                  <div key={row.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <input
                          value={row.description}
                          readOnly={paymentStatus !== 'idle'}
                          onChange={(e) => updateItem(row.id, { description: e.target.value })}
                          className="w-full bg-transparent font-bold text-slate-800 focus:outline-none"
                          placeholder="Item description..."
                        />
                      </div>
                      {paymentStatus === 'idle' && <button type="button" onClick={() => removeItem(row.id)} className="text-slate-300 hover:text-red-500">
                        <i className="fa-solid fa-circle-xmark"></i>
                      </button>}
                    </div>
                    
                    <div className="mt-4 flex items-center gap-4">
                      <div className={`flex items-center rounded-xl bg-slate-100 p-1 ${paymentStatus !== 'idle' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button 
                          type="button" 
                          onClick={() => chgQty(row.id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm text-slate-600 hover:bg-slate-50"
                        >
                          <i className="fa-solid fa-minus text-[10px]"></i>
                        </button>
                        <input
                          value={row.qtyNo}
                          onChange={(e) => updateItem(row.id, { qtyNo: e.target.value })}
                          className="w-10 bg-transparent text-center text-sm font-black text-slate-800"
                        />
                        <button 
                          type="button" 
                          onClick={() => chgQty(row.id, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm text-slate-600 hover:bg-slate-50"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i>
                        </button>
                      </div>
                      <div className="flex-1">
                        <MiniField label="Rate" value={row.rate} disabled={paymentStatus !== 'idle'} onChange={(v) => updateItem(row.id, { rate: v })} />
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Total</div>
                        <div className="text-sm font-black text-brand-emerald">₹{lineValue(row).toLocaleString('en-IN')}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-50 pt-3">
                      <MiniField label="HSN" value={row.hsn} disabled={paymentStatus !== 'idle'} onChange={(v) => updateItem(row.id, { hsn: v })} />
                      <MiniField label="CUM" value={row.qtyCum} disabled={paymentStatus !== 'idle'} onChange={(v) => updateItem(row.id, { qtyCum: v })} />
                      <MiniField label="KG" value={row.qtyKg} disabled={paymentStatus !== 'idle'} onChange={(v) => updateItem(row.id, { qtyKg: v })} />
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400">Per</label>
                        <select
                          value={row.ratePer}
                          disabled={paymentStatus !== 'idle'}
                          onChange={(e) => updateItem(row.id, { ratePer: e.target.value })}
                          className="mt-0.5 w-full bg-transparent text-[10px] font-bold text-slate-600 focus:outline-none"
                        >
                          <option value="CUM">CUM</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="rounded-xl border border-gold/40 bg-gold-muted px-4 py-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-600">Taxable</div>
              <div className="text-right font-semibold">₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="text-slate-600">CGST</div>
              <div className="text-right font-semibold">₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="text-slate-600">SGST</div>
              <div className="text-right font-semibold">₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="font-bold text-brand-emerald">Grand</div>
              <div className="text-right text-lg font-bold text-brand-emerald">
                ₹{totals.grand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-6">
            {paymentStatus === 'idle' && !qrCodeUrl && (
              <>
                {paymentMode === 'UPI' && (
                  <button
                    type="button"
                    onClick={handleGenerateInStoreQr}
                    className="rounded-lg bg-brand-emerald px-5 py-2.5 text-sm font-bold text-white hover:brightness-95 shadow-lg shadow-brand-emerald/20"
                  >
                    <i className="fa-solid fa-qrcode mr-2"></i> Generate In-Store QR
                  </button>
                )}

                {(paymentMode === 'UPI' || paymentMode === 'Bank Transfer') && (
                  <button
                    type="button"
                    onClick={handleSendPaymentLink}
                    className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:brightness-95 shadow-lg shadow-brand-blue/20"
                  >
                    <i className="fa-solid fa-paper-plane mr-2"></i> Send Payment Link (Remote)
                  </button>
                )}

                {paymentMode === 'Cash' && (
                  <button
                    type="button"
                    disabled={cashProvided && Number(cashProvided) < totals.grand}
                    onClick={() => {
                      const tendered = resolveRequestedAmount(cashProvided, totals.grand, Number.POSITIVE_INFINITY);
                      const settled = Math.min(tendered, totals.grand);
                      setPaymentStatus('confirmed');
                      setReceivedAmount(String(settled));
                      if (tendered > totals.grand) {
                        setSaveMsg(
                          `Cash payment confirmed. Return ₹${(tendered - totals.grand).toLocaleString('en-IN', { minimumFractionDigits: 2 })} as change.`
                        );
                      } else {
                        setSaveMsg('Cash payment confirmed. You can now save the invoice.');
                      }
                    }}
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all ${
                      cashProvided && Number(cashProvided) < totals.grand
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-amber-500 hover:brightness-95 shadow-amber-500/20'
                    }`}
                  >
                    <i className="fa-solid fa-money-bill-check mr-2"></i> Confirm Cash Received
                  </button>
                )}

                {paymentMode === 'Credit' && !receivedAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('confirmed');
                      setSaveMsg('Full Credit transaction confirmed.');
                    }}
                    className="rounded-lg bg-slate-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-95 shadow-lg"
                  >
                    <i className="fa-solid fa-hand-holding-dollar mr-2"></i> Confirm Credit Sale
                  </button>
                )}
              </>
            )}

            {paymentStatus === 'sent' && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-500 border border-slate-200 shadow-inner">
                <i className="fa-solid fa-spinner animate-spin text-brand-blue"></i>
                Verifying Payment Confirmation...
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveInvoice}
              disabled={paymentStatus !== 'confirmed'}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
                paymentStatus === 'confirmed' 
                  ? 'bg-gold text-emerald-950 hover:brightness-95 shadow-lg ring-2 ring-gold/20' 
                  : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {paymentStatus === 'confirmed' ? '✓ Save Invoice & Deduct Stock' : 'Save Invoice (Locked)'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg border-2 border-brand-emerald px-5 py-2.5 text-sm font-semibold text-brand-emerald hover:bg-emerald-50"
            >
              Print A4
            </button>
          </div>
        </div>
      </div>

      {qrCodeUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900">Scan to Pay</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 mb-6">UPI In-Store Payment</p>
            <div className="mx-auto aspect-square w-full max-w-[200px] border-4 border-slate-50 p-2 rounded-2xl shadow-inner">
              <img src={qrCodeUrl} alt="UPI QR Code" className="w-full h-full object-contain" />
            </div>
            <div className="mt-6 text-2xl font-black text-brand-emerald">
              ₹{(Number(receivedAmount) || totals.grand).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-[10px] font-bold text-slate-400">Waiting for payment confirmation...</p>
            <button 
              onClick={() => { setQrCodeUrl(''); setPaymentStatus('idle'); }}
              className="mt-8 w-full py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
            >
              Cancel Transaction
            </button>
          </div>
        </div>
      )}

      <div className="sales-billing-preview-wrap invoice-print-scroll min-h-[60vh] flex-1 overflow-auto border-l border-gold/25 bg-white p-4 lg:min-h-0">
        <p className="print-root-hidden mb-2 text-center text-xs font-semibold text-brand-emerald">Live invoice preview</p>
        <div
          id="invoice-print-root"
          className="mx-auto bg-white shadow-md print:shadow-none"
          style={{ width: '297mm' }}
        >
          <InvoiceA4Preview
            invoiceNo={invoiceNo}
            invoiceDate={invoiceDate}
            seller={sellerProfile}
            buyer={buyer}
            poNo={poNo}
            poDate={poDate}
            challanNo={challanNo}
            challanDate={challanDate}
            vehicleNo={vehicleNo}
            batchNo={batchNo}
            lines={previewLines}
            taxableTotal={totals.taxable}
            cgstTotal={totals.cgst}
            sgstTotal={totals.sgst}
            gstPercentLabel={taxLabels.cgst}
            gstSgstLabel={taxLabels.sgst}
            grandTotal={totals.grand}
            paymentMode={paymentMode}
            transactionId={transactionId}
            receivedAmount={Number(receivedAmount) || 0}
            paymentDueDate={paymentDueDate}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase text-slate-500">{label}</label>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function MiniField({ label, value, onChange, hint, disabled }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase text-slate-500">
        {label}
        {hint ? <span className="font-normal text-slate-400"> ({hint})</span> : null}
      </label>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
    </div>
  );
}
