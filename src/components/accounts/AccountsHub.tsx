import React, { useState } from 'react';
import {
  Banknote,
  Building2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  FileDown,
  Filter,
  Calendar,
  Wallet,
} from 'lucide-react';
import {
  CompanySettings,
  Account,
  Payment,
  Expense,
  ManualTransaction,
} from '../../types';
import {
  generateCashLedger,
  generateBankLedger,
} from '../../utils/accounting';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
} from '../../utils/formatters';
import { generatePdfFromElement } from '../../utils/shareUtils';

interface AccountsHubProps {
  company: CompanySettings;
  accounts: Account[];
  payments: Payment[];
  expenses: Expense[];
  manualTransactions: ManualTransaction[];
  initialView?: 'cash' | 'bank';
  onNewCashEntry: () => void;
  onNewBankEntry: () => void;
}

export const AccountsHub: React.FC<AccountsHubProps> = ({
  company,
  accounts,
  payments,
  expenses,
  manualTransactions,
  initialView = 'cash',
  onNewCashEntry,
  onNewBankEntry,
}) => {
  const curr = company.currency || 'Rs.';
  const today = getTodayDateString();

  const [activeAccountType, setActiveAccountType] = useState<'cash' | 'bank'>(initialView);
  const bankAccounts = accounts.filter((a) => a.accountType === 'bank');
  const [selectedBankId, setSelectedBankId] = useState<string>(bankAccounts[0]?.id || '');

  // Date filters
  const [dateFilter, setDateFilter] = useState<'today' | 'this_week' | 'this_month' | 'all' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateRange = () => {
    if (dateFilter === 'today') return { start: today, end: today };
    if (dateFilter === 'this_week') {
      const now = new Date();
      const first = new Date(now.setDate(now.getDate() - now.getDay()));
      return { start: first.toISOString().split('T')[0], end: today };
    }
    if (dateFilter === 'this_month') {
      return { start: `${today.substring(0, 7)}-01`, end: today };
    }
    if (dateFilter === 'custom') {
      return { start: customStart || undefined, end: customEnd || undefined };
    }
    return { start: undefined, end: undefined };
  };

  const { start: filterStart, end: filterEnd } = getDateRange();

  // Compute Cash Ledger
  const cashLedgerData = generateCashLedger(
    filterStart,
    filterEnd,
    payments,
    expenses,
    undefined,
    manualTransactions,
    accounts
  );

  // Compute Bank Ledger
  const bankLedgerData = generateBankLedger(
    selectedBankId,
    filterStart,
    filterEnd,
    payments,
    expenses,
    undefined,
    manualTransactions,
    accounts
  );

  const handlePrint = () => {
    const printArea = document.getElementById('printArea');
    if (!printArea) return;

    const isCash = activeAccountType === 'cash';
    const title = isCash ? 'CASH IN HAND LEDGER' : `BANK ACCOUNT LEDGER - ${bankLedgerData.account?.accountName || 'BANK'}`;
    const opBal = isCash ? cashLedgerData.openingBalance : bankLedgerData.openingBalance;
    const clBal = isCash ? cashLedgerData.closingBalance : bankLedgerData.closingBalance;
    const totIn = isCash ? cashLedgerData.totalCashIn : bankLedgerData.totalBankIn;
    const totOut = isCash ? cashLedgerData.totalCashOut : bankLedgerData.totalBankOut;
    const entries = isCash ? cashLedgerData.entries : bankLedgerData.entries;

    const rowsHtml = entries.map((e: any, idx: number) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 7px 10px;">${formatDate(e.date)}</td>
        <td style="padding: 7px 10px; font-family: monospace; font-weight: bold;">${e.referenceNo}</td>
        <td style="padding: 7px 10px;">${e.description}</td>
        <td style="padding: 7px 10px;">${e.partyName || '—'}</td>
        <td style="padding: 7px 10px; text-align: right; color: #16a34a; font-weight: bold;">${(e.cashIn || e.bankIn) > 0 ? formatCurrency(e.cashIn || e.bankIn, curr, 'no_symbol') : '-'}</td>
        <td style="padding: 7px 10px; text-align: right; color: #dc2626; font-weight: bold;">${(e.cashOut || e.bankOut) > 0 ? formatCurrency(e.cashOut || e.bankOut, curr, 'no_symbol') : '-'}</td>
        <td style="padding: 7px 10px; text-align: right; font-weight: 900;">${formatCurrency(e.balance, curr)}</td>
      </tr>
    `).join('');

    printArea.innerHTML = `
      <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 10px;">
        <div style="border-bottom: 2px solid #581c87; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 900;">${company.businessName}</h1>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${company.address || ''} ${company.phone ? `· Tel: ${company.phone}` : ''}</div>
          </div>
          <div style="text-align: right;">
            <span style="background: #581c87; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 900; text-transform: uppercase;">${title}</span>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Statement Date: ${formatDate(today)}</div>
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>Opening Balance: <strong>${formatCurrency(opBal, curr)}</strong></div>
          <div>Total Inflow: <strong style="color: #16a34a;">${formatCurrency(totIn, curr)}</strong></div>
          <div>Total Outflow: <strong style="color: #dc2626;">${formatCurrency(totOut, curr)}</strong></div>
          <div>Closing Balance: <strong style="color: #581c87; font-size: 12px;">${formatCurrency(clBal, curr)}</strong></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background-color: #581c87; color: #ffffff; text-transform: uppercase; font-size: 10px;">
              <th style="padding: 8px 10px;">Date</th>
              <th style="padding: 8px 10px;">Ref #</th>
              <th style="padding: 8px 10px;">Description</th>
              <th style="padding: 8px 10px;">Party</th>
              <th style="padding: 8px 10px; text-align: right;">Inflow (${curr})</th>
              <th style="padding: 8px 10px; text-align: right;">Outflow (${curr})</th>
              <th style="padding: 8px 10px; text-align: right;">Balance (${curr})</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748b;">No transactions found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.body.classList.add('printing-active');
    setTimeout(() => {
      window.print();
      const cleanup = () => {
        document.body.classList.remove('printing-active');
        if (printArea) printArea.innerHTML = '';
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      setTimeout(cleanup, 2500);
    }, 100);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-purple-700" />
            Cash & Bank Ledgers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cash in hand & multi-bank ledger transactions with automatic double-entry audit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Print Account Ledger"
          >
            <Printer className="w-4 h-4 text-purple-700" /> Print Ledger
          </button>
          <button
            onClick={onNewCashEntry}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Manual Cash Entry
          </button>
          <button
            onClick={onNewBankEntry}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Manual Bank Entry
          </button>
        </div>
      </div>

      {/* Account Type Selector Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveAccountType('cash')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeAccountType === 'cash'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>Cash in Hand Ledger</span>
          <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-mono">
            {formatCurrency(cashLedgerData.closingBalance, curr)}
          </span>
        </button>

        <button
          onClick={() => setActiveAccountType('bank')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeAccountType === 'bank'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Bank Accounts Ledger</span>
          <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-mono">
            {bankAccounts.length} Banks
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-purple-700" /> Filter Range:
          </span>
          {(['today', 'this_week', 'this_month', 'all', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setDateFilter(p)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                dateFilter === p
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p === 'today'
                ? 'Today'
                : p === 'this_week'
                ? 'This Week'
                : p === 'this_month'
                ? 'This Month'
                : p === 'all'
                ? 'All Time'
                : 'Custom Range'}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}
        </div>

        {/* Bank selector if on Bank tab */}
        {activeAccountType === 'bank' && (
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Bank Account:</span>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 cursor-pointer"
            >
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName} {b.bankName ? `(${b.bankName})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ================= CASH LEDGER VIEW ================= */}
      {activeAccountType === 'cash' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Opening Cash
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {formatCurrency(cashLedgerData.openingBalance, curr)}
              </span>
              <span className="text-[10px] text-slate-400">Initial balance</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                Total Cash In (+ Inflow)
              </span>
              <span className="text-xl font-black text-emerald-700 mt-1 block">
                +{formatCurrency(cashLedgerData.totalCashIn, curr)}
              </span>
              <span className="text-[10px] text-emerald-600">Sales & receipts</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
                Total Cash Out (- Outflow)
              </span>
              <span className="text-xl font-black text-rose-600 mt-1 block">
                -{formatCurrency(cashLedgerData.totalCashOut, curr)}
              </span>
              <span className="text-[10px] text-rose-600">Expenses & payouts</span>
            </div>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 shadow-xs">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
                Closing Cash in Hand
              </span>
              <span className="text-2xl font-black text-purple-950 mt-1 block">
                {formatCurrency(cashLedgerData.closingBalance, curr)}
              </span>
              <span className="text-[10px] text-purple-700 font-semibold">Available physical cash</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Cash Book Transactions
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {cashLedgerData.entries.length} entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Ref #</th>
                    <th className="py-2.5 px-4">Description / Particulars</th>
                    <th className="py-2.5 px-4">Party Name</th>
                    <th className="py-2.5 px-4 text-right text-emerald-700">Cash In ({curr})</th>
                    <th className="py-2.5 px-4 text-right text-rose-600">Cash Out ({curr})</th>
                    <th className="py-2.5 px-4 text-right">Running Balance ({curr})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashLedgerData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No cash transactions recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    cashLedgerData.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                          {entry.referenceNo}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                          {entry.partyName || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                          {entry.cashIn > 0 ? formatCurrency(entry.cashIn, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          {entry.cashOut > 0 ? formatCurrency(entry.cashOut, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatCurrency(entry.balance, curr)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= BANK LEDGER VIEW ================= */}
      {activeAccountType === 'bank' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Opening Bank
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {formatCurrency(bankLedgerData.openingBalance, curr)}
              </span>
              <span className="text-[10px] text-slate-400">{bankLedgerData.account?.accountName}</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                Total Bank In (+ Deposits)
              </span>
              <span className="text-xl font-black text-emerald-700 mt-1 block">
                +{formatCurrency(bankLedgerData.totalBankIn, curr)}
              </span>
              <span className="text-[10px] text-emerald-600">Receipts & deposits</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
                Total Bank Out (- Withdrawals)
              </span>
              <span className="text-xl font-black text-rose-600 mt-1 block">
                -{formatCurrency(bankLedgerData.totalBankOut, curr)}
              </span>
              <span className="text-[10px] text-rose-600">Expenses & payouts</span>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 shadow-xs">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                Closing Bank Balance
              </span>
              <span className="text-2xl font-black text-blue-950 mt-1 block">
                {formatCurrency(bankLedgerData.closingBalance, curr)}
              </span>
              <span className="text-[10px] text-blue-700 font-semibold">{bankLedgerData.account?.accountName}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Bank Statement & Transactions ({bankLedgerData.account?.accountName})
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {bankLedgerData.entries.length} entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Ref #</th>
                    <th className="py-2.5 px-4">Description / Particulars</th>
                    <th className="py-2.5 px-4">Party Name</th>
                    <th className="py-2.5 px-4 text-right text-emerald-700">Bank In ({curr})</th>
                    <th className="py-2.5 px-4 text-right text-rose-600">Bank Out ({curr})</th>
                    <th className="py-2.5 px-4 text-right">Running Balance ({curr})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankLedgerData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No transactions found for this bank account in this period.
                      </td>
                    </tr>
                  ) : (
                    bankLedgerData.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                          {entry.referenceNo}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                          {entry.partyName || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                          {entry.bankIn > 0 ? formatCurrency(entry.bankIn, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          {entry.bankOut > 0 ? formatCurrency(entry.bankOut, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatCurrency(entry.balance, curr)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
