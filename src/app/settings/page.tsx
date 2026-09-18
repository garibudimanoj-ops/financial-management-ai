import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeBusiness } from '@/lib/serialize';
import SettingsForm from '@/components/SettingsForm';
import { Building2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Business Profile & Settings"
        subtitle="Manage your legal entity details, location, and tax registration"
        icon={<Building2 className="w-5 h-5" />}
      />

      <div className="max-w-3xl">
        <div className="glass-card p-6 md:p-8">
          <SettingsForm business={serializedBusiness} canEdit={canEdit} />
        </div>
      </div>
    </div>
  );
}
