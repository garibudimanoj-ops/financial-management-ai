import { MovementType } from '@prisma/client';
import Link from 'next/link';

interface MovementRecord {
  id: string;
  movementType: MovementType;
  quantity: string | number;
  unitCost: string | number | null;
  previousStock: string | number;
  resultingStock: string | number;
  reason: string | null;
  reference: string | null;
  createdAt: string | Date;
  product?: {
    id: string;
    name: string;
    SKU: string;
    unit: string;
  };
  createdBy?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

interface MovementHistoryTableProps {
  movements: MovementRecord[];
  currency: string;
  hideProductColumn?: boolean;
}

export default function MovementHistoryTable({
  movements,
  currency,
  hideProductColumn = false,
}: MovementHistoryTableProps) {
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const getBadgeStyle = (type: MovementType) => {
    switch (type) {
      case 'STOCK_IN':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'SALE':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'RETURN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'ADJUSTMENT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DAMAGE':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
              <th className="py-3 px-4">Timestamp</th>
              {!hideProductColumn && <th className="py-3 px-4">Product / SKU</th>}
              <th className="py-3 px-4">Movement Type</th>
              <th className="py-3 px-4 text-right">Quantity</th>
              <th className="py-3 px-4 text-right">Unit Cost</th>
              <th className="py-3 px-4 text-right">Stock Level Change</th>
              <th className="py-3 px-4">Reason & Ref</th>
              <th className="py-3 px-4">Logged By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {movements.length === 0 ? (
              <tr>
                <td
                  colSpan={hideProductColumn ? 7 : 8}
                  className="py-8 text-center text-gray-400"
                >
                  No inventory movements recorded yet.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors text-gray-300">
                  {/* Timestamp */}
                  <td className="py-3 px-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>

                  {/* Product */}
                  {!hideProductColumn && (
                    <td className="py-3 px-4">
                      {m.product ? (
                        <div>
                          <Link
                            href={`/products/${m.product.id}`}
                            className="font-semibold text-white hover:text-indigo-400 transition-colors"
                          >
                            {m.product.name}
                          </Link>
                          <p className="text-xs text-gray-400 font-mono">SKU: {m.product.SKU}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">Deleted Product</span>
                      )}
                    </td>
                  )}

                  {/* Movement Type Badge */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
                        m.movementType
                      )}`}
                    >
                      {m.movementType}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    {m.movementType === 'STOCK_IN' || m.movementType === 'RETURN' ? '+' : '-'}
                    {Number(m.quantity).toLocaleString()}
                  </td>

                  {/* Unit Cost */}
                  <td className="py-3 px-4 text-right font-mono text-gray-300">
                    {m.unitCost ? `${currencySymbol}${Number(m.unitCost).toFixed(2)}` : '—'}
                  </td>

                  {/* Stock Progression */}
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    <span className="text-gray-500">{Number(m.previousStock)}</span>
                    <span className="mx-1 text-gray-600">→</span>
                    <span className="font-semibold text-white">{Number(m.resultingStock)}</span>
                  </td>

                  {/* Reason & Reference */}
                  <td className="py-3 px-4 text-xs max-w-xs truncate">
                    <p className="font-medium text-gray-200 truncate">{m.reason || '—'}</p>
                    {m.reference && (
                      <span className="text-[10px] text-gray-400 font-mono">Ref: {m.reference}</span>
                    )}
                  </td>

                  {/* Creator */}
                  <td className="py-3 px-4 text-xs text-gray-400 truncate max-w-[140px]">
                    {m.createdBy?.email || 'System'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
