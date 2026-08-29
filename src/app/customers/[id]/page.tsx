import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeCustomer, serializeCustomerLedgerEntry } from '@/lib/serialize';
import CustomerLedgerTable from '@/components/customers/CustomerLedgerTable';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Users,
  ArrowLeft,
  Edit3,
  Archive,
  RotateCcw,
  Phone,
  Mail,
  MapPin,
  Receipt,
  CreditCard,
} from 'lucide-react';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();
  const canManage = hasPermission(context.role, 'CUSTOMER_UPDATE');
  const isOwner = context.role === 'OWNER' || context.role === 'ADMIN';

  const [business, customer] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    prisma.customer.findUnique({
      where: { id },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            createdBy: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { receivedAt: 'desc' },
          take: 10,
        },
      },
    }),
  ]);

  if (!customer || customer.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const serializedCustomer = serializeCustomer(customer);
  const serializedLedger = customer.ledgerEntries.map(serializeCustomerLedgerEntry);

  const balanceNum = Number(customer.currentBalance);
  const creditLimitNum = customer.creditLimit ? Number(customer.creditLimit) : null;
  const hasReceivable = balanceNum > 0;
  const isOverLimit = creditLimitNum !== null && balanceNum > creditLimitNum;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">{customer.name}</h1>
            {customer.archived && (
              <span className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded-full font-semibold border border-red-500/30">
                Archived
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            Customer ID: <span className="text-indigo-400 font-semibold">{customer.id}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/customers"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Directory
          </Link>

          {canManage && !customer.archived && (
            <Link
              href={`/customers/${customer.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-white"
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              Edit
            </Link>
          )}

          {canManage && (
            <form action={customer.archived ? undefined : undefined}>
              {/* Archive/unarchive handled via server action */}
            </form>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Outstanding Balance</span>
          <p className={`text-3xl font-extrabold font-mono ${hasReceivable ? 'text-amber-400' : 'text-emerald-400'}`}>
            {currencySymbol}
            {balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-gray-500 block">
            {hasReceivable ? 'Amount due from customer' : 'No outstanding balance'}
          </span>
        </div>

        {creditLimitNum !== null && (
          <div className="glass-card p-5 space-y-1">
            <span className="text-xs text-gray-400 font-medium">Credit Limit</span>
            <p className={`text-3xl font-extrabold font-mono ${isOverLimit ? 'text-red-400' : 'text-indigo-400'}`}>
              {currencySymbol}
              {creditLimitNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 block">
              {isOverLimit ? 'Credit limit exceeded!' : 'Available credit headroom'}
            </span>
          </div>
        )}

        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Invoices</span>
          <p className="text-3xl font-extrabold text-white font-mono">
            {customer.invoices.length}
          </p>
          <span className="text-[11px] text-gray-500 block">Recorded transactions</span>
        </div>

        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Payments</span>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">
            {customer.payments.length}
          </p>
          <span className="text-[11px] text-gray-500 block">Payments received</span>
        </div>
      </div>

      {/* Contact & Address Card */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {customer.email && (
            <div className="flex items-center gap-2 text-gray-300">
              <Mail className="w-4 h-4 text-indigo-400" />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-gray-300">
              <Phone className="w-4 h-4 text-indigo-400" />
              <span className="font-mono">{customer.phone}</span>
            </div>
          )}
          {(customer.city || customer.state || customer.address) && (
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>
                {[customer.address, customer.city, customer.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {customer.taxId && (
            <div className="flex items-center gap-2 text-gray-300">
              <Receipt className="w-4 h-4 text-indigo-400" />
              <span className="font-mono">GSTIN: {customer.taxId}</span>
            </div>
          )}
        </div>
        {customer.notes && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-300">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Transaction Ledger
          </h2>
          <span className="text-xs text-gray-400 font-mono">
            {serializedLedger.length} entries
          </span>
        </div>

        <CustomerLedgerTable entries={serializedLedger} currency={currency} />
      </div>
    </div>
  );
}
