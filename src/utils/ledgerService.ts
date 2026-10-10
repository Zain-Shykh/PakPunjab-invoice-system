import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Invoice, ManualTransaction, Party, Payment, Purchase } from '../types';
import { getInvoices, getManualTransactions, getPayments, getPurchases } from '../db/storage';
import { formatCurrency, formatDate, getTodayDateString } from './formatters';
import { copyImageToClipboard, copyTextToClipboard, downloadBlob, openWhatsAppChat } from './shareUtils';

export interface PreparedLedgerEntry {
  id: string;
  date: string;
  time?: string;
  type: string;
  referenceNo: string;
  referenceId?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PreparedLedgerData {
  party: Party;
  company: CompanySettings;
  startDate?: string;
  endDate?: string;
  periodLabel: string;
  dateFromFormatted: string;
  dateToFormatted: string;
  periodOpeningBalance: number;
  openingBalanceFormatted: string;
  openingBalanceType: 'Receivable' | 'Payable' | 'Advance' | 'Nil';
  entries: PreparedLedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingStatus: 'TO RECEIVE' | 'TO PAY' | 'SETTLED' | 'ADVANCE PAID' | 'ADVANCE RECEIVED';
  isSupplier: boolean;
  currency: string;
}

/**
 * Mathematically prepares all ledger transactions for a party within a given date range.
 * This is the SINGLE SOURCE OF TRUTH for Print, PDF, Image, and WhatsApp exports.
 */
export function prepareLedgerData(
  party: Party,
  company: CompanySettings,
  startDate?: string,
  endDate?: string,
  invoices: Invoice[] = getInvoices(),
  payments: Payment[] = getPayments(),
  purchases: Purchase[] = getPurchases(),
  manualTransactions: ManualTransaction[] = getManualTransactions()
): PreparedLedgerData {
  const isSupplier = party.partyType === 'supplier';
  const curr = company.currency || 'Rs.';

  interface RawItem {
    id: string;
    date: string;
    time: string;
    type: 'OPENING' | 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT' | 'MANUAL';
    referenceNo: string;
    referenceId: string;
    description: string;
    debit: number;
    credit: number;
    createdAt: string;
  }

  const rawItems: RawItem[] = [];

  // 1. Initial Opening Balance of the Party
  if (party.openingBalance > 0) {
    const isReceivable = party.balanceType === 'receivable';
    const isPayable = party.balanceType === 'payable';
    const partyCreatedDate = party.createdAt ? party.createdAt.split('T')[0] : '2000-01-01';

    if (isSupplier) {
      rawItems.push({
        id: `opening_${party.id}`,
        date: partyCreatedDate,
        time: '00:00',
        type: 'OPENING',
        referenceNo: 'OPENING',
        referenceId: party.id,
        description: `Opening Balance (${isPayable ? 'Payable' : 'Advance Paid'})`,
        debit: !isPayable ? party.openingBalance : 0,
        credit: isPayable ? party.openingBalance : 0,
        createdAt: party.createdAt || '2000-01-01T00:00:00.000Z',
      });
    } else {
      rawItems.push({
        id: `opening_${party.id}`,
        date: partyCreatedDate,
        time: '00:00',
        type: 'OPENING',
        referenceNo: 'OPENING',
        referenceId: party.id,
        description: `Opening Balance (${isReceivable ? 'Receivable' : 'Advance Received'})`,
        debit: isReceivable ? party.openingBalance : 0,
        credit: !isReceivable ? party.openingBalance : 0,
        createdAt: party.createdAt || '2000-01-01T00:00:00.000Z',
      });
    }
  }

  // 2. Collect all raw transactions
  if (isSupplier) {
    // Supplier purchases (Bill) -> Increases payable (Credit)
    const partyPurchases = purchases.filter((pur) => pur.partyId === party.id);
    for (const pur of partyPurchases) {
      rawItems.push({
        id: pur.id,
        date: pur.date,
        time: pur.time || '12:00',
        type: 'PURCHASE',
        referenceNo: pur.purchaseNo || `PUR-${pur.id.slice(-4)}`,
        referenceId: pur.id,
        description: pur.notes ? `Purchase Bill - ${pur.notes}` : `Purchase Bill #${pur.purchaseNo}`,
        debit: 0,
        credit: pur.grandTotal || 0,
        createdAt: pur.createdAt || '',
      });
    }

    // Supplier payments made -> Reduces payable (Debit)
    const partyPayments = payments.filter((pay) => pay.partyId === party.id);
    for (const pay of partyPayments) {
      const isOutflow = pay.paymentType === 'paid';
      rawItems.push({
        id: pay.id,
        date: pay.date,
        time: pay.time || '12:00',
        type: 'PAYMENT',
        referenceNo: pay.reference || `PAY-${pay.id.slice(-4)}`,
        referenceId: pay.id,
        description: `${isOutflow ? 'Payment to Supplier' : 'Supplier Refund'} (${pay.method})${pay.notes ? ` - ${pay.notes}` : ''}`,
        debit: isOutflow ? pay.amount : 0,
        credit: !isOutflow ? pay.amount : 0,
        createdAt: pay.createdAt || '',
      });
    }

    // Manual supplier entries
    const partyManual = manualTransactions.filter((m) => m.partyId === party.id);
    for (const m of partyManual) {
      const isCredit = m.transactionType === 'party_credit';
      rawItems.push({
        id: m.id,
        date: m.date,
        time: m.time || '12:00',
        type: 'MANUAL',
        referenceNo: m.reference || `MAN-${m.id.slice(-4)}`,
        referenceId: m.id,
        description: m.description || `Manual Adjustment (${isCredit ? 'Credit' : 'Debit'})`,
        debit: !isCredit ? m.amount : 0,
        credit: isCredit ? m.amount : 0,
        createdAt: m.createdAt || '',
      });
    }
  } else {
    // Customer Invoices -> Increases receivable (Debit)
    const partyInvoices = invoices.filter((inv) => inv.partyId === party.id);
    for (const inv of partyInvoices) {
      if (inv.manualAdjustment && inv.manualAdjustment !== 0) {
        rawItems.push({
          id: `adj_${inv.id}`,
          date: inv.date,
          time: inv.time || '11:59',
          type: 'ADJUSTMENT',
          referenceNo: `ADJ-${inv.invoiceNo}`,
          referenceId: inv.id,
          description: `Balance Adjustment (Inv #${inv.invoiceNo})`,
          debit: inv.manualAdjustment > 0 ? inv.manualAdjustment : 0,
          credit: inv.manualAdjustment < 0 ? Math.abs(inv.manualAdjustment) : 0,
          createdAt: inv.createdAt || '',
        });
      }

      rawItems.push({
        id: inv.id,
        date: inv.date,
        time: inv.time || '12:00',
        type: 'INVOICE',
        referenceNo: inv.invoiceNo,
        referenceId: inv.id,
        description: inv.notes ? `Sale - ${inv.notes}` : `Sales Invoice`,
        debit: inv.grandTotal || 0,
        credit: 0,
        createdAt: inv.createdAt || '',
      });
    }

    // Customer Payments -> Decreases receivable (Credit)
    const partyPayments = payments.filter((pay) => pay.partyId === party.id);
    for (const pay of partyPayments) {
      const isOutflow = pay.paymentType === 'paid';
      rawItems.push({
        id: pay.id,
        date: pay.date,
        time: pay.time || '12:00',
        type: 'PAYMENT',
        referenceNo: pay.reference || `PAY-${pay.id.slice(-4)}`,
        referenceId: pay.id,
        description: `${isOutflow ? 'Payment Refund/Out' : 'Payment Received'} (${pay.method})${pay.notes ? ` - ${pay.notes}` : ''}`,
        debit: isOutflow ? pay.amount : 0,
        credit: !isOutflow ? pay.amount : 0,
        createdAt: pay.createdAt || '',
      });
    }

    // Manual Customer Entries
    const partyManual = manualTransactions.filter((m) => m.partyId === party.id);
    for (const m of partyManual) {
      const isDebit = m.transactionType === 'party_debit';
      rawItems.push({
        id: m.id,
        date: m.date,
        time: m.time || '12:00',
        type: 'MANUAL',
        referenceNo: m.reference || `MAN-${m.id.slice(-4)}`,
        referenceId: m.id,
        description: m.description || `Manual Customer Entry (${isDebit ? 'Debit' : 'Credit'})`,
        debit: isDebit ? m.amount : 0,
        credit: !isDebit ? m.amount : 0,
        createdAt: m.createdAt || '',
      });
    }
  }

  // Sort chronologically
  rawItems.sort((a, b) => {
    const dComp = a.date.localeCompare(b.date);
    if (dComp !== 0) return dComp;
    const tComp = (a.time || '').localeCompare(b.time || '');
    if (tComp !== 0) return tComp;
    if (a.type !== b.type) {
      if (a.type === 'OPENING') return -1;
      if (b.type === 'OPENING') return 1;
      if (a.type === 'ADJUSTMENT') return -1;
      if (b.type === 'ADJUSTMENT') return 1;
      return a.type === 'INVOICE' || a.type === 'PURCHASE' ? -1 : 1;
    }
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // Calculate global running balance to compute accurate opening balance for period
  let periodOpeningBalance = 0;
  const priorItems = startDate ? rawItems.filter((item) => item.date < startDate) : [];
  
  if (priorItems.length > 0) {
    let runningPrior = 0;
    for (const item of priorItems) {
      if (isSupplier) {
        runningPrior = runningPrior + item.credit - item.debit;
      } else {
        runningPrior = runningPrior + item.debit - item.credit;
      }
    }
    periodOpeningBalance = runningPrior;
  } else if (!startDate) {
    // If all time, the opening balance comes from the party's initial opening balance
    if (party.openingBalance > 0) {
      if (isSupplier) {
        periodOpeningBalance = party.balanceType === 'payable' ? party.openingBalance : -party.openingBalance;
      } else {
        periodOpeningBalance = party.balanceType === 'receivable' ? party.openingBalance : -party.openingBalance;
      }
    }
  }

  // Filter items in the requested date range (excluding OPENING if already absorbed into periodOpeningBalance)
  const scopedRawItems = rawItems.filter((item) => {
    if (item.type === 'OPENING') {
      // If we are showing from startDate and opening was before startDate, it's absorbed in periodOpeningBalance
      if (startDate && item.date < startDate) return false;
      // If startDate is not given or opening was on/after startDate, include it only if not already counted as periodOpeningBalance
      if (!startDate) return false; // Handled in periodOpeningBalance
    }
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });

  let runningBalance = periodOpeningBalance;
  let totalDebit = 0;
  let totalCredit = 0;
  const entries: PreparedLedgerEntry[] = [];

  for (const item of scopedRawItems) {
    if (isSupplier) {
      runningBalance = runningBalance + item.credit - item.debit;
    } else {
      runningBalance = runningBalance + item.debit - item.credit;
    }
    totalDebit += item.debit;
    totalCredit += item.credit;

    entries.push({
      id: item.id,
      date: item.date,
      time: item.time,
      type: item.type,
      referenceNo: item.referenceNo,
      referenceId: item.referenceId,
      description: item.description,
      debit: item.debit,
      credit: item.credit,
      balance: runningBalance,
    });
  }

  // Opening balance label
  let openingBalanceType: 'Receivable' | 'Payable' | 'Advance' | 'Nil' = 'Nil';
  if (periodOpeningBalance > 0) {
    openingBalanceType = isSupplier ? 'Payable' : 'Receivable';
  } else if (periodOpeningBalance < 0) {
    openingBalanceType = 'Advance';
  }

  // Closing Status
  let closingStatus: 'TO RECEIVE' | 'TO PAY' | 'SETTLED' | 'ADVANCE PAID' | 'ADVANCE RECEIVED' = 'SETTLED';
  if (runningBalance === 0) {
    closingStatus = 'SETTLED';
  } else if (runningBalance > 0) {
    closingStatus = isSupplier ? 'TO PAY' : 'TO RECEIVE';
  } else {
    closingStatus = isSupplier ? 'ADVANCE PAID' : 'ADVANCE RECEIVED';
  }

  // Period labels
  let periodLabel = 'All Time (Complete History)';
  if (startDate && endDate) {
    periodLabel = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  } else if (startDate) {
    periodLabel = `From ${formatDate(startDate)} to Present`;
  } else if (endDate) {
    periodLabel = `Up to ${formatDate(endDate)}`;
  }

  return {
    party,
    company,
    startDate,
    endDate,
    periodLabel,
    dateFromFormatted: startDate ? formatDate(startDate) : (party.createdAt ? formatDate(party.createdAt.split('T')[0]) : 'Initial'),
    dateToFormatted: endDate ? formatDate(endDate) : formatDate(getTodayDateString()),
    periodOpeningBalance,
    openingBalanceFormatted: `${formatCurrency(Math.abs(periodOpeningBalance), curr)} ${
      openingBalanceType !== 'Nil' ? `(${openingBalanceType})` : ''
    }`,
    openingBalanceType,
    entries,
    totalDebit,
    totalCredit,
    closingBalance: runningBalance,
    closingStatus,
    isSupplier,
    currency: curr,
  };
}

/**
 * Clean HTML Print Template Renderer.
 * Injects dedicated, professional accounting ledger into #printArea and triggers native print.
 */
export function renderLedgerPrint(
  data: PreparedLedgerData,
  orientation: 'portrait' | 'landscape' = 'portrait'
): void {
  let printArea = document.getElementById('printArea');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'printArea';
    document.body.appendChild(printArea);
  }

  const { party, company, curr } = { party: data.party, company: data.company, curr: data.currency };

  // Status badge style
  const statusColor =
    data.closingBalance > 0
      ? '#dc2626' // Red
      : data.closingBalance < 0
      ? '#16a34a' // Green
      : '#475569'; // Slate

  // Construct table rows
  const rowsHtml =
    data.entries.length === 0
      ? `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #64748b; font-style: italic;">No ledger transactions found for the selected period.</td></tr>`
      : data.entries
          .map((entry, idx) => {
            const isDebit = entry.debit > 0;
            const isCredit = entry.credit > 0;
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            const balColor = entry.balance > 0 ? '#b91c1c' : entry.balance < 0 ? '#15803d' : '#0f172a';
            const balSuffix = entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : '';

            return `
              <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid;">
                <td style="padding: 7px 10px; font-weight: 500; color: #1e293b; white-space: nowrap;">${formatDate(entry.date)}</td>
                <td style="padding: 7px 10px; font-family: monospace; font-weight: bold; color: #334155; white-space: nowrap;">${entry.referenceNo || '-'}</td>
                <td style="padding: 7px 10px; color: #334155; font-size: 11px; line-height: 1.35;">${entry.description}</td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #dc2626; white-space: nowrap;">${isDebit ? formatCurrency(entry.debit, curr, 'no_symbol') : '-'}</td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #16a34a; white-space: nowrap;">${isCredit ? formatCurrency(entry.credit, curr, 'no_symbol') : '-'}</td>
                <td style="padding: 7px 10px; text-align: right; font-weight: bold; color: ${balColor}; white-space: nowrap;">
                  ${formatCurrency(Math.abs(entry.balance), curr, 'no_symbol')}
                  <span style="font-size: 9px; font-weight: normal; color: #64748b; margin-left: 3px;">${balSuffix}</span>
                </td>
              </tr>
            `;
          })
          .join('');

  printArea.innerHTML = `
    <div class="print-ledger-wrapper" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; padding: 0; margin: 0; box-sizing: border-box; width: 100%;">
      
      <!-- 1. HEADER SECTION (Matches Requirement 3 exactly) -->
      <div style="border-bottom: 2px solid #581c87; padding-bottom: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; align-items: flex-start; gap: 14px;">
          ${
            company.logo
              ? `<img src="${company.logo}" alt="Logo" style="width: 65px; height: 65px; max-width: 90px; max-height: 65px; object-contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px;" />`
              : `<div style="width: 55px; height: 55px; background: #581c87; color: #ffffff; font-weight: 900; font-size: 22px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">${company.businessName ? company.businessName.substring(0, 2).toUpperCase() : 'VL'}</div>`
          }
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px;">${company.businessName}</h1>
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
          <div style="display: inline-block; background: #581c87; color: #ffffff; padding: 5px 14px; border-radius: 6px; font-size: 13px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
            PARTY LEDGER
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Statement Date: <strong>${formatDate(getTodayDateString())}</strong></div>
          <div style="font-size: 9px; color: #94a3b8;">Computer Generated Statement</div>
        </div>
      </div>

      <!-- 2. PARTY INFO & SCOPE DETAILS -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px;">
        <div style="flex: 1;">
          <div style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 0.5px;">
            ${data.isSupplier ? 'SUPPLIER DETAILS' : 'CUSTOMER DETAILS'}
          </div>
          <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 2px;">${party.name}</div>
          <div style="color: #475569; margin-top: 2px;">
            ${party.phone ? `Mobile: <strong style="color: #1e293b;">${party.phone}</strong>` : ''}
            ${party.whatsapp && party.whatsapp !== party.phone ? ` · WhatsApp: <strong>${party.whatsapp}</strong>` : ''}
          </div>
          ${party.address ? `<div style="color: #475569; margin-top: 1px;">Address: ${party.address}${party.city ? `, ${party.city}` : ''}</div>` : ''}
        </div>

        <div style="text-align: right; flex: 1;">
          <div style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 0.5px;">STATEMENT PERIOD</div>
          <div style="font-size: 12px; font-weight: bold; color: #581c87; margin-top: 2px;">${data.periodLabel}</div>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">From: <strong>${data.dateFromFormatted}</strong> · To: <strong>${data.dateToFormatted}</strong></div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
            Opening Balance: <strong style="font-size: 12px; color: #0f172a;">${data.openingBalanceFormatted}</strong>
          </div>
        </div>
      </div>

      <!-- 3. TABLE SECTION (Multi-page with repeating thead) -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; margin-bottom: 14px;">
        <thead>
          <tr style="background-color: #581c87; color: #ffffff; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">
            <th style="padding: 8px 10px; border-top-left-radius: 4px; width: 85px;">Date</th>
            <th style="padding: 8px 10px; width: 95px;">Reference</th>
            <th style="padding: 8px 10px;">Description</th>
            <th style="padding: 8px 10px; text-align: right; width: 90px;">Debit (${curr})</th>
            <th style="padding: 8px 10px; text-align: right; width: 90px;">Credit (${curr})</th>
            <th style="padding: 8px 10px; text-align: right; border-top-right-radius: 4px; width: 105px;">Balance (${curr})</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #f1f5f9; border-top: 2px solid #94a3b8; font-weight: bold; color: #0f172a; page-break-inside: avoid; break-inside: avoid;">
            <td colspan="3" style="padding: 9px 10px; text-align: right; font-weight: 900; text-transform: uppercase; font-size: 11px;">Period Totals:</td>
            <td style="padding: 9px 10px; text-align: right; font-weight: 900; color: #dc2626;">${formatCurrency(data.totalDebit, curr)}</td>
            <td style="padding: 9px 10px; text-align: right; font-weight: 900; color: #16a34a;">${formatCurrency(data.totalCredit, curr)}</td>
            <td style="padding: 9px 10px; text-align: right; font-weight: 900; color: #581c87;">${formatCurrency(Math.abs(data.closingBalance), curr)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- 4. TOTALS & STATUS SUMMARY FOOTER BOX (Matches Requirement 3 exactly) -->
      <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-top: 10px; page-break-inside: avoid; break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 11px;">
          <div style="flex: 1;">
            <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Debit:</span>
            <div style="font-size: 15px; font-weight: 900; color: #dc2626; margin-top: 2px;">${formatCurrency(data.totalDebit, curr)}</div>
            <div style="font-size: 9px; color: #94a3b8;">${data.isSupplier ? 'Payments / Debits' : 'Sales Invoices / Debits'}</div>
          </div>

          <div style="flex: 1; border-left: 1px solid #e2e8f0; padding-left: 14px;">
            <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Credit:</span>
            <div style="font-size: 15px; font-weight: 900; color: #16a34a; margin-top: 2px;">${formatCurrency(data.totalCredit, curr)}</div>
            <div style="font-size: 9px; color: #94a3b8;">${data.isSupplier ? 'Purchases / Credits' : 'Receipts / Credits'}</div>
          </div>

          <div style="flex: 1.2; border-left: 1px solid #e2e8f0; padding-left: 14px;">
            <span style="font-size: 10px; font-weight: bold; color: #581c87; text-transform: uppercase;">Closing Balance:</span>
            <div style="font-size: 18px; font-weight: 900; color: ${statusColor}; margin-top: 2px;">${formatCurrency(Math.abs(data.closingBalance), curr)}</div>
            <div style="font-size: 10px; font-weight: 900; color: ${statusColor}; text-transform: uppercase; margin-top: 2px;">
              STATUS: ${data.closingStatus}
            </div>
          </div>
        </div>

        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8;">
          <div>Thank you for your business. Verified official account statement.</div>
          <div>Page 1 · Veloce Ledger System · Total ${data.entries.length} transactions</div>
        </div>
      </div>

    </div>
  `;

  // Set printing class
  document.body.classList.add('printing-active');
  if (orientation === 'landscape') {
    document.body.classList.add('printing-landscape');
  }

  // Allow browser layout engine to paint DOM before opening print preview dialog
  setTimeout(() => {
    window.print();

    // Clean up safely after print dialog closes
    const cleanup = () => {
      document.body.classList.remove('printing-active');
      document.body.classList.remove('printing-landscape');
      if (printArea) {
        printArea.innerHTML = '';
      }
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2500); // Safety fallback
  }, 100);
}

/**
 * Robust Client-Side Vector PDF Generator using jsPDF + jspdf-autotable.
 * Generates valid multi-page A4 PDF containing ALL filtered records, logo, header, table, and totals.
 */
export async function generateLedgerPdf(data: PreparedLedgerData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const curr = data.currency;

  let startY = 14;

  // 1. Draw Company Logo if available
  if (data.company.logo) {
    try {
      const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = data.company.logo;
      });

      if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
        const aspect = logoImg.width / logoImg.height;
        const logoH = 14;
        const logoW = Math.min(26, logoH * aspect);
        doc.addImage(logoImg, 'PNG', 14, startY, logoW, logoH, undefined, 'FAST');
      }
    } catch (err) {
      console.warn('PDF logo load notice:', err);
    }
  }

  // 2. Company Header Text
  const textLeft = data.company.logo ? 42 : 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.company.businessName || 'VELOCE LEDGER', textLeft, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  let infoY = startY + 9;
  if (data.company.tagline) {
    doc.text(data.company.tagline, textLeft, infoY);
    infoY += 3.5;
  }
  const contactText = [
    data.company.phone ? `Phone: ${data.company.phone}` : '',
    data.company.whatsapp ? `WA: ${data.company.whatsapp}` : '',
    data.company.city || data.company.address || '',
  ]
    .filter(Boolean)
    .join('  |  ');
  if (contactText) {
    doc.text(contactText, textLeft, infoY);
  }

  // Right Title Badge
  doc.setFillColor(88, 28, 135); // purple-900
  doc.roundedRect(pageWidth - 60, startY, 46, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('PARTY LEDGER', pageWidth - 37, startY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(getTodayDateString())}`, pageWidth - 14, startY + 12, { align: 'right' });

  // 3. Top Line Divider
  startY = 32;
  doc.setDrawColor(88, 28, 135);
  doc.setLineWidth(0.6);
  doc.line(14, startY, pageWidth - 14, startY);

  // 4. Party Details & Statement Scope Box
  startY += 4;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, pageWidth - 28, 22, 2, 2, 'FD');

  // Party Left Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(data.isSupplier ? 'SUPPLIER DETAILS' : 'CUSTOMER DETAILS', 18, startY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.party.name, 18, startY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const partyPhoneStr = data.party.phone ? `Phone: ${data.party.phone}` : '';
  const partyAddrStr = data.party.address ? `${data.party.address}${data.party.city ? `, ${data.party.city}` : ''}` : '';
  doc.text(partyPhoneStr, 18, startY + 15);
  if (partyAddrStr) {
    doc.text(partyAddrStr, 18, startY + 19);
  }

  // Scope Right Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('STATEMENT PERIOD', pageWidth - 18, startY + 5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(88, 28, 135);
  doc.text(data.periodLabel, pageWidth - 18, startY + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`From: ${data.dateFromFormatted}  ·  To: ${data.dateToFormatted}`, pageWidth - 18, startY + 14, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Opening Balance: ${data.openingBalanceFormatted}`, pageWidth - 18, startY + 19, { align: 'right' });

  // 5. Table Rows Construction
  const tableRows =
    data.entries.length === 0
      ? [['-', '-', 'No transactions recorded in this period', '-', '-', '-']]
      : data.entries.map((e) => [
          formatDate(e.date),
          e.referenceNo || '-',
          e.description,
          e.debit > 0 ? formatCurrency(e.debit, curr, 'no_symbol') : '-',
          e.credit > 0 ? formatCurrency(e.credit, curr, 'no_symbol') : '-',
          `${formatCurrency(Math.abs(e.balance), curr, 'no_symbol')} ${
            e.balance > 0 ? 'Dr' : e.balance < 0 ? 'Cr' : ''
          }`,
        ]);

  // 6. Draw Table with autoTable
  autoTable(doc, {
    startY: startY + 25,
    head: [['Date', 'Reference', 'Description', `Debit (${curr})`, `Credit (${curr})`, `Balance (${curr})`]],
    body: tableRows,
    foot: [
      [
        'Period Totals',
        '',
        '',
        formatCurrency(data.totalDebit, curr),
        formatCurrency(data.totalCredit, curr),
        formatCurrency(Math.abs(data.closingBalance), curr),
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [88, 28, 135], // purple-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      lineWidth: 0.2,
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'left' },
      1: { cellWidth: 26, font: 'courier', fontStyle: 'bold' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      // Right align foot cells 3, 4, 5
      if (hookData.section === 'foot') {
        if (hookData.column.index >= 3) {
          hookData.cell.styles.halign = 'right';
        }
        if (hookData.column.index === 3) {
          hookData.cell.styles.textColor = [220, 38, 38];
        }
        if (hookData.column.index === 4) {
          hookData.cell.styles.textColor = [22, 163, 74];
        }
        if (hookData.column.index === 5) {
          hookData.cell.styles.textColor = [88, 28, 135];
        }
      }
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
    showFoot: 'lastPage',
  });

  // 7. Summary Footer Box on Final Page
  const finalY = (doc as any).lastAutoTable?.finalY || startY + 60;
  let summaryBoxY = finalY + 5;

  // If near page bottom, add page for summary box
  if (summaryBoxY > pageHeight - 38) {
    doc.addPage();
    summaryBoxY = 16;
  }

  // Draw Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, summaryBoxY, pageWidth - 28, 22, 2, 2, 'FD');

  // Debits Col
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DEBIT', 20, summaryBoxY + 5.5);
  doc.setFontSize(10.5);
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(data.totalDebit, curr), 20, summaryBoxY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(data.isSupplier ? 'Payments / Debits' : 'Sales / Debits', 20, summaryBoxY + 16.5);

  // Credits Col
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CREDIT', 78, summaryBoxY + 5.5);
  doc.setFontSize(10.5);
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(data.totalCredit, curr), 78, summaryBoxY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(data.isSupplier ? 'Purchases / Credits' : 'Receipts / Credits', 78, summaryBoxY + 16.5);

  // Closing Balance Col
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(88, 28, 135);
  doc.text('CLOSING BALANCE', 136, summaryBoxY + 5.5);
  doc.setFontSize(12);
  const isNetRec = data.closingBalance > 0 && !data.isSupplier;
  const isNetPay = data.closingBalance > 0 && data.isSupplier;
  doc.setTextColor(isNetRec || isNetPay ? 220 : 22, isNetRec || isNetPay ? 38 : 163, isNetRec || isNetPay ? 38 : 74);
  doc.text(formatCurrency(Math.abs(data.closingBalance), curr), 136, summaryBoxY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`STATUS: ${data.closingStatus}`, 136, summaryBoxY + 17);

  // Page Numbers Footer on All Pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official statement generated by ${data.company.businessName}  ·  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

/**
 * Pure 2D Canvas High-Res Dynamic Ledger Image Generator.
 * Calculates exact dynamic height (header + party + rows * rowHeight + totals + footer),
 * renders offscreen with 2x retina clarity, and returns PNG Blob. Zero cropping!
 */
export async function generateLedgerImage(data: PreparedLedgerData): Promise<Blob> {
  const width = 850;
  const headerHeight = 130;
  const partyBoxHeight = 85;
  const tableHeadHeight = 36;
  const rowHeight = 32;
  const rowsCount = Math.max(1, data.entries.length);
  const tableRowsHeight = rowsCount * rowHeight;
  const tableFootHeight = 36;
  const summaryBoxHeight = 95;
  const footerHeight = 40;

  const totalHeight =
    headerHeight +
    partyBoxHeight +
    tableHeadHeight +
    tableRowsHeight +
    tableFootHeight +
    summaryBoxHeight +
    footerHeight +
    40; // margins

  const canvas = document.createElement('canvas');
  canvas.width = width * 2; // 2x Retina
  canvas.height = totalHeight * 2;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.scale(2, 2);

  // Preload logo if present
  let logoImg: HTMLImageElement | null = null;
  if (data.company.logo) {
    try {
      logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = data.company.logo;
      });
    } catch (_) {}
  }

  // 1. White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  // 2. Header Banner
  ctx.fillStyle = '#581c87'; // Purple-900
  ctx.fillRect(0, 0, width, headerHeight);

  let textX = 24;
  if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
    const maxLogoW = 75;
    const maxLogoH = 75;
    const aspect = logoImg.width / logoImg.height;
    let drawW = maxLogoW;
    let drawH = maxLogoW / aspect;
    if (drawH > maxLogoH) {
      drawH = maxLogoH;
      drawW = maxLogoH * aspect;
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(24, 24, maxLogoW + 10, maxLogoH + 10, 10);
    ctx.fill();

    const offX = 24 + (maxLogoW + 10 - drawW) / 2;
    const offY = 24 + (maxLogoH + 10 - drawH) / 2;
    ctx.drawImage(logoImg, offX, offY, drawW, drawH);
    textX = 24 + maxLogoW + 24;
  }

  // Business Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.company.businessName || 'BUSINESS LEDGER', textX, 48);

  ctx.fillStyle = '#e9d5ff';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  if (data.company.tagline) {
    ctx.fillText(data.company.tagline, textX, 70);
  }
  const contactText = [
    data.company.phone ? `Phone: ${data.company.phone}` : '',
    data.company.whatsapp ? `WA: ${data.company.whatsapp}` : '',
    data.company.address || data.company.city || '',
  ]
    .filter(Boolean)
    .join('  •  ');
  if (contactText) {
    ctx.fillText(contactText, textX, 92);
  }

  // Title on Right
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('PARTY LEDGER', width - 24, 52);

  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#f3e8ff';
  ctx.fillText(`Statement: ${formatDate(getTodayDateString())}`, width - 24, 76);
  ctx.textAlign = 'left';

  // 3. Party & Period Card
  let currentY = headerHeight + 16;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(24, currentY, width - 48, partyBoxHeight, 10);
  ctx.fill();
  ctx.stroke();

  // Party Left
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.isSupplier ? 'SUPPLIER DETAILS' : 'CUSTOMER DETAILS', 40, currentY + 22);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.party.name, 40, currentY + 44);

  ctx.fillStyle = '#475569';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  const partyPhoneStr = data.party.phone ? `Phone: ${data.party.phone}` : '';
  const partyAddrStr = data.party.address ? `${data.party.address}${data.party.city ? `, ${data.party.city}` : ''}` : '';
  ctx.fillText([partyPhoneStr, partyAddrStr].filter(Boolean).join('  •  '), 40, currentY + 64);

  // Period Right
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('STATEMENT PERIOD', width - 40, currentY + 22);

  ctx.fillStyle = '#581c87';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.periodLabel, width - 40, currentY + 44);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Opening Balance: ${data.openingBalanceFormatted}`, width - 40, currentY + 64);
  ctx.textAlign = 'left';

  // 4. Ledger Table Header
  currentY += partyBoxHeight + 16;
  ctx.fillStyle = '#581c87';
  ctx.fillRect(24, currentY, width - 48, tableHeadHeight);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('DATE', 36, currentY + 22);
  ctx.fillText('REF / INV #', 130, currentY + 22);
  ctx.fillText('DESCRIPTION', 240, currentY + 22);
  ctx.textAlign = 'right';
  ctx.fillText(`DEBIT (${data.currency})`, 580, currentY + 22);
  ctx.fillText(`CREDIT (${data.currency})`, 700, currentY + 22);
  ctx.fillText(`BALANCE (${data.currency})`, width - 36, currentY + 22);
  ctx.textAlign = 'left';

  // 5. Table Rows
  currentY += tableHeadHeight;
  if (data.entries.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(24, currentY, width - 48, 40);
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No ledger transactions found for the selected period.', width / 2, currentY + 24);
    ctx.textAlign = 'left';
    currentY += 40;
  } else {
    data.entries.forEach((entry, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(24, currentY, width - 48, rowHeight);

      // Border line
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, currentY + rowHeight);
      ctx.lineTo(width - 24, currentY + rowHeight);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.font = '500 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(formatDate(entry.date), 36, currentY + 20);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#475569';
      ctx.fillText(entry.referenceNo || '-', 130, currentY + 20);

      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#334155';
      const desc = entry.description.length > 40 ? `${entry.description.substring(0, 38)}...` : entry.description;
      ctx.fillText(desc, 240, currentY + 20);

      ctx.textAlign = 'right';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = entry.debit > 0 ? '#dc2626' : '#94a3b8';
      ctx.fillText(entry.debit > 0 ? formatCurrency(entry.debit, data.currency, 'no_symbol') : '-', 580, currentY + 20);

      ctx.fillStyle = entry.credit > 0 ? '#16a34a' : '#94a3b8';
      ctx.fillText(entry.credit > 0 ? formatCurrency(entry.credit, data.currency, 'no_symbol') : '-', 700, currentY + 20);

      ctx.fillStyle = entry.balance > 0 ? '#b91c1c' : entry.balance < 0 ? '#15803d' : '#0f172a';
      const suffix = entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : '';
      ctx.fillText(`${formatCurrency(Math.abs(entry.balance), data.currency, 'no_symbol')} ${suffix}`, width - 36, currentY + 20);
      ctx.textAlign = 'left';

      currentY += rowHeight;
    });
  }

  // 6. Table Foot (Period Totals)
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(24, currentY, width - 48, tableFootHeight);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, currentY);
  ctx.lineTo(width - 24, currentY);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('PERIOD TOTALS:', 36, currentY + 22);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#dc2626';
  ctx.fillText(formatCurrency(data.totalDebit, data.currency), 580, currentY + 22);

  ctx.fillStyle = '#16a34a';
  ctx.fillText(formatCurrency(data.totalCredit, data.currency), 700, currentY + 22);

  ctx.fillStyle = '#581c87';
  ctx.fillText(formatCurrency(Math.abs(data.closingBalance), data.currency), width - 36, currentY + 22);
  ctx.textAlign = 'left';

  // 7. Summary Footer Box
  currentY += tableFootHeight + 16;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(24, currentY, width - 48, summaryBoxHeight, 10);
  ctx.fill();
  ctx.stroke();

  // Total Debits
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('TOTAL DEBIT', 44, currentY + 24);
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatCurrency(data.totalDebit, data.currency), 44, currentY + 50);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.isSupplier ? 'Payments / Debits' : 'Sales / Debits', 44, currentY + 70);

  // Total Credits
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('TOTAL CREDIT', 310, currentY + 24);
  ctx.fillStyle = '#16a34a';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatCurrency(data.totalCredit, data.currency), 310, currentY + 50);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.isSupplier ? 'Purchases / Credits' : 'Receipts / Credits', 310, currentY + 70);

  // Closing Balance
  ctx.fillStyle = '#581c87';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('NET CLOSING BALANCE', 580, currentY + 24);
  const statusColor = data.closingBalance > 0 ? '#dc2626' : data.closingBalance < 0 ? '#16a34a' : '#0f172a';
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatCurrency(Math.abs(data.closingBalance), data.currency), 580, currentY + 50);
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(`STATUS: ${data.closingStatus}`, 580, currentY + 70);

  // 8. Footer Note
  currentY += summaryBoxHeight + 16;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Thank you for your business. Verified by ${data.company.businessName} · Total ${data.entries.length} records.`, 24, currentY + 14);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create ledger canvas blob'));
    }, 'image/png', 0.95);
  });
}

