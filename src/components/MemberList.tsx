'use client';

import { useTransition } from 'react';
import { removeMember, declineInvitation } from '@/actions/business';
import { UserX, Mail, Shield, Copy, Check } from 'lucide-react';
import { useState } from 'react';

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

interface MemberListProps {
  businessId: string;
  currentUserId: string;
  currentUserRole: string;
  members: Member[];
  invitations: Invitation[];
}

export default function MemberList({
  businessId,
  currentUserId,
  currentUserRole,
  members,
  invitations,
}: MemberListProps) {
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isOwnerOrAdmin = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const handleRemove = (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the business?')) return;
    startTransition(async () => {
      await removeMember(businessId, memberId);
    });
  };

  const handleRevokeInvite = (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    startTransition(async () => {
      await declineInvitation(invitationId);
    });
  };

  const handleCopyLink = (invitationId: string) => {
    const inviteUrl = `${window.location.origin}/invite/${invitationId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(invitationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Active Members */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Active Team Members ({members.length})
          </h2>
        </div>

        <div className="space-y-3">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const canRemove =
              isOwnerOrAdmin &&
              !isSelf &&
              (currentUserRole === 'OWNER' || member.role === 'STAFF');

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all text-sm"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">
                      {member.user.name || member.user.email}
                    </p>
                    {isSelf && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      member.role === 'OWNER'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : member.role === 'ADMIN'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {member.role}
                  </span>

                  {canRemove && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemove(member.id)}
                      title="Remove Member"
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400" />
            Pending Invitations ({invitations.filter((i) => i.status === 'PENDING').length})
          </h2>
        </div>

        <div className="space-y-3">
          {invitations.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No pending invitations for this workspace.
            </div>
          ) : (
            invitations.map((invite) => {
              const isExpired = new Date(invite.expiresAt) < new Date();
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all text-sm"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-white truncate">{invite.email}</p>
                    <span className="text-xs text-gray-400">
                      Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isExpired
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isExpired ? 'EXPIRED' : invite.status} ({invite.role})
                    </span>

                    {invite.status === 'PENDING' && !isExpired && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(invite.id)}
                          title="Copy Invitation Link"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                        >
                          {copiedId === invite.id ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {isOwnerOrAdmin && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRevokeInvite(invite.id)}
                            title="Revoke Invitation"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all disabled:opacity-50"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
