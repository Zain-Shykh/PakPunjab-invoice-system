import React from 'react';
import { Party, CompanySettings, LedgerEntry } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ScopedPartyLedger } from '../../utils/accounting';

interface PartyLedgerDocumentProps {
  party: Party;
  company: CompanySettings;
  scopedLedger: ScopedPartyLedger;
}

export const PartyLedgerDocument: React.FC<PartyLedgerDocumentProps> = ({
  party,
  company,
  scopedLedger,
}) => {
  const isSupplier = party.partyType === 'supplier';
  const curr = company.currency || 'Rs.';

  const closingBalance = scopedLedger.closingBalance;
  const isClosingReceivable = closingBalance > 0 && !isSupplier;
  const isClosingPayable = closingBalance > 0 && isSupplier;
  const isClosingAdvance = closingBalance < 0;
  const isClosingZero = closingBalance === 0;

  const statusLabel = isClosingZero
    ? 'Settled (Zero Balance)'
    : isClosingReceivable
    ? 'Net Receivable (Amount to Collect)'
    : isClosingPayable
    ? 'Net Payable (Amount to Pay)'
    : isSupplier
    ? 'Advance Paid'
    : 'Advance / Credit Balance';

  return (
    <div
      className="ledger-document bg-white text-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs mx-auto max-w-4xl"
      style={{
        backgroundColor: '#ffffff',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'visible',
      }}
    >
      {/* ---------------- 1. PAGE HEADER ---------------- */}
      <div className="ledger-header-box border-b-2 border-purple-800 pb-4 mb-4">
        <div className="flex flex-row justify-between items-start gap-4">
          {/* Brand Info */}
          <div className="flex items-start gap-3.5">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.businessName || 'Business Logo'}
                crossOrigin="anonymous"
                loading="eager"
                decoding="sync"
                className="w-16 h-16 max-h-16 max-w-28 object-contain rounded-xl border border-slate-200 p-1 bg-white shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-purple-800 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-xs">
                {company.businessName ? company.businessName.substring(0, 2).toUpperCase() : 'VL'}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {company.businessName}
              </h1>
              {company.tagline && (
                <p className="text-xs text-slate-500 font-medium">{company.tagline}</p>
              )}
              {company.address && (
                <p className="text-xs text-slate-600 mt-0.5">
                  {company.address}{company.city ? `, ${company.city}` : ''}
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-1">
                {company.phone && <span>Tel: <strong>{company.phone}</strong></span>}
                {company.whatsapp && <span>WA: <strong>{company.whatsapp}</strong></span>}
                {company.taxNtn && <span>NTN/Tax: <strong>{company.taxNtn}</strong></span>}
              </div>
            </div>
          </div>

          {/* Title & Date */}
          <div className="text-right shrink-0">
            <div className="inline-block px-3.5 py-1 bg-purple-900 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs mb-1">
              {isSupplier ? 'Supplier Payable Ledger' : 'Customer Account Ledger'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Statement Date: <strong className="text-slate-800">{formatDate(new Date().toISOString().split('T')[0])}</strong>
            </p>
            <p className="text-[10px] text-slate-400">
              Computer-Generated Accounting Statement
            </p>
          </div>
        </div>

        {/* Party Information & Statement Scope Box */}
        <div className="mt-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {isSupplier ? 'Supplier Account' : 'Customer Account'}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {party.name}
            </h2>
            {party.address && (
              <p className="text-xs text-slate-600 mt-0.5">
                {party.address}{party.city ? `, ${party.city}` : ''}
              </p>
            )}
            {party.phone && (
              <p className="text-xs text-slate-600">
                Phone: <strong className="text-slate-800">{party.phone}</strong>
              </p>
            )}
          </div>

          <div className="sm:text-right flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Statement Period
              </span>
              <p className="text-xs font-bold text-purple-900 mt-0.5">
                {scopedLedger.periodLabel}
              </p>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200 flex sm:justify-end items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Opening Balance:</span>
              <span className="text-xs font-bold text-slate-900">
                {formatCurrency(Math.abs(scopedLedger.periodOpeningBalance), curr)}
                <span className="text-[10px] font-normal text-slate-500 ml-1">
                  {scopedLedger.periodOpeningBalance > 0
                    ? isSupplier
                      ? '(Payable)'
                      : '(Receivable)'
                    : scopedLedger.periodOpeningBalance < 0
                    ? '(Advance)'
                    : '(Nil)'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 2. TRANSACTION TABLE ---------------- */}
      <div className="ledger-table-wrapper w-full overflow-x-auto">
        <table className="ledger-table w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-purple-900 text-white font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
              <th className="py-2.5 px-2.5 rounded-l-md w-24">Date</th>
              <th className="py-2.5 px-2 w-28">Ref / Inv #</th>
              <th className="py-2.5 px-2.5">Description</th>
              <th className="py-2.5 px-2.5 text-right w-24">Debit ({curr})</th>
              <th className="py-2.5 px-2.5 text-right w-24">Credit ({curr})</th>
              <th className="py-2.5 px-2.5 text-right w-24 text-slate-300">Prev Balance</th>
              <th className="py-2.5 px-2.5 text-right w-28 rounded-r-md">Closing Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {scopedLedger.entries.map((entry, idx) => {
              const isOpening = entry.type === 'OPENING';
              const isDebit = entry.debit > 0;
              const isCredit = entry.credit > 0;

              // Badge style
              let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
              if (entry.type === 'INVOICE') badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
              else if (entry.type === 'PURCHASE') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
              else if (entry.type === 'PAYMENT') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              else if (entry.type === 'MANUAL') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
              else if (entry.type === 'ADJUSTMENT') badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';

              return (
                <tr
                  key={entry.id || idx}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${
                    isOpening ? 'bg-purple-50/40 font-semibold' : ''
                  }`}
                >
                  <td className="py-2 px-2.5 font-medium text-slate-800 whitespace-nowrap">
                    {formatDate(entry.date)}
                  </td>

                  <td className="py-2 px-2 whitespace-nowrap">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mr-1 ${badgeStyle}`}
                    >
                      {entry.type === 'OPENING' ? 'B/F' : entry.type}
                    </span>
                    <span className="font-mono text-slate-700 font-bold text-[11px]">
                      {entry.referenceNo || '-'}
                    </span>
                  </td>

                  <td className="py-2 px-2.5 text-slate-700 text-xs leading-snug">
                    {entry.description}
                  </td>

                  <td className="py-2 px-2.5 text-right font-semibold text-rose-600 whitespace-nowrap">
                    {isDebit ? formatCurrency(entry.debit, curr, 'no_symbol') : '-'}
                  </td>

                  <td className="py-2 px-2.5 text-right font-semibold text-emerald-600 whitespace-nowrap">
                    {isCredit ? formatCurrency(entry.credit, curr, 'no_symbol') : '-'}
                  </td>

                  <td className="py-2 px-2.5 text-right text-slate-500 font-medium whitespace-nowrap">
                    {formatCurrency(entry.previousBalance, curr, 'no_symbol')}
                  </td>

                  <td
                    className={`py-2 px-2.5 text-right font-black whitespace-nowrap ${
                      entry.runningBalance > 0
                        ? 'text-rose-600'
                        : entry.runningBalance < 0
                        ? 'text-emerald-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(Math.abs(entry.runningBalance), curr)}
                    <span className="text-[9px] font-normal text-slate-500 ml-1">
                      {entry.runningBalance > 0
                        ? isSupplier
                          ? 'Dr'
                          : 'Dr'
                        : entry.runningBalance < 0
                        ? 'Cr'
                        : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-bold bg-slate-100 text-slate-900">
              <td colSpan={3} className="py-2.5 px-2.5 text-right font-black uppercase text-xs">
                Period Totals:
              </td>
              <td className="py-2.5 px-2.5 text-right font-bold text-rose-600">
                {formatCurrency(scopedLedger.totalDebit, curr)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-bold text-emerald-600">
                {formatCurrency(scopedLedger.totalCredit, curr)}
              </td>
              <td className="py-2.5 px-2.5 text-right text-slate-400 text-[10px]">
                Net Closing:
              </td>
              <td className="py-2.5 px-2.5 text-right font-black text-purple-900">
                {formatCurrency(Math.abs(closingBalance), curr)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ---------------- 3. FOOTER & FINAL TOTALS ---------------- */}
      <div className="ledger-footer-box mt-4 pt-3 border-t-2 border-slate-300">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          {/* Total Debits */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Period Total Debits
            </span>
            <div className="text-base sm:text-lg font-bold text-rose-600 mt-0.5">
              {formatCurrency(scopedLedger.totalDebit, curr)}
            </div>
            <span className="text-[10px] text-slate-400">
              {isSupplier ? 'Payments Made / Debits' : 'Sales Invoices / Debits'}
            </span>
          </div>

          {/* Total Credits */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Period Total Credits
            </span>
            <div className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5">
              {formatCurrency(scopedLedger.totalCredit, curr)}
            </div>
            <span className="text-[10px] text-slate-400">
              {isSupplier ? 'Purchase Bills / Credits' : 'Payments Received / Credits'}
            </span>
          </div>

          {/* Net Closing Balance */}
          <div className="sm:border-l sm:border-slate-200 sm:pl-3">
            <span className="text-[10px] uppercase font-bold text-purple-900 block tracking-wider">
              Net Closing Balance
            </span>
            <div
              className={`text-lg sm:text-xl font-black mt-0.5 ${
                closingBalance > 0
                  ? 'text-rose-600'
                  : closingBalance < 0
                  ? 'text-emerald-600'
                  : 'text-slate-800'
              }`}
            >
              {formatCurrency(Math.abs(closingBalance), curr)}
            </div>
            <span className="text-[11px] font-bold text-slate-700 block mt-0.5">
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Signatures & System Footer */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-500">
          <div>
            <p className="font-medium">Thank you for your business with {company.businessName}.</p>
            <p className="text-[10px] text-slate-400 italic">
              Official statement of account. Computer-generated and verified.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">
              Software by Veloce Ledger · Total {scopedLedger.entries.length} records
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
