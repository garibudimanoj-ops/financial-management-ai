import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeCustomer } from '@/lib/serialize';
import CustomerList from '@/components/customers/CustomerList';
import Link from 'next/link';
import { Users, Plus } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Customer Directory & Receivables"
        subtitle="Manage client profiles, credit balances, and payment ledgers"
        icon={<Users className="w-5 h-5" />}
        actions={
          canManage ? (
            <Link href="/customers/new">
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                New Customer
              </Button>
            </Link>
          ) : undefined
        }
      />

      <CustomerList
        businessId={context.businessId}
        currency={currency}
        customers={formattedCustomers}
        canManage={canManage}
      />
    </div>
  );
}
