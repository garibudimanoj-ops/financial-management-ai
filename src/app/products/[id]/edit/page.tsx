import { requireBusinessContext, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/products/ProductForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Edit3, ArrowLeft } from 'lucide-react';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();
  await requirePermission(context.businessId, 'PRODUCT_UPDATE');

  const [business, product] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    prisma.product.findUnique({
      where: { id },
    }),
  ]);

  if (!product || product.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Edit3 className="w-8 h-8 text-indigo-400" />
            Edit Product Details
          </h1>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            Editing SKU: <span className="text-white font-semibold">{product.SKU}</span>
          </p>
        </div>
        <Link
          href={`/products/${product.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-all text-white font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Product Details
        </Link>
      </div>

      <div className="glass-card p-6 md:p-8">
        <ProductForm
          businessId={context.businessId}
          currency={currency}
          product={{
            id: product.id,
            name: product.name,
            description: product.description,
            SKU: product.SKU,
            barcode: product.barcode,
            category: product.category,
            unit: product.unit,
            costPrice: product.costPrice.toString(),
            sellingPrice: product.sellingPrice.toString(),
            stockQuantity: product.stockQuantity.toString(),
            lowStockThreshold: product.lowStockThreshold.toString(),
            taxCategory: product.taxCategory,
          }}
        />
      </div>
    </div>
  );
}
