import React from 'react';
import { rupeesToWords } from '../utils/numberToWords.js';
import { EMERALD, GOLD_BORDER, GOLD_MUTED } from '../constants/colors.js';

function fmt(n, decimals = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return decimals === 0 ? '0' : '0.00';
  return x.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * A4 GST invoice — MIG-branded, emerald frame + gold totals (print-safe).
 * Parent wraps with id="invoice-print-root" for print CSS.
 */
export default function InvoiceA4Preview({
  invoiceNo,
  invoiceDate,
  copyLabel = 'ORIGINAL FOR BUYER',
  seller,
  buyer,
  poNo,
  poDate,
  challanNo,
  challanDate,
  vehicleNo,
  batchNo,
  lines,
  taxableTotal,
  cgstTotal,
  sgstTotal,
  gstPercentLabel,
  gstSgstLabel,
  grandTotal,
  paymentMode,
  transactionId,
}) {
  const amountWords = rupeesToWords(grandTotal);

  const getPaymentNote = () => {
    if (paymentMode === 'Cash') {
      return "Payment received in Full by Cash. Thank you for your business.";
    }
    if (paymentMode === 'Credit') {
      return `Payment due within 15 days. Interest @ 15% p.a. will be charged on overdue amounts.`;
    }
    return `Payment by A/c Payee Cheque / NEFT in favour of "${seller.name}". Transaction ID: ${transactionId || 'N/A'}`;
  };

  return (
    <div
      className="box-border bg-white font-sans antialiased print:p-0"
      style={{
        width: '210mm',
        height: '297mm',
        padding: '5mm',
        fontSize: '9.5px',
        lineHeight: 1.25,
        color: '#0f172a',
        overflow: 'hidden'
      }}
    >
      {/* Outer solid emerald + inner double emerald = framed “double border” look */}
      <div
        className="box-border h-full w-full bg-white"
        style={{
          border: `2px solid ${EMERALD}`,
          borderRadius: '4px',
          padding: '2px',
        }}
      >
      <div
        className="invoice-a4-sheet box-border h-full w-full bg-white"
        style={{
          border: `3px double ${EMERALD}`,
          borderRadius: '3px',
          padding: '4.5mm 5.5mm 5mm',
        }}
      >
        <div
          className="mb-1 flex justify-between px-1.5 py-1"
          style={{ border: `1px solid ${EMERALD}`, background: 'rgba(6, 78, 59, 0.06)' }}
        >
          <span>
            <span className="font-semibold" style={{ color: EMERALD }}>
              No :
            </span>{' '}
            {invoiceNo}
          </span>
          <span className="font-bold tracking-[0.12em]" style={{ color: EMERALD }}>
            GST INVOICE
          </span>
          <span className="text-right">
            <div className="font-semibold">{copyLabel}</div>
            <div>
              <span className="font-semibold">Dated :</span> {invoiceDate}
            </div>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_38%] gap-0" style={{ border: `1px solid ${EMERALD}`, borderTop: 'none' }}>
          <div className="border-r p-1.5" style={{ borderColor: EMERALD }}>
            <div className="font-serif text-[13px] font-bold leading-tight" style={{ color: EMERALD }}>
              {seller.name}
            </div>
            <div className="mt-0.5 text-[8.5px] font-semibold text-slate-800">{seller.tagline}</div>
            <div className="text-[8px] text-slate-600">{seller.iso}</div>
            <div className="mt-1 space-y-0.5 text-[8.5px] text-slate-800">
              <div>
                <span className="font-semibold">HEAD OFFICE :</span> {seller.headOffice}
              </div>
              <div>
                <span className="font-semibold">GODOWN / FACTORY :</span> {seller.factory}
              </div>
              <div>
                <span className="font-semibold">Phone :</span> {seller.phones}
              </div>
            </div>
            <div className="mt-1 border-t pt-1 text-[8.5px]" style={{ borderColor: EMERALD }}>
              <div>
                <span className="font-semibold">GSTN NO :</span> {seller.gstn}{' '}
                <span className="font-semibold">State Code :</span> {seller.stateCode}
              </div>
              <div className="mt-0.5 text-slate-700">{seller.licenses}</div>
            </div>
          </div>

          <div className="p-1.5 text-[8.5px]">
            <div className="font-semibold text-slate-700">Messrs :</div>
            <div className="font-bold text-slate-900">{buyer.name || '—'}</div>
            <div className="mt-0.5 whitespace-pre-line text-slate-800">{buyer.address || ''}</div>
            <div className="mt-0.5">
              <span className="font-semibold">State :</span> {buyer.state || ''}{' '}
              <span className="font-semibold">Code :</span> {buyer.stateCode || ''}
            </div>
            <div className="mt-0.5">
              <span className="font-semibold">Customer GST No :</span> {buyer.gstNo || '—'}
            </div>
            <div>
              <span className="font-semibold">Pan No :</span> {buyer.pan || '—'}
            </div>
            <div>
              <span className="font-semibold">Phone :</span> {buyer.phone || '—'}
            </div>
          </div>
        </div>

        {(poNo || challanNo || vehicleNo) && (
          <div className="grid grid-cols-3 gap-0 text-[8.5px]" style={{ border: `1px solid ${EMERALD}`, borderTop: 'none' }}>
            <div className="border-r px-1 py-0.5" style={{ borderColor: EMERALD }}>
              <span className="font-semibold">PO No :</span> {poNo || '—'} 
              {poDate && <span className="ml-1 font-semibold">Dt: {poDate}</span>}
            </div>
            <div className="border-r px-1 py-0.5" style={{ borderColor: EMERALD }}>
              <span className="font-semibold">Challan :</span> {challanNo || '—'}
              {challanDate && <span className="ml-1 font-semibold">Dt: {challanDate}</span>}
            </div>
            <div className="px-1 py-0.5">
              <span className="font-semibold">Vehicle :</span> {vehicleNo || '—'}
            </div>
          </div>
        )}

        <div
          className="px-1 py-0.5 text-[7.5px] leading-snug text-slate-700"
          style={{ border: `1px solid ${EMERALD}`, borderTop: 'none' }}
        >
          {getPaymentNote()}
          <span className="font-semibold" style={{ color: EMERALD }}>
            Mode: {paymentMode}
          </span>
        </div>

        <table
          className="w-full border-collapse text-[8px]"
          style={{ tableLayout: 'fixed', border: `1px solid ${EMERALD}`, borderTop: 'none' }}
        >
          <thead>
            <tr style={{ background: 'rgba(6, 78, 59, 0.07)' }}>
              {[
                'SL NO',
                'DESCRIPTION OF GOODS',
                'HSN Code',
                'QTY IN NO',
                'QTY IN CUM',
                'QTY IN KG',
                'RATE',
                'RATE PER',
                'VALUE',
              ].map((h, i) => (
                <th
                  key={h}
                  className="px-0.5 py-0.5 font-semibold"
                  style={{
                    border: `1px solid ${EMERALD}`,
                    color: EMERALD,
                    width: ['5%', '28%', '11%', '9%', '9%', '9%', '10%', '8%', '11%'][i],
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => (
              <React.Fragment key={row.id}>
                <tr>
                <td className="px-0.5 py-0.5 text-center" style={{ border: `1px solid ${EMERALD}` }}>
                  {row.sl}
                </td>
                <td className="px-0.5 py-0.5" style={{ border: `1px solid ${EMERALD}` }}>
                  {row.description}
                </td>
                <td className="px-0.5 py-0.5 text-center" style={{ border: `1px solid ${EMERALD}` }}>
                  {row.hsn}
                </td>
                <td className="px-0.5 py-0.5 text-right" style={{ border: `1px solid ${EMERALD}` }}>
                  {fmt(row.qtyNo, 0)}
                </td>
                <td className="px-0.5 py-0.5 text-right" style={{ border: `1px solid ${EMERALD}` }}>
                  {fmt(row.qtyCum, 2)}
                </td>
                <td className="px-0.5 py-0.5 text-right" style={{ border: `1px solid ${EMERALD}` }}>
                  {fmt(row.qtyKg, 2)}
                </td>
                <td className="px-0.5 py-0.5 text-right" style={{ border: `1px solid ${EMERALD}` }}>
                  {fmt(row.rate, 2)}
                </td>
                <td className="px-0.5 py-0.5 text-center" style={{ border: `1px solid ${EMERALD}` }}>
                  {row.ratePer}
                </td>
                <td className="px-0.5 py-0.5 text-right font-medium" style={{ border: `1px solid ${EMERALD}` }}>
                  {fmt(row.value, 2)}
                </td>
              </tr>
              </React.Fragment>
            ))}
            {Array.from({ length: Math.max(0, 6 - lines.length) }).map((_, i) => (
              <tr key={`blank-${i}`}>
                {Array.from({ length: 9 }).map((__, j) => (
                  <td key={j} className="py-1" style={{ border: `1px solid ${EMERALD}` }}>
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex" style={{ border: `1px solid ${EMERALD}`, borderTop: 'none' }}>
          <div className="flex-1 border-r px-1 py-0.5 text-[8px]" style={{ borderColor: EMERALD }}>
            <span className="font-semibold" style={{ color: EMERALD }}>
              BATCH NO
            </span>{' '}
            {batchNo || '—'}
          </div>
          <div className="w-[42%] text-[8.5px]">
            <div className="grid grid-cols-2 border-b" style={{ borderColor: EMERALD }}>
              <div className="border-r px-1 py-0.5 font-semibold" style={{ borderColor: EMERALD }}>
                Taxable Value
              </div>
              <div className="px-1 py-0.5 text-right">{fmt(taxableTotal, 2)}</div>
            </div>
            <div className="grid grid-cols-2 border-b" style={{ borderColor: EMERALD }}>
              <div className="border-r px-1 py-0.5" style={{ borderColor: EMERALD }}>
                SGST ({gstSgstLabel ?? gstPercentLabel})
              </div>
              <div className="px-1 py-0.5 text-right">{fmt(sgstTotal, 2)}</div>
            </div>
            <div className="grid grid-cols-2">
              <div className="border-r px-1 py-0.5" style={{ borderColor: EMERALD }}>
                CGST ({gstPercentLabel})
              </div>
              <div className="px-1 py-0.5 text-right">{fmt(cgstTotal, 2)}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${EMERALD}`,
            borderTop: 'none',
            background: GOLD_MUTED,
            boxShadow: `inset 0 0 0 1px ${GOLD_BORDER}`,
          }}
        >
          <div className="grid grid-cols-[1fr_28%_28%] border-b text-[8.5px]" style={{ borderColor: EMERALD }}>
            <div className="border-r px-1 py-0.5 font-semibold" style={{ borderColor: EMERALD }}>
              TOTAL
            </div>
            <div className="border-r px-1 py-0.5 text-right" style={{ borderColor: EMERALD }}>
              {fmt(taxableTotal, 2)}
            </div>
            <div className="px-1 py-0.5" />
          </div>
          <div className="grid grid-cols-[1fr_28%_28%] border-b text-[8.5px]" style={{ borderColor: EMERALD }}>
            <div className="border-r px-1 py-0.5 font-semibold" style={{ borderColor: EMERALD }}>
              ADD GST
            </div>
            <div className="border-r px-1 py-0.5 text-right" style={{ borderColor: EMERALD }}>
              @ {fmt(taxableTotal > 0 ? ((cgstTotal + sgstTotal) / taxableTotal) * 100 : 0, 2)}%
            </div>
            <div className="px-1 py-0.5 text-right font-semibold">{fmt(cgstTotal + sgstTotal, 2)}</div>
          </div>
          <div
            className="grid grid-cols-[1fr_56%] text-[9.5px]"
            style={{
              background: 'rgba(6, 78, 59, 0.09)',
              borderTop: `1px solid ${EMERALD}`,
            }}
          >
            <div
              className="border-r px-1 py-1.5 font-bold"
              style={{ borderColor: EMERALD, color: EMERALD }}
            >
              BILL AMOUNT
            </div>
            <div className="px-1 py-1.5 text-right text-base font-bold" style={{ color: EMERALD }}>
              {fmt(grandTotal, 2)}
            </div>
          </div>
        </div>

        <div
          className="mt-1 px-1.5 py-1 text-[8.5px] font-semibold"
          style={{ border: `1px solid ${GOLD_BORDER}`, background: GOLD_MUTED, color: '#14532d' }}
        >
          {amountWords}
        </div>

        <div className="mt-1 text-justify text-[7px] leading-snug text-slate-600">
          Computer-generated tax invoice. Verify quantities, rates, and HSN. E. &amp; O. E.
        </div>

        <div className="mt-4 flex justify-end text-[8.5px]">
          <div className="w-[45%] text-right">
            <div className="font-semibold" style={{ color: EMERALD }}>
              E. &amp; O. E.
            </div>
            <div className="mt-6 font-semibold text-slate-900">For, {seller.name}</div>
            <div className="mt-10 border-t pt-0.5" style={{ borderColor: EMERALD }}>
              Authorised Signatory
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
