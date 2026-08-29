import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeCustomer } from '@/lib/serialize';
import CustomerList from '@/components/customers/CustomerList';
import Link from 'next/link';
import { Users, ArrowLeft, Plus } from 'lucide-react';

export default async function CustomersPage() {
  const context = await requireBusinessContext();
  const canManage = hasPermission(context.role, 'CUSTOMER_CREATE');

  const [business, customers] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    prisma.customer.findMany({
      where: { businessId: context.businessId },
      orderBy: [{ archived: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const currency = business?.baseCurrency || 'INR';

  const formattedCustomers = customers.map(serializeCustomer);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-400" />
            Customer Accounts & Ledger
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage client profiles, outstanding receivables, and transaction ledgers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          {canManage && (
            <Link
              href="/customers/new"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Customer
            </Link>
          )}
        </div>
      </div>

      {/* Customer Directory */}
      <CustomerList
        businessId={context.businessId}
        currency={currency}
        customers={formattedCustomers}
        canManage={canManage}
      />
    </div>
  );
}
