import { ReactNode, TableHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  wrapperClassName?: string;
}

export default function DataTable({
  children,
  className,
  wrapperClassName,
  ...props
}: DataTableProps) {
  return (
    <div
      className={cn(
        'table-responsive-wrapper rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden',
        wrapperClassName
      )}
    >
      <table
        className={cn('w-full text-left text-sm text-slate-200 divide-y divide-slate-800/80', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead className={cn('bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 tracking-wider', className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tbody className={cn('divide-y divide-slate-800/60 font-normal', className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, hover = true }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        hover && 'hover:bg-slate-800/40',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
  align = 'left',
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3.5 whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  align = 'left',
  isNumeric = false,
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        isNumeric && 'font-mono tabular-nums',
        className
      )}
    >
      {children}
    </td>
  );
}
