import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Palette,
  HardDriveDownload,
  Upload,
  Shield,
  Trash2,
  Image as ImageIcon,
  Save,
  Check,
  AlertTriangle,
  Database,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Smartphone,
  FileText,
  Share2,
  Cloud,
  RefreshCw,
  Banknote,
  Plus,
  Heart,
  Calculator,
  Info,
  Package,
  Search,
} from 'lucide-react';
import {
  Account,
  AppSettings,
  BackupData,
  CompanySettings,
  DonationSettings,
  Invoice,
  InvoiceSettings,
  SoftwareTheme,
  InvoiceTheme,
  InvoiceHeaderStyle,
  InvoiceTableStyle,
  FontFamily,
  RowSpacing,
  CompanyPosition,
  Product,
} from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { InvoicePrintTemplate } from '../invoices/InvoicePrintTemplate';
import { ConfirmModal } from '../common/ConfirmModal';
import { Modal } from '../common/Modal';
import {
  DEFAULT_INVOICE_SETTINGS,
  getStorageUsage,
  validateBackup,
  getFirebaseSyncStatus,
  pushAllToFirebase,
  pullAllFromFirebase,
  getAccounts,
  saveAccount,
  deleteAccount,
  getDonationSettings,
  saveDonationSettings,
  getProducts,
  saveProduct,
  toggleProductInvoiceVisibility,
  STORAGE_CHANGE_EVENT,
} from '../../db/storage';
import { SOFTWARE_THEMES } from '../../utils/themeUtils';

