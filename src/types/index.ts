export type PaymentMethod = 'Cash' | 'Bank' | 'JazzCash' | 'Easypaisa' | 'Other';
export type InvoiceStatus = 'Paid' | 'Partial' | 'Credit';
export type BalanceType = 'receivable' | 'payable';
export type ProductUnit = 'Piece' | 'Dozen' | 'Box' | 'Kg' | 'Liter' | 'Meter' | 'Packet' | 'Other';

export type SoftwareTheme = 'purple' | 'blue' | 'green' | 'black' | 'minimal';
export type InvoiceTheme = 'purple' | 'blue' | 'green' | 'black' | 'white';
export type InvoiceHeaderStyle = 'premium' | 'classic' | 'simple' | 'centered' | 'modern';
export type InvoiceTableStyle = 'simple' | 'banded' | 'borders' | 'minimal' | 'modern';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type RowSpacing = 'compact' | 'normal' | 'relaxed';
export type CompanyPosition = 'left' | 'center';

export interface CompanySettings {
  businessName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  taxNtn: string;
  invoicePrefix: string;
  startingInvoiceNo: number;
  currency: string;
  thankYouMsg: string;
  termsConditions: string;
  logo: string; // base64 data url or empty
  inventoryEnabled: boolean;
}

export interface CustomColors {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  headerBgColor?: string;
}

export interface InvoiceSettings {
  theme: InvoiceTheme;
  headerStyle: InvoiceHeaderStyle;
  logoSize: 'small' | 'medium' | 'large';
  businessNameSize: 'small' | 'medium' | 'large';
  businessNamePosition: CompanyPosition;
  invoiceTitle: 'simple' | 'bold' | 'decorative';
  tableStyle: InvoiceTableStyle;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: FontFamily;
  rowSpacing: RowSpacing;
  priceFormat: 'symbol_space' | 'symbol_tight' | 'no_symbol'; // Rs. 1,500 | Rs 1,500 | 1,500
  timestampPos: 'top-left' | 'top-right' | 'bottom';
  customColors?: CustomColors;
  showLogo: boolean;
  showDateTime: boolean;
  showItemLines: boolean;
  showPrevBalance: boolean;
  showPaidAmount: boolean;
  showRemainingAmount: boolean;
  showCustomerPhone: boolean;
  showWhatsApp: boolean;
  showAddress: boolean;
  showSignature: boolean;
  showFooter: boolean;
  showThankYou: boolean;
  showTerms: boolean;
  // Column and Form visibility controls
  showProductDescription?: boolean;
  showProductSelectionInForm?: boolean;
  showItemQuantity?: boolean;
  showProductUnit?: boolean;
  showProductCode?: boolean;
  showItemRate?: boolean;
  showItemDiscount?: boolean;
  showItemAmount?: boolean;
  showItemIndex?: boolean;
}

export interface AppSettings {
  isConfigured: boolean;
  softwareTheme: SoftwareTheme;
  appLockEnabled: boolean;
  appLockPin: string; // 4-6 digit pin
  lastBackupDate: string | null;
  dateFormat: string;
  timeFormat: string;
}

export interface PartyBalanceSummary {
  partyId: string;
  partyName: string;
  previousReceivable: number;
  previousPayable: number;
  netBalance: number;
  balanceType: 'receivable' | 'payable' | 'zero';
}

export interface Party {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address: string;
  city: string;
  openingBalance: number;
  balanceType: BalanceType;
  partyType?: 'customer' | 'supplier' | 'both';
  creditLimit?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  code?: string;
  barcode?: string;
  category?: string;
  unit: ProductUnit;
  saleRate: number;
  stockQuantity: number;
  active: boolean;
  showOnInvoice?: boolean; // true (default) = show on invoice, false = hide from customer invoice documents
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  serialNo?: number;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number; // percentage or fixed amount
  discountType?: 'fixed' | 'percentage';
  amount: number; // (qty * rate) - discount
  showOnInvoice?: boolean; // true (default) = show on customer invoice, false = hide from customer display
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partyId: string;
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;
  salesperson?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number; // overall invoice discount
  discountType?: 'fixed' | 'percentage';
  grandTotal: number;
  previousBalanceMode?: 'ledger' | 'manual' | 'adjustment';
  ledgerPreviousBalance?: number;
  manualAdjustment?: number;
  manualPreviousBalance?: number;
  previousBalance: number;
  paidAmount: number;
  remainingAmount: number;
  newBalance: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  status: InvoiceStatus;
  totalQuantity?: number; // Total sold quantity across all line items
  donationPerQty?: number; // Donation rate at time of invoice creation (e.g. 2 for Rs. 2/pc)
  donationAmount?: number; // Total donation calculated: totalQuantity * donationPerQty
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partyId: string;
  partyName: string;
  amount: number;
  method: PaymentMethod | string;
  accountId?: string; // ID of selected Cash or Bank account
  accountName?: string; // Name of selected Cash or Bank account
  paymentType?: 'received' | 'paid';
  reference?: string;
  notes?: string;
  invoiceId?: string; // linked invoice if recorded during invoice creation
  createdAt: string;
  updatedAt: string;
}

