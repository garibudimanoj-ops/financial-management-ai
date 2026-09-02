'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPurchaseBillAction } from '@/actions/purchase';
import { Plus, X, AlertCircle, CheckCircle2, Trash2, PackagePlus, FileText } from 'lucide-react';

interface SupplierOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  SKU: string;
  costPrice: string | number;
  stockQuantity: string | number;
  unit: string;
  taxCategory: string;
}

interface PurchaseItem {
  productId: string | null;
  productName: string;
  sku: string | null;
  unit: string;
  quantity: number;
  unitCost: number;
  discount: number;
  taxRate: number;
}

interface PurchaseBillFormModalProps {
  businessId: string;
  suppliers: SupplierOption[];
  products: ProductOption[];
  currency: string;
}

export default function PurchaseBillFormModal({ businessId, suppliers, products, currency }: PurchaseBillFormModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'RECEIVED'>('RECEIVED');
  const [items, setItems] = useState<PurchaseItem[]>([{ productId: null, productName: '', sku: null, unit: 'PCS', quantity: 1, unitCost: 0, discount: 0, taxRate: 0 }]);
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0), [items]);

  const totalDiscount = useMemo(() =>
    items.reduce((sum, item) => sum + item.discount, 0), [items]);

  const taxableAmount = useMemo(() => subtotal - totalDiscount, [subtotal, totalDiscount]);

  const taxAmount = useMemo(() =>
    items.reduce((sum, item) => sum + ((item.quantity * item.unitCost - item.discount) * (item.taxRate / 100)), 0), [items]);

  const totalAmount = useMemo(() => taxableAmount + taxAmount, [taxableAmount, taxAmount]);

  const handleAddItem = () => {
    setItems([...items, { productId: null, productName: '', sku: null, unit: 'PCS', quantity: 1, unitCost: 0, discount: 0, taxRate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      handleItemChange(index, 'productId', productId);
      handleItemChange(index, 'productName', product.name);
      handleItemChange(index, 'sku', product.SKU);
      handleItemChange(index, 'unit', product.unit);
      handleItemChange(index, 'unitCost', Number(product.costPrice) || 0);
      const taxCategory = product.taxCategory;
      if (taxCategory === 'GST_5') handleItemChange(index, 'taxRate', 5);
      else if (taxCategory === 'GST_12') handleItemChange(index, 'taxRate', 12);
      else if (taxCategory === 'GST_28') handleItemChange(index, 'taxRate', 28);
      else if (taxCategory === 'EXEMPT' || taxCategory === 'NIL') handleItemChange(index, 'taxRate', 0);
      else handleItemChange(index, 'taxRate', 18);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const validItems = items.filter(item => item.productName.trim() !== '' && item.quantity > 0 && item.unitCost >= 0);
    if (validItems.length === 0) {
      setError('At least one valid item is required');
      setLoading(false);
      return;
    }

    try {
      await createPurchaseBillAction(businessId, {
        supplierId: selectedSupplierId,
        supplierInvoiceNumber: supplierInvoiceNumber || null,
        billDate: billDate || null,
        dueDate: dueDate || null,
        items: validItems,
        notes: notes || null,
        status,
      });
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase bill');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSupplierId('');
    setSupplierInvoiceNumber('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setNotes('');
    setStatus('RECEIVED');
    setItems([{ productId: null, productName: '', sku: null, unit: 'PCS', quantity: 1, unitCost: 0, discount: 0, taxRate: 0 }]);
    setError(null);
  };

  return (
    <>
      <button
        onClick={() => { resetForm(); setOpen(true); }}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
      >
        <PackagePlus className="w-4 h-4" />
        New Purchase Bill
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-4xl p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white">Create Purchase Bill</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier & Bill Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-white/10 pb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Supplier *
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-gray-900 text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Supplier Invoice # / Reference
                  </label>
                  <input
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                    placeholder="e.g. SUP-INV-2024-001"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    required
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Line Items
                  </h3>
                  <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 transition-all text-white">
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="glass-card p-4 space-y-3 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Item {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length <= 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Product / Description *
                      </label>
                      <select
                        value={item.productId || ''}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="w-full glass-input px-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Select Product (or type custom)</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                            {p.name} (SKU: {p.SKU}) - {currencySymbol}{Number(p.costPrice).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Product Name / Description *
                        </label>
                        <input
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          placeholder="Custom item description"
                          className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          SKU
                        </label>
                        <input
                          value={item.sku || ''}
                          onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                          placeholder="SKU"
                          className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Unit
                        </label>
                        <input
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          placeholder="PCS"
                          className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono text-right"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Unit Cost ({currencySymbol}) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(index, 'unitCost', Number(e.target.value))}
                          className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono text-right"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Line Discount ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))}
                          className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono text-right"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))}
                          className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono text-right"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Line Subtotal</span>
                          <span className="font-mono font-bold text-white">{currencySymbol}{(item.quantity * item.unitCost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Discount</span>
                          <span className="font-mono text-red-300">{currencySymbol}{item.discount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tax ({item.taxRate}%)</span>
                          <span className="font-mono text-amber-300">{currencySymbol}{((item.quantity * item.unitCost - item.discount) * (item.taxRate / 100)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Line Total</span>
                          <span className="font-mono font-bold text-white">{currencySymbol}{((item.quantity * item.unitCost - item.discount) * (1 + item.taxRate / 100)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill Totals */}
              <div className="border-t border-white/10 pt-4 space-y-3 bg-white/[0.02] p-4 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Subtotal</span>
                      <span className="font-mono">{currencySymbol}{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Discount</span>
                      <span className="font-mono text-red-300">-{currencySymbol}{totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Taxable Amount</span>
                      <span className="font-mono">{currencySymbol}{taxableAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Tax</span>
                      <span className="font-mono text-amber-300">{currencySymbol}{taxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                      <span>Total Amount</span>
                      <span className="font-mono">{currencySymbol}{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>GST Input Tax Credit (ITC)</span>
                      <span className="font-mono text-emerald-400">{currencySymbol}{taxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Bill Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'RECEIVED')}
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
                  >
                    <option value="DRAFT">Draft (no inventory/GL impact)</option>
                    <option value="RECEIVED">Received (updates inventory, AP, GL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Additional notes..."
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading ? 'Creating...' : 'Create Purchase Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
