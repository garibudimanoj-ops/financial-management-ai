'use client';

import { AlertOctagon } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import { cn } from '@/lib/utils';

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorDisplay({
  title = 'Unable to load data',
  message,
  onRetry,
  className,
}: ErrorDisplayProps) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center py-10 px-6 text-center max-w-md mx-auto',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </Card>
  );
}
