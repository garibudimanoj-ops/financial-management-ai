import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getInventorySummary } from '@/lib/inventory/service';
import { serializeProduct } from '@/lib/serialize';
import StockInDialog from '@/components/inventory/StockInDialog';
import StockAdjustmentDialog from '@/components/inventory/StockAdjustmentDialog';
import MovementHistoryTable from '@/components/inventory/MovementHistoryTable';
import Link from 'next/link';
import {
  Boxes,
  Package,
  AlertTriangle,
  TrendingUp,
  History,
  ArrowLeft,
  ArrowRight,
  PackagePlus,
  SlidersHorizontal,
} from 'lucide-react';

export default async function InventoryPage() {
  const context = await requireBusinessContext();
  const isOwner = context.role === 'OWNER' || context.role === 'ADMIN';
  const canAdjust = hasPermission(context.role, 'INVENTORY_ADJUST');

  const [business, summary, allProducts] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    getInventorySummary(context.businessId),
    prisma.product.findMany({
      where: { businessId: context.businessId, archived: false },
      select: {
        id: true,
        name: true,
        SKU: true,
        costPrice: true,
        stockQuantity: true,
        lowStockThreshold: true,
        unit: true,
      },
      orderBy: { stockQuantity: 'asc' },
    }),
  ]);

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const productOptions = allProducts.map((p) => ({
    id: p.id,
    name: p.name,
    SKU: p.SKU,
    costPrice: p.costPrice.toString(),
    stockQuantity: p.stockQuantity.toString(),
    unit: p.unit,
  }));

  const lowStockProducts = allProducts.filter((p) =>
    p.stockQuantity.lessThanOrEqualTo(p.lowStockThreshold)
  );

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Boxes className="w-8 h-8 text-emerald-400" />
            Inventory & Stock Operations
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time stock valuation, incoming batch receipt, and movement tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/products"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <Package className="w-4 h-4 text-indigo-400" />
            Products Catalog
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <StockInDialog
            businessId={context.businessId}
            currency={currency}
            products={productOptions}
          />

          {canAdjust && (
            <StockAdjustmentDialog
              businessId={context.businessId}
              currency={currency}
              products={productOptions}
            />
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active SKUs */}
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Active Catalog SKUs</span>
          <p className="text-3xl font-extrabold text-white font-mono">
            {summary.totalProducts}
          </p>
          <span className="text-[11px] text-gray-500 block">Catalog items in rotation</span>
        </div>

        {/* Total Units in Stock */}
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Physical Units</span>
          <p className="text-3xl font-extrabold text-indigo-400 font-mono">
            {Number(summary.totalUnits).toLocaleString()}
          </p>
          <span className="text-[11px] text-gray-500 block">Combined inventory quantity</span>
        </div>

        {/* Inventory Valuation */}
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">
            {isOwner ? 'Holding Valuation (Cost)' : 'Operational Status'}
          </span>
          {isOwner ? (
            <>
              <p className="text-3xl font-extrabold text-emerald-400 font-mono">
                {currencySymbol}
                {Number(summary.totalValuation).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <span className="text-[11px] text-gray-500 block">
                Weighted-average cost valuation
              </span>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-white mt-1">Active</p>
              <span className="text-[11px] text-gray-500 block">Staff operational mode</span>
            </>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Low Stock Alerts
            {summary.lowStockCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </span>
          <p
            className={`text-3xl font-extrabold font-mono ${
              summary.lowStockCount > 0 ? 'text-amber-400' : 'text-gray-300'
            }`}
          >
            {summary.lowStockCount}
          </p>
          <span className="text-[11px] text-gray-500 block">
            {summary.lowStockCount > 0 ? 'SKUs need replenishment' : 'All stock levels healthy'}
          </span>
        </div>
      </div>

      {/* Low-Stock Attention Grid (If Any) */}
      {lowStockProducts.length > 0 && (
        <div className="glass-card p-6 space-y-4 border-amber-500/20 bg-amber-500/[0.02]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Stock Replenishment Needed ({lowStockProducts.length})
            </h2>
            <span className="text-xs text-gray-400 font-mono">Items at or below reorder threshold</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-sm"
              >
                <div>
                  <Link
                    href={`/products/${item.id}`}
                    className="font-semibold text-white hover:text-indigo-400 transition-colors"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-gray-400 font-mono">SKU: {item.SKU}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-400 font-mono">
                    {Number(item.stockQuantity)} {item.unit}
                  </span>
                  <span className="text-[10px] text-gray-500 block">
                    (Limit: {Number(item.lowStockThreshold)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Movements Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Recent Stock Movements
          </h2>

          <Link
            href="/inventory/movements"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View Complete Movement Ledger
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <MovementHistoryTable
          movements={summary.recentMovements}
          currency={currency}
        />
      </div>
    </div>
  );
}
