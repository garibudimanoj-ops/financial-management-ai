import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeSupplier } from '@/lib/serialize';
import Link from 'next/link';
import { Truck, ArrowLeft, Plus, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import SupplierFormModal from '@/components/suppliers/SupplierFormModal';

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
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-indigo-400" />
            Suppliers & Vendor Accounts
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage vendor details, payment terms, GSTIN, and accounts payable balances
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

          {canManage && <SupplierFormModal businessId={context.businessId} />}
        </div>
      </div>

      {/* Supplier Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {serializedSuppliers.length > 0 ? (
          serializedSuppliers.map((supplier) => (
            <Link
              key={supplier.id}
              href={`/suppliers/${supplier.id}`}
              className="glass-card p-6 space-y-4 hover:border-indigo-500/40 transition-all group block"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {supplier.name}
                  </h3>
                  {supplier.contactPerson && (
                    <p className="text-xs text-gray-400 mt-0.5">Attn: {supplier.contactPerson}</p>
                  )}
                </div>
                {supplier.archived && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded border border-red-500/30">
                    Archived
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-gray-300">
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.gstin && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono">GSTIN: {supplier.gstin}</span>
                  </div>
                )}
                {supplier.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                <span className="text-gray-400">Current Payable</span>
                <span className={`font-mono font-bold text-sm ${Number(supplier.currentBalance) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {fmt(supplier.currentBalance)}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full glass-card p-12 text-center space-y-4">
            <Truck className="w-12 h-12 text-gray-500 mx-auto" />
            <h3 className="text-lg font-medium text-white">No suppliers found</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Get started by adding your trade suppliers and vendors to record purchase bills and track accounts payable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
