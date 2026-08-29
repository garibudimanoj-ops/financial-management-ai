import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializeProduct, serializeCustomer } from '@/lib/serialize';
import POSTerminal from '@/components/pos/POSTerminal';

export default async function POSPage() {
  const context = await requireBusinessContext();
  const canManage = hasPermission(context.role, 'SALE_CREATE');

  if (!canManage) {
    return (
      <div className="min-h-screen p-6 max-w-7xl mx-auto flex items-center justify-center">
        <div className="glass-card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
          <p className="text-gray-400">You do not have permission to access the POS terminal.</p>
        </div>
      </div>
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true, name: true },
  });

  const products = await prisma.product.findMany({
    where: { businessId: context.businessId, archived: false },
    orderBy: { name: 'asc' },
  });

  const customers = await prisma.customer.findMany({
    where: { businessId: context.businessId, archived: false },
    orderBy: { name: 'asc' },
  });

  const serializedProducts = products.map(serializeProduct);
  const serializedCustomers = customers.map(serializeCustomer);

  return (
    <POSTerminal
      businessId={context.businessId}
      businessName={business?.name || 'POS'}
      currency={business?.baseCurrency || 'INR'}
      products={serializedProducts as any}
      customers={serializedCustomers as any}
    />
  );
}
