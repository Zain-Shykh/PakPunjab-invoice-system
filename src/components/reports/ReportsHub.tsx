import React, { useState, useRef } from 'react';
import {
  FileText,
  AlertCircle,
  Calendar,
  Banknote,
  Search,
  Printer,
  FileDown,
  MessageCircle,
  TrendingUp,
  CreditCard,
  Receipt,
  Users,
  Wallet,
  Building2,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import {
  CompanySettings,
  Invoice,
  Party,
  Payment,
  Purchase,
  Expense,
  ExpenseCategory,
  Account,
  ManualTransaction,
} from '../../types';
import {
  calculatePartyBalance,
  generateCashLedger,
  generateBankLedger,
  generatePartyLedger,
  generateDayBook,
} from '../../utils/accounting';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
} from '../../utils/formatters';
import { generatePdfFromElement, openWhatsAppChat } from '../../utils/shareUtils';
import { getAccounts, getExpenses, getExpenseCategories, getPurchases, getManualTransactions } from '../../db/storage';

interface ReportsHubProps {
  company: CompanySettings;
  parties: Party[];
  invoices: Invoice[];
  payments: Payment[];
  purchases?: Purchase[];
  expenses?: Expense[];
  expenseCategories?: ExpenseCategory[];
  accounts?: Account[];
  manualTransactions?: ManualTransaction[];
  initialSubView?: string;
  onViewInvoice?: (invoice: Invoice) => void;
  onViewPartyLedger?: (party: Party) => void;
}

export type ReportType =
  | 'sales'
  | 'purchases'
  | 'expenses'
  | 'cashbook'
  | 'bankledger'
  | 'receivables'
  | 'payables'
  | 'customer_statement'
  | 'supplier_statement'
  | 'payments_report'
  | 'daybook';

