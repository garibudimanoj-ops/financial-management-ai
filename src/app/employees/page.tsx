import { requireBusinessContext, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import InviteForm from '@/components/InviteForm';
import MemberList from '@/components/MemberList';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';

export default async function EmployeesPage() {
  const context = await requireBusinessContext();
  await requirePermission(context.businessId, 'MEMBERS_READ');

  const members = await prisma.businessMember.findMany({
    where: { businessId: context.businessId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const invitations = await prisma.businessInvitation.findMany({
    where: { businessId: context.businessId },
    orderBy: { createdAt: 'desc' },
  });

  const canManage = context.role === 'OWNER' || context.role === 'ADMIN';

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-400" />
            Team & Access Control
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage active memberships, roles, and invitation workflows
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

      {canManage && (
        <div className="glass-card p-6">
          <InviteForm businessId={context.businessId} />
        </div>
      )}

      <MemberList
        businessId={context.businessId}
        currentUserId={context.userId}
        currentUserRole={context.role}
        members={members}
        invitations={invitations}
      />
    </div>
  );
}
