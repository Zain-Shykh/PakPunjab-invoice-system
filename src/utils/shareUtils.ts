import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CompanySettings, Invoice, Party } from '../types';
import { formatCurrency, formatDate } from './formatters';
import { getInvoiceSettings, getProducts, getVisibleInvoiceItems } from '../db/storage';

/**
 * Convert dataURL string to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(';base64,');
    if (parts.length < 2) return null;
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.warn('dataUrlToBlob error:', e);
    return null;
  }
}

/**
 * Pure HTML5 Canvas 2D Direct Invoice Generator
 * 100% reliable, renders directly onto a high-res 2x Canvas with Logo & Donation support
 */
export async function createInvoiceCanvasDirect(
  invoice: Invoice,
  company: CompanySettings,
  currencySymbol: string = 'Rs.'
): Promise<Blob | null> {
  try {
    const canvas = document.createElement('canvas');
    const width = 800;
    // Calculate required height based on visible line items count (hidden products omitted from customer image)
    const visibleItems = getVisibleInvoiceItems(invoice.items, getProducts());
    const baseHeight = 650;
    const itemsHeight = Math.max(1, visibleItems.length) * 38;
    const height = baseHeight + itemsHeight;
    canvas.width = width * 2; // 2x Retina resolution
    canvas.height = height * 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(2, 2);

    // Preload logo if available
    let logoImage: HTMLImageElement | null = null;
    if (company.logo) {
      try {
        logoImage = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = company.logo;
        });
      } catch (err) {
        console.warn('Failed loading logo for canvas generator:', err);
      }
    }

    // 1. White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Header Banner
    ctx.fillStyle = '#581c87'; // Purple-900
    ctx.fillRect(0, 0, width, 125);

    // Draw logo if loaded
    let textStartX = 32;
    if (logoImage && logoImage.width > 0 && logoImage.height > 0) {
      const maxLogoW = 90;
      const maxLogoH = 90;
      const aspect = logoImage.width / logoImage.height;
      let drawW = maxLogoW;
      let drawH = maxLogoW / aspect;
      if (drawH > maxLogoH) {
        drawH = maxLogoH;
        drawW = maxLogoH * aspect;
      }

      const logoX = 32;
      const logoY = 17;

      // Clean white rounded backing for logo
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(logoX - 4, logoY - 4, maxLogoW + 8, maxLogoH + 8, 12);
      ctx.fill();

      // Center image in backing box
      const offsetX = logoX + (maxLogoW - drawW) / 2;
      const offsetY = logoY + (maxLogoH - drawH) / 2;
      ctx.drawImage(logoImage, offsetX, offsetY, drawW, drawH);

      textStartX = logoX + maxLogoW + 18;
    }

    // Business Name & Tagline
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(company.businessName || 'BUSINESS INVOICE', textStartX, 44);

    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#e9d5ff';
    if (company.tagline) {
      ctx.fillText(company.tagline, textStartX, 68);
    }
    const contactLine = [
      company.phone ? `Phone: ${company.phone}` : '',
      company.city || company.address || '',
    ]
      .filter(Boolean)
      .join('  •  ');
    if (contactLine) {
      ctx.fillText(contactLine, textStartX, 90);
    }

    // Invoice Header Badge on Right
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('INVOICE', width - 32, 48);

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#f3e8ff';
    ctx.fillText(`#${invoice.invoiceNo}`, width - 32, 74);

    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Date: ${formatDate(invoice.date)}`, width - 32, 95);
    ctx.textAlign = 'left';

    // 3. Customer Info Box
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(32, 140, width - 64, 60, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('BILLED TO:', 48, 160);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(invoice.partyName || 'Walk-in Customer', 48, 182);

    if (invoice.partyPhone) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#475569';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Phone: ${invoice.partyPhone}`, width - 48, 176);
      ctx.textAlign = 'left';
    }

    // 4. Line Items Table Header (Dynamic Columns)
    const settings = getInvoiceSettings();
    const showIndex = settings.showItemIndex !== false;
    const showItem = settings.showProductDescription !== false;
    const showQty = settings.showItemQuantity !== false;
    const showRate = settings.showItemRate !== false;
    const showAmount = settings.showItemAmount !== false;

    const tableTop = 220;
    ctx.fillStyle = '#6b21a8';
    ctx.beginPath();
    ctx.roundRect(32, tableTop, width - 64, 34, [8, 8, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    if (showIndex) ctx.fillText('#', 48, tableTop + 22);
    if (showItem) ctx.fillText('ITEM / DESCRIPTION', showIndex ? 85 : 48, tableTop + 22);
    ctx.textAlign = 'center';
    if (showQty) ctx.fillText('QTY', 440, tableTop + 22);
    ctx.textAlign = 'right';
    if (showRate) ctx.fillText(`RATE (${currencySymbol})`, 580, tableTop + 22);
    if (showAmount) ctx.fillText(`AMOUNT (${currencySymbol})`, width - 48, tableTop + 22);
    ctx.textAlign = 'left';

    // 5. Line Items Rows
    let currentY = tableTop + 34;
    visibleItems.forEach((item, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(32, currentY, width - 64, 34);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(32, currentY + 34);
      ctx.lineTo(width - 32, currentY + 34);
      ctx.stroke();

      if (showIndex) {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText(String(idx + 1), 48, currentY + 22);
      }

      if (showItem) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillText(item.description, showIndex ? 85 : 48, currentY + 22);
      }

      if (showQty) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#334155';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${item.quantity} ${item.unit || ''}`, 440, currentY + 22);
      }

      if (showRate) {
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(item.rate, currencySymbol, 'no_symbol'), 580, currentY + 22);
      }

      if (showAmount) {
        ctx.textAlign = 'right';
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(formatCurrency(item.amount, currencySymbol, 'no_symbol'), width - 48, currentY + 22);
      }
      ctx.textAlign = 'left';

      currentY += 34;
    });

    // 6. Financial Summary Card (Prominent Right Side)
    const summaryWidth = 360;
    const summaryX = width - 32 - summaryWidth;
    const summaryTop = currentY + 18;

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(summaryX, summaryTop, summaryWidth, 205, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.fillText('FINANCIAL SUMMARY', summaryX + 16, summaryTop + 20);

    let sY = summaryTop + 45;
    const renderRow = (label: string, val: string, isBold = false, color = '#0f172a', size = '12px') => {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(label, summaryX + 16, sY);

      ctx.textAlign = 'right';
      ctx.fillStyle = color;
      ctx.font = `${isBold ? 'bold ' : ''}${size} system-ui, -apple-system, sans-serif`;
      ctx.fillText(val, summaryX + summaryWidth - 16, sY);
      ctx.textAlign = 'left';
      sY += 28;
    };

    renderRow('Previous Balance:', formatCurrency(invoice.previousBalance, currencySymbol), true, '#334155');
    renderRow('Invoice Total:', formatCurrency(invoice.grandTotal, currencySymbol), true, '#6b21a8', '14px');
    if (invoice.discount > 0) {
      renderRow('Discount:', `-${formatCurrency(invoice.discount, currencySymbol)}`, false, '#e11d48');
    }
    renderRow('Paid Today:', formatCurrency(invoice.paidAmount, currencySymbol), true, '#059669');

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(summaryX + 12, sY - 6);
    ctx.lineTo(summaryX + summaryWidth - 12, sY - 6);
    ctx.stroke();

    renderRow('Net Outstanding / Closing Balance:', formatCurrency(invoice.newBalance, currencySymbol), true, '#0f172a', '14px');

    // 7. Left Side Badges: Notes
    let leftBadgeY = summaryTop + 10;
    if (invoice.notes) {
      ctx.fillStyle = '#475569';
      ctx.font = 'italic 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Notes: ${invoice.notes}`, 32, leftBadgeY + 16);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText(company.thankYouMsg || 'Thank you for your business!', 32, height - 25);

    // Convert to Blob
    const dataUrl = canvas.toDataURL('image/png', 0.95);
    return dataUrlToBlob(dataUrl);
  } catch (err) {
    console.error('Canvas direct generator failed:', err);
    return null;
  }
}

