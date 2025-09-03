import type { Database } from 'sql.js';
import { executeValidation } from '../validation/execute-validation';
import { USER_SUPERVISOR_UUID } from '../../utils/constants';

/**
 * Retries a system observation by re-running the associated validation.
 * This service orchestrates the validation execution and updates the database state accordingly,
 * ensuring all operations are performed within a single transaction.
 *
 * @param db The database instance.
 * @param observationId The ID of the observation to retry.
 * @returns An object indicating success or failure with an optional error message.
 */
export const retryObservationService = (
  db: Database,
  observationId: number
): { success: boolean; error?: string } => {
  db.exec('BEGIN TRANSACTION;');

  try {
    // 1. Get observation, validation code, and all necessary affiliation data in one query
    const dataStmt = db.prepare(`
      SELECT
        ot.code as validation_code,
        ar.affiliation_id,
        obs.observation_type_id,
        vr.id as validation_result_id,
        aff.ruc as document_number,
        'RUC' as document_type, -- Assuming RUC, adjust if other doc types are used
        '' as account_number, -- Assuming not needed for all validations, adjust if needed
        aff.product_id,
        aff.channel_id
      FROM t_affiliation_observation obs
      JOIN t_affiliation_observation_type ot ON obs.observation_type_id = ot.id
      JOIN t_affiliation_request ar ON obs.affiliation_request_id = ar.id
      JOIN t_affiliation aff ON ar.affiliation_id = aff.id
      JOIN t_affiliation_validation_result vr ON aff.id = vr.affiliation_id AND ot.id = vr.observation_type_id
      WHERE obs.id = :id
    `);
    dataStmt.bind({ ':id': observationId });

    let data: any;
    if (dataStmt.step()) {
      data = dataStmt.getAsObject();
    }
    dataStmt.free();

    if (!data) {
      throw new Error(`Observation with ID ${observationId} not found.`);
    }

    // 2. Execute the validation again
    const validationResult = executeValidation(db, data.validation_code, {
      documentNumber: data.document_number,
      documentType: data.document_type,
      accountNumber: data.account_number,
      productId: String(data.product_id),
      channelId: String(data.channel_id),
    });

    const newStatus = validationResult.status === 'success' ? 'passed' : 'failed';

    // 3. Insert new history record for the retry attempt
    db.run(
      'INSERT INTO t_affiliation_validation_history (validation_result_id, provider_response_id, status, comment, triggered_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.validation_result_id,
        validationResult.providerResponseId,
        newStatus,
        `Retry attempt via observation ${observationId}`,
        USER_SUPERVISOR_UUID,
        new Date().toISOString(),
      ]
    );

    // 4. If retry was successful, update statuses
    if (newStatus === 'passed') {
      // Update observation status to 'approved'
      db.run(
        'UPDATE t_affiliation_observation SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
        ['approved', USER_SUPERVISOR_UUID, new Date().toISOString(), observationId]
      );

      // Update the main validation result to 'passed'
      db.run(
        "UPDATE t_affiliation_validation_result SET status = 'passed', updated_at = ? WHERE affiliation_id = ? AND observation_type_id = ?",
        [new Date().toISOString(), data.affiliation_id, data.observation_type_id]
      );
    } else {
      // If the retry failed, we don't automatically approve the observation.
      // We just log the attempt and its failure.
      // A new observation could be created depending on business rules, but for now, we do nothing more.
      throw new Error(validationResult.errorMessage || 'Validation retry resulted in a failure.');
    }

    db.exec('COMMIT;');
    return { success: true };

  } catch (error) {
    db.exec('ROLLBACK;');
    console.error(`Failed to retry observation ${observationId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
};
