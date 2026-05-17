import { useState, useMemo } from 'react';
import { useGasApp } from '../state/GasAppContext.jsx';
import NavIcon from '../components/NavIcon.jsx';
import InvoiceA4Preview from '../components/InvoiceA4Preview.jsx';

export default function InvoiceLookupPage() {
  const { invoices, sellerProfile } = useGasApp();
  const [query, setQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return invoices.filter(inv => 
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.buyerSnapshot.name.toLowerCase().includes(q) ||
      inv.buyerSnapshot.phone?.toLowerCase().includes(q) ||
      inv.transactionId?.toLowerCase().includes(q) ||
      inv.lines.some(line => line.serials?.toLowerCase().includes(q))
    );
  }, [invoices, query]);

  return (
    <div className="p-6 min-h-full bg-white">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-brand-emerald p-2 text-gold shadow-sm">
          <NavIcon id="sales" active={true} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoice Lookup</h1>
          <p className="text-sm text-slate-500">Search by Invoice No, Name, Phone or Transaction ID</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Search & Results */}
        <div className="w-full lg:w-96 shrink-0 space-y-4 print:hidden">
          <div className="rounded-xl border border-gold/30 bg-white p-4 shadow-sm">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full rounded-lg border-2 border-brand-emerald/10 px-4 py-2.5 focus:border-brand-emerald focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            {query && filteredInvoices.length === 0 && (
              <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                No matches found
              </div>
            )}
            
            {filteredInvoices.map(inv => (
              <button
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedInvoice?.id === inv.id 
                    ? 'border-brand-emerald bg-brand-emerald/5 shadow-md' 
                    : 'border-gold/20 bg-white hover:border-brand-emerald/40 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-brand-emerald">{inv.invoiceNo}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{inv.invoiceDate}</span>
                </div>
                <div className="mt-1 font-semibold text-slate-800 truncate">{inv.buyerSnapshot.name}</div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-slate-500">{inv.buyerSnapshot.phone || 'No Phone'}</span>
                  <span className="font-bold text-slate-700">₹{inv.totals.grand.toLocaleString('en-IN')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Invoice Preview */}
        <div className="flex-1 min-w-0">
          {selectedInvoice ? (
            <div className="space-y-4">
              <div className="flex justify-end print:hidden">
                <button
                  onClick={() => window.print()}
                  className="rounded-lg bg-brand-emerald px-6 py-2 text-sm font-bold text-white hover:bg-brand-emerald-dark transition-colors shadow-lg"
                >
                  Print This Invoice
                </button>
              </div>
              <div id="invoice-print-root" className="mx-auto shadow-2xl origin-top transform scale-[0.85] lg:scale-100">
                <InvoiceA4Preview 
                  {...selectedInvoice} 
                  seller={sellerProfile}
                  buyer={selectedInvoice.buyerSnapshot}
                  taxableTotal={selectedInvoice.totals.taxable}
                  cgstTotal={selectedInvoice.totals.cgst}
                  sgstTotal={selectedInvoice.totals.sgst}
                  gstPercentLabel={selectedInvoice.totals.taxable > 0 ? "9%" : "0%"}
                  gstSgstLabel={selectedInvoice.totals.taxable > 0 ? "9%" : "0%"}
                  grandTotal={selectedInvoice.totals.grand}
                />
              </div>
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 print:hidden">
              <div className="text-center">
                <div className="text-5xl mb-4 text-slate-200">📄</div>
                <p className="font-medium">Select an invoice from the left to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}