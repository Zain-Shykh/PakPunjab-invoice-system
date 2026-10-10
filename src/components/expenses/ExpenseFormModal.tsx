import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Expense, ExpenseCategory, Account, PaymentMethod } from '../../types';
import {
  formatCurrency,
  generateId,
  getCurrentTimeString,
  getTodayDateString,
} from '../../utils/formatters';
import {
  getAccounts,
  getExpenseCategories,
  saveExpenseCategory,
} from '../../db/storage';
import { Plus } from 'lucide-react';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  expenseToEdit?: Expense | null;
  currency: string;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expenseToEdit,
  currency,
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>(getExpenseCategories());
  const [accounts, setAccounts] = useState<Account[]>(getAccounts());

  const [date, setDate] = useState(expenseToEdit?.date || getTodayDateString());
  const [time, setTime] = useState(expenseToEdit?.time || getCurrentTimeString());
  const [categoryId, setCategoryId] = useState(expenseToEdit?.categoryId || '');
  const [description, setDescription] = useState(expenseToEdit?.description || '');
  const [amount, setAmount] = useState<number>(expenseToEdit?.amount || 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | string>(
    expenseToEdit?.paymentMethod || 'Cash'
  );
  const [accountId, setAccountId] = useState(expenseToEdit?.accountId || 'acc_cash');
  const [reference, setReference] = useState(expenseToEdit?.reference || '');
  const [notes, setNotes] = useState(expenseToEdit?.notes || '');
  const [error, setError] = useState('');

  // New Category inline adder
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const bankAccounts = accounts.filter((a) => a.accountType === 'bank');

  useEffect(() => {
    const cats = getExpenseCategories();
    setCategories(cats);
    const accs = getAccounts();
    setAccounts(accs);

    if (expenseToEdit) {
      setDate(expenseToEdit.date);
      setTime(expenseToEdit.time || getCurrentTimeString());
      setCategoryId(expenseToEdit.categoryId);
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount);
      setPaymentMethod(expenseToEdit.paymentMethod);
      setAccountId(expenseToEdit.accountId || (expenseToEdit.paymentMethod === 'Cash' ? 'acc_cash' : bankAccounts[0]?.id || ''));
      setReference(expenseToEdit.reference || '');
      setNotes(expenseToEdit.notes || '');
    } else {
      setDate(getTodayDateString());
      setTime(getCurrentTimeString());
      setCategoryId(cats[0]?.id || '');
      setDescription('');
      setAmount(0);
      setPaymentMethod('Cash');
      setAccountId('acc_cash');
      setReference('');
      setNotes('');
    }
    setError('');
  }, [isOpen, expenseToEdit]);

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const newCat: ExpenseCategory = {
      id: generateId('cat'),
      name: newCategoryName.trim(),
      createdAt: new Date().toISOString(),
    };
    saveExpenseCategory(newCat);
    const updated = getExpenseCategories();
    setCategories(updated);
    setCategoryId(newCat.id);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || amount <= 0) {
      setError('Please enter a valid expense amount greater than zero.');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    if (!selectedCategory) {
      setError('Please select an expense category.');
      return;
    }

    let targetAccountId = accountId;
    let targetAccountName = 'Cash in Hand';

    if (paymentMethod === 'Cash') {
      targetAccountId = 'acc_cash';
      targetAccountName = 'Cash in Hand';
    } else {
      const selectedAcc = accounts.find((a) => a.id === accountId) || bankAccounts[0];
      targetAccountId = selectedAcc ? selectedAcc.id : 'acc_bank';
      targetAccountName = selectedAcc ? selectedAcc.accountName : 'Bank Account';
    }

    const expenseData: Expense = {
      id: expenseToEdit?.id || generateId('exp'),
      date,
      time,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      description: description.trim(),
      amount: Number(amount),
      paymentMethod,
      accountId: targetAccountId,
      accountName: targetAccountName,
      reference: reference.trim(),
      notes: notes.trim(),
      createdAt: expenseToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(expenseData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'Edit Expense' : 'Add Daily Business Expense'}
      subtitle="Record expense and update Cash / Bank balances"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Expense Category */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Expense Category <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsAddingCategory(!isAddingCategory)}
              className="text-[11px] font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              {isAddingCategory ? 'Cancel' : '+ New Category'}
            </button>
          </div>

          {isAddingCategory ? (
            <div className="flex items-center gap-2 mb-2 p-2 bg-purple-50 rounded-xl border border-purple-200">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name (e.g. Fuel, Generator, Lunch)"
                className="flex-1 px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddNewCategory}
                className="px-3 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>
          ) : (
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium outline-hidden cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Expense Amount ({currency}) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">{currency}</span>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500 font-black text-lg outline-hidden"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Expense Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-hidden"
            />
          </div>
        </div>

        {/* Payment Method (Cash vs Bank) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value === 'Bank' && bankAccounts.length > 0) {
                  setAccountId(bankAccounts[0].id);
                } else {
                  setAccountId('acc_cash');
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold outline-hidden cursor-pointer"
            >
              <option value="Cash">Cash (Deducts Cash in Hand)</option>
              <option value="Bank">Bank Account (Deducts Bank Balance)</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {paymentMethod === 'Bank' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Bank Account <span className="text-red-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold outline-hidden cursor-pointer"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} {acc.bankName ? `(${acc.bankName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Description / Particulars
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Electricity bill for shop # 12, Tea for guests"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
          />
        </div>

        {/* Reference & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Bill #
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. BILL-9921"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paid by, remarks..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            {expenseToEdit ? 'Update Expense' : 'Save Business Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