/**
 * Capture an HTML DOM element and return a PNG Blob.
 * If HTML2Canvas fails or element is tainted, automatically falls back to direct Canvas generator.
 */
export async function captureElementAsImage(
  element: HTMLElement | null,
  invoice?: Invoice,
  company?: CompanySettings
): Promise<Blob | null> {
  // Strategy 1: HTML2Canvas DOM Capture
  if (element) {
    try {
      // Find actual invoice content element to avoid capturing scroll wrappers
      const targetElement: HTMLElement =
        (element.firstElementChild as HTMLElement) || element;

      // Ensure all images in target element are loaded/decoded before capturing
      const images = Array.from(targetElement.querySelectorAll('img'));
      await Promise.all(
        images.map(async (img) => {
          if (img.complete) {
            if ('decode' in img) {
              try {
                await img.decode();
              } catch (_) {}
            }
            return;
          }
          await new Promise<void>((resolve) => {
            img.onload = async () => {
              if ('decode' in img) {
                try {
                  await img.decode();
                } catch (_) {}
              }
              resolve();
            };
            img.onerror = () => resolve();
          });
        })
      );

      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 8000,
        scrollX: 0,
        scrollY: 0,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        try {
          canvas.toBlob(
            (b) => {
              if (b) {
                resolve(b);
              } else {
                const dataUrl = canvas.toDataURL('image/png', 0.95);
                resolve(dataUrlToBlob(dataUrl));
              }
            },
            'image/png',
            0.95
          );
        } catch {
          try {
            const dataUrl = canvas.toDataURL('image/png', 0.95);
            resolve(dataUrlToBlob(dataUrl));
          } catch {
            resolve(null);
          }
        }
      });

      if (blob && blob.size > 1000) {
        return blob;
      }
    } catch (error) {
      console.warn('html2canvas capture issue, using direct engine:', error);
    }
  }

  // Strategy 2: Direct Canvas High-Resolution Renderer (100% reliable)
  if (invoice && company) {
    const directBlob = await createInvoiceCanvasDirect(
      invoice,
      company,
      company.currency || 'Rs.'
    );
    if (directBlob) {
      return directBlob;
    }
  }

  return null;
}

