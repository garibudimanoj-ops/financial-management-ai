import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import ProductList from '@/components/products/ProductList';
import Link from 'next/link';
import { Package, Boxes, Plus } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

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
  const formattedProducts = products.map(serializeProduct);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Product & SKU Catalog"
        subtitle="Manage product pricing, barcodes, taxation rates, and inventory thresholds"
        icon={<Package className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/inventory">
              <Button variant="secondary" size="sm" icon={<Boxes className="w-4 h-4" />}>
                Warehouse Stock
              </Button>
            </Link>
            {canManage && (
              <Link href="/products/new">
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Add Product
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <ProductList
        businessId={context.businessId}
        currency={currency}
        products={formattedProducts}
        canManage={canManage}
      />
    </div>
  );
}
