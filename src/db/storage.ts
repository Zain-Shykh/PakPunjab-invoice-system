import {
  Account,
  AccountTransfer,
  AppSettings,
  BackupData,
  CompanySettings,
  DonationRecord,
  DonationSettings,
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceItem,
  InvoiceSettings,
  ManualTransaction,
  Party,
  Payment,
  Product,
  Purchase,
} from '../types';
import {
  firestore,
  firebaseConfig,
} from '../firebase/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';

export const STORAGE_KEYS = {
  APP_SETTINGS: 'app_settings',
  COMPANY_SETTINGS: 'company_settings',
  INVOICE_SETTINGS: 'invoice_settings',
  PARTIES: 'parties',
  PRODUCTS: 'products',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  PURCHASES: 'purchases',
  ACCOUNTS: 'accounts',
  EXPENSES: 'expenses',
  EXPENSE_CATEGORIES: 'expense_categories',
  TRANSFERS: 'transfers',
  MANUAL_TRANSACTIONS: 'manual_transactions',
  DONATION_SETTINGS: 'donation_settings',
  DONATIONS: 'donations',
  FIREBASE_SYNC_META: 'firebase_sync_meta',
};

export const DEFAULT_DONATION_SETTINGS: DonationSettings = {
  enabled: true,
  donationPerQty: 2,
  note: 'Donation calculated per sold item/quantity',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc_cash',
    accountName: 'Cash in Hand',
    accountType: 'cash',
    openingBalance: 0,
    isActive: true,
    notes: 'Default primary cash account',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc_meezan',
    accountName: 'Meezan Bank',
    accountType: 'bank',
    bankName: 'Meezan Bank Limited',
    openingBalance: 0,
    isActive: true,
    notes: 'Primary Islamic business account',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc_hbl',
    accountName: 'HBL',
    accountType: 'bank',
    bankName: 'Habib Bank Limited',
    openingBalance: 0,
    isActive: true,
    notes: 'HBL corporate account',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc_ubl',
    accountName: 'UBL',
    accountType: 'bank',
    bankName: 'United Bank Limited',
    openingBalance: 0,
    isActive: true,
    notes: 'UBL business account',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat_fuel', name: 'Fuel', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_salary', name: 'Salary', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_rent', name: 'Rent', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_electricity', name: 'Electricity', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_internet', name: 'Internet', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_transport', name: 'Transport', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_office', name: 'Office Expense', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_repair', name: 'Repair', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_loading', name: 'Loading/Unloading', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_food', name: 'Tea/Food', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat_misc', name: 'Miscellaneous', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
];

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  businessName: 'VELOCE TRADERS',
  tagline: 'Wholesale & Retail Cloth Merchants',
  phone: '0300-1234567',
  whatsapp: '0300-1234567',
  email: 'info@velocetraders.com',
  address: 'Shop # 12, Main Textile Market, Rail Bazaar',
  city: 'Faisalabad',
  taxNtn: 'NTN: 7891234-5',
  invoicePrefix: 'INV-',
  startingInvoiceNo: 1001,
  currency: 'Rs.',
  thankYouMsg: 'Thank you for your business! Goods once sold will not be returned.',
  termsConditions: '1. Payment due within 15 days for credit sales.\n2. Please inspect goods upon delivery.\n3. Dispute jurisdiction: Local courts only.',
  logo: '',
  inventoryEnabled: true,
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  theme: 'purple',
  headerStyle: 'premium',
  logoSize: 'medium',
  businessNameSize: 'medium',
  businessNamePosition: 'left',
  invoiceTitle: 'bold',
  tableStyle: 'banded',
  fontSize: 'medium',
  fontFamily: 'sans',
  rowSpacing: 'normal',
  priceFormat: 'symbol_space',
  timestampPos: 'top-right',
  customColors: {
    primaryColor: '#7c3aed',
    secondaryColor: '#6d28d9',
    accentColor: '#c4b5fd',
    textColor: '#1e293b',
    headerBgColor: '#581c87',
  },
  showLogo: true,
  showDateTime: true,
  showItemLines: true,
  showPrevBalance: true,
  showPaidAmount: true,
  showRemainingAmount: true,
  showCustomerPhone: true,
  showWhatsApp: true,
  showAddress: true,
  showSignature: true,
  showFooter: true,
  showThankYou: true,
  showTerms: true,
  showProductDescription: true,
  showProductSelectionInForm: true,
  showItemQuantity: true,
  showProductUnit: true,
  showProductCode: true,
  showItemRate: true,
  showItemDiscount: true,
  showItemAmount: true,
  showItemIndex: true,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  isConfigured: true,
  softwareTheme: 'purple',
  appLockEnabled: false,
  appLockPin: '',
  lastBackupDate: null,
  dateFormat: 'DD-MM-YYYY',
  timeFormat: '24h',
};

// Custom event to notify components across the app of storage mutations
export const STORAGE_CHANGE_EVENT = 'veloce_ledger_storage_changed';

export function notifyStorageChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
  }
}

