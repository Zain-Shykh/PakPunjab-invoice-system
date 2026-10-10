import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Party, ManualTransaction } from '../../types';
import { formatCurrency, generateId, getCurrentTimeString, getTodayDateString } from '../../utils/formatters';

interface ManualPartyEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  onSave: (tx: ManualTransaction) => void;
  currency: string;
}

export const ManualPartyEntryModal: React.FC<ManualPartyEntryModalProps> = ({
  isOpen,
  onClose,
  party,
  onSave,
  currency,
}) => {
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [type, setType] = useState<'party_debit' | 'party_credit'>('party_debit');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !party) return null;

  const isSupplier = party.partyType === 'supplier';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a brief description / reason for this entry.');
      return;
    }

    const tx: ManualTransaction = {
      id: generateId('tx'),
      date,
      time,
      transactionType: type,
      amount: Number(amount),
      partyId: party.id,
      partyName: party.name,
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
      title={`Manual Ledger Entry - ${party.name}`}
      subtitle={`Add manual debit or credit adjustment to ${isSupplier ? 'supplier payable' : 'customer receivable'} ledger`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
          <p className="font-bold">Party: {party.name} ({isSupplier ? 'Supplier' : 'Customer'})</p>
          <p className="text-[11px] text-purple-700">
            {isSupplier
              ? type === 'party_credit'
                ? 'Credit increases supplier payable (we owe them more money).'
                : 'Debit decreases supplier payable (reduces what we owe them).'
              : type === 'party_debit'
              ? 'Debit increases customer receivable (customer owes more money).'
              : 'Credit decreases customer receivable (reduces what customer owes).'}
          </p>
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Transaction Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('party_debit')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                type === 'party_debit'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Debit ({isSupplier ? 'Reduces Payable' : 'Increases Receivable'})
            </button>
            <button
              type="button"
              onClick={() => setType('party_credit')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                type === 'party_credit'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Credit ({isSupplier ? 'Increases Payable' : 'Reduces Receivable'})
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

        {/* Description / Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Description / Reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Prior opening balance correction, freight fee, cargo charge"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
          />
        </div>

        {/* Reference */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reference / Slip # (Optional)
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. SLIP-102"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
          />
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
            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            Save Entry
          </button>
        </div>
      </form>
    </Modal>
  );
};
