import type { AffiliationRequestStatus, ObservationStatus } from './enums.type';

/**
 * Parameters for updating the status of an affiliation request.
 */
export interface UpdateStatusParams {
  requestId: number;
  newStatus: AffiliationRequestStatus;
  previousStatus: AffiliationRequestStatus | 'created';
  comment: string | null;
  changedBy?: string;
}

/**
 * Parameters for adding a manual observation to a request.
 */
export interface AddManualObservationParams {
  requestId: number;
  observationTypeId: number;
  comment: string;
  causeIds: number[];
  createdBy: string;
}

/**
 * Parameters for resolving an affiliation observation.
 */
export interface ResolveObservationParams {
  observationId: number;
  newStatus: ObservationStatus;
  resolvedBy: string;
}