// Low-level helper with safe JSON parsing for instant synchronous cache
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to parse cache key "${key}":`, error);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyStorageChange();
  } catch (error) {
    console.error(`Failed to set cache key "${key}":`, error);
  }
}

// ---------------- FIREBASE CLOUD SYNC STATE ----------------
export interface FirebaseSyncStatus {
  isConnected: boolean;
  projectId: string;
  storageBucket: string;
  lastSyncedAt: string | null;
  statusText: string;
  isSyncing: boolean;
  error?: string | null;
}

let syncStatus: FirebaseSyncStatus = {
  isConnected: false,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  lastSyncedAt: null,
  statusText: 'Connecting to Firebase...',
  isSyncing: false,
  error: null,
};

export function getFirebaseSyncStatus(): FirebaseSyncStatus {
  return { ...syncStatus };
}

function updateSyncStatus(patch: Partial<FirebaseSyncStatus>) {
  syncStatus = { ...syncStatus, ...patch };
  notifyStorageChange();
}

let isFirebaseSubscribed = false;
const pendingCloudWrites = new Map<string, unknown>();
const pendingCloudDeletes = new Set<string>();
const cloudWriteQueues = new Map<string, Promise<void>>();

function cloudRecordKey(collectionName: string, docId: string): string {
  return `${collectionName}/${docId}`;
}

function mergeCloudCollection<T extends { id: string }>(
  storageKey: string,
  collectionName: string,
  cloudRecords: T[]
): void {
  const localRecords = getStorageItem<T[]>(storageKey, []);
  const recordsById = new Map(cloudRecords.map((record) => [record.id, record]));

  for (const [key, record] of pendingCloudWrites) {
    if (key.startsWith(`${collectionName}/`)) {
      const id = key.slice(collectionName.length + 1);
      const cloudRecord = recordsById.get(id);
      if (cloudRecord && JSON.stringify(cloudRecord) === JSON.stringify(record)) {
        pendingCloudWrites.delete(key);
        continue;
      }
      recordsById.set(id, record as T);
    }
  }

  for (const key of pendingCloudDeletes) {
    if (key.startsWith(`${collectionName}/`)) {
      const id = key.slice(collectionName.length + 1);
      if (!recordsById.has(id)) {
        pendingCloudDeletes.delete(key);
      } else {
        recordsById.delete(id);
      }
    }
  }

  setStorageItem(storageKey, Array.from(recordsById.values()));
}

function mergeCloudDocument<T>(
  storageKey: string,
  collectionName: string,
  docId: string,
  cloudData: T
): void {
  const key = cloudRecordKey(collectionName, docId);
  const pendingData = pendingCloudWrites.get(key);
  if (pendingData && JSON.stringify(pendingData) !== JSON.stringify(cloudData)) {
    setStorageItem(storageKey, pendingData as T);
    return;
  }
  if (pendingData) pendingCloudWrites.delete(key);
  setStorageItem(storageKey, cloudData);
}

// ---------------- FIREBASE ASYNC WRITERS ----------------
async function syncDocToFirestore(collectionName: string, docId: string, data: any) {
  const key = cloudRecordKey(collectionName, docId);
  pendingCloudWrites.set(key, data);
  pendingCloudDeletes.delete(key);
  const previousWrite = cloudWriteQueues.get(key) || Promise.resolve();
  const currentWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      try {
        const docRef = doc(firestore, collectionName, docId);
        await setDoc(docRef, data, { merge: true });
        updateSyncStatus({
          isConnected: true,
          lastSyncedAt: new Date().toISOString(),
          statusText: 'Cloud Synced',
          error: null,
        });
      } catch (err: any) {
        console.warn(`Firestore sync error on ${collectionName}/${docId}:`, err);
        updateSyncStatus({
          error: err.message || 'Sync failed',
          statusText: 'Offline Cache Active',
        });
      }
    });
  cloudWriteQueues.set(key, currentWrite);
  await currentWrite;
}

async function removeDocFromFirestore(collectionName: string, docId: string) {
  const key = cloudRecordKey(collectionName, docId);
  pendingCloudDeletes.add(key);
  pendingCloudWrites.delete(key);
  const previousWrite = cloudWriteQueues.get(key) || Promise.resolve();
  const currentWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      try {
        const docRef = doc(firestore, collectionName, docId);
        await deleteDoc(docRef);
        updateSyncStatus({
          isConnected: true,
          lastSyncedAt: new Date().toISOString(),
          statusText: 'Cloud Synced',
        });
      } catch (err: any) {
        console.warn(`Firestore delete error on ${collectionName}/${docId}:`, err);
      }
    });
  cloudWriteQueues.set(key, currentWrite);
  await currentWrite;
}

/**
 * Push all local records to Firebase Firestore (useful on initial setup or manual sync)
 */
export async function pushAllToFirebase(): Promise<void> {
  updateSyncStatus({ isSyncing: true, statusText: 'Uploading to Firebase...' });
  try {
    const batch = writeBatch(firestore);

    // Settings
    batch.set(doc(firestore, 'settings', 'company'), getCompanySettings(), { merge: true });
    batch.set(doc(firestore, 'settings', 'invoice'), getInvoiceSettings(), { merge: true });
    batch.set(doc(firestore, 'settings', 'app'), getAppSettings(), { merge: true });

    // Parties
    for (const p of getParties()) {
      batch.set(doc(firestore, 'parties', p.id), p, { merge: true });
    }

    // Products
    for (const pr of getProducts()) {
      batch.set(doc(firestore, 'products', pr.id), pr, { merge: true });
    }

    // Invoices
    for (const inv of getInvoices()) {
      batch.set(doc(firestore, 'invoices', inv.id), inv, { merge: true });
    }

    // Payments
    for (const pay of getPayments()) {
      batch.set(doc(firestore, 'payments', pay.id), pay, { merge: true });
    }

    // Purchases
    for (const pur of getPurchases()) {
      batch.set(doc(firestore, 'purchases', pur.id), pur, { merge: true });
    }

    // Accounts
    for (const acc of getAccounts()) {
      batch.set(doc(firestore, 'accounts', acc.id), acc, { merge: true });
    }

    // Expense Categories
    for (const cat of getExpenseCategories()) {
      batch.set(doc(firestore, 'expense_categories', cat.id), cat, { merge: true });
    }

    // Expenses
    for (const exp of getExpenses()) {
      batch.set(doc(firestore, 'expenses', exp.id), exp, { merge: true });
    }

    // Transfers
    for (const trf of getTransfers()) {
      batch.set(doc(firestore, 'transfers', trf.id), trf, { merge: true });
    }

    // Manual Transactions
    for (const tx of getManualTransactions()) {
      batch.set(doc(firestore, 'manual_transactions', tx.id), tx, { merge: true });
    }

    await batch.commit();

    updateSyncStatus({
      isConnected: true,
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      statusText: 'Cloud Synced (pakpunjab-983fc)',
      error: null,
    });
  } catch (err: any) {
    console.error('Failed to push all records to Firebase:', err);
    updateSyncStatus({
      isSyncing: false,
      error: err.message || 'Push failed',
      statusText: 'Firebase Sync Error',
    });
    throw err;
  }
}

/**
 * Pull all records from Firebase Firestore to local state
 */
export async function pullAllFromFirebase(): Promise<void> {
  updateSyncStatus({ isSyncing: true, statusText: 'Pulling from Firebase...' });
  try {
    // 1. Settings
    const settingsSnap = await getDocs(collection(firestore, 'settings'));
    settingsSnap.forEach((d) => {
      if (d.id === 'company') setStorageItem(STORAGE_KEYS.COMPANY_SETTINGS, d.data());
      if (d.id === 'invoice') setStorageItem(STORAGE_KEYS.INVOICE_SETTINGS, d.data());
      if (d.id === 'app') setStorageItem(STORAGE_KEYS.APP_SETTINGS, d.data());
    });

    // 2. Parties
    const partiesSnap = await getDocs(collection(firestore, 'parties'));
    const partiesList: Party[] = [];
    partiesSnap.forEach((d) => partiesList.push(d.data() as Party));
    setStorageItem(STORAGE_KEYS.PARTIES, partiesList);

    // 3. Products
    const productsSnap = await getDocs(collection(firestore, 'products'));
    const productsList: Product[] = [];
    productsSnap.forEach((d) => productsList.push(d.data() as Product));
    setStorageItem(STORAGE_KEYS.PRODUCTS, productsList);

    // 4. Invoices
    const invoicesSnap = await getDocs(collection(firestore, 'invoices'));
    const invoicesList: Invoice[] = [];
    invoicesSnap.forEach((d) => invoicesList.push(d.data() as Invoice));
    setStorageItem(STORAGE_KEYS.INVOICES, invoicesList);

    // 5. Payments
    const paymentsSnap = await getDocs(collection(firestore, 'payments'));
    const paymentsList: Payment[] = [];
    paymentsSnap.forEach((d) => paymentsList.push(d.data() as Payment));
    setStorageItem(STORAGE_KEYS.PAYMENTS, paymentsList);

    // 5b. Purchases
    const purchasesSnap = await getDocs(collection(firestore, 'purchases'));
    const purchasesList: Purchase[] = [];
    purchasesSnap.forEach((d) => purchasesList.push(d.data() as Purchase));
    setStorageItem(STORAGE_KEYS.PURCHASES, purchasesList);

    // 6. Accounts
    const accountsSnap = await getDocs(collection(firestore, 'accounts'));
    const accountsList: Account[] = [];
    accountsSnap.forEach((d) => accountsList.push(d.data() as Account));
    if (accountsList.length > 0) {
      setStorageItem(STORAGE_KEYS.ACCOUNTS, accountsList);
    }

    // 7. Expense Categories
    const categoriesSnap = await getDocs(collection(firestore, 'expense_categories'));
    const categoriesList: ExpenseCategory[] = [];
    categoriesSnap.forEach((d) => categoriesList.push(d.data() as ExpenseCategory));
    if (categoriesList.length > 0) {
      setStorageItem(STORAGE_KEYS.EXPENSE_CATEGORIES, categoriesList);
    }

    // 8. Expenses
    const expensesSnap = await getDocs(collection(firestore, 'expenses'));
    const expensesList: Expense[] = [];
    expensesSnap.forEach((d) => expensesList.push(d.data() as Expense));
    setStorageItem(STORAGE_KEYS.EXPENSES, expensesList);

    // 9. Transfers
    const transfersSnap = await getDocs(collection(firestore, 'transfers'));
    const transfersList: AccountTransfer[] = [];
    transfersSnap.forEach((d) => transfersList.push(d.data() as AccountTransfer));
    setStorageItem(STORAGE_KEYS.TRANSFERS, transfersList);

    // 10. Manual Transactions
    const manualSnap = await getDocs(collection(firestore, 'manual_transactions'));
    const manualList: ManualTransaction[] = [];
    manualSnap.forEach((d) => manualList.push(d.data() as ManualTransaction));
    setStorageItem(STORAGE_KEYS.MANUAL_TRANSACTIONS, manualList);

    updateSyncStatus({
      isConnected: true,
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      statusText: 'Cloud Synced (pakpunjab-983fc)',
      error: null,
    });
  } catch (err: any) {
    console.warn('Failed to pull from Firebase:', err);
    updateSyncStatus({
      isSyncing: false,
      error: err.message,
      statusText: 'Offline Cache Active',
    });
  }
}

/**
 * Setup Realtime Listeners with Firestore
 */
export function setupFirebaseRealtimeListeners(): void {
  if (isFirebaseSubscribed || typeof window === 'undefined') return;
  isFirebaseSubscribed = true;

  try {
    // 1. Listen for Parties
    onSnapshot(collection(firestore, 'parties'), (snapshot) => {
      if (!snapshot.empty) {
        const cloudParties: Party[] = [];
        snapshot.forEach((docSnap) => {
          cloudParties.push(docSnap.data() as Party);
        });
        mergeCloudCollection(STORAGE_KEYS.PARTIES, 'parties', cloudParties);
      } else {
        const localParties = getParties();
        if (localParties.length > 0) {
          for (const p of localParties) syncDocToFirestore('parties', p.id, p);
        }
      }
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Parties snapshot notice:', err.message);
    });

    // 2. Listen for Products
    onSnapshot(collection(firestore, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const cloudProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          cloudProducts.push(docSnap.data() as Product);
        });
        mergeCloudCollection(STORAGE_KEYS.PRODUCTS, 'products', cloudProducts);
      } else {
        const localProducts = getProducts();
        if (localProducts.length > 0) {
          for (const pr of localProducts) syncDocToFirestore('products', pr.id, pr);
        }
      }
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Products snapshot notice:', err.message);
    });

    // 3. Listen for Invoices
    onSnapshot(collection(firestore, 'invoices'), (snapshot) => {
      if (!snapshot.empty) {
        const cloudInvoices: Invoice[] = [];
        snapshot.forEach((docSnap) => {
          cloudInvoices.push(docSnap.data() as Invoice);
        });
        mergeCloudCollection(STORAGE_KEYS.INVOICES, 'invoices', cloudInvoices);
      } else {
        const localInvoices = getInvoices();
        if (localInvoices.length > 0) {
          for (const inv of localInvoices) syncDocToFirestore('invoices', inv.id, inv);
        }
      }
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Invoices snapshot notice:', err.message);
    });

    // 4. Listen for Payments
    onSnapshot(collection(firestore, 'payments'), (snapshot) => {
      if (!snapshot.empty) {
        const cloudPayments: Payment[] = [];
        snapshot.forEach((docSnap) => {
          cloudPayments.push(docSnap.data() as Payment);
        });
        mergeCloudCollection(STORAGE_KEYS.PAYMENTS, 'payments', cloudPayments);
      } else {
        const localPayments = getPayments();
        if (localPayments.length > 0) {
          for (const pay of localPayments) syncDocToFirestore('payments', pay.id, pay);
        }
      }
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Payments snapshot notice:', err.message);
    });

    // 4b. Listen for Purchases
    onSnapshot(collection(firestore, 'purchases'), (snapshot) => {
      const cloudPurchases: Purchase[] = [];
      snapshot.forEach((docSnap) => {
        cloudPurchases.push(docSnap.data() as Purchase);
      });
      mergeCloudCollection(STORAGE_KEYS.PURCHASES, 'purchases', cloudPurchases);
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Purchases snapshot notice:', err.message);
    });

    // 5. Listen for Accounts
    onSnapshot(collection(firestore, 'accounts'), (snapshot) => {
      if (!snapshot.empty) {
        const cloudAccounts: Account[] = [];
        snapshot.forEach((docSnap) => {
          cloudAccounts.push(docSnap.data() as Account);
        });
        mergeCloudCollection(STORAGE_KEYS.ACCOUNTS, 'accounts', cloudAccounts);
        updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
      }
    }, (err) => {
      console.warn('Accounts snapshot notice:', err.message);
    });

    // 6. Listen for Expenses
    onSnapshot(collection(firestore, 'expenses'), (snapshot) => {
      const cloudExpenses: Expense[] = [];
      snapshot.forEach((docSnap) => {
        cloudExpenses.push(docSnap.data() as Expense);
      });
      mergeCloudCollection(STORAGE_KEYS.EXPENSES, 'expenses', cloudExpenses);
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Expenses snapshot notice:', err.message);
    });

    // 7. Listen for Expense Categories
    onSnapshot(collection(firestore, 'expense_categories'), (snapshot) => {
      if (!snapshot.empty) {
        const cloudCats: ExpenseCategory[] = [];
        snapshot.forEach((docSnap) => {
          cloudCats.push(docSnap.data() as ExpenseCategory);
        });
        mergeCloudCollection(STORAGE_KEYS.EXPENSE_CATEGORIES, 'expense_categories', cloudCats);
        updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
      }
    }, (err) => {
      console.warn('Expense categories snapshot notice:', err.message);
    });

    // 8. Listen for Transfers
    onSnapshot(collection(firestore, 'transfers'), (snapshot) => {
      const cloudTransfers: AccountTransfer[] = [];
      snapshot.forEach((docSnap) => {
        cloudTransfers.push(docSnap.data() as AccountTransfer);
      });
      mergeCloudCollection(STORAGE_KEYS.TRANSFERS, 'transfers', cloudTransfers);
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Transfers snapshot notice:', err.message);
    });

    // 9. Listen for Manual Transactions
    onSnapshot(collection(firestore, 'manual_transactions'), (snapshot) => {
      const cloudManual: ManualTransaction[] = [];
      snapshot.forEach((docSnap) => {
        cloudManual.push(docSnap.data() as ManualTransaction);
      });
      mergeCloudCollection(STORAGE_KEYS.MANUAL_TRANSACTIONS, 'manual_transactions', cloudManual);
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Manual transactions snapshot notice:', err.message);
    });

    // 10. Listen for Settings
    onSnapshot(collection(firestore, 'settings'), (snapshot) => {
      snapshot.forEach((docSnap) => {
        if (docSnap.id === 'company') {
          mergeCloudDocument(STORAGE_KEYS.COMPANY_SETTINGS, 'settings', 'company', docSnap.data());
        } else if (docSnap.id === 'invoice') {
          mergeCloudDocument(STORAGE_KEYS.INVOICE_SETTINGS, 'settings', 'invoice', docSnap.data());
        } else if (docSnap.id === 'app') {
          mergeCloudDocument(STORAGE_KEYS.APP_SETTINGS, 'settings', 'app', docSnap.data());
        } else if (docSnap.id === 'donation') {
          mergeCloudDocument(STORAGE_KEYS.DONATION_SETTINGS, 'settings', 'donation', docSnap.data());
        }
      });
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Settings snapshot notice:', err.message);
    });

    // 11. Listen for Donations
    onSnapshot(collection(firestore, 'donations'), (snapshot) => {
      const cloudDonations: DonationRecord[] = [];
      snapshot.forEach((docSnap) => {
        cloudDonations.push(docSnap.data() as DonationRecord);
      });
      mergeCloudCollection(STORAGE_KEYS.DONATIONS, 'donations', cloudDonations);
      updateSyncStatus({ isConnected: true, lastSyncedAt: new Date().toISOString() });
    }, (err) => {
      console.warn('Donations snapshot notice:', err.message);
    });

    updateSyncStatus({
      isConnected: true,
      statusText: 'Connected (pakpunjab-983fc)',
      error: null,
    });
  } catch (err: any) {
    console.warn('Firebase realtime subscription initialization:', err);
    updateSyncStatus({
      isConnected: false,
      error: err.message,
      statusText: 'Offline Cache Active',
    });
  }
}

/**
 * Remove legacy sample/demo records from localStorage so the system opens completely clean
 */
function cleanLegacyDemoData(): void {
  try {
    const demoPartyIds = ['party_101', 'party_102', 'party_103', 'sample_party'];
    const parties = getParties();
    if (parties.some((p) => demoPartyIds.includes(p.id))) {
      const real = parties.filter((p) => !demoPartyIds.includes(p.id));
      localStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(real));
    }

    const demoProductIds = ['prod_101', 'prod_102', 'prod_103', 'prod_104'];
    const products = getProducts();
    if (products.some((p) => demoProductIds.includes(p.id))) {
      const real = products.filter((p) => !demoProductIds.includes(p.id));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(real));
    }

    const demoInvIds = ['inv_101', 'inv_102'];
    const invoices = getInvoices();
    if (invoices.some((i) => demoInvIds.includes(i.id))) {
      const real = invoices.filter((i) => !demoInvIds.includes(i.id));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(real));
    }

    const demoPayIds = ['pay_101', 'pay_102'];
    const payments = getPayments();
    if (payments.some((p) => demoPayIds.includes(p.id))) {
      const real = payments.filter((p) => !demoPayIds.includes(p.id));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(real));
    }
  } catch (err) {
    console.warn('Error purging legacy demo records:', err);
  }
}

/**
 * Initialize storage with clean real defaults (NO DEMO DATA) and start Firebase synchronization
 */
export function initStorage(): void {
  if (!localStorage.getItem(STORAGE_KEYS.COMPANY_SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.COMPANY_SETTINGS, JSON.stringify(DEFAULT_COMPANY_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INVOICE_SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.INVOICE_SETTINGS, JSON.stringify(DEFAULT_INVOICE_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(DEFAULT_APP_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PARTIES)) {
    localStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSFERS)) {
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MANUAL_TRANSACTIONS)) {
    localStorage.setItem(STORAGE_KEYS.MANUAL_TRANSACTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DONATION_SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.DONATION_SETTINGS, JSON.stringify(DEFAULT_DONATION_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DONATIONS)) {
    localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify([]));
  }

  // Ensure any existing invoices have corresponding donation records (Requirement 18 & 19)
  try {
    const existingInvoices = getInvoices();
    const existingDonations = getDonations();
    const donSettings = getDonationSettings();
    let donationsModified = false;
    const nowStr = new Date().toISOString();

    for (const inv of existingInvoices) {
      const soldQty = (inv.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      const donIndex = existingDonations.findIndex((d) => d.invoiceId === inv.id);

      if (soldQty > 0 && donIndex === -1) {
        const rate = inv.donationPerQty !== undefined && inv.donationPerQty !== null
          ? Number(inv.donationPerQty)
          : (donSettings.enabled ? Number(donSettings.donationPerQty) || 2 : 2);
        if (rate > 0) {
          const rec: DonationRecord = {
            id: `don_inv_${inv.id}`,
            date: inv.date,
            time: inv.time || '12:00',
            invoiceId: inv.id,
            invoiceNo: inv.invoiceNo,
            partyId: inv.partyId,
            partyName: inv.partyName || 'Customer',
            totalQuantity: soldQty,
            donationPerQty: rate,
            donationAmount: Math.round(soldQty * rate * 100) / 100,
            reference: `Invoice #${inv.invoiceNo}`,
            notes: `Auto-synchronized donation record`,
            status: 'Recorded',
            createdAt: inv.createdAt || nowStr,
            updatedAt: nowStr,
          };
          existingDonations.push(rec);
          donationsModified = true;
        }
      }
    }

    if (donationsModified) {
      localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(existingDonations));
    }
  } catch (err) {
    console.warn('Donation sync notice in initStorage:', err);
  }

  // Purge any legacy demo entries so they never return
  cleanLegacyDemoData();

  // Hook Firebase listeners
  setupFirebaseRealtimeListeners();
}

