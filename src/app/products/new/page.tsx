import { requireBusinessContext, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/products/ProductForm';
import Link from 'next/link';
import { PackagePlus, ArrowLeft } from 'lucide-react';

export default async function NewProductPage() {
  const context = await requireBusinessContext();
  await requirePermission(context.businessId, 'PRODUCT_CREATE');

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  });

  const currency = business?.baseCurrency || 'INR';

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <PackagePlus className="w-8 h-8 text-indigo-400" />
            Add New Product
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Register a new SKU with pricing, tax classification, and barcode
          </p>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-all text-white font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Catalog
        </Link>
      </div>

      <div className="glass-card p-6 md:p-8">
        <ProductForm businessId={context.businessId} currency={currency} />
      </div>
    </div>
  );
}
