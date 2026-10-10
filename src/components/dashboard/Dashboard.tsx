import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Receipt,
  Users,
  AlertCircle,
  Banknote,
  Plus,
  FileText,
  History,
  BookOpen,
  Building,
  Palette,
  Printer,
  Database,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  HardDriveDownload,
  Wallet,
  Building2,
  ArrowUpRight,
  Heart,
  Eye,
  MessageCircle,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import {
  CompanySettings,
  AppSettings,
  Party,
  Invoice,
  Payment,
  Purchase,
  Expense,
} from '../../types';
import {
  DashboardMetrics,
  calculateAllPartiesSummary,
} from '../../utils/accounting';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { NavTab } from '../layout/Navigation';

interface DashboardProps {
  company: CompanySettings;
  appSettings: AppSettings;
  metrics: DashboardMetrics;
  parties?: Party[];
  invoices?: Invoice[];
  payments?: Payment[];
  purchases?: Purchase[];
  expenses?: Expense[];
  onNavigate: (tab: NavTab, subView?: string) => void;
  onNewInvoice: (party?: Party) => void;
  onNewPayment: (party?: Party, defaultType?: 'received' | 'paid') => void;
  onNewExpense?: () => void;
  onNewCashEntry?: () => void;
  onNewBankEntry?: () => void;
  onViewPartyLedger?: (party: Party) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onWhatsAppInvoice?: (invoice: Invoice) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  company,
  appSettings,
  metrics,
  parties = [],
  invoices = [],
  payments = [],
  purchases = [],
  onNavigate,
  onNewInvoice,
  onNewPayment,
  onNewExpense,
  onNewCashEntry,
  onNewBankEntry,
  onViewPartyLedger,
  onViewInvoice,
  onWhatsAppInvoice,
  onExportBackup,
  onImportBackup,
}) => {
  const [reportsOpen, setReportsOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const curr = company.currency || 'Rs.';

  // Calculate detailed party balances for customer receivables and supplier payables
  const allPartiesSummary = calculateAllPartiesSummary(parties, invoices, payments, purchases);

  const customerReceivables = allPartiesSummary
    .filter((p) => p.partyType === 'Customer' && p.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance);

  const supplierPayables = allPartiesSummary
    .filter((p) => p.partyType === 'Supplier' && p.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance);

  // Recent Sales Invoices (latest 5)
  const recentInvoices = [...invoices]
    .sort((a, b) => {
      const d = (b.date || '').localeCompare(a.date || '');
      if (d !== 0) return d;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    })
    .slice(0, 5);

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* ================= 6 TOP KPI CARDS (EXACT 2x3 MOBILE GRID FROM SCREENSHOT) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: TODAY'S SALE */}
        <div
          onClick={() => onNavigate('invoices', 'today')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[142px]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider leading-snug">
              TODAY&apos;S SALE
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {formatCurrency(metrics.todaySales, curr)}
            </div>
            <div className="text-xs font-semibold text-purple-800 mt-2 flex items-center justify-between gap-1">
              <span>View today&apos;s sales</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Card 2: OUTSTANDING */}
        <div
          onClick={() => onNavigate('reports', 'receivables')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[142px]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider leading-snug">
              OUTSTANDING
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight truncate">
              {formatCurrency(metrics.totalReceivable, curr)}
            </div>
            <div className="text-xs font-semibold text-rose-800 mt-2 flex items-center justify-between gap-1">
              <span className="leading-tight">View party receivables</span>
              <ArrowRight className="w-3.5 h-3.5 text-rose-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Card 3: TODAY'S RECEIPTS */}
        <div
          onClick={() => onNavigate('payments', 'today')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[142px]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider leading-snug">
              TODAY&apos;S
              <br />
              RECEIPTS
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight truncate">
              {formatCurrency(metrics.todayReceived, curr)}
            </div>
            <div className="text-xs font-semibold text-emerald-800 mt-2 flex items-center justify-between gap-1">
              <span className="leading-tight">View today&apos;s payments</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Card 4: INVOICES TODAY (Circled in user screenshot!) */}
        <div
          onClick={() => onNavigate('invoices', 'today')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[142px]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider leading-snug">
              INVOICES
              <br />
              TODAY
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {metrics.todayInvoicesCount}
            </div>
            <div className="text-xs font-semibold text-purple-800 mt-2 flex items-center justify-between gap-1">
              <span>View invoices</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Card 5: TOTAL PARTIES */}
        <div
          onClick={() => onNavigate('parties')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[142px]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider leading-snug">
              TOTAL
              <br />
              PARTIES
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {metrics.totalPartiesCount}
            </div>
            <div className="text-xs font-semibold text-purple-800 mt-2 flex items-center justify-between gap-1">
              <span>Manage parties</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Card 6: CASH INFLOW TODAY */}
        <div
          onClick={() => onNavigate('accounts', 'cash')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[142px]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider leading-snug">
              CASH INFLOW
              <br />
              TODAY
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight truncate">
              {formatCurrency(metrics.todayCashCollected, curr)}
            </div>
            <div className="text-xs font-semibold text-emerald-800 mt-2 flex items-center justify-between gap-1">
              <span>Open Cash Book</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4 PRIMARY ACTION BUTTONS (EXACT 2x2 GRID FROM SCREENSHOT) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Button 1: + + New Invoice (Solid Purple) */}
        <button
          type="button"
          onClick={() => onNewInvoice()}
          className="flex items-center justify-center gap-2.5 py-4 px-4 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white rounded-2xl shadow-md transition-all cursor-pointer font-bold text-sm sm:text-base min-h-[60px]"
        >
          <Plus className="w-5 h-5 stroke-[2.5] shrink-0" />
          <span>+ New Invoice</span>
        </button>

        {/* Button 2: Invoices (White Card with Purple Receipt Icon - Circled in screenshot!) */}
        <button
          type="button"
          onClick={() => onNavigate('invoices')}
          className="flex items-center justify-center gap-2.5 py-4 px-4 bg-white hover:bg-purple-50/50 active:bg-purple-100/50 text-slate-800 border border-slate-200/90 rounded-2xl shadow-xs transition-all cursor-pointer font-bold text-sm sm:text-base min-h-[60px]"
        >
          <Receipt className="w-5 h-5 text-purple-700 shrink-0" />
          <span>Invoices</span>
        </button>

        {/* Button 3: + Receive Payment (Solid Green) */}
        <button
          type="button"
          onClick={() => onNewPayment(undefined, 'received')}
          className="flex items-center justify-center gap-2.5 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl shadow-md transition-all cursor-pointer font-bold text-sm sm:text-base min-h-[60px]"
        >
          <CreditCard className="w-5 h-5 shrink-0" />
          <span className="leading-tight">+ Receive Payment</span>
        </button>

        {/* Button 4: Payment History (White Card with Green History Icon) */}
        <button
          type="button"
          onClick={() => onNavigate('payments')}
          className="flex items-center justify-center gap-2.5 py-4 px-4 bg-white hover:bg-emerald-50/50 active:bg-emerald-100/50 text-slate-800 border border-slate-200/90 rounded-2xl shadow-xs transition-all cursor-pointer font-bold text-sm sm:text-base min-h-[60px]"
        >
          <History className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="leading-tight">Payment History</span>
        </button>
      </div>

      {/* ================= ADDITIONAL ERP QUICK ACTIONS & DONATION SUMMARY ================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-700" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              More Quick Actions
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Ledgers, Expenses & Cash/Bank
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Pay Supplier */}
          <button
            type="button"
            onClick={() => onNewPayment(undefined, 'paid')}
            className="flex flex-col items-center justify-center py-3 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-2xs transition-all cursor-pointer font-bold text-xs gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Pay Supplier</span>
          </button>

          {/* New Expense */}
          <button
            type="button"
            onClick={() => (onNewExpense ? onNewExpense() : onNavigate('expenses'))}
            className="flex flex-col items-center justify-center py-3 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-2xs transition-all cursor-pointer font-bold text-xs gap-1.5"
          >
            <Wallet className="w-4 h-4" />
            <span>New Expense</span>
          </button>

          {/* Cash Entry */}
          <button
            type="button"
            onClick={() => (onNewCashEntry ? onNewCashEntry() : onNavigate('accounts', 'cash'))}
            className="flex flex-col items-center justify-center py-3 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-2xs transition-all cursor-pointer font-bold text-xs gap-1.5"
          >
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span>Cash Entry</span>
          </button>

          {/* Bank Entry */}
          <button
            type="button"
            onClick={() => (onNewBankEntry ? onNewBankEntry() : onNavigate('accounts', 'bank'))}
            className="flex flex-col items-center justify-center py-3 px-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-2xl shadow-2xs transition-all cursor-pointer font-bold text-xs gap-1.5"
          >
            <Building2 className="w-4 h-4 text-blue-200" />
            <span>Bank Entry</span>
          </button>

          {/* Cash Ledger */}
          <button
            type="button"
            onClick={() => onNavigate('accounts', 'cash')}
            className="flex flex-col items-center justify-center py-3 px-2.5 bg-white hover:bg-emerald-50/50 text-slate-800 border border-slate-200 rounded-2xl shadow-2xs transition-all cursor-pointer font-bold text-xs gap-1.5"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Cash Ledger</span>
          </button>

          {/* Bank Ledger */}
          <button
            type="button"
            onClick={() => onNavigate('accounts', 'bank')}
            className="flex flex-col items-center justify-center py-3 px-2.5 bg-white hover:bg-blue-50/50 text-slate-800 border border-slate-200 rounded-2xl shadow-2xs transition-all cursor-pointer font-bold text-xs gap-1.5"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Bank Ledger</span>
          </button>

          {/* Donations */}
          <button
            type="button"
            onClick={() => onNavigate('donations')}
            className="flex flex-col items-center justify-center py-3 px-2.5 bg-rose-50 hover:bg-rose-100/80 text-rose-900 border border-rose-200 rounded-2xl shadow-2xs transition-all cursor-pointer font-bold text-xs gap-1.5 col-span-2 sm:col-span-1"
          >
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            <span>Donations</span>
          </button>
        </div>
      </div>

      {/* ================= COMMUNITY DONATION SUMMARY ================= */}
      <div className="bg-white rounded-3xl border border-purple-200/90 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-purple-100 gap-2.5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                  Community Donation Summary
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900">
                  Rate: {curr} {metrics.currentDonationRate || 0} / Qty
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Automated quantity-based internal contribution ({curr} {metrics.currentDonationRate || 0} per piece sold)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('donations', 'ledger')}
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>View Donation Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5">
          <div
            onClick={() => onNavigate('donations', 'ledger')}
            className="p-3.5 sm:p-4 bg-purple-50/75 border border-purple-200/70 rounded-2xl cursor-pointer hover:bg-purple-100/70 transition-all"
          >
            <span className="text-[10px] sm:text-xs font-bold text-purple-900 uppercase block tracking-wider">
              Today&apos;s Donation
            </span>
            <div className="text-lg sm:text-2xl font-black text-purple-950 mt-1 truncate">
              {formatCurrency(metrics.todayDonation || 0, curr)}
            </div>
            <div className="text-[11px] text-purple-700 font-medium mt-1">
              Sale Qty: <strong>{metrics.todayDonatedQty || 0} Qty</strong> · {metrics.todayDonationInvoicesCount || 0} invoices
            </div>
          </div>

          <div
            onClick={() => onNavigate('donations', 'ledger')}
            className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all"
          >
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block tracking-wider">
              Today&apos;s Sale Quantity
            </span>
            <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1 truncate">
              {metrics.todayDonatedQty || 0} Qty
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Donation Rate: <strong className="text-purple-700">{curr} {metrics.currentDonationRate || 0}</strong> / pc
            </div>
          </div>

          <div
            onClick={() => onNavigate('donations', 'report')}
            className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all"
          >
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block tracking-wider">
              This Month&apos;s Donation
            </span>
            <div className="text-lg sm:text-2xl font-black text-indigo-950 mt-1 truncate">
              {formatCurrency(metrics.monthDonation || 0, curr)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Monthly Qty: <strong className="text-slate-800">{metrics.monthDonatedQty || 0} Qty</strong>
            </div>
          </div>

          <div
            onClick={() => onNavigate('donations', 'report')}
            className="p-3.5 sm:p-4 bg-emerald-50/65 border border-emerald-200/80 rounded-2xl cursor-pointer hover:bg-emerald-100/70 transition-all"
          >
            <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase block tracking-wider">
              Total Lifetime Donation
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-900 mt-1 truncate">
              {formatCurrency(metrics.totalDonation || 0, curr)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Total Sold: <strong className="text-emerald-900">{metrics.totalDonatedQty || 0} Qty</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CUSTOMER RECEIVABLES & SUPPLIER PAYABLES ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Receivables Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-700" />
                <span>Customer Receivables</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {customerReceivables.length} customers with outstanding balances
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports', 'receivables')}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {customerReceivables.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
                <p className="font-bold text-xs text-slate-700">
                  No outstanding customer balances
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All customer accounts are settled.
                </p>
              </div>
            ) : (
              customerReceivables.slice(0, 6).map((item) => (
                <div
                  key={item.party.id}
                  className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-xl px-2 transition-colors"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {item.partyName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{item.party.phone || 'No phone'}</span>
                      {item.party.city && <span>· {item.party.city}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs sm:text-sm font-black text-rose-600">
                      {formatCurrency(item.currentBalance, curr)}
                    </span>
                    {onViewPartyLedger && (
                      <button
                        type="button"
                        onClick={() => onViewPartyLedger(item.party)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Ledger
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Supplier Payables Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-rose-600" />
                <span>Supplier Payables</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {supplierPayables.length} suppliers with payable dues
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports', 'payables')}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {supplierPayables.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="font-bold text-xs text-slate-700">
                  No pending supplier dues
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All supplier balances are cleared.
                </p>
              </div>
            ) : (
              supplierPayables.slice(0, 6).map((item) => (
                <div
                  key={item.party.id}
                  className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-xl px-2 transition-colors"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {item.partyName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{item.party.phone || 'No phone'}</span>
                      {item.party.city && <span>· {item.party.city}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs sm:text-sm font-black text-rose-600">
                      {formatCurrency(item.currentBalance, curr)}
                    </span>
                    {onViewPartyLedger && (
                      <button
                        type="button"
                        onClick={() => onViewPartyLedger(item.party)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Ledger
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ================= RECENT SALES INVOICES ================= */}
      {recentInvoices.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-700" />
                <span>Recent Sales Invoices</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Latest {recentInvoices.length} of {invoices.length} total invoices
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('invoices')}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
            >
              <span>All Invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-xl px-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-900">
                      {inv.invoiceNo}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'Partial'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                    {inv.partyName || 'Walk-in Customer'}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDate(inv.date)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-black text-slate-900">
                      {formatCurrency(inv.grandTotal, curr)}
                    </div>
                    {inv.remainingAmount > 0 && (
                      <div className="text-[10px] font-bold text-rose-600">
                        Due: {formatCurrency(inv.remainingAmount, curr)}
                      </div>
                    )}
                  </div>
                  {onViewInvoice && (
                    <button
                      type="button"
                      onClick={() => onViewInvoice(inv)}
                      className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                      title="View / Print Invoice"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {onWhatsAppInvoice && (
                    <button
                      type="button"
                      onClick={() => onWhatsAppInvoice(inv)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Share on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ACCOUNTING REPORTS & LEDGERS ================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div
          onClick={() => setReportsOpen(!reportsOpen)}
          className="flex items-center justify-between px-5 py-4 bg-slate-50/70 border-b border-slate-100 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-purple-700" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              Accounting Reports & Ledgers
            </h3>
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
            {reportsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {reportsOpen && (
          <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('reports', 'sales')}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 flex flex-col items-start gap-2 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-purple-100 text-purple-800 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Daily Sales</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Invoices & revenue</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports', 'purchases')}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 flex flex-col items-start gap-2 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800 shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Daily Purchases</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Supplier bills</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports', 'expenses')}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 flex flex-col items-start gap-2 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Expense Report</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Category breakdown</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('accounts', 'cash')}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 flex flex-col items-start gap-2 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Cash Ledger</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Inflows & cash in hand</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('accounts', 'bank')}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex flex-col items-start gap-2 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Bank Ledger</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Deposits & statements</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports', 'receivables')}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 flex flex-col items-start gap-2 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-rose-100 text-rose-800 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Customer Statement</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Complete account ledgers</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ================= SYSTEM SETTINGS & BACKUP SECTION ================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex items-center justify-between px-5 py-4 bg-slate-50/70 border-b border-slate-100 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-purple-700" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              System Settings & Accounts
            </h3>
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
            {settingsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {settingsOpen && (
          <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('settings', 'company')}
              className="p-3 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            >
              <Building className="w-5 h-5 text-purple-700 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">Company</span>
              <span className="text-[10px] text-slate-500">Name & info</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('settings', 'accounts')}
              className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            >
              <Banknote className="w-5 h-5 text-emerald-600 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">Opening Balances</span>
              <span className="text-[10px] text-slate-500">Cash & Banks</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('settings', 'design')}
              className="p-3 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            >
              <Palette className="w-5 h-5 text-indigo-700 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">Invoice Design</span>
              <span className="text-[10px] text-slate-500">WhatsApp & print</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('settings', 'printer')}
              className="p-3 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            >
              <Printer className="w-5 h-5 text-slate-700 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">Printer Format</span>
              <span className="text-[10px] text-slate-500">A4 & Thermal 80mm</span>
            </button>

            <button
              type="button"
              onClick={onExportBackup}
              className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            >
              <HardDriveDownload className="w-5 h-5 text-emerald-600 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">Export Backup</span>
              <span className="text-[10px] text-slate-500">
                {appSettings.lastBackupDate ? formatDate(appSettings.lastBackupDate) : 'Download JSON'}
              </span>
            </button>

            <button
              type="button"
              onClick={onImportBackup}
              className="p-3 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            >
              <Upload className="w-5 h-5 text-blue-600 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">Import Restore</span>
              <span className="text-[10px] text-slate-500">Load JSON file</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