// ---------------- COMPANY SETTINGS ----------------
export function getCompanySettings(): CompanySettings {
  return getStorageItem<CompanySettings>(STORAGE_KEYS.COMPANY_SETTINGS, DEFAULT_COMPANY_SETTINGS);
}

export function saveCompanySettings(settings: CompanySettings): void {
  setStorageItem(STORAGE_KEYS.COMPANY_SETTINGS, settings);
  syncDocToFirestore('settings', 'company', settings);
}

// ---------------- INVOICE SETTINGS ----------------
export function getInvoiceSettings(): InvoiceSettings {
  const loaded = getStorageItem<InvoiceSettings>(STORAGE_KEYS.INVOICE_SETTINGS, DEFAULT_INVOICE_SETTINGS);
  return { ...DEFAULT_INVOICE_SETTINGS, ...loaded };
}

export function saveInvoiceSettings(settings: InvoiceSettings): void {
  setStorageItem(STORAGE_KEYS.INVOICE_SETTINGS, settings);
  syncDocToFirestore('settings', 'invoice', settings);
}

// ---------------- APP SETTINGS ----------------
export function getAppSettings(): AppSettings {
  return getStorageItem<AppSettings>(STORAGE_KEYS.APP_SETTINGS, DEFAULT_APP_SETTINGS);
}

