import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  icon?: ReactNode;
  iconBg?: string;
  sparkline?: number[];
  href?: string;
  className?: string;
}

export default function MetricCard({
  title,
  value,
  description,
  trend,
  icon,
  iconBg = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  sparkline,
  href,
  className,
}: MetricCardProps) {
  const content = (
    <div
      className={cn(
        'glass-card-interactive p-5 flex flex-col justify-between h-full relative overflow-hidden',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-100 font-mono-numbers">
            {value}
          </div>
        </div>
        {icon && (
          <div
            className={cn(
              'p-2.5 rounded-xl border shrink-0',
              iconBg
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {(trend || description || sparkline) && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded',
                  trend.isPositive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-rose-400 bg-rose-500/10'
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                )}
                {trend.value}
              </span>
            )}
            {trend?.label && (
              <span className="text-[11px] text-slate-400">{trend.label}</span>
            )}
            {description && !trend?.label && (
              <span className="text-[11px] text-slate-400">{description}</span>
            )}
          </div>

          {sparkline && sparkline.length > 1 && (
            <div className="w-16 h-6 shrink-0 opacity-80" aria-hidden="true">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                {(() => {
                  const min = Math.min(...sparkline);
                  const max = Math.max(...sparkline);
                  const range = max - min || 1;
                  const points = sparkline
                    .map((val, idx) => {
                      const x = (idx / (sparkline.length - 1)) * 96 + 2;
                      const y = 36 - ((val - min) / range) * 32;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ');
                  const strokeColor =
                    trend?.isPositive === false ? '#ef4444' : '#10b981';
                  return (
                    <polyline
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                  );
                })()}
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group h-full">
        {content}
      </Link>
    );
  }

  return content;
}
