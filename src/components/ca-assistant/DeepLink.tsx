'use client';

import Link from 'next/link';

interface DeepLinkProps {
  entityType: 'customer' | 'invoice' | 'expense' | 'purchase';
  entityId: string;
  label: string;
}

export default function DeepLink({ entityType, entityId, label }: DeepLinkProps) {
  const href = `/${entityType}s/${entityId}`;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium transition-colors border border-indigo-500/20"
    >
      <span>Open {label}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