export function saveAppSettings(settings: AppSettings): void {
  setStorageItem(STORAGE_KEYS.APP_SETTINGS, settings);
  syncDocToFirestore('settings', 'app', settings);
}

// ---------------- PARTIES ----------------
export function getParties(): Party[] {
  return getStorageItem<Party[]>(STORAGE_KEYS.PARTIES, []);
}

export function getPartyById(id: string): Party | undefined {
  const parties = getParties();
  return parties.find(p => p.id === id);
}

export function saveParty(party: Party): void {
  const parties = getParties();
  const index = parties.findIndex(p => p.id === party.id);
  const now = new Date().toISOString();
  
  let targetParty: Party;
  if (index >= 0) {
    targetParty = { ...party, updatedAt: now };
    parties[index] = targetParty;
  } else {
    targetParty = { ...party, createdAt: now, updatedAt: now };
    parties.push(targetParty);
  }
  setStorageItem(STORAGE_KEYS.PARTIES, parties);
  syncDocToFirestore('parties', targetParty.id, targetParty);
}

export function deleteParty(id: string): void {
  const parties = getParties().filter(p => p.id !== id);
  setStorageItem(STORAGE_KEYS.PARTIES, parties);
  removeDocFromFirestore('parties', id);
}

// ---------------- PRODUCTS ----------------
export function getProducts(): Product[] {
  return getStorageItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
}