interface SettingsHubProps {
  company: CompanySettings;
  invoiceSettings: InvoiceSettings;
  appSettings: AppSettings;
  donationSettings?: DonationSettings;
  onSaveCompany: (settings: CompanySettings) => void;
  onSaveInvoiceSettings: (settings: InvoiceSettings) => void;
  onSaveAppSettings: (settings: AppSettings) => void;
  onSaveDonationSettings?: (settings: DonationSettings) => void;
  onExportBackup: () => void;
  onImportBackupFile: (file: File) => void;
  onResetAllData: () => void;
  initialSection?: string;
  sampleInvoice: Invoice;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({
  company,
  invoiceSettings,
  appSettings,
  donationSettings,
  onSaveCompany,
  onSaveInvoiceSettings,
  onSaveAppSettings,
  onSaveDonationSettings,
  onExportBackup,
  onImportBackupFile,
  onResetAllData,
  initialSection = 'company',
  sampleInvoice,
}) => {
  const [activeSection, setActiveSection] = useState(initialSection);

  // Company Settings Form State
  const [companyForm, setCompanyForm] = useState<CompanySettings>({ ...company });
  const [companySavedToast, setCompanySavedToast] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setCompanyForm({ ...company });
  }, [company]);

  useEffect(() => {
    setDesignForm({ ...invoiceSettings });
  }, [invoiceSettings]);

  useEffect(() => {
    setActiveSoftwareTheme(appSettings.softwareTheme || 'purple');
    setAppLockEnabled(appSettings.appLockEnabled);
    setAppLockPin(appSettings.appLockPin || '');
  }, [appSettings]);

  // Donation Settings in Settings Hub
  const [donationForm, setDonationForm] = useState<DonationSettings>(
    donationSettings || getDonationSettings()
  );
  const [donationSavedToast, setDonationSavedToast] = useState(false);

  useEffect(() => {
    if (donationSettings) {
      setDonationForm(donationSettings);
    }
  }, [donationSettings]);

  // Logo Preview Modal
  const [isPreviewLogoModalOpen, setIsPreviewLogoModalOpen] = useState(false);

  // Invoice Design Form State (Live changes)
  const [designForm, setDesignForm] = useState<InvoiceSettings>({ ...invoiceSettings });
  const [previewFormat, setPreviewFormat] = useState<'a4' | 'thermal' | 'whatsapp'>('a4');
  const [designSavedToast, setDesignSavedToast] = useState(false);

  // Software Theme State
  const [activeSoftwareTheme, setActiveSoftwareTheme] = useState<SoftwareTheme>(
    appSettings.softwareTheme || 'purple'
  );
  const [softwareThemeSavedToast, setSoftwareThemeSavedToast] = useState(false);

  // App Lock State
  const [appLockEnabled, setAppLockEnabled] = useState(appSettings.appLockEnabled);
  const [appLockPin, setAppLockPin] = useState(appSettings.appLockPin || '');
  const [lockSavedToast, setLockSavedToast] = useState(false);

  // Reset confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Restore Preview Modal
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accounts & Opening Balances State
  const [accountsList, setAccountsList] = useState<Account[]>(getAccounts());
  const [newBankName, setNewBankName] = useState('');
  const [newAccTitle, setNewAccTitle] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccOpening, setNewAccOpening] = useState<number>(0);
  const [isAddingBankAcc, setIsAddingBankAcc] = useState(false);
  const [accountsSavedToast, setAccountsSavedToast] = useState(false);

  // Products & Invoice Visibility State (Settings -> Products -> Invoice Visibility)
  const [productsList, setProductsList] = useState<Product[]>(getProducts());
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [productVisibilityToast, setProductVisibilityToast] = useState(false);

  useEffect(() => {
    const onStorage = () => setProductsList(getProducts());
    window.addEventListener(STORAGE_CHANGE_EVENT, onStorage);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, onStorage);
  }, []);

  const handleToggleProductVisibilityInHub = (productId: string, show: boolean) => {
    toggleProductInvoiceVisibility(productId, show);
    setProductsList(getProducts());
    setProductVisibilityToast(true);
    setTimeout(() => setProductVisibilityToast(false), 2000);
  };

  const handleSetAllVisibilityInHub = (show: boolean) => {
    const prods = getProducts();
    prods.forEach((p) => {
      toggleProductInvoiceVisibility(p.id, show);
    });
    setProductsList(getProducts());
    setProductVisibilityToast(true);
    setTimeout(() => setProductVisibilityToast(false), 2000);
  };

  const handleUpdateAccount = (acc: Account, newOpening: number) => {
    const updated: Account = {
      ...acc,
      openingBalance: newOpening,
      updatedAt: new Date().toISOString(),
    };
    saveAccount(updated);
    setAccountsList(getAccounts());
    setAccountsSavedToast(true);
    setTimeout(() => setAccountsSavedToast(false), 2500);
  };

  const handleAddNewBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccTitle.trim()) return;

    const newAcc: Account = {
      id: `acc_${Date.now()}`,
      accountName: newAccTitle.trim(),
      accountType: 'bank',
      bankName: newBankName.trim() || undefined,
      accountNumber: newAccNumber.trim() || undefined,
      openingBalance: Number(newAccOpening) || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAccount(newAcc);
    setAccountsList(getAccounts());
    setNewAccTitle('');
    setNewBankName('');
    setNewAccNumber('');
    setNewAccOpening(0);
    setIsAddingBankAcc(false);
    setAccountsSavedToast(true);
    setTimeout(() => setAccountsSavedToast(false), 2500);
  };

  const handleDeleteBankAcc = (accId: string) => {
    if (accId === 'acc_cash') return; // Cannot delete primary cash
    deleteAccount(accId);
    setAccountsList(getAccounts());
    setAccountsSavedToast(true);
    setTimeout(() => setAccountsSavedToast(false), 2500);
  };

  // Firebase Sync State
  const syncStatus = getFirebaseSyncStatus();
  const storageUsage = getStorageUsage();
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseMessage, setFirebaseMessage] = useState<string | null>(null);

  const handlePushFirebase = async () => {
    setIsSyncingFirebase(true);
    setFirebaseMessage(null);
    try {
      await pushAllToFirebase();
      setFirebaseMessage('✓ Successfully pushed all records to Firebase Firestore!');
    } catch (err: any) {
      setFirebaseMessage(`Push failed: ${err.message || 'Error'}`);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handlePullFirebase = async () => {
    setIsSyncingFirebase(true);
    setFirebaseMessage(null);
    try {
      await pullAllFromFirebase();
      setFirebaseMessage('✓ Successfully fetched and updated records from Firebase Firestore!');
    } catch (err: any) {
      setFirebaseMessage(`Pull failed: ${err.message || 'Error'}`);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCompany(companyForm);
    setCompanySavedToast(true);
    setTimeout(() => setCompanySavedToast(false), 2500);
  };

  const handleDesignSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveInvoiceSettings(designForm);
    setDesignSavedToast(true);
    setTimeout(() => setDesignSavedToast(false), 2500);
  };

  const handleResetDesign = () => {
    setDesignForm({ ...DEFAULT_INVOICE_SETTINGS });
    onSaveInvoiceSettings({ ...DEFAULT_INVOICE_SETTINGS });
    setDesignSavedToast(true);
    setTimeout(() => setDesignSavedToast(false), 2500);
  };

  const handleSelectSoftwareTheme = (theme: SoftwareTheme) => {
    setActiveSoftwareTheme(theme);
    const updated = { ...appSettings, softwareTheme: theme };
    onSaveAppSettings(updated);
    setSoftwareThemeSavedToast(true);
    setTimeout(() => setSoftwareThemeSavedToast(false), 2500);
  };

  const handleSaveAppLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (appLockEnabled && (!appLockPin || appLockPin.length < 4)) {
      alert('Please enter at least a 4-digit security PIN.');
      return;
    }
    onSaveAppSettings({
      ...appSettings,
      appLockEnabled,
      appLockPin: appLockEnabled ? appLockPin : '',
    });
    setLockSavedToast(true);
    setTimeout(() => setLockSavedToast(false), 2500);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Please choose an image under 3MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoData = reader.result as string;
        if (logoData) {
          const updated = { ...companyForm, logo: logoData };
          setCompanyForm(updated);
          onSaveCompany(updated);
          setCompanySavedToast(true);
          setTimeout(() => setCompanySavedToast(false), 2500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    const updated = { ...companyForm, logo: '' };
    setCompanyForm(updated);
    onSaveCompany(updated);
    setCompanySavedToast(true);
    setTimeout(() => setCompanySavedToast(false), 2500);
  };

  const handleSaveDonationInSettingsHub = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Math.max(0, Number(donationForm.donationPerQty) || 0);
    const updated: DonationSettings = {
      ...donationForm,
      donationPerQty: rate,
      updatedAt: new Date().toISOString(),
    };
    saveDonationSettings(updated);
    if (onSaveDonationSettings) {
      onSaveDonationSettings(updated);
    }
    setDonationSavedToast(true);
    setTimeout(() => setDonationSavedToast(false), 2500);
  };

  const handleFilePickedForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateBackup(content);
      if (!validation.valid || !validation.data) {
        setRestoreError(validation.error || 'Invalid backup file format.');
        setPendingRestoreData(null);
      } else {
        setRestoreError('');
        setPendingRestoreData(validation.data);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-700" />
            System Settings & Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your business profile, software theme, invoice design & backups
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
        {[
          { id: 'theme', label: 'Appearance / Software Theme', icon: Sparkles },
          { id: 'design', label: 'Invoice Design & Live Preview', icon: Palette },
          { id: 'products', label: 'Products / Invoice Visibility', icon: Package },
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'logo', label: 'Business Logo', icon: ImageIcon },
          { id: 'donations', label: 'Donation Settings', icon: Heart },
          { id: 'accounts', label: 'Opening Balances & Accounts', icon: Banknote },
          { id: 'backup', label: 'Backup & Restore', icon: HardDriveDownload },
          { id: 'security', label: 'App Lock', icon: Shield },
          { id: 'firebase', label: 'Firebase Cloud & Storage', icon: Cloud },
          { id: 'data', label: 'Data Storage', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------- PRODUCT INVOICE VISIBILITY SECTION (Settings -> Products -> Invoice Visibility) ---------------- */}
      {activeSection === 'products' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider mb-0.5">
                <span>Settings</span>
                <span>→</span>
                <span>Products</span>
                <span>→</span>
                <span>Invoice Visibility</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-700" />
                Product Visibility for Customer Invoices
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Control which products appear on customer invoices, prints, PDFs, 58mm/80mm thermal receipts, and WhatsApp shares.
                <strong className="text-slate-700 ml-1">
                  Hidden items remain 100% active in inventory, stock, purchases, sales, cost calculations, and ledger accounts.
                </strong>
              </p>
            </div>

            {productVisibilityToast && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs shrink-0 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600" /> Visibility setting updated!
              </span>
            )}
          </div>

          {/* Quick Stats & Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Products
                </span>
                <span className="text-xl font-black text-slate-900">{productsList.length}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
                  Visible on Invoices
                </span>
                <span className="text-xl font-black text-emerald-800">
                  {productsList.filter((p) => p.showOnInvoice !== false).length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Eye className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">
                  Hidden from Invoices
                </span>
                <span className="text-xl font-black text-amber-800">
                  {productsList.filter((p) => p.showOnInvoice === false).length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <EyeOff className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search, Filter Pills & Bulk Actions */}
          <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name, code, barcode..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs"
                />
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetAllVisibilityInHub(true)}
                  className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Make all products visible on invoices"
                >
                  <Eye className="w-3.5 h-3.5" /> Show All
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllVisibilityInHub(false)}
                  className="px-3 py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Hide all products from invoices"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Hide All
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 text-xs">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider mr-1">
                Show Filter:
              </span>
              <button
                type="button"
                onClick={() => setProductFilter('all')}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  productFilter === 'all'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Products ({productsList.length})
              </button>
              <button
                type="button"
                onClick={() => setProductFilter('visible')}
                className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  productFilter === 'visible'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Visible on Invoice ({productsList.filter((p) => p.showOnInvoice !== false).length})
              </button>
              <button
                type="button"
                onClick={() => setProductFilter('hidden')}
                className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  productFilter === 'hidden'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                Hidden from Invoice ({productsList.filter((p) => p.showOnInvoice === false).length})
              </button>
            </div>
          </div>

          {/* Product Items Table */}
          {(() => {
            const filtered = productsList.filter((p) => {
              const term = productSearch.toLowerCase();
              const matches =
                p.name.toLowerCase().includes(term) ||
                (p.code && p.code.toLowerCase().includes(term)) ||
                (p.barcode && p.barcode.toLowerCase().includes(term)) ||
                (p.category && p.category.toLowerCase().includes(term));
              if (!matches) return false;
              if (productFilter === 'visible') return p.showOnInvoice !== false;
              if (productFilter === 'hidden') return p.showOnInvoice === false;
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No products match this filter</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try changing your search keywords or toggle the filter pills.
                  </p>
                </div>
              );
            }

            return (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-right">Rate</th>
                      <th className="py-3 px-3 text-center">Current Status</th>
                      <th className="py-3 px-4 text-right">Invoice Visibility Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filtered.map((p) => {
                      const isVisible = p.showOnInvoice !== false;
                      return (
                        <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div>{p.name}</div>
                            {p.code && (
                              <span className="text-[10px] font-mono text-slate-400">
                                Code: {p.code}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{p.category || '-'}</td>
                          <td className="py-3 px-3 text-right font-black text-slate-800">
                            {formatCurrency(p.saleRate, company.currency || 'Rs.')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isVisible ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Eye className="w-3 h-3" /> Visible
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <EyeOff className="w-3 h-3" /> Hidden
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleToggleProductVisibilityInHub(p.id, true)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isVisible
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                }`}
                              >
                                👁 Show on Invoice
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleProductVisibilityInHub(p.id, false)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  !isVisible
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                }`}
                              >
                                🚫 Hide from Invoice
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Educational Note */}
          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-950 space-y-1">
            <h4 className="font-bold flex items-center gap-1.5 text-purple-900">
              <Info className="w-4 h-4 text-purple-700" /> Accounting Integrity Guarantee
            </h4>
            <p className="text-[11px] text-purple-800 leading-relaxed">
              When a product is hidden from customer invoices, its price and quantity are still fully included in internal sales transactions, stock deduction, purchase logs, reports, and party ledger balances. Only the customer printout and PDF omit the row so that internal materials or sensitive product lines are not exposed to clients.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- OPENING BALANCES & ACCOUNTS SECTION (SECTION 12) ---------------- */}
      {activeSection === 'accounts' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-purple-700" />
                Opening Cash & Bank Balances
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your starting cash in hand and bank balances. These will serve as initial opening entries in your respective ledgers.
              </p>
            </div>
            {accountsSavedToast && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Account settings updated!
              </span>
            )}
          </div>

          {/* Cash in Hand Opening Balance */}
          {(() => {
            const cashAcc = accountsList.find((a) => a.id === 'acc_cash' || a.accountType === 'cash');
            return (
              <div className="bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                      Primary Cash Account
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">Cash in Hand</h4>
                    <p className="text-xs text-slate-500">
                      Used for default cash sales, cash receipts, and store cash expenses.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        {company.currency || 'Rs.'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        defaultValue={cashAcc?.openingBalance || 0}
                        onBlur={(e) => {
                          if (cashAcc) {
                            handleUpdateAccount(cashAcc, parseFloat(e.target.value) || 0);
                          }
                        }}
                        className="pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 w-36 outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">Opening Balance</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Bank Accounts List & Opening Balances */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Bank Accounts & Ledgers</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set opening balances for each bank or Islamic banking account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingBankAcc(!isAddingBankAcc)}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Bank Account
              </button>
            </div>

            {/* Add Bank Account Inline Form */}
            {isAddingBankAcc && (
              <form onSubmit={handleAddNewBankAccount} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <h5 className="font-bold text-slate-800">Add New Bank Account</h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Account Title / Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Meezan Islamic Business"
                      value={newAccTitle}
                      onChange={(e) => setNewAccTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank Ltd"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Account Number / IBAN</label>
                    <input
                      type="text"
                      placeholder="e.g. 0101-0102030405"
                      value={newAccNumber}
                      onChange={(e) => setNewAccNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Opening Balance ({company.currency || 'Rs.'})</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={newAccOpening || ''}
                      onChange={(e) => setNewAccOpening(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-hidden"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingBankAcc(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Save Bank Account
                  </button>
                </div>
              </form>
            )}

            {/* List of Existing Bank Accounts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accountsList
                .filter((a) => a.accountType === 'bank')
                .map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-200 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">{acc.accountName}</h5>
                        {acc.bankName && <p className="text-xs text-slate-500">{acc.bankName}</p>}
                        {acc.accountNumber && (
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            A/C: {acc.accountNumber}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBankAcc(acc.id)}
                        className="p-1 text-slate-300 hover:text-red-500 rounded-lg cursor-pointer transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Opening Balance:</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">
                          {company.currency || 'Rs.'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          defaultValue={acc.openingBalance || 0}
                          onBlur={(e) => {
                            handleUpdateAccount(acc, parseFloat(e.target.value) || 0);
                          }}
                          className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 w-28 text-right outline-hidden focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 1. SOFTWARE APPEARANCE / THEME ---------------- */}
      {activeSection === 'theme' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Software Theme (Application UI)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Controls the look and feel of the header, navigation, dashboard cards, buttons and screens.
                (Separate from Invoice Theme).
              </p>
            </div>
            {softwareThemeSavedToast && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Software Theme Applied!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(SOFTWARE_THEMES) as SoftwareTheme[]).map((tKey) => {
              const themeObj = SOFTWARE_THEMES[tKey];
              const isSelected = activeSoftwareTheme === tKey;
              return (
                <div
                  key={tKey}
                  onClick={() => handleSelectSoftwareTheme(tKey)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-purple-600 ring-4 ring-purple-100 bg-purple-50/30 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Header preview bar */}
                    <div
                      className={`h-10 rounded-xl bg-gradient-to-r ${themeObj.styles.headerGradient} flex items-center justify-between px-3 text-white text-[11px] font-bold shadow-xs`}
                    >
                      <span>{company.businessName || 'MY BUSINESS'}</span>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-sm">Device</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{themeObj.name}</h4>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-700 text-white text-[10px] font-bold">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg ${themeObj.styles.primaryButton} flex items-center justify-center text-white text-xs`}
                    >
                      ✓
                    </div>
                    <span className="text-xs text-slate-600 font-medium">
                      {isSelected ? 'Currently Selected' : 'Click to Apply Theme'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- 2. INVOICE DESIGN & LIVE PREVIEW ---------------- */}
      {activeSection === 'design' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Invoice Customization</h3>
                <p className="text-[11px] text-slate-500">Live preview updates immediately with sample data</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDesign}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Reset to default Premium Purple invoice"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                {designSavedToast && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Saved!
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleDesignSubmit} className="space-y-4 text-xs">
              {/* Built-in Theme Presets */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
                  Built-in Invoice Theme
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'purple', label: 'Purple', bg: 'bg-purple-600' },
                    { id: 'blue', label: 'Blue', bg: 'bg-blue-600' },
                    { id: 'green', label: 'Green', bg: 'bg-emerald-600' },
                    { id: 'black', label: 'Black', bg: 'bg-neutral-900' },
                    { id: 'white', label: 'White', bg: 'bg-slate-200' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setDesignForm({
                          ...designForm,
                          theme: t.id as InvoiceTheme,
                          customColors: undefined, // reset custom overrides on preset pick
                        })
                      }
                      className={`py-2 px-1 text-center rounded-xl border flex flex-col items-center justify-center gap-1 font-bold transition-all cursor-pointer ${
                        designForm.theme === t.id
                          ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-200'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full ${t.bg}`}></div>
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Header Style & Table Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Header Style</label>
                  <select
                    value={designForm.headerStyle}
                    onChange={(e) =>
                      setDesignForm({ ...designForm, headerStyle: e.target.value as InvoiceHeaderStyle })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="premium">Premium Banner</option>
                    <option value="modern">Modern Gradient Banner</option>
                    <option value="classic">Classic Serif</option>
                    <option value="centered">Centered Title & Logo</option>
                    <option value="simple">Simple Clean</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Table Style</label>
                  <select
                    value={designForm.tableStyle}
                    onChange={(e) =>
                      setDesignForm({ ...designForm, tableStyle: e.target.value as InvoiceTableStyle })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="banded">Banded Rows (Zebra)</option>
                    <option value="simple">Simple Clean</option>
                    <option value="borders">Full Grid Borders</option>
                    <option value="minimal">Minimalist (Lines only)</option>
                    <option value="modern">Modern Rounded</option>
                  </select>
                </div>
              </div>

              {/* Font Family, Size & Row Spacing */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Font Family</label>
                  <select
                    value={designForm.fontFamily || 'sans'}
                    onChange={(e) =>
                      setDesignForm({ ...designForm, fontFamily: e.target.value as FontFamily })
                    }
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="sans">Modern Sans</option>
                    <option value="serif">Classic Serif</option>
                    <option value="mono">Receipt Mono</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Font Size</label>
                  <select
                    value={designForm.fontSize}
                    onChange={(e) =>
                      setDesignForm({
                        ...designForm,
                        fontSize: e.target.value as 'small' | 'medium' | 'large',
                      })
                    }
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="small">Compact</option>
                    <option value="medium">Standard</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Row Spacing</label>
                  <select
                    value={designForm.rowSpacing || 'normal'}
                    onChange={(e) =>
                      setDesignForm({ ...designForm, rowSpacing: e.target.value as RowSpacing })
                    }
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="relaxed">Relaxed</option>
                  </select>
                </div>
              </div>

              {/* Logo Size & Business Name Size & Position */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Logo Size</label>
                  <select
                    value={designForm.logoSize}
                    onChange={(e) =>
                      setDesignForm({
                        ...designForm,
                        logoSize: e.target.value as 'small' | 'medium' | 'large',
                      })
                    }
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Name Size</label>
                  <select
                    value={designForm.businessNameSize}
                    onChange={(e) =>
                      setDesignForm({
                        ...designForm,
                        businessNameSize: e.target.value as 'small' | 'medium' | 'large',
                      })
                    }
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price Format</label>
                  <select
                    value={designForm.priceFormat}
                    onChange={(e) =>
                      setDesignForm({
                        ...designForm,
                        priceFormat: e.target.value as any,
                      })
                    }
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="symbol_space">Rs. 1,500</option>
                    <option value="symbol_tight">Rs 1,500</option>
                    <option value="no_symbol">1,500</option>
                  </select>
                </div>
              </div>

              {/* Advanced Custom Colors */}
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 block uppercase text-[10px] mb-2 tracking-wider">
                  Advanced Custom Colors
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">
                      Primary Accent
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={designForm.customColors?.primaryColor || '#7c3aed'}
                        onChange={(e) =>
                          setDesignForm({
                            ...designForm,
                            customColors: {
                              ...designForm.customColors,
                              primaryColor: e.target.value,
                            },
                          })
                        }
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={designForm.customColors?.primaryColor || '#7c3aed'}
                        onChange={(e) =>
                          setDesignForm({
                            ...designForm,
                            customColors: {
                              ...designForm.customColors,
                              primaryColor: e.target.value,
                            },
                          })
                        }
                        className="w-20 px-1.5 py-1 text-[11px] font-mono border border-slate-200 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">
                      Table Header
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={designForm.customColors?.headerBgColor || '#581c87'}
                        onChange={(e) =>
                          setDesignForm({
                            ...designForm,
                            customColors: {
                              ...designForm.customColors,
                              headerBgColor: e.target.value,
                            },
                          })
                        }
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={designForm.customColors?.headerBgColor || '#581c87'}
                        onChange={(e) =>
                          setDesignForm({
                            ...designForm,
                            customColors: {
                              ...designForm.customColors,
                              headerBgColor: e.target.value,
                            },
                          })
                        }
                        className="w-20 px-1.5 py-1 text-[11px] font-mono border border-slate-200 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Element Checkboxes */}
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 block uppercase text-[10px] mb-2 tracking-wider">
                  Show / Hide Invoice Elements
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  {[
                    { key: 'showLogo', label: 'Company Logo' },
                    { key: 'showDateTime', label: 'Date & Time' },
                    { key: 'showPrevBalance', label: 'Previous Balance' },
                    { key: 'showPaidAmount', label: 'Paid Amount' },
                    { key: 'showRemainingAmount', label: 'Remaining Due' },
                    { key: 'showCustomerPhone', label: 'Customer Phone' },
                    { key: 'showWhatsApp', label: 'WhatsApp #' },
                    { key: 'showAddress', label: 'Shop Address' },
                    { key: 'showSignature', label: 'Signature Line' },
                    { key: 'showFooter', label: 'Footer Notice' },
                    { key: 'showThankYou', label: 'Thank You Msg' },
                    { key: 'showTerms', label: 'Terms & Conditions' },
                    { key: 'showProductDescription', label: 'Item / Description' },
                    { key: 'showItemQuantity', label: 'Quantity (Qty)' },
                    { key: 'showItemRate', label: 'Item Rate' },
                    { key: 'showItemAmount', label: 'Item Amount (Amt)' },
                    { key: 'showItemIndex', label: 'Item # (S.No)' },
                    { key: 'showProductUnit', label: 'Product Unit (Piece/Box)' },
                    { key: 'showProductSelectionInForm', label: 'Product Catalog Dropdown' },
                  ].map((chk) => (
                    <label key={chk.key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(designForm[chk.key as keyof InvoiceSettings])}
                        onChange={(e) =>
                          setDesignForm({ ...designForm, [chk.key]: e.target.checked })
                        }
                        className="accent-purple-600 rounded-sm"
                      />
                      <span>{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetDesign}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Reset to Default
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Invoice Design
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 bg-slate-100 p-4 rounded-3xl border border-slate-200">
            {/* Format Switcher */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-purple-700" />
                Live Invoice Preview
              </span>

              <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setPreviewFormat('a4')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    previewFormat === 'a4'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFormat('thermal')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    previewFormat === 'thermal'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thermal 80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFormat('whatsapp')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    previewFormat === 'whatsapp'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            <div className="overflow-x-auto shadow-md rounded-2xl bg-white p-2">
              <InvoicePrintTemplate
                invoice={sampleInvoice}
                company={companyForm}
                settings={designForm}
                format={previewFormat}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3. COMPANY PROFILE ---------------- */}
      {activeSection === 'company' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs max-w-3xl">
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Business Information</h3>
              {companySavedToast && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Settings Saved!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyForm.businessName}
                  onChange={(e) => setCompanyForm({ ...companyForm, businessName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Tagline</label>
                <input
                  type="text"
                  value={companyForm.tagline}
                  onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={companyForm.whatsapp}
                  onChange={(e) => setCompanyForm({ ...companyForm, whatsapp: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tax / NTN</label>
                <input
                  type="text"
                  value={companyForm.taxNtn}
                  onChange={(e) => setCompanyForm({ ...companyForm, taxNtn: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                <input
                  type="text"
                  value={companyForm.currency}
                  onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={companyForm.invoicePrefix}
                  onChange={(e) => setCompanyForm({ ...companyForm, invoicePrefix: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Starting Sequence #</label>
                <input
                  type="number"
                  value={companyForm.startingInvoiceNo}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, startingInvoiceNo: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thank You Message</label>
              <input
                type="text"
                value={companyForm.thankYouMsg}
                onChange={(e) => setCompanyForm({ ...companyForm, thankYouMsg: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Terms & Conditions</label>
              <textarea
                rows={3}
                value={companyForm.termsConditions}
                onChange={(e) => setCompanyForm({ ...companyForm, termsConditions: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-hidden text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Enable Stock & Inventory Tracking</h4>
                <p className="text-[11px] text-slate-500">
                  Automatically decrement stock on sales invoices and restore on delete
                </p>
              </div>
              <input
                type="checkbox"
                checked={companyForm.inventoryEnabled}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, inventoryEnabled: e.target.checked })
                }
                className="w-5 h-5 accent-purple-600 rounded-md cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" /> Save Company Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- 4. BUSINESS LOGO SETTINGS (Requirement 13, 14, 15, 16) ---------------- */}
      {activeSection === 'logo' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs max-w-2xl space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-700" />
              <span>Business Logo Management</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Persistent offline storage (Base64 data URL). Appears automatically on printed invoices, PDF exports, and WhatsApp images.
            </p>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            {companyForm.logo ? (
              <div className="space-y-4 w-full max-w-md mx-auto">
                {/* Live Preview Container (maintains natural aspect ratio without stretching) */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs mx-auto flex items-center justify-center min-h-[140px]">
                  <img
                    src={companyForm.logo}
                    alt="Business Logo Preview"
                    className="max-h-32 max-w-full object-contain mx-auto"
                  />
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Status: <strong className="text-emerald-700">✓ Active Business Logo Saved</strong>
                </div>

                {/* 4 Required Action Buttons: Preview Logo, Replace Logo, Remove Logo */}
                <div className="flex flex-wrap items-center gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsPreviewLogoModalOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-700" />
                    <span>Preview Logo</span>
                  </button>

                  <label className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Replace Logo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Logo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto shadow-2xs">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No logo uploaded yet</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload your business logo to appear on all printed invoices, thermal slips, PDF exports, and WhatsApp shared images.
                  </p>
                </div>
                <div>
                  <label className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md inline-flex items-center gap-2 transition-all">
                    <Upload className="w-4 h-4" />
                    <span>Upload Business Logo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    PNG, JPG or SVG (Max 3MB · Stored persistently as Data URL)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Offline Persistence Guarantee:</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Logos are securely converted into persistent Base64 Data URLs stored in your device's local database. They survive system restarts, browser reloads, and page refreshes.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- 4B. DONATION SETTINGS (Requirement 1A) ---------------- */}
      {activeSection === 'donations' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs max-w-2xl space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600 fill-rose-500" />
              <span>Donation Settings & Quantity Rates</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure per-piece community contribution rate applied automatically to sales invoices
            </p>
          </div>

          <form onSubmit={handleSaveDonationInSettingsHub} className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Enable Automated Donation on Sales</span>
                <span className="text-[11px] text-slate-500">
                  Calculates donation per sold piece whenever an invoice is created or updated
                </span>
              </div>
              <input
                type="checkbox"
                checked={donationForm.enabled}
                onChange={(e) => setDonationForm({ ...donationForm, enabled: e.target.checked })}
                className="w-5 h-5 accent-purple-600 rounded-md cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Donation Per Quantity / Piece ({company.currency || 'Rs.'})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {company.currency || 'Rs.'}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={donationForm.donationPerQty}
                  onChange={(e) =>
                    setDonationForm({
                      ...donationForm,
                      donationPerQty: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-purple-500 rounded-xl text-slate-900 font-bold text-base outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Formula: Donation Amount = Sold Quantity × {company.currency || 'Rs.'} {donationForm.donationPerQty}
              </p>
            </div>

            {/* Quantity Calculation Preview */}
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-1.5 text-xs">
              <span className="font-bold text-purple-950 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-purple-700" />
                <span>Quantity Calculation Examples:</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-white p-2 rounded-xl border border-purple-100 text-center font-semibold">
                  <span className="text-[10px] text-slate-400 block">1 Qty</span>
                  <span className="text-purple-900 font-black">
                    {company.currency || 'Rs.'} {(1 * (Number(donationForm.donationPerQty) || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-purple-100 text-center font-semibold">
                  <span className="text-[10px] text-slate-400 block">10 Qty</span>
                  <span className="text-purple-900 font-black">
                    {company.currency || 'Rs.'} {(10 * (Number(donationForm.donationPerQty) || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-purple-100 text-center font-semibold">
                  <span className="text-[10px] text-slate-400 block">50 Qty</span>
                  <span className="text-purple-900 font-black">
                    {company.currency || 'Rs.'} {(50 * (Number(donationForm.donationPerQty) || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-purple-100 text-center font-semibold">
                  <span className="text-[10px] text-slate-400 block">100 Qty</span>
                  <span className="text-purple-900 font-black">
                    {company.currency || 'Rs.'} {(100 * (Number(donationForm.donationPerQty) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description / Welfare Purpose
              </label>
              <input
                type="text"
                value={donationForm.note || ''}
                onChange={(e) => setDonationForm({ ...donationForm, note: e.target.value })}
                placeholder="e.g. Welfare hospital aid, charity school support"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-purple-500 rounded-xl text-xs sm:text-sm outline-hidden"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-0.5">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-purple-700" />
                <span>Accounting Protection Notice:</span>
              </span>
              <p>Donation is an internal calculation based on product quantity. It does not increase or decrease customer ledger balance or receivable.</p>
            </div>

            {donationSavedToast && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Donation settings updated successfully!</span>
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Donation Settings
            </button>
          </form>
        </div>
      )}

      {/* Preview Logo Modal */}
      {isPreviewLogoModalOpen && companyForm.logo && (
        <Modal
          isOpen={isPreviewLogoModalOpen}
          onClose={() => setIsPreviewLogoModalOpen(false)}
          title="Business Logo Preview"
        >
          <div className="p-4 text-center space-y-4">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center">
              <img
                src={companyForm.logo}
                alt="Business Logo Full Preview"
                className="max-h-60 max-w-full object-contain mx-auto"
              />
            </div>
            <p className="text-xs text-slate-500">
              This logo is rendered on your invoices, thermal slips, receipts, and WhatsApp share cards.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewLogoModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- 5. BACKUP & RESTORE ---------------- */}
      {activeSection === 'backup' && (
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HardDriveDownload className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Export Complete JSON Backup</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-lg">
                Downloads a unified JSON backup containing all customer ledgers, sales invoices, items,
                payments, products, and configurations.
              </p>
              <div className="mt-2 text-xs font-semibold text-slate-700">
                Last Backup:{' '}
                <span className="text-purple-700">
                  {appSettings.lastBackupDate
                    ? formatDate(appSettings.lastBackupDate)
                    : 'Not backed up yet'}
                </span>
              </div>
            </div>

            <button
              onClick={onExportBackup}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <HardDriveDownload className="w-4 h-4" /> Download Backup File
            </button>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Import / Restore Backup</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-lg">
                Restore your database from an existing JSON backup file. Before applying, you will
                preview all contained parties and invoices.
              </p>
              {restoreError && <p className="text-xs text-rose-600 font-bold mt-2">{restoreError}</p>}
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFilePickedForRestore}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Upload className="w-4 h-4" /> Select Backup JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 6. APP LOCK / SECURITY ---------------- */}
      {activeSection === 'security' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs max-w-xl">
          <form onSubmit={handleSaveAppLock} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-bold text-slate-900">Application Security Lock</h3>
              </div>
              {lockSavedToast && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Security Saved!
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Require PIN on Launch</span>
                <span className="text-[11px] text-slate-500">
                  Protects your ledger from unauthorized local access
                </span>
              </div>
              <input
                type="checkbox"
                checked={appLockEnabled}
                onChange={(e) => setAppLockEnabled(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded-md cursor-pointer"
              />
            </div>

            {appLockEnabled && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Set Security PIN (4 - 8 Digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  value={appLockPin}
                  onChange={(e) => setAppLockPin(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 tracking-widest font-mono text-center text-lg focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" /> Save Security Lock Settings
            </button>
          </form>
        </div>
      )}

      {/* ---------------- 7. FIREBASE CLOUD & STORAGE ---------------- */}
      {activeSection === 'firebase' && (
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-purple-700" /> Firebase Cloud Firestore & Storage
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time cloud database and storage sync connected to your Firebase project.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </span>
              </div>
            </div>

            {firebaseMessage && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  firebaseMessage.startsWith('✓')
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <span>{firebaseMessage}</span>
              </div>
            )}

            {/* Cloud Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Firebase Project ID
                </span>
                <span className="font-mono text-sm font-black text-slate-800 mt-0.5 block">
                  {syncStatus.projectId}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Storage Bucket
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block truncate">
                  {syncStatus.storageBucket}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Last Sync Status
                </span>
                <span className="text-xs font-bold text-emerald-600 mt-0.5 block truncate">
                  {syncStatus.statusText}
                </span>
              </div>
            </div>

            {/* Explanatory banner */}
            <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-xs text-purple-950 space-y-1.5 leading-relaxed">
              <strong className="block text-purple-900 font-bold">
                ☁️ Real-time Cloud Synchronization Active
              </strong>
              <p>
                Every invoice, customer, payment, product, and preference created on this device is
                automatically pushed in real time to your Cloud Firestore database (
                <span className="font-mono font-bold">{syncStatus.projectId}</span>). Offline caching
                is also enabled, ensuring zero delays when creating invoices on mobile networks.
              </p>
            </div>

            {/* Sync Controls */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePushFirebase}
                disabled={isSyncingFirebase}
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Cloud className="w-4 h-4" />
                <span>{isSyncingFirebase ? 'Syncing...' : 'Push All Records to Firebase'}</span>
              </button>

              <button
                type="button"
                onClick={handlePullFirebase}
                disabled={isSyncingFirebase}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-black disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingFirebase ? 'animate-spin' : ''}`} />
                <span>Pull & Refresh from Firebase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 8. DATA STORAGE & RESET ---------------- */}
      {activeSection === 'data' && (
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-700" /> LocalStorage Database Status
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your data is stored 100% locally inside this web browser&apos;s LocalStorage. It works
              offline and never uploads your business data to external servers. Clearing browser cache
              or site data will erase this database. Always create regular JSON backups!
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Database Size
                </span>
                <span className="text-base font-black text-slate-800">
                  {storageUsage.formattedSize}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Tables / Keys
                </span>
                <span className="text-base font-black text-slate-800">
                  {storageUsage.keyCount} Collections
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Mode</span>
                <span className="text-base font-black text-emerald-600">Local Offline</span>
              </div>
            </div>
          </div>

          <div className="bg-rose-50/70 p-5 sm:p-6 rounded-3xl border border-rose-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-5 h-5" />
                <h3>Reset All Database Records</h3>
              </div>
              <p className="text-xs text-rose-700 mt-1 max-w-lg leading-relaxed">
                Permanently wipes all customers, invoices, items, and payments from this device. This
                action cannot be undone without a backup file.
              </p>
            </div>

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
            >
              Reset All Data
            </button>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {pendingRestoreData && (
        <Modal
          isOpen={Boolean(pendingRestoreData)}
          onClose={() => setPendingRestoreData(null)}
          title="Confirm Database Restore"
          subtitle="Review details from the selected backup file before replacing local data"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-900 leading-relaxed">
              <strong className="block mb-1 text-amber-950 font-bold">⚠️ Data Replacement Warning</strong>
              Restoring this backup will replace current local database records with the contents of this file.
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Business Name:</span>
                <span className="font-bold text-slate-900">
                  {pendingRestoreData.companySettings?.businessName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Backup Date:</span>
                <span className="font-bold text-slate-900">
                  {formatDate(pendingRestoreData.exportedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Number of Parties:</span>
                <span className="font-bold text-slate-900">
                  {pendingRestoreData.parties?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Number of Invoices:</span>
                <span className="font-bold text-slate-900">
                  {pendingRestoreData.invoices?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Number of Payments:</span>
                <span className="font-bold text-slate-900">
                  {pendingRestoreData.payments?.length || 0}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingRestoreData(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current?.files?.[0]) {
                    onImportBackupFile(fileInputRef.current.files[0]);
                  }
                  setPendingRestoreData(null);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md cursor-pointer"
              >
                Yes, Restore Backup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* RESET ALL DATA CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={onResetAllData}
        title="DANGER: Reset All Business Data?"
        message="Your current LocalStorage data will be permanently wiped. Make sure you have exported a JSON backup first."
        confirmText="Confirm Complete Reset"
        isDestructive={true}
        requireTypingWord="DELETE"
      />
    </div>
  );
};
