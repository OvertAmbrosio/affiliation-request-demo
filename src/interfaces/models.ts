import type { OBSERVATION_CODES } from '../utils/constants';
import type {
  AffiliationRequestStatus,
  ObservationStatus,
  ObservationType,
  ProviderResponseStatus,
  ValidationHistoryStatus,
  ValidationResultStatus,
} from './enums.type';

// Type for the observation codes
export type ObservationCode = typeof OBSERVATION_CODES[keyof typeof OBSERVATION_CODES];

/**
 * Represents a master product.
 * Corresponds to the `t_mae_product` table.
 */
export interface MaeProduct {
  id: number;
  name: string;
}

/**
 * Represents an affiliation record.
 * Corresponds to the `t_affiliation` table.
 */
export interface Affiliation {
  id: string;
  customer_id: string;
  product_id: number;
  channel_id: number;
  ruc?: string;
  business_name?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Configuration for affiliation requests based on product.
 * Corresponds to the `t_affiliation_request_config` table.
 */
export interface AffiliationRequestConfig {
  id: number;
  product_id: number;
  auto_approve?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Represents an affiliation request to be reviewed.
 * Corresponds to the `t_affiliation_request` table.
 */
export interface AffiliationRequest {
  id: number;
  affiliation_id: string;
  request_config_id: number;
  status: AffiliationRequestStatus;
  created_by?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Defines a type of observation that can be made.
 * Corresponds to the `t_affiliation_observation_type` table.
 */
export interface AffiliationObservationType {
  id: number;
  code: ObservationCode;
  title: string;
  is_active?: boolean;
  type: ObservationType;
  label?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Links products to observation types.
 * Corresponds to the `t_product_observation_type` table.
 */
export interface ProductObservationType {
  product_id: number;
  observation_type_id: number;
}

/**
 * Represents a specific observation made on an affiliation request.
 * Corresponds to the `t_affiliation_observation` table.
 */
export interface AffiliationObservation {
  id: number;
  affiliation_request_id: number;
  observation_type_id: number;
  comment?: string;
  status: ObservationStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Defines a specific cause for a given observation type.
 * Corresponds to the `t_affiliation_observation_cause` table.
 */
export interface AffiliationObservationCause {
  id: number;
  observation_type_id: number;
  label: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Records a selected cause for a specific observation.
 * Corresponds to the `t_affiliation_observation_selected_cause` table.
 */
export interface AffiliationObservationSelectedCause {
  id: number;
  affiliation_observation_id: number;
  observation_cause_id: number;
  created_at?: string;
}

/**
 * Logs the history of changes to an affiliation request.
 * Corresponds to the `t_affiliation_request_history` table.
 */
export interface AffiliationRequestHistory {
  id: number;
  affiliation_request_id: number;
  event_type?: string;
  details?: string;
  previous_status?: AffiliationRequestStatus;
  new_status?: AffiliationRequestStatus;
  changed_by?: string;
  changed_at?: string;
}

/**
 * Caches the response from an external validation provider.
 * Corresponds to the `t_validation_provider_response` table.
 */
export interface ValidationProviderResponse {
  id: number;
  provider_code?: string;
  validation_code?: ObservationCode;
  document_number?: string;
  document_type?: string;
  account_number?: string;
  product_id?: string;
  channel_id?: string;
  status?: ProviderResponseStatus;
  error_message?: string;
  error_code?: string;
  response_json?: string;
  created_at?: string;
}

/**
 * Stores the result of a validation for an affiliation.
 * Corresponds to the `t_affiliation_validation_result` table.
 */
export interface AffiliationValidationResult {
  id: number;
  code?: ObservationCode;
  affiliation_id: string;
  affiliation_request_id: number;
  observation_type_id: number;
  status?: ValidationResultStatus;
  comment?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Logs the history of validation attempts for a specific result.
 * Corresponds to the `t_affiliation_validation_history` table.
 */
export interface AffiliationValidationHistory {
  id: number;
  validation_result_id: number;
  provider_response_id?: number;
  attempt_number?: number;
  status?: ValidationHistoryStatus;
  comment?: string;
  triggered_by?: string;
  created_at?: string;
}

/**
 * Represents a detailed view of a validation result for the UI,
 * combining the result with the observation type's metadata.
 */
export interface AffiliationValidationResultDetail extends AffiliationValidationResult {
  observation_type_label?: string;
  validation_label: string;
}

/**
 * Represents the complete data model for the Affiliation Detail page.
 */
export interface AffiliationDetail extends Affiliation {
  affiliation_request_id: number | null;
  product_name: string;
  channel_name: string;
  status: string;
  current_step: number;
  validations: AffiliationValidationResultDetail[];
}
