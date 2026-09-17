import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Card from './Card';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  inCard?: boolean;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  inCard = false,
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto',
        className
      )}
    >
      {icon && (
        <div
          className="mb-4 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-400"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-slate-100 mb-1.5">{title}</h4>
      {description && (
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );

  if (inCard) {
    return <Card className="p-4">{content}</Card>;
  }

  return content;
}
