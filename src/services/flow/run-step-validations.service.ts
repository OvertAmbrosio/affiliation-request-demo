import type { Database } from 'sql.js';

import { ValidationResultStatus } from '../../interfaces/enums.type';

// The service layer uses application-level statuses for clarity.
export type AppValidationStatus = 'approved' | 'rejected' | 'observed';

export interface RunValidationParams {
  affiliationId: string;
  validationCode: string;
  status: AppValidationStatus;
  comment: string;
  nextStep: number;
}

/**
 * Simulates running a validation for an affiliation and updates its step.
 * @param db The database instance.
 * @param params The parameters for the validation.
 */
export const runStepValidationService = (db: Database, params: RunValidationParams): void => {
  // 1. Get the observation_type_id from the code
  const typeIdResult = db.exec(`SELECT id FROM t_affiliation_observation_type WHERE code = '${params.validationCode}'`);
  if (!typeIdResult[0]?.values[0]?.[0]) {
    throw new Error(`Observation type not found for code: ${params.validationCode}`);
  }
  const observationTypeId = typeIdResult[0].values[0][0] as number;

  // 2. Map application status to database status
  const dbStatusMap: Record<AppValidationStatus, ValidationResultStatus> = {
    approved: 'passed',
    rejected: 'failed',
    observed: 'observed',
  };
  const dbStatus = dbStatusMap[params.status];

  // 3. Insert the validation result
  db.run(
    'INSERT INTO t_affiliation_validation_result (affiliation_id, observation_type_id, code, status, comment) VALUES (?, ?, ?, ?, ?)',
    [
      params.affiliationId,
      observationTypeId,
      params.validationCode,
      dbStatus,
      params.comment
    ]
  );

  // 4. Get the ID of the newly created validation result
  const validationResultId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  // 5. Create a mock provider response and insert it
  const mockResponse = {
    transactionId: `sim-${Math.random().toString(36).substring(2, 10)}`,
    validationCode: params.validationCode,
    timestamp: new Date().toISOString(),
    result: {
      status: params.status,
      details: params.comment,
      simulated: true,
    },
    provider: 'SIMULATOR_PROVIDER',
  };
  const mockResponsePayload = JSON.stringify(mockResponse, null, 2);

  db.run(
    'INSERT INTO t_validation_provider_response (provider_code, response_json) VALUES (?, ?)',
    ['SIMULATOR_PROVIDER', mockResponsePayload]
  );

  const providerResponseId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  // 6. Create the first history entry for this validation, now with the provider response ID
  db.run(
    'INSERT INTO t_affiliation_validation_history (validation_result_id, attempt_number, status, comment, provider_response_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [
      validationResultId,
      1, // This is the first attempt
      dbStatus,
      params.comment,
      providerResponseId,
    ]
  );

  // 7. Update the affiliation's current step
  db.run('UPDATE t_affiliation SET current_step = ? WHERE id = ?', [params.nextStep, params.affiliationId]);
};