export function getProductById(id: string): Product | undefined {
  return getProducts().find(p => p.id === id);
}

export function saveProduct(product: Product): void {
  const products = getProducts();
  const index = products.findIndex(p => p.id === product.id);
  const now = new Date().toISOString();
  
  let targetProduct: Product;
  if (index >= 0) {
    targetProduct = { ...product, updatedAt: now };
    products[index] = targetProduct;
  } else {
    targetProduct = { ...product, createdAt: now, updatedAt: now };
    products.push(targetProduct);
  }
  setStorageItem(STORAGE_KEYS.PRODUCTS, products);
  syncDocToFirestore('products', targetProduct.id, targetProduct);
}

export function deleteProduct(id: string): void {
  const products = getProducts().filter(p => p.id !== id);
  setStorageItem(STORAGE_KEYS.PRODUCTS, products);
  removeDocFromFirestore('products', id);
}

export function adjustProductStock(productId: string, quantityDelta: number): void {
  const products = getProducts();
  const index = products.findIndex(p => p.id === productId);
  if (index >= 0) {
    products[index].stockQuantity = (products[index].stockQuantity || 0) + quantityDelta;
    products[index].updatedAt = new Date().toISOString();
    setStorageItem(STORAGE_KEYS.PRODUCTS, products);
    syncDocToFirestore('products', productId, products[index]);
  }
}

export function toggleProductInvoiceVisibility(productId: string, showOnInvoice: boolean): void {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === productId);
  if (index >= 0) {
    products[index] = {
      ...products[index],
      showOnInvoice,
      updatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.PRODUCTS, products);
    syncDocToFirestore('products', productId, products[index]);
  }
}

/**
 * Filter invoice items strictly for customer-facing display/print/PDF/WhatsApp rendering.
 * Does NOT filter or alter original invoice financial data, ledger, or stock.
 */
export function getVisibleInvoiceItems(
  items: InvoiceItem[] = [],
  products: Product[] = getProducts()
): InvoiceItem[] {
  return items.filter((item) => {
    // 1. If explicit invoice-level snapshot says hidden
    if (item.showOnInvoice === false) return false;
    // 2. If product catalog lookup has showOnInvoice === false
    if (item.productId) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.showOnInvoice === false) {
        return false;
      }
    }
    return true;
  });
}

// ---------------- INVOICES ----------------
export function getInvoices(): Invoice[] {
  return getStorageItem<Invoice[]>(STORAGE_KEYS.INVOICES, []);
}

export function getInvoiceById(id: string): Invoice | undefined {
  return getInvoices().find(i => i.id === id);
}

export function getNextInvoiceNumber(): string {
  const company = getCompanySettings();
  const invoices = getInvoices();
  const prefix = company.invoicePrefix || 'INV-';
  const startNum = company.startingInvoiceNo || 1001;

  if (invoices.length === 0) {
    return `${prefix}${startNum}`;
  }

  let maxNumber = startNum - 1;
  for (const inv of invoices) {
    if (inv.invoiceNo && inv.invoiceNo.startsWith(prefix)) {
      const numericPart = parseInt(inv.invoiceNo.substring(prefix.length), 10);
      if (!isNaN(numericPart) && numericPart > maxNumber) {
        maxNumber = numericPart;
      }
    }
  }

  return `${prefix}${maxNumber + 1}`;
}

export function saveInvoice(invoice: Invoice): void {
  const invoices = getInvoices();
  const index = invoices.findIndex(i => i.id === invoice.id);
  const now = new Date().toISOString();
  const isEditing = index >= 0;
  const previousInvoice = isEditing ? invoices[index] : null;

  const company = getCompanySettings();

  // If inventory enabled, adjust stock
  if (company.inventoryEnabled) {
    if (previousInvoice) {
      for (const item of previousInvoice.items) {
        if (item.productId) {
          adjustProductStock(item.productId, item.quantity);
        }
      }
    }
    for (const item of invoice.items) {
      if (item.productId) {
        adjustProductStock(item.productId, -item.quantity);
      }
    }
  }

  // Handle invoice-level payment synchronization
  const payments = getPayments();
  const linkedPaymentIndex = payments.findIndex(p => p.invoiceId === invoice.id);

  if (invoice.paidAmount > 0) {
    const paymentRecord: Payment = {
      id: linkedPaymentIndex >= 0 ? payments[linkedPaymentIndex].id : `pay_inv_${invoice.id}`,
      date: invoice.date,
      time: invoice.time || '12:00',
      partyId: invoice.partyId,
      partyName: invoice.partyName,
      amount: invoice.paidAmount,
      method: invoice.paymentMethod,
      reference: `Invoice ${invoice.invoiceNo}`,
      notes: `Payment recorded on invoice creation/update`,
      invoiceId: invoice.id,
      createdAt: linkedPaymentIndex >= 0 ? payments[linkedPaymentIndex].createdAt : now,
      updatedAt: now,
    };

    if (linkedPaymentIndex >= 0) {
      payments[linkedPaymentIndex] = paymentRecord;
    } else {
      payments.push(paymentRecord);
    }
    setStorageItem(STORAGE_KEYS.PAYMENTS, payments);
    syncDocToFirestore('payments', paymentRecord.id, paymentRecord);
  } else if (linkedPaymentIndex >= 0 && invoice.paidAmount === 0) {
    const payId = payments[linkedPaymentIndex].id;
    const updatedPayments = payments.filter(p => p.invoiceId !== invoice.id);
    setStorageItem(STORAGE_KEYS.PAYMENTS, updatedPayments);
    removeDocFromFirestore('payments', payId);
  }

  // ---------------- DONATION SYNCHRONIZATION ----------------
  // Requirement 1, 2, 3, 10, 11:
  // Formula: Donation Amount = Sold Quantity × Donation Per Quantity
  // Rate history: Existing invoices retain the rate assigned at time of creation!
  const donationSettings = getDonationSettings();
  const totalQuantity = invoice.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  let donationRate = 0;
  if (invoice.donationPerQty !== undefined && invoice.donationPerQty !== null) {
    donationRate = Math.max(0, Number(invoice.donationPerQty) || 0);
  } else if (previousInvoice && previousInvoice.donationPerQty !== undefined) {
    donationRate = Math.max(0, Number(previousInvoice.donationPerQty) || 0);
  } else if (donationSettings.enabled) {
    donationRate = Math.max(0, Number(donationSettings.donationPerQty) || 0);
  }

  const donationAmount = Math.round(totalQuantity * donationRate * 100) / 100;

  // Manage DonationRecord (Unique per invoice, no duplicates)
  const donations = getDonations();
  const linkedDonIndex = donations.findIndex(d => d.invoiceId === invoice.id);

  if (donationRate > 0 && totalQuantity > 0) {
    const donationRecord: DonationRecord = {
      id: linkedDonIndex >= 0 ? donations[linkedDonIndex].id : `don_inv_${invoice.id}`,
      date: invoice.date,
      time: invoice.time || '12:00',
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      partyId: invoice.partyId,
      partyName: invoice.partyName || 'Walk-in Customer',
      totalQuantity,
      donationPerQty: donationRate,
      donationAmount,
      reference: `Invoice #${invoice.invoiceNo}`,
      notes: `Donation: ${totalQuantity} qty × Rs. ${donationRate}/unit`,
      status: 'Recorded',
      createdAt: linkedDonIndex >= 0 ? donations[linkedDonIndex].createdAt : now,
      updatedAt: now,
    };

    if (linkedDonIndex >= 0) {
      donations[linkedDonIndex] = donationRecord;
    } else {
      donations.push(donationRecord);
    }
    setStorageItem(STORAGE_KEYS.DONATIONS, donations);
    syncDocToFirestore('donations', donationRecord.id, donationRecord);
  } else if (linkedDonIndex >= 0) {
    // If rate is 0 or quantity is 0, remove associated donation record
    const donId = donations[linkedDonIndex].id;
    const updatedDonations = donations.filter(d => d.invoiceId !== invoice.id);
    setStorageItem(STORAGE_KEYS.DONATIONS, updatedDonations);
    removeDocFromFirestore('donations', donId);
  }

  let targetInvoice: Invoice;
  if (isEditing) {
    targetInvoice = {
      ...invoice,
      totalQuantity,
      donationPerQty: donationRate,
      donationAmount,
      updatedAt: now,
    };
    invoices[index] = targetInvoice;
  } else {
    targetInvoice = {
      ...invoice,
      totalQuantity,
      donationPerQty: donationRate,
      donationAmount,
      createdAt: now,
      updatedAt: now,
    };
    invoices.push(targetInvoice);
  }

  setStorageItem(STORAGE_KEYS.INVOICES, invoices);
  syncDocToFirestore('invoices', targetInvoice.id, targetInvoice);
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoices();
  const invoice = invoices.find(i => i.id === id);
  if (!invoice) return;

  const company = getCompanySettings();

  // Restore inventory if enabled
  if (company.inventoryEnabled) {
    for (const item of invoice.items) {
      if (item.productId) {
        adjustProductStock(item.productId, item.quantity);
      }
    }
  }

  // Remove linked payment if exists
  const payments = getPayments();
  const linkedPayment = payments.find(p => p.invoiceId === id);
  if (linkedPayment) {
    const updatedPayments = payments.filter(p => p.invoiceId !== id);
    setStorageItem(STORAGE_KEYS.PAYMENTS, updatedPayments);
    removeDocFromFirestore('payments', linkedPayment.id);
  }

  // Remove associated donation record if exists
  deleteDonationByInvoiceId(id);

  // Remove invoice
  const updatedInvoices = invoices.filter(i => i.id !== id);
  setStorageItem(STORAGE_KEYS.INVOICES, updatedInvoices);
  removeDocFromFirestore('invoices', id);
}

