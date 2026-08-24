'use client';

import { useState } from 'react';
import { addStockAction } from '@/actions/inventory';
import { Plus, X, PackagePlus, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductOption {
  id: string;
  name: string;
  SKU: string;
  costPrice: string | number;
  stockQuantity: string | number;
  unit: string;
}

interface StockInDialogProps {
  businessId: string;
  currency: string;
  products: ProductOption[];
  preselectedProductId?: string;
  triggerButton?: React.ReactNode;
}

export default function StockInDialog({
  businessId,
  currency,
  products,
  preselectedProductId,
  triggerButton,
}: StockInDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId || products[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const productId = (formData.get('productId') as string) || selectedProductId;
    const quantity = Number(formData.get('quantity'));
    const unitCost = Number(formData.get('unitCost'));
    const batchNumber = (formData.get('batchNumber') as string) || undefined;
    const expiryDate = (formData.get('expiryDate') as string) || undefined;
    const reference = (formData.get('reference') as string) || undefined;
    const reason = (formData.get('reason') as string) || 'Stock-in purchase / batch received';

    try {
      await addStockAction(businessId, {
        productId,
        quantity,
        unitCost,
        batchNumber,
        expiryDate,
        reference,
        reason,
      });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record stock addition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg transition-all"
        >
          <PackagePlus className="w-4 h-4" />
          Receive Stock
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-lg p-6 md:p-8 space-y-6 relative border border-white/20 shadow-2xl bg-[#0f111a]">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-400" />
                Receive New Stock Batch
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Incoming stock automatically recalculates weighted-average cost price
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Select Product *
                </label>
                <select
                  name="productId"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                      {p.name} (SKU: {p.SKU}) — Current Stock: {Number(p.stockQuantity)} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Quantity ({selectedProduct?.unit || 'PCS'}) *
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="e.g. 50"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Unit Cost */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Unit Cost ({currencySymbol}) *
                  </label>
                  <input
                    name="unitCost"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={selectedProduct ? Number(selectedProduct.costPrice).toFixed(2) : '0.00'}
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Batch Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Batch Number
                  </label>
                  <input
                    name="batchNumber"
                    type="text"
                    placeholder="e.g. BATCH-2026-08"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    name="expiryDate"
                    type="date"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Reference / Invoice # */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Supplier / Purchase Reference #
                </label>
                <input
                  name="reference"
                  type="text"
                  placeholder="e.g. PO-9821 / Supplier Invoice #1024"
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading ? 'Receiving...' : 'Confirm Stock-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
