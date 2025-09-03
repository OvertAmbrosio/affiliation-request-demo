import type { Database } from 'sql.js';

export type ValidationResult = {
  status: 'success' | 'error';
  providerResponseId: number;
  errorMessage?: string;
};

/**
 * Simulates executing a specific validation provider call.
 * For the purpose of the 'retry' feature, this simulation will always return a 'success' status.
 * It logs the provider's response in `t_validation_provider_response`.
 *
 * @param db The database instance.
 * @param validationCode The code of the validation to execute (e.g., 'PLAFT_RISK').
 * @param affiliation The affiliation data needed for the validation.
 * @returns A promise that resolves with the validation result.
 */
export const executeValidation = (
  db: Database,
  validationCode: string,
  affiliation: { documentNumber: string; documentType: string; accountNumber: string; productId: string; channelId: string; }
): ValidationResult => {
  const now = new Date().toISOString();
  const { documentNumber, documentType, accountNumber, productId, channelId } = affiliation;

  // In a real scenario, this would involve API calls. Here, we simulate a successful response.
  const responseJson = JSON.stringify({
    message: `Retry successful for ${validationCode} at ${now}`,
    status: 200,
  });

  const stmt = db.prepare(
    'INSERT INTO t_validation_provider_response (provider_code, validation_code, document_number, document_type, account_number, product_id, channel_id, status, response_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  
  stmt.run([
    'SIMULATED_PROVIDER',
    validationCode,
    documentNumber,
    documentType,
    accountNumber,
    productId,
    channelId,
    'success',
    responseJson,
    now,
  ]);
  stmt.free();

  const providerResponseId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  return {
    status: 'success',
    providerResponseId,
  };
};