// ---------------- PAYMENTS ----------------
export function getPayments(): Payment[] {
  return getStorageItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
}

export function getPaymentById(id: string): Payment | undefined {
  return getPayments().find(p => p.id === id);
}

export function savePayment(payment: Payment): void {
  const payments = getPayments();
  const index = payments.findIndex(p => p.id === payment.id);
  const now = new Date().toISOString();

  let targetPayment: Payment;
  if (index >= 0) {
    targetPayment = { ...payment, updatedAt: now };
    payments[index] = targetPayment;
  } else {
    targetPayment = { ...payment, createdAt: now, updatedAt: now };
    payments.push(targetPayment);
  }
  setStorageItem(STORAGE_KEYS.PAYMENTS, payments);
  syncDocToFirestore('payments', targetPayment.id, targetPayment);
}

export function deletePayment(id: string): void {
  const payments = getPayments().filter(p => p.id !== id);
  setStorageItem(STORAGE_KEYS.PAYMENTS, payments);
  removeDocFromFirestore('payments', id);
}

// ---------------- PURCHASES (SUPPLIER BILLS) ----------------
export function getPurchases(): Purchase[] {
  return getStorageItem<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
}

export function getPurchaseById(id: string): Purchase | undefined {
  return getPurchases().find(p => p.id === id);
}

export function savePurchase(purchase: Purchase): void {
  const purchases = getPurchases();
  const index = purchases.findIndex(p => p.id === purchase.id);
  const now = new Date().toISOString();
  const isEditing = index >= 0;
  const company = getCompanySettings();

  // Stock inventory adjustment for incoming purchased stock
  if (company.inventoryEnabled) {
    if (isEditing) {
      const oldPurchase = purchases[index];
      for (const item of oldPurchase.items) {
        if (item.productId) adjustProductStock(item.productId, -item.quantity);
      }
    }
    for (const item of purchase.items) {
      if (item.productId) adjustProductStock(item.productId, item.quantity);
    }
  }

  // Synchronize supplier payment record if paidAmount > 0
  const payments = getPayments();
  const linkedIndex = payments.findIndex(p => p.invoiceId === purchase.id);

  if (purchase.paidAmount > 0) {
    const paymentRecord: Payment = {
      id: linkedIndex >= 0 ? payments[linkedIndex].id : `pay_pur_${purchase.id}`,
      date: purchase.date,
      time: purchase.time || '12:00',
      partyId: purchase.partyId,
      partyName: purchase.partyName,
      amount: purchase.paidAmount,
      method: purchase.paymentMethod,
      accountId: purchase.accountId,
      paymentType: 'paid', // Outflow to supplier
      reference: `Purchase ${purchase.purchaseNo}`,
      notes: `Supplier payment on purchase bill #${purchase.purchaseNo}`,
      invoiceId: purchase.id,
      createdAt: linkedIndex >= 0 ? payments[linkedIndex].createdAt : now,
      updatedAt: now,
    };

    if (linkedIndex >= 0) {
      payments[linkedIndex] = paymentRecord;
    } else {
      payments.push(paymentRecord);
    }
    setStorageItem(STORAGE_KEYS.PAYMENTS, payments);
    syncDocToFirestore('payments', paymentRecord.id, paymentRecord);
  } else if (linkedIndex >= 0 && purchase.paidAmount === 0) {
    const payId = payments[linkedIndex].id;
    const updatedPayments = payments.filter(p => p.invoiceId !== purchase.id);
    setStorageItem(STORAGE_KEYS.PAYMENTS, updatedPayments);
    removeDocFromFirestore('payments', payId);
  }

  let targetPurchase: Purchase;
  if (isEditing) {
    targetPurchase = { ...purchase, updatedAt: now };
    purchases[index] = targetPurchase;
  } else {
    targetPurchase = { ...purchase, createdAt: now, updatedAt: now };
    purchases.push(targetPurchase);
  }

  setStorageItem(STORAGE_KEYS.PURCHASES, purchases);
  syncDocToFirestore('purchases', targetPurchase.id, targetPurchase);
}

