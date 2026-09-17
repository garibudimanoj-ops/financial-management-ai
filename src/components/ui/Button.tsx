'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] active:scale-[0.98]';

  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-sm shadow-indigo-950',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/80 shadow-sm',
    outline:
      'bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white border border-slate-700',
    ghost:
      'bg-transparent hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 border border-transparent',
    danger:
      'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-500/40 shadow-sm shadow-rose-950',
    success:
      'bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-500/40 shadow-sm shadow-emerald-950',
  };

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs gap-2',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : icon ? (
        <span className="shrink-0" aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
