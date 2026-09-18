import Badge from './Badge';
import { CheckCircle2, Clock, AlertCircle, XCircle, AlertTriangle } from 'lucide-react';

export interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export default function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'PAID':
    case 'COMPLETED':
    case 'ACTIVE':
    case 'IN_STOCK':
      return (
        <Badge
          variant="success"
          size={size}
          icon={<CheckCircle2 className="w-3 h-3" />}
          className={className}
        >
          {status}
        </Badge>
      );

    case 'PARTIALLY_PAID':
    case 'PARTIAL':
    case 'PENDING':
    case 'ISSUED':
      return (
        <Badge
          variant="warning"
          size={size}
          icon={<Clock className="w-3 h-3" />}
          className={className}
        >
          {status}
        </Badge>
      );

    case 'LOW_STOCK':
      return (
        <Badge
          variant="warning"
          size={size}
          icon={<AlertTriangle className="w-3 h-3" />}
          className={className}
        >
          Low Stock
        </Badge>
      );

    case 'OVERDUE':
    case 'OUT_OF_STOCK':
    case 'CANCELLED':
    case 'FAILED':
    case 'REJECTED':
      return (
        <Badge
          variant="error"
          size={size}
          icon={<XCircle className="w-3 h-3" />}
          className={className}
        >
          {status}
        </Badge>
      );

    case 'DRAFT':
      return (
        <Badge
          variant="info"
          size={size}
          icon={<AlertCircle className="w-3 h-3" />}
          className={className}
        >
          {status}
        </Badge>
      );

    default:
      return (
        <Badge variant="neutral" size={size} className={className}>
          {status}
        </Badge>
      );
  }
}
