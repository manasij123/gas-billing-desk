import { useState, useMemo } from 'react';
import { useGasApp } from '../state/GasAppContext.jsx';
import NavIcon from '../components/NavIcon.jsx';
import InvoiceA4Preview from '../components/InvoiceA4Preview.jsx';
import { parseInvoiceDate } from '../lib/dates.js';
import { todayDdMmYyyy } from '../lib/dates.js';
export default function InvoiceLookupPage({ onNavigate }) {
  const { invoices, sellerProfile, updateInvoice } = useGasApp();
  const [query, setQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Applied filters (the ones actually controlling the table)
  const [appliedFilters, setAppliedFilters] = useState({
    dateRange: 'All Time',
    status: 'All',
    paymentMode: 'All', // All, Cash, Credit, Bank Transfer
    minAmount: '',
    maxAmount: ''
  });

  // Temporary filters (the ones in the menu before clicking Apply)
  const [tempFilters, setTempFilters] = useState({ ...appliedFilters });

  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...invoices];

    // 1. Search Query Filter
    if (q) {
      list = list.filter(inv => 
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.buyerSnapshot.name.toLowerCase().includes(q) ||
        inv.buyerSnapshot.phone?.toLowerCase().includes(q)
      );
    }

    // 2. Status Filter (Paid vs Credit)
    if (appliedFilters.status !== 'All') {
      list = list.filter(inv => {
        const isPaid = inv.paymentMode === 'Cash' || inv.paymentMode === 'Bank Transfer';
        return appliedFilters.status === 'Paid' ? isPaid : (inv.paymentMode === 'Credit');
      });
    }

    // 2.1 Payment Mode Filter
    if (appliedFilters.paymentMode !== 'All') {
      list = list.filter(inv => inv.paymentMode === appliedFilters.paymentMode);
    }

    // 3. Amount/Turnover Range Filter
    if (appliedFilters.minAmount) {
      list = list.filter(inv => inv.totals.grand >= Number(appliedFilters.minAmount));
    }
    if (appliedFilters.maxAmount) {
      list = list.filter(inv => inv.totals.grand <= Number(appliedFilters.maxAmount));
    }

    // 4. Date Filter logic
    if (appliedFilters.dateRange !== 'All Time') {
      const now = new Date();
      list = list.filter(inv => {
        const invDate = new Date(inv.savedAt);
        if (appliedFilters.dateRange === 'This Month') {
          return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
        }
        if (appliedFilters.dateRange === 'Last 6 Months') {
          const limit = new Date();
          limit.setMonth(now.getMonth() - 6);
          return invDate >= limit;
        }
        if (appliedFilters.dateRange === 'This Year') {
          return invDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // 5. Sort order
    if (sortOrder === 'newest') {
      list = [...list].sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
    } else if (sortOrder === 'amount') {
      list = [...list].sort((a, b) => b.totals.grand - a.totals.grand);
    }

    return list;
  }, [invoices, query, sortOrder, appliedFilters]);

  const stats = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      acc.total += inv.totals.grand;
      if (inv.paymentMode === 'Credit') acc.unpaid += inv.totals.grand;
      else acc.paid += inv.totals.grand;
      return acc;
    }, { total: 0, paid: 0, unpaid: 0 });
  }, [filteredInvoices]);

  const exportToCSV = () => {
    const headers = ['Invoice No,Date,Customer,Amount,Status'];
    const rows = filteredInvoices.map(inv => 
      `${inv.invoiceNo},${inv.invoiceDate},${inv.buyerSnapshot.name},${inv.totals.grand},${inv.paymentMode === 'Cash' ? 'PAID' : 'OVERDUE'}`
    );
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoices_export_${new Date().getTime()}.csv`;
    link.click();
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.dateRange !== 'All Time') count++;
    if (appliedFilters.status !== 'All') count++;
    if (appliedFilters.minAmount || appliedFilters.maxAmount) count++;
    return count;
  }, [appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...tempFilters });
    setShowFilterMenu(false);
  };

  const clearFilter = (key, defaultValue) => {
    const next = { ...appliedFilters, [key]: defaultValue };
    setAppliedFilters(next);
    setTempFilters(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const bulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} invoices?`)) {
      // Implementation for delete logic would go here
      alert('Bulk delete triggered for IDs: ' + Array.from(selectedIds).join(', '));
      setSelectedIds(new Set());
    }
  };

  /** Helper to check if current date passed the due date */
  const isOverdue = (dueDateStr) => {
    if (!dueDateStr || dueDateStr.trim() === '') return false;
    const dueDate = parseInvoiceDate(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    return today > dueDate;
  };

  /** Mark invoice as fully paid (offline/cash scenario) */
  const handleApproveManually = (inv) => {
    if (confirm('Mark this invoice as fully paid and approved?')) {
      updateInvoice(inv.id, { receivedAmount: inv.totals.grand, paymentMode: 'Cash', paymentDate: todayDdMmYyyy() });
      alert('Invoice marked as PAID.');
    }
  };

  const sendPaymentLink = (inv) => {
    const due = inv.totals.grand - (inv.receivedAmount || 0);
    const message = `Dear ${inv.buyerSnapshot.name}, please complete your payment of ₹${due} for invoice #${inv.invoiceNo.split('/').pop()} using this link: https://pay.mig.com/${inv.id} . - Murshidabad Industrial Gases`;
    
    // Simulation: Mark as paid via Bank Transfer after 5 seconds to simulate link usage
    if (confirm(`Send payment link for ₹${due} via WhatsApp?`)) {
      window.open(`https://wa.me/91${inv.buyerSnapshot.phone}?text=${encodeURIComponent(message)}`, '_blank');
      alert("Simulation: Payment will be auto-processed in 5 seconds via link callback.");
      setTimeout(() => {
        updateInvoice(inv.id, { receivedAmount: inv.totals.grand, paymentMode: 'Bank Transfer', paymentDate: todayDdMmYyyy() });
      }, 5000);
    }
  };

  const sendWhatsAppReminder = (inv) => {
    const balance = inv.totals.grand - (inv.receivedAmount || 0);
    const message = `*PAYMENT REMINDER*
Dear ${inv.buyerSnapshot.name}, your invoice #${inv.invoiceNo.split('/').pop()} is now OVERDUE.
Total Bill: ₹${inv.totals.grand}
Amount Paid: ₹${inv.receivedAmount || 0}
*Current Balance: ₹${balance}*

Please clear the payment at the earliest. Thank you.
- Murshidabad Industrial Gases`;
    
    window.open(`https://wa.me/91${inv.buyerSnapshot.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="p-6 lg:p-8 min-h-full bg-slate-50">
      {/* Page Header - mimicking sample_1.png */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-sm font-medium text-slate-500">History & Documentation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-xs font-bold text-slate-400 uppercase mr-2">Quick Date:</div>
          <button 
            onClick={() => {
              const next = appliedFilters.dateRange === 'This Month' ? 'All Time' : 'This Month';
              setAppliedFilters(prev => ({ ...prev, dateRange: next, status: 'All', paymentMode: 'All', minAmount: '', maxAmount: '' }));
              setTempFilters(prev => ({ ...prev, dateRange: next }));
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-bold shadow-sm transition-all ${appliedFilters.dateRange === 'This Month' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            This Month
          </button>
          <button onClick={exportToCSV} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-all">
            Export as .CSV
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('sales')}
            className="rounded-xl bg-brand-blue px-5 py-2 text-sm font-black text-white shadow-lg shadow-brand-blue/20 hover:brightness-95 transition-all"
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {/* Filter Stats Summary - NEW INSIGHTFUL OPTION */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase">Filtered Total</div>
          <div className="text-xl font-black text-slate-900">₹{stats.total.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
          <div className="text-[10px] font-black text-emerald-600 uppercase">Total Received</div>
          <div className="text-xl font-black text-emerald-700">₹{stats.paid.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
          <div className="text-[10px] font-black text-rose-600 uppercase">Total Pending</div>
          <div className="text-xl font-black text-rose-700">₹{stats.unpaid.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Toolbar & Active Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 ${activeFilterCount > 0 ? 'border-brand-blue ring-2 ring-brand-blue/5' : ''}`}
            >
              <i className="fa-solid fa-filter text-slate-400"></i>
              Filter {activeFilterCount > 0 && (
                <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Dropdown Menu */}
            {showFilterMenu && (
              <div className="absolute left-0 top-full mt-2 z-30 w-80 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in slide-in-from-top-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date Range</label>
                    <select 
                      value={tempFilters.dateRange}
                      onChange={(e) => setTempFilters(f => ({ ...f, dateRange: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all"
                    >
                      <option>All Time</option>
                      <option>This Month</option>
                      <option>Last 6 Months</option>
                      <option>This Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Payment Mode</label>
                    <select 
                      value={tempFilters.paymentMode}
                      onChange={(e) => setTempFilters(f => ({ ...f, paymentMode: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold focus:bg-white focus:outline-none"
                    >
                      <option value="All">All Modes</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit (Due)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Payment Status</label>
                    <div className="mt-2 flex gap-2">
                      {['All', 'Paid', 'Unpaid'].map(s => (
                        <button
                          key={s}
                          onClick={() => setTempFilters(f => ({ ...f, status: s }))}
                          className={`flex-1 rounded-xl py-2 text-[10px] font-black uppercase transition-all ${tempFilters.status === s ? 'bg-brand-blue text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Turnover Range (₹)</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input 
                        type="number"
                        placeholder="Min"
                        value={tempFilters.minAmount}
                        onChange={(e) => setTempFilters(f => ({ ...f, minAmount: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold focus:bg-white focus:outline-none"
                      />
                      <span className="text-slate-300">—</span>
                      <input 
                        type="number"
                        placeholder="Max"
                        value={tempFilters.maxAmount}
                        onChange={(e) => setTempFilters(f => ({ ...f, maxAmount: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={() => { setTempFilters({ dateRange: 'All Time', status: 'All', minAmount: '', maxAmount: '' }); }}
                      className="flex-1 rounded-xl py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                    >
                      Reset
                    </button>
                    <button 
                      onClick={handleApplyFilters}
                      className="flex-1 rounded-xl bg-brand-blue py-2.5 text-xs font-black text-white shadow-lg shadow-brand-blue/20 hover:brightness-95 transition-all"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'amount' : 'newest')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            <i className="fa-solid fa-sort text-slate-400"></i>
            Sort Order
          </button>

          <div className="flex gap-2">
            {/* Active filter tags/chips */}
            {appliedFilters.dateRange !== 'All Time' && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-500 shadow-sm uppercase tracking-tight">
                {appliedFilters.dateRange}
                <button 
                  onClick={() => clearFilter('dateRange', 'All Time')} 
                  className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {appliedFilters.status !== 'All' && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-500 shadow-sm uppercase tracking-tight">
                Status: {appliedFilters.status}
                <button 
                  onClick={() => clearFilter('status', 'All')} 
                  className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {(appliedFilters.minAmount || appliedFilters.maxAmount) && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-500 shadow-sm uppercase tracking-tight">
                ₹{appliedFilters.minAmount || '0'} - ₹{appliedFilters.maxAmount || '∞'}
                <button 
                  onClick={() => { clearFilter('minAmount', ''); clearFilter('maxAmount', ''); }} 
                  className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID or Name... (⌘ /)" 
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm font-medium focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/5 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Bulk Action Bar - appears when rows are selected */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-brand-blue p-4 rounded-2xl text-white shadow-lg animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-black">{selectedIds.size} Invoices Selected</span>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold underline opacity-80 hover:opacity-100">Deselect All</button>
          </div>
          <div className="flex gap-3">
            <button className="bg-white/20 px-4 py-1.5 rounded-xl text-xs font-black hover:bg-white/30 transition-all">Bulk Export</button>
            <button onClick={bulkDelete} className="bg-rose-500 px-4 py-1.5 rounded-xl text-xs font-black hover:bg-rose-600 transition-all">Delete Selected</button>
          </div>
        </div>
      )}

      {/* Main Data Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue" 
                  checked={filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-5">Invoice ID</th>
              <th className="px-6 py-5">Customer</th>
              <th className="px-6 py-5">Amount Due</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Product</th>
              <th className="px-6 py-5">Date</th>
              <th className="px-6 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center text-slate-300 font-medium italic">No invoices found matching your criteria.</td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr 
                  key={inv.id} 
                  onClick={() => setSelectedInvoice(inv)}
                  className={`group cursor-pointer transition-all hover:bg-blue-50/30 ${selectedInvoice?.id === inv.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue" 
                      checked={selectedIds.has(inv.id)}
                      onChange={() => toggleSelectOne(inv.id)}
                    />
                  </td>
                  <td className="px-4 py-4 font-mono text-xs font-black text-slate-900">#{inv.invoiceNo.split('/').pop()}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{inv.buyerSnapshot.name}</td>
                  <td className="px-6 py-4 font-black text-slate-900">₹{inv.totals.grand.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    {(() => {
                      const balance = inv.totals.grand - (inv.receivedAmount || 0);
                      if (balance <= 0) return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 shadow-sm">
                          <i className="fa-solid fa-circle-check text-[8px]"></i> APPROVED
                        </span>
                      );
                      if (inv.receivedAmount > 0) return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700 shadow-sm">
                          <i className="fa-solid fa-spinner text-[8px]"></i> PARTIAL
                        </span>
                      );
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 shadow-sm">
                          <i className="fa-solid fa-clock text-[8px]"></i> UNPAID
                        </span>
                      );
                    })()}
                    {inv.totals.grand - (inv.receivedAmount || 0) > 0 && isOverdue(inv.paymentDueDate) && (
                      <div className="text-[8px] font-black text-red-500 animate-pulse mt-1 ml-1 uppercase">Overdue</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {inv.lines.length} {inv.lines.length === 1 ? 'item' : 'items'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-bold">{inv.invoiceDate}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {inv.totals.grand - (inv.receivedAmount || 0) <= 0 ? (
                        <button 
                          onClick={() => { setSelectedInvoice(inv); setTimeout(() => window.print(), 100); }}
                          className="rounded-xl bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-all"
                        >
                          <i className="fa-solid fa-print mr-1"></i> Print
                        </button>
                      ) : (
                        <>
                          {isOverdue(inv.paymentDueDate) && (
                            <button onClick={() => sendWhatsAppReminder(inv)} className="rounded-xl bg-amber-500 px-3 py-1.5 text-[10px] font-black uppercase text-white shadow-sm hover:brightness-95 transition-all">
                              Remind
                            </button>
                          )}
                          <button onClick={() => handleApproveManually(inv)} className="rounded-xl bg-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase text-white shadow-sm hover:brightness-95 transition-all">
                            Approve
                          </button>
                          <button onClick={() => sendPaymentLink(inv)} className="rounded-xl bg-blue-500 px-3 py-1.5 text-[10px] font-black uppercase text-white shadow-sm hover:brightness-95 transition-all">
                            Link
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Footer / Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4">
          <span className="text-xs font-bold text-slate-400">
            Showing 1-{Math.min(filteredInvoices.length, 10)} of {filteredInvoices.length} results
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Rows per page:</span>
              <select className="bg-transparent focus:outline-none font-black transition-all cursor-pointer"><option>10</option></select>
            </div>
            <div className="flex gap-1">
              <button className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 shadow-sm hover:bg-slate-50 transition-colors"><i className="fa-solid fa-chevron-left text-[10px]"></i></button>
              <button className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 shadow-sm hover:bg-slate-50 transition-colors"><i className="fa-solid fa-chevron-right text-[10px]"></i></button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Slide-over Panel - matching architecture of premium apps */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-all duration-500">
          <div className="h-full w-full max-w-5xl bg-white shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-md px-8 py-5">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedInvoice(null)} className="rounded-full bg-slate-100 p-2.5 text-slate-500 hover:bg-slate-200 transition-all">
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-none">Invoice Details</h2>
                  <p className="text-xs font-bold text-brand-blue mt-1 uppercase tracking-widest">{selectedInvoice.invoiceNo}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="rounded-xl bg-brand-emerald px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-brand-emerald/20 flex items-center gap-2 hover:brightness-95 transition-all">
                  <i className="fa-solid fa-print"></i> Print Invoice
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-300 hover:text-slate-600 transition-colors">
                  <i className="fa-solid fa-xmark text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-8 bg-slate-50/50 min-h-screen flex justify-center">
              <div id="invoice-print-root" className="shadow-2xl bg-white rounded-lg overflow-hidden border border-slate-200">
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
          </div>
        </div>
      )}
    </div>
  );
}