import { requireBusinessContext, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import InviteForm from '@/components/InviteForm';
import MemberList from '@/components/MemberList';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import type { BusinessContext } from '@/lib/auth';

interface Member {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string | Date;
}

export default async function EmployeesPage() {
  let context: BusinessContext | null = null;
  let members: Member[] = [];
  let invitations: Invitation[] = [];
  let canManage = false;
  let error: unknown = null;

  try {
    context = await requireBusinessContext();
    await requirePermission(context.businessId, 'MEMBERS_READ');

    const rawMembers = await prisma.businessMember.findMany({
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
    members = rawMembers as Member[];

    invitations = await prisma.businessInvitation.findMany({
      where: { businessId: context.businessId },
      orderBy: { createdAt: 'desc' },
    }) as Invitation[];

    canManage = context.role === 'OWNER' || context.role === 'ADMIN';
  } catch (err: unknown) {
    error = err;
    console.error('[Employees Page] Error:', err);
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-16 flex items-center justify-center">
        <div className="glass-card p-8 text-center space-y-4 max-w-md">
          <h1 className="text-xl font-bold text-white">Team Data Unavailable</h1>
          <p className="text-sm text-slate-400">Unable to load team members. Please retry or contact support.</p>
        </div>
      </div>
    );
  }

  const ctx = context!;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
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
          <InviteForm businessId={ctx.businessId} />
        </div>
      )}

      <MemberList
        businessId={ctx.businessId}
        currentUserId={ctx.userId}
        currentUserRole={ctx.role}
        members={members}
        invitations={invitations}
      />
    </div>
  );
}
