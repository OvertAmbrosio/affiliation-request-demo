/**
 * @file Barrel file for all service functions.
 * This allows for cleaner imports in the UI components.
 * 
 * @example
 * import { getAffiliationRequests, addManualObservation } from '@/services';
 */

export * from './affiliation-request';
export * from './affiliation-observation';
export { getValidationHistory } from './validation/get-validation-history';
export { getProviderResponse } from './validation/get-provider-response';
export * from './validation';
export * from './simulation';
