import type { Database } from 'sql.js';
import { ProviderResponseStatus } from '../../interfaces/enums.type';
import type { ObservationCode } from '../../interfaces/models';

// =============================================================================
// Interfaces
// =============================================================================

interface ValidationParams {
  affiliationId: string;
  validationCode: ObservationCode;
  documentNumber?: string;
  accountNumber?: string;
}

interface ValidationResult {
  status: ProviderResponseStatus;
  response_json: string;
  error_message?: string;
}

// =============================================================================
// Production Logic (Simulated)
// =============================================================================

/**
 * Simulates the logic for checking a single validation against an external provider.
 * In a real-world scenario, this function would contain the API call (e.g., using fetch).
 * @param params The parameters for the validation check.
 * @returns A promise that resolves to the validation result.
 */
const simulateExternalProviderCall = (
  params: ValidationParams
): ValidationResult => {
  const { validationCode, documentNumber, accountNumber } = params;

  let result: ValidationResult;
  switch (validationCode) {
    case 'PLAFT_RISK':
      if (documentNumber === '87654321') {
        result = {
          status: ProviderResponseStatus.Success,
          response_json:
            '{"risk_level":"medium", "details":"Possible match with a politically exposed person (PEP)."}',
          error_message: 'Medium risk detected. Requires manual review.',
        };
      } else {
        result = { status: ProviderResponseStatus.Success, response_json: '{"risk_level":"low"}' };
      }
      break;

    case 'BLACKLIST_MATCH':
      if (documentNumber === '12345678') {
        result = {
          status: ProviderResponseStatus.Error,
          error_message: 'Document found in internal blacklist',
          response_json: '{"match":true, "list":"Internal"}',
        };
      } else {
        result = { status: ProviderResponseStatus.Success, response_json: '{"match":false}' };
      }
      break;

    case 'BANK_ACCOUNT_INVALID':
      if (accountNumber?.endsWith('000')) {
        result = {
          status: ProviderResponseStatus.Error,
          error_message: 'Bank account does not exist or is inactive.',
          response_json: '{"valid":false, "reason_code":"INACTIVE_ACCOUNT"}',
        };
      } else {
        result = { status: ProviderResponseStatus.Success, response_json: '{"valid":true}' };
      }
      break;

    default:
      result = { status: ProviderResponseStatus.Success, response_json: '{}' };
      break;
  }
  return result;
};

/**
 * Runs a single validation check.
 * For this demo, it uses a simulation. In a real app, it would call the actual provider API.
 * It saves the result to the database and returns the outcome.
 */
export const runValidationCheck = (
  db: Database,
  params: ValidationParams
): ValidationResult => {
  // 1. Simulate the external API call to get the validation result
  const result = simulateExternalProviderCall(params);

  // 2. Save the result to our database for caching and auditing
  const stmt = db.prepare(`
    INSERT INTO t_validation_provider_response (affiliation_id, validation_code, status, response_json, error_message, document_number, account_number)
    VALUES (:affId, :valCode, :status, :json, :error, :doc, :account)
  `);
  stmt.run({
    ':affId': params.affiliationId,
    ':valCode': params.validationCode,
    ':status': result.status,
    ':json': result.response_json,
    ':error': result.error_message || null,
    ':doc': params.documentNumber || null,
    ':account': params.accountNumber || null,
  });
  stmt.free();

  return result;
};
