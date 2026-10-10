import {
  Account,
  AccountTransfer,
  BankLedgerEntry,
  CashLedgerEntry,
  Expense,
  Invoice,
  LedgerEntry,
  ManualTransaction,
  Party,
  PartyBalanceSummary,
  Payment,
  Purchase,
  DonationRecord,
  DonationSettings,
} from '../types';
import {
  getAccounts,
  getDonations,
  getDonationSettings,
  getExpenses,
  getInvoices,
  getManualTransactions,
  getParties,
  getPayments,
  getPurchases,
  getTransfers,
} from '../db/storage';
import { getTodayDateString, formatDate } from './formatters';

/**
 * Calculate the current outstanding balance for a specific party
 * For Customer:
 *   Positive = Customer owes business (Receivable)
 *   Negative = Business owes customer (Advance / Payable)
 * For Supplier:
 *   Positive = Business owes supplier (Payable)
 *   Negative = Supplier owes business (Advance / Debit)
 */
export function calculatePartyBalance(
  party: Party,
  invoices: Invoice[] = getInvoices(),
  payments: Payment[] = getPayments(),
  excludeInvoiceId?: string,
  purchases: Purchase[] = getPurchases(),
  manualTransactions: ManualTransaction[] = getManualTransactions()
): number {
  const isSupplier = party.partyType === 'supplier';

  if (isSupplier) {
    // ---------------- SUPPLIER CALCULATION ----------------
    // Opening balance: if payable, positive; if advance/receivable, negative
    let payable = party.balanceType === 'payable' ? party.openingBalance : -party.openingBalance;

    // Credit Purchases (adds to payable)
    const partyPurchases = purchases.filter((pur) => pur.partyId === party.id);
    const totalPurchases = partyPurchases.reduce((sum, pur) => sum + (pur.grandTotal || 0), 0);

    // Supplier Payments Made (reduces payable)
    const partyPayments = payments.filter((pay) => pay.partyId === party.id);
    const totalPaymentsMade = partyPayments
      .filter((pay) => pay.paymentType === 'paid')
      .reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const totalRefundsReceived = partyPayments
      .filter((pay) => pay.paymentType === 'received')
      .reduce((sum, pay) => sum + (pay.amount || 0), 0);

    // Manual supplier adjustments
    const partyManual = manualTransactions.filter((m) => m.partyId === party.id);
    const manualCredits = partyManual
      .filter((m) => m.transactionType === 'party_credit')
      .reduce((sum, m) => sum + (m.amount || 0), 0); // Increases payable
    const manualDebits = partyManual
      .filter((m) => m.transactionType === 'party_debit')
      .reduce((sum, m) => sum + (m.amount || 0), 0); // Decreases payable

    payable += (totalPurchases - totalPaymentsMade + totalRefundsReceived + manualCredits - manualDebits);
    return payable;
  }

  // ---------------- CUSTOMER CALCULATION ----------------
  // Opening balance: if receivable, positive; if advance/payable, negative
  let receivable = party.balanceType === 'receivable' ? party.openingBalance : -party.openingBalance;

  // Filter invoices for this party (excluding the current invoice when editing)
  const partyInvoices = invoices.filter(
    (inv) => inv.partyId === party.id && (!excludeInvoiceId || inv.id !== excludeInvoiceId)
  );
  const totalSales = partyInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  // Any manual adjustments attached to previous invoices
  const totalManualAdjustments = partyInvoices.reduce((sum, inv) => sum + (inv.manualAdjustment || 0), 0);

  // Filter payments for this party (excluding payment linked to the current invoice when editing)
  const partyPayments = payments.filter(
    (pay) => pay.partyId === party.id && (!excludeInvoiceId || pay.invoiceId !== excludeInvoiceId)
  );
  const totalReceived = partyPayments
    .filter((pay) => !pay.paymentType || pay.paymentType === 'received')
    .reduce((sum, pay) => sum + (pay.amount || 0), 0);
  const totalPaidOut = partyPayments
    .filter((pay) => pay.paymentType === 'paid')
    .reduce((sum, pay) => sum + (pay.amount || 0), 0);

  // Manual customer adjustments
  const partyManual = manualTransactions.filter((m) => m.partyId === party.id);
  const manualDebits = partyManual
    .filter((m) => m.transactionType === 'party_debit')
    .reduce((sum, m) => sum + (m.amount || 0), 0); // Increases customer receivable
  const manualCredits = partyManual
    .filter((m) => m.transactionType === 'party_credit')
    .reduce((sum, m) => sum + (m.amount || 0), 0); // Decreases customer receivable

  receivable += (totalSales + totalManualAdjustments + totalPaidOut - totalReceived + manualDebits - manualCredits);
  return receivable;
}

/**
 * Calculate detailed balance breakdown for a party:
 * - previousReceivable: sum of opening receivable + all previous sales (debits)
 * - previousPayable: sum of opening payable + all previous payments received (credits)
 * - netBalance: difference (positive = Receivable, negative = Payable)
 */
