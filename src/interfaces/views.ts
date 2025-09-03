import type {
  Affiliation,
  AffiliationObservation,
  AffiliationObservationCause,
  AffiliationObservationType,
  AffiliationRequest,
  AffiliationValidationHistory,
  AffiliationValidationResultDetail,
} from './models';

/**
 * Represents a detailed view of an affiliation request for list views.
 * Combines data from AffiliationRequest, Affiliation, and MaeProduct.
 */
export interface AffiliationRequestListView extends AffiliationRequest {
  ruc?: string;
  product_id: number;
  business_name?: string;
  product_name: string;
}

/**
 * Represents a full detailed view of a single affiliation request, including
 * the potential for manual observations.
 */
export interface AffiliationRequestDetailView extends AffiliationRequestListView {
  can_be_observed: 0 | 1; // SQLite boolean
  validations: AffiliationValidationResultDetail[];
}

/**
 * Represents an observation with its full type details for display.
 */
export interface AffiliationObservationView extends AffiliationObservation {
  observation_code: string;
  type: 'manual' | 'system';
  is_retriable?: boolean;
  observation_type_title: string;
  observation_type_label: string;
}

/**
 * Represents a detailed view of a validation history entry,
 * including the provider's raw JSON response.
 */
export interface ValidationHistoryView extends AffiliationValidationHistory {
  response_json?: string;
}

/**
 * Represents a manual observation type with its possible causes,
 * structured for selection in the UI.
 */
export interface ManualObservationSelectionView extends AffiliationObservationType {
  causes: AffiliationObservationCause[];
}

/**
 * Represents a configuration view for affiliation requests, linking a product
 * to its auto-approval setting.
 */
export interface AffiliationRequestConfigView {
  id: number;
  product_name: string;
  auto_approve: boolean;
}

/**
 * Represents a view of an affiliation for list views.
 */
export interface AffiliationListView extends Affiliation {
  status: string;
  current_step: number;
  product_name: string;
}
