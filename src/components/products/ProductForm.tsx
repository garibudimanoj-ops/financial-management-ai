'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct } from '@/actions/product';
import Link from 'next/link';
import { Package, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductFormProps {
  businessId: string;
  currency: string;
  product?: {
    id: string;
    name: string;
    description: string | null;
    SKU: string;
    barcode: string | null;
    category: string | null;
    unit: string;
    costPrice: string | number;
    sellingPrice: string | number;
    stockQuantity: string | number;
    lowStockThreshold: string | number;
    taxCategory: string;
  };
}

export default function ProductForm({ businessId, currency, product }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!product;
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || null;
    const SKU = (formData.get('SKU') as string).toUpperCase().trim();
    const barcode = (formData.get('barcode') as string) || null;
    const category = (formData.get('category') as string) || null;
    const unit = (formData.get('unit') as string) || 'PCS';
    const sellingPrice = Number(formData.get('sellingPrice'));
    const lowStockThreshold = Number(formData.get('lowStockThreshold'));
    const taxCategory = formData.get('taxCategory') as string;

    try {
      if (isEdit) {
        await updateProduct(businessId, product.id, {
          name,
          description,
          SKU,
          barcode,
          category,
          unit,
          sellingPrice,
          lowStockThreshold,
          taxCategory,
        });
        router.push(`/products/${product.id}`);
      } else {
        const costPrice = Number(formData.get('costPrice') || 0);
        const initialStock = Number(formData.get('initialStock') || 0);

        const newProd = await createProduct(businessId, {
          name,
          description,
          SKU,
          barcode,
          category,
          unit,
          costPrice,
          sellingPrice,
          lowStockThreshold,
          taxCategory,
          initialStock,
        });
        router.push(`/products/${newProd.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {isEdit && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
          <span className="font-semibold">Accounting Note:</span> Cost price and stock quantity are maintained exclusively via authoritative stock movements and cannot be overwritten manually. Use the stock adjustment tools to record adjustments or new purchases.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Product Name *
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={product?.name || ''}
            placeholder="e.g. Wireless Mouse M185"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm"
          />
        </div>

        {/* SKU */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            SKU (Stock Keeping Unit) *
          </label>
          <input
            name="SKU"
            type="text"
            required
            defaultValue={product?.SKU || ''}
            placeholder="e.g. ELEC-MOU-001"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono uppercase"
          />
        </div>

        {/* Barcode */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Barcode / UPC / EAN
          </label>
          <input
            name="barcode"
            type="text"
            defaultValue={product?.barcode || ''}
            placeholder="e.g. 8901030882102"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Category
          </label>
          <input
            name="category"
            type="text"
            defaultValue={product?.category || ''}
            placeholder="e.g. Electronics, Hardware, Groceries"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm"
          />
        </div>

        {/* Unit */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Measurement Unit *
          </label>
          <select
            name="unit"
            defaultValue={product?.unit || 'PCS'}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm appearance-none cursor-pointer"
          >
            <option value="PCS" className="bg-gray-900 text-white">Pieces (PCS)</option>
            <option value="KG" className="bg-gray-900 text-white">Kilograms (KG)</option>
            <option value="GRAM" className="bg-gray-900 text-white">Grams (G)</option>
            <option value="LITER" className="bg-gray-900 text-white">Liters (L)</option>
            <option value="METER" className="bg-gray-900 text-white">Meters (M)</option>
            <option value="BOX" className="bg-gray-900 text-white">Boxes (BOX)</option>
            <option value="DOZEN" className="bg-gray-900 text-white">Dozens (DOZ)</option>
          </select>
        </div>

        {/* Cost Price (Only on creation) */}
        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Initial Cost Price ({currencySymbol}) *
            </label>
            <input
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue="0.00"
              className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono"
            />
          </div>
        )}

        {/* Selling Price */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Selling Price ({currencySymbol}) *
          </label>
          <input
            name="sellingPrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product ? Number(product.sellingPrice).toFixed(2) : '0.00'}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono"
          />
        </div>

        {/* Initial Stock (Only on creation) */}
        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Initial Stock Quantity
            </label>
            <input
              name="initialStock"
              type="number"
              step="1"
              min="0"
              defaultValue="0"
              placeholder="0"
              className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono"
            />
          </div>
        )}

        {/* Low Stock Alert Threshold */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Low Stock Threshold *
          </label>
          <input
            name="lowStockThreshold"
            type="number"
            step="1"
            min="0"
            required
            defaultValue={product ? Number(product.lowStockThreshold) : 10}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono"
          />
        </div>

        {/* Tax Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Tax Category (GST / VAT) *
          </label>
          <select
            name="taxCategory"
            defaultValue={product?.taxCategory || 'GST_18'}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm appearance-none cursor-pointer"
          >
            <option value="STANDARD" className="bg-gray-900 text-white">STANDARD (18%)</option>
            <option value="GST_18" className="bg-gray-900 text-white">GST 18% (Standard Goods)</option>
            <option value="GST_12" className="bg-gray-900 text-white">GST 12% (Processed / Apparel)</option>
            <option value="GST_5" className="bg-gray-900 text-white">GST 5% (Essential Goods)</option>
            <option value="GST_28" className="bg-gray-900 text-white">GST 28% (Luxury / De-merit)</option>
            <option value="EXEMPT" className="bg-gray-900 text-white">EXEMPT / NIL Rated (0%)</option>
          </select>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={product?.description || ''}
            placeholder="Product specifications, notes, supplier references..."
            className="w-full glass-input px-4 py-3 rounded-xl text-sm resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <Link
          href={isEdit ? `/products/${product.id}` : '/products'}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