export function deletePurchase(id: string): void {
  const purchases = getPurchases();
  const purchase = purchases.find(p => p.id === id);
  if (!purchase) return;

  const company = getCompanySettings();
  if (company.inventoryEnabled) {
    for (const item of purchase.items) {
      if (item.productId) adjustProductStock(item.productId, -item.quantity);
    }
  }

  const payments = getPayments();
  const linkedPayment = payments.find(p => p.invoiceId === id);
  if (linkedPayment) {
    const updatedPayments = payments.filter(p => p.invoiceId !== id);
    setStorageItem(STORAGE_KEYS.PAYMENTS, updatedPayments);
    removeDocFromFirestore('payments', linkedPayment.id);
  }

  const updatedPurchases = purchases.filter(p => p.id !== id);
  setStorageItem(STORAGE_KEYS.PURCHASES, updatedPurchases);
  removeDocFromFirestore('purchases', id);
}

// ---------------- ACCOUNTS (CASH & BANK) ----------------
export function getAccounts(): Account[] {
  return getStorageItem<Account[]>(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS);
}

export function getAccountById(id: string): Account | undefined {
  return getAccounts().find(a => a.id === id);
}

export function saveAccount(account: Account): void {
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.id === account.id);
  const now = new Date().toISOString();

  let targetAccount: Account;
  if (index >= 0) {
    targetAccount = { ...account, updatedAt: now };
    accounts[index] = targetAccount;
  } else {
    targetAccount = { ...account, createdAt: now, updatedAt: now };
    accounts.push(targetAccount);
  }
  setStorageItem(STORAGE_KEYS.ACCOUNTS, accounts);
  syncDocToFirestore('accounts', targetAccount.id, targetAccount);
}

export function deleteAccount(id: string): void {
  const accounts = getAccounts().filter(a => a.id !== id);
  setStorageItem(STORAGE_KEYS.ACCOUNTS, accounts);
  removeDocFromFirestore('accounts', id);
}

// ---------------- EXPENSE CATEGORIES ----------------
export function getExpenseCategories(): ExpenseCategory[] {
  return getStorageItem<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES);
}

export function saveExpenseCategory(category: ExpenseCategory): void {
  const categories = getExpenseCategories();
  const index = categories.findIndex(c => c.id === category.id);
  const now = new Date().toISOString();

  let targetCat: ExpenseCategory;
  if (index >= 0) {
    targetCat = { ...category };
    categories[index] = targetCat;
  } else {
    targetCat = { ...category, createdAt: now };
    categories.push(targetCat);
  }
  setStorageItem(STORAGE_KEYS.EXPENSE_CATEGORIES, categories);
  syncDocToFirestore('expense_categories', targetCat.id, targetCat);
}

export function deleteExpenseCategory(id: string): void {
  const categories = getExpenseCategories().filter(c => c.id !== id);
  setStorageItem(STORAGE_KEYS.EXPENSE_CATEGORIES, categories);
  removeDocFromFirestore('expense_categories', id);
}

// ---------------- EXPENSES ----------------
export function getExpenses(): Expense[] {
  return getStorageItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
}

export function getExpenseById(id: string): Expense | undefined {
  return getExpenses().find(e => e.id === id);
}

export function saveExpense(expense: Expense): void {
  const expenses = getExpenses();
  const index = expenses.findIndex(e => e.id === expense.id);
  const now = new Date().toISOString();

  let targetExpense: Expense;
  if (index >= 0) {
    targetExpense = { ...expense, updatedAt: now };
    expenses[index] = targetExpense;
  } else {
    targetExpense = { ...expense, createdAt: now, updatedAt: now };
    expenses.push(targetExpense);
  }
  setStorageItem(STORAGE_KEYS.EXPENSES, expenses);
  syncDocToFirestore('expenses', targetExpense.id, targetExpense);
}

export function deleteExpense(id: string): void {
  const expenses = getExpenses().filter(e => e.id !== id);
  setStorageItem(STORAGE_KEYS.EXPENSES, expenses);
  removeDocFromFirestore('expenses', id);
}

// ---------------- TRANSFERS (INTERNAL BETWEEN ACCOUNTS) ----------------
export function getTransfers(): AccountTransfer[] {
  return getStorageItem<AccountTransfer[]>(STORAGE_KEYS.TRANSFERS, []);
}

export function getTransferById(id: string): AccountTransfer | undefined {
  return getTransfers().find(t => t.id === id);
}

export function saveTransfer(transfer: AccountTransfer): void {
  const transfers = getTransfers();
  const index = transfers.findIndex(t => t.id === transfer.id);
  const now = new Date().toISOString();

  let targetTransfer: AccountTransfer;
  if (index >= 0) {
    targetTransfer = { ...transfer, updatedAt: now };
    transfers[index] = targetTransfer;
  } else {
    targetTransfer = { ...transfer, createdAt: now, updatedAt: now };
    transfers.push(targetTransfer);
  }
  setStorageItem(STORAGE_KEYS.TRANSFERS, transfers);
  syncDocToFirestore('transfers', targetTransfer.id, targetTransfer);
}

export function deleteTransfer(id: string): void {
  const transfers = getTransfers().filter(t => t.id !== id);
  setStorageItem(STORAGE_KEYS.TRANSFERS, transfers);
  removeDocFromFirestore('transfers', id);
}

// ---------------- MANUAL TRANSACTIONS ----------------
export function getManualTransactions(): ManualTransaction[] {
  return getStorageItem<ManualTransaction[]>(STORAGE_KEYS.MANUAL_TRANSACTIONS, []);
}

export function getManualTransactionById(id: string): ManualTransaction | undefined {
  return getManualTransactions().find(m => m.id === id);
}

export function saveManualTransaction(tx: ManualTransaction): void {
  const transactions = getManualTransactions();
  const index = transactions.findIndex(t => t.id === tx.id);
  const now = new Date().toISOString();

  let targetTx: ManualTransaction;
  if (index >= 0) {
    targetTx = { ...tx, updatedAt: now };
    transactions[index] = targetTx;
  } else {
    targetTx = { ...tx, createdAt: now, updatedAt: now };
    transactions.push(targetTx);
  }
  setStorageItem(STORAGE_KEYS.MANUAL_TRANSACTIONS, transactions);
  syncDocToFirestore('manual_transactions', targetTx.id, targetTx);
}

export function deleteManualTransaction(id: string): void {
  const transactions = getManualTransactions().filter(t => t.id !== id);
  setStorageItem(STORAGE_KEYS.MANUAL_TRANSACTIONS, transactions);
  removeDocFromFirestore('manual_transactions', id);
}

// ---------------- DONATIONS & DONATION SETTINGS ----------------
export function getDonationSettings(): DonationSettings {
  return getStorageItem<DonationSettings>(STORAGE_KEYS.DONATION_SETTINGS, DEFAULT_DONATION_SETTINGS);
}

export function saveDonationSettings(settings: DonationSettings): void {
  const sanitized: DonationSettings = {
    ...settings,
    donationPerQty: Math.max(0, Number(settings.donationPerQty) || 0),
    updatedAt: new Date().toISOString(),
  };
  setStorageItem(STORAGE_KEYS.DONATION_SETTINGS, sanitized);
  syncDocToFirestore('settings', 'donation', sanitized);
}

export function getDonations(): DonationRecord[] {
  return getStorageItem<DonationRecord[]>(STORAGE_KEYS.DONATIONS, []);
}

export function getDonationById(id: string): DonationRecord | undefined {
  return getDonations().find((d) => d.id === id);
}

export function getDonationByInvoiceId(invoiceId: string): DonationRecord | undefined {
  return getDonations().find((d) => d.invoiceId === invoiceId);
}

