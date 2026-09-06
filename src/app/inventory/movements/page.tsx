import { requireBusinessContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInventoryMovements } from '@/lib/inventory/service';
import MovementHistoryTable from '@/components/inventory/MovementHistoryTable';
import Link from 'next/link';
import { History, Boxes, Package } from 'lucide-react';

export default async function InventoryMovementsPage() {
  const context = await requireBusinessContext();

  const [business, { total, movements }] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    getInventoryMovements(context.businessId, undefined, 100, 0),
  ]);

  const currency = business?.baseCurrency || 'INR';

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <History className="w-8 h-8 text-indigo-400" />
            Inventory Movement Ledger
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Immutable audit record of all receipts, adjustments, returns, sales, and damages ({total} total records)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <Boxes className="w-4 h-4 text-emerald-400" />
            Inventory Hub
          </Link>

          <Link
            href="/products"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-white"
          >
            <Package className="w-4 h-4 text-indigo-400" />
            Products
          </Link>
        </div>
      </div>

      {/* Movements Table */}
      <MovementHistoryTable
        movements={movements}
        currency={currency}
      />
    </div>
  );
}
