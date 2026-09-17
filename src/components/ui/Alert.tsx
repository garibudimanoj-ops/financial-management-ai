'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Info, CheckCircle2, AlertTriangle, AlertOctagon, X } from 'lucide-react';

export interface AlertProps {
  title?: string;
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export default function Alert({
  title,
  children,
  variant = 'info',
  className,
  dismissible,
  onDismiss,
}: AlertProps) {
  const variantStyles = {
    info: 'bg-sky-950/40 border-sky-500/30 text-sky-200',
    success: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
    warning: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
    error: 'bg-rose-950/40 border-rose-500/30 text-rose-200',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />,
    error: <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border text-sm',
        variantStyles[variant],
        className
      )}
    >
      {icons[variant]}
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold text-slate-100">{title}</h5>}
        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