export function saveDonation(donation: DonationRecord): void {
  const donations = getDonations();
  const index = donations.findIndex((d) => d.id === donation.id || d.invoiceId === donation.invoiceId);
  const now = new Date().toISOString();

  let targetDonation: DonationRecord;
  if (index >= 0) {
    targetDonation = { ...donation, updatedAt: now };
    donations[index] = targetDonation;
  } else {
    targetDonation = { ...donation, createdAt: now, updatedAt: now };
    donations.push(targetDonation);
  }
  setStorageItem(STORAGE_KEYS.DONATIONS, donations);
  syncDocToFirestore('donations', targetDonation.id, targetDonation);
}

export function deleteDonation(id: string): void {
  const donations = getDonations().filter((d) => d.id !== id);
  setStorageItem(STORAGE_KEYS.DONATIONS, donations);
  removeDocFromFirestore('donations', id);
}

export function deleteDonationByInvoiceId(invoiceId: string): void {
  const donations = getDonations();
  const target = donations.find((d) => d.invoiceId === invoiceId);
  if (target) {
    const updated = donations.filter((d) => d.invoiceId !== invoiceId);
    setStorageItem(STORAGE_KEYS.DONATIONS, updated);
    removeDocFromFirestore('donations', target.id);
  }
}

// ---------------- BACKUP & RESTORE ----------------
export function createBackup(): BackupData {
  const companySettings = getCompanySettings();
  const invoiceSettings = getInvoiceSettings();
  const appSettings = getAppSettings();
  const parties = getParties();
  const products = getProducts();
  const invoices = getInvoices();
  const payments = getPayments();
  const purchases = getPurchases();
  const accounts = getAccounts();
  const expenses = getExpenses();
  const expenseCategories = getExpenseCategories();
  const transfers = getTransfers();
  const manualTransactions = getManualTransactions();
  const donationSettings = getDonationSettings();
  const donations = getDonations();

  const backup: BackupData = {
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
    companySettings,
    invoiceSettings,
    appSettings,
    parties,
    products,
    invoices,
    payments,
    purchases,
    accounts,
    expenses,
    expenseCategories,
    transfers,
    manualTransactions,
    donationSettings,
    donations,
    stats: {
      partyCount: parties.length,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      productCount: products.length,
      purchaseCount: purchases.length,
      accountCount: accounts.length,
      expenseCount: expenses.length,
      donationCount: donations.length,
    },
  };

  const nowStr = new Date().toISOString();
  saveAppSettings({
    ...appSettings,
    lastBackupDate: nowStr,
  });

  return backup;
}

export function validateBackup(jsonString: string): { valid: boolean; data?: BackupData; error?: string } {
  try {
    const data = JSON.parse(jsonString) as BackupData;
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid JSON file content.' };
    }
    if (!Array.isArray(data.parties) || !Array.isArray(data.invoices) || !Array.isArray(data.payments)) {
      return { valid: false, error: 'Missing core database tables in backup file.' };
    }
    return { valid: true, data };
  } catch {
    return { valid: false, error: 'File is not a valid JSON document.' };
  }
}

export function restoreBackup(backup: BackupData): void {
  if (backup.companySettings) {
    saveCompanySettings(backup.companySettings);
  }
  if (backup.invoiceSettings) {
    saveInvoiceSettings(backup.invoiceSettings);
  }
  if (backup.appSettings) {
    saveAppSettings(backup.appSettings);
  }
  if (backup.donationSettings) {
    saveDonationSettings(backup.donationSettings);
  }
  if (Array.isArray(backup.parties)) {
    setStorageItem(STORAGE_KEYS.PARTIES, backup.parties);
    for (const p of backup.parties) syncDocToFirestore('parties', p.id, p);
  }
  if (Array.isArray(backup.products)) {
    setStorageItem(STORAGE_KEYS.PRODUCTS, backup.products);
    for (const pr of backup.products) syncDocToFirestore('products', pr.id, pr);
  }
  if (Array.isArray(backup.invoices)) {
    setStorageItem(STORAGE_KEYS.INVOICES, backup.invoices);
    for (const inv of backup.invoices) syncDocToFirestore('invoices', inv.id, inv);
  }
  if (Array.isArray(backup.payments)) {
    setStorageItem(STORAGE_KEYS.PAYMENTS, backup.payments);
    for (const pay of backup.payments) syncDocToFirestore('payments', pay.id, pay);
  }
  if (Array.isArray(backup.purchases)) {
    setStorageItem(STORAGE_KEYS.PURCHASES, backup.purchases);
    for (const pur of backup.purchases) syncDocToFirestore('purchases', pur.id, pur);
  }
  if (Array.isArray(backup.accounts)) {
    setStorageItem(STORAGE_KEYS.ACCOUNTS, backup.accounts);
    for (const acc of backup.accounts) syncDocToFirestore('accounts', acc.id, acc);
  }
  if (Array.isArray(backup.expenses)) {
    setStorageItem(STORAGE_KEYS.EXPENSES, backup.expenses);
    for (const exp of backup.expenses) syncDocToFirestore('expenses', exp.id, exp);
  }
  if (Array.isArray(backup.expenseCategories)) {
    setStorageItem(STORAGE_KEYS.EXPENSE_CATEGORIES, backup.expenseCategories);
    for (const cat of backup.expenseCategories) syncDocToFirestore('expense_categories', cat.id, cat);
  }
  if (Array.isArray(backup.transfers)) {
    setStorageItem(STORAGE_KEYS.TRANSFERS, backup.transfers);
    for (const trf of backup.transfers) syncDocToFirestore('transfers', trf.id, trf);
  }
  if (Array.isArray(backup.manualTransactions)) {
    setStorageItem(STORAGE_KEYS.MANUAL_TRANSACTIONS, backup.manualTransactions);
    for (const tx of backup.manualTransactions) syncDocToFirestore('manual_transactions', tx.id, tx);
  }
  if (Array.isArray(backup.donations)) {
    setStorageItem(STORAGE_KEYS.DONATIONS, backup.donations);
    for (const d of backup.donations) syncDocToFirestore('donations', d.id, d);
  }
  notifyStorageChange();
}

export function resetAllData(): void {
  // Clear local cache and re-initialize with clean accounts and zero demo records
  localStorage.removeItem(STORAGE_KEYS.PARTIES);
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  localStorage.removeItem(STORAGE_KEYS.INVOICES);
  localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
  localStorage.removeItem(STORAGE_KEYS.PURCHASES);
  localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
  localStorage.removeItem(STORAGE_KEYS.EXPENSES);
  localStorage.removeItem(STORAGE_KEYS.EXPENSE_CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.TRANSFERS);
  localStorage.removeItem(STORAGE_KEYS.MANUAL_TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEYS.COMPANY_SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.INVOICE_SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.APP_SETTINGS);
  initStorage();
  notifyStorageChange();
}

export function getStorageUsage(): { usedBytes: number; formattedSize: string; keyCount: number } {
  let totalBytes = 0;
  let keyCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keyCount++;
      const val = localStorage.getItem(key) || '';
      totalBytes += (key.length + val.length) * 2;
    }
  }

  let formattedSize = `${totalBytes} B`;
  if (totalBytes > 1024 * 1024) {
    formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (totalBytes > 1024) {
    formattedSize = `${(totalBytes / 1024).toFixed(1)} KB`;
  }

  return { usedBytes: totalBytes, formattedSize, keyCount };
}
