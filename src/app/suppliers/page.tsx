import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeSupplier } from '@/lib/serialize';
import Link from 'next/link';
import { Truck, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import SupplierFormModal from '@/components/suppliers/SupplierFormModal';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; archived?: string }>;
}) {
  const context = await requireBusinessContext();
  const canManage = hasPermission(context.role, 'SUPPLIER_CREATE');
  const params = await searchParams;
  const search = params.search || '';
  const showArchived = params.archived === 'true';

  const [business, suppliers] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true, name: true },
    }),
    prisma.supplier.findMany({
      where: {
        businessId: context.businessId,
        archived: showArchived ? undefined : false,
        ...(search.trim() !== ''
          ? {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { phone: { contains: search.trim(), mode: 'insensitive' } },
                { gstin: { contains: search.trim(), mode: 'insensitive' } },
                { email: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ archived: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: string | number | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  const serializedSuppliers = suppliers.map(serializeSupplier);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Suppliers & Vendor Accounts"
        subtitle="Manage vendor details, payment terms, GSTIN, and accounts payable balances."
        icon={<Truck className="w-6 h-6 text-indigo-400" />}
        actions={canManage ? <SupplierFormModal businessId={context.businessId} /> : undefined}
      />

      {/* Supplier Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {serializedSuppliers.length > 0 ? (
          serializedSuppliers.map((supplier) => (
            <Link
              key={supplier.id}
              href={`/suppliers/${supplier.id}`}
              className="glass-card-interactive p-5 space-y-4 group block rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/40 transition-all"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                    {supplier.name}
                  </h3>
                  {supplier.contactPerson && (
                    <p className="text-xs text-slate-400 mt-0.5">Attn: {supplier.contactPerson}</p>
                  )}
                </div>
                {supplier.archived && (
                  <Badge variant="error" size="sm">
                    Archived
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.gstin && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-slate-300">GSTIN: {supplier.gstin}</span>
                  </div>
                )}
                {supplier.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
                <span className="text-slate-400">Current Payable</span>
                <span className={`font-mono font-bold text-sm ${Number(supplier.currentBalance) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {fmt(supplier.currentBalance)}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={<Truck className="w-10 h-10 text-slate-500" />}
              title="No suppliers found"
              description="Get started by adding your trade suppliers and vendors to record purchase bills and track accounts payable."
              inCard
            />
          </div>
        )}
      </div>
    </div>
  );
}
