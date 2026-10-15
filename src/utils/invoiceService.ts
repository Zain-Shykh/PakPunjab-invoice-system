import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Invoice, InvoiceSettings, Party } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from './formatters';
import { getProducts, getVisibleInvoiceItems } from '../db/storage';
import {
  copyImageToClipboard,
  copyTextToClipboard,
  createInvoiceCanvasDirect,
  downloadBlob,
  openWhatsAppChat,
} from './shareUtils';

/**
 * Renders dedicated professional A4, 80mm Thermal, or 58mm Thermal Print layout into #printArea
 * and triggers window.print().
 */
export function renderInvoicePrint(
  invoice: Invoice,
  company: CompanySettings,
  settings: InvoiceSettings,
  format: 'a4' | 'thermal' | 'thermal58' = 'a4'
): void {
  let printArea = document.getElementById('printArea');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'printArea';
    document.body.appendChild(printArea);
  }

  const curr = company.currency || 'Rs.';
  const visibleItems = getVisibleInvoiceItems(invoice.items, getProducts());
  const isThermal58 = format === 'thermal58';

  // Shared column visibility settings
  const showItem = settings.showProductDescription !== false;
  const showQty = settings.showItemQuantity !== false;
  const showRate = settings.showItemRate !== false;
  const showAmount = settings.showItemAmount !== false;
  const showIndex = settings.showItemIndex === true;

  if (format === 'thermal' || format === 'thermal58') {
    // ---------------- 80MM / 58MM THERMAL RECEIPT LAYOUT ----------------
    const itemsHeadersHtml = `
      <tr style="border-bottom: 1px solid #000000; font-weight: bold;">
        ${showIndex ? `<th style="padding: 2px 2px; text-align: center; width: 18px;">#</th>` : ''}
        ${showItem ? `<th style="padding: 2px 2px; text-align: left;">Item</th>` : ''}
        ${showQty ? `<th style="padding: 2px 2px; text-align: center; white-space: nowrap;">Qty</th>` : ''}
        ${showRate ? `<th style="padding: 2px 2px; text-align: right; white-space: nowrap;">Rate</th>` : ''}
        ${showAmount ? `<th style="padding: 2px 2px; text-align: right; white-space: nowrap;">Amt</th>` : ''}
      </tr>
    `;

    const itemsHtml = visibleItems
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px dotted #e2e8f0; font-size: ${isThermal58 ? '9px' : '10px'};">
          ${showIndex ? `<td style="padding: 2px 2px; text-align: center; vertical-align: top;">${idx + 1}</td>` : ''}
          ${showItem ? `<td style="padding: 2px 2px; text-align: left; vertical-align: top; word-break: break-word;">${it.description}</td>` : ''}
          ${showQty ? `<td style="padding: 2px 2px; text-align: center; vertical-align: top; white-space: nowrap;">${it.quantity}${settings.showProductUnit !== false && it.unit ? ` ${it.unit}` : ''}</td>` : ''}
          ${showRate ? `<td style="padding: 2px 2px; text-align: right; vertical-align: top; white-space: nowrap;">${it.rate}</td>` : ''}
          ${showAmount ? `<td style="padding: 2px 2px; text-align: right; vertical-align: top; font-weight: bold; white-space: nowrap;">${it.amount}</td>` : ''}
        </tr>
      `
      )
      .join('');

    printArea.innerHTML = `
      <div class="print-thermal-container" style="width: ${isThermal58 ? '48mm' : '72mm'}; max-width: 100%; margin: 0 auto; font-family: monospace; font-size: ${isThermal58 ? '10px' : '11px'}; color: #000000; background: #ffffff; padding: 4px; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 1px dashed #000000; padding-bottom: 6px; margin-bottom: 6px;">
          ${
            company.logo && settings.showLogo !== false
              ? `<img src="${company.logo}" alt="Logo" style="max-height: ${isThermal58 ? '36px' : '45px'}; max-width: 100px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />`
              : ''
          }
          <div style="font-size: ${isThermal58 ? '13px' : '15px'}; font-weight: 900; text-transform: uppercase;">${company.businessName}</div>
          ${company.tagline ? `<div style="font-size: ${isThermal58 ? '9px' : '10px'};">${company.tagline}</div>` : ''}
          ${company.address && settings.showAddress ? `<div style="font-size: ${isThermal58 ? '9px' : '10px'};">${company.address}${company.city ? `, ${company.city}` : ''}</div>` : ''}
          ${company.phone ? `<div style="font-size: ${isThermal58 ? '9px' : '10px'};">Tel: ${company.phone}</div>` : ''}
          ${company.taxNtn ? `<div style="font-size: ${isThermal58 ? '9px' : '10px'};">NTN: ${company.taxNtn}</div>` : ''}
        </div>

        <div style="border-bottom: 1px dashed #000000; padding-bottom: 6px; margin-bottom: 6px; font-size: ${isThermal58 ? '9px' : '10px'};">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold;">INV #: ${invoice.invoiceNo}</span>
            <span>${formatDate(invoice.date)} ${invoice.time || ''}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>Customer:</span>
            <span style="font-weight: bold; max-width: ${isThermal58 ? '120px' : '170px'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${invoice.partyName}</span>
          </div>
          ${invoice.partyPhone ? `<div style="display: flex; justify-content: space-between;"><span>Phone:</span><span>${invoice.partyPhone}</span></div>` : ''}
        </div>

        <div style="border-bottom: 1px dashed #000000; padding-bottom: 6px; margin-bottom: 6px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: ${isThermal58 ? '9px' : '10px'};">
            <thead>
              ${itemsHeadersHtml}
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="border-bottom: 1px dashed #000000; padding-bottom: 6px; margin-bottom: 6px; font-size: ${isThermal58 ? '10px' : '11px'};">
          <div style="display: flex; justify-content: space-between;">
            <span>Previous Balance:</span>
            <span style="font-weight: bold;">${formatCurrency(invoice.previousBalance, curr)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: ${isThermal58 ? '11px' : '12px'}; margin: 3px 0; border-top: 1px solid #000000; padding-top: 3px;">
            <span>Invoice Total:</span>
            <span>${formatCurrency(invoice.grandTotal, curr)}</span>
          </div>

          ${
            invoice.discount
              ? `<div style="display: flex; justify-content: space-between; font-size: 10px;"><span>Discount:</span><span>-${formatCurrency(invoice.discount, curr)}</span></div>`
              : ''
          }

          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
            <span>Payment Received:</span>
            <span>${formatCurrency(invoice.paidAmount, curr)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: ${isThermal58 ? '11px' : '12px'}; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #000000;">
            <span>Total Outstanding:</span>
            <span style="color: ${invoice.newBalance > 0 ? '#dc2626' : '#0f172a'};">${formatCurrency(invoice.newBalance, curr)}</span>
          </div>
        </div>

        <div style="text-align: center; font-size: ${isThermal58 ? '8px' : '9px'}; padding-top: 4px;">
          <div>${company.thankYouMsg || 'Thank you for your business!'}</div>
          <div style="margin-top: 2px; color: #64748b;">Software by Veloce Ledger</div>
        </div>
      </div>
    `;

    document.body.classList.add('printing-active');
    document.body.classList.add('printing-thermal');
  } else {
    // ---------------- FULL PROFESSIONAL A4 INVOICE ----------------
    const showA4Index = settings.showItemIndex !== false;
    const showA4Item = settings.showProductDescription !== false;
    const showA4Qty = settings.showItemQuantity !== false;
    const showA4Rate = settings.showItemRate !== false;
    const showA4Discount = settings.showItemDiscount !== false;
    const showA4Amount = settings.showItemAmount !== false;

    const itemsRowsHtml = visibleItems
      .map(
        (it, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid;">
          ${showA4Index ? `<td style="padding: 7px 10px; font-weight: bold; color: #64748b; width: 35px;">${idx + 1}</td>` : ''}
          ${showA4Item ? `<td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">${it.description}</td>` : ''}
          ${showA4Qty ? `<td style="padding: 7px 10px; text-align: center; font-weight: 600; width: 75px;">${it.quantity} <span style="font-size: 9px; color: #64748b;">${settings.showProductUnit !== false && it.unit ? it.unit : ''}</span></td>` : ''}
          ${showA4Rate ? `<td style="padding: 7px 10px; text-align: right; width: 85px;">${formatCurrency(it.rate, curr, 'no_symbol')}</td>` : ''}
          ${showA4Discount ? `<td style="padding: 7px 10px; text-align: right; width: 75px; color: #64748b;">${it.discount ? `-${formatCurrency(it.discount, curr, 'no_symbol')}` : '-'}</td>` : ''}
          ${showA4Amount ? `<td style="padding: 7px 10px; text-align: right; font-weight: bold; color: #0f172a; width: 95px;">${formatCurrency(it.amount, curr, 'no_symbol')}</td>` : ''}
        </tr>
      `
      )
      .join('');

    printArea.innerHTML = `
      <div class="print-invoice-wrapper" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; padding: 0; margin: 0; box-sizing: border-box; width: 100%;">
        
        <!-- Header -->
        <div style="border-bottom: 2px solid #581c87; padding-bottom: 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            ${
              company.logo && settings.showLogo !== false
                ? `<img src="${company.logo}" alt="Logo" style="width: 70px; height: 70px; max-width: 95px; max-height: 70px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px;" />`
                : `<div style="width: 58px; height: 58px; background: #581c87; color: #ffffff; font-weight: 900; font-size: 24px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">${company.businessName ? company.businessName.substring(0, 2).toUpperCase() : 'VL'}</div>`
            }
            <div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${company.businessName}</h1>
              ${company.tagline ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${company.tagline}</div>` : ''}
              ${company.address ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">${company.address}${company.city ? `, ${company.city}` : ''}</div>` : ''}
              <div style="font-size: 11px; color: #475569; margin-top: 3px; display: flex; gap: 12px;">
                ${company.phone ? `<span>Phone: <strong>${company.phone}</strong></span>` : ''}
                ${company.whatsapp ? `<span>WhatsApp: <strong>${company.whatsapp}</strong></span>` : ''}
                ${company.taxNtn ? `<span>NTN: <strong>${company.taxNtn}</strong></span>` : ''}
              </div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="display: inline-block; background: #581c87; color: #ffffff; padding: 5px 14px; border-radius: 6px; font-size: 14px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
              TAX INVOICE
            </div>
            <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #581c87; margin-top: 4px;">#${invoice.invoiceNo}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">Date: <strong>${formatDate(invoice.date)}</strong> ${invoice.time || ''}</div>
          </div>
        </div>

        <!-- Customer & Bill Meta Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px;">
          <div>
            <div style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 0.5px;">BILLED TO:</div>
            <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 2px;">${invoice.partyName}</div>
            ${invoice.partyPhone ? `<div style="color: #475569; margin-top: 2px;">Phone: <strong>${invoice.partyPhone}</strong></div>` : ''}
            ${invoice.partyAddress ? `<div style="color: #475569; margin-top: 1px;">Address: ${invoice.partyAddress}</div>` : ''}
          </div>

          <div style="text-align: right;">
            <div style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 0.5px;">PAYMENT TERMS</div>
            <div style="font-size: 12px; font-weight: bold; color: #581c87; margin-top: 2px;">${invoice.paymentMethod || 'Cash'}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              Status: <strong style="text-transform: uppercase; color: ${invoice.status === 'Paid' ? '#16a34a' : '#dc2626'};">${invoice.status}</strong>
            </div>
          </div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; margin-bottom: 14px;">
          <thead>
            <tr style="background-color: #581c87; color: #ffffff; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">
              ${showA4Index ? `<th style="padding: 8px 10px; width: 35px; border-top-left-radius: 4px;">#</th>` : ''}
              ${showA4Item ? `<th style="padding: 8px 10px;">Product Description</th>` : ''}
              ${showA4Qty ? `<th style="padding: 8px 10px; text-align: center; width: 75px;">Qty</th>` : ''}
              ${showA4Rate ? `<th style="padding: 8px 10px; text-align: right; width: 85px;">Rate (${curr})</th>` : ''}
              ${showA4Discount ? `<th style="padding: 8px 10px; text-align: right; width: 75px;">Discount</th>` : ''}
              ${showA4Amount ? `<th style="padding: 8px 10px; text-align: right; width: 95px; border-top-right-radius: 4px;">Amount (${curr})</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <!-- Totals & Balance Breakdown -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid;">
          <div style="width: 280px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Subtotal:</span>
              <span style="font-weight: 600;">${formatCurrency(invoice.subtotal, curr)}</span>
            </div>
            ${
              invoice.discount
                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #16a34a;"><span>Overall Discount:</span><span>-${formatCurrency(invoice.discount, curr)}</span></div>`
                : ''
            }
            <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1.5px solid #cbd5e1; font-weight: 900; font-size: 14px; color: #0f172a;">
              <span>Grand Total:</span>
              <span>${formatCurrency(invoice.grandTotal, curr)}</span>
            </div>
            ${
              settings.showPrevBalance && invoice.previousBalance !== undefined
                ? `<div style="display: flex; justify-content: space-between; margin-top: 6px; color: #475569;"><span>Previous Balance:</span><span>${formatCurrency(invoice.previousBalance, curr)}</span></div>`
                : ''
            }
            ${
              settings.showPaidAmount && invoice.paidAmount > 0
                ? `<div style="display: flex; justify-content: space-between; margin-top: 4px; font-weight: bold; color: #16a34a;"><span>Paid Amount:</span><span>${formatCurrency(invoice.paidAmount, curr)}</span></div>`
                : ''
            }
            ${
              settings.showRemainingAmount
                ? `<div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-weight: 900; font-size: 13px; color: ${invoice.remainingAmount > 0 ? '#dc2626' : '#16a34a'};"><span>Balance Due:</span><span>${formatCurrency(invoice.remainingAmount, curr)}</span></div>`
                : ''
            }
          </div>
        </div>

        <!-- Footer & Terms -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #64748b; page-break-inside: avoid; break-inside: avoid;">
          ${company.thankYouMsg ? `<p style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${company.thankYouMsg}</p>` : ''}
          ${company.termsConditions && settings.showTerms ? `<p style="white-space: pre-line; line-height: 1.4;">${company.termsConditions}</p>` : ''}
          <div style="margin-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between;">
            <span>Computer generated invoice document.</span>
            <span>Software by Veloce Ledger</span>
          </div>
        </div>

      </div>
    `;

    document.body.classList.add('printing-active');
  }

  // Trigger print
  setTimeout(async () => {
    if (format !== 'a4') {
      // @page can't be scoped by a class, so inject it for this print only (removed in cleanup).
      // Chrome rejects "80mm auto", so measure the receipt and use an explicit height (fixed width, no margins).
      // Measure only after images load, or the logo is missed and the footer spills onto a 2nd page.
      await Promise.all(
        Array.from(printArea.querySelectorAll('img')).map((img) => img.decode().catch(() => undefined))
      );
      const receipt = printArea.firstElementChild as HTMLElement;
      const prevCss = printArea.style.cssText;
      printArea.style.cssText = 'display:block;position:absolute;visibility:hidden;left:0;top:0;';
      const heightMm = Math.ceil((receipt.getBoundingClientRect().height * 25.4) / 96) + 8; // +4mm padding, +4mm feed
      printArea.style.cssText = prevCss;
      const pageStyle = document.createElement('style');
      pageStyle.id = 'thermal-page-style';
      pageStyle.textContent = `@page { size: ${isThermal58 ? '58mm' : '80mm'} ${heightMm}mm; margin: 0; }`;
      document.head.appendChild(pageStyle);
    }
    window.print();

    const cleanup = () => {
      document.body.classList.remove('printing-active');
      document.body.classList.remove('printing-thermal');
      document.getElementById('thermal-page-style')?.remove();
      if (printArea) {
        printArea.innerHTML = '';
      }
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2500);
  }, 100);
}

/**
 * Robust Client-Side Vector Invoice PDF Generator using jsPDF + jspdf-autotable.
 * Supports multi-page tables, logo, customer details, terms, and balance breakdown.
 */
export async function generateInvoicePdf(
  invoice: Invoice,
  company: CompanySettings,
  settings: InvoiceSettings
): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const curr = company.currency || 'Rs.';

  let startY = 14;

  // 1. Draw Company Logo
  if (company.logo && settings.showLogo !== false) {
    try {
      const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = company.logo;
      });

      if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
        const aspect = logoImg.width / logoImg.height;
        const logoH = 14;
        const logoW = Math.min(26, logoH * aspect);
        doc.addImage(logoImg, 'PNG', 14, startY, logoW, logoH, undefined, 'FAST');
      }
    } catch (_) {}
  }

  // 2. Company Info Text
  const textLeft = company.logo && settings.showLogo !== false ? 42 : 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(company.businessName || 'INVOICE', textLeft, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  let infoY = startY + 9;
  if (company.tagline) {
    doc.text(company.tagline, textLeft, infoY);
    infoY += 3.5;
  }
  const contactText = [
    company.phone ? `Phone: ${company.phone}` : '',
    company.whatsapp ? `WA: ${company.whatsapp}` : '',
    company.address || company.city || '',
  ]
    .filter(Boolean)
    .join('  |  ');
  if (contactText) {
    doc.text(contactText, textLeft, infoY);
  }

  // Invoice Title Badge on Right
  doc.setFillColor(88, 28, 135);
  doc.roundedRect(pageWidth - 58, startY, 44, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pageWidth - 36, startY + 5.5, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(88, 28, 135);
  doc.text(`#${invoice.invoiceNo}`, pageWidth - 14, startY + 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(invoice.date)} ${invoice.time || ''}`, pageWidth - 14, startY + 17, { align: 'right' });

  // Divider
  startY = 35;
  doc.setDrawColor(88, 28, 135);
  doc.setLineWidth(0.6);
  doc.line(14, startY, pageWidth - 14, startY);

  // Customer Info Box
  startY += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO:', 18, startY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.partyName, 18, startY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const custMeta = [invoice.partyPhone ? `Phone: ${invoice.partyPhone}` : '', invoice.partyAddress || '']
    .filter(Boolean)
    .join('  ·  ');
  if (custMeta) {
    doc.text(custMeta, 18, startY + 15);
  }

  // Right Meta in Customer Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Method: ${invoice.paymentMethod || 'Cash'}`, pageWidth - 18, startY + 8, { align: 'right' });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - 18, startY + 13, { align: 'right' });

  // Dynamic column visibility for PDF
  const showPdfIndex = settings.showItemIndex !== false;
  const showPdfItem = settings.showProductDescription !== false;
  const showPdfQty = settings.showItemQuantity !== false;
  const showPdfRate = settings.showItemRate !== false;
  const showPdfDiscount = settings.showItemDiscount !== false;
  const showPdfAmount = settings.showItemAmount !== false;

  const pdfHeadCols: string[] = [];
  if (showPdfIndex) pdfHeadCols.push('#');
  if (showPdfItem) pdfHeadCols.push('Product Description');
  if (showPdfQty) pdfHeadCols.push('Qty');
  if (showPdfRate) pdfHeadCols.push(`Rate (${curr})`);
  if (showPdfDiscount) pdfHeadCols.push('Discount');
  if (showPdfAmount) pdfHeadCols.push(`Amount (${curr})`);

  // Table rows (Filtered: hidden products omitted from customer PDF)
  const visiblePdfItems = getVisibleInvoiceItems(invoice.items, getProducts());
  const tableRows = visiblePdfItems.map((it, idx) => {
    const row: string[] = [];
    if (showPdfIndex) row.push(String(idx + 1));
    if (showPdfItem) row.push(it.description);
    if (showPdfQty) row.push(`${it.quantity} ${settings.showProductUnit !== false && it.unit ? it.unit : ''}`.trim());
    if (showPdfRate) row.push(formatCurrency(it.rate, curr, 'no_symbol'));
    if (showPdfDiscount) row.push(it.discount ? `-${formatCurrency(it.discount, curr, 'no_symbol')}` : '-');
    if (showPdfAmount) row.push(formatCurrency(it.amount, curr, 'no_symbol'));
    return row;
  });

  const columnStyles: Record<number, any> = {};
  let colIdx = 0;
  if (showPdfIndex) {
    columnStyles[colIdx++] = { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] };
  }
  if (showPdfItem) {
    columnStyles[colIdx++] = { cellWidth: 'auto', fontStyle: 'bold' };
  }
  if (showPdfQty) {
    columnStyles[colIdx++] = { cellWidth: 22, halign: 'center' };
  }
  if (showPdfRate) {
    columnStyles[colIdx++] = { cellWidth: 26, halign: 'right' };
  }
  if (showPdfDiscount) {
    columnStyles[colIdx++] = { cellWidth: 24, halign: 'right', textColor: [100, 116, 139] };
  }
  if (showPdfAmount) {
    columnStyles[colIdx++] = { cellWidth: 28, halign: 'right', fontStyle: 'bold' };
  }

  autoTable(doc, {
    startY: startY + 24,
    head: [pdfHeadCols],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [88, 28, 135],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles,
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 60;
  let totalsBoxY = finalY + 5;

  if (totalsBoxY > pageHeight - 50) {
    doc.addPage();
    totalsBoxY = 16;
  }

  // Totals Box on Right
  const totalsBoxW = 65;
  const totalsBoxX = pageWidth - 14 - totalsBoxW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxW, 36, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', totalsBoxX + 4, totalsBoxY + 6);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(invoice.subtotal, curr), pageWidth - 18, totalsBoxY + 6, { align: 'right' });

  if (invoice.discount) {
    doc.setTextColor(22, 163, 74);
    doc.text('Discount:', totalsBoxX + 4, totalsBoxY + 11);
    doc.text(`-${formatCurrency(invoice.discount, curr)}`, pageWidth - 18, totalsBoxY + 11, { align: 'right' });
  }

  // Grand Total Line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(88, 28, 135);
  doc.text('Grand Total:', totalsBoxX + 4, totalsBoxY + 17);
  doc.text(formatCurrency(invoice.grandTotal, curr), pageWidth - 18, totalsBoxY + 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Paid Amount:', totalsBoxX + 4, totalsBoxY + 24);
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(invoice.paidAmount, curr), pageWidth - 18, totalsBoxY + 24, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.text('Balance Due:', totalsBoxX + 4, totalsBoxY + 31);
  doc.text(formatCurrency(invoice.remainingAmount, curr), pageWidth - 18, totalsBoxY + 31, { align: 'right' });

  // Left Note & Thank You
  if (company.thankYouMsg) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(company.thankYouMsg, 14, totalsBoxY + 8);
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Invoice #${invoice.invoiceNo} · Page ${i} of ${totalPages} · ${company.businessName}`, pageWidth / 2, pageHeight - 8, {
      align: 'center',
    });
  }

  return doc.output('blob');
}