/**
 * Universal WhatsApp sharing orchestrator for Party Ledger.
 * Provides PDF, Image, or Text sharing with mobile Web Share API and desktop WhatsApp chat.
 */
export async function shareLedger(
  data: PreparedLedgerData,
  format: 'pdf' | 'image' | 'text' = 'pdf'
): Promise<{ success: boolean; method: string; error?: string }> {
  const party = data.party;
  const company = data.company;
  const targetPhone = party.whatsapp || party.phone || '';

  const summaryText =
    `*Account Statement - ${company.businessName}*\n\n` +
    `Dear *${party.name}*,\n` +
    `Here is your account statement for *${data.periodLabel}*:\n\n` +
    `• *Opening Balance:* ${data.openingBalanceFormatted}\n` +
    `• *Period Debits:* ${formatCurrency(data.totalDebit, data.currency)}\n` +
    `• *Period Credits:* ${formatCurrency(data.totalCredit, data.currency)}\n` +
    `• *Closing Balance:* ${formatCurrency(Math.abs(data.closingBalance), data.currency)} (${data.closingStatus})\n\n` +
    `_Official statement issued by ${company.businessName}._`;

  if (format === 'text') {
    openWhatsAppChat(targetPhone, summaryText);
    return { success: true, method: 'whatsapp_web' };
  }

  if (format === 'pdf') {
    const filename = `Party-Ledger-${party.name.replace(/\s+/g, '_')}-${getTodayDateString()}.pdf`;
    const pdfBlob = await generateLedgerPdf(data);

    // Mobile Web Share API
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Account Statement - ${party.name}`,
            text: summaryText,
            files: [file],
          });
          return { success: true, method: 'web_share' };
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return { success: true, method: 'web_share_cancelled' };
      }
    }

    // Fallback: Download file + copy text + open WhatsApp
    downloadBlob(pdfBlob, filename);
    await copyTextToClipboard(summaryText);
    openWhatsAppChat(targetPhone, summaryText);
    return { success: true, method: 'download_and_whatsapp' };
  }

  // format === 'image'
  const imgFilename = `Party-Ledger-${party.name.replace(/\s+/g, '_')}-${getTodayDateString()}.png`;
  const imgBlob = await generateLedgerImage(data);

  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([imgBlob], imgFilename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Account Statement - ${party.name}`,
          text: summaryText,
          files: [file],
        });
        return { success: true, method: 'web_share' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return { success: true, method: 'web_share_cancelled' };
    }
  }

  // Desktop Fallback
  await copyImageToClipboard(imgBlob);
  downloadBlob(imgBlob, imgFilename);
  openWhatsAppChat(targetPhone, summaryText);
  return { success: true, method: 'clipboard_and_whatsapp' };
}
