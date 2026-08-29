import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeInventoryMovement } from '@/lib/serialize';
import StockInDialog from '@/components/inventory/StockInDialog';
import StockAdjustmentDialog from '@/components/inventory/StockAdjustmentDialog';
import MovementHistoryTable from '@/components/inventory/MovementHistoryTable';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Package,
  ArrowLeft,
  Edit3,
  Boxes,
  TrendingUp,
  Tag,
  AlertTriangle,
  History,
  Layers,
} from 'lucide-react';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();
  const canManage = hasPermission(context.role, 'PRODUCT_UPDATE');
  const canAdjust = hasPermission(context.role, 'INVENTORY_ADJUST');
  const isOwner = context.role === 'OWNER' || context.role === 'ADMIN';

  const [business, product] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    prisma.product.findUnique({
      where: { id },
      include: {
        batches: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            createdBy: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    }),
  ]);

  if (!product || product.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const stockNum = Number(product.stockQuantity);
  const costNum = Number(product.costPrice);
  const sellNum = Number(product.sellingPrice);
  const thresholdNum = Number(product.lowStockThreshold);
  const isLowStock = stockNum <= thresholdNum;
  const valuation = stockNum * costNum;
  const margin = sellNum > 0 ? ((sellNum - costNum) / sellNum) * 100 : 0;

  const productOption = [
    {
      id: product.id,
      name: product.name,
      SKU: product.SKU,
      costPrice: product.costPrice.toString(),
      stockQuantity: product.stockQuantity.toString(),
      unit: product.unit,
    },
  ];

  const serializedMovements = product.movements.map(serializeInventoryMovement);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">{product.name}</h1>
            {product.archived && (
              <span className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded-full font-semibold border border-red-500/30">
                Archived
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            SKU: <span className="text-indigo-400 font-semibold">{product.SKU}</span>
            {product.barcode && (
              <>
                <span className="mx-2 text-gray-600">•</span>
                Barcode: <span className="text-gray-300">{product.barcode}</span>
              </>
            )}
            {product.category && (
              <>
                <span className="mx-2 text-gray-600">•</span>
                Category: <span className="text-gray-300 font-sans">{product.category}</span>
              </>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/products"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Catalog
          </Link>

          {canManage && (
            <Link
              href={`/products/${product.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-white"
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              Edit
            </Link>
          )}

          <StockInDialog
            businessId={context.businessId}
            currency={currency}
            products={productOption}
            preselectedProductId={product.id}
          />

          {canAdjust && (
            <StockAdjustmentDialog
              businessId={context.businessId}
              currency={currency}
              products={productOption}
              preselectedProductId={product.id}
            />
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Stock */}
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Current Stock Level
            {isLowStock && (
              <span className="text-amber-400 flex items-center gap-1 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Low
              </span>
            )}
          </span>
          <p className="text-3xl font-extrabold text-white font-mono">
            {stockNum.toLocaleString()}{' '}
            <span className="text-sm font-normal text-gray-400">{product.unit}</span>
          </p>
          <span className="text-[11px] text-gray-500 block">
            Threshold: {thresholdNum} {product.unit}
          </span>
        </div>

        {/* Unit Cost (Weighted Avg) */}
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Weighted-Average Cost</span>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">
            {currencySymbol}
            {costNum.toFixed(2)}
          </p>
          <span className="text-[11px] text-gray-500 block">Calculated on incoming batches</span>
        </div>

        {/* Selling Price */}
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Selling Price (Excl. Tax)</span>
          <p className="text-3xl font-extrabold text-indigo-400 font-mono">
            {currencySymbol}
            {sellNum.toFixed(2)}
          </p>
          <span className="text-[11px] text-gray-500 block">Tax Category: {product.taxCategory}</span>
        </div>

        {/* Inventory Valuation / Margin */}
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">
            {isOwner ? 'Holding Valuation' : 'Tax Classification'}
          </span>
          {isOwner ? (
            <>
              <p className="text-3xl font-extrabold text-purple-400 font-mono">
                {currencySymbol}
                {valuation.toFixed(2)}
              </p>
              <span className="text-[11px] text-gray-500 block">
                Gross Margin: {margin.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-white mt-1">{product.taxCategory}</p>
              <span className="text-[11px] text-gray-500 block">Operational Access</span>
            </>
          )}
        </div>
      </div>

      {/* Description & Metadata Card */}
      {product.description && (
        <div className="glass-card p-6 space-y-2">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Product Notes</h2>
          <p className="text-sm text-gray-300 leading-relaxed">{product.description}</p>
        </div>
      )}

      {/* Recent Batches & Movements Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Inventory Movement History
          </h2>
          <span className="text-xs text-gray-400 font-mono">Showing latest 15 movements</span>
        </div>

        <MovementHistoryTable
          movements={serializedMovements}
          currency={currency}
          hideProductColumn
        />
      </div>
    </div>
  );
}
