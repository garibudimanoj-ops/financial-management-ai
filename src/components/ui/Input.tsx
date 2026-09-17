'use client';

import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, success = false, icon, disabled, type, ...props }, ref) => {
    const isNumeric = type === 'number';

    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'w-full px-3.5 py-2 text-sm rounded-lg bg-slate-900/80 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-900/40 disabled:cursor-not-allowed',
            icon && 'pl-9',
            isNumeric && 'font-mono tabular-nums',
            error && 'border-rose-500/70 text-rose-100 focus:ring-rose-500/40 focus:border-rose-500',
            success && 'border-emerald-500/70 focus:ring-emerald-500/40 focus:border-emerald-500',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