export function calculatePartyDetailedBalance(
  party: Party,
  invoices: Invoice[] = getInvoices(),
  payments: Payment[] = getPayments(),
  excludeInvoiceId?: string,
  purchases: Purchase[] = getPurchases(),
  manualTransactions: ManualTransaction[] = getManualTransactions()
): PartyBalanceSummary {
  const isSupplier = party.partyType === 'supplier';

  if (isSupplier) {
    const openingPayable = party.balanceType === 'payable' ? party.openingBalance : 0;
    const openingAdvance = party.balanceType === 'receivable' ? party.openingBalance : 0;

    const partyPurchases = purchases.filter((pur) => pur.partyId === party.id);
    const totalPurchases = partyPurchases.reduce((sum, pur) => sum + (pur.grandTotal || 0), 0);

    const partyPayments = payments.filter((pay) => pay.partyId === party.id);
    const totalPaidOut = partyPayments
      .filter((pay) => pay.paymentType === 'paid')
      .reduce((sum, pay) => sum + (pay.amount || 0), 0);

    const partyManual = manualTransactions.filter((m) => m.partyId === party.id);
    const manualCredits = partyManual
      .filter((m) => m.transactionType === 'party_credit')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    const manualDebits = partyManual
      .filter((m) => m.transactionType === 'party_debit')
      .reduce((sum, m) => sum + (m.amount || 0), 0);

    const totalCredits = openingPayable + totalPurchases + manualCredits;
    const totalDebits = openingAdvance + totalPaidOut + manualDebits;
    const netBalance = totalCredits - totalDebits;

    return {
      partyId: party.id,
      partyName: party.name,
      previousReceivable: totalDebits,
      previousPayable: totalCredits,
      netBalance,
      balanceType: netBalance > 0 ? 'payable' : netBalance < 0 ? 'receivable' : 'zero',
    };
  }

  // Customer calculation
  const openingReceivable = party.balanceType === 'receivable' ? party.openingBalance : 0;
  const openingPayable = party.balanceType === 'payable' ? party.openingBalance : 0;

  const partyInvoices = invoices.filter(
    (inv) => inv.partyId === party.id && (!excludeInvoiceId || inv.id !== excludeInvoiceId)
  );
  const totalSales = partyInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalManualAdjustments = partyInvoices.reduce((sum, inv) => sum + (inv.manualAdjustment || 0), 0);

  const partyPayments = payments.filter(
    (pay) => pay.partyId === party.id && (!excludeInvoiceId || pay.invoiceId !== excludeInvoiceId)
  );
  const totalReceived = partyPayments
    .filter((pay) => !pay.paymentType || pay.paymentType === 'received')
    .reduce((sum, pay) => sum + (pay.amount || 0), 0);
  const totalPaidOut = partyPayments
    .filter((pay) => pay.paymentType === 'paid')
    .reduce((sum, pay) => sum + (pay.amount || 0), 0);

  const partyManual = manualTransactions.filter((m) => m.partyId === party.id);
  const manualDebits = partyManual
    .filter((m) => m.transactionType === 'party_debit')
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const manualCredits = partyManual
    .filter((m) => m.transactionType === 'party_credit')
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  const previousReceivable =
    openingReceivable + totalSales + (totalManualAdjustments > 0 ? totalManualAdjustments : 0) + totalPaidOut + manualDebits;
  const previousPayable =
    openingPayable + totalReceived + (totalManualAdjustments < 0 ? Math.abs(totalManualAdjustments) : 0) + manualCredits;
  const netBalance = previousReceivable - previousPayable;

  let balanceType: 'receivable' | 'payable' | 'zero' = 'zero';
  if (netBalance > 0) balanceType = 'receivable';
  else if (netBalance < 0) balanceType = 'payable';

  return {
    partyId: party.id,
    partyName: party.name,
    previousReceivable,
    previousPayable,
    netBalance,
    balanceType,
  };
}

/**
 * Generate full running ledger for a party (Customer or Supplier)
 * Columns: Date, Invoice/Reference No., Description, Debit, Credit, Previous Balance, Closing Balance
 */
export function generatePartyLedger(
  party: Party,
  invoices: Invoice[] = getInvoices(),
  payments: Payment[] = getPayments(),
  purchases: Purchase[] = getPurchases(),
  manualTransactions: ManualTransaction[] = getManualTransactions()
): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const isSupplier = party.partyType === 'supplier';
  let running = 0;

  // 1. Opening balance entry
  if (party.openingBalance > 0) {
    if (isSupplier) {
      const isPayable = party.balanceType === 'payable';
      running = isPayable ? party.openingBalance : -party.openingBalance;
      entries.push({
        id: `opening_${party.id}`,
        date: party.createdAt ? party.createdAt.split('T')[0] : getTodayDateString(),
        time: '00:00',
        type: 'OPENING',
        referenceNo: 'OPENING',
        referenceId: party.id,
        description: `Opening Balance (${isPayable ? 'Payable' : 'Advance Paid'})`,
        debit: !isPayable ? party.openingBalance : 0,
        credit: isPayable ? party.openingBalance : 0,
        previousBalance: 0,
        runningBalance: running,
      });
    } else {
      const isReceivable = party.balanceType === 'receivable';
      running = isReceivable ? party.openingBalance : -party.openingBalance;
      entries.push({
        id: `opening_${party.id}`,
        date: party.createdAt ? party.createdAt.split('T')[0] : getTodayDateString(),
        time: '00:00',
        type: 'OPENING',
        referenceNo: 'OPENING',
        referenceId: party.id,
        description: `Opening Balance (${isReceivable ? 'Receivable' : 'Advance Received'})`,
        debit: isReceivable ? party.openingBalance : 0,
        credit: !isReceivable ? party.openingBalance : 0,
        previousBalance: 0,
        runningBalance: running,
      });
    }
  }

  interface RawItem {
    id: string;
    date: string;
    time: string;
    type: 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT' | 'MANUAL';
    referenceNo: string;
    referenceId: string;
    description: string;
    debit: number;
    credit: number;
    createdAt: string;
  }

  const rawItems: RawItem[] = [];

  if (isSupplier) {
    // Supplier purchases
    const partyPurchases = purchases.filter((pur) => pur.partyId === party.id);
    for (const pur of partyPurchases) {
      rawItems.push({
        id: pur.id,
        date: pur.date,
        time: pur.time || '12:00',
        type: 'PURCHASE',
        referenceNo: pur.purchaseNo,
        referenceId: pur.id,
        description: pur.notes ? `Purchase Bill - ${pur.notes}` : `Purchase Bill #${pur.purchaseNo}`,
        debit: 0,
        credit: pur.grandTotal, // Increases supplier payable
        createdAt: pur.createdAt,
      });
    }

    // Supplier payments
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
        debit: isOutflow ? pay.amount : 0, // Decreases payable
        credit: !isOutflow ? pay.amount : 0,
        createdAt: pay.createdAt,
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
        debit: !isCredit ? m.amount : 0, // Debit reduces supplier payable
        credit: isCredit ? m.amount : 0, // Credit increases supplier payable
        createdAt: m.createdAt,
      });
    }
  } else {
    // Customer Invoices
    const partyInvoices = invoices.filter((inv) => inv.partyId === party.id);
    for (const inv of partyInvoices) {
      // Manual adjustment attached to invoice
      if (inv.manualAdjustment && inv.manualAdjustment !== 0) {
        rawItems.push({
          id: `adj_${inv.id}`,
          date: inv.date,
          time: inv.time || '11:59',
          type: 'ADJUSTMENT',
          referenceNo: `ADJ-${inv.invoiceNo}`,
          referenceId: inv.id,
          description: `Manual Balance Adjustment (Invoice #${inv.invoiceNo})`,
          debit: inv.manualAdjustment > 0 ? inv.manualAdjustment : 0,
          credit: inv.manualAdjustment < 0 ? Math.abs(inv.manualAdjustment) : 0,
          createdAt: inv.createdAt,
        });
      }

      rawItems.push({
        id: inv.id,
        date: inv.date,
        time: inv.time || '12:00',
        type: 'INVOICE',
        referenceNo: inv.invoiceNo,
        referenceId: inv.id,
        description: inv.notes ? `Sale - ${inv.notes}` : `Invoice Sale`,
        debit: inv.grandTotal, // Increases customer receivable
        credit: 0,
        createdAt: inv.createdAt,
      });
    }

    // Customer Payments
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
        credit: !isOutflow ? pay.amount : 0, // Decreases customer receivable
        createdAt: pay.createdAt,
      });
    }

    // Manual customer entries
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
        debit: isDebit ? m.amount : 0, // Debit increases customer receivable
        credit: !isDebit ? m.amount : 0, // Credit decreases customer receivable
        createdAt: m.createdAt,
      });
    }
  }

  // Sort chronologically
  rawItems.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    const timeComp = (a.time || '').localeCompare(b.time || '');
    if (timeComp !== 0) return timeComp;
    if (a.type !== b.type) {
      if (a.type === 'ADJUSTMENT') return -1;
      if (b.type === 'ADJUSTMENT') return 1;
      return a.type === 'INVOICE' || a.type === 'PURCHASE' ? -1 : 1;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  // Calculate running balances with explicit previousBalance per row
  for (const item of rawItems) {
    const prev = running;
    if (isSupplier) {
      // Supplier running balance: Payable increases with Credit, decreases with Debit
      running = running + item.credit - item.debit;
    } else {
      // Customer running balance: Receivable increases with Debit, decreases with Credit
      running = running + item.debit - item.credit;
    }

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
      previousBalance: prev,
      runningBalance: running,
    });
  }

  return entries;
}

