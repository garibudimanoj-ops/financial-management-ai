'use client';

import { useState } from 'react';
import Link from 'next/link';
import { archiveCustomer, unarchiveCustomer } from '@/actions/customer';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Archive,
  RotateCcw,
  ExternalLink,
  Building2,
  AlertCircle,
} from 'lucide-react';

export interface CustomerItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  taxId: string | null;
  currentBalance: string | number;
  creditLimit: string | number | null;
  archived: boolean;
  createdAt: string | Date;
}

interface CustomerListProps {
  businessId: string;
  currency: string;
  customers: CustomerItem[];
  canManage: boolean;
}

export default function CustomerList({
  businessId,
  currency,
  customers,
  canManage,
}: CustomerListProps) {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.taxId && c.taxId.toLowerCase().includes(search.toLowerCase()));

    const matchesArchive = showArchived ? true : !c.archived;

    return matchesSearch && matchesArchive;
  });

  const handleToggleArchive = async (customerId: string, isArchived: boolean) => {
    setActionLoading(customerId);
    try {
      if (isArchived) {
        await unarchiveCustomer(businessId, customerId);
      } else {
        await archiveCustomer(businessId, customerId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, email, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded bg-black/40 border-white/20 text-indigo-500 focus:ring-0"
            />
            Show Archived
          </label>

          {canManage && (
            <Link
              href="/customers/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </Link>
          )}
        </div>
      </div>

      {/* Customer Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Location & Tax ID</th>
                <th className="py-3 px-4 text-right">Outstanding Receivable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => {
                  const balanceNum = Number(customer.currentBalance);
                  const hasReceivable = balanceNum > 0;

                  return (
                    <tr
                      key={customer.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        customer.archived ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                        >
                          {customer.name}
                          <ExternalLink className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                        </Link>
                        {customer.creditLimit && (
                          <span className="text-[11px] text-gray-500">
                            Limit: {currencySymbol}
                            {Number(customer.creditLimit).toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-xs space-y-0.5">
                        {customer.phone ? (
                          <div className="flex items-center gap-1 text-gray-300 font-mono">
                            <Phone className="w-3 h-3 text-indigo-400" />
                            {customer.phone}
                          </div>
                        ) : null}
                        {customer.email ? (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Mail className="w-3 h-3 text-gray-500" />
                            {customer.email}
                          </div>
                        ) : null}
                        {!customer.phone && !customer.email && (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      {/* Location & Tax ID */}
                      <td className="py-3.5 px-4 text-xs">
                        <p className="text-gray-300">
                          {[customer.city, customer.state].filter(Boolean).join(', ') || '—'}
                        </p>
                        {customer.taxId && (
                          <span className="text-[11px] font-mono text-indigo-300">
                            GSTIN: {customer.taxId}
                          </span>
                        )}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span
                          className={`font-bold ${
                            hasReceivable ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {currencySymbol}
                          {balanceNum.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {customer.archived ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                            Archived
                          </span>
                        ) : hasReceivable ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Due
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Settled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs font-medium"
                          >
                            View
                          </Link>

                          {canManage && (
                            <button
                              type="button"
                              disabled={actionLoading === customer.id}
                              onClick={() => handleToggleArchive(customer.id, customer.archived)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                              title={customer.archived ? 'Unarchive' : 'Archive'}
                            >
                              {customer.archived ? (
                                <RotateCcw className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Archive className="w-4 h-4 text-red-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
