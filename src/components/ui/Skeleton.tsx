import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export default function Skeleton({
  className,
  width,
  height,
  rounded = true,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading..."
      className={cn(
        'skeleton-shimmer bg-slate-800/60',
        rounded && 'rounded-lg',
        className
      )}
      style={{
        width: width ?? undefined,
        height: height ?? undefined,
        ...style,
      }}
      {...props}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-4" aria-busy="true">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="pt-3 border-t border-slate-800/60 flex justify-between items-center">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-800/50" aria-busy="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}
