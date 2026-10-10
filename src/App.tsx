import React, { useState, useEffect, useCallback } from 'react';
import {
  initStorage,
  getCompanySettings,
  saveCompanySettings,
  getInvoiceSettings,
  saveInvoiceSettings,
  getAppSettings,
  saveAppSettings,
  getParties,
  saveParty,
  deleteParty,
  getProducts,
  saveProduct,
  deleteProduct,
  getInvoices,
  saveInvoice,
  deleteInvoice,
  getPayments,
  savePayment,
  deletePayment,
  getExpenses,
  saveExpense,
  deleteExpense,
  getExpenseCategories,
  getAccounts,
  getTransfers,
  getManualTransactions,
  saveManualTransaction,
  deleteManualTransaction,
  getPurchases,
  getDonationSettings,
  saveDonationSettings,
  getDonations,
  saveDonation,
  deleteDonation,
  createBackup,
  restoreBackup,
  resetAllData,
  STORAGE_CHANGE_EVENT,
  validateBackup,
} from './db/storage';
import {
  CompanySettings,
  InvoiceSettings,
  AppSettings,
  Party,
  Product,
  Invoice,
  Payment,
  Expense,
  ExpenseCategory,
  Account,
  AccountTransfer,
  ManualTransaction,
  Purchase,
  DonationSettings,
  DonationRecord,
} from './types';
import { calculateDashboardMetrics } from './utils/accounting';
import { downloadBlob } from './utils/shareUtils';
import { Header } from './components/layout/Header';
import { Navigation, NavTab } from './components/layout/Navigation';
import { ToastContainer, ToastMessage, ToastType } from './components/common/Toast';
import { LockScreen } from './components/auth/LockScreen';
import { FirstTimeSetup } from './components/setup/FirstTimeSetup';
import { Dashboard } from './components/dashboard/Dashboard';
import { PartyList } from './components/parties/PartyList';
import { PartyFormModal } from './components/parties/PartyFormModal';
import { PartyLedgerModal } from './components/parties/PartyLedgerModal';
import { InvoiceList } from './components/invoices/InvoiceList';
import { InvoiceForm } from './components/invoices/InvoiceForm';
import { InvoiceViewModal } from './components/invoices/InvoiceViewModal';
import { PaymentHistory } from './components/payments/PaymentHistory';
import { PaymentFormModal } from './components/payments/PaymentFormModal';
import { ExpenseList } from './components/expenses/ExpenseList';
import { ExpenseFormModal } from './components/expenses/ExpenseFormModal';
import { AccountsHub } from './components/accounts/AccountsHub';
import { ManualCashModal } from './components/accounts/ManualCashModal';
import { ManualBankModal } from './components/accounts/ManualBankModal';
import { ProductList } from './components/products/ProductList';
import { ReportsHub } from './components/reports/ReportsHub';
import { DonationHub } from './components/donations/DonationHub';
import { SettingsHub } from './components/settings/SettingsHub';

