import { LedgerEntryType } from '@prisma/client';
import Link from 'next/link';

interface LedgerRecord {
  id: string;
  entryType: LedgerEntryType;
  amount: string | number | null;
  balanceAfter: string | number | null;
  description: string | null;
  reference: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  createdAt: string | Date;
}

interface CustomerLedgerTableProps {
  entries: LedgerRecord[];
  currency: string;
}

export default function CustomerLedgerTable({ entries, currency }: CustomerLedgerTableProps) {
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const getBadgeStyle = (type: LedgerEntryType) => {
    switch (type) {
      case 'INVOICE':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'PAYMENT':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'REFUND':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'OPENING_BALANCE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'ADJUSTMENT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
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
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Transaction Type</th>
              <th className="py-3 px-4">Description / Reference</th>
              <th className="py-3 px-4 text-right">Debit (+)</th>
              <th className="py-3 px-4 text-right">Credit (-)</th>
              <th className="py-3 px-4 text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  No ledger entries recorded for this customer yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const amt = Number(entry.amount);
                const isDebit =
                  entry.entryType === 'INVOICE' ||
                  entry.entryType === 'DEBIT' ||
                  entry.entryType === 'OPENING_BALANCE';
                const isCredit =
                  entry.entryType === 'PAYMENT' ||
                  entry.entryType === 'CREDIT' ||
                  entry.entryType === 'REFUND';

                return (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors text-gray-300">
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
                          entry.entryType
                        )}`}
                      >
                        {entry.entryType}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-xs">
                      <p className="font-medium text-white">{entry.description || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-gray-400">
                        {entry.reference && <span className="font-mono text-[11px]">Ref: {entry.reference}</span>}
                        {entry.invoiceId && (
                          <Link
                            href={`/invoices/${entry.invoiceId}`}
                            className="text-indigo-400 hover:underline font-semibold text-[11px]"
                          >
                            View Invoice
                          </Link>
                        )}
                      </div>
                    </td>

                    {/* Debit (+) */}
                    <td className="py-3 px-4 text-right font-mono text-indigo-300 font-semibold">
                      {isDebit ? `${currencySymbol}${amt.toFixed(2)}` : '—'}
                    </td>

                    {/* Credit (-) */}
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                      {isCredit ? `${currencySymbol}${amt.toFixed(2)}` : '—'}
                    </td>

                    {/* Running Balance */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {currencySymbol}
                      {Number(entry.balanceAfter).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
