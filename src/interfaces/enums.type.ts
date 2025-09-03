export const AffiliationRequestStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
  Observed: 'observed',
} as const;
export type AffiliationRequestStatus = typeof AffiliationRequestStatus[keyof typeof AffiliationRequestStatus];

export const ObservationStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
  Ignored: 'ignored',
} as const;

export const ResolveObservationStatus = {
  Approved: 'approved',
  Ignored: 'ignored',
} as const;
export type ResolveObservationStatus = typeof ResolveObservationStatus[keyof typeof ResolveObservationStatus];
export type ObservationStatus = typeof ObservationStatus[keyof typeof ObservationStatus];

export const ValidationResultStatus = {
  Passed: 'passed',
  Failed: 'failed',
  Observed: 'observed',
} as const;
export type ValidationResultStatus = typeof ValidationResultStatus[keyof typeof ValidationResultStatus];

export const ValidationHistoryStatus = {
  Passed: 'passed',
  Failed: 'failed',
  Observed: 'observed',
} as const;
export type ValidationHistoryStatus = typeof ValidationHistoryStatus[keyof typeof ValidationHistoryStatus];

export const ObservationType = {
  Manual: 'manual',
  System: 'system',
} as const;
export type ObservationType = typeof ObservationType[keyof typeof ObservationType];

export const ProviderResponseStatus = {
  Success: 'success',
  Error: 'error',
} as const;
export type ProviderResponseStatus = typeof ProviderResponseStatus[keyof typeof ProviderResponseStatus];

/**
 * A union of all possible status types used across the application for badges and icons.
 */
export type AllStatuses =
  | AffiliationRequestStatus
  | ObservationStatus
  | ValidationResultStatus
  | ValidationHistoryStatus;