export interface ScopedPartyLedger {
  periodOpeningBalance: number;
  openingEntry: LedgerEntry;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  periodLabel: string;
}

/**
 * Generate a date-scoped party ledger with mathematically accurate opening balance and running balances.
 * Respects startDate and endDate while bringing forward the prior accumulated balance into the opening balance.
 */
export function getScopedPartyLedger(
  party: Party,
  startDate?: string,
  endDate?: string,
  invoices: Invoice[] = getInvoices(),
  payments: Payment[] = getPayments(),
  purchases: Purchase[] = getPurchases(),
  manualTransactions: ManualTransaction[] = getManualTransactions()
): ScopedPartyLedger {
  const isSupplier = party.partyType === 'supplier';
  const allEntries = generatePartyLedger(party, invoices, payments, purchases, manualTransactions);

  let periodOpeningBalance = 0;

  if (startDate) {
    // Find all entries strictly before startDate
    const priorEntries = allEntries.filter((e) => e.date < startDate);
    if (priorEntries.length > 0) {
      // The running balance of the last entry before startDate is the period opening balance
      periodOpeningBalance = priorEntries[priorEntries.length - 1].runningBalance;
    } else {
      // If no entries prior, check if party opening balance was created before or at startDate
      const partyCreatedDate = party.createdAt ? party.createdAt.split('T')[0] : getTodayDateString();
      if (partyCreatedDate <= startDate && party.openingBalance > 0) {
        if (isSupplier) {
          periodOpeningBalance = party.balanceType === 'payable' ? party.openingBalance : -party.openingBalance;
        } else {
          periodOpeningBalance = party.balanceType === 'receivable' ? party.openingBalance : -party.openingBalance;
        }
      } else {
        periodOpeningBalance = 0;
      }
    }
  } else {
    // No startDate: the party opening balance is the period opening balance
    if (party.openingBalance > 0) {
      if (isSupplier) {
        periodOpeningBalance = party.balanceType === 'payable' ? party.openingBalance : -party.openingBalance;
      } else {
        periodOpeningBalance = party.balanceType === 'receivable' ? party.openingBalance : -party.openingBalance;
      }
    } else {
      periodOpeningBalance = 0;
    }
  }

  // Create the period opening entry
  const openingEntry: LedgerEntry = {
    id: `period_opening_${party.id}`,
    date: startDate || (party.createdAt ? party.createdAt.split('T')[0] : getTodayDateString()),
    time: '00:00',
    type: 'OPENING',
    referenceNo: startDate ? 'B/F' : 'OPENING',
    referenceId: party.id,
    description: startDate ? 'Opening Balance (Brought Forward)' : 'Opening Balance',
    debit: 0,
    credit: 0,
    previousBalance: 0,
    runningBalance: periodOpeningBalance,
  };

  // Filter period transactions (excluding any original OPENING entry since it is now represented by openingEntry)
  const periodTransactions = allEntries.filter((entry) => {
    if (entry.type === 'OPENING') return false;
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });

  // Recompute previousBalance and runningBalance starting from periodOpeningBalance
  let currentRunning = periodOpeningBalance;
  const scopedEntries: LedgerEntry[] = [openingEntry];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const item of periodTransactions) {
    const prev = currentRunning;
    if (isSupplier) {
      currentRunning = currentRunning + item.credit - item.debit;
    } else {
      currentRunning = currentRunning + item.debit - item.credit;
    }

    totalDebit += item.debit;
    totalCredit += item.credit;

    scopedEntries.push({
      ...item,
      previousBalance: prev,
      runningBalance: currentRunning,
    });
  }

  // Period label
  let periodLabel = 'All Transactions (Complete History)';
  if (startDate && endDate) {
    periodLabel = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  } else if (startDate) {
    periodLabel = `From ${formatDate(startDate)} to Present`;
  } else if (endDate) {
    periodLabel = `Up to ${formatDate(endDate)}`;
  }

  return {
    periodOpeningBalance,
    openingEntry,
    entries: scopedEntries,
    totalDebit,
    totalCredit,
    closingBalance: currentRunning,
    periodLabel,
  };
}

