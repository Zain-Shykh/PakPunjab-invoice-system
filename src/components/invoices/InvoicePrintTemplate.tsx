import React from 'react';
import { CompanySettings, Invoice, InvoiceSettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getProducts, getVisibleInvoiceItems } from '../../db/storage';

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  company: CompanySettings;
  settings: InvoiceSettings;
  format?: 'a4' | 'thermal' | 'thermal58' | 'whatsapp';
}

export const InvoicePrintTemplate: React.FC<InvoicePrintTemplateProps> = ({
  invoice,
  company,
  settings,
  format = 'a4',
}) => {
  const curr = company.currency || 'Rs.';
  const products = getProducts();
  const visibleItems = getVisibleInvoiceItems(invoice.items, products);

  // Base built-in theme presets
  const themePresets: Record<string, { primary: string; headerBg: string; text: string; accent: string; subBg: string }> = {
    purple: {
      primary: '#7c3aed',
      headerBg: '#581c87',
      text: '#1e1b4b',
      accent: '#c4b5fd',
      subBg: '#faf5ff',
    },
    blue: {
      primary: '#2563eb',
      headerBg: '#1e3a8a',
      text: '#172554',
      accent: '#93c5fd',
      subBg: '#eff6ff',
    },
    green: {
      primary: '#059669',
      headerBg: '#064e3b',
      text: '#022c22',
      accent: '#a7f3d0',
      subBg: '#f0fdf4',
    },
    black: {
      primary: '#171717',
      headerBg: '#0a0a0a',
      text: '#171717',
      accent: '#737373',
      subBg: '#f5f5f5',
    },
    white: {
      primary: '#334155',
      headerBg: '#ffffff',
      text: '#0f172a',
      accent: '#cbd5e1',
      subBg: '#f8fafc',
    },
  };

  const preset = themePresets[settings.theme] || themePresets.purple;

  // Custom colors take priority if specified
  const primaryColor = settings.customColors?.primaryColor || preset.primary;
  const headerBgColor = settings.customColors?.headerBgColor || preset.headerBg;
  const textColor = settings.customColors?.textColor || preset.text;
  const accentColor = settings.customColors?.accentColor || preset.accent;
  const isWhiteTheme = settings.theme === 'white';
  const tableHeaderTextColor = isWhiteTheme ? '#0f172a' : '#ffffff';

  // Font family
  const fontFamilyStyle = {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  }[settings.fontFamily || 'sans'];

  // Font size
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize || 'medium'];

  // Logo size (maintains natural aspect ratio without distortion)
  const logoSizeClass = {
    small: 'h-10 max-h-10 max-w-28',
    medium: 'h-16 max-h-16 max-w-40',
    large: 'h-20 max-h-20 max-w-52',
  }[settings.logoSize || 'medium'];

  // Company Name size
  const nameSizeClass = {
    small: 'text-base font-bold',
    medium: 'text-xl font-black',
    large: 'text-2xl font-black',
  }[settings.businessNameSize || 'medium'];

  // Row spacing
  const rowPaddingClass = {
    compact: 'py-1 px-2.5',
    normal: 'py-2 px-3',
    relaxed: 'py-3.5 px-3.5',
  }[settings.rowSpacing || 'normal'];

  // Column visibility flags (shared across Thermal and A4)
  const showItem = settings.showProductDescription !== false;
  const showQty = settings.showItemQuantity !== false;
  const showRate = settings.showItemRate !== false;
  const showAmount = settings.showItemAmount !== false;
  const showIndex = settings.showItemIndex === true;

  // ---------------- 1. THERMAL 80MM & 58MM LAYOUT ----------------
  if (format === 'thermal' || format === 'thermal58') {
    const is58mm = format === 'thermal58';
    return (
      <div
        className={`${
          is58mm ? 'w-[215px] p-2 text-[10px]' : 'w-[300px] p-3.5 text-xs'
        } max-w-full bg-white text-black font-mono mx-auto space-y-2 leading-tight`}
        style={{ fontFamily: fontFamilyStyle, color: '#000000', backgroundColor: '#ffffff' }}
      >
        {/* Thermal Header */}
        <div className="text-center border-b border-dashed border-black pb-2 space-y-1">
          {settings.showLogo !== false && company.logo && (
            <img
              src={company.logo}
              alt={company.businessName || 'Business Logo'}
              crossOrigin="anonymous"
              loading="eager"
              decoding="sync"
              className={`${is58mm ? 'max-h-10 max-w-28' : 'max-h-14 max-w-36'} object-contain mx-auto mb-1`}
            />
          )}
          <h2 className={`${is58mm ? 'text-sm' : 'text-base'} font-black uppercase tracking-wider`}>
            {company.businessName}
          </h2>
          {company.tagline && <p className={is58mm ? 'text-[9px]' : 'text-[10px]'}>{company.tagline}</p>}
          {settings.showAddress && company.address && (
            <p className={is58mm ? 'text-[9px]' : 'text-[10px]'}>
              {company.address}
              {company.city ? `, ${company.city}` : ''}
            </p>
          )}
          <div className={`flex justify-center gap-1.5 ${is58mm ? 'text-[9px]' : 'text-[10px]'}`}>
            {company.phone && <span>Tel: {company.phone}</span>}
            {settings.showWhatsApp && company.whatsapp && <span>WA: {company.whatsapp}</span>}
          </div>
          {company.taxNtn && <p className={is58mm ? 'text-[9px]' : 'text-[10px]'}>{company.taxNtn}</p>}
        </div>

        {/* Invoice Meta */}
        <div className={`border-b border-dashed border-black pb-1.5 space-y-0.5 ${is58mm ? 'text-[9px]' : 'text-[11px]'}`}>
          <div className="flex justify-between">
            <span className="font-bold">INV #: {invoice.invoiceNo}</span>
            {settings.showDateTime && (
              <span>
                {formatDate(invoice.date)} {invoice.time}
              </span>
            )}
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className={`font-bold truncate ${is58mm ? 'max-w-[120px]' : 'max-w-[170px]'}`}>
              {invoice.partyName}
            </span>
          </div>
          {settings.showCustomerPhone && invoice.partyPhone && (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{invoice.partyPhone}</span>
            </div>
          )}
          {settings.showAddress && invoice.partyAddress && (
            <div className="flex justify-between">
              <span>Address:</span>
              <span className={`truncate ${is58mm ? 'max-w-[120px]' : 'max-w-[170px]'}`}>
                {invoice.partyAddress}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Method:</span>
            <span>{invoice.paymentMethod}</span>
          </div>
        </div>

        {/* Items Table (Strict dynamic column visibility - auto-expands visible columns) */}
        <div className="border-b border-dashed border-black pb-1.5 overflow-hidden">
          <table className={`w-full border-collapse ${is58mm ? 'text-[9px]' : 'text-[11px]'}`}>
            <thead>
              <tr className="border-b border-black font-bold">
                {showIndex && (
                  <th className="py-0.5 pr-1 text-center w-5">#</th>
                )}
                {showItem && (
                  <th className="py-0.5 px-0.5 text-left">Item</th>
                )}
                {showQty && (
                  <th className="py-0.5 px-1 text-center whitespace-nowrap">Qty</th>
                )}
                {showRate && (
                  <th className="py-0.5 px-1 text-right whitespace-nowrap">Rate</th>
                )}
                {showAmount && (
                  <th className="py-0.5 pl-1 text-right whitespace-nowrap">Amt</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-black">
              {visibleItems.map((item, idx) => (
                <tr key={item.id || idx} className={`${is58mm ? 'text-[9px]' : 'text-[10px]'}`}>
                  {showIndex && (
                    <td className="py-0.5 pr-1 text-center align-top">{idx + 1}</td>
                  )}
                  {showItem && (
                    <td className="py-0.5 px-0.5 text-left align-top font-medium break-words">
                      {item.description}
                    </td>
                  )}
                  {showQty && (
                    <td className="py-0.5 px-1 text-center align-top whitespace-nowrap">
                      {item.quantity}
                      {settings.showProductUnit !== false && item.unit ? ` ${item.unit}` : ''}
                    </td>
                  )}
                  {showRate && (
                    <td className="py-0.5 px-1 text-right align-top whitespace-nowrap">
                      {item.rate}
                    </td>
                  )}
                  {showAmount && (
                    <td className="py-0.5 pl-1 text-right align-top font-bold whitespace-nowrap">
                      {item.amount}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Thermal Totals & Financial Summary */}
        <div className={`space-y-1 ${is58mm ? 'text-[9px]' : 'text-[11px]'} pt-1`}>
          <div className="flex justify-between font-bold">
            <span>Total Pieces:</span>
            <span>{visibleItems.reduce((n, it) => n + (Number(it.quantity) || 0), 0)}</span>
          </div>

          <div className="flex justify-between">
            <span>Previous Balance:</span>
            <span className="font-bold">
              {formatCurrency(invoice.previousBalance, curr)}
              {invoice.previousBalance < 0 && <span className="text-[8px] font-normal ml-0.5">(Adv)</span>}
            </span>
          </div>

          <div className={`flex justify-between font-black ${is58mm ? 'text-xs' : 'text-base'} pt-0.5 border-t border-black`}>
            <span>Invoice Total:</span>
            <span>{formatCurrency(invoice.grandTotal, curr)}</span>
          </div>

          <div className="flex justify-between">
            <span>Discount:</span>
            <span>{invoice.discount > 0 ? `-${formatCurrency(invoice.discount, curr)}` : formatCurrency(0, curr)}</span>
          </div>

          <div className={`flex justify-between font-black ${is58mm ? 'text-xs' : 'text-base'}`}>
            <span>Payment Received:</span>
            <span>{formatCurrency(invoice.paidAmount, curr)}</span>
          </div>

          <div className={`flex justify-between font-black ${is58mm ? 'text-[11px]' : 'text-xs'} pt-1 border-t border-dashed border-black`}>
            <span>Total Outstanding:</span>
            <span>
              {formatCurrency(invoice.newBalance, curr)}
              {invoice.newBalance > 0 ? (
                <span className="text-[8px] font-normal block text-right">(Receivable)</span>
              ) : invoice.newBalance < 0 ? (
                <span className="text-[8px] font-normal block text-right">(Advance)</span>
              ) : null}
            </span>
          </div>

          <div className="flex justify-between pt-0.5">
            <span>Payment Status:</span>
            <span className="font-bold uppercase">{invoice.status}</span>
          </div>
        </div>

        {/* Footer */}
        {settings.showFooter && (
          <div className={`border-t border-dashed border-black pt-1.5 text-center ${is58mm ? 'text-[9px]' : 'text-[10px]'} space-y-0.5`}>
            {settings.showThankYou && (
              <p className="font-bold">{company.thankYouMsg || 'Thank you for your business!'}</p>
            )}
            <p className="italic">Software by Veloce Ledger</p>
          </div>
        )}
      </div>
    );
  }

  // ---------------- 2. A4 & WHATSAPP IMAGE LAYOUT ----------------
  const isCentered = settings.headerStyle === 'centered';
  const isModern = settings.headerStyle === 'modern';
  const isClassic = settings.headerStyle === 'classic';
  const isSimpleHeader = settings.headerStyle === 'simple';

  return (
    <div
      className={`bg-white text-slate-800 p-6 sm:p-8 rounded-2xl ${fontSizeClass} leading-relaxed mx-auto max-w-3xl border border-slate-200 shadow-sm`}
      style={{
        fontFamily: fontFamilyStyle,
        color: textColor,
        width: format === 'whatsapp' ? '680px' : '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ---------------- HEADER VARIATIONS ---------------- */}

      {/* A. CENTERED HEADER */}
      {isCentered && (
        <div className="text-center pb-5 border-b-2" style={{ borderColor: primaryColor }}>
          {settings.showLogo !== false && company.logo && (
            <img
              src={company.logo}
              alt={company.businessName || 'Business Logo'}
              crossOrigin="anonymous"
              loading="eager"
              decoding="sync"
              className={`${logoSizeClass} object-contain rounded-xl border border-slate-200 p-1 mx-auto mb-2 bg-white`}
            />
          )}
          <h1 className={`${nameSizeClass} tracking-tight leading-tight`} style={{ color: primaryColor }}>
            {company.businessName}
          </h1>
          {company.tagline && <p className="text-xs text-slate-500 mt-0.5">{company.tagline}</p>}
          {settings.showAddress && company.address && (
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              {company.address}{company.city ? `, ${company.city}` : ''}
            </p>
          )}
          <div className="flex justify-center gap-3 text-xs text-slate-600 mt-1">
            {company.phone && <span>Tel: {company.phone}</span>}
            {settings.showWhatsApp && company.whatsapp && <span>WA: {company.whatsapp}</span>}
            {company.taxNtn && <span>{company.taxNtn}</span>}
          </div>

          <div className="mt-3">
            <span
              className="inline-block px-4 py-1 rounded-xl text-white font-black text-sm tracking-wider uppercase shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              INVOICE
            </span>
          </div>
        </div>
      )}

      {/* B. MODERN HEADER */}
      {isModern && (
        <div
          className="p-5 rounded-2xl mb-4 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          style={{
            background: `linear-gradient(135deg, ${headerBgColor} 0%, ${primaryColor} 100%)`,
          }}
        >
          <div className="flex items-center gap-3.5">
            {settings.showLogo !== false && company.logo && (
              <img
                src={company.logo}
                alt={company.businessName || 'Business Logo'}
                crossOrigin="anonymous"
                loading="eager"
                decoding="sync"
                className={`${logoSizeClass} object-contain rounded-xl p-1 bg-white/10 border border-white/20`}
              />
            )}
            <div>
              <h1 className={`${nameSizeClass} tracking-tight text-white leading-tight`}>
                {company.businessName}
              </h1>
              {company.tagline && <p className="text-xs text-white/80 mt-0.5">{company.tagline}</p>}
              {settings.showAddress && company.address && (
                <p className="text-xs text-white/70 mt-0.5">
                  {company.address}{company.city ? `, ${company.city}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-lg text-xs font-bold uppercase tracking-wider mb-1">
              INVOICE
            </span>
            <div className="text-xs text-white/90">
              <p>No: <strong className="text-white font-mono">{invoice.invoiceNo}</strong></p>
              {settings.showDateTime && <p>Date: {formatDate(invoice.date)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* C. CLASSIC HEADER */}
      {isClassic && (
        <div className="pb-4 border-b-2 border-slate-800 flex justify-between items-start gap-4">
          <div className="flex items-start gap-3">
            {settings.showLogo !== false && company.logo && (
              <img
                src={company.logo}
                alt={company.businessName || 'Business Logo'}
                crossOrigin="anonymous"
                loading="eager"
                decoding="sync"
                className={`${logoSizeClass} object-contain rounded-xl border border-slate-300 p-1 shrink-0 bg-white`}
              />
            )}
            <div>
              <h1 className={`${nameSizeClass} font-serif tracking-tight text-slate-900`}>
                {company.businessName}
              </h1>
              {company.tagline && <p className="text-xs italic text-slate-600">{company.tagline}</p>}
              {settings.showAddress && company.address && (
                <p className="text-xs text-slate-600 mt-1">{company.address}, {company.city}</p>
              )}
              <div className="flex gap-3 text-xs text-slate-600 mt-1">
                {company.phone && <span>Tel: {company.phone}</span>}
                {company.taxNtn && <span>{company.taxNtn}</span>}
              </div>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-xl font-serif font-bold text-slate-900 uppercase tracking-widest">
              INVOICE
            </h2>
            <div className="text-xs space-y-0.5 text-slate-700 mt-1">
              <p>Invoice #: <strong className="font-mono">{invoice.invoiceNo}</strong></p>
              {settings.showDateTime && <p>Date: {formatDate(invoice.date)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* D. PREMIUM & SIMPLE (DEFAULT) */}
      {!isCentered && !isModern && !isClassic && (
        <div
          className="flex justify-between items-start pb-5 border-b-2 gap-4"
          style={{ borderColor: primaryColor }}
        >
          {/* Left Brand */}
          <div className="flex items-start gap-3">
            {settings.showLogo !== false && company.logo && (
              <img
                src={company.logo}
                alt={company.businessName || 'Business Logo'}
                crossOrigin="anonymous"
                loading="eager"
                decoding="sync"
                className={`${logoSizeClass} object-contain rounded-xl border border-slate-200 p-1 shrink-0 bg-white`}
              />
            )}
            <div>
              <h1
                className={`${nameSizeClass} tracking-tight leading-tight`}
                style={{ color: primaryColor }}
              >
                {company.businessName}
              </h1>
              {company.tagline && <p className="text-xs text-slate-500 mt-0.5">{company.tagline}</p>}
              {settings.showAddress && company.address && (
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  {company.address}{company.city ? `, ${company.city}` : ''}
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 text-xs text-slate-600 mt-1">
                {company.phone && <span>Tel: {company.phone}</span>}
                {settings.showWhatsApp && company.whatsapp && <span>WA: {company.whatsapp}</span>}
                {company.taxNtn && <span>{company.taxNtn}</span>}
              </div>
            </div>
          </div>

          {/* Right Title & Meta */}
          <div className="text-right shrink-0">
            <div
              className="inline-block px-3.5 py-1 rounded-xl text-white font-black text-sm tracking-wider uppercase shadow-xs mb-2"
              style={{ backgroundColor: primaryColor }}
            >
              INVOICE
            </div>
            <div className="text-xs space-y-0.5 text-slate-600">
              <p>
                Invoice No: <strong className="text-slate-900 font-mono text-sm">{invoice.invoiceNo}</strong>
              </p>
              {settings.showDateTime && (
                <p>Date: <strong className="text-slate-900">{formatDate(invoice.date)}</strong></p>
              )}
              {settings.showDateTime && invoice.time && (
                <p>Time: <strong className="text-slate-900">{invoice.time}</strong></p>
              )}
              <p>
                Status:{' '}
                <span
                  className={`font-bold px-1.5 py-0.5 rounded-sm text-[10px] uppercase ${
                    invoice.status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : invoice.status === 'Partial'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {invoice.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- CUSTOMER BILL TO BAR ---------------- */}
      <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs">
        <div>
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            Billed To:
          </span>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">{invoice.partyName}</h3>
          {settings.showAddress && invoice.partyAddress && (
            <p className="text-slate-600 text-xs mt-0.5">{invoice.partyAddress}</p>
          )}
        </div>
        <div className="text-right">
          {settings.showCustomerPhone && invoice.partyPhone && (
            <p className="text-slate-700">Phone: {invoice.partyPhone}</p>
          )}
          <p className="text-slate-600">
            Payment Method: <span className="font-semibold text-slate-900">{invoice.paymentMethod}</span>
          </p>
        </div>
      </div>

      {/* ---------------- ITEMS TABLE ---------------- */}
      <div
        className={`my-4 overflow-hidden rounded-xl ${
          settings.tableStyle === 'borders' ? 'border border-slate-300' : 'border border-slate-200'
        }`}
      >
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr
              style={{
                backgroundColor: headerBgColor,
                color: tableHeaderTextColor,
              }}
              className="font-bold uppercase tracking-wider text-[11px]"
            >
              {settings.showItemIndex !== false && (
                <th className={`w-10 text-center ${rowPaddingClass}`}>#</th>
              )}
              {settings.showProductDescription !== false && (
                <th className={rowPaddingClass}>Product / Description</th>
              )}
              {settings.showItemQuantity !== false && (
                <th className={`text-center w-24 ${rowPaddingClass}`}>Qty</th>
              )}
              {settings.showItemRate !== false && (
                <th className={`text-right w-24 ${rowPaddingClass}`}>Rate ({curr})</th>
              )}
              {settings.showItemAmount !== false && (
                <th className={`text-right w-28 ${rowPaddingClass}`}>Amount ({curr})</th>
              )}
            </tr>
          </thead>
          <tbody
            className={
              settings.tableStyle === 'borders'
                ? 'divide-y divide-slate-300 border-t border-slate-300'
                : 'divide-y divide-slate-200'
            }
          >
            {visibleItems.map((item, idx) => {
              const isBandedRow = settings.tableStyle === 'banded' && idx % 2 === 1;
              return (
                <tr
                  key={item.id || idx}
                  className={
                    isBandedRow
                      ? 'bg-slate-50'
                      : 'bg-white'
                  }
                >
                  {settings.showItemIndex !== false && (
                    <td
                      className={`text-center text-slate-400 font-medium ${rowPaddingClass} ${
                        settings.tableStyle === 'borders' ? 'border-r border-slate-300' : ''
                      }`}
                    >
                      {idx + 1}
                    </td>
                  )}
                  {settings.showProductDescription !== false && (
                    <td
                      className={`font-semibold text-slate-900 ${rowPaddingClass} ${
                        settings.tableStyle === 'borders' ? 'border-r border-slate-300' : ''
                      }`}
                    >
                      {item.description}
                    </td>
                  )}
                  {settings.showItemQuantity !== false && (
                    <td
                      className={`text-center text-slate-700 whitespace-nowrap ${rowPaddingClass} ${
                        settings.tableStyle === 'borders' ? 'border-r border-slate-300' : ''
                      }`}
                    >
                      {item.quantity} {settings.showProductUnit !== false ? item.unit : ''}
                    </td>
                  )}
                  {settings.showItemRate !== false && (
                    <td
                      className={`text-right text-slate-700 font-medium whitespace-nowrap ${rowPaddingClass} ${
                        settings.tableStyle === 'borders' ? 'border-r border-slate-300' : ''
                      }`}
                    >
                      {formatCurrency(item.rate, curr, 'no_symbol')}
                    </td>
                  )}
                  {settings.showItemAmount !== false && (
                    <td className={`text-right font-bold text-slate-900 whitespace-nowrap ${rowPaddingClass}`}>
                      {formatCurrency(item.amount, curr, 'no_symbol')}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------------- TOTALS & BALANCE SUMMARY ---------------- */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
        {/* Left Terms & Notes */}
        <div className="w-full sm:w-1/2 space-y-2 text-xs">
          {invoice.notes && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block text-[10px] uppercase">Notes:</span>
              <p className="text-slate-600 mt-0.5">{invoice.notes}</p>
            </div>
          )}

          {settings.showTerms && company.termsConditions && (
            <div>
              <span className="font-bold text-slate-500 block text-[10px] uppercase">
                Terms & Conditions:
              </span>
              <p className="text-[11px] text-slate-500 whitespace-pre-line leading-relaxed mt-0.5">
                {company.termsConditions}
              </p>
            </div>
          )}
        </div>

        {/* Right Totals & Financial Balance Summary */}
        <div className="w-full sm:w-5/12 bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2 text-xs shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider pb-1 border-b border-slate-200">
            Financial Summary
          </div>

          <div className="flex justify-between text-slate-700 font-semibold">
            <span>Previous Balance:</span>
            <span className="font-bold text-slate-900">
              {formatCurrency(invoice.previousBalance, curr)}
              {invoice.previousBalance < 0 && (
                <span className="text-[10px] text-emerald-600 font-normal ml-1">(Advance)</span>
              )}
            </span>
          </div>

          <div
            className="flex justify-between font-black text-sm pt-1 border-t border-slate-200"
            style={{ color: primaryColor }}
          >
            <span>Invoice Total:</span>
            <span>{formatCurrency(invoice.grandTotal, curr)}</span>
          </div>

          <div className="flex justify-between text-slate-600 text-[11px]">
            <span>Discount:</span>
            <span className={invoice.discount > 0 ? 'font-semibold text-rose-600' : 'text-slate-500'}>
              {invoice.discount > 0 ? `-${formatCurrency(invoice.discount, curr)}` : formatCurrency(0, curr)}
            </span>
          </div>

          <div className="flex justify-between font-bold text-emerald-700 pt-0.5">
            <span>Payment Received:</span>
            <span>{formatCurrency(invoice.paidAmount, curr)}</span>
          </div>

          <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-slate-300 text-slate-900">
            <div>
              <span>Total Outstanding:</span>
              <span className="block text-[10px] font-normal text-slate-500">
                (Previous Balance + Invoice - Payment)
              </span>
            </div>
            <span className="text-base" style={{ color: primaryColor }}>
              {formatCurrency(invoice.newBalance, curr)}
            </span>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Payment Status:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.status === 'Partial'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>
      </div>

      {/* ---------------- FOOTER & SIGNATURE ---------------- */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
        <div>
          {settings.showFooter && settings.showThankYou && (
            <p className="font-semibold text-slate-700">
              {company.thankYouMsg || 'Thank you for your business!'}
            </p>
          )}
          <p className="text-[10px] text-slate-400 mt-0.5">
            Generated with Veloce Ledger · Offline Business System
          </p>
        </div>

        {settings.showSignature && (
          <div className="text-center w-36">
            <div className="border-b border-slate-400 pb-1 mb-1"></div>
            <span className="text-[11px] font-bold text-slate-700">Authorized Signature</span>
          </div>
        )}
      </div>
    </div>
  );
};
