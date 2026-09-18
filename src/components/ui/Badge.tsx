import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
  size?: 'xs' | 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
}

export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  icon,
  className,
}: BadgeProps) {
  const variantStyles = {
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/80',
    primary: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  };

  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-0.5 text-xs gap-1.5',
    md: 'px-3 py-1 text-sm gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
