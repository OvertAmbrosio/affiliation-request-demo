import { CheckCircle, XCircle, Clock, AlertTriangle, ThumbsUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AllStatuses } from '../interfaces/enums.type';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';

export const getStatusVariant = (status: AllStatuses): BadgeVariant => {
  switch (status) {
    case 'approved':
      return 'secondary';
    case 'passed':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'rejected':
    case 'observed':
      return 'destructive';
    case 'pending':
    case 'ignored':
      return 'outline';
    default:
      return 'default';
  }
};

export const getStatusIcon = (status: AllStatuses): LucideIcon => {
  switch (status) {
    case 'approved':
    case 'passed':
      return CheckCircle;
    case 'rejected':
    case 'failed':
      return XCircle;
    case 'observed':
      return AlertTriangle;
    case 'pending':
      return Clock;
    case 'ignored':
      return ThumbsUp;
    default:
      return AlertTriangle; // Default icon for any unhandled status
  }
};
