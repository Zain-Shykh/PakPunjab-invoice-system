import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CompanySettings, Party, Payment, PaymentMethod, Account } from '../../types';
import {
  formatCurrency,
  generateId,
  getCurrentTimeString,
  getTodayDateString,
} from '../../utils/formatters';
import { calculatePartyBalance } from '../../utils/accounting';
import { getAccounts, getInvoices, getParties, getPayments, getPurchases, getManualTransactions } from '../../db/storage';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Payment) => void;
  partyToPreselect?: Party | null;
  paymentToEdit?: Payment | null;
  company: CompanySettings;
  defaultType?: 'received' | 'paid';
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  partyToPreselect,
  paymentToEdit,
  company,
  defaultType = 'received',
}) => {
  const curr = company.currency || 'Rs.';
  const [parties, setParties] = useState<Party[]>(getParties());
  const [accounts, setAccounts] = useState<Account[]>(getAccounts());

  const isPreselectedSupplier = partyToPreselect?.partyType === 'supplier';
  const [paymentType, setPaymentType] = useState<'received' | 'paid'>(
    paymentToEdit?.paymentType || (isPreselectedSupplier ? 'paid' : defaultType)
  );

  const [selectedPartyId, setSelectedPartyId] = useState(
    paymentToEdit?.partyId || partyToPreselect?.id || ''
  );
  const [amount, setAmount] = useState<number>(paymentToEdit?.amount || 0);
  const [date, setDate] = useState(paymentToEdit?.date || getTodayDateString());
  const [time, setTime] = useState(paymentToEdit?.time || getCurrentTimeString());
  const [method, setMethod] = useState<PaymentMethod | string>(paymentToEdit?.method || 'Cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(paymentToEdit?.accountId || '');
  const [reference, setReference] = useState(paymentToEdit?.reference || '');
  const [notes, setNotes] = useState(paymentToEdit?.notes || '');
  const [error, setError] = useState('');

  const bankAccounts = accounts.filter((a) => a.accountType === 'bank');

  useEffect(() => {
    setParties(getParties());
    const accs = getAccounts();
    setAccounts(accs);

    if (paymentToEdit) {
      setSelectedPartyId(paymentToEdit.partyId);
      setAmount(paymentToEdit.amount);
      setDate(paymentToEdit.date);
      setTime(paymentToEdit.time || getCurrentTimeString());
      setMethod(paymentToEdit.method);
      setSelectedAccountId(paymentToEdit.accountId || '');
      setReference(paymentToEdit.reference || '');
      setNotes(paymentToEdit.notes || '');
      setPaymentType(paymentToEdit.paymentType || 'received');
    } else if (partyToPreselect) {
      setSelectedPartyId(partyToPreselect.id);
      const isSupp = partyToPreselect.partyType === 'supplier';
      setPaymentType(isSupp ? 'paid' : defaultType);

      const bal = calculatePartyBalance(
        partyToPreselect,
        getInvoices(),
        getPayments(),
        undefined,
        getPurchases(),
        getManualTransactions()
      );
      setAmount(Math.abs(bal) > 0 ? Math.abs(bal) : 0);
      setDate(getTodayDateString());
      setTime(getCurrentTimeString());
      setMethod('Cash');
      setSelectedAccountId('');
      setReference('');
      setNotes('');
    } else {
      setSelectedPartyId('');
      setAmount(0);
      setDate(getTodayDateString());
      setTime(getCurrentTimeString());
      setMethod('Cash');
      setSelectedAccountId('');
      setReference('');
      setNotes('');
      setPaymentType(defaultType);
    }
    setError('');
  }, [isOpen, partyToPreselect, paymentToEdit, defaultType]);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const isSelectedSupplier = selectedParty?.partyType === 'supplier';

  const previousBalance = selectedParty
    ? calculatePartyBalance(
        selectedParty,
        getInvoices(),
        getPayments(),
        undefined,
        getPurchases(),
        getManualTransactions()
      )
    : 0;

  // If editing existing payment, adjust preview by current payment amount
  const adjustedPrevBalance =
    paymentToEdit && selectedParty && paymentToEdit.partyId === selectedParty.id
      ? paymentType === 'received'
        ? previousBalance + paymentToEdit.amount
        : previousBalance - paymentToEdit.amount
      : previousBalance;

  // For customer: paying reduces receivable
  // For supplier: paying reduces payable
  const newBalance =
    paymentType === 'received'
      ? adjustedPrevBalance - (amount || 0)
      : adjustedPrevBalance - (amount || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPartyId || !selectedParty) {
      setError('Please select a customer / supplier party.');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    const matchedAccount = method === 'Bank'
      ? accounts.find((a) => a.id === selectedAccountId) || bankAccounts[0]
      : accounts.find((a) => a.id === 'acc_cash' || a.accountType === 'cash');

    const paymentData: Payment = {
      id: paymentToEdit?.id || generateId('pay'),
      date,
      time,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      amount: Number(amount),
      method,
      accountId: matchedAccount ? matchedAccount.id : undefined,
      accountName: matchedAccount ? matchedAccount.accountName : undefined,
      paymentType,
      reference: reference.trim(),
      notes: notes.trim(),
      invoiceId: paymentToEdit?.invoiceId,
      createdAt: paymentToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(paymentData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        paymentToEdit
          ? 'Edit Payment'
          : paymentType === 'received'
          ? 'Receive Customer Payment'
          : 'Make Supplier Payment'
      }
      subtitle={
        paymentType === 'received'
          ? 'Record customer cash receipt or bank deposit'
          : 'Record payment made to supplier (Cash or Bank)'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Payment Direction Toggle (Receive vs Pay) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Transaction Action <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentType('received')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                paymentType === 'received'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Receive Payment (From Customer)
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('paid')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                paymentType === 'paid'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Pay Supplier (To Supplier)
            </button>
          </div>
        </div>

        {/* Customer / Supplier Select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {paymentType === 'received' ? 'Customer / Party' : 'Supplier / Vendor'}{' '}
            <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={selectedPartyId}
            onChange={(e) => {
              setSelectedPartyId(e.target.value);
              const p = parties.find((part) => part.id === e.target.value);
              if (p) {
                const b = calculatePartyBalance(
                  p,
                  getInvoices(),
                  getPayments(),
                  undefined,
                  getPurchases(),
                  getManualTransactions()
                );
                if (Math.abs(b) > 0) setAmount(Math.abs(b));
              }
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium outline-hidden cursor-pointer"
          >
            <option value="">-- Select {paymentType === 'received' ? 'Customer' : 'Supplier'} --</option>
            {parties
              .filter((p) =>
                paymentType === 'paid'
                  ? p.partyType === 'supplier' || p.partyType === 'both' || !p.partyType
                  : p.partyType === 'customer' || p.partyType === 'both' || !p.partyType
              )
              .map((p) => {
                const bal = calculatePartyBalance(
                  p,
                  getInvoices(),
                  getPayments(),
                  undefined,
                  getPurchases(),
                  getManualTransactions()
                );
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.city ? `(${p.city})` : ''} - Bal: {formatCurrency(Math.abs(bal), curr)}{' '}
                    {bal > 0 ? (p.partyType === 'supplier' ? '(Payable)' : '(Receivable)') : ''}
                  </option>
                );
              })}
          </select>
        </div>

        {/* Balance Preview Card */}
        {selectedParty && (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Prev Balance
              </span>
              <span className="font-bold text-slate-800 text-sm">
                {formatCurrency(Math.abs(adjustedPrevBalance), curr)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                {paymentType === 'received' ? 'Receiving' : 'Paying'}
              </span>
              <span className={`font-bold text-sm ${paymentType === 'received' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(amount || 0, curr)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                New Balance
              </span>
              <span
                className={`font-black text-sm ${
                  newBalance > 0
                    ? 'text-rose-600'
                    : newBalance < 0
                    ? 'text-emerald-600'
                    : 'text-slate-700'
                }`}
              >
                {formatCurrency(Math.abs(newBalance), curr)}
              </span>
            </div>
          </div>
        )}

        {/* Amount & Shortcut */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Payment Amount ({curr}) <span className="text-red-500">*</span>
            </label>
            {selectedParty && Math.abs(adjustedPrevBalance) > 0 && (
              <button
                type="button"
                onClick={() => setAmount(Math.abs(adjustedPrevBalance))}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md cursor-pointer"
              >
                Pay Full Balance ({formatCurrency(Math.abs(adjustedPrevBalance), curr)})
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">{curr}</span>
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

        {/* Date, Time & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                if (e.target.value === 'Bank' && !selectedAccountId && bankAccounts.length > 0) {
                  setSelectedAccountId(bankAccounts[0].id);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-hidden cursor-pointer"
            >
              <option value="Cash">Cash (Cash Book)</option>
              <option value="Bank">Bank Account (Bank Ledger)</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="Other">Other / Cheque</option>
            </select>
          </div>
        </div>

        {/* Bank Account Selection (if Bank selected) */}
        {method === 'Bank' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Bank Account <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAccountId || (bankAccounts[0]?.id || '')}
              onChange={(e) => setSelectedAccountId(e.target.value)}
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

        {/* Reference & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Trx ID / Cheque #
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Trx-9942 or Cheque # 140"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Received by, purpose, remarks..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
            />
          </div>
        </div>

        {/* Buttons */}
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
            className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
              paymentType === 'received'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {paymentToEdit
              ? 'Update Payment'
              : paymentType === 'received'
              ? 'Save Customer Receipt'
              : 'Save Supplier Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
