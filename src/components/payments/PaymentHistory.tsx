import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  Printer,
  Share2,
  MessageCircle,
} from 'lucide-react';
import { CompanySettings, Party, Payment, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import { openWhatsAppChat } from '../../utils/shareUtils';
import { getParties } from '../../db/storage';

interface PaymentHistoryProps {
  payments: Payment[];
  company: CompanySettings;
  onNewPayment: () => void;
  onEditPayment: (payment: Payment) => void;
  onDeletePayment: (paymentId: string) => void;
  initialFilter?: string;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  payments,
  company,
  onNewPayment,
  onEditPayment,
  onDeletePayment,
  initialFilter,
}) => {
  const curr = company.currency || 'Rs.';
  const today = getTodayDateString();
  const parties = getParties();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'all' | PaymentMethod>('all');
  const [dateFilter, setDateFilter] = useState(initialFilter === 'today' ? 'today' : 'all');
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Filter payments
  const filteredPayments = payments.filter((pay) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      pay.partyName.toLowerCase().includes(term) ||
      (pay.reference && pay.reference.toLowerCase().includes(term)) ||
      (pay.notes && pay.notes.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (selectedPartyId && pay.partyId !== selectedPartyId) {
      return false;
    }

    if (selectedMethod !== 'all' && pay.method !== selectedMethod) {
      return false;
    }

    if (dateFilter === 'today' && pay.date !== today) {
      return false;
    } else if (dateFilter === 'this_month') {
      if (!pay.date.startsWith(today.substring(0, 7))) return false;
    }

    return true;
  });

  const totalFilteredAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleSharePaymentReceipt = (payment: Payment) => {
    const party = parties.find((p) => p.id === payment.partyId);
    const text =
      `*Payment Receipt - ${company.businessName}*\n\n` +
      `Received with thanks from *${payment.partyName}*:\n` +
      `• *Amount Received:* ${formatCurrency(payment.amount, curr)}\n` +
      `• *Date:* ${formatDate(payment.date)}\n` +
      `• *Payment Method:* ${payment.method}\n` +
      (payment.reference ? `• *Reference:* ${payment.reference}\n` : '') +
      `\nThank you for your payment!\n` +
      `_${company.businessName}_`;

    openWhatsAppChat(party?.whatsapp || party?.phone || '', text);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            Payment Receipts & History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {payments.length} payments recorded · Real-time ledger synchronization
          </p>
        </div>

        <button
          onClick={onNewPayment}
          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> + Receive New Payment
        </button>
      </div>

      {/* KPI Total Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-xs text-emerald-200 font-semibold uppercase tracking-wider block">
            Filtered Total Payments Received
          </span>
          <span className="text-2xl sm:text-3xl font-black tracking-tight block mt-1">
            {formatCurrency(totalFilteredAmount, curr)}
          </span>
        </div>
        <div className="text-xs text-emerald-100 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
          Showing {filteredPayments.length} transactions
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer, reference, remarks..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Party Filter */}
          <div>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="">All Parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as 'all' | PaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="all">All Methods</option>
              <option value="Cash">Cash Only</option>
              <option value="Bank">Bank Transfer</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="Other">Other / Cheque</option>
            </select>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 mr-1">Period:</span>
          {['all', 'today', 'this_month'].map((df) => (
            <button
              key={df}
              onClick={() => setDateFilter(df)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                dateFilter === df
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {df === 'all' ? 'All Time' : df === 'today' ? "Today" : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* PAYMENTS TABLE */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No payment receipts found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedPartyId || selectedMethod !== 'all' || dateFilter !== 'all'
              ? 'No payments match the selected filters.'
              : 'Record a customer payment to track collections.'}
          </p>
          <button
            onClick={onNewPayment}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + Receive Payment
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Party / Customer</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Reference / Remarks</th>
                  <th className="py-3 px-3 text-right">Amount ({curr})</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {formatDate(pay.date)}
                      {pay.time && <span className="text-[10px] text-slate-400 block">{pay.time}</span>}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {pay.partyName}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {pay.method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {pay.reference && <strong className="text-slate-800 mr-1">{pay.reference}</strong>}
                      {pay.notes && <span>{pay.notes}</span>}
                      {!pay.reference && !pay.notes && <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                      {formatCurrency(pay.amount, curr)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSharePaymentReceipt(pay)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          title="Share Receipt on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditPayment(pay)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Payment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPaymentToDelete(pay)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Payment Modal */}
      {paymentToDelete && (
        <ConfirmModal
          isOpen={Boolean(paymentToDelete)}
          onClose={() => setPaymentToDelete(null)}
          onConfirm={() => {
            if (paymentToDelete) {
              onDeletePayment(paymentToDelete.id);
              setPaymentToDelete(null);
            }
          }}
          title="Delete Payment Receipt?"
          message={`Are you sure you want to delete this payment receipt of ${formatCurrency(
            paymentToDelete.amount,
            curr
          )} from ${
            paymentToDelete.partyName
          }?\n\nDeleting this payment will increase the customer's outstanding balance accordingly.`}
          confirmText="Yes, Delete Payment"
          isDestructive={true}
        />
      )}
    </div>
  );
};
