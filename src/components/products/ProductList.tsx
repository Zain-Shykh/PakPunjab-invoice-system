import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Boxes,
  Barcode,
  Tag,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { CompanySettings, Product, ProductUnit } from '../../types';
import { formatCurrency, generateId } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';

interface ProductListProps {
  products: Product[];
  company: CompanySettings;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  company,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const curr = company.currency || 'Rs.';
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('Piece');
  const [saleRate, setSaleRate] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [showOnInvoice, setShowOnInvoice] = useState<boolean>(true);

  const openAddModal = () => {
    setProductToEdit(null);
    setName('');
    setCode('');
    setBarcode('');
    setCategory('');
    setUnit('Piece');
    setSaleRate(0);
    setStockQuantity(0);
    setShowOnInvoice(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setProductToEdit(p);
    setName(p.name);
    setCode(p.code || '');
    setBarcode(p.barcode || '');
    setCategory(p.category || '');
    setUnit(p.unit);
    setSaleRate(p.saleRate);
    setStockQuantity(p.stockQuantity || 0);
    setShowOnInvoice(p.showOnInvoice !== false);
    setIsModalOpen(true);
  };

  const handleToggleVisibility = (p: Product) => {
    const updated: Product = {
      ...p,
      showOnInvoice: p.showOnInvoice === false ? true : false,
      updatedAt: new Date().toISOString(),
    };
    onSaveProduct(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const productData: Product = {
      id: productToEdit?.id || generateId('prod'),
      name: name.trim(),
      code: code.trim(),
      barcode: barcode.trim(),
      category: category.trim(),
      unit,
      saleRate: Number(saleRate) || 0,
      stockQuantity: Number(stockQuantity) || 0,
      active: true,
      showOnInvoice,
      createdAt: productToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(productData);
    setIsModalOpen(false);
  };

  const visibleCount = products.filter((p) => p.showOnInvoice !== false).length;
  const hiddenCount = products.filter((p) => p.showOnInvoice === false).length;

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(term) ||
      (p.code && p.code.toLowerCase().includes(term)) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (visibilityFilter === 'visible') return p.showOnInvoice !== false;
    if (visibilityFilter === 'hidden') return p.showOnInvoice === false;

    return true;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-700" />
            Products & Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {products.length} products · Speed up invoice creation with preset rates
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> + Add New Product
        </button>
      </div>

      {/* Search Bar & Filter Options */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name, code, barcode, category..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-600 mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setVisibilityFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              visibilityFilter === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setVisibilityFilter('visible')}
            className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              visibilityFilter === 'visible'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Visible on Invoice ({visibleCount})
          </button>
          <button
            type="button"
            onClick={() => setVisibilityFilter('hidden')}
            className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              visibilityFilter === 'hidden'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            Hidden from Invoice ({hiddenCount})
          </button>
        </div>
      </div>

      {/* Product List Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || visibilityFilter !== 'all'
              ? 'No products matched your search or visibility filter.'
              : 'Add your product catalog to quickly populate items during sales billing.'}
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
          >
            + Add First Product
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-right">Sale Rate ({curr})</th>
                  {company.inventoryEnabled && (
                    <th className="py-3 px-3 text-center">Current Stock</th>
                  )}
                  <th className="py-3 px-3 text-center">Invoice Visibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isVisibleOnInvoice = p.showOnInvoice !== false;
                  return (
                    <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{p.name}</div>
                        {(p.code || p.barcode) && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.code && <span className="mr-2">Code: {p.code}</span>}
                            {p.barcode && <span>Bar: {p.barcode}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.category ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-medium">
                            {p.category}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.unit}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(p.saleRate, curr)}
                      </td>
                      {company.inventoryEnabled && (
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              p.stockQuantity <= 5
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.stockQuantity} {p.unit}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            isVisibleOnInvoice
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                          title={
                            isVisibleOnInvoice
                              ? 'Click to Hide from Customer Invoices'
                              : 'Click to Show on Customer Invoices'
                          }
                        >
                          {isVisibleOnInvoice ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Show on Invoice</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                              <span>Hidden from Invoice</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={productToEdit ? 'Edit Product' : 'Add New Product'}
        subtitle="Specify product rates, units and stock quantities"
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lawn Embroidered Suit"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CF-100"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Textiles"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm outline-hidden cursor-pointer"
              >
                <option value="Piece">Piece</option>
                <option value="Dozen">Dozen</option>
                <option value="Box">Box</option>
                <option value="Kg">Kg</option>
                <option value="Liter">Liter</option>
                <option value="Meter">Meter</option>
                <option value="Packet">Packet</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sale Rate ({curr}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={saleRate || ''}
                onChange={(e) => setSaleRate(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
          </div>

          {company.inventoryEnabled && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                step="any"
                value={stockQuantity || ''}
                onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-hidden"
              />
            </div>
          )}

          {/* Invoice Visibility Setting (Show / Hide from Customer Invoice) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showOnInvoice ? (
                  <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    Show on Customer Invoice
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {showOnInvoice
                      ? 'Visible on printed invoices, PDFs & thermal receipts'
                      : 'Hidden from customer invoice documents (calculated internally)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOnInvoice(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    showOnInvoice
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👁 Show
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnInvoice(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !showOnInvoice
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🚫 Hide
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-1.5">
              💡 <strong>Important:</strong> When hidden, this product will NOT appear on the customer invoice, PDF, thermal receipts, or WhatsApp shares. It remains 100% active in inventory, stock, purchases, sales, and ledger calculations.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              {productToEdit ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {productToDelete && (
        <ConfirmModal
          isOpen={Boolean(productToDelete)}
          onClose={() => setProductToDelete(null)}
          onConfirm={() => {
            if (productToDelete) {
              onDeleteProduct(productToDelete.id);
              setProductToDelete(null);
            }
          }}
          title={`Delete Product: ${productToDelete.name}?`}
          message="Are you sure you want to delete this product? Existing invoices with this product will remain intact."
          confirmText="Yes, Delete Product"
          isDestructive={true}
        />
      )}
    </div>
  );
};
