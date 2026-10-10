import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Party, BalanceType } from '../../types';
import { generateId } from '../../utils/formatters';

interface PartyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (party: Party) => void;
  partyToEdit?: Party | null;
  currency?: string;
}

export const PartyFormModal: React.FC<PartyFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  partyToEdit,
  currency = 'Rs.',
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [balanceType, setBalanceType] = useState<BalanceType>('receivable');
  const [creditLimit, setCreditLimit] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (partyToEdit) {
      setName(partyToEdit.name || '');
      setPhone(partyToEdit.phone || '');
      setWhatsapp(partyToEdit.whatsapp || '');
      setAddress(partyToEdit.address || '');
      setCity(partyToEdit.city || '');
      setOpeningBalance(partyToEdit.openingBalance || 0);
      setBalanceType(partyToEdit.balanceType || 'receivable');
      setCreditLimit(partyToEdit.creditLimit);
      setNotes(partyToEdit.notes || '');
    } else {
      setName('');
      setPhone('');
      setWhatsapp('');
      setAddress('');
      setCity('');
      setOpeningBalance(0);
      setBalanceType('receivable');
      setCreditLimit(undefined);
      setNotes('');
    }
    setErrors({});
  }, [partyToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Party / Customer name is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const partyData: Party = {
      id: partyToEdit?.id || generateId('party'),
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      address: address.trim(),
      city: city.trim(),
      openingBalance: Number(openingBalance) || 0,
      balanceType,
      partyType: partyToEdit?.partyType || 'customer',
      creditLimit: creditLimit ? Number(creditLimit) : undefined,
      notes: notes.trim(),
      createdAt: partyToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(partyData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={partyToEdit ? 'Edit Customer / Party' : 'Add New Customer / Party'}
      subtitle="Manage party profile, contact info and opening balance"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Party Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Party / Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            placeholder="e.g. Al-Madina Garments"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden font-medium"
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        {/* Phone & WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0300-1234567"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Leave empty to use mobile"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>
        </div>

        {/* Address & City */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop #, Street / Market"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>
        </div>

        {/* Opening Balance & Type */}
        <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100">
          <label className="block text-xs font-bold text-purple-900 mb-2">Opening Balance</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={openingBalance || ''}
                  onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500 outline-hidden font-semibold"
                />
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBalanceType('receivable')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    balanceType === 'receivable'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Receivable (Party Owes)
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceType('payable')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    balanceType === 'payable'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Payable (Advance)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Limit & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Credit Limit ({currency})
            </label>
            <input
              type="number"
              min="0"
              value={creditLimit ?? ''}
              onChange={(e) =>
                setCreditLimit(e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder="e.g. 100000"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any payment terms or notes"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
          >
            {partyToEdit ? 'Update Party' : 'Save Party'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
