import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ManualTransaction } from '../../types';
import { generateId, getCurrentTimeString, getTodayDateString } from '../../utils/formatters';

interface ManualCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: ManualTransaction) => void;
  currency: string;
}

export const ManualCashModal: React.FC<ManualCashModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currency,
}) => {
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || amount <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description for this cash entry.');
      return;
    }

    const tx: ManualTransaction = {
      id: generateId('tx_cash'),
      date,
      time,
      transactionType: type,
      amount: Number(amount),
      accountId: 'acc_cash',
      accountName: 'Cash in Hand',
      description: description.trim(),
      reference: reference.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(tx);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Cash Entry"
      subtitle="Record manual Cash In or Cash Out directly into the Cash Ledger"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Transaction Type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Cash Transaction Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('cash_in')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                type === 'cash_in'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Cash In (+ Increases Cash)
            </button>
            <button
              type="button"
              onClick={() => setType('cash_out')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                type === 'cash_out'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Cash Out (- Decreases Cash)
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Amount ({currency}) <span className="text-red-500">*</span>
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
              className="w-full pl-12 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500 font-black text-lg outline-hidden"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Description / Particulars <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Owner Capital Investment, Loan Return, Office Tea"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
          />
        </div>

        {/* Reference & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference # (Optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. VOUCHER-01"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer ${
              type === 'cash_in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            Save Cash Entry
          </button>
        </div>
      </form>
    </Modal>
  );
};
