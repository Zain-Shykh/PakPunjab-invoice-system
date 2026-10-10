import React, { useState, useMemo, useRef } from 'react';
import {
  Heart,
  Calendar,
  Search,
  Filter,
  Printer,
  FileDown,
  Download,
  Settings,
  BookOpen,
  TrendingUp,
  Receipt,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  ArrowRight,
  Calculator,
  Info,
} from 'lucide-react';
import {
  CompanySettings,
  DonationRecord,
  DonationSettings,
  Invoice,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
  getYesterdayDateString,
  getStartOfWeekString,
  getStartOfMonthString,
} from '../../utils/formatters';
import {
  generateDateWiseDonationReport,
  DateWiseDonationReportData,
} from '../../utils/accounting';
import { downloadCsv, generatePdfFromElement } from '../../utils/shareUtils';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';

interface DonationHubProps {
  company: CompanySettings;
  donationSettings: DonationSettings;
  donations: DonationRecord[];
  invoices: Invoice[];
  onSaveDonationSettings: (settings: DonationSettings) => void;
  onSaveDonationRecord: (record: DonationRecord) => void;
  onDeleteDonationRecord: (recordId: string) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  initialTab?: 'ledger' | 'report' | 'settings';
}

export const DonationHub: React.FC<DonationHubProps> = ({
  company,
  donationSettings,
  donations,
  invoices,
  onSaveDonationSettings,
  onSaveDonationRecord,
  onDeleteDonationRecord,
  onViewInvoice,
  initialTab = 'ledger',
}) => {
  const curr = company.currency || 'Rs.';
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const startOfWeek = getStartOfWeekString();
  const startOfMonth = getStartOfMonthString();

  // Active top-level subtab
  const [activeTab, setActiveTab] = useState<'ledger' | 'report' | 'settings'>(initialTab);

  // ---------------- DONATION SETTINGS STATE ----------------
  const [rateInput, setRateInput] = useState<string>(
    String(donationSettings.donationPerQty ?? 2)
  );
  const [enabledInput, setEnabledInput] = useState<boolean>(donationSettings.enabled ?? true);
  const [noteInput, setNoteInput] = useState<string>(donationSettings.note || '');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateInput);
    if (isNaN(parsed) || parsed < 0) {
      setSettingsError('Please enter a valid donation rate (0 or higher).');
      return;
    }
    setSettingsError('');
    onSaveDonationSettings({
      ...donationSettings,
      enabled: enabledInput,
      donationPerQty: parsed,
      note: noteInput.trim(),
      updatedAt: new Date().toISOString(),
    });
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  // ---------------- DONATION LEDGER FILTER STATE ----------------
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerDateFilter, setLedgerDateFilter] = useState<
    'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'
  >('all');
  const [ledgerCustomStart, setLedgerCustomStart] = useState('');
  const [ledgerCustomEnd, setLedgerCustomEnd] = useState('');

  // ---------------- DATE-WISE REPORT FILTER STATE ----------------
  const [reportDateFilter, setReportDateFilter] = useState<
    'today' | 'yesterday' | 'this_week' | 'this_month' | 'all' | 'custom'
  >('this_month');
  const [reportCustomStart, setReportCustomStart] = useState('');
  const [reportCustomEnd, setReportCustomEnd] = useState('');

  // ---------------- RECORD EDIT & DELETE MODAL STATES ----------------
  const [editingRecord, setEditingRecord] = useState<DonationRecord | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<DonationRecord['status']>('Recorded');
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Printable container ref for PDF/print
  const printableReportRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ---------------- HIGH LEVEL SUMMARY METRICS ----------------
  const activeDonations = useMemo(
    () => donations.filter((d) => d.status !== 'Cancelled'),
    [donations]
  );

  const todayRecords = useMemo(
    () => activeDonations.filter((d) => d.date === today),
    [activeDonations, today]
  );
  const todayTotalDonation = useMemo(
    () => todayRecords.reduce((sum, d) => sum + (Number(d.donationAmount) || 0), 0),
    [todayRecords]
  );
  const todayTotalQty = useMemo(
    () => todayRecords.reduce((sum, d) => sum + (Number(d.totalQuantity) || 0), 0),
    [todayRecords]
  );

  const monthRecords = useMemo(
    () => activeDonations.filter((d) => d.date && d.date.startsWith(today.substring(0, 7))),
    [activeDonations, today]
  );
  const monthTotalDonation = useMemo(
    () => monthRecords.reduce((sum, d) => sum + (Number(d.donationAmount) || 0), 0),
    [monthRecords]
  );
  const monthTotalQty = useMemo(
    () => monthRecords.reduce((sum, d) => sum + (Number(d.totalQuantity) || 0), 0),
    [monthRecords]
  );

  const lifetimeTotalDonation = useMemo(
    () => activeDonations.reduce((sum, d) => sum + (Number(d.donationAmount) || 0), 0),
    [activeDonations]
  );
  const lifetimeTotalQty = useMemo(
    () => activeDonations.reduce((sum, d) => sum + (Number(d.totalQuantity) || 0), 0),
    [activeDonations]
  );

  // ---------------- LEDGER FILTERING ----------------
  const filteredLedgerRecords = useMemo(() => {
    return donations.filter((record) => {
      // Date filter
      if (ledgerDateFilter === 'today' && record.date !== today) return false;
      if (ledgerDateFilter === 'yesterday' && record.date !== yesterday) return false;
      if (ledgerDateFilter === 'this_week' && record.date < startOfWeek) return false;
      if (ledgerDateFilter === 'this_month' && record.date < startOfMonth) return false;
      if (ledgerDateFilter === 'custom') {
        if (ledgerCustomStart && record.date < ledgerCustomStart) return false;
        if (ledgerCustomEnd && record.date > ledgerCustomEnd) return false;
      }

      // Search term (invoice number, customer name, reference, notes)
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase().trim();
        const invNoMatch = (record.invoiceNo || '').toLowerCase().includes(q);
        const nameMatch = (record.partyName || '').toLowerCase().includes(q);
        const refMatch = (record.reference || '').toLowerCase().includes(q);
        const notesMatch = (record.notes || '').toLowerCase().includes(q);
        if (!invNoMatch && !nameMatch && !refMatch && !notesMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const dComp = b.date.localeCompare(a.date);
      if (dComp !== 0) return dComp;
      return (b.time || '').localeCompare(a.time || '');
    });
  }, [
    donations,
    ledgerDateFilter,
    ledgerCustomStart,
    ledgerCustomEnd,
    ledgerSearch,
    today,
    yesterday,
    startOfWeek,
    startOfMonth,
  ]);

  const filteredLedgerTotals = useMemo(() => {
    const totalQty = filteredLedgerRecords.reduce(
      (sum, r) => sum + (r.status !== 'Cancelled' ? Number(r.totalQuantity) || 0 : 0),
      0
    );
    const totalAmount = filteredLedgerRecords.reduce(
      (sum, r) => sum + (r.status !== 'Cancelled' ? Number(r.donationAmount) || 0 : 0),
      0
    );
    return { count: filteredLedgerRecords.length, totalQty, totalAmount };
  }, [filteredLedgerRecords]);

  // ---------------- DATE-WISE REPORT COMPUTATION ----------------
  const reportDates = useMemo(() => {
    if (reportDateFilter === 'today') return { start: today, end: today };
    if (reportDateFilter === 'yesterday') return { start: yesterday, end: yesterday };
    if (reportDateFilter === 'this_week') return { start: startOfWeek, end: today };
    if (reportDateFilter === 'this_month') return { start: startOfMonth, end: today };
    if (reportDateFilter === 'custom') {
      return { start: reportCustomStart || undefined, end: reportCustomEnd || undefined };
    }
    return { start: undefined, end: undefined };
  }, [reportDateFilter, reportCustomStart, reportCustomEnd, today, yesterday, startOfWeek, startOfMonth]);

  const reportData: DateWiseDonationReportData = useMemo(() => {
    return generateDateWiseDonationReport(
      reportDates.start,
      reportDates.end,
      donations,
      donationSettings
    );
  }, [reportDates, donations, donationSettings]);

  // Handle Edit Record Modal open
  const handleOpenEditRecord = (record: DonationRecord) => {
    setEditingRecord(record);
    setEditNotes(record.notes || '');
    setEditStatus(record.status || 'Recorded');
  };

  const handleSaveEditedRecord = () => {
    if (!editingRecord) return;
    const updated: DonationRecord = {
      ...editingRecord,
      notes: editNotes.trim(),
      status: editStatus,
      updatedAt: new Date().toISOString(),
    };
    onSaveDonationRecord(updated);
    setEditingRecord(null);
  };

  const handleExportCsv = () => {
    if (activeTab === 'report') {
      const headers = ['Date', 'Total Quantity Sold', 'Donation Rate', 'Daily Donation', 'Invoices Count'];
      const rows = reportData.dailyBreakdown.map((r) => [
        r.date,
        r.totalQty,
        r.donationPerQty,
        r.dailyDonation,
        r.invoiceCount,
      ]);
      rows.push(['GRAND TOTAL', reportData.totalQuantity, '-', reportData.totalDonation, reportData.totalInvoices]);
      downloadCsv(`Donation_Report_${reportDates.start || 'all'}_to_${reportDates.end || 'all'}.csv`, headers, rows);
    } else {
      const headers = ['Date', 'Invoice No', 'Customer Name', 'Quantity Sold', 'Donation Per Qty', 'Donation Amount', 'Status', 'Reference'];
      const rows = filteredLedgerRecords.map((r) => [
        r.date,
        r.invoiceNo,
        r.partyName,
        r.totalQuantity,
        r.donationPerQty,
        r.donationAmount,
        r.status,
        r.reference || '',
      ]);
      downloadCsv('Donation_Ledger_Export.csv', headers, rows);
    }
  };

  const handlePrintReport = () => {
    const printArea = document.getElementById('printArea');
    if (printArea && printableReportRef.current) {
      printArea.innerHTML = printableReportRef.current.innerHTML;
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
    if (!printableReportRef.current) return;
    setIsExportingPdf(true);
    try {
      await generatePdfFromElement(
        printableReportRef.current,
        `Donation_Report_${reportDates.start || 'all'}_to_${reportDates.end || 'all'}.pdf`
      );
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* ---------------- 1. TOP HEADER & SUMMARY METRICS (Sections 5 & 9) ---------------- */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-rose-50 text-rose-600">
              <Heart className="w-5 h-5 fill-rose-500" />
            </span>
            <span>Donation Management & Social Welfare</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated internal business donation calculated purely on product quantity sold (Formula: Qty × Rate)
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="bg-purple-50 border border-purple-200/70 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-700" />
            <span className="text-xs font-bold text-purple-950">
              Current Rate:{' '}
              <span className="text-purple-700 font-black">
                {curr} {donationSettings.donationPerQty || 0} / Qty
              </span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                donationSettings.enabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {donationSettings.enabled ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* ---------------- 2. THREE SUMMARY CARDS (Sections 5 & 9) ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Today's Donation */}
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
              Today's Donation
            </span>
            <span className="p-1.5 rounded-xl bg-white/10 text-rose-300">
              <Heart className="w-4 h-4 fill-rose-400" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {formatCurrency(todayTotalDonation, curr)}
            </div>
            <div className="text-xs text-purple-200 mt-1 font-medium flex items-center justify-between">
              <span>Today's Sale: <strong>{todayTotalQty} Qty</strong></span>
              <span><strong>{todayRecords.length}</strong> invoices</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-purple-300">
            Rate: {curr} {donationSettings.donationPerQty || 0} per piece sold today
          </div>
        </div>

        {/* Card 2: This Month's Donation */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              This Month's Donation
            </span>
            <span className="p-1.5 rounded-xl bg-purple-50 text-purple-700">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-purple-900">
              {formatCurrency(monthTotalDonation, curr)}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Monthly Quantity: <strong className="text-slate-900">{monthTotalQty} Qty</strong>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            {monthRecords.length} sales invoices recorded this month
          </div>
        </div>

        {/* Card 3: Total Lifetime Donation */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Lifetime Donation
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-800">
              {formatCurrency(lifetimeTotalDonation, curr)}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Total Quantity: <strong className="text-slate-900">{lifetimeTotalQty} Qty</strong>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            Across {activeDonations.length} total recorded sale transactions
          </div>
        </div>

        {/* Card 4: Quantity-Based Formula & Rate */}
        <div className="bg-slate-50 rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Quantity Donation Formula
              </span>
              <span className="p-1.5 rounded-xl bg-slate-200 text-slate-700">
                <Calculator className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-1.5 text-xs text-slate-700 font-semibold space-y-0.5">
              <p className="font-mono text-purple-900 bg-purple-100/70 px-2 py-1 rounded-lg">
                Donation = Qty × {curr} {donationSettings.donationPerQty || 0}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Does NOT change customer receivable or bill payable.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="mt-2 text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Change Donation Rate</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ---------------- 3. SUB-NAVIGATION TABS ---------------- */}
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Donation Ledger / History ({donations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'report'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Date-wise Donation Report</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Donation Settings & Rates</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: DONATION LEDGER / HISTORY (Section 4, 8, 21)
      ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Search by Invoice #, Customer name, or reference..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-500 rounded-xl text-xs sm:text-sm outline-hidden"
              />
            </div>

            {/* Date Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom' },
              ].map((df) => (
                <button
                  key={df.id}
                  onClick={() => setLedgerDateFilter(df.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    ledgerDateFilter === df.id
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {df.label}
                </button>
              ))}

              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                title="Export filtered records as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {ledgerDateFilter === 'custom' && (
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-purple-900">Custom Range:</span>
              <div className="flex items-center gap-1">
                <span>From:</span>
                <input
                  type="date"
                  value={ledgerCustomStart}
                  onChange={(e) => setLedgerCustomStart(e.target.value)}
                  className="px-2 py-1 bg-white border border-purple-200 rounded-lg outline-hidden text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span>To:</span>
                <input
                  type="date"
                  value={ledgerCustomEnd}
                  onChange={(e) => setLedgerCustomEnd(e.target.value)}
                  className="px-2 py-1 bg-white border border-purple-200 rounded-lg outline-hidden text-xs"
                />
              </div>
            </div>
          )}

          {/* Summary Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <span className="text-slate-600">
              Showing <strong className="text-slate-900">{filteredLedgerTotals.count}</strong> donation entries
            </span>
            <div className="flex items-center gap-4">
              <span>
                Total Sold Qty:{' '}
                <strong className="text-purple-900">{filteredLedgerTotals.totalQty}</strong>
              </span>
              <span>
                Total Donation:{' '}
                <strong className="text-emerald-700 font-black">
                  {formatCurrency(filteredLedgerTotals.totalAmount, curr)}
                </strong>
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-center">Total Qty</th>
                  <th className="py-3 px-3 text-right">Donation / Qty</th>
                  <th className="py-3 px-3 text-right">Donation Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedgerRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No donation records found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Whenever an invoice is created, donation is automatically recorded per sold piece.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLedgerRecords.map((item) => {
                    const linkedInvoice = invoices.find((inv) => inv.id === item.invoiceId || inv.invoiceNo === item.invoiceNo);
                    return (
                      <tr key={item.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-700">
                          {formatDate(item.date)}
                          {item.time && <span className="text-[10px] text-slate-400 ml-1.5">{item.time}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                          {linkedInvoice && onViewInvoice ? (
                            <button
                              onClick={() => onViewInvoice(linkedInvoice)}
                              className="hover:underline flex items-center gap-1 cursor-pointer"
                              title="Click to view full invoice"
                            >
                              <span>{item.invoiceNo}</span>
                              <Eye className="w-3 h-3 text-purple-500" />
                            </button>
                          ) : (
                            <span>{item.invoiceNo}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[180px] truncate">
                          {item.partyName || 'Walk-in Customer'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {item.totalQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                          {curr} {item.donationPerQty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800 whitespace-nowrap">
                          {formatCurrency(item.donationAmount, curr)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              item.status === 'Recorded'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'Adjusted'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center no-print">
                          <div className="flex items-center justify-center gap-1">
                            {linkedInvoice && onViewInvoice && (
                              <button
                                onClick={() => onViewInvoice(linkedInvoice)}
                                className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                                title="View invoice"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditRecord(item)}
                              className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit notes / status"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingRecordId(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DATE-WISE DONATION REPORT (Section 6, 7, 22)
      ========================================================================= */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          {/* Report Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-700" />
                Date-wise Donation Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily breakdown of sold quantities and community donation contributions
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ].map((rf) => (
                <button
                  key={rf.id}
                  onClick={() => setReportDateFilter(rf.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    reportDateFilter === rf.id
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {rf.label}
                </button>
              ))}

              <button
                onClick={handlePrintReport}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Custom Date Range selector */}
          {reportDateFilter === 'custom' && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex flex-wrap items-center gap-3 text-xs no-print">
              <span className="font-bold text-purple-900">Custom Date Range:</span>
              <div className="flex items-center gap-1.5">
                <span>From Date:</span>
                <input
                  type="date"
                  value={reportCustomStart}
                  onChange={(e) => setReportCustomStart(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-purple-200 rounded-lg outline-hidden text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span>To Date:</span>
                <input
                  type="date"
                  value={reportCustomEnd}
                  onChange={(e) => setReportCustomEnd(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-purple-200 rounded-lg outline-hidden text-xs"
                />
              </div>
            </div>
          )}

          {/* ---------------- PRINTABLE REPORT CONTAINER (Requirement 22) ---------------- */}
          <div
            ref={printableReportRef}
            id="printable-invoice-container"
            className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6"
          >
            {/* Report Print Header: Logo + Business Name + Report Meta */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-purple-700 gap-4">
              <div className="flex items-start gap-3.5">
                {company.logo && (
                  <img
                    src={company.logo}
                    alt={company.businessName}
                    crossOrigin="anonymous"
                    loading="eager"
                    decoding="sync"
                    className="h-16 max-w-36 object-contain rounded-xl border border-slate-200 p-1 shrink-0 bg-white"
                  />
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-purple-900 leading-tight">
                    {company.businessName}
                  </h1>
                  {company.tagline && <p className="text-xs text-slate-500 mt-0.5">{company.tagline}</p>}
                  <p className="text-xs text-slate-600 mt-1">
                    {company.address}{company.city ? `, ${company.city}` : ''}
                    {company.phone ? ` · Tel: ${company.phone}` : ''}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block px-3 py-1 bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider mb-1">
                  Donation Report
                </span>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p>
                    Period:{' '}
                    <strong>
                      {reportDates.start ? formatDate(reportDates.start) : 'Start'} to{' '}
                      {reportDates.end ? formatDate(reportDates.end) : 'Present'}
                    </strong>
                  </p>
                  <p>Generated: <strong>{formatDate(today)}</strong></p>
                </div>
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/70 p-4 rounded-2xl border border-purple-100 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Invoices</span>
                <span className="text-lg font-black text-slate-900">{reportData.totalInvoices}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Quantity Sold</span>
                <span className="text-lg font-black text-purple-900">{reportData.totalQuantity} Qty</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Configured Rate</span>
                <span className="text-lg font-black text-slate-800">{curr} {reportData.currentRate} / Qty</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Donation</span>
                <span className="text-lg font-black text-emerald-700">
                  {formatCurrency(reportData.totalDonation, curr)}
                </span>
              </div>
            </div>

            {/* Daily Breakdown Table (Requirement 7) */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-center">Invoices</th>
                    <th className="py-3 px-3 text-center">Total Qty Sold</th>
                    <th className="py-3 px-3 text-right">Donation / Qty</th>
                    <th className="py-3 px-3 text-right">Daily Donation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.dailyBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No sale records with donation found in selected period.
                      </td>
                    </tr>
                  ) : (
                    reportData.dailyBreakdown.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {row.invoiceCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-purple-900">
                          {row.totalQty}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {curr} {row.donationPerQty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                          {formatCurrency(row.dailyDonation, curr)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Grand Total Footer Row */}
                <tfoot>
                  <tr className="bg-purple-100/80 font-black text-slate-900 border-t-2 border-purple-300 text-xs sm:text-sm">
                    <td className="py-3 px-3 font-black text-purple-950 uppercase tracking-wider">
                      Grand Total
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-purple-900">
                      {reportData.totalInvoices}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-purple-950">
                      {reportData.totalQuantity} Qty
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-600">
                      -
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-800 text-sm sm:text-base">
                      {formatCurrency(reportData.totalDonation, curr)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Printable Report Footer */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
              <p>Veloce Ledger · Offline Business & Donation Management</p>
              <p>Social Welfare & Community Contribution Report</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DONATION SETTINGS & CONFIGURATION (Section 1A, 3, 23)
      ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 max-w-2xl space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-700" />
              <span>Donation Calculation Settings</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure the exact per-quantity donation amount applied to all new sales invoices.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Enable / Disable Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Enable Automated Donation on Sales</span>
                <span className="text-[11px] text-slate-500">
                  When enabled, donation is automatically recorded upon saving each sales invoice
                </span>
              </div>
              <input
                type="checkbox"
                checked={enabledInput}
                onChange={(e) => setEnabledInput(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded-md cursor-pointer"
              />
            </div>

            {/* Donation Rate Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Donation Per Quantity / Unit ({curr})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {curr}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-purple-500 rounded-xl text-slate-900 font-bold text-base outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Example: Rs. 2 donation per piece sold. Can be changed anytime for future invoices.
              </p>
            </div>

            {/* Formula & Live Calculation Preview (Requirement 1A) */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-purple-950 uppercase tracking-wider block flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-purple-700" />
                <span>Quantity Calculation Preview</span>
              </span>
              <p className="text-[11px] text-purple-800">
                Formula: <strong>Donation Amount = Sold Quantity × {curr} {parseFloat(rateInput) || 0}</strong>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="bg-white p-2 rounded-xl border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 block">1 Qty =</span>
                  <span className="font-black text-purple-900">
                    {formatCurrency(1 * (parseFloat(rateInput) || 0), curr)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 block">10 Qty =</span>
                  <span className="font-black text-purple-900">
                    {formatCurrency(10 * (parseFloat(rateInput) || 0), curr)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 block">50 Qty =</span>
                  <span className="font-black text-purple-900">
                    {formatCurrency(50 * (parseFloat(rateInput) || 0), curr)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 block">100 Qty =</span>
                  <span className="font-black text-purple-900">
                    {formatCurrency(100 * (parseFloat(rateInput) || 0), curr)}
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Description / Purpose */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purpose / Description
              </label>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. Welfare hospital aid, charity school fund, community support"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-purple-500 rounded-xl text-xs sm:text-sm outline-hidden"
              />
            </div>

            {/* Critical Business Rules Reminder (Requirement 10 & 11) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span>Important Accounting Rules:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Donation is strictly based on eligible product quantity sold, NOT total invoice money value.</li>
                <li>Donation does NOT change customer balance, invoice total, cash balance, or ledger balance.</li>
                <li>Older invoices retain their historical donation rate ({curr} 2 or whatever was active when created).</li>
              </ul>
            </div>

            {settingsError && (
              <p className="text-xs text-rose-600 font-bold">{settingsError}</p>
            )}

            {settingsSavedToast && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Donation settings successfully saved! Future invoices will use {curr} {rateInput}/unit.</span>
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Save Donation Settings</span>
            </button>
          </form>
        </div>
      )}

      {/* ---------------- 4. EDIT RECORD MODAL ---------------- */}
      {editingRecord && (
        <Modal
          isOpen={Boolean(editingRecord)}
          onClose={() => setEditingRecord(null)}
          title={`Edit Donation Record - ${editingRecord.invoiceNo}`}
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block">Customer:</span>
                <span className="font-bold text-slate-900">{editingRecord.partyName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Quantity Sold:</span>
                <span className="font-bold text-purple-900">{editingRecord.totalQuantity} Qty</span>
              </div>
              <div>
                <span className="text-slate-400 block">Rate / Qty:</span>
                <span className="font-bold text-slate-900">{curr} {editingRecord.donationPerQty}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Donation Amount:</span>
                <span className="font-black text-emerald-700">{formatCurrency(editingRecord.donationAmount, curr)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
              >
                <option value="Recorded">Recorded</option>
                <option value="Adjusted">Adjusted</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden text-xs"
                placeholder="Add special notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedRecord}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- 5. DELETE CONFIRM MODAL ---------------- */}
      {deletingRecordId && (
        <ConfirmModal
          isOpen={Boolean(deletingRecordId)}
          onClose={() => setDeletingRecordId(null)}
          onConfirm={() => {
            onDeleteDonationRecord(deletingRecordId);
            setDeletingRecordId(null);
          }}
          title="Delete Donation Record?"
          message="Are you sure you want to delete this donation transaction? Note: To keep records aligned, editing or deleting the invoice will automatically synchronize donation records."
          confirmText="Delete Record"
          isDestructive={true}
        />
      )}
    </div>
  );
};
