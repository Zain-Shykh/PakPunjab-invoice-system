import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Calendar,
  Trash2,
  Edit2,
  Printer,
  TrendingDown,
  Building,
  Banknote,
} from 'lucide-react';
import { Expense, ExpenseCategory, CompanySettings } from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

interface ExpenseListProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  company: CompanySettings;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  categories,
  company,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const curr = company.currency || 'Rs.';
  const today = getTodayDateString();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'this_week' | 'this_month' | 'all' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    // Search
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      e.description.toLowerCase().includes(term) ||
      e.categoryName.toLowerCase().includes(term) ||
      (e.reference && e.reference.toLowerCase().includes(term));
    if (!matchesSearch) return false;

    // Category
    if (categoryFilter !== 'all' && e.categoryId !== categoryFilter) return false;

    // Payment Method
    if (methodFilter !== 'all') {
      if (methodFilter === 'Cash' && e.paymentMethod !== 'Cash') return false;
      if (methodFilter === 'Bank' && e.paymentMethod !== 'Bank') return false;
    }

    // Date
    if (dateFilter === 'today') return e.date === today;
    if (dateFilter === 'this_week') {
      const now = new Date();
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      return e.date >= firstDay.toISOString().split('T')[0];
    }
    if (dateFilter === 'this_month') {
      return e.date.startsWith(today.substring(0, 7));
    }
    if (dateFilter === 'custom') {
      if (customStart && e.date < customStart) return false;
      if (customEnd && e.date > customEnd) return false;
    }

    return true;
  });

  // Calculate stats
  const todayExpenses = expenses.filter((e) => e.date === today);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const thisMonthExpenses = expenses.filter((e) => e.date.startsWith(today.substring(0, 7)));
  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category-wise totals calculation
  const categoryTotals = categories
    .map((cat) => {
      const catExpenses = filteredExpenses.filter((e) => e.categoryId === cat.id);
      const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        ...cat,
        total,
        count: catExpenses.length,
      };
    })
    .filter((cat) => cat.total > 0)
    .sort((a, b) => b.total - a.total);

  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-purple-700" />
            Daily Business Expenses
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage daily store, utility, and operating expenses with automatic Cash & Bank deduction
          </p>
        </div>

        <button
          onClick={onAddExpense}
          className="w-full sm:w-auto px-4 py-2.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add New Expense
        </button>
      </div>

      {/* Expense Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Today&apos;s Expense
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-600 mt-1 block">
              {formatCurrency(todayTotal, curr)}
            </span>
            <span className="text-[11px] text-slate-500">{todayExpenses.length} entries today</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              This Month&apos;s Expense
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
              {formatCurrency(thisMonthTotal, curr)}
            </span>
            <span className="text-[11px] text-slate-500">{thisMonthExpenses.length} entries this month</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-700">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Filtered Total
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-900 mt-1 block">
              {formatCurrency(filteredTotal, curr)}
            </span>
            <span className="text-[11px] text-slate-500">{filteredExpenses.length} matching entries</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-700">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description, category, or reference..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-hidden cursor-pointer"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-hidden cursor-pointer"
          >
            <option value="all">All Payment Methods</option>
            <option value="Cash">Cash Only</option>
            <option value="Bank">Bank Only</option>
          </select>
        </div>

        {/* Date Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-purple-700" /> Period:
          </span>
          {(['today', 'this_week', 'this_month', 'all', 'custom'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setDateFilter(period)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                dateFilter === period
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {period === 'today'
                ? 'Today'
                : period === 'this_week'
                ? 'This Week'
                : period === 'this_month'
                ? 'This Month'
                : period === 'all'
                ? 'All Time'
                : 'Custom'}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          {categoryTotals.length > 0 && (
            <button
              onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
              className="ml-auto px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-xs cursor-pointer transition-colors"
            >
              {showCategoryBreakdown ? 'Hide Category Totals ▲' : 'View Category Totals ▼'}
            </button>
          )}
        </div>

        {/* Category-wise Totals Panel */}
        {showCategoryBreakdown && categoryTotals.length > 0 && (
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 pt-3">
            <span className="text-[11px] font-bold text-purple-900 block mb-2 uppercase tracking-wider">
              Category-wise Expense Breakdown:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {categoryTotals.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                      : 'bg-white hover:bg-purple-100/60 text-slate-800 border-purple-200/70'
                  }`}
                >
                  <span className="font-semibold block truncate">{cat.name}</span>
                  <span className="font-black text-xs block mt-0.5">
                    {formatCurrency(cat.total, curr)}
                  </span>
                  <span className="text-[10px] opacity-75">{cat.count} items</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Paid Via</th>
                <th className="py-3 px-4">Ref #</th>
                <th className="py-3 px-4 text-right">Amount ({curr})</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No expenses found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchTerm ? 'Try adjusting your search or filters.' : 'Click "Add New Expense" to record daily business costs.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-800 font-medium">
                      {formatDate(exp.date)} {exp.time && <span className="text-slate-400 text-[10px]">· {exp.time}</span>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 font-bold text-[11px]">
                        {exp.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium max-w-xs truncate">
                      {exp.description || '—'}
                      {exp.notes && <span className="block text-[10px] text-slate-400 truncate">{exp.notes}</span>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exp.paymentMethod === 'Cash'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {exp.paymentMethod === 'Bank' ? `${exp.accountName || 'Bank'}` : 'Cash in Hand'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {exp.reference || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 text-sm whitespace-nowrap">
                      {formatCurrency(exp.amount, curr)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={5} className="py-3 px-4 text-right font-black uppercase text-xs">
                    Total Filtered Expenses:
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600 text-base font-black">
                    {formatCurrency(filteredTotal, curr)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {expenseToDelete && (
        <ConfirmModal
          isOpen={Boolean(expenseToDelete)}
          onClose={() => setExpenseToDelete(null)}
          onConfirm={() => {
            onDeleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }}
          title="Delete Business Expense?"
          message={`Are you sure you want to delete the expense "${expenseToDelete.categoryName}: ${formatCurrency(expenseToDelete.amount, curr)}"? This will automatically restore the ${expenseToDelete.paymentMethod} balance.`}
          confirmText="Yes, Delete Expense"
          isDestructive={true}
        />
      )}
    </div>
  );
};