/**
 * Generate complete Cash Ledger / Cash Book
 * Closing Cash = Opening Cash + Total Cash In - Total Cash Out
 */
export function generateCashLedger(
  startDate?: string,
  endDate?: string,
  payments: Payment[] = getPayments(),
  expenses: Expense[] = getExpenses(),
  transfers: AccountTransfer[] = getTransfers(),
  manualTransactions: ManualTransaction[] = getManualTransactions(),
  accounts: Account[] = getAccounts()
): {
  openingBalance: number;
  entries: CashLedgerEntry[];
  totalCashIn: number;
  totalCashOut: number;
  closingBalance: number;
} {
  const cashAccount = accounts.find((a) => a.id === 'acc_cash' || a.accountType === 'cash');
  const initialOpening = cashAccount?.openingBalance || 0;

  interface RawCashItem {
    id: string;
    date: string;
    time: string;
    referenceNo: string;
    description: string;
    partyName?: string;
    cashIn: number;
    cashOut: number;
    type: CashLedgerEntry['type'];
    createdAt: string;
  }

  const allItems: RawCashItem[] = [];

  // 1. Payments Received in Cash (Customer receipts)
  const cashReceipts = payments.filter(
    (p) => p.method === 'Cash' && (!p.paymentType || p.paymentType === 'received')
  );
  for (const p of cashReceipts) {
    allItems.push({
      id: p.id,
      date: p.date,
      time: p.time || '12:00',
      referenceNo: p.reference || `PAY-${p.id.slice(-4)}`,
      description: p.notes ? `Customer Receipt - ${p.notes}` : `Payment Received (${p.partyName})`,
      partyName: p.partyName,
      cashIn: p.amount,
      cashOut: 0,
      type: 'receipt',
      createdAt: p.createdAt,
    });
  }

  // 2. Payments Made to Suppliers in Cash
  const cashPaymentsOut = payments.filter(
    (p) => p.method === 'Cash' && p.paymentType === 'paid'
  );
  for (const p of cashPaymentsOut) {
    allItems.push({
      id: p.id,
      date: p.date,
      time: p.time || '12:00',
      referenceNo: p.reference || `PAY-${p.id.slice(-4)}`,
      description: p.notes ? `Supplier Payment - ${p.notes}` : `Payment Made (${p.partyName})`,
      partyName: p.partyName,
      cashIn: 0,
      cashOut: p.amount,
      type: 'supplier_payment',
      createdAt: p.createdAt,
    });
  }

  // 3. Expenses Paid in Cash
  const cashExpenses = expenses.filter(
    (e) => e.paymentMethod === 'Cash' || e.accountId === 'acc_cash'
  );
  for (const e of cashExpenses) {
    allItems.push({
      id: e.id,
      date: e.date,
      time: e.time || '12:00',
      referenceNo: e.reference || `EXP-${e.id.slice(-4)}`,
      description: `Expense: ${e.categoryName}${e.description ? ` - ${e.description}` : ''}`,
      cashIn: 0,
      cashOut: e.amount,
      type: 'expense',
      createdAt: e.createdAt,
    });
  }

  // 4. Manual Cash Entries (Cash In / Cash Out)
  const cashManual = manualTransactions.filter(
    (m) => m.transactionType === 'cash_in' || m.transactionType === 'cash_out'
  );
  for (const m of cashManual) {
    const isIn = m.transactionType === 'cash_in';
    allItems.push({
      id: m.id,
      date: m.date,
      time: m.time || '12:00',
      referenceNo: m.reference || `MAN-${m.id.slice(-4)}`,
      description: m.description || (isIn ? 'Manual Cash In' : 'Manual Cash Out'),
      partyName: m.partyName,
      cashIn: isIn ? m.amount : 0,
      cashOut: !isIn ? m.amount : 0,
      type: isIn ? 'manual_in' : 'manual_out',
      createdAt: m.createdAt,
    });
  }

  // 5. Account Transfers (Cash to Bank or Bank to Cash)
  for (const t of transfers) {
    if (t.toAccountId === 'acc_cash') {
      // Transfer into cash
      allItems.push({
        id: `trf_in_${t.id}`,
        date: t.date,
        time: t.time || '12:00',
        referenceNo: t.reference || `TRF-${t.id.slice(-4)}`,
        description: `Transfer from ${t.fromAccountName}${t.description ? ` (${t.description})` : ''}`,
        cashIn: t.amount,
        cashOut: 0,
        type: 'transfer_in',
        createdAt: t.createdAt,
      });
    }
    if (t.fromAccountId === 'acc_cash') {
      // Transfer out of cash
      allItems.push({
        id: `trf_out_${t.id}`,
        date: t.date,
        time: t.time || '12:00',
        referenceNo: t.reference || `TRF-${t.id.slice(-4)}`,
        description: `Transfer to ${t.toAccountName}${t.description ? ` (${t.description})` : ''}`,
        cashIn: 0,
        cashOut: t.amount,
        type: 'transfer_out',
        createdAt: t.createdAt,
      });
    }
  }

  // Sort chronologically
  allItems.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    const timeComp = (a.time || '').localeCompare(b.time || '');
    if (timeComp !== 0) return timeComp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  // Calculate prior opening if date filtered
  let opening = initialOpening;
  if (startDate) {
    const priorItems = allItems.filter((item) => item.date < startDate);
    for (const item of priorItems) {
      opening = opening + item.cashIn - item.cashOut;
    }
  }

  let filtered = allItems;
  if (startDate) {
    filtered = filtered.filter((item) => item.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((item) => item.date <= endDate);
  }

  let running = opening;
  const entries: CashLedgerEntry[] = [];
  let totalCashIn = 0;
  let totalCashOut = 0;

  for (const item of filtered) {
    running = running + item.cashIn - item.cashOut;
    totalCashIn += item.cashIn;
    totalCashOut += item.cashOut;

    entries.push({
      id: item.id,
      date: item.date,
      time: item.time,
      referenceNo: item.referenceNo,
      description: item.description,
      partyName: item.partyName,
      cashIn: item.cashIn,
      cashOut: item.cashOut,
      balance: running,
      type: item.type,
    });
  }

  return {
    openingBalance: opening,
    entries,
    totalCashIn,
    totalCashOut,
    closingBalance: running,
  };
}

/**
 * Generate Bank Ledger for a specific Bank Account (or default primary)
 * Closing Bank = Opening Bank + Total Bank In - Total Bank Out
 */
export function generateBankLedger(
  targetAccountId?: string,
  startDate?: string,
  endDate?: string,
  payments: Payment[] = getPayments(),
  expenses: Expense[] = getExpenses(),
  transfers: AccountTransfer[] = getTransfers(),
  manualTransactions: ManualTransaction[] = getManualTransactions(),
  accounts: Account[] = getAccounts()
): {
  account: Account | null;
  openingBalance: number;
  entries: BankLedgerEntry[];
  totalBankIn: number;
  totalBankOut: number;
  closingBalance: number;
} {
  const bankAccounts = accounts.filter((a) => a.accountType === 'bank');
  const targetAccount = targetAccountId
    ? accounts.find((a) => a.id === targetAccountId) || bankAccounts[0] || null
    : bankAccounts[0] || null;

  if (!targetAccount) {
    return {
      account: null,
      openingBalance: 0,
      entries: [],
      totalBankIn: 0,
      totalBankOut: 0,
      closingBalance: 0,
    };
  }

  const initialOpening = targetAccount.openingBalance || 0;

  interface RawBankItem {
    id: string;
    date: string;
    time: string;
    referenceNo: string;
    description: string;
    partyName?: string;
    bankIn: number;
    bankOut: number;
    type: BankLedgerEntry['type'];
    createdAt: string;
  }

  const allItems: RawBankItem[] = [];
  const accId = targetAccount.id;
  const isDefaultBank = bankAccounts[0]?.id === accId;

  // 1. Bank Payments Received
  const bankReceipts = payments.filter((p) => {
    if (p.paymentType === 'paid') return false;
    if (p.accountId === accId) return true;
    if (!p.accountId && isDefaultBank && (p.method === 'Bank' || p.method === targetAccount.accountName)) {
      return true;
    }
    return false;
  });

  for (const p of bankReceipts) {
    allItems.push({
      id: p.id,
      date: p.date,
      time: p.time || '12:00',
      referenceNo: p.reference || `PAY-${p.id.slice(-4)}`,
      description: p.notes ? `Bank Receipt - ${p.notes}` : `Payment Received (${p.partyName})`,
      partyName: p.partyName,
      bankIn: p.amount,
      bankOut: 0,
      type: 'receipt',
      createdAt: p.createdAt,
    });
  }

  // 2. Bank Payments Made to Suppliers
  const bankPaymentsOut = payments.filter((p) => {
    if (p.paymentType !== 'paid') return false;
    if (p.accountId === accId) return true;
    if (!p.accountId && isDefaultBank && (p.method === 'Bank' || p.method === targetAccount.accountName)) {
      return true;
    }
    return false;
  });

  for (const p of bankPaymentsOut) {
    allItems.push({
      id: p.id,
      date: p.date,
      time: p.time || '12:00',
      referenceNo: p.reference || `PAY-${p.id.slice(-4)}`,
      description: p.notes ? `Supplier Bank Payment - ${p.notes}` : `Payment Made (${p.partyName})`,
      partyName: p.partyName,
      bankIn: 0,
      bankOut: p.amount,
      type: 'supplier_payment',
      createdAt: p.createdAt,
    });
  }

  // 3. Expenses Paid Through Bank
  const bankExpenses = expenses.filter((e) => {
    if (e.accountId === accId) return true;
    if (!e.accountId && isDefaultBank && (e.paymentMethod === 'Bank' || e.paymentMethod === targetAccount.accountName)) {
      return true;
    }
    return false;
  });

  for (const e of bankExpenses) {
    allItems.push({
      id: e.id,
      date: e.date,
      time: e.time || '12:00',
      referenceNo: e.reference || `EXP-${e.id.slice(-4)}`,
      description: `Bank Expense: ${e.categoryName}${e.description ? ` - ${e.description}` : ''}`,
      bankIn: 0,
      bankOut: e.amount,
      type: 'expense',
      createdAt: e.createdAt,
    });
  }

  // 4. Manual Bank Entries (Deposit / Withdrawal)
  const bankManual = manualTransactions.filter((m) => {
    if (m.accountId === accId) return true;
    if (!m.accountId && isDefaultBank && (m.transactionType === 'bank_deposit' || m.transactionType === 'bank_withdrawal')) {
      return true;
    }
    return false;
  });

  for (const m of bankManual) {
    const isDeposit = m.transactionType === 'bank_deposit';
    allItems.push({
      id: m.id,
      date: m.date,
      time: m.time || '12:00',
      referenceNo: m.reference || `MAN-${m.id.slice(-4)}`,
      description: m.description || (isDeposit ? 'Bank Deposit' : 'Bank Withdrawal'),
      partyName: m.partyName,
      bankIn: isDeposit ? m.amount : 0,
      bankOut: !isDeposit ? m.amount : 0,
      type: isDeposit ? 'deposit' : 'withdrawal',
      createdAt: m.createdAt,
    });
  }

  // 5. Account Transfers
  for (const t of transfers) {
    if (t.toAccountId === accId) {
      allItems.push({
        id: `trf_in_${t.id}`,
        date: t.date,
        time: t.time || '12:00',
        referenceNo: t.reference || `TRF-${t.id.slice(-4)}`,
        description: `Transfer from ${t.fromAccountName}${t.description ? ` (${t.description})` : ''}`,
        bankIn: t.amount,
        bankOut: 0,
        type: 'transfer_in',
        createdAt: t.createdAt,
      });
    }
    if (t.fromAccountId === accId) {
      allItems.push({
        id: `trf_out_${t.id}`,
        date: t.date,
        time: t.time || '12:00',
        referenceNo: t.reference || `TRF-${t.id.slice(-4)}`,
        description: `Transfer to ${t.toAccountName}${t.description ? ` (${t.description})` : ''}`,
        bankIn: 0,
        bankOut: t.amount,
        type: 'transfer_out',
        createdAt: t.createdAt,
      });
    }
  }

  // Sort chronologically
  allItems.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    const timeComp = (a.time || '').localeCompare(b.time || '');
    if (timeComp !== 0) return timeComp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  let opening = initialOpening;
  if (startDate) {
    const prior = allItems.filter((i) => i.date < startDate);
    for (const i of prior) {
      opening = opening + i.bankIn - i.bankOut;
    }
  }

  let filtered = allItems;
  if (startDate) filtered = filtered.filter((i) => i.date >= startDate);
  if (endDate) filtered = filtered.filter((i) => i.date <= endDate);

  let running = opening;
  const entries: BankLedgerEntry[] = [];
  let totalBankIn = 0;
  let totalBankOut = 0;

  for (const item of filtered) {
    running = running + item.bankIn - item.bankOut;
    totalBankIn += item.bankIn;
    totalBankOut += item.bankOut;

    entries.push({
      id: item.id,
      date: item.date,
      time: item.time,
      accountId: targetAccount.id,
      accountName: targetAccount.accountName,
      referenceNo: item.referenceNo,
      description: item.description,
      partyName: item.partyName,
      bankIn: item.bankIn,
      bankOut: item.bankOut,
      balance: running,
      type: item.type,
    });
  }

  return {
    account: targetAccount,
    openingBalance: opening,
    entries,
    totalBankIn,
    totalBankOut,
    closingBalance: running,
  };
}

export interface DashboardMetrics {
  todaySales: number;
  todayPurchase: number;
  todayExpense: number;
  todayReceived: number;
  todayPaid: number;
  todayInvoicesCount: number;
  totalPartiesCount: number;
  totalOutstanding: number;
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
  todayCashCollected: number;
  cashBalance: number;
  bankBalance: number;
  netProfit: number;
  // Donation Metrics
  todayDonation: number;
  todayDonatedQty: number;
  todayDonationInvoicesCount: number;
  monthDonation: number;
  monthDonatedQty: number;
  totalDonation: number;
  totalDonatedQty: number;
  currentDonationRate: number;
}

export interface PartyRowSummary {
  party: Party;
  partyName: string;
  partyType: 'Customer' | 'Supplier';
  openingBalance: number;
  totalSales: number;
  totalPurchases: number;
  totalDebit: number;
  totalCredit: number;
  totalPaymentsReceived: number;
  totalPaymentsMade: number;
  currentBalance: number;
  status: 'TO RECEIVE' | 'TO PAY' | 'SETTLED';
  lastTransactionDate: string | null;
}

/**
 * Calculate complete summary for all parties for Dashboard Party Balance Summary
 */
export function calculateAllPartiesSummary(
  parties: Party[] = getParties(),
  invoices: Invoice[] = getInvoices(),
  payments: Payment[] = getPayments(),
  purchases: Purchase[] = getPurchases(),
  manualTransactions: ManualTransaction[] = getManualTransactions()
): PartyRowSummary[] {
  return parties.map((party) => {
    const isSupplier = party.partyType === 'supplier';
    const currentBalance = calculatePartyBalance(
      party,
      invoices,
      payments,
      undefined,
      purchases,
      manualTransactions
    );

    // Invoices / Sales
    const partyInvoices = invoices.filter((inv) => inv.partyId === party.id);
    const totalSales = partyInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    // Purchases
    const partyPurchases = purchases.filter((pur) => pur.partyId === party.id);
    const totalPurchases = partyPurchases.reduce((sum, pur) => sum + (pur.grandTotal || 0), 0);

    // Payments
    const partyPayments = payments.filter((pay) => pay.partyId === party.id);
    const totalPaymentsReceived = partyPayments
      .filter((pay) => !pay.paymentType || pay.paymentType === 'received')
      .reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const totalPaymentsMade = partyPayments
      .filter((pay) => pay.paymentType === 'paid')
      .reduce((sum, pay) => sum + (pay.amount || 0), 0);

    // Opening
    const openingReceivable = party.balanceType === 'receivable' ? party.openingBalance : 0;
    const openingPayable = party.balanceType === 'payable' ? party.openingBalance : 0;

    let totalDebit = 0;
    let totalCredit = 0;
    let status: 'TO RECEIVE' | 'TO PAY' | 'SETTLED' = 'SETTLED';

    if (isSupplier) {
      totalDebit = openingReceivable + totalPaymentsMade;
      totalCredit = openingPayable + totalPurchases;
      if (currentBalance > 0) status = 'TO PAY';
      else if (currentBalance < 0) status = 'TO RECEIVE';
    } else {
      totalDebit = openingReceivable + totalSales + totalPaymentsMade;
      totalCredit = openingPayable + totalPaymentsReceived;
      if (currentBalance > 0) status = 'TO RECEIVE';
      else if (currentBalance < 0) status = 'TO PAY';
    }

    // Last Transaction Date
    let lastDate: string | null = party.createdAt ? party.createdAt.split('T')[0] : null;
    for (const inv of partyInvoices) {
      if (!lastDate || inv.date > lastDate) lastDate = inv.date;
    }
    for (const pur of partyPurchases) {
      if (!lastDate || pur.date > lastDate) lastDate = pur.date;
    }
    for (const pay of partyPayments) {
      if (!lastDate || pay.date > lastDate) lastDate = pay.date;
    }

    return {
      party,
      partyName: party.name,
      partyType: isSupplier ? 'Supplier' : 'Customer',
      openingBalance: party.openingBalance,
      totalSales,
      totalPurchases,
      totalDebit,
      totalCredit,
      totalPaymentsReceived,
      totalPaymentsMade,
      currentBalance,
      status,
      lastTransactionDate: lastDate,
    };
  });
}

/**
 * Compute real-time dashboard figures from LocalStorage & Firebase
 */
export function calculateDashboardMetrics(
  parties: Party[] = getParties(),
  invoices: Invoice[] = getInvoices(),
  payments: Payment[] = getPayments(),
  purchases: Purchase[] = getPurchases(),
  expenses: Expense[] = getExpenses(),
  transfers: AccountTransfer[] = getTransfers(),
  manualTransactions: ManualTransaction[] = getManualTransactions(),
  accounts: Account[] = getAccounts()
): DashboardMetrics {
  const today = getTodayDateString();

  // Today's Sales
  const todayInvoices = invoices.filter((inv) => inv.date === today);
  const todaySales = todayInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const todayInvoicesCount = todayInvoices.length;

  // Today's Purchases
  const todayPurchasesList = purchases.filter((pur) => pur.date === today);
  const todayPurchase = todayPurchasesList.reduce((sum, pur) => sum + (pur.grandTotal || 0), 0);

  // Today's Expenses
  const todayExpensesList = expenses.filter((e) => e.date === today);
  const todayExpense = todayExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Today's Payments Received & Paid
  const todayPaymentsList = payments.filter((pay) => pay.date === today);
  const todayReceivedPayments = todayPaymentsList
    .filter((pay) => !pay.paymentType || pay.paymentType === 'received')
    .reduce((sum, pay) => sum + (pay.amount || 0), 0);

  const todayManualIn = manualTransactions
    .filter((m) => m.date === today && (m.transactionType === 'cash_in' || m.transactionType === 'bank_deposit'))
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const todayReceived = todayReceivedPayments + todayManualIn;

  const todayPaidOutPayments = todayPaymentsList
    .filter((pay) => pay.paymentType === 'paid')
    .reduce((sum, pay) => sum + (pay.amount || 0), 0);

  const todayManualOut = manualTransactions
    .filter((m) => m.date === today && (m.transactionType === 'cash_out' || m.transactionType === 'bank_withdrawal'))
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const todayPaid = todayPaidOutPayments + todayExpense + todayManualOut;

  // Today's Cash Collected
  const todayCashCollected = todayPaymentsList
    .filter((pay) => pay.method === 'Cash' && (!pay.paymentType || pay.paymentType === 'received'))
    .reduce((sum, pay) => sum + (pay.amount || 0), 0);

  // Total Parties Count
  const totalPartiesCount = parties.length;

  // Calculate Receivable vs Payable across Customers and Suppliers
  let totalReceivable = 0;
  let totalPayable = 0;

  for (const party of parties) {
    const balance = calculatePartyBalance(
      party,
      invoices,
      payments,
      undefined,
      purchases,
      manualTransactions
    );

    if (party.partyType === 'supplier') {
      if (balance > 0) {
        totalPayable += balance;
      } else if (balance < 0) {
        totalReceivable += Math.abs(balance); // Advance paid to supplier
      }
    } else {
      if (balance > 0) {
        totalReceivable += balance;
      } else if (balance < 0) {
        totalPayable += Math.abs(balance); // Advance received from customer
      }
    }
  }

  const netBalance = totalReceivable - totalPayable;
  const totalOutstanding = totalReceivable;

  // Cash in Hand Balance
  const cashLedgerData = generateCashLedger(
    undefined,
    undefined,
    payments,
    expenses,
    transfers,
    manualTransactions,
    accounts
  );
  const cashBalance = cashLedgerData.closingBalance;

  // Total Bank Balance across all active bank accounts
  let bankBalance = 0;
  const bankAccounts = accounts.filter((a) => a.accountType === 'bank' && a.isActive !== false);
  for (const bankAcc of bankAccounts) {
    const bankLedgerData = generateBankLedger(
      bankAcc.id,
      undefined,
      undefined,
      payments,
      expenses,
      transfers,
      manualTransactions,
      accounts
    );
    bankBalance += bankLedgerData.closingBalance;
  }

  // Net Profit for today (Sales - Expenses)
  const netProfit = todaySales - todayExpense;

  // ---------------- DONATION METRICS (Section 5 & 9) ----------------
  const donations = getDonations();
  const donationSettings = getDonationSettings();
  const currentDonationRate = donationSettings.enabled ? Math.max(0, Number(donationSettings.donationPerQty) || 0) : 0;
  const currentMonthPrefix = today.substring(0, 7);

  // Active donations (exclude Cancelled)
  const activeDonations = donations.filter((d) => d.status !== 'Cancelled');

  // Today's Donations
  const todayDonationRecords = activeDonations.filter((d) => d.date === today);
  const todayDonation = todayDonationRecords.reduce((sum, d) => sum + (Number(d.donationAmount) || 0), 0);
  const todayDonatedQty = todayDonationRecords.reduce((sum, d) => sum + (Number(d.totalQuantity) || 0), 0);
  const todayDonationInvoicesCount = todayDonationRecords.length;

  // This Month's Donations
  const monthDonationRecords = activeDonations.filter((d) => d.date && d.date.startsWith(currentMonthPrefix));
  const monthDonation = monthDonationRecords.reduce((sum, d) => sum + (Number(d.donationAmount) || 0), 0);
  const monthDonatedQty = monthDonationRecords.reduce((sum, d) => sum + (Number(d.totalQuantity) || 0), 0);

  // Lifetime Total Donations
  const totalDonation = activeDonations.reduce((sum, d) => sum + (Number(d.donationAmount) || 0), 0);
  const totalDonatedQty = activeDonations.reduce((sum, d) => sum + (Number(d.totalQuantity) || 0), 0);

  return {
    todaySales,
    todayPurchase,
    todayExpense,
    todayReceived,
    todayPaid,
    todayInvoicesCount,
    totalPartiesCount,
    totalOutstanding,
    totalReceivable,
    totalPayable,
    netBalance,
    todayCashCollected,
    cashBalance,
    bankBalance,
    netProfit,
    // Donation Metrics
    todayDonation,
    todayDonatedQty,
    todayDonationInvoicesCount,
    monthDonation,
    monthDonatedQty,
    totalDonation,
    totalDonatedQty,
    currentDonationRate,
  };
}

export interface DonationDailySummaryItem {
  date: string;
  totalQty: number;
  donationPerQty: number;
  dailyDonation: number;
  invoiceCount: number;
}

export interface DateWiseDonationReportData {
  startDate?: string;
  endDate?: string;
  totalInvoices: number;
  totalQuantity: number;
  currentRate: number;
  totalDonation: number;
  dailyBreakdown: DonationDailySummaryItem[];
}

/**
 * Generate complete Date-wise Donation Report with daily breakdown and grand totals
 */
export function generateDateWiseDonationReport(
  startDate?: string,
  endDate?: string,
  donations: DonationRecord[] = getDonations(),
  donationSettings: DonationSettings = getDonationSettings()
): DateWiseDonationReportData {
  // Filter active records by optional date range
  const filtered = donations.filter((d) => {
    if (d.status === 'Cancelled') return false;
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    return true;
  });

  const currentRate = donationSettings.enabled ? Math.max(0, Number(donationSettings.donationPerQty) || 0) : 0;
  const totalInvoices = filtered.length;
  const totalQuantity = filtered.reduce((sum, d) => sum + (Number(d.totalQuantity) || 0), 0);
  const totalDonation = filtered.reduce((sum, d) => sum + (Number(d.donationAmount) || 0), 0);

  // Group by date for daily breakdown
  const dailyMap = new Map<string, { totalQty: number; donationAmount: number; invoiceCount: number; lastRate: number }>();

  for (const item of filtered) {
    const prev = dailyMap.get(item.date) || { totalQty: 0, donationAmount: 0, invoiceCount: 0, lastRate: item.donationPerQty || currentRate };
    dailyMap.set(item.date, {
      totalQty: prev.totalQty + (Number(item.totalQuantity) || 0),
      donationAmount: prev.donationAmount + (Number(item.donationAmount) || 0),
      invoiceCount: prev.invoiceCount + 1,
      lastRate: item.donationPerQty || prev.lastRate,
    });
  }

  // Sort dates descending (newest first)
  const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => b.localeCompare(a));

  const dailyBreakdown: DonationDailySummaryItem[] = sortedDates.map((dStr) => {
    const data = dailyMap.get(dStr)!;
    return {
      date: dStr,
      totalQty: data.totalQty,
      donationPerQty: data.totalQty > 0 ? Math.round((data.donationAmount / data.totalQty) * 100) / 100 : data.lastRate,
      dailyDonation: data.donationAmount,
      invoiceCount: data.invoiceCount,
    };
  });

  return {
    startDate,
    endDate,
    totalInvoices,
    totalQuantity,
    currentRate,
    totalDonation,
    dailyBreakdown,
  };
}

