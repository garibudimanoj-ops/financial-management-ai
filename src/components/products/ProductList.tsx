'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, AlertTriangle, Archive, CheckCircle2, Eye, Edit3, ArrowUpDown, Package } from 'lucide-react';
import { archiveProduct, unarchiveProduct } from '@/actions/product';

interface ProductItem {
  id: string;
  name: string;
  description: string | null;
  SKU: string;
  barcode: string | null;
  category: string | null;
  unit: string;
  costPrice: string | number | null;
  sellingPrice: string | number | null;
  stockQuantity: string | number | null;
  lowStockThreshold: string | number | null;
  taxCategory: string;
  archived: boolean;
  createdAt: string | Date;
}

interface ProductListProps {
  businessId: string;
  currency: string;
  products: ProductItem[];
  canManage: boolean;
}

export default function ProductList({ businessId, currency, products, canManage }: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [taxFilter, setTaxFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search matching name, SKU, or barcode
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        p.name.toLowerCase().includes(query) ||
        p.SKU.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query));

      // Tax filter
      const matchesTax = taxFilter === 'ALL' || p.taxCategory === taxFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && !p.archived) ||
        (statusFilter === 'ARCHIVED' && p.archived);

      // Low stock filter
      const isLowStock = Number(p.stockQuantity) <= Number(p.lowStockThreshold);
      const matchesLowStock = !lowStockOnly || isLowStock;

      return matchesSearch && matchesTax && matchesStatus && matchesLowStock;
    });
  }, [products, searchQuery, taxFilter, statusFilter, lowStockOnly]);

  const handleToggleArchive = async (productId: string, currentlyArchived: boolean) => {
    setLoadingId(productId);
    try {
      if (currentlyArchived) {
        await unarchiveProduct(businessId, productId);
      } else {
        if (confirm('Are you sure you want to archive this product?')) {
          await archiveProduct(businessId, productId);
        }
      }
    } finally {
      setLoadingId(null);
    }
  };

  const uniqueTaxCategories = useMemo(() => {
    const set = new Set(products.map((p) => p.taxCategory));
    return Array.from(set);
  }, [products]);

  const currencySymbol = currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-6">
      {/* Controls and Search Bar */}
      <div className="glass-card p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, or barcode..."
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
            />
          </div>

          {/* Add Product Button */}
          {canManage && (
            <Link
              href="/products/new"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-gray-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ACTIVE" className="bg-gray-900 text-white">Active Only</option>
              <option value="ARCHIVED" className="bg-gray-900 text-white">Archived Only</option>
              <option value="ALL" className="bg-gray-900 text-white">All Products</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-gray-400 font-medium">Tax:</span>
            <select
              value={taxFilter}
              onChange={(e) => setTaxFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-gray-900 text-white">All Categories</option>
              {uniqueTaxCategories.map((tax) => (
                <option key={tax} value={tax} className="bg-gray-900 text-white">
                  {tax}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
              lowStockOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Alerts Only
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                <th className="py-3.5 px-4">Product / SKU</th>
                <th className="py-3.5 px-4">Barcode</th>
                <th className="py-3.5 px-4 text-right">Current Stock</th>
                <th className="py-3.5 px-4 text-right">Cost (Avg)</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4">Tax Category</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto text-gray-500 mb-2 opacity-50" />
                    <p className="font-medium text-gray-300">No products found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {searchQuery || lowStockOnly
                        ? 'Try adjusting your search filters'
                        : 'Get started by creating your first product'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stockNum = Number(p.stockQuantity);
                  const thresholdNum = Number(p.lowStockThreshold);
                  const isLow = stockNum <= thresholdNum;
                  const isZero = stockNum <= 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        p.archived ? 'opacity-50 bg-white/[0.01]' : ''
                      }`}
                    >
                      {/* Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          <Link
                            href={`/products/${p.id}`}
                            className="hover:text-indigo-400 transition-colors"
                          >
                            {p.name}
                          </Link>
                          {p.archived && (
                            <span className="ml-2 text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-medium">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 font-mono">
                          <span>SKU: {p.SKU}</span>
                          {p.category && (
                            <>
                              <span>•</span>
                              <span className="text-gray-400 font-sans">{p.category}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Barcode */}
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-400">
                        {p.barcode || '—'}
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-bold font-mono ${
                              isZero
                                ? 'text-red-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {Number(p.stockQuantity).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400">{p.unit}</span>
                        </div>
                        {isLow && !p.archived && (
                          <div className="text-[10px] text-amber-400/80 font-medium">
                            {isZero ? 'Out of stock' : `Low (≤ ${thresholdNum})`}
                          </div>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-gray-300">
                        {currencySymbol}
                        {Number(p.costPrice).toFixed(2)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                        {currencySymbol}
                        {Number(p.sellingPrice).toFixed(2)}
                      </td>

                      {/* Tax Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {p.taxCategory}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/products/${p.id}`}
                            title="View Details"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {canManage && (
                            <>
                              <Link
                                href={`/products/${p.id}/edit`}
                                title="Edit Product"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-indigo-300 transition-all"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Link>

                              <button
                                type="button"
                                disabled={loadingId === p.id}
                                onClick={() => handleToggleArchive(p.id, p.archived)}
                                title={p.archived ? 'Unarchive Product' : 'Archive Product'}
                                className={`p-1.5 rounded-lg transition-all ${
                                  p.archived
                                    ? 'text-emerald-400 hover:bg-emerald-500/10'
                                    : 'text-gray-400 hover:bg-red-500/10 hover:text-red-300'
                                }`}
                              >
                                {p.archived ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Archive className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