/**
 * Trigger browser file download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Compose polite business WhatsApp message
 */
export function generateWhatsAppMessage(
  invoice: Invoice,
  company: CompanySettings,
  party?: Party
): string {
  const curr = company.currency || 'Rs.';
  const prevFormatted = formatCurrency(invoice.previousBalance, curr);
  const currentFormatted = formatCurrency(invoice.grandTotal, curr);
  const paidFormatted = formatCurrency(invoice.paidAmount, curr);
  const newBalanceFormatted = formatCurrency(invoice.newBalance, curr);

  let msg = `*Assalam-o-Alaikum,*\n\n`;
  msg += `Dear *${invoice.partyName}*,\n\n`;
  msg += `Your invoice *#${invoice.invoiceNo}* dated *${formatDate(invoice.date)}* from *${company.businessName}*:\n\n`;
  if (invoice.previousBalance !== 0) {
    msg += `• *Previous Balance:* ${prevFormatted}\n`;
  }
  msg += `• *Current Invoice:* ${currentFormatted}\n`;
  msg += `• *Payment Received:* ${paidFormatted}\n`;
  msg += `• *New Balance:* ${newBalanceFormatted}\n\n`;

  msg += `_${company.thankYouMsg || 'Thank you for your business!'}_`;

  if (company.phone) {
    msg += `\nContact: ${company.phone}`;
  }

  return msg;
}

/**
 * Clean phone number for WhatsApp link (Pakistan standard format or international)
 */
export function sanitizePhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0')) {
    // Replace leading 0 with 92 for Pakistan
    cleaned = '92' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && !cleaned.startsWith('92')) {
    cleaned = '92' + cleaned;
  }
  return cleaned.replace('+', '');
}

/**
 * Copy image blob to system clipboard (for WhatsApp Web Ctrl+V paste)
 */
export async function copyImageToClipboard(imageBlob: Blob): Promise<boolean> {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ 'image/png': imageBlob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard image copy not supported or denied:', err);
  }
  return false;
}

/**
 * Open WhatsApp safely with phone and text
 */
export function openWhatsAppChat(phone: string, text: string): void {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  try {
    // Create an anchor tag for safe opening in sandbox/iframes
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.warn('Fallback window navigation for WhatsApp:', err);
    window.location.href = url;
  }
}

/**
 * Share invoice via Web Share API or open WhatsApp with downloaded/copied image
 */
