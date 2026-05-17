import { useState } from 'react';
import { useGasApp } from '../state/GasAppContext.jsx';

export default function PartiesPage() {
  const { customers, suppliers, addCustomer, updateCustomer, deleteCustomer, addSupplier, updateSupplier, deleteSupplier } =
    useGasApp();
  const [tab, setTab] = useState('customers');

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Parties</h1>
      <p className="mt-1 text-sm text-slate-600">Customers (you sell to) and suppliers (you buy from).</p>

      <div className="mt-4 inline-flex rounded-lg border border-gold/30 bg-white p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('customers')}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            tab === 'customers' ? 'bg-brand-emerald text-white' : 'text-slate-700 hover:bg-gold-muted'
          }`}
        >
          Customers
        </button>
        <button
          type="button"
          onClick={() => setTab('suppliers')}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            tab === 'suppliers' ? 'bg-brand-emerald text-white' : 'text-slate-700 hover:bg-gold-muted'
          }`}
        >
          Suppliers
        </button>
      </div>

      {tab === 'customers' && (
        <PartyTable
          rows={customers}
          onAdd={(row) => addCustomer(row)}
          onUpdate={(id, p) => updateCustomer(id, p)}
          onDelete={(id) => {
            if (confirm('Delete this customer?')) deleteCustomer(id);
          }}
        />
      )}
      {tab === 'suppliers' && (
        <SupplierTable
          rows={suppliers}
          onAdd={(row) => addSupplier(row)}
          onUpdate={(id, p) => updateSupplier(id, p)}
          onDelete={(id) => {
            if (confirm('Delete this supplier?')) deleteSupplier(id);
          }}
        />
      )}
    </div>
  );
}

function PartyTable({ rows, onAdd, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    state: 'WEST BENGAL',
    stateCode: '19',
    gstNo: '',
    pan: '',
    phone: '',
  });

  return (
    <div className="mt-6 max-w-4xl space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-emerald-950 hover:brightness-95"
      >
        {open ? 'Cancel' : '+ Add customer'}
      </button>
      {open && (
        <div className="rounded-xl border border-gold/25 bg-white p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
            <textarea
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
              className="sm:col-span-2 rounded border border-slate-300 px-2 py-2 text-sm"
            />
            <input
              placeholder="GST"
              value={form.gstNo}
              onChange={(e) => setForm((f) => ({ ...f, gstNo: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
            <input
              placeholder="PAN"
              value={form.pan}
              onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!form.name.trim()) return;
              onAdd({ ...form });
              setForm({ name: '', address: '', state: 'WEST BENGAL', stateCode: '19', gstNo: '', pan: '', phone: '' });
              setOpen(false);
            }}
            className="mt-3 rounded-lg bg-brand-emerald px-4 py-2 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      )}

      <ul className="divide-y divide-gold/15 rounded-xl border border-gold/25 bg-white shadow-sm">
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="mt-1 whitespace-pre-line text-xs text-slate-600">{r.address}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {r.state} · {r.phone}
                </div>
              </div>
              <button type="button" onClick={() => onDelete(r.id)} className="text-xs text-red-600 hover:underline">
                Delete
              </button>
            </div>
            <InlineEditParty row={r} onSave={(patch) => onUpdate(r.id, patch)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function InlineEditParty({ row, onSave }) {
  const [phone, setPhone] = useState(row.phone);
  const [gst, setGst] = useState(row.gstNo);
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-40 rounded border px-2 py-1" />
      <input value={gst} onChange={(e) => setGst(e.target.value)} className="w-44 rounded border px-2 py-1" />
      <button type="button" onClick={() => onSave({ phone, gstNo: gst })} className="font-semibold text-brand-emerald hover:underline">
        Update phone / GST
      </button>
    </div>
  );
}

function SupplierTable({ rows, onAdd, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', gstn: '', phone: '' });

  return (
    <div className="mt-6 max-w-4xl space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border-2 border-brand-emerald px-4 py-2 text-sm font-semibold text-brand-emerald hover:bg-emerald-50"
      >
        {open ? 'Cancel' : '+ Add supplier'}
      </button>
      {open && (
        <div className="rounded-xl border border-gold/25 bg-white p-4 shadow-sm">
          <div className="grid gap-2">
            <input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
            <textarea
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="GSTN"
                value={form.gstn}
                onChange={(e) => setForm((f) => ({ ...f, gstn: e.target.value }))}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!form.name.trim()) return;
              onAdd({ name: form.name.trim(), address: form.address.trim(), gstn: form.gstn.trim(), phone: form.phone.trim() });
              setForm({ name: '', address: '', gstn: '', phone: '' });
              setOpen(false);
            }}
            className="mt-3 rounded-lg bg-brand-emerald px-4 py-2 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      )}

      <ul className="divide-y divide-gold/15 rounded-xl border border-gold/25 bg-white shadow-sm">
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="mt-1 text-xs text-slate-600">{r.address}</div>
                <div className="mt-1 text-xs text-slate-500">GST: {r.gstn || '—'} · {r.phone}</div>
              </div>
              <button type="button" onClick={() => onDelete(r.id)} className="text-xs text-red-600 hover:underline">
                Delete
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  const phone = prompt('Phone', r.phone || '');
                  if (phone === null) return;
                  onUpdate(r.id, { phone });
                }}
                className="font-semibold text-brand-emerald hover:underline"
              >
                Edit phone
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
