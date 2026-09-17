import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getInventorySummary } from '@/lib/inventory/service';
import StockInDialog from '@/components/inventory/StockInDialog';
import StockAdjustmentDialog from '@/components/inventory/StockAdjustmentDialog';
import MovementHistoryTable from '@/components/inventory/MovementHistoryTable';
import Link from 'next/link';
import {
  Boxes,
  Package,
  AlertTriangle,
  History,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

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
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

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
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <PageHeader
        title="Inventory & Warehouse"
        subtitle="Real-time stock valuation, batch receipts, and movement ledgers"
        icon={<Boxes className="w-5 h-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/products">
              <Button variant="secondary" size="sm" icon={<Package className="w-4 h-4" />}>
                Catalog
              </Button>
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
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Active SKUs"
          value={summary.totalProducts}
          description="Catalog items in rotation"
          icon={<Package className="w-5 h-5" />}
          iconBg="bg-slate-800 text-slate-300 border-slate-700"
        />

        <MetricCard
          title="Physical Units"
          value={Number(summary.totalUnits).toLocaleString()}
          description="Combined stock inventory"
          icon={<Boxes className="w-5 h-5" />}
          iconBg="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
        />

        <MetricCard
          title={isOwner ? 'Holding Valuation' : 'Inventory State'}
          value={
            isOwner
              ? `${currencySymbol}${Number(summary.totalValuation).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : 'Active'
          }
          description="Weighted-average cost"
          trend={{ value: 'Asset Value', isPositive: true }}
          icon={<Boxes className="w-5 h-5" />}
          iconBg="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        />

        <MetricCard
          title="Low Stock Alerts"
          value={summary.lowStockCount}
          description={
            summary.lowStockCount > 0
              ? 'Replenishment needed'
              : 'All inventory healthy'
          }
          trend={{
            value: summary.lowStockCount > 0 ? 'Action Needed' : 'Normal',
            isPositive: summary.lowStockCount === 0,
          }}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBg={
            summary.lowStockCount > 0
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }
        />
      </div>

      {/* Low-Stock Attention Grid */}
      {lowStockProducts.length > 0 && (
        <Card className="p-5 sm:p-6 border-amber-500/30 bg-amber-950/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Stock Replenishment Needed ({lowStockProducts.length} SKUs)
            </h3>
            <span className="text-xs text-slate-400 font-mono">Safety stock threshold breached</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex justify-between items-center text-xs"
              >
                <div className="space-y-0.5 overflow-hidden pr-2">
                  <Link
                    href={`/products/${item.id}`}
                    className="font-semibold text-slate-200 hover:text-indigo-400 transition-colors truncate block"
                  >
                    {item.name}
                  </Link>
                  <p className="text-[10px] text-slate-400 font-mono">SKU: {item.SKU}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-amber-300 font-mono">
                    {Number(item.stockQuantity)} {item.unit}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    (min {Number(item.lowStockThreshold)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Movements Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Recent Stock Movements
          </h2>

          <Link
            href="/inventory/movements"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View Full Ledger
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