export async function shareInvoiceImage(
  imageBlob: Blob,
  invoice: Invoice,
  company: CompanySettings,
  partyPhone?: string
): Promise<{ success: boolean; method: 'web_share' | 'download_and_whatsapp' | 'clipboard_and_whatsapp'; error?: string }> {
  const message = generateWhatsAppMessage(invoice, company);
  const filename = `${company.businessName.replace(/\s+/g, '_')}_${invoice.invoiceNo}.png`;
  const targetPhone = partyPhone || invoice.partyPhone || '';

  // 1. Check if Web Share API with files is available (mobile browsers: Chrome Android, Safari iOS)
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([imageBlob], filename, { type: 'image/png' });
      const shareData = {
        title: `Invoice #${invoice.invoiceNo} - ${company.businessName}`,
        text: message,
        files: [file],
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true, method: 'web_share' };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User voluntarily cancelled the share sheet
        return { success: true, method: 'web_share' };
      }
      console.warn('Native web share failed, proceeding with fallback:', err);
    }
  }

  // 2. Fallback: Copy image to clipboard for easy paste into WhatsApp Web
  const copied = await copyImageToClipboard(imageBlob);

  // 3. Download high-quality invoice image to downloads folder
  downloadBlob(imageBlob, filename);

  // 4. Open WhatsApp with customer phone and formatted message
  openWhatsAppChat(targetPhone, message);

  return {
    success: true,
    method: copied ? 'clipboard_and_whatsapp' : 'download_and_whatsapp',
  };
}

/**
 * Copy text string to system clipboard
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    console.warn('Clipboard text copy failed:', err);
    return false;
  }
}

/**
 * Share the exact generated Ledger PDF via Web Share API or download + WhatsApp open
 */
export async function shareLedgerPdf(
  pdfBlob: Blob,
  party: Party,
  company: CompanySettings,
  summaryText: string
): Promise<{ success: boolean; method: 'web_share' | 'download_and_whatsapp' | 'clipboard_and_whatsapp'; error?: string }> {
  const filename = `${party.name.replace(/\s+/g, '_')}_Statement.pdf`;
  const targetPhone = party.whatsapp || party.phone || '';

  // 1. Mobile browsers: Web Share API with PDF file
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      const shareData = {
        title: `Account Statement - ${party.name}`,
        text: summaryText,
        files: [file],
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true, method: 'web_share' };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: true, method: 'web_share' };
      }
      console.warn('Native PDF share failed, proceeding with fallback:', err);
    }
  }

  // 2. Desktop fallback: Copy text to clipboard, download the PDF, open WhatsApp chat
  const copied = await copyTextToClipboard(summaryText);
  downloadBlob(pdfBlob, filename);
  openWhatsAppChat(targetPhone, summaryText);

  return {
    success: true,
    method: copied ? 'clipboard_and_whatsapp' : 'download_and_whatsapp',
  };
}

/**
 * Share a generated ledger image via Web Share API or download + WhatsApp open
 */
export async function shareLedgerImage(
  imageBlob: Blob,
  party: Party,
  company: CompanySettings,
  summaryText: string
): Promise<{ success: boolean; method: 'web_share' | 'download_and_whatsapp' | 'clipboard_and_whatsapp'; error?: string }> {
  const filename = `${party.name.replace(/\s+/g, '_')}_Ledger.png`;
  const targetPhone = party.whatsapp || party.phone || '';

  // 1. Check if Web Share API with files is available (mobile browsers: Chrome Android, Safari iOS)
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([imageBlob], filename, { type: 'image/png' });
      const shareData = {
        title: `Account Ledger - ${party.name}`,
        text: summaryText,
        files: [file],
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true, method: 'web_share' };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: true, method: 'web_share' };
      }
      console.warn('Native web share failed, proceeding with fallback:', err);
    }
  }

  // 2. Fallback: Copy image to clipboard for easy paste into WhatsApp Web
  const copied = await copyImageToClipboard(imageBlob);

  // 3. Download high-quality ledger image to downloads folder
  downloadBlob(imageBlob, filename);

  // 4. Open WhatsApp with customer phone and formatted message
  openWhatsAppChat(targetPhone, summaryText);

  return {
    success: true,
    method: copied ? 'clipboard_and_whatsapp' : 'download_and_whatsapp',
  };
}

/**
 * Core PDF generator: captures an HTML element and produces a clean A4 multi-page document
 * without clipping rows or truncating content.
 */
