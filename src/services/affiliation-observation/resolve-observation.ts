import type { Database } from 'sql.js';
import type { ObservationStatus } from '../../interfaces/enums.type';

export interface ResolveObservationParams {
  observationId: number;
  newStatus: ObservationStatus;
  resolvedBy: string;
}

/**
 * Resolves an affiliation observation by updating its status and creating a history record.
 * This operation is transactional.
 *
 * @param db The database instance.
 * @param params The parameters for resolving the observation.
 * @returns An object indicating success or failure.
 */
export const resolveObservationService = (
  db: Database,
  params: ResolveObservationParams
): { success: boolean; error?: string } => {
  const { observationId, newStatus, resolvedBy } = params;

  db.exec('BEGIN TRANSACTION;');
  try {
    const obsStmt = db.prepare(`
      SELECT
        obs.affiliation_request_id,
        obs.status,
        ot.type,
        obs.observation_type_id
      FROM
        t_affiliation_observation obs
      JOIN
        t_affiliation_observation_type ot ON obs.observation_type_id = ot.id
      WHERE
        obs.id = :id
    `);
    obsStmt.bind({ ':id': observationId });

    let observation: { affiliation_request_id: number; status: string; type: 'system' | 'manual'; observation_type_id: number } | null = null;
    if (obsStmt.step()) {
      observation = obsStmt.getAsObject() as { affiliation_request_id: number; status: string; type: 'system' | 'manual'; observation_type_id: number };
    }
    obsStmt.free();

    if (!observation) {
      throw new Error(`Observation with ID ${observationId} not found.`);
    }

    const updateStmt = db.prepare(`
      UPDATE t_affiliation_observation
      SET status = :newStatus, reviewed_by = :resolvedBy, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = :observationId;
    `);
    updateStmt.run({ ':newStatus': newStatus, ':resolvedBy': resolvedBy, ':observationId': observationId });
    updateStmt.free();

    // If the observation is system-generated, update the corresponding validation result and its history.
    if (observation.type === 'system') {
      const validationResultStmt = db.prepare(`
        SELECT vr.id
        FROM t_affiliation_validation_result vr
        JOIN t_affiliation a ON vr.affiliation_id = a.id
        JOIN t_affiliation_request ar ON a.id = ar.affiliation_id
        WHERE ar.id = :affiliationRequestId AND vr.observation_type_id = :observationTypeId
      `);
      validationResultStmt.bind({ 
        ':affiliationRequestId': observation.affiliation_request_id,
        ':observationTypeId': observation.observation_type_id
      });

      let validationResult: { id: number } | null = null;
      if (validationResultStmt.step()) {
        validationResult = validationResultStmt.getAsObject() as { id: number };
      }
      validationResultStmt.free();

      if (validationResult) {
        const validationResultId = validationResult.id;
        const newValidationStatus = newStatus === 'approved' ? 'passed' : 'observed';

        // Update the validation result status
        const updateValidationStmt = db.prepare(`
          UPDATE t_affiliation_validation_result
          SET status = :status
          WHERE id = :id
        `);
        updateValidationStmt.run({ ':status': newValidationStatus, ':id': validationResultId });
        updateValidationStmt.free();

        // Get the latest attempt number to increment it
        const lastAttemptStmt = db.prepare(`
          SELECT MAX(attempt_number) as max_attempt FROM t_affiliation_validation_history WHERE validation_result_id = :validationResultId
        `);
        lastAttemptStmt.bind({ ':validationResultId': validationResultId });
        let lastAttempt = 0;
        if (lastAttemptStmt.step()) {
          const result = lastAttemptStmt.getAsObject() as { max_attempt: number | null };
          if (result.max_attempt) {
            lastAttempt = result.max_attempt;
          }
        }
        lastAttemptStmt.free();

        // Create a new validation history record
        const validationHistoryStmt = db.prepare(`
          INSERT INTO t_affiliation_validation_history (validation_result_id, attempt_number, status, comment, created_at)
          VALUES (:validation_result_id, :attempt_number, :status, :comment, CURRENT_TIMESTAMP)
        `);
        validationHistoryStmt.run({
          ':validation_result_id': validationResultId,
          ':attempt_number': lastAttempt + 1,
          ':status': newValidationStatus,
          ':comment': `Observation resolved as '${newStatus}' by supervisor.`
        });
        validationHistoryStmt.free();
      }
    }

    const historyStmt = db.prepare(`
      INSERT INTO t_affiliation_request_history (affiliation_request_id, event_type, details, previous_status, new_status, changed_by)
      VALUES (:affiliation_request_id, 'observation_resolved', :details, :previous_status, :new_status, :changed_by);
    `);
    historyStmt.run({
      ':affiliation_request_id': observation.affiliation_request_id,
      ':details': `Observation ID ${observationId} status changed to ${newStatus}`,
      ':previous_status': observation.status,
      ':new_status': newStatus,
      ':changed_by': resolvedBy,
    });
    historyStmt.free();

    // Check if all observations for the request have been resolved.
    const pendingCheckStmt = db.prepare(`
      SELECT COUNT(*) as count FROM t_affiliation_observation
      WHERE affiliation_request_id = :affiliation_request_id AND status = 'pending'
    `);
    pendingCheckStmt.bind({ ':affiliation_request_id': observation.affiliation_request_id });

    let pendingCount = 0;
    if (pendingCheckStmt.step()) {
      pendingCount = (pendingCheckStmt.getAsObject() as { count: number }).count;
    }
    pendingCheckStmt.free();

    // If no pending observations remain, update the affiliation request status.
    if (pendingCount === 0) {
      const requestConfigStmt = db.prepare(`
        SELECT
          ar.status as current_status,
          arc.auto_approve,
          ar.affiliation_id
        FROM
          t_affiliation_request ar
        JOIN
          t_affiliation a ON ar.affiliation_id = a.id
        JOIN
          t_affiliation_request_config arc ON a.product_id = arc.product_id
        WHERE
          ar.id = :affiliation_request_id
      `);
      requestConfigStmt.bind({ ':affiliation_request_id': observation.affiliation_request_id });

      let config: { current_status: string; auto_approve: number; affiliation_id: string } | null = null;
      if (requestConfigStmt.step()) {
        config = requestConfigStmt.getAsObject() as { current_status: string; auto_approve: number; affiliation_id: string };
      }
      requestConfigStmt.free();

      if (config) {
        const previousStatus = config.current_status;
        let newRequestStatus: string | null = null;

        if (config.auto_approve === 1) {
          newRequestStatus = 'approved';
        } else {
          // If not auto-approved, move to pending for final manual review.
          newRequestStatus = 'pending';
        }

        if (newRequestStatus && newRequestStatus !== previousStatus) {
          // Update the main affiliation request status
          db.run('UPDATE t_affiliation_request SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?', [
            newRequestStatus,
            'system', // Changed by system as it's an automatic transition
            observation.affiliation_request_id,
          ]);

          // If approved, also update the parent affiliation record
          if (newRequestStatus === 'approved') {
            db.run(`UPDATE t_affiliation SET status = 'approved' WHERE id = ?`, [config.affiliation_id]);
          }

          // Record the status change in the request history
          db.run(
            'INSERT INTO t_affiliation_request_history (affiliation_request_id, event_type, details, previous_status, new_status, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
            [
              observation.affiliation_request_id,
              'status_change',
              'All observations resolved. Status updated automatically.',
              previousStatus,
              newRequestStatus,
              'system',
            ]
          );
        }
      }
    }

    db.exec('COMMIT;');
    return { success: true };

  } catch (e) {
    db.exec('ROLLBACK;');
    const error = e instanceof Error ? e.message : 'An unknown error occurred';
    console.error(`Failed to resolve observation: ${error}`);
    return { success: false, error };
  }
};
