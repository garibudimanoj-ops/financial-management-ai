import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptInvitation, declineInvitation } from '@/actions/business';
import { redirect } from 'next/navigation';
import { Building2, Calendar, Mail, Shield, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface InvitePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { id } = await params;
  const user = await requireAuth();

  const invitation = await prisma.businessInvitation.findUnique({
    where: { id },
    include: {
      business: true,
      invitedBy: true,
    },
  });

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass-card w-full max-w-md p-8 text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Invitation Not Found</h1>
          <p className="text-sm text-gray-400">
            This invitation does not exist or may have been revoked.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isPending = invitation.status === 'PENDING' && !isExpired;

  async function handleAccept() {
    'use server';
    await acceptInvitation(id);
    redirect('/dashboard');
  }

  async function handleDecline() {
    'use server';
    await declineInvitation(id);
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card w-full max-w-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Team Invitation</h1>
          <p className="text-sm text-gray-400">
            You have been invited to join <span className="font-semibold text-white">{invitation.business.name}</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" /> Role
            </span>
            <span className="font-semibold text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full text-xs">
              {invitation.role}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" /> Invited Email
            </span>
            <span className="font-mono text-gray-300">{invitation.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" /> Expires On
            </span>
            <span className="text-gray-300">
              {new Date(invitation.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {isPending ? (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <form action={handleDecline}>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold text-gray-300 hover:bg-white/10 transition-all"
              >
                Decline
              </button>
            </form>
            <form action={handleAccept}>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept & Join
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm font-medium text-amber-400">
              This invitation is no longer active (Status: {invitation.status}
              {isExpired ? ' - Expired' : ''}).
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-white hover:bg-white/20 transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