export async function createPdfFromElement(
  element: HTMLElement,
  filename: string = 'document.pdf'
): Promise<{ pdf: jsPDF; blob: Blob }> {
  // Ensure images are fully loaded and decoded prior to html2canvas rendering
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (img.complete) {
        if ('decode' in img) {
          try {
            await img.decode();
          } catch (_) {}
        }
        return;
      }
      await new Promise<void>((resolve) => {
        img.onload = async () => {
          if ('decode' in img) {
            try {
              await img.decode();
            } catch (_) {}
          }
          resolve();
        };
        img.onerror = () => resolve();
      });
    })
  );

  // Capture element at 2x resolution with full scroll height and width
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth || 1024,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // Total height of the rendered content in mm
  const totalHeightMm = (canvas.height * pdfWidth) / canvas.width;

  if (totalHeightMm <= pdfPageHeight) {
    const imgData = canvas.toDataURL('image/png', 0.95);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, totalHeightMm);
  } else {
    // Multi-page row-aware slicing to ensure NO rows are cut in half
    const elementRect = element.getBoundingClientRect();
    const rows = Array.from(element.querySelectorAll('tr, .ledger-header-box, .ledger-footer-box'));
    const rowBottomsInCanvas: number[] = [];

    if (elementRect.height > 0) {
      for (const r of rows) {
        const rRect = r.getBoundingClientRect();
        const rBottom = ((rRect.bottom - elementRect.top) / elementRect.height) * canvas.height;
        if (rBottom > 0 && rBottom < canvas.height) {
          rowBottomsInCanvas.push(rBottom);
        }
      }
    }

    // Measure table header for repeating on subsequent pages
    const thead = element.querySelector('thead');
    let theadHeightInCanvas = 0;
    let theadCanvas: HTMLCanvasElement | null = null;

    if (thead && elementRect.height > 0) {
      const theadRect = thead.getBoundingClientRect();
      theadHeightInCanvas = (theadRect.height / elementRect.height) * canvas.height;
      if (theadHeightInCanvas > 0 && theadHeightInCanvas < canvas.height * 0.25) {
        theadCanvas = document.createElement('canvas');
        theadCanvas.width = canvas.width;
        theadCanvas.height = theadHeightInCanvas;
        const tCtx = theadCanvas.getContext('2d');
        const theadTop = ((theadRect.top - elementRect.top) / elementRect.height) * canvas.height;
        if (tCtx) {
          tCtx.drawImage(canvas, 0, theadTop, canvas.width, theadHeightInCanvas, 0, 0, canvas.width, theadHeightInCanvas);
        }
      }
    }

    const pageCanvasHeight = (canvas.width * pdfPageHeight) / pdfWidth;
    let currentY = 0;
    let pageIndex = 0;

    while (currentY < canvas.height - 2) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      // On pages 2+, if we have a repeating thead, reserve room for it
      const hasRepeatingHeader = pageIndex > 0 && theadCanvas !== null;
      const effectivePageHeight = hasRepeatingHeader
        ? pageCanvasHeight - theadHeightInCanvas
        : pageCanvasHeight;

      let idealCut = currentY + effectivePageHeight;
      let cutY = idealCut;

      if (idealCut >= canvas.height - 2) {
        cutY = canvas.height;
      } else {
        // Find closest row bottom before idealCut, within 65% of page height
        const minAcceptableCut = currentY + effectivePageHeight * 0.65;
        let bestBp = -1;
        for (const bp of rowBottomsInCanvas) {
          if (bp <= idealCut && bp >= minAcceptableCut && bp > bestBp) {
            bestBp = bp;
          }
        }
        if (bestBp > 0) {
          cutY = bestBp;
        }
      }

      const sliceHeight = cutY - currentY;
      const totalPageCanvasH = hasRepeatingHeader ? sliceHeight + theadHeightInCanvas : sliceHeight;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = totalPageCanvasH;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        let drawY = 0;
        if (hasRepeatingHeader && theadCanvas) {
          ctx.drawImage(theadCanvas, 0, 0);
          drawY = theadHeightInCanvas;
        }

        ctx.drawImage(
          canvas,
          0,
          currentY,
          canvas.width,
          sliceHeight,
          0,
          drawY,
          canvas.width,
          sliceHeight
        );
      }

      const pageImgData = pageCanvas.toDataURL('image/png', 0.95);
      const pageHeightMm = (totalPageCanvasH * pdfWidth) / canvas.width;
      pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, Math.min(pageHeightMm, pdfPageHeight));

      currentY = cutY;
      pageIndex++;
    }
  }

  const blob = pdf.output('blob');
  return { pdf, blob };
}

/**
 * Generate A4 PDF using jsPDF from an HTML element and trigger file download
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  filename: string = 'document.pdf'
): Promise<void> {
  const { pdf } = await createPdfFromElement(element, filename);
  pdf.save(filename);
}

/**
 * Generate A4 PDF Blob from an HTML element (for sharing or emailing)
 */
export async function generatePdfBlobFromElement(
  element: HTMLElement,
  filename: string = 'document.pdf'
): Promise<Blob> {
  const { blob } = await createPdfFromElement(element, filename);
  return blob;
}

/**
 * Universal CSV download utility
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
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
}

