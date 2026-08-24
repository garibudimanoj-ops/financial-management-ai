import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import ProductList from '@/components/products/ProductList';
import Link from 'next/link';
import { Package, Boxes, ArrowLeft } from 'lucide-react';

export default async function ProductsPage() {
  const context = await requireBusinessContext();
  const canManage = hasPermission(context.role, 'PRODUCT_CREATE');

  const [business, products] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    prisma.product.findMany({
      where: { businessId: context.businessId },
      orderBy: [{ archived: 'asc' }, { updatedAt: 'desc' }],
    }),
  ]);

  const currency = business?.baseCurrency || 'INR';

  // Format Decimal values for client components
  const formattedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    SKU: p.SKU,
    barcode: p.barcode,
    category: p.category,
    unit: p.unit,
    costPrice: p.costPrice.toString(),
    sellingPrice: p.sellingPrice.toString(),
    stockQuantity: p.stockQuantity.toString(),
    lowStockThreshold: p.lowStockThreshold.toString(),
    taxCategory: p.taxCategory,
    archived: p.archived,
    createdAt: p.createdAt,
  }));

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-indigo-400" />
            Product Catalog
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your SKU catalog, pricing, barcodes, and stock levels
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <Boxes className="w-4 h-4 text-emerald-400" />
            Inventory Hub
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>

      {/* Main Product List */}
      <ProductList
        businessId={context.businessId}
        currency={currency}
        products={formattedProducts}
        canManage={canManage}
      />
    </div>
  );
}
