import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Save,
  Printer,
  Share2,
  Receipt,
  ArrowLeft,
  BookOpen,
  Zap,
  CheckCircle2,
  ChevronDown,
  Edit2,
  X,
  Package,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Invoice,
  InvoiceItem,
  Party,
  Product,
  CompanySettings,
  InvoiceSettings,
  PaymentMethod,
  InvoiceStatus,
} from '../../types';
import {
  formatCurrency,
  generateId,
  getCurrentTimeString,
  getTodayDateString,
} from '../../utils/formatters';
import { calculatePartyDetailedBalance, calculatePartyBalance } from '../../utils/accounting';
import {
  getDonationSettings,
  getInvoices,
  getNextInvoiceNumber,
  getParties,
  getPayments,
  getProducts,
  saveParty,
  STORAGE_CHANGE_EVENT,
} from '../../db/storage';
import { PartyFormModal } from '../parties/PartyFormModal';
import { PartyLedgerModal } from '../parties/PartyLedgerModal';

interface InvoiceFormProps {
  invoiceToEdit?: Invoice | null;
  initialParty?: Party | null;
  company: CompanySettings;
  invoiceSettings: InvoiceSettings;
  onSave: (invoice: Invoice, actionAfter?: 'view' | 'print' | 'whatsapp') => void;
  onCancel: () => void;
  onPartyCreated?: (party: Party) => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoiceToEdit,
  initialParty,
  company,
  invoiceSettings,
  onSave,
  onCancel,
  onPartyCreated,
}) => {
  const curr = company.currency || 'Rs.';
  const [parties, setParties] = useState<Party[]>(getParties());
  const [products, setProducts] = useState<Product[]>(getProducts());

  // Keep parties & products synchronized with storage/Firestore changes
  useEffect(() => {
    const syncLists = () => {
      setParties(getParties());
      setProducts(getProducts());
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, syncLists);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, syncLists);
  }, []);

  // Form Header States
  const [invoiceNo, setInvoiceNo] = useState(invoiceToEdit?.invoiceNo || getNextInvoiceNumber());
  const [date, setDate] = useState(invoiceToEdit?.date || getTodayDateString());
  const [time, setTime] = useState(invoiceToEdit?.time || getCurrentTimeString());

  // Party State
  const [selectedPartyId, setSelectedPartyId] = useState(
    invoiceToEdit?.partyId && invoiceToEdit.partyId !== 'walk_in'
      ? invoiceToEdit.partyId
      : initialParty?.id || ''
  );
  const [walkInName, setWalkInName] = useState(
    invoiceToEdit ? invoiceToEdit.partyName || '' : ''
  );
  const [partyPhone, setPartyPhone] = useState(invoiceToEdit?.partyPhone || '');
  const [partyAddress, setPartyAddress] = useState(invoiceToEdit?.partyAddress || '');
  const [notes, setNotes] = useState(invoiceToEdit?.notes || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    invoiceToEdit?.paymentMethod || 'Cash'
  );

  // Added Items List with auto-assigned serial numbers
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (invoiceToEdit?.items && invoiceToEdit.items.length > 0) {
      return invoiceToEdit.items.map((it, idx) => ({
        ...it,
        serialNo: it.serialNo || idx + 1,
      }));
    }
    return [];
  });

  // Track if we are editing an existing item from the table
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Whether product / description is enabled in settings (default true)
  const isProductVisible = invoiceSettings.showProductDescription !== false;

  // FAST MANUAL ENTRY STATE
  const [fastProduct, setFastProduct] = useState('');
  const [fastQty, setFastQty] = useState<number | string>(1);
  const [fastRate, setFastRate] = useState<number | string>('');
  const [fastUnit, setFastUnit] = useState('Piece');
  const [fastSelectedProductId, setFastSelectedProductId] = useState('');
  const [lastAddedFeedback, setLastAddedFeedback] = useState<string | null>(null);

  // Active focused field tracking for clear visual feedback and mobile IME navigation
  const [focusedField, setFocusedField] = useState<'product' | 'qty' | 'rate' | null>(null);
  const focusedFieldRef = useRef<'product' | 'qty' | 'rate'>(isProductVisible ? 'product' : 'qty');

  // Input Refs for Programmatic Focus
  const productInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);

  // Event Guard / Debounce to prevent double-adding when both keydown and submit fire on Android
  const lastActionTimestampRef = useRef<number>(0);
  const isProcessingActionRef = useRef<boolean>(false);

  // Totals & Settlement States
  const [overallDiscount, setOverallDiscount] = useState<number>(invoiceToEdit?.discount || 0);
  const [paidAmount, setPaidAmount] = useState<number>(invoiceToEdit?.paidAmount || 0);
  const [isPaidCustomized, setIsPaidCustomized] = useState<boolean>(Boolean(invoiceToEdit));

  // Modals & Validation
  const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Selected Party & Live Balance Calculation
  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  // 1. AUTOMATIC LEDGER PREVIOUS BALANCE
  // Automatically calculate the party's existing balance from the saved ledger, excluding the current invoice if editing
  const existingLedgerBalance = selectedParty
    ? calculatePartyBalance(selectedParty, getInvoices(), getPayments(), invoiceToEdit?.id)
    : 0;

  const detailedBalance = selectedParty
    ? calculatePartyDetailedBalance(selectedParty, getInvoices(), getPayments(), invoiceToEdit?.id)
    : {
        partyId: '',
        partyName: '',
        previousReceivable: 0,
        previousPayable: 0,
        netBalance: 0,
        balanceType: 'zero' as const,
      };

  // 2. MANUAL PREVIOUS BALANCE & ADJUSTMENT STATES
  const [prevBalanceMode, setPrevBalanceMode] = useState<'ledger' | 'manual' | 'adjustment'>(
    invoiceToEdit?.previousBalanceMode || 'ledger'
  );
  const [manualPrevBalanceVal, setManualPrevBalanceVal] = useState<string>(
    invoiceToEdit?.previousBalanceMode === 'manual'
      ? String(invoiceToEdit.previousBalance ?? '')
      : ''
  );
  const [manualAdjustmentVal, setManualAdjustmentVal] = useState<string>(
    invoiceToEdit?.manualAdjustment !== undefined && invoiceToEdit?.manualAdjustment !== null
      ? String(invoiceToEdit.manualAdjustment)
      : ''
  );

  // Sync / initialize manual fields when selected party changes for new invoices
  useEffect(() => {
    if (!invoiceToEdit && selectedParty) {
      if (!manualPrevBalanceVal) {
        setManualPrevBalanceVal(String(existingLedgerBalance));
      }
    }
  }, [selectedPartyId, existingLedgerBalance, invoiceToEdit]);

  // Compute finalPreviousBalance and effectiveAdjustment according to mode
  let finalPreviousBalance = existingLedgerBalance;
  let effectiveAdjustment = 0;

  if (selectedParty) {
    if (prevBalanceMode === 'manual') {
      const parsedManual = parseFloat(manualPrevBalanceVal);
      finalPreviousBalance = isNaN(parsedManual) ? 0 : parsedManual;
      effectiveAdjustment = finalPreviousBalance - existingLedgerBalance;
    } else if (prevBalanceMode === 'adjustment') {
      const parsedAdj = parseFloat(manualAdjustmentVal);
      effectiveAdjustment = isNaN(parsedAdj) ? 0 : parsedAdj;
      finalPreviousBalance = existingLedgerBalance + effectiveAdjustment;
    } else {
      // 'ledger' mode
      finalPreviousBalance = existingLedgerBalance;
      effectiveAdjustment = 0;
    }
  } else {
    finalPreviousBalance = 0;
    effectiveAdjustment = 0;
  }

  const previousBalance = finalPreviousBalance;

  // Auto-fill party contact details when selected party changes
  useEffect(() => {
    if (selectedParty) {
      setPartyPhone(selectedParty.phone || '');
      setPartyAddress(
        selectedParty.address
          ? `${selectedParty.address}${selectedParty.city ? ', ' + selectedParty.city : ''}`
          : ''
      );
    }
  }, [selectedPartyId]);

  // Fast entry calculated amount: Amount = Qty * Rate (read-only)
  const numQty = parseFloat(String(fastQty)) || 0;
  const numRate = parseFloat(String(fastRate)) || 0;
  const fastCalculatedAmount = Math.max(0, numQty * numRate);

  /**
   * Reliable programmatic focus for Android Chrome, WebViews, and desktop browsers.
   * Keeps mobile keyboard open by focusing without explicitly blurring first.
   */
  const focusInput = useCallback((el: HTMLInputElement | null, selectAll = false) => {
    if (!el) return;

    // Immediate attempt
    try {
      el.focus({ preventScroll: true });
    } catch (_) {}

    // RequestAnimationFrame guarantee for Android WebView/Chrome
    requestAnimationFrame(() => {
      if (!el) return;
      try {
        el.focus({ preventScroll: true });
        if (selectAll && (el.type === 'number' || el.type === 'text')) {
          el.select();
        }
      } catch (_) {}

      // Slight timeout backup
      setTimeout(() => {
        if (!el) return;
        try {
          if (selectAll && (el.type === 'number' || el.type === 'text')) {
            el.select();
          }
          // Only scroll if field is hidden outside visible viewport
          const rect = el.getBoundingClientRect();
          if (rect.top < 60 || rect.bottom > window.innerHeight - 80) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } catch (_) {}
      }, 30);
    });
  }, []);

  // Initial focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isProductVisible) {
        focusInput(productInputRef.current, false);
      } else {
        focusInput(qtyInputRef.current, true);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isProductVisible, focusInput]);

  // Handle Fast Product Selection from Catalog
  const handleSelectCatalogProduct = (prodId: string) => {
    setFastSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setFastProduct(prod.name);
      setFastRate(prod.saleRate || '');
      setFastUnit(prod.unit || 'Piece');
      // Automatically advance to Qty field
      setTimeout(() => {
        focusInput(qtyInputRef.current, true);
      }, 50);
    }
  };

  /**
   * Core Item Addition / Update Handler.
   * Calculates: amount = qty * rate.
   * Updates or appends to items table.
   * Automatically re-numbers serialNo.
   * Clears entry fields and immediately restores focus to Product (or Qty if product is hidden).
   */
  const submitFastEntryItem = () => {
    if (isProcessingActionRef.current) return;
    isProcessingActionRef.current = true;

    const trimmedProduct = isProductVisible ? fastProduct.trim() : 'Item';
    if (isProductVisible && !trimmedProduct) {
      setValidationError('Please enter a Product / Description before adding.');
      focusInput(productInputRef.current);
      isProcessingActionRef.current = false;
      return;
    }

    const q = parseFloat(String(fastQty));
    if (isNaN(q) || q <= 0) {
      setValidationError('Please enter a valid Quantity greater than 0.');
      focusInput(qtyInputRef.current, true);
      isProcessingActionRef.current = false;
      return;
    }

    const r = parseFloat(String(fastRate));
    const rateVal = isNaN(r) || r < 0 ? 0 : r;
    const amountVal = q * rateVal;

    setValidationError('');

    if (editingItemIndex !== null && editingItemIndex >= 0 && editingItemIndex < items.length) {
      // Update existing item in place
      setItems((prev) => {
        const updated = [...prev];
        updated[editingItemIndex] = {
          ...updated[editingItemIndex],
          productId: fastSelectedProductId || undefined,
          description: trimmedProduct,
          quantity: q,
          unit: fastUnit || 'Piece',
          rate: rateVal,
          discount: 0,
          amount: amountVal,
        };
        return updated;
      });

      setLastAddedFeedback(`Updated #${editingItemIndex + 1}: ${trimmedProduct} (${curr} ${amountVal.toLocaleString()})`);
      setEditingItemIndex(null);
    } else {
      // Add brand new item
      const selectedProd = fastSelectedProductId ? products.find((p) => p.id === fastSelectedProductId) : undefined;
      const newItem: InvoiceItem = {
        id: generateId('item'),
        serialNo: items.length + 1,
        productId: fastSelectedProductId || undefined,
        description: trimmedProduct,
        quantity: q,
        unit: fastUnit || 'Piece',
        rate: rateVal,
        discount: 0,
        amount: amountVal,
        showOnInvoice: selectedProd ? (selectedProd.showOnInvoice !== false) : true,
      };

      setItems((prev) => [...prev, newItem]);
      setLastAddedFeedback(`Added: ${trimmedProduct} (${q} × ${rateVal} = ${curr} ${amountVal.toLocaleString()})`);
    }

    setTimeout(() => {
      setLastAddedFeedback(null);
    }, 2500);

    // Reset Fast Manual Entry inputs
    setFastProduct('');
    setFastQty(1);
    setFastRate('');
    setFastSelectedProductId('');

    // Immediately return focus: Product if visible, else Qty!
    // Keeps mobile keyboard open!
    if (isProductVisible) {
      focusedFieldRef.current = 'product';
      setFocusedField('product');
      focusInput(productInputRef.current, false);
    } else {
      focusedFieldRef.current = 'qty';
      setFocusedField('qty');
      focusInput(qtyInputRef.current, true);
    }

    setTimeout(() => {
      isProcessingActionRef.current = false;
    }, 150);
  };

  /**
   * Unified Action Handler for Enter / Next / Done / Form Submit.
   * Handles:
   * - Desktop Enter / NumpadEnter
   * - Mobile keyboard Next / Enter / Done
   * - Android IME keyCode 13 or which 13
   * - Mobile form submit
   * Prevents page reload, prevents submitting entire invoice, and prevents double-adds.
   */
  const handleFieldAdvance = (
    fromField: 'product' | 'qty' | 'rate',
    e?: React.SyntheticEvent
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const now = Date.now();
    // Guard against duplicate triggers (e.g. keydown + form submit in 280ms)
    if (now - lastActionTimestampRef.current < 280) {
      return;
    }
    lastActionTimestampRef.current = now;

    if (fromField === 'product') {
      if (!fastProduct.trim()) {
        setValidationError('Please enter a Product / Description before continuing.');
        focusInput(productInputRef.current);
        return;
      }
      setValidationError('');
      focusedFieldRef.current = 'qty';
      setFocusedField('qty');
      focusInput(qtyInputRef.current, true);
    } else if (fromField === 'qty') {
      const q = parseFloat(String(fastQty));
      if (isNaN(q) || q <= 0) {
        setValidationError('Please enter a valid Quantity greater than 0.');
        focusInput(qtyInputRef.current, true);
        return;
      }
      setValidationError('');
      focusedFieldRef.current = 'rate';
      setFocusedField('rate');
      focusInput(rateInputRef.current, true);
    } else if (fromField === 'rate') {
      submitFastEntryItem();
    }
  };

  // Helper to detect if a keyboard event corresponds to Enter/Next/Done
  const isEnterEvent = (e: React.KeyboardEvent): boolean => {
    return (
      e.key === 'Enter' ||
      e.key === 'NumpadEnter' ||
      e.keyCode === 13 ||
      e.which === 13
    );
  };

  // Dedicated Fast Entry Form Submit Handler (catches mobile soft keyboard Enter/Done submit)
  const handleFastEntryFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const active = focusedFieldRef.current || (isProductVisible ? 'product' : 'qty');
    handleFieldAdvance(active, e);
  };

  // Delete an item row from table and re-number serialNo 1, 2, 3...
  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((it, idx) => ({ ...it, serialNo: idx + 1 }));
    });
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setFastProduct('');
      setFastQty(1);
      setFastRate('');
      setFastSelectedProductId('');
    }
  };

  // Edit an item row (load into Fast Manual Entry)
  const handleEditItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    setEditingItemIndex(index);
    setFastProduct(item.description);
    setFastQty(item.quantity);
    setFastRate(item.rate);
    setFastUnit(item.unit || 'Piece');
    setFastSelectedProductId(item.productId || '');
    setValidationError('');

    if (isProductVisible) {
      focusedFieldRef.current = 'product';
      setFocusedField('product');
      focusInput(productInputRef.current, true);
    } else {
      focusedFieldRef.current = 'qty';
      setFocusedField('qty');
      focusInput(qtyInputRef.current, true);
    }
  };

  // Cancel inline editing
  const handleCancelEdit = () => {
    setEditingItemIndex(null);
    setFastProduct('');
    setFastQty(1);
    setFastRate('');
    setFastSelectedProductId('');
    if (isProductVisible) {
      focusInput(productInputRef.current);
    } else {
      focusInput(qtyInputRef.current);
    }
  };

  // Math Calculations
  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const grandTotal = Math.max(0, subtotal - (overallDiscount || 0));

  // ---------------- DONATION CALCULATION (Requirement 1, 2, 3, 10, 11) ----------------
  // Quantity-based calculation: Donation Amount = Sold Quantity × Donation Per Quantity
  // Rate history: Retain the rate assigned at creation of existing invoice!
  const donationSettings = getDonationSettings();
  const donationRate = invoiceToEdit?.donationPerQty !== undefined && invoiceToEdit?.donationPerQty !== null
    ? Math.max(0, Number(invoiceToEdit.donationPerQty) || 0)
    : (donationSettings.enabled ? Math.max(0, Number(donationSettings.donationPerQty) || 0) : 0);
  const donationAmount = Math.round(totalQty * donationRate * 100) / 100;

  // If cash customer and not manually tweaked, match paid amount to grand total
  useEffect(() => {
    if (!isPaidCustomized && !invoiceToEdit) {
      if (!selectedPartyId) {
        setPaidAmount(grandTotal);
      }
    }
  }, [grandTotal, selectedPartyId, isPaidCustomized, invoiceToEdit]);

  const remainingAmount = Math.max(0, grandTotal - paidAmount);
  // Calculation: New Balance = Previous Balance + Current Invoice - Payment Received
  const newBalance = finalPreviousBalance + grandTotal - paidAmount;

  // Post-sale detailed accounting figures
  const totalDebits = detailedBalance.previousReceivable + (effectiveAdjustment > 0 ? effectiveAdjustment : 0) + grandTotal;
  const totalCredits = detailedBalance.previousPayable + (effectiveAdjustment < 0 ? Math.abs(effectiveAdjustment) : 0) + paidAmount;
  const netPostSale = totalDebits - totalCredits;
  const newReceivable = netPostSale > 0 ? netPostSale : 0;
  const newPayable = netPostSale < 0 ? Math.abs(netPostSale) : 0;

  // Invoice status
  let status: InvoiceStatus = 'Credit';
  if (paidAmount >= grandTotal && grandTotal > 0) {
    status = 'Paid';
  } else if (paidAmount > 0 && paidAmount < grandTotal) {
    status = 'Partial';
  }

  const handleQuickPartySaved = (newParty: Party) => {
    saveParty(newParty);
    const updatedParties = getParties();
    setParties(updatedParties);
    setSelectedPartyId(newParty.id);
    setPartyPhone(newParty.phone || '');
    setPartyAddress(
      newParty.address
        ? `${newParty.address}${newParty.city ? ', ' + newParty.city : ''}`
        : ''
    );
    setManualPrevBalanceVal(
      String(
        newParty.openingBalance
          ? newParty.balanceType === 'payable'
            ? -newParty.openingBalance
            : newParty.openingBalance
          : 0
      )
    );
    setIsQuickPartyModalOpen(false);
    if (onPartyCreated) {
      onPartyCreated(newParty);
    }
  };

  // Validate and Save Complete Invoice (triggered ONLY by explicit complete buttons)
  const handleSaveInvoice = (actionAfter: 'view' | 'print' | 'whatsapp' = 'view') => {
    setValidationError('');

    if (!invoiceNo.trim()) {
      setValidationError('Invoice number is required.');
      return;
    }

    if (items.length === 0) {
      setValidationError('Please enter at least one product / item before saving.');
      if (isProductVisible) {
        focusInput(productInputRef.current);
      } else {
        focusInput(qtyInputRef.current);
      }
      return;
    }

    if (remainingAmount > 0 && !selectedPartyId) {
      setValidationError('For credit or partial payment, please select a registered Party/Customer.');
      return;
    }

    const partyName = selectedParty ? selectedParty.name : walkInName.trim();

    const invoiceData: Invoice = {
      id: invoiceToEdit?.id || generateId('inv'),
      invoiceNo: invoiceNo.trim(),
      date,
      time,
      partyId: selectedPartyId || 'walk_in',
      partyName,
      partyPhone: partyPhone.trim(),
      partyAddress: partyAddress.trim(),
      items,
      subtotal,
      discount: overallDiscount || 0,
      grandTotal,
      previousBalanceMode: selectedParty ? prevBalanceMode : undefined,
      ledgerPreviousBalance: selectedParty ? existingLedgerBalance : 0,
      manualAdjustment: selectedParty && effectiveAdjustment !== 0 ? effectiveAdjustment : undefined,
      manualPreviousBalance: selectedParty && prevBalanceMode === 'manual' ? finalPreviousBalance : undefined,
      previousBalance: finalPreviousBalance,
      paidAmount,
      remainingAmount,
      newBalance,
      paymentMethod,
      notes: notes.trim(),
      status,
      totalQuantity: totalQty,
      donationPerQty: donationRate,
      donationAmount,
      createdAt: invoiceToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(invoiceData, actionAfter);
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4">
      {/* 1. HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate flex items-center gap-1.5">
                <Receipt className="w-5 h-5 text-purple-700 shrink-0" />
                {invoiceToEdit ? `Edit #${invoiceToEdit.invoiceNo}` : 'New Sales Invoice'}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                <span>Inv #{invoiceNo}</span>
                <span>•</span>
                <span>{date}</span>
                <span>•</span>
                <span>{time}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveInvoice('view')}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Invoice Meta inputs */}
        <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Invoice #
            </label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500 text-xs outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500 text-xs outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500 text-xs outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Validation Banner */}
      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
          <span>{validationError}</span>
        </div>
      )}

      {/* 2. PARTY SELECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <User className="w-4 h-4 text-purple-700" />
            <span>Select Party / Customer</span>
            <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setIsQuickPartyModalOpen(true)}
            className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Party</span>
          </button>
        </div>

        {/* Party dropdown showing real-time balance position */}
        <div className="relative">
          <select
            value={selectedPartyId}
            onChange={(e) => {
              setSelectedPartyId(e.target.value);
              setIsPaidCustomized(false);
            }}
            className="w-full pl-3.5 pr-10 py-3 bg-slate-50 border-2 border-slate-200 hover:border-purple-300 focus:border-purple-600 focus:bg-white rounded-xl text-slate-900 font-semibold text-sm outline-hidden cursor-pointer appearance-none transition-all shadow-xs"
          >
            <option value="">-- Enter Custom Party Name Below (Or Select Saved Party) --</option>
            {parties.map((p) => {
              const d = calculatePartyDetailedBalance(p, getInvoices(), getPayments());
              const balText =
                d.balanceType === 'receivable'
                  ? `Receivable: ${formatCurrency(d.netBalance, curr)}`
                  : d.balanceType === 'payable'
                  ? `Payable: ${formatCurrency(Math.abs(d.netBalance), curr)}`
                  : 'Settled (Rs. 0)';
              return (
                <option key={p.id} value={p.id}>
                  {p.name} {p.city ? `(${p.city})` : ''} — {balText}
                </option>
              );
            })}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
        </div>

        {!selectedParty && (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Customer / Party Name (Shown on Invoice)
            </label>
            <input
              type="text"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="Write customer or party name to show on invoice (leave blank if none)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>
        )}

        {/* 3. SELECTED PARTY BALANCE SUMMARY CARD */}
        {selectedParty && (
          <div className="mt-3 p-3.5 sm:p-4 bg-gradient-to-br from-purple-50 via-indigo-50/70 to-slate-50 border-2 border-purple-200/90 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-purple-200/70">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-purple-900 uppercase tracking-wider bg-purple-200/80 px-2 py-0.5 rounded-md">
                    Party Selected
                  </span>
                  <h4 className="text-base font-black text-slate-900 truncate">
                    {selectedParty.name}
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-1">
                  {selectedParty.phone && (
                    <span className="flex items-center gap-1 font-medium">
                      <Phone className="w-3.5 h-3.5 text-purple-700" />
                      {selectedParty.phone}
                    </span>
                  )}
                  {selectedParty.address && (
                    <span className="flex items-center gap-1 text-slate-500 truncate max-w-[200px] sm:max-w-none">
                      <MapPin className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      {selectedParty.address}
                      {selectedParty.city ? `, ${selectedParty.city}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* View Ledger Button (keeps invoice state intact) */}
              <button
                type="button"
                onClick={() => setIsLedgerModalOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-700" />
                <span>View Ledger</span>
              </button>
            </div>

            {/* Previous Receivable, Previous Payable, Current Outstanding Cards */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px] leading-tight">
                  Prev Receivable:
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 mt-1 block">
                  {formatCurrency(detailedBalance.previousReceivable, curr)}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px] leading-tight">
                  Prev Payable:
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 mt-1 block">
                  {formatCurrency(detailedBalance.previousPayable, curr)}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px] leading-tight">
                  Net Balance:
                </span>
                <span
                  className={`text-xs sm:text-sm font-black mt-1 block ${
                    detailedBalance.netBalance > 0
                      ? 'text-rose-600'
                      : detailedBalance.netBalance < 0
                      ? 'text-emerald-700'
                      : 'text-slate-700'
                  }`}
                >
                  {formatCurrency(Math.abs(detailedBalance.netBalance), curr)}
                  <span className="text-[9px] uppercase ml-1 font-bold block sm:inline">
                    {detailedBalance.balanceType === 'receivable'
                      ? 'Rec.'
                      : detailedBalance.balanceType === 'payable'
                      ? 'Pay.'
                      : 'Settled'}
                  </span>
                </span>
              </div>
            </div>

            {/* PREVIOUS BALANCE MODE & MANUAL ADJUSTMENT SECTION */}
            <div className="pt-2.5 border-t border-purple-200/80 space-y-3">
              <div className="bg-white/95 p-3 sm:p-3.5 rounded-xl border border-purple-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Party:</span>{' '}
                    <span className="font-black text-slate-900">{selectedParty.name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Existing Ledger Balance:</span>{' '}
                    <span
                      className={`font-black ${
                        existingLedgerBalance > 0
                          ? 'text-rose-600'
                          : existingLedgerBalance < 0
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(existingLedgerBalance, curr)}
                    </span>
                  </div>
                </div>

                {/* Previous Balance Mode Selector */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Previous Balance Mode</span>
                    <span className="text-[10px] text-purple-700 font-semibold">
                      [ {prevBalanceMode === 'ledger' ? 'Existing Ledger' : prevBalanceMode === 'manual' ? 'Manual Previous' : 'Ledger + Adjustment'} ]
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      value={prevBalanceMode}
                      onChange={(e) =>
                        setPrevBalanceMode(e.target.value as 'ledger' | 'manual' | 'adjustment')
                      }
                      className="w-full pl-3 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-purple-600 rounded-xl text-slate-900 font-bold text-xs sm:text-sm outline-hidden cursor-pointer appearance-none transition-all shadow-2xs"
                    >
                      <option value="ledger">Existing Ledger Balance</option>
                      <option value="manual">Manual Previous Balance</option>
                      <option value="adjustment">Ledger Balance + Manual Adjustment</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Option: Existing Ledger Balance confirmation */}
                {prevBalanceMode === 'ledger' && (
                  <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg text-xs flex justify-between items-center">
                    <span className="text-slate-600">Calculated from Saved Ledger:</span>
                    <span className="font-black text-purple-900">{formatCurrency(existingLedgerBalance, curr)}</span>
                  </div>
                )}

                {/* Option: Manual Previous Balance */}
                {prevBalanceMode === 'manual' && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <label className="block font-bold text-amber-900">
                      Manual Previous Balance:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-bold text-amber-700 text-xs pointer-events-none">
                        {curr}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={manualPrevBalanceVal}
                        onChange={(e) => setManualPrevBalanceVal(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-3 py-2 bg-white border-2 border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-900 font-black text-sm outline-hidden"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-amber-800 pt-1 border-t border-amber-200/60 font-medium">
                      <span>Existing Ledger was: {formatCurrency(existingLedgerBalance, curr)}</span>
                      <span>
                        Effective Adjustment: {effectiveAdjustment >= 0 ? `+${effectiveAdjustment}` : effectiveAdjustment}
                      </span>
                    </div>
                  </div>
                )}

                {/* Option: Ledger Balance + Manual Adjustment */}
                {prevBalanceMode === 'adjustment' && (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-medium">Existing Ledger Balance:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(existingLedgerBalance, curr)}
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-900 mb-1">
                        Manual Adjustment:
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 font-bold text-indigo-600 text-xs pointer-events-none">
                          {curr}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={manualAdjustmentVal}
                          onChange={(e) => setManualAdjustmentVal(e.target.value)}
                          placeholder="e.g. 2000 or -1000"
                          className="w-full pl-10 pr-3 py-2 bg-white border-2 border-indigo-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-900 font-black text-sm outline-hidden"
                        />
                      </div>
                      <p className="text-[10px] text-indigo-600 mt-1">
                        Positive adjustment increases previous balance; negative adjustment reduces it.
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-indigo-950 font-bold pt-1.5 border-t border-indigo-200">
                      <span>Final Previous Balance:</span>
                      <span className="font-black text-sm text-indigo-950">
                        {formatCurrency(finalPreviousBalance, curr)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Final Previous Balance confirmation bar */}
                <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs">
                  <span>Final Previous Balance Applied:</span>
                  <span className="text-sm font-black tracking-wide">
                    {formatCurrency(finalPreviousBalance, curr)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. FAST MANUAL ENTRY (Mobile Keyboard Enter Flow & Form Submission) */}
      <form
        onSubmit={handleFastEntryFormSubmit}
        autoComplete="off"
        noValidate
        className="bg-white rounded-2xl border-2 border-purple-400 p-4 shadow-sm space-y-3.5 relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-700 text-white rounded-lg shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  Fast Manual Entry
                </h3>
                {editingItemIndex !== null && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Editing Item #{editingItemIndex + 1}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-purple-800 font-medium">
                {isProductVisible ? (
                  <>
                    Product <span className="font-bold">Next</span> → Qty{' '}
                    <span className="font-bold">Next</span> → Rate{' '}
                    <span className="font-bold">Done/Enter</span>
                  </>
                ) : (
                  <>
                    Qty <span className="font-bold">Next</span> → Rate{' '}
                    <span className="font-bold">Done/Enter</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {editingItemIndex !== null && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            )}

            {/* Optional product catalog selector if enabled */}
            {isProductVisible && invoiceSettings.showProductSelectionInForm !== false && products.length > 0 && (
              <div className="relative">
                <select
                  value={fastSelectedProductId}
                  onChange={(e) => handleSelectCatalogProduct(e.target.value)}
                  className="text-xs bg-purple-50 text-purple-900 border border-purple-200 py-1.5 px-2.5 rounded-xl font-semibold outline-hidden cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
                >
                  <option value="">⚡ Pick Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({curr} {p.saleRate})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Product / Description Field (Rendered if isProductVisible) */}
        {isProductVisible && (
          <div>
            <label
              htmlFor="fast-entry-product"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Product / Description <span className="text-red-500">*</span>
            </label>
            <input
              id="fast-entry-product"
              name="fast_product"
              ref={productInputRef}
              type="text"
              value={fastProduct}
              enterKeyHint="next"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onFocus={() => {
                focusedFieldRef.current = 'product';
                setFocusedField('product');
              }}
              onBlur={() => {
                if (focusedFieldRef.current === 'product') {
                  setFocusedField(null);
                }
              }}
              onChange={(e) => setFastProduct(e.target.value)}
              onKeyDown={(e) => {
                if (isEnterEvent(e)) {
                  handleFieldAdvance('product', e);
                }
              }}
              placeholder="e.g. Suit / Cotton Fabric / Shirt..."
              className={`w-full px-3 py-2.5 rounded-xl font-bold text-sm sm:text-base outline-hidden transition-all shadow-2xs placeholder:text-slate-400 placeholder:font-normal ${
                focusedField === 'product'
                  ? 'border-2 border-purple-600 ring-2 ring-purple-500/30 bg-purple-50/20 text-slate-900'
                  : 'border-2 border-slate-300 bg-slate-50 text-slate-900'
              }`}
            />
          </div>
        )}

        {/* QTY + RATE + AMOUNT Row */}
        <div className="grid grid-cols-3 gap-2.5 items-end">
          {/* Qty Field */}
          <div>
            <label
              htmlFor="fast-entry-qty"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Qty
            </label>
            <input
              id="fast-entry-qty"
              name="fast_qty"
              ref={qtyInputRef}
              type="number"
              step="any"
              min="0.01"
              inputMode="numeric"
              enterKeyHint="next"
              autoComplete="off"
              value={fastQty}
              onFocus={() => {
                focusedFieldRef.current = 'qty';
                setFocusedField('qty');
              }}
              onBlur={() => {
                if (focusedFieldRef.current === 'qty') {
                  setFocusedField(null);
                }
              }}
              onChange={(e) => setFastQty(e.target.value)}
              onKeyDown={(e) => {
                if (isEnterEvent(e)) {
                  handleFieldAdvance('qty', e);
                }
              }}
              placeholder="1"
              className={`w-full px-2.5 py-2.5 rounded-xl font-black text-center text-sm sm:text-base outline-hidden transition-all shadow-2xs ${
                focusedField === 'qty'
                  ? 'border-2 border-purple-600 ring-2 ring-purple-500/30 bg-purple-50/20 text-slate-900'
                  : 'border-2 border-slate-300 bg-slate-50 text-slate-900'
              }`}
            />
          </div>

          {/* Rate Field */}
          <div>
            <label
              htmlFor="fast-entry-rate"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Rate ({curr})
            </label>
            <input
              id="fast-entry-rate"
              name="fast_rate"
              ref={rateInputRef}
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              value={fastRate}
              onFocus={() => {
                focusedFieldRef.current = 'rate';
                setFocusedField('rate');
              }}
              onBlur={() => {
                if (focusedFieldRef.current === 'rate') {
                  setFocusedField(null);
                }
              }}
              onChange={(e) => setFastRate(e.target.value)}
              onKeyDown={(e) => {
                if (isEnterEvent(e)) {
                  handleFieldAdvance('rate', e);
                }
              }}
              placeholder="0"
              className={`w-full px-2.5 py-2.5 rounded-xl font-black text-center text-sm sm:text-base outline-hidden transition-all shadow-2xs ${
                focusedField === 'rate'
                  ? 'border-2 border-purple-600 ring-2 ring-purple-500/30 bg-purple-50/20 text-slate-900'
                  : 'border-2 border-slate-300 bg-slate-50 text-slate-900'
              }`}
            />
          </div>

          {/* Amount Field (Read-only Auto Calculated = Qty * Rate) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Amount ({curr})
            </label>
            <div className="w-full px-2.5 py-2.5 bg-purple-50 border-2 border-purple-200 rounded-xl text-purple-900 font-black text-center text-sm sm:text-base shadow-2xs truncate select-none">
              {fastCalculatedAmount > 0
                ? formatCurrency(fastCalculatedAmount, curr, 'no_symbol')
                : '0'}
            </div>
          </div>
        </div>

        {/* Visual Feedback on Auto Add */}
        {lastAddedFeedback && (
          <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{lastAddedFeedback}</span>
          </div>
        )}

        {/* Add Item Action Button (Can press Enter on Rate or tap this button) */}
        <button
          type="button"
          onClick={() => handleFieldAdvance('rate')}
          className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>
            {editingItemIndex !== null
              ? 'Update Item (Or Press Enter on Rate)'
              : 'Add Item (Or Press Enter on Rate)'}
          </span>
        </button>
      </form>

      {/* 5. PROPER INVOICE ITEM TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Invoice Items ({items.length})
            </h3>
            {items.length > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-900 text-[11px] font-bold rounded-full">
                Subtotal: {formatCurrency(subtotal, curr)}
              </span>
            )}
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setItems([])}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-1">
            <Package className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-600">No items added yet</p>
            <p className="text-[11px] text-slate-400">
              {isProductVisible
                ? 'Type product name above and press Enter to add rows automatically'
                : 'Enter Qty & Rate and press Enter to add rows automatically'}
            </p>
          </div>
        ) : (
          <div className="invoice-table-container w-full overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-xs text-left border-collapse min-w-[340px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  {invoiceSettings.showItemIndex !== false && (
                    <th className="py-2.5 px-2.5 text-center w-12 text-slate-500">S.No</th>
                  )}
                  {isProductVisible && (
                    <th className="py-2.5 px-3 text-left">Product / Description</th>
                  )}
                  {invoiceSettings.showItemQuantity !== false && (
                    <th className="py-2.5 px-2 text-center w-16">Qty</th>
                  )}
                  {invoiceSettings.showItemRate !== false && (
                    <th className="py-2.5 px-2 text-right w-20">Rate ({curr})</th>
                  )}
                  {invoiceSettings.showItemAmount !== false && (
                    <th className="py-2.5 px-2.5 text-right w-24">Amount ({curr})</th>
                  )}
                  {/* Action column (Never printed) */}
                  <th className="py-2.5 px-2 text-center w-16 no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const isEditingThisRow = editingItemIndex === idx;
                  return (
                    <tr
                      key={item.id || idx}
                      className={`transition-colors ${
                        isEditingThisRow
                          ? 'bg-amber-50/80 font-semibold'
                          : idx % 2 === 1
                          ? 'bg-slate-50/40 hover:bg-slate-100/60'
                          : 'bg-white hover:bg-slate-50/70'
                      }`}
                    >
                      {/* S.No */}
                      {invoiceSettings.showItemIndex !== false && (
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-500 text-[11px]">
                          {item.serialNo || idx + 1}
                        </td>
                      )}

                      {/* Product / Description */}
                      {isProductVisible && (() => {
                        const linkedProd = item.productId ? products.find((p) => p.id === item.productId) : undefined;
                        const isItemHiddenOnPrint = item.showOnInvoice === false || (linkedProd && linkedProd.showOnInvoice === false);
                        return (
                          <td
                            className="py-2 px-3 font-semibold text-slate-900 cursor-pointer"
                            onClick={() => handleEditItem(idx)}
                            title="Click to edit"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="hover:underline">{item.description}</span>
                              {isItemHiddenOnPrint && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900"
                                  title="This item is hidden from customer invoice prints and PDFs, but is included in calculations."
                                >
                                  <EyeOff className="w-3 h-3 text-amber-600" /> Hidden on Print
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })()}

                      {/* Qty */}
                      {invoiceSettings.showItemQuantity !== false && (
                        <td
                          className="py-2 px-2 text-center font-bold text-slate-800 cursor-pointer whitespace-nowrap"
                          onClick={() => handleEditItem(idx)}
                        >
                          {item.quantity}{' '}
                          {invoiceSettings.showProductUnit !== false && item.unit ? (
                            <span className="text-[10px] font-normal text-slate-500">
                              {item.unit}
                            </span>
                          ) : null}
                        </td>
                      )}

                      {/* Rate */}
                      {invoiceSettings.showItemRate !== false && (
                        <td
                          className="py-2 px-2 text-right font-medium text-slate-700 whitespace-nowrap cursor-pointer"
                          onClick={() => handleEditItem(idx)}
                        >
                          {formatCurrency(item.rate, curr, 'no_symbol')}
                        </td>
                      )}

                      {/* Amount */}
                      {invoiceSettings.showItemAmount !== false && (
                        <td className="py-2 px-2.5 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatCurrency(item.amount, curr, 'no_symbol')}
                        </td>
                      )}

                      {/* Action (Visibility, Edit & Remove buttons) */}
                      <td className="py-1.5 px-2 text-center whitespace-nowrap no-print">
                        <div className="flex items-center justify-center gap-1">
                          {(() => {
                            const linkedProd = item.productId ? products.find((p) => p.id === item.productId) : undefined;
                            const isItemHidden = item.showOnInvoice === false || (linkedProd && linkedProd.showOnInvoice === false);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setItems((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], showOnInvoice: isItemHidden ? true : false };
                                    return copy;
                                  });
                                }}
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  isItemHidden
                                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                    : 'text-slate-400 hover:text-purple-700 hover:bg-purple-100'
                                }`}
                                title={
                                  isItemHidden
                                    ? 'Hidden from customer invoice print. Click to show.'
                                    : 'Visible on customer invoice print. Click to hide.'
                                }
                              >
                                {isItemHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => handleEditItem(idx)}
                            className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                            title="Edit row"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                            title="Delete row"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Total Row as specified */}
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                  {invoiceSettings.showItemIndex !== false && (
                    <td className="py-2 px-2.5 text-center text-slate-500 font-mono text-[10px]">
                      TOTAL
                    </td>
                  )}
                  {isProductVisible && (
                    <td className="py-2 px-3 font-black text-slate-800">
                      Total Items: {items.length}
                    </td>
                  )}
                  {invoiceSettings.showItemQuantity !== false && (
                    <td className="py-2 px-2 text-center font-black text-purple-900 whitespace-nowrap">
                      {totalQty}
                    </td>
                  )}
                  {invoiceSettings.showItemRate !== false && <td className="py-2 px-2"></td>}
                  {invoiceSettings.showItemAmount !== false && (
                    <td className="py-2 px-2.5 text-right font-black text-purple-900 whitespace-nowrap">
                      {formatCurrency(subtotal, curr)}
                    </td>
                  )}
                  <td className="py-2 px-2 no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 6. TOTALS, SETTLEMENT & BALANCE SUMMARY */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
          Invoice Balance & Settlement
        </h3>

        {/* Discount & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Overall Discount ({curr})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={overallDiscount || ''}
              onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-500 rounded-xl text-slate-900 font-bold text-sm outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-500 rounded-xl text-slate-900 font-bold text-xs sm:text-sm outline-hidden cursor-pointer"
            >
              {(['Cash', 'Bank', 'JazzCash', 'Easypaisa', 'Other'] as PaymentMethod[]).map(
                (m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Payment Received Input & Quick Preset Buttons */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Payment Received ({curr})
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setPaidAmount(grandTotal);
                  setIsPaidCustomized(true);
                }}
                className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
              >
                Full ({formatCurrency(grandTotal, curr)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaidAmount(0);
                  setIsPaidCustomized(true);
                }}
                className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
              >
                Credit (Rs. 0)
              </button>
            </div>
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={paidAmount || ''}
            onChange={(e) => {
              setPaidAmount(parseFloat(e.target.value) || 0);
              setIsPaidCustomized(true);
            }}
            placeholder="0"
            className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-purple-600 focus:bg-white rounded-xl text-slate-900 font-black text-base outline-hidden"
          />
        </div>

        {/* Bottom Detailed Invoice Balance Summary Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs sm:text-sm">
          {items.length > 0 && (
            <div className="flex justify-between items-center text-slate-700 font-medium">
              <span>Items Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal, curr)}</span>
            </div>
          )}

          {overallDiscount > 0 && (
            <div className="flex justify-between items-center text-rose-700">
              <span>Invoice Discount:</span>
              <span className="font-semibold">-{formatCurrency(overallDiscount, curr)}</span>
            </div>
          )}

          {/* Previous Balance */}
          {selectedParty && (
            <div className="flex justify-between items-center text-slate-700 font-semibold pt-1 border-t border-slate-200">
              <span>Previous Balance:</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(finalPreviousBalance, curr)}
                {effectiveAdjustment !== 0 && (
                  <span className="text-[10px] text-purple-700 ml-1 font-normal">
                    ({effectiveAdjustment > 0 ? `+${effectiveAdjustment}` : effectiveAdjustment} adj)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Current Invoice */}
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 font-black text-sm sm:text-base text-slate-900">
            <span>Current Invoice:</span>
            <span className="text-purple-900">{formatCurrency(grandTotal, curr)}</span>
          </div>

          {/* Payment Received */}
          <div className="flex justify-between items-center text-emerald-700 font-bold">
            <span>Payment Received:</span>
            <span>-{formatCurrency(paidAmount, curr)}</span>
          </div>

          {/* Total Outstanding: Previous Balance + Current Invoice - Payment Received */}
          <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-center font-black text-sm sm:text-base text-slate-900">
            <div>
              <span>Total Outstanding:</span>
              <p className="text-[10px] text-slate-500 font-normal">
                (Previous Balance + Current Invoice - Payment Received)
              </p>
            </div>
            <div className="text-right">
              <span className={newBalance > 0 ? 'text-rose-600' : newBalance < 0 ? 'text-emerald-700' : 'text-slate-900'}>
                {formatCurrency(newBalance, curr)}
              </span>
              {selectedParty && (
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  {newBalance > 0 ? '(Receivable)' : newBalance < 0 ? '(Payable/Advance)' : '(Settled)'}
                </span>
              )}
            </div>
          </div>

          {/* Hidden items notice if any */}
          {(() => {
            const hiddenCount = items.filter((it) => {
              if (it.showOnInvoice === false) return true;
              if (it.productId) {
                const p = products.find((prod) => prod.id === it.productId);
                if (p && p.showOnInvoice === false) return true;
              }
              return false;
            }).length;

            if (hiddenCount === 0) return null;

            return (
              <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>{hiddenCount} item(s) hidden from customer print.</strong> Total amount & ledger balances are calculated normally.
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Invoice Notes / Remarks (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery instructions, cargo details, or extra notes..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 text-xs outline-hidden"
          />
        </div>
      </div>

      {/* 7. COMPLETE INVOICE & ACTION BUTTONS */}
      <div className="space-y-2 pt-1 pb-6">
        <button
          type="button"
          onClick={() => handleSaveInvoice('view')}
          className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-black text-sm sm:text-base rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Save className="w-5 h-5" />
          <span>Complete & Save Invoice</span>
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleSaveInvoice('print')}
            className="py-2.5 px-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-purple-300" />
            <span>Save & Print</span>
          </button>
          <button
            type="button"
            onClick={() => handleSaveInvoice('whatsapp')}
            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Save & WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="col-span-2 sm:col-span-1 py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Quick Party Add Modal */}
      <PartyFormModal
        isOpen={isQuickPartyModalOpen}
        onClose={() => setIsQuickPartyModalOpen(false)}
        onSave={handleQuickPartySaved}
        currency={curr}
      />

      {/* Inline Party Ledger Modal (Preserves invoice form state) */}
      {isLedgerModalOpen && selectedParty && (
        <PartyLedgerModal
          isOpen={isLedgerModalOpen}
          onClose={() => setIsLedgerModalOpen(false)}
          party={selectedParty}
          company={company}
          invoiceSettings={invoiceSettings}
          onAddPayment={() => setIsLedgerModalOpen(false)}
          onNewInvoice={() => setIsLedgerModalOpen(false)}
        />
      )}
    </div>
  );
};