export const ReportsHub: React.FC<ReportsHubProps> = ({
  company,
  parties,
  invoices,
  payments,
  purchases = getPurchases(),
  expenses = getExpenses(),
  expenseCategories = getExpenseCategories(),
  accounts = getAccounts(),
  manualTransactions = getManualTransactions(),
  initialSubView = 'sales',
  onViewInvoice,
  onViewPartyLedger,
}) => {
  const curr = company.currency || 'Rs.';
  const today = getTodayDateString();

  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Active report tab
  const [activeReport, setActiveReport] = useState<ReportType>(() => {
    if (initialSubView === 'receivables' || initialSubView === 'outstanding') return 'receivables';
    if (initialSubView === 'payables') return 'payables';
    if (initialSubView === 'expenses') return 'expenses';
    if (initialSubView === 'cashbook' || initialSubView === 'cash') return 'cashbook';
    if (initialSubView === 'bankledger' || initialSubView === 'bank') return 'bankledger';
    if (initialSubView === 'daybook') return 'daybook';
    if (initialSubView === 'purchases') return 'purchases';
    if (initialSubView === 'payments') return 'payments_report';
    if (initialSubView === 'statement') return 'customer_statement';
    return 'sales';
  });

  // Date filters
  const [dateFilter, setDateFilter] = useState<'today' | 'this_week' | 'this_month' | 'all' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [targetSingleDate, setTargetSingleDate] = useState(today);

  // Search & entity selectors
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    parties.find((p) => p.partyType !== 'supplier')?.id || parties[0]?.id || ''
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    parties.find((p) => p.partyType === 'supplier')?.id || parties[0]?.id || ''
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.find((a) => a.accountType === 'bank')?.id || ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');

  // Helper date range calculator
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

  const { start: filterStartDate, end: filterEndDate } = getDateRange();

  // Print & PDF Export handlers
  const handlePrint = () => {
    const printArea = document.getElementById('printArea');
    if (printArea && reportContainerRef.current) {
      printArea.innerHTML = `
        <div style="font-family: system-ui, sans-serif; color: #0f172a; padding: 10px;">
          <div style="border-bottom: 2px solid #581c87; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase;">${company.businessName}</h1>
              <div style="font-size: 10px; color: #64748b;">${company.address || ''} ${company.phone ? `· Tel: ${company.phone}` : ''}</div>
            </div>
            <div style="text-align: right;">
              <span style="background: #581c87; color: #ffffff; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                ${activeReport.toUpperCase().replace(/_/g, ' ')} REPORT
              </span>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Generated: ${formatDate(today)}</div>
            </div>
          </div>
          ${reportContainerRef.current.innerHTML}
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
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportContainerRef.current) return;
    setIsExportingPdf(true);
    try {
      const filename = `${company.businessName.replace(/\s+/g, '_')}_${activeReport}_Report_${today}.pdf`;
      await generatePdfFromElement(reportContainerRef.current, filename);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // CSV Export utility
  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-700" />
            Financial Reports & Ledgers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete real-time accounting audits, statements, journals & ledger books
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-700" /> Print Report
          </button>
          <button
            disabled={isExportingPdf}
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" /> {isExportingPdf ? 'Exporting...' : 'Save as PDF'}
          </button>
        </div>
      </div>

      {/* Navigation Report Tabs (10+ Reports as requested in Section 19) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar no-print">
        {[
          { id: 'sales', label: 'Daily Sales', icon: Receipt },
          { id: 'purchases', label: 'Daily Purchases', icon: Building },
          { id: 'expenses', label: 'Daily Expenses', icon: Wallet },
          { id: 'cashbook', label: 'Cash Ledger', icon: Banknote },
          { id: 'bankledger', label: 'Bank Ledger', icon: Building2 },
          { id: 'receivables', label: 'Customer Receivables', icon: ArrowDownLeft },
          { id: 'payables', label: 'Supplier Payables', icon: ArrowUpRight },
          { id: 'customer_statement', label: 'Customer Statement', icon: Users },
          { id: 'supplier_statement', label: 'Supplier Statement', icon: Building },
          { id: 'payments_report', label: 'Payment Receipts', icon: CreditCard },
          { id: 'daybook', label: 'Day Book Journal', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Shared Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-purple-700" /> Filter Period:
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
                  : 'Custom Dates'}
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

          {/* Specific filters depending on active report */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {activeReport === 'customer_statement' && (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 cursor-pointer"
              >
                {parties
                  .filter((p) => p.partyType !== 'supplier')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Customer: {p.name}
                    </option>
                  ))}
              </select>
            )}

            {activeReport === 'supplier_statement' && (
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 cursor-pointer"
              >
                {parties
                  .filter((p) => p.partyType === 'supplier' || p.partyType === 'both')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Supplier: {p.name}
                    </option>
                  ))}
              </select>
            )}

            {activeReport === 'bankledger' && (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 cursor-pointer"
              >
                {accounts
                  .filter((a) => a.accountType === 'bank')
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      Bank: {a.accountName} {a.bankName ? `(${a.bankName})` : ''}
                    </option>
                  ))}
              </select>
            )}

            {activeReport === 'expenses' && (
              <>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 cursor-pointer"
                >
                  <option value="all">All Categories ({expenseCategories.length})</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 cursor-pointer"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="Cash">Cash Only</option>
                  <option value="Bank">Bank Only</option>
                </select>
              </>
            )}

            {activeReport === 'daybook' && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Journal Date:</span>
                <input
                  type="date"
                  value={targetSingleDate}
                  onChange={(e) => setTargetSingleDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= REPORT CONTENT CONTAINER ================= */}
      <div
        ref={reportContainerRef}
        className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5"
      >
        {/* Printable Letterhead Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              {company.businessName}
            </h2>
            <p className="text-xs text-slate-500">
              {company.address} {company.city ? `· ${company.city}` : ''} · Tel: {company.phone}
            </p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-900 font-bold text-xs uppercase tracking-wider block">
              {activeReport.replace(/_/g, ' ').toUpperCase()} REPORT
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              Generated: {formatDate(today)}
            </span>
          </div>
        </div>

        {/* ---------------- 1. DAILY SALES REPORT ---------------- */}
        {activeReport === 'sales' && (() => {
          const filteredSales = invoices.filter((inv) => {
            if (filterStartDate && inv.date < filterStartDate) return false;
            if (filterEndDate && inv.date > filterEndDate) return false;
            return true;
          });

          const totalSales = filteredSales.reduce((sum, i) => sum + i.grandTotal, 0);
          const totalDiscounts = filteredSales.reduce((sum, i) => sum + (i.discount || 0), 0);
          const totalPaid = filteredSales.reduce((sum, i) => sum + i.paidAmount, 0);
          const totalRemaining = filteredSales.reduce((sum, i) => sum + i.remainingAmount, 0);

          return (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Sales</span>
                  <span className="text-lg font-black text-purple-950 block mt-0.5">{formatCurrency(totalSales, curr)}</span>
                  <span className="text-[10px] text-purple-600">{filteredSales.length} invoices</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Collected</span>
                  <span className="text-lg font-black text-emerald-950 block mt-0.5">{formatCurrency(totalPaid, curr)}</span>
                  <span className="text-[10px] text-emerald-600">Cash & Bank</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Outstanding Credit</span>
                  <span className="text-lg font-black text-rose-950 block mt-0.5">{formatCurrency(totalRemaining, curr)}</span>
                  <span className="text-[10px] text-rose-600">Pending receivables</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Discounts Given</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">{formatCurrency(totalDiscounts, curr)}</span>
                  <span className="text-[10px] text-slate-400">Total reductions</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-right">Items Subtotal</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right">Net Bill ({curr})</th>
                      <th className="py-2.5 px-3 text-right">Paid Today</th>
                      <th className="py-2.5 px-3 text-right">Credit Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{formatDate(inv.date)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{inv.invoiceNo}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.partyName}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(inv.subtotal, curr, 'no_symbol')}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600">{inv.discount ? `-${formatCurrency(inv.discount, curr, 'no_symbol')}` : '-'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatCurrency(inv.grandTotal, curr)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(inv.paidAmount, curr, 'no_symbol')}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">{formatCurrency(inv.remainingAmount, curr, 'no_symbol')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ---------------- 2. DAILY EXPENSES REPORT ---------------- */}
        {activeReport === 'expenses' && (() => {
          const filteredExpenses = expenses.filter((e) => {
            if (filterStartDate && e.date < filterStartDate) return false;
            if (filterEndDate && e.date > filterEndDate) return false;
            if (selectedCategoryId !== 'all' && e.categoryId !== selectedCategoryId) return false;
            if (selectedPaymentMethod !== 'all' && e.paymentMethod !== selectedPaymentMethod) return false;
            return true;
          });

          const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

          return (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Total Filtered Expenses</span>
                  <span className="text-2xl font-black text-rose-900 mt-1 block">{formatCurrency(totalExpenseAmount, curr)}</span>
                </div>
                <button
                  onClick={() => downloadCsv('expenses_report.csv', ['Date', 'Category', 'Description', 'Method', 'Account', 'Amount'], filteredExpenses.map((e) => [e.date, e.categoryName, e.description, e.paymentMethod, e.accountName, e.amount]))}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 rounded-xl text-xs font-bold hover:bg-rose-100 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" /> Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Paid Via</th>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Amount ({curr})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{formatDate(exp.date)}</td>
                        <td className="py-2.5 px-3 font-bold text-purple-800">{exp.categoryName}</td>
                        <td className="py-2.5 px-3 text-slate-800">{exp.description || '—'}</td>
                        <td className="py-2.5 px-3 font-semibold">{exp.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-slate-500">{exp.accountName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{exp.reference || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600 text-sm">{formatCurrency(exp.amount, curr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ---------------- 3. CASH LEDGER REPORT (SECTION 8) ---------------- */}
        {activeReport === 'cashbook' && (() => {
          const cashData = generateCashLedger(filterStartDate, filterEndDate, payments, expenses, undefined, manualTransactions, accounts);

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Opening Cash Balance</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">{formatCurrency(cashData.openingBalance, curr)}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Cash In (+ Inflow)</span>
                  <span className="text-lg font-black text-emerald-950 block mt-0.5">{formatCurrency(cashData.totalCashIn, curr)}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Cash Out (- Outflow)</span>
                  <span className="text-lg font-black text-rose-950 block mt-0.5">{formatCurrency(cashData.totalCashOut, curr)}</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Closing Cash Balance</span>
                  <span className="text-lg font-black text-purple-950 block mt-0.5">{formatCurrency(cashData.closingBalance, curr)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700">Cash In ({curr})</th>
                      <th className="py-2.5 px-3 text-right text-rose-600">Cash Out ({curr})</th>
                      <th className="py-2.5 px-3 text-right">Balance ({curr})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashData.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{formatDate(entry.date)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{entry.referenceNo}</td>
                        <td className="py-2.5 px-3 text-slate-800">{entry.description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {entry.cashIn > 0 ? formatCurrency(entry.cashIn, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {entry.cashOut > 0 ? formatCurrency(entry.cashOut, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatCurrency(entry.balance, curr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ---------------- 4. BANK LEDGER REPORT (SECTION 9) ---------------- */}
        {activeReport === 'bankledger' && (() => {
          const bankData = generateBankLedger(selectedAccountId, filterStartDate, filterEndDate, payments, expenses, undefined, manualTransactions, accounts);

          return (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h4 className="font-bold text-blue-950 text-sm">{bankData.account?.accountName || 'Bank Account'}</h4>
                  <p className="text-xs text-blue-700">{bankData.account?.bankName || 'Bank Statement'}</p>
                </div>
                <div className="flex gap-4 text-xs font-bold">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Opening Balance:</span>
                    <span className="text-slate-900">{formatCurrency(bankData.openingBalance, curr)}</span>
                  </div>
                  <div>
                    <span className="text-emerald-600 block text-[10px]">Total Bank In:</span>
                    <span className="text-emerald-700">+{formatCurrency(bankData.totalBankIn, curr)}</span>
                  </div>
                  <div>
                    <span className="text-rose-600 block text-[10px]">Total Bank Out:</span>
                    <span className="text-rose-700">-{formatCurrency(bankData.totalBankOut, curr)}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 block text-[10px]">Closing Bank:</span>
                    <span className="text-blue-900 text-sm font-black">{formatCurrency(bankData.closingBalance, curr)}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700">Bank In ({curr})</th>
                      <th className="py-2.5 px-3 text-right text-rose-600">Bank Out ({curr})</th>
                      <th className="py-2.5 px-3 text-right">Balance ({curr})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankData.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{formatDate(entry.date)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{entry.referenceNo}</td>
                        <td className="py-2.5 px-3 text-slate-800">{entry.description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {entry.bankIn > 0 ? formatCurrency(entry.bankIn, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {entry.bankOut > 0 ? formatCurrency(entry.bankOut, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatCurrency(entry.balance, curr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ---------------- 5. CUSTOMER RECEIVABLE REPORT ---------------- */}
        {activeReport === 'receivables' && (() => {
          const receivables = parties
            .filter((p) => p.partyType !== 'supplier')
            .map((party) => {
              const bal = calculatePartyBalance(party, invoices, payments, undefined, purchases, manualTransactions);
              return { party, balance: bal };
            })
            .filter((p) => p.balance > 0)
            .sort((a, b) => b.balance - a.balance);

          const totalReceivableSum = receivables.reduce((sum, r) => sum + r.balance, 0);

          return (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">Total Customer Receivables</span>
                  <span className="text-2xl font-black text-purple-950 mt-1 block">{formatCurrency(totalReceivableSum, curr)}</span>
                  <span className="text-xs text-purple-600">{receivables.length} customers with outstanding balances</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">City / Address</th>
                      <th className="py-2.5 px-3 text-right">Receivable Balance ({curr})</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receivables.map(({ party, balance }) => (
                      <tr key={party.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{party.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{party.phone || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{party.city || party.address || 'Local'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600 text-sm">
                          {formatCurrency(balance, curr)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {onViewPartyLedger && (
                            <button
                              onClick={() => onViewPartyLedger(party)}
                              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg font-bold text-[11px] cursor-pointer"
                            >
                              Open Ledger
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ---------------- 6. SUPPLIER PAYABLE REPORT ---------------- */}
        {activeReport === 'payables' && (() => {
          const payables = parties
            .filter((p) => p.partyType === 'supplier' || p.partyType === 'both')
            .map((party) => {
              const bal = calculatePartyBalance(party, invoices, payments, undefined, purchases, manualTransactions);
              return { party, balance: bal };
            })
            .filter((p) => p.balance > 0)
            .sort((a, b) => b.balance - a.balance);

          const totalPayableSum = payables.reduce((sum, p) => sum + p.balance, 0);

          return (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">Total Supplier Payables</span>
                  <span className="text-2xl font-black text-rose-950 mt-1 block">{formatCurrency(totalPayableSum, curr)}</span>
                  <span className="text-xs text-rose-600">{payables.length} suppliers with payable balances</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3">Supplier Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">City / Address</th>
                      <th className="py-2.5 px-3 text-right">Payable Balance ({curr})</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payables.map(({ party, balance }) => (
                      <tr key={party.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{party.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{party.phone || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{party.city || party.address || 'Supplier'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600 text-sm">
                          {formatCurrency(balance, curr)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {onViewPartyLedger && (
                            <button
                              onClick={() => onViewPartyLedger(party)}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold text-[11px] cursor-pointer"
                            >
                              Open Ledger
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ---------------- 7. CUSTOMER STATEMENT (SECTION 20) ---------------- */}
        {activeReport === 'customer_statement' && (() => {
          const targetCustomer = parties.find((p) => p.id === selectedCustomerId);
          if (!targetCustomer) return <p className="text-slate-400">Please select a customer.</p>;

          const allEntries = generatePartyLedger(targetCustomer, invoices, payments, purchases, manualTransactions);
          const entries = allEntries.filter((e) => {
            if (e.type === 'OPENING') return true;
            if (filterStartDate && e.date < filterStartDate) return false;
            if (filterEndDate && e.date > filterEndDate) return false;
            return true;
          });

          const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
          const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);
          const closing = entries.length > 0 ? entries[entries.length - 1].runningBalance : 0;

          return (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base">{targetCustomer.name}</h3>
                  <p className="text-xs text-slate-600">Phone: {targetCustomer.phone || '—'} · Address: {targetCustomer.address || '—'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Closing Balance:</span>
                  <span className="text-lg font-black text-purple-900">{formatCurrency(closing, curr)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-purple-900 text-white font-bold uppercase text-[11px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit ({curr})</th>
                      <th className="py-2.5 px-3 text-right">Credit ({curr})</th>
                      <th className="py-2.5 px-3 text-right">Running Balance ({curr})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{formatDate(entry.date)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{entry.referenceNo}</td>
                        <td className="py-2.5 px-3 text-slate-800">{entry.description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {entry.credit > 0 ? formatCurrency(entry.credit, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatCurrency(entry.runningBalance, curr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={3} className="py-3 px-3 uppercase text-xs font-black">Totals</td>
                      <td className="py-3 px-3 text-right text-rose-600 font-black">{formatCurrency(totalDebits, curr)}</td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-black">{formatCurrency(totalCredits, curr)}</td>
                      <td className="py-3 px-3 text-right text-purple-900 font-black">{formatCurrency(closing, curr)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ---------------- 8. DAY BOOK JOURNAL ---------------- */}
        {activeReport === 'daybook' && (() => {
          const dayBook = generateDayBook(targetSingleDate, invoices, payments, purchases, expenses);

          return (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 flex justify-between items-center text-xs">
                <span className="font-bold text-blue-900">Journal entries for {formatDate(targetSingleDate)}:</span>
                <span className="font-semibold text-blue-800">Total Entries: {dayBook.items.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3">Party / Particulars</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit ({curr})</th>
                      <th className="py-2.5 px-3 text-right">Credit ({curr})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayBook.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-500">{item.time}</td>
                        <td className="py-2.5 px-3 font-bold text-purple-700">{item.type}</td>
                        <td className="py-2.5 px-3 font-mono">{item.reference}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.partyName}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {item.debit > 0 ? formatCurrency(item.debit, curr, 'no_symbol') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {item.credit > 0 ? formatCurrency(item.credit, curr, 'no_symbol') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
