import React, { useRef, useState, useMemo } from 'react';
import {
  Printer,
  FileDown,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Phone,
  MapPin,
  Calendar,
  SlidersHorizontal,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Send,
  FileText,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Party, CompanySettings, InvoiceSettings, ManualTransaction } from '../../types';
import { getScopedPartyLedger } from '../../utils/accounting';
import { formatCurrency, formatDate, getTodayDateString, getYesterdayDateString, getStartOfWeekString, getStartOfMonthString } from '../../utils/formatters';
import {
  prepareLedgerData,
  renderLedgerPrint,
  generateLedgerPdf,
  generateLedgerImage,
  shareLedger,
} from '../../utils/ledgerService';
import { downloadBlob, copyImageToClipboard } from '../../utils/shareUtils';
import { getInvoices, getPayments, getPurchases, getManualTransactions, saveManualTransaction } from '../../db/storage';
import { ManualPartyEntryModal } from './ManualPartyEntryModal';
import { PartyLedgerDocument } from './PartyLedgerDocument';

interface PartyLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  company: CompanySettings;
  invoiceSettings: InvoiceSettings;
  onAddPayment: (party: Party) => void;
  onNewInvoice: (party: Party) => void;
}

export const PartyLedgerModal: React.FC<PartyLedgerModalProps> = ({
  isOpen,
  onClose,
  party,
  company,
  invoiceSettings,
  onAddPayment,
  onNewInvoice,
}) => {
  const statementRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackNotice({ message, type });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  if (!party || !isOpen) return null;

  const isSupplier = party.partyType === 'supplier';
  const curr = company.currency || 'Rs.';

  const invoices = getInvoices();
  const payments = getPayments();
  const purchases = getPurchases();
  const manualTransactions = getManualTransactions();

  const [isWhatsAppChoiceOpen, setIsWhatsAppChoiceOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Compute mathematically verified prepared party ledger
  const preparedLedger = useMemo(() => {
    return prepareLedgerData(
      party,
      company,
      startDate,
      endDate,
      invoices,
      payments,
      purchases,
      manualTransactions
    );
  }, [party, company, startDate, endDate, invoices, payments, purchases, manualTransactions]);

  const scopedLedger = useMemo(() => {
    return getScopedPartyLedger(
      party,
      startDate,
      endDate,
      invoices,
      payments,
      purchases,
      manualTransactions
    );
  }, [party, startDate, endDate, invoices, payments, purchases, manualTransactions]);

  const closingBalance = preparedLedger.closingBalance;

  // 1. Print Ledger (Clean, dedicated layout in #printArea, NO dashboard chrome!)
  const handlePrint = (orientation: 'portrait' | 'landscape' = 'portrait') => {
    try {
      renderLedgerPrint(preparedLedger, orientation);
      showNotice('Ledger print document prepared.', 'info');
    } catch (err) {
      console.error('Print ledger error:', err);
      showNotice('Unable to print ledger. Please try again.', 'error');
    }
  };

  // 2. Download Multi-Page PDF (Genuine jsPDF + jspdf-autotable, NEVER blank, never cuts rows)
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const filename = `Party-Ledger-${party.name.replace(/\s+/g, '_')}-${getTodayDateString()}.pdf`;
      const pdfBlob = await generateLedgerPdf(preparedLedger);
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Generated PDF blob is empty');
      }
      downloadBlob(pdfBlob, filename);
      showNotice('Complete ledger PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF export failed:', err);
      showNotice('Unable to generate PDF. Please try again.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 3. Export / Share High-Res Full Dynamic-Height Image
  const handleShareImage = async () => {
    setIsCapturingImage(true);
    try {
      const filename = `Party-Ledger-${party.name.replace(/\s+/g, '_')}-${getTodayDateString()}.png`;
      const blob = await generateLedgerImage(preparedLedger);
      if (!blob) {
        showNotice('Failed to generate ledger image.', 'error');
        return;
      }

      // Check mobile Web Share API
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${party.name} - Ledger`,
              text: `Account Statement for ${party.name} (${preparedLedger.periodLabel})`,
              files: [file],
            });
            showNotice('Ledger image shared successfully!', 'success');
            return;
          }
        } catch (e: any) {
          if (e.name === 'AbortError') return;
        }
      }

      // Desktop: Download + Clipboard copy
      await copyImageToClipboard(blob);
      downloadBlob(blob, filename);
      showNotice('High-resolution ledger image downloaded & copied to clipboard!', 'success');
    } catch (err) {
      console.error('Image capture failed:', err);
      showNotice('Failed to capture ledger image.', 'error');
    } finally {
      setIsCapturingImage(false);
    }
  };

  // 4. WhatsApp Sharing (PDF, Image, or Text Summary)
  const handleShareWhatsAppAction = async (format: 'pdf' | 'image' | 'text') => {
    setIsSharingWhatsApp(true);
    setIsWhatsAppChoiceOpen(false);
    try {
      const res = await shareLedger(preparedLedger, format);
      if (res.method === 'web_share') {
        showNotice('Shared successfully!', 'success');
      } else if (res.method === 'clipboard_and_whatsapp' || res.method === 'download_and_whatsapp') {
        showNotice('Document downloaded & summary copied! WhatsApp chat opened.', 'success');
      } else {
        showNotice('WhatsApp chat opened with account summary.', 'success');
      }
    } catch (err) {
      console.error('WhatsApp share error:', err);
      showNotice('Encountered an error sharing to WhatsApp.', 'error');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const handleSaveManualEntry = (tx: ManualTransaction) => {
    saveManualTransaction(tx);
    showNotice('Manual ledger transaction recorded.', 'success');
  };

  // Quick Date Filter Presets
  const applyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = getTodayDateString();
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const y = getYesterdayDateString();
      setStartDate(y);
      setEndDate(y);
    } else if (preset === 'week') {
      setStartDate(getStartOfWeekString());
      setEndDate(today);
    } else if (preset === 'month') {
      setStartDate(getStartOfMonthString());
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${party.name} - ${isSupplier ? 'Supplier Payable' : 'Customer Receivable'} Ledger`}
        subtitle="Complete transaction statement, running balance, PDF export & image sharing"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Notification Toast */}
          {feedbackNotice && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all no-print ${
                feedbackNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : feedbackNotice.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-purple-50 text-purple-800 border border-purple-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackNotice.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedbackNotice.message}</span>
              </div>
              <button
                onClick={() => setFeedbackNotice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* ---------------- 1. ACTIONS TOOLBAR ---------------- */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-slate-50 rounded-2xl border border-slate-200 no-print">
            {/* Left: Quick Transaction Adding */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onAddPayment(party)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSupplier ? '+ Pay Supplier' : '+ Receive Payment'}
              </button>

              <button
                onClick={() => onNewInvoice(party)}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSupplier ? '+ New Purchase Bill' : '+ New Invoice'}
              </button>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                + Manual Entry
              </button>
            </div>

            {/* Right: The 4 Required Export & Sharing Buttons (Requirement 13) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* [Print Ledger Options] */}
              <div className="flex items-center">
                <button
                  onClick={() => handlePrint('portrait')}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-l-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Print clean A4 portrait ledger statement"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-700" />
                  <span>Print Ledger</span>
                </button>
                <button
                  onClick={() => handlePrint('landscape')}
                  className="px-2 py-1.5 bg-slate-50 border-y border-r border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-r-xl text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Print A4 Landscape"
                >
                  Wide
                </button>
              </div>

              {/* [Download PDF] */}
              <button
                disabled={isExportingPdf}
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Download complete multi-page PDF statement"
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-700 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-indigo-700" />
                )}
                <span>{isExportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
              </button>

              {/* [Share as Image] */}
              <button
                disabled={isCapturingImage}
                onClick={handleShareImage}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Export high-resolution readable ledger image"
              >
                {isCapturingImage ? (
                  <RefreshCw className="w-3.5 h-3.5 text-purple-700 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-purple-700" />
                )}
                <span>{isCapturingImage ? 'Generating Image...' : 'Share as Image'}</span>
              </button>

              {/* [Share on WhatsApp] */}
              <button
                disabled={isSharingWhatsApp}
                onClick={() => setIsWhatsAppChoiceOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Send high-resolution ledger image & summary on WhatsApp"
              >
                {isSharingWhatsApp ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5" />
                )}
                <span>{isSharingWhatsApp ? 'Connecting...' : 'WhatsApp Ledger'}</span>
              </button>
            </div>
          </div>

          {/* ---------------- 2. DATE FILTER BAR & PRESETS ---------------- */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-700" /> Date Filter:
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium"
                  />
                </div>

                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="px-2 py-1 text-purple-700 hover:bg-purple-50 rounded-lg font-bold cursor-pointer text-xs"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => applyPreset('all')}
                  className={`px-2 py-1 rounded-lg font-medium cursor-pointer ${
                    !startDate && !endDate ? 'bg-purple-100 text-purple-800 font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => applyPreset('today')}
                  className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={() => applyPreset('week')}
                  className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  This Week
                </button>
                <button
                  onClick={() => applyPreset('month')}
                  className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Scope Summary Line */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <div>
                Showing: <strong>{scopedLedger.entries.length} records</strong> (including opening balance)
                · Period: <span className="text-purple-800 font-semibold">{scopedLedger.periodLabel}</span>
              </div>
              <div className="font-semibold">
                Closing Balance:{' '}
                <span
                  className={
                    closingBalance > 0
                      ? 'text-rose-600 font-bold'
                      : closingBalance < 0
                      ? 'text-emerald-600 font-bold'
                      : 'text-slate-700'
                  }
                >
                  {formatCurrency(Math.abs(closingBalance), curr)}{' '}
                  {closingBalance > 0
                    ? isSupplier
                      ? '(Payable)'
                      : '(Receivable)'
                    : closingBalance < 0
                    ? '(Advance)'
                    : '(Settled)'}
                </span>
              </div>
            </div>
          </div>

          {/* ---------------- 3. PRINTABLE & EXPORTABLE DOCUMENT CONTAINER ---------------- */}
          {/* Scrollable Container for on-screen browsing without forcing fixed print heights */}
          <div className="w-full overflow-x-auto max-h-[70vh] sm:max-h-[74vh] overflow-y-auto rounded-2xl border border-slate-200/90 shadow-inner bg-slate-100/70 p-2 sm:p-4 ledger-scroll-container">
            {/* Dedicated printable ledger document in normal document flow */}
            <div
              ref={statementRef}
              id="printable-ledger-container"
              className="printable-ledger-container w-full"
            >
              <PartyLedgerDocument
                party={party}
                company={company}
                scopedLedger={scopedLedger}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Manual Party Entry Modal */}
      {isManualModalOpen && (
        <ManualPartyEntryModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          party={party}
          onSave={handleSaveManualEntry}
          currency={curr}
        />
      )}

      {/* WhatsApp Sharing Format Choice Modal */}
      {isWhatsAppChoiceOpen && (
        <Modal
          isOpen={isWhatsAppChoiceOpen}
          onClose={() => setIsWhatsAppChoiceOpen(false)}
          title="Share Ledger on WhatsApp"
          subtitle={`Select how you would like to send ${party.name}'s account statement`}
          maxWidth="md"
        >
          <div className="space-y-3 p-1">
            <button
              onClick={() => handleShareWhatsAppAction('pdf')}
              className="w-full p-4 rounded-2xl border-2 border-purple-100 hover:border-purple-600 bg-purple-50/50 hover:bg-purple-50 transition-all flex items-center justify-between group cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm group-hover:text-purple-900">
                    Share as PDF Document
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Official multi-page PDF attached with summary text
                  </div>
                </div>
              </div>
              <Send className="w-4 h-4 text-purple-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={() => handleShareWhatsAppAction('image')}
              className="w-full p-4 rounded-2xl border-2 border-emerald-100 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex items-center justify-between group cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-900">
                    Share as High-Resolution Image
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Full-length ledger picture, easy to view directly in WhatsApp
                  </div>
                </div>
              </div>
              <Send className="w-4 h-4 text-emerald-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={() => handleShareWhatsAppAction('text')}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100 transition-all flex items-center justify-between group cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm group-hover:text-slate-900">
                    Send Text Summary Only
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Quick message with Opening, Debits, Credits & Balance
                  </div>
                </div>
              </div>
              <Send className="w-4 h-4 text-slate-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsWhatsAppChoiceOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-4 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
