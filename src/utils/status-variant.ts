import type { BadgeProps } from '../components/ui/badge';

/**
 * Maps a status string to a corresponding Badge variant for consistent styling.
 * @param status The status string (e.g., 'approved', 'rejected', 'pending').
 * @returns The variant prop for the Badge component.
 */
export const getStatusVariant = (status?: string): BadgeProps['variant'] => {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'passed':
    case 'active':
      return 'success';
    case 'rejected':
    case 'failed':
      return 'destructive';
    case 'observed':
      return 'secondary';
    case 'pending':
      return 'default';
    default:
      return 'outline';
  }
};
