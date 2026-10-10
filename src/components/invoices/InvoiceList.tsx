import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Share2,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { CompanySettings, Invoice, InvoiceSettings, InvoiceStatus } from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

interface InvoiceListProps {
  invoices: Invoice[];
  company: CompanySettings;
  invoiceSettings: InvoiceSettings;
  onNewInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onWhatsAppInvoice?: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  initialFilter?: string;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  company,
  invoiceSettings,
  onNewInvoice,
  onViewInvoice,
  onWhatsAppInvoice,
  onEditInvoice,
  onDeleteInvoice,
  initialFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [dateFilter, setDateFilter] = useState<string>(initialFilter === 'today' ? 'today' : 'all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const curr = company.currency || 'Rs.';
  const today = getTodayDateString();

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    // Search
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      invoice.invoiceNo.toLowerCase().includes(term) ||
      invoice.partyName.toLowerCase().includes(term) ||
      (invoice.partyPhone && invoice.partyPhone.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter !== 'all' && invoice.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter === 'today') {
      if (invoice.date !== today) return false;
    } else if (dateFilter === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterday = d.toISOString().split('T')[0];
      if (invoice.date !== yesterday) return false;
    } else if (dateFilter === 'this_week') {
      const now = new Date();
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      const firstDayStr = firstDay.toISOString().split('T')[0];
      if (invoice.date < firstDayStr) return false;
    } else if (dateFilter === 'this_month') {
      const currentMonthPrefix = today.substring(0, 7);
      if (!invoice.date.startsWith(currentMonthPrefix)) return false;
    } else if (dateFilter === 'custom') {
      if (customStartDate && invoice.date < customStartDate) return false;
      if (customEndDate && invoice.date > customEndDate) return false;
    }

    return true;
  });

  // Calculate summary of filtered list
  const totalFilteredSales = filteredInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalFilteredPaid = filteredInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalFilteredRemaining = filteredInvoices.reduce((sum, i) => sum + i.remainingAmount, 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-purple-700" />
            Sales Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {invoices.length} invoices recorded · Manage bills, print & share
          </p>
        </div>

        <button
          onClick={onNewInvoice}
          className="w-full sm:w-auto px-4 py-2.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> + Create New Invoice
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Filtered Total
          </span>
          <span className="text-sm sm:text-xl font-black text-slate-900 tracking-tight block mt-0.5">
            {formatCurrency(totalFilteredSales, curr)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{filteredInvoices.length} Invoices</span>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Collected
          </span>
          <span className="text-sm sm:text-xl font-black text-emerald-700 tracking-tight block mt-0.5">
            {formatCurrency(totalFilteredPaid, curr)}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">Received</span>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Remaining Due
          </span>
          <span className="text-sm sm:text-xl font-black text-rose-600 tracking-tight block mt-0.5">
            {formatCurrency(totalFilteredRemaining, curr)}
          </span>
          <span className="text-[10px] text-rose-600 mt-0.5 block font-medium">Credit Balance</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice # or customer name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
            {(['all', 'Paid', 'Partial', 'Credit'] as Array<'all' | InvoiceStatus>).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-purple-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'all' ? 'All Status' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* INVOICE LIST TABLE */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No invoices found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || dateFilter !== 'all' || statusFilter !== 'all'
              ? 'No invoices match the selected search or filter criteria.'
              : 'Create your first sales invoice to get started.'}
          </p>
          <button
            onClick={onNewInvoice}
            className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + New Sales Invoice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-right">Total ({curr})</th>
                  <th className="py-3 px-3 text-right">Paid ({curr})</th>
                  <th className="py-3 px-3 text-right">Remaining ({curr})</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-900 whitespace-nowrap">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{inv.partyName}</div>
                      {inv.partyPhone && (
                        <div className="text-[10px] text-slate-400">{inv.partyPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(inv.grandTotal, curr, 'no_symbol')}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                      {formatCurrency(inv.paidAmount, curr, 'no_symbol')}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-rose-600 whitespace-nowrap">
                      {formatCurrency(inv.remainingAmount, curr, 'no_symbol')}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'Partial'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                          title="View / Print / PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => (onWhatsAppInvoice ? onWhatsAppInvoice(inv) : onViewInvoice(inv))}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Invoice"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Invoice"
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

      {/* Delete Confirmation Modal */}
      {invoiceToDelete && (
        <ConfirmModal
          isOpen={Boolean(invoiceToDelete)}
          onClose={() => setInvoiceToDelete(null)}
          onConfirm={() => {
            if (invoiceToDelete) {
              onDeleteInvoice(invoiceToDelete.id);
              setInvoiceToDelete(null);
            }
          }}
          title={`Delete Invoice ${invoiceToDelete.invoiceNo}?`}
          message={`Are you sure you want to delete invoice #${invoiceToDelete.invoiceNo} (${formatCurrency(
            invoiceToDelete.grandTotal,
            curr
          )})?\n\nThis will also automatically reverse any ledger entry and update customer ${
            invoiceToDelete.partyName
          }'s outstanding balance.`}
          confirmText="Yes, Delete Invoice"
          isDestructive={true}
        />
      )}
    </div>
  );
};
