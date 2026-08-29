'use client';

import { useState } from 'react';
import { adjustStockAction } from '@/actions/inventory';
import { SlidersHorizontal, X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface ProductOption {
  id: string;
  name: string;
  SKU: string;
  costPrice: string | number | null;
  stockQuantity: string | number | null;
  unit: string;
}

interface StockAdjustmentDialogProps {
  businessId: string;
  currency: string;
  products: ProductOption[];
  preselectedProductId?: string;
  triggerButton?: React.ReactNode;
}

export default function StockAdjustmentDialog({
  businessId,
  currency,
  products,
  preselectedProductId,
  triggerButton,
}: StockAdjustmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId || products[0]?.id || '');
  const [movementType, setMovementType] = useState<'ADJUSTMENT' | 'DAMAGE' | 'RETURN'>('ADJUSTMENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const productId = (formData.get('productId') as string) || selectedProductId;
    const rawQty = Number(formData.get('quantity'));
    const reason = formData.get('reason') as string;
    const reference = (formData.get('reference') as string) || undefined;

    // For DAMAGE, ensure positive quantity to reduce stock
    // For RETURN, positive quantity to increase stock
    // For ADJUSTMENT, signed quantity
    const quantity = movementType === 'DAMAGE' ? Math.abs(rawQty) : rawQty;

    try {
      await adjustStockAction(businessId, {
        productId,
        movementType,
        quantity,
        reason,
        reference,
      });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record adjustment');
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
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-lg transition-all"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Adjust Stock
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
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                Manual Stock Adjustment
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Record stock discrepancies, damaged goods, or inventory returns
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

              {/* Movement Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('ADJUSTMENT')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      movementType === 'ADJUSTMENT'
                        ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Count Adjustment
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('DAMAGE')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      movementType === 'DAMAGE'
                        ? 'bg-red-600/30 border-red-500/50 text-red-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Damage / Loss
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('RETURN')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      movementType === 'RETURN'
                        ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Stock Return
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  {movementType === 'ADJUSTMENT'
                    ? `Adjustment Quantity (+ / - ${selectedProduct?.unit || 'Units'}) *`
                    : `Quantity to ${movementType === 'DAMAGE' ? 'Deduct' : 'Add'} (${selectedProduct?.unit || 'Units'}) *`}
                </label>
                <input
                  name="quantity"
                  type="number"
                  step="1"
                  required
                  placeholder={movementType === 'ADJUSTMENT' ? '+5 or -3' : 'e.g. 2'}
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Current stock is {Number(selectedProduct?.stockQuantity || 0)} {selectedProduct?.unit || 'PCS'}. Stock cannot fall below 0.
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Reason for Adjustment *
                </label>
                <input
                  name="reason"
                  type="text"
                  required
                  placeholder="e.g. Physical inventory count correction, Broken packaging, Supplier return"
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Reference Note / Document #
                </label>
                <input
                  name="reference"
                  type="text"
                  placeholder="e.g. AUDIT-COUNT-2026-Q3"
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
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading ? 'Adjusting...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
