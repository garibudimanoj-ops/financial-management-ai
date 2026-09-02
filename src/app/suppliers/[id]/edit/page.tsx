import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializeSupplier } from '@/lib/serialize';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Truck, Save } from 'lucide-react';
import SupplierEditForm from '@/components/suppliers/SupplierEditForm';

interface SupplierEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierEditPage({ params }: SupplierEditPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();
  const canManage = hasPermission(context.role, 'SUPPLIER_UPDATE');

  if (!canManage) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto flex items-center justify-center">
        <div className="glass-card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
          <p className="text-gray-400">You do not have permission to edit suppliers.</p>
        </div>
      </div>
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  });

  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!supplier || supplier.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';
  const serializedSupplier = serializeSupplier(supplier);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-indigo-400" />
            Edit Supplier
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Update supplier details and account information
          </p>
        </div>
        <Link
          href={`/suppliers/${supplier.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-all text-white font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="glass-card p-6 md:p-8">
        <SupplierEditForm supplier={serializedSupplier} currency={currency} />
      </div>
    </div>
  );
}