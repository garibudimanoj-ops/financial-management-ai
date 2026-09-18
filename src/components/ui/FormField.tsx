'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  helperText?: string;
  className?: string;
}

export default function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
  helperText,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
      >
        {label}
        {required && <span className="text-rose-400 ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-1" role="alert">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
