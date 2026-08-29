import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeBusiness } from '@/lib/serialize';
import SettingsForm from '@/components/SettingsForm';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';

export default async function SettingsPage() {
  const context = await requireBusinessContext();
  const canEdit = hasPermission(context.role, 'BUSINESS_UPDATE');

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
  });

  if (!business) {
    return null;
  }

  const serializedBusiness = serializeBusiness(business);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-400" />
            Business Profile & Settings
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your legal entity details, location, and tax registration
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-all text-white font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      <div className="glass-card p-6 md:p-8">
        <SettingsForm business={serializedBusiness} canEdit={canEdit} />
      </div>
    </div>
  );
}