export interface DayBookItem {
  id: string;
  date: string;
  time: string;
  type: 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'EXPENSE';
  reference: string;
  partyName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export function generateDayBook(
  date: string = getTodayDateString(),
  invoices: Invoice[] = getInvoices(),
  payments: Payment[] = getPayments(),
  purchases: Purchase[] = getPurchases(),
  expenses: Expense[] = getExpenses()
): { items: DayBookItem[]; totalDebit: number; totalCredit: number; netCashFlow: number } {
  const items: DayBookItem[] = [];

  const dateInvoices = invoices.filter((inv) => inv.date === date);
  for (const inv of dateInvoices) {
    items.push({
      id: inv.id,
      date: inv.date,
      time: inv.time || '12:00',
      type: 'INVOICE',
      reference: inv.invoiceNo,
      partyName: inv.partyName,
      description: `Invoice Sale${inv.notes ? ` - ${inv.notes}` : ''}`,
      debit: inv.grandTotal,
      credit: 0,
      balance: 0,
    });
  }

  const datePurchases = purchases.filter((pur) => pur.date === date);
  for (const pur of datePurchases) {
    items.push({
      id: pur.id,
      date: pur.date,
      time: pur.time || '12:00',
      type: 'PURCHASE',
      reference: pur.purchaseNo,
      partyName: pur.partyName,
      description: `Purchase Bill${pur.notes ? ` - ${pur.notes}` : ''}`,
      debit: 0,
      credit: pur.grandTotal,
      balance: 0,
    });
  }

  const datePayments = payments.filter((pay) => pay.date === date);
  for (const pay of datePayments) {
    const isOutflow = pay.paymentType === 'paid';
    items.push({
      id: pay.id,
      date: pay.date,
      time: pay.time || '12:00',
      type: 'PAYMENT',
      reference: pay.reference || `PAY-${pay.id.slice(-4)}`,
      partyName: pay.partyName,
      description: `${isOutflow ? 'Payment Made' : 'Payment Received'} (${pay.method})${pay.notes ? ` - ${pay.notes}` : ''}`,
      debit: isOutflow ? pay.amount : 0,
      credit: !isOutflow ? pay.amount : 0,
      balance: 0,
    });
  }

  const dateExpenses = expenses.filter((e) => e.date === date);
  for (const exp of dateExpenses) {
    items.push({
      id: exp.id,
      date: exp.date,
      time: exp.time || '12:00',
      type: 'EXPENSE',
      reference: exp.reference || `EXP-${exp.id.slice(-4)}`,
      partyName: exp.categoryName,
      description: `Expense (${exp.paymentMethod}): ${exp.description || exp.categoryName}`,
      debit: exp.amount,
      credit: 0,
      balance: 0,
    });
  }

  items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = items.reduce((sum, item) => sum + item.credit, 0);
  const netCashFlow = totalCredit - totalDebit;

  return {
    items,
    totalDebit,
    totalCredit,
    netCashFlow,
  };
}

// Backward-compatible alias for Cash Book
export function generateCashBook(
  startDate?: string,
  endDate?: string
) {
  const data = generateCashLedger(startDate, endDate);
  return {
    items: data.entries,
    transactions: data.entries,
    openingCash: data.openingBalance,
    totalInflow: data.totalCashIn,
    totalOutflow: data.totalCashOut,
    totalCashIn: data.totalCashIn,
    totalCashOut: data.totalCashOut,
    netCash: data.totalCashIn - data.totalCashOut,
    closingCash: data.closingBalance,
  };
}