/**
 * Universal WhatsApp sharing orchestrator for Sales Invoice.
 */
export async function shareInvoice(
  invoice: Invoice,
  company: CompanySettings,
  settings: InvoiceSettings,
  party?: Party,
  format: 'pdf' | 'image' | 'text' = 'pdf'
): Promise<{ success: boolean; method: string; error?: string }> {
  const targetPhone = invoice.partyPhone || party?.whatsapp || party?.phone || '';
  const curr = company.currency || 'Rs.';
  const visibleShareItems = getVisibleInvoiceItems(invoice.items, getProducts());

  const summaryText =
    `*Invoice #${invoice.invoiceNo} - ${company.businessName}*\n\n` +
    `Dear *${invoice.partyName}*,\n` +
    `Thank you for your business. Here are your invoice details:\n\n` +
    `• *Date:* ${formatDate(invoice.date)}\n` +
    `• *Items:* ${visibleShareItems.length} products\n` +
    `• *Previous Balance:* ${formatCurrency(invoice.previousBalance, curr)}\n` +
    `• *Grand Total:* ${formatCurrency(invoice.grandTotal, curr)}\n` +
    `• *Paid Amount:* ${formatCurrency(invoice.paidAmount, curr)}\n` +
    `• *Total Outstanding:* ${formatCurrency(invoice.newBalance, curr)}\n\n` +
    `_Official invoice from ${company.businessName}._`;

  if (format === 'text') {
    openWhatsAppChat(targetPhone, summaryText);
    return { success: true, method: 'whatsapp_web' };
  }

  if (format === 'image') {
    const imgBlob = await createInvoiceCanvasDirect(invoice, company, curr);
    const imgFilename = `Invoice-${invoice.invoiceNo}.png`;

    if (imgBlob && typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([imgBlob], imgFilename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice #${invoice.invoiceNo} - ${company.businessName}`,
            text: summaryText,
            files: [file],
          });
          return { success: true, method: 'web_share' };
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return { success: true, method: 'web_share_cancelled' };
      }
    }

    if (imgBlob) {
      await copyImageToClipboard(imgBlob);
      downloadBlob(imgBlob, imgFilename);
    }
    openWhatsAppChat(targetPhone, summaryText);
    return { success: true, method: 'download_and_whatsapp' };
  }

  const filename = `Invoice-${invoice.invoiceNo}.pdf`;
  const pdfBlob = await generateInvoicePdf(invoice, company, settings);

  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice #${invoice.invoiceNo} - ${company.businessName}`,
          text: summaryText,
          files: [file],
        });
        return { success: true, method: 'web_share' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return { success: true, method: 'web_share_cancelled' };
    }
  }

  downloadBlob(pdfBlob, filename);
  await copyTextToClipboard(summaryText);
  openWhatsAppChat(targetPhone, summaryText);
  return { success: true, method: 'download_and_whatsapp' };
}
