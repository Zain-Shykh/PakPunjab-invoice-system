import React, { useRef, useState } from 'react';
import {
  Printer,
  FileDown,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Image as ImageIcon,
  Smartphone,
  FileText,
  EyeOff,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { CompanySettings, Invoice, InvoiceSettings, Party } from '../../types';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { getProducts, getVisibleInvoiceItems } from '../../db/storage';
import {
  createInvoiceCanvasDirect,
  copyImageToClipboard,
  downloadBlob,
  generateWhatsAppMessage,
  openWhatsAppChat,
} from '../../utils/shareUtils';
import {
  renderInvoicePrint,
  generateInvoicePdf,
  shareInvoice,
} from '../../utils/invoiceService';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  company: CompanySettings;
  settings: InvoiceSettings;
  party?: Party;
  initialAction?: 'view' | 'print' | 'whatsapp';
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  company,
  settings,
  party,
  initialAction = 'view',
}) => {
  const [activeFormat, setActiveFormat] = useState<'a4' | 'thermal' | 'thermal58'>('thermal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const invoiceContainerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen || !invoice || !initialAction || initialAction === 'view') return;
    const timer = setTimeout(() => {
      if (initialAction === 'print') {
        handlePrint('thermal');
      } else if (initialAction === 'whatsapp') {
        handleWhatsAppAction();
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [isOpen, invoice?.id, initialAction]);

  if (!invoice || !isOpen) return null;

  const showNotice = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setActionNotice({ message, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handlePrint = (format: 'a4' | 'thermal' | 'thermal58') => {
    setActiveFormat(format);
    try {
      renderInvoicePrint(invoice, company, settings, format);
      const formatLabel = format === 'thermal58' ? 'Thermal 58mm' : format === 'thermal' ? 'Thermal 80mm' : 'A4';
      showNotice(`Invoice ${formatLabel} print prepared.`, 'info');
    } catch (err) {
      console.error('Invoice print error:', err);
      showNotice('Unable to print invoice.', 'error');
    }
  };

  const handleDownloadPdf = async () => {
    setIsProcessing(true);
    setProcessingStatus('Generating Vector PDF Document...');
    try {
      const filename = `Invoice-${invoice.invoiceNo}.pdf`;
      const pdfBlob = await generateInvoicePdf(invoice, company, settings);
      downloadBlob(pdfBlob, filename);
      showNotice('Invoice PDF generated and downloaded successfully.', 'success');
    } catch (err) {
      console.error('PDF generation failed:', err);
      showNotice('PDF generation failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleGenerateAndShareImage = async () => {
    setIsProcessing(true);
    setProcessingStatus('Generating High-Resolution Invoice Image...');

    try {
      const blob = await createInvoiceCanvasDirect(invoice, company, company.currency || 'Rs.');
      if (!blob) {
        showNotice('Could not capture invoice image. Opening WhatsApp with text...', 'error');
        openWhatsAppChat(invoice.partyPhone || party?.whatsapp || party?.phone || '', generateWhatsAppMessage(invoice, company, party));
        return;
      }

      const res = await shareInvoice(invoice, company, settings, party, 'image');
      if (res.method === 'web_share') {
        showNotice('Invoice shared via system share sheet.', 'success');
      } else {
        showNotice('Image copied to clipboard and downloaded! WhatsApp opened.', 'success');
      }
    } catch (err) {
      console.error('Image share failed:', err);
      showNotice('Sharing encountered an error. Opening WhatsApp...', 'error');
      openWhatsAppChat(invoice.partyPhone || party?.whatsapp || party?.phone || '', generateWhatsAppMessage(invoice, company, party));
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleWhatsAppAction = async () => {
    setIsProcessing(true);
    setProcessingStatus('Connecting WhatsApp...');

    try {
      const res = await shareInvoice(invoice, company, settings, party, 'pdf');
      if (res.method === 'web_share') {
        showNotice('Invoice shared via system share sheet.', 'success');
      } else {
        showNotice('Invoice PDF downloaded & WhatsApp chat opened.', 'success');
      }
    } catch (err) {
      console.error('WhatsApp share error:', err);
      const msg = generateWhatsAppMessage(invoice, company, party);
      openWhatsAppChat(invoice.partyPhone || party?.whatsapp || party?.phone || '', msg);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleDownloadImageOnly = async () => {
    setIsProcessing(true);
    setProcessingStatus('Generating PNG Image...');

    try {
      const blob = await createInvoiceCanvasDirect(invoice, company, company.currency || 'Rs.');
      if (!blob) {
        showNotice('Could not generate invoice image.', 'error');
        return;
      }
      const filename = `Invoice-${invoice.invoiceNo}.png`;
      downloadBlob(blob, filename);
      showNotice('Invoice image downloaded successfully.', 'success');
    } catch (err) {
      console.error('Image download failed:', err);
      showNotice('Image download failed.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleCopyImageToClipboard = async () => {
    setIsProcessing(true);
    setProcessingStatus('Rendering image to clipboard...');
    try {
      const blob = await createInvoiceCanvasDirect(invoice, company, company.currency || 'Rs.');
      if (blob) {
        const success = await copyImageToClipboard(blob);
        if (success) {
          setCopiedImage(true);
          showNotice('Invoice image copied to clipboard! Press Ctrl+V in WhatsApp Web to send.', 'success');
          setTimeout(() => setCopiedImage(false), 3000);
        } else {
          showNotice('Clipboard image copy not supported in this browser. Image downloaded instead.', 'info');
          const filename = `Invoice-${invoice.invoiceNo}.png`;
          downloadBlob(blob, filename);
        }
      }
    } catch (err) {
      console.error(err);
      showNotice('Failed to copy image to clipboard.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleCopyWhatsAppMessage = () => {
    const msg = generateWhatsAppMessage(invoice, company, party);
    navigator.clipboard.writeText(msg);
    setCopiedText(true);
    showNotice('Formatted invoice message copied to clipboard.', 'success');
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleDirectWhatsApp = () => {
    const msg = generateWhatsAppMessage(invoice, company, party);
    openWhatsAppChat(invoice.partyPhone || party?.whatsapp || party?.phone || '', msg);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice #${invoice.invoiceNo}`}
      subtitle={`Customer: ${invoice.partyName} · Date: ${invoice.date}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 no-print">
          {/* Layout switcher */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
            <button
              onClick={() => setActiveFormat('a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFormat === 'a4'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> A4 Invoice
            </button>
            <button
              onClick={() => setActiveFormat('thermal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFormat === 'thermal'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Thermal 80mm
            </button>
            <button
              onClick={() => setActiveFormat('thermal58')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFormat === 'thermal58'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Thermal 58mm
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={isProcessing}
              onClick={() => handlePrint(activeFormat)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-purple-300" /> Print Invoice
            </button>
            <button
              disabled={isProcessing}
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-indigo-700" /> Download PDF
            </button>
            <button
              disabled={isProcessing}
              onClick={handleGenerateAndShareImage}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Share Invoice
            </button>
            <button
              disabled={isProcessing}
              onClick={handleWhatsAppAction}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>

        {/* Processing State indicator */}
        {isProcessing && (
          <div className="p-3 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
            {processingStatus}
          </div>
        )}

        {/* Action Notice indicator */}
        {actionNotice && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : actionNotice.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-900'
                : 'bg-purple-50 border border-purple-200 text-purple-900'
            }`}
          >
            <span>{actionNotice.message}</span>
            <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* WhatsApp Quick Message / Copy Bar */}
        <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-emerald-950 no-print">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              Share invoice directly to WhatsApp or copy formatted summary message:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyImageToClipboard}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy invoice image to paste directly in WhatsApp Web"
            >
              {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedImage ? 'Image Copied!' : 'Copy Image'}
            </button>
            <button
              onClick={handleDownloadImageOnly}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Save Image
            </button>
            <button
              onClick={handleCopyWhatsAppMessage}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Message
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hidden Products Info for Owner */}
        {(() => {
          const visible = getVisibleInvoiceItems(invoice.items, getProducts());
          const hiddenCount = invoice.items.length - visible.length;
          if (hiddenCount <= 0) return null;
          return (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{hiddenCount} product(s)</strong> are hidden from this customer document according to Product Settings. Total amount & ledger balances are calculated normally.
                </span>
              </div>
            </div>
          );
        })()}

        {/* Invoice Container for Print & Image Capture */}
        <div
          ref={invoiceContainerRef}
          id="printable-invoice-container"
          className="overflow-x-auto p-2 bg-slate-100/50 rounded-2xl"
        >
          <InvoicePrintTemplate
            invoice={invoice}
            company={company}
            settings={settings}
            format={activeFormat}
          />
        </div>
      </div>
    </Modal>
  );
};