export type AccountType = 'cash' | 'bank' | 'other';

export interface Account {
  id: string;
  accountName: string;
  accountType: AccountType;
  bankName?: string;
  accountNumber?: string;
  branch?: string;
  openingBalance: number;
  currentBalance?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  accountId: string; // Cash or Bank account
  accountName: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountTransfer {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  reference?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type ManualTransactionType =
  | 'cash_in'
  | 'cash_out'
  | 'bank_deposit'
  | 'bank_withdrawal'
  | 'adjustment'
  | 'party_debit'
  | 'party_credit';

export interface ManualTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  transactionType: ManualTransactionType;
  amount: number;
  accountId?: string;
  accountName?: string;
  partyId?: string;
  partyName?: string;
  category?: string;
  reference?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  partyId: string; // Supplier ID
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;
  items: PurchaseItem[];
  subtotal: number;
  discount?: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod | string;
  accountId?: string; // Cash or Bank account paid from
  notes?: string;
  status: 'Paid' | 'Partial' | 'Credit';
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  time?: string;
  type: 'OPENING' | 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT' | 'MANUAL';
  referenceNo: string;
  referenceId: string;
  description: string;
  debit: number; // increases customer receivable / decreases supplier payable
  credit: number; // decreases customer receivable / increases supplier payable
  previousBalance: number;
  runningBalance: number;
}

export interface CashLedgerEntry {
  id: string;
  date: string;
  time?: string;
  referenceNo: string;
  description: string;
  partyName?: string;
  cashIn: number;
  cashOut: number;
  balance: number;
  type: 'sale' | 'receipt' | 'purchase' | 'expense' | 'supplier_payment' | 'manual_in' | 'manual_out' | 'transfer_in' | 'transfer_out' | 'opening';
}

export interface BankLedgerEntry {
  id: string;
  date: string;
  time?: string;
  accountId: string;
  accountName: string;
  referenceNo: string;
  description: string;
  partyName?: string;
  bankIn: number;
  bankOut: number;
  balance: number;
  type: 'sale' | 'receipt' | 'purchase' | 'expense' | 'supplier_payment' | 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'opening';
}

export interface DonationSettings {
  enabled: boolean;
  donationPerQty: number; // e.g. 2 for Rs. 2 donation per sold piece/unit
  note?: string;
  updatedAt?: string;
}

export interface DonationRecord {
  id: string; // unique ID e.g. "don_inv_123"
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  invoiceId: string;
  invoiceNo: string;
  partyId?: string;
  partyName: string;
  totalQuantity: number;
  donationPerQty: number; // Rate at time of sale
  donationAmount: number; // totalQuantity * donationPerQty
  reference?: string;
  notes?: string;
  status: 'Recorded' | 'Adjusted' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  companySettings: CompanySettings;
  invoiceSettings: InvoiceSettings;
  appSettings: AppSettings;
  parties: Party[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  purchases?: Purchase[];
  accounts?: Account[];
  expenses?: Expense[];
  expenseCategories?: ExpenseCategory[];
  transfers?: AccountTransfer[];
  manualTransactions?: ManualTransaction[];
  donationSettings?: DonationSettings;
  donations?: DonationRecord[];
  stats: {
    partyCount: number;
    invoiceCount: number;
    paymentCount: number;
    productCount: number;
    purchaseCount?: number;
    expenseCount?: number;
    accountCount?: number;
    donationCount?: number;
  };
}