export function App() {
  // Initialize storage once on boot
  useEffect(() => {
    initStorage();
  }, []);

  // Core database state from LocalStorage
  const [company, setCompany] = useState<CompanySettings>(getCompanySettings());
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(getInvoiceSettings());
  const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings());
  const [parties, setParties] = useState<Party[]>(getParties());
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [invoices, setInvoices] = useState<Invoice[]>(getInvoices());
  const [payments, setPayments] = useState<Payment[]>(getPayments());
  const [expenses, setExpenses] = useState<Expense[]>(getExpenses());
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(getExpenseCategories());
  const [accounts, setAccounts] = useState<Account[]>(getAccounts());
  const [transfers, setTransfers] = useState<AccountTransfer[]>(getTransfers());
  const [manualTransactions, setManualTransactions] = useState<ManualTransaction[]>(getManualTransactions());
  const [purchases, setPurchases] = useState<Purchase[]>(getPurchases());
  const [donationSettings, setDonationSettings] = useState<DonationSettings>(getDonationSettings());
  const [donations, setDonations] = useState<DonationRecord[]>(getDonations());

  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [subView, setSubView] = useState<string | undefined>(undefined);

  // App Lock & Auth state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!appSettings.appLockEnabled);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveDonationSettings = (newSettings: DonationSettings) => {
    saveDonationSettings(newSettings);
    setDonationSettings(newSettings);
    showToast('Donation settings updated.');
  };

  const handleSaveDonationRecord = (record: DonationRecord) => {
    saveDonation(record);
    setDonations(getDonations());
    showToast('Donation record saved.');
  };

  const handleDeleteDonationRecord = (recordId: string) => {
    deleteDonation(recordId);
    setDonations(getDonations());
    showToast('Donation record deleted.');
  };

  // Synchronize state with storage mutations
  const reloadData = useCallback(() => {
    setCompany(getCompanySettings());
    setInvoiceSettings(getInvoiceSettings());
    setAppSettings(getAppSettings());
    setParties(getParties());
    setProducts(getProducts());
    setInvoices(getInvoices());
    setPayments(getPayments());
    setExpenses(getExpenses());
    setExpenseCategories(getExpenseCategories());
    setAccounts(getAccounts());
    setTransfers(getTransfers());
    setManualTransactions(getManualTransactions());
    setPurchases(getPurchases());
    setDonationSettings(getDonationSettings());
    setDonations(getDonations());
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      reloadData();
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    };
  }, [reloadData]);

  // Modal Dialog States
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [invoiceFormParty, setInvoiceFormParty] = useState<Party | null>(null);

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoiceAction, setViewingInvoiceAction] = useState<'view' | 'print' | 'whatsapp'>('view');

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [partyToEdit, setPartyToEdit] = useState<Party | null>(null);

  const [ledgerParty, setLedgerParty] = useState<Party | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
  const [paymentPreselectParty, setPaymentPreselectParty] = useState<Party | null>(null);
  const [paymentDefaultType, setPaymentDefaultType] = useState<'received' | 'paid'>('received');

  // Expense & Account Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  // Dashboard calculations
  const dashboardMetrics = calculateDashboardMetrics(
    parties,
    invoices,
    payments,
    purchases,
    expenses,
    transfers,
    manualTransactions,
    accounts
  );

  // ---------------- INVOICE ACTIONS ----------------
  const handleOpenNewInvoice = (preselectedParty?: Party) => {
    setInvoiceToEdit(null);
    setInvoiceFormParty(preselectedParty || null);
    setIsInvoiceFormOpen(true);
  };

  const handleEditInvoice = (inv: Invoice) => {
    setInvoiceToEdit(inv);
    setInvoiceFormParty(null);
    setIsInvoiceFormOpen(true);
  };

  const handleSaveInvoice = (savedInvoice: Invoice, actionAfter?: 'view' | 'print' | 'whatsapp') => {
    try {
      saveInvoice(savedInvoice);
      setIsInvoiceFormOpen(false);
      showToast(`Invoice #${savedInvoice.invoiceNo} saved successfully.`);

      if (actionAfter === 'view' || actionAfter === 'print' || actionAfter === 'whatsapp') {
        setViewingInvoiceAction(actionAfter);
        setViewingInvoice(savedInvoice);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save invoice. Please try again.', 'error');
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    try {
      deleteInvoice(invoiceId);
      showToast('Invoice deleted and related balance corrected.');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete invoice.', 'error');
    }
  };

  // ---------------- PARTY ACTIONS ----------------
  const handleOpenAddParty = () => {
    setPartyToEdit(null);
    setIsPartyModalOpen(true);
  };

  const handleEditParty = (party: Party) => {
    setPartyToEdit(party);
    setIsPartyModalOpen(true);
  };

  const handleSaveParty = (savedParty: Party) => {
    try {
      saveParty(savedParty);
      showToast(`Customer "${savedParty.name}" saved successfully.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to save customer.', 'error');
    }
  };

  const handleDeleteParty = (partyId: string) => {
    try {
      deleteParty(partyId);
      showToast('Party deleted successfully.');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete party.', 'error');
    }
  };

  // ---------------- PAYMENT ACTIONS ----------------
  const handleOpenNewPayment = (party?: Party, defaultType: 'received' | 'paid' = 'received') => {
    setPaymentToEdit(null);
    setPaymentPreselectParty(party || null);
    setPaymentDefaultType(defaultType);
    setIsPaymentModalOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setPaymentToEdit(payment);
    setPaymentPreselectParty(null);
    setPaymentDefaultType(payment.paymentType || 'received');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (payment: Payment) => {
    try {
      savePayment(payment);
      showToast(`Payment receipt of ${company.currency} ${payment.amount} recorded.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to record payment.', 'error');
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    try {
      deletePayment(paymentId);
      showToast('Payment deleted and party balance updated.');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete payment.', 'error');
    }
  };

  // ---------------- EXPENSE ACTIONS ----------------
  const handleOpenNewExpense = () => {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (exp: Expense) => {
    setExpenseToEdit(exp);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (exp: Expense) => {
    try {
      saveExpense(exp);
      setIsExpenseModalOpen(false);
      showToast(`Expense of ${company.currency} ${exp.amount} recorded.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to save expense.', 'error');
    }
  };

  const handleDeleteExpense = (expId: string) => {
    try {
      deleteExpense(expId);
      showToast('Expense deleted.');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete expense.', 'error');
    }
  };

  // ---------------- MANUAL CASH & BANK ACTIONS ----------------
  const handleSaveManualTx = (tx: ManualTransaction) => {
    try {
      saveManualTransaction(tx);
      setIsCashModalOpen(false);
      setIsBankModalOpen(false);
      showToast(`Transaction of ${company.currency} ${tx.amount} recorded.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to record transaction.', 'error');
    }
  };

  // ---------------- BACKUP & RESTORE ----------------
  const handleExportBackup = () => {
    try {
      const backup = createBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${company.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup_${dateStr}.json`;
      downloadBlob(blob, filename);
      reloadData();
      showToast('Backup exported successfully! File downloaded.');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate backup.', 'error');
    }
  };

  const handleImportBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const validation = validateBackup(text);
        if (!validation.valid || !validation.data) {
          showToast(validation.error || 'Invalid backup file.', 'error');
          return;
        }
        restoreBackup(validation.data);
        reloadData();
        showToast('Backup restored successfully! All records loaded.');
      } catch (err) {
        console.error(err);
        showToast('Failed to restore backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    try {
      resetAllData();
      reloadData();
      showToast('Database reset complete. Default settings initialized.');
    } catch (err) {
      console.error(err);
      showToast('Failed to reset data.', 'error');
    }
  };

  // Sample invoice for live preview in Settings
  const sampleInvoice: Invoice = invoices[0] || {
    id: 'inv_sample',
    invoiceNo: 'INV-1001',
    date: new Date().toISOString().split('T')[0],
    time: '12:30',
    partyId: 'sample_party',
    partyName: 'Al-Madina Traders',
    partyPhone: '0300-1234567',
    partyAddress: 'Commercial Market, Lahore',
    items: [
      {
        id: 'sample_item_1',
        description: 'Cotton Fabric Suite (Unstitched)',
        quantity: 10,
        unit: 'Piece',
        rate: 2500,
        discount: 500,
        amount: 24500,
      },
      {
        id: 'sample_item_2',
        description: 'Printed Lawn Shirt',
        quantity: 5,
        unit: 'Piece',
        rate: 1500,
        discount: 0,
        amount: 7500,
      },
    ],
    subtotal: 32000,
    discount: 1000,
    grandTotal: 31000,
    previousBalance: 15000,
    paidAmount: 20000,
    remainingAmount: 11000,
    newBalance: 26000,
    paymentMethod: 'Cash',
    notes: 'Sample invoice preview',
    status: 'Partial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If App Lock is enabled and not unlocked yet
  if (appSettings.appLockEnabled && !isUnlocked) {
    return (
      <LockScreen
        company={company}
        expectedPin={appSettings.appLockPin}
        onUnlock={() => setIsUnlocked(true)}
      />
    );
  }

  // First time configuration onboarding
  if (!appSettings.isConfigured) {
    return (
      <FirstTimeSetup
        initialCompany={company}
        initialInvoiceSettings={invoiceSettings}
        onComplete={(newCompany, newInvoiceSettings) => {
          saveCompanySettings(newCompany);
          saveInvoiceSettings(newInvoiceSettings);
          saveAppSettings({ ...appSettings, isConfigured: true });
          reloadData();
          showToast('Welcome to Veloce Ledger! Setup completed.');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-20 md:pb-6">
      {/* Brand Header */}
      <Header
        company={company}
        appSettings={appSettings}
        onNewInvoice={() => handleOpenNewInvoice()}
        onNavigateSettings={() => {
          setActiveTab('settings');
          setSubView('backup');
        }}
      />

      {/* Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSubView(undefined);
          setIsInvoiceFormOpen(false);
        }}
        softwareTheme={appSettings.softwareTheme}
      />

      {/* Main Content Area - pb-24 on mobile so pinned bottom bar never covers buttons/inputs */}
      <main className="flex-1 pb-24 md:pb-8">
        {/* If Invoice Form is open */}
        {isInvoiceFormOpen ? (
          <InvoiceForm
            invoiceToEdit={invoiceToEdit}
            initialParty={invoiceFormParty}
            company={company}
            invoiceSettings={invoiceSettings}
            onSave={handleSaveInvoice}
            onCancel={() => setIsInvoiceFormOpen(false)}
            onPartyCreated={(newParty) => {
              reloadData();
              showToast(`Party "${newParty.name}" added to Parties & Ledger.`);
            }}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                company={company}
                appSettings={appSettings}
                metrics={dashboardMetrics}
                parties={parties}
                invoices={invoices}
                payments={payments}
                purchases={purchases}
                expenses={expenses}
                onNavigate={(tab, view) => {
                  setActiveTab(tab);
                  setSubView(view);
                }}
                onNewInvoice={(party) => handleOpenNewInvoice(party)}
                onNewPayment={(party, type) => handleOpenNewPayment(party, type)}
                onNewExpense={handleOpenNewExpense}
                onNewCashEntry={() => setIsCashModalOpen(true)}
                onNewBankEntry={() => setIsBankModalOpen(true)}
                onViewPartyLedger={(party) => setLedgerParty(party)}
                onViewInvoice={(inv) => {
                  setViewingInvoiceAction('view');
                  setViewingInvoice(inv);
                }}
                onWhatsAppInvoice={(inv) => {
                  setViewingInvoiceAction('whatsapp');
                  setViewingInvoice(inv);
                }}
                onExportBackup={handleExportBackup}
                onImportBackup={() => {
                  setActiveTab('settings');
                  setSubView('backup');
                }}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoiceList
                invoices={invoices}
                company={company}
                invoiceSettings={invoiceSettings}
                onNewInvoice={() => handleOpenNewInvoice()}
                onViewInvoice={(inv) => {
                  setViewingInvoiceAction('view');
                  setViewingInvoice(inv);
                }}
                onWhatsAppInvoice={(inv) => {
                  setViewingInvoiceAction('whatsapp');
                  setViewingInvoice(inv);
                }}
                onEditInvoice={handleEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                initialFilter={subView}
              />
            )}

            {activeTab === 'parties' && (
              <PartyList
                parties={parties}
                company={company}
                onAddParty={handleOpenAddParty}
                onEditParty={handleEditParty}
                onDeleteParty={handleDeleteParty}
                onViewLedger={(party) => setLedgerParty(party)}
                onAddPayment={(party) => handleOpenNewPayment(party)}
                onNewInvoice={(party) => handleOpenNewInvoice(party)}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentHistory
                payments={payments}
                company={company}
                onNewPayment={() => handleOpenNewPayment()}
                onEditPayment={handleEditPayment}
                onDeletePayment={handleDeletePayment}
                initialFilter={subView}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpenseList
                expenses={expenses}
                categories={expenseCategories}
                company={company}
                onAddExpense={handleOpenNewExpense}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'accounts' && (
              <AccountsHub
                company={company}
                accounts={accounts}
                payments={payments}
                expenses={expenses}
                manualTransactions={manualTransactions}
                initialView={subView === 'bank' ? 'bank' : 'cash'}
                onNewCashEntry={() => setIsCashModalOpen(true)}
                onNewBankEntry={() => setIsBankModalOpen(true)}
              />
            )}

            {activeTab === 'products' && (
              <ProductList
                products={products}
                company={company}
                onSaveProduct={(prod) => {
                  saveProduct(prod);
                  showToast(`Product "${prod.name}" saved.`);
                }}
                onDeleteProduct={(prodId) => {
                  deleteProduct(prodId);
                  showToast('Product deleted.');
                }}
              />
            )}

            {activeTab === 'donations' && (
              <DonationHub
                company={company}
                donationSettings={donationSettings}
                donations={donations}
                invoices={invoices}
                onSaveDonationSettings={handleSaveDonationSettings}
                onSaveDonationRecord={handleSaveDonationRecord}
                onDeleteDonationRecord={handleDeleteDonationRecord}
                onViewInvoice={(inv) => {
                  setViewingInvoiceAction('view');
                  setViewingInvoice(inv);
                }}
                initialTab={(subView as any) || 'ledger'}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsHub
                company={company}
                parties={parties}
                invoices={invoices}
                payments={payments}
                initialSubView={subView}
                onViewInvoice={(inv) => {
                  setViewingInvoiceAction('view');
                  setViewingInvoice(inv);
                }}
                onViewPartyLedger={(party) => setLedgerParty(party)}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsHub
                company={company}
                invoiceSettings={invoiceSettings}
                appSettings={appSettings}
                donationSettings={donationSettings}
                onSaveCompany={(newComp) => {
                  saveCompanySettings(newComp);
                  showToast('Company profile updated.');
                }}
                onSaveInvoiceSettings={(newInvSet) => {
                  saveInvoiceSettings(newInvSet);
                  showToast('Invoice design preferences saved.');
                }}
                onSaveAppSettings={(newAppSet) => {
                  saveAppSettings(newAppSet);
                  showToast('Application preferences saved.');
                }}
                onSaveDonationSettings={handleSaveDonationSettings}
                onExportBackup={handleExportBackup}
                onImportBackupFile={handleImportBackupFile}
                onResetAllData={handleResetAllData}
                initialSection={subView || 'company'}
                sampleInvoice={sampleInvoice}
              />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}

      {/* 1. Invoice View / Print / Share Modal */}
      {viewingInvoice && (
        <InvoiceViewModal
          isOpen={Boolean(viewingInvoice)}
          onClose={() => {
            setViewingInvoice(null);
            setViewingInvoiceAction('view');
          }}
          invoice={viewingInvoice}
          company={company}
          settings={invoiceSettings}
          party={parties.find((p) => p.id === viewingInvoice.partyId)}
          initialAction={viewingInvoiceAction}
        />
      )}

      {/* 2. Party Add / Edit Modal */}
      <PartyFormModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        onSave={handleSaveParty}
        partyToEdit={partyToEdit}
        currency={company.currency}
      />

      {/* 3. Party Ledger Modal */}
      {ledgerParty && (
        <PartyLedgerModal
          isOpen={Boolean(ledgerParty)}
          onClose={() => setLedgerParty(null)}
          party={ledgerParty}
          company={company}
          invoiceSettings={invoiceSettings}
          onAddPayment={(party) => {
            setLedgerParty(null);
            handleOpenNewPayment(party);
          }}
          onNewInvoice={(party) => {
            setLedgerParty(null);
            handleOpenNewInvoice(party);
          }}
        />
      )}

      {/* 4. Payment Form Modal */}
      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
        partyToPreselect={paymentPreselectParty}
        paymentToEdit={paymentToEdit}
        company={company}
        defaultType={paymentDefaultType}
      />

      {/* 5. Expense Form Modal */}
      {isExpenseModalOpen && (
        <ExpenseFormModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setExpenseToEdit(null);
          }}
          onSave={handleSaveExpense}
          expenseToEdit={expenseToEdit}
          currency={company.currency}
        />
      )}

      {/* 6. Manual Cash Entry Modal */}
      {isCashModalOpen && (
        <ManualCashModal
          isOpen={isCashModalOpen}
          onClose={() => setIsCashModalOpen(false)}
          onSave={handleSaveManualTx}
          currency={company.currency}
        />
      )}

      {/* 7. Manual Bank Entry Modal */}
      {isBankModalOpen && (
        <ManualBankModal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          onSave={handleSaveManualTx}
          accounts={accounts}
          currency={company.currency}
        />
      )}

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
export default App;
