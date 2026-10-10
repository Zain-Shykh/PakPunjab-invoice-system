import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  BookOpen,
  CreditCard,
  Receipt,
  Edit2,
  Trash2,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { Party, CompanySettings } from '../../types';
import { calculatePartyBalance } from '../../utils/accounting';
import { formatCurrency } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import { openWhatsAppChat } from '../../utils/shareUtils';
import { getInvoices, getPayments, getPurchases, getManualTransactions } from '../../db/storage';

interface PartyListProps {
  parties: Party[];
  company: CompanySettings;
  onAddParty: () => void;
  onEditParty: (party: Party) => void;
  onDeleteParty: (partyId: string) => void;
  onViewLedger: (party: Party) => void;
  onAddPayment: (party: Party) => void;
  onNewInvoice: (party: Party) => void;
}

export const PartyList: React.FC<PartyListProps> = ({
  parties,
  company,
  onAddParty,
  onEditParty,
  onDeleteParty,
  onViewLedger,
  onAddPayment,
  onNewInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'receivable' | 'zero' | 'payable'>('all');
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);

  const curr = company.currency || 'Rs.';
  const invoices = getInvoices();
  const payments = getPayments();
  const purchases = getPurchases();
  const manualTransactions = getManualTransactions();

  // Filter parties by search term and balance status
  const filteredParties = parties.filter((party) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      party.name.toLowerCase().includes(term) ||
      (party.phone && party.phone.toLowerCase().includes(term)) ||
      (party.city && party.city.toLowerCase().includes(term)) ||
      (party.address && party.address.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    const balance = calculatePartyBalance(party, invoices, payments, undefined, purchases, manualTransactions);
    if (balanceFilter === 'receivable') return balance > 0;
    if (balanceFilter === 'payable') return balance < 0;
    if (balanceFilter === 'zero') return balance === 0;

    return true;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-700" />
            Customers & Parties
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {parties.length} customer accounts · Instant Ledger & Running Balances
          </p>
        </div>

        <button
          onClick={onAddParty}
          className="w-full sm:w-auto px-4 py-2.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add New Customer
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by party name, phone, city..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setBalanceFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              balanceFilter === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({parties.length})
          </button>
          <button
            onClick={() => setBalanceFilter('receivable')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              balanceFilter === 'receivable'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Receivables
          </button>
          <button
            onClick={() => setBalanceFilter('payable')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              balanceFilter === 'payable'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Advance / Payable
          </button>
          <button
            onClick={() => setBalanceFilter('zero')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              balanceFilter === 'zero'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settled (0)
          </button>
        </div>
      </div>

      {/* Party Cards List */}
      {filteredParties.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No parties found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `No party matches "${searchTerm}". Try a different search term.`
              : 'Get started by creating your first customer / party.'}
          </p>
          <button
            onClick={onAddParty}
            className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + Add New Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredParties.map((party) => {
            const balance = calculatePartyBalance(party, invoices, payments, undefined, purchases, manualTransactions);
            const isReceivable = balance > 0;
            const isPayable = balance < 0;

            return (
              <div
                key={party.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Name & Balance */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {party.name}
                      </h3>
                      {party.city && (
                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {party.city}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {isReceivable ? 'Due' : isPayable ? 'Advance' : 'Balance'}
                      </span>
                      <span
                        className={`text-base font-black ${
                          isReceivable
                            ? 'text-rose-600'
                            : isPayable
                            ? 'text-emerald-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatCurrency(balance, curr)}
                      </span>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{party.phone || 'No phone'}</span>
                    </div>
                    {party.phone && (
                      <button
                        onClick={() => openWhatsAppChat(party.whatsapp || party.phone, '')}
                        className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewLedger(party)}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="View Ledger Statement"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Ledger
                    </button>
                    <button
                      onClick={() => onAddPayment(party)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Record Payment"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Pay
                    </button>
                    <button
                      onClick={() => onNewInvoice(party)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Create Invoice"
                    >
                      <Receipt className="w-3.5 h-3.5 text-purple-700" /> Bill
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditParty(party)}
                      className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Party"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPartyToDelete(party)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Party"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {partyToDelete && (
        <ConfirmModal
          isOpen={Boolean(partyToDelete)}
          onClose={() => setPartyToDelete(null)}
          onConfirm={() => {
            if (partyToDelete) {
              onDeleteParty(partyToDelete.id);
              setPartyToDelete(null);
            }
          }}
          title={`Delete Party: ${partyToDelete.name}?`}
          message={`Are you sure you want to delete this customer account?\n\nDeleting this customer will remove their profile. Their existing invoices and payment records will be preserved.`}
          confirmText="Yes, Delete Party"
          isDestructive={true}
        />
      )}
    </div>
  );
};
