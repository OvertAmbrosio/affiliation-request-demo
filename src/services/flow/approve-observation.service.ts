import type { Database } from 'sql.js';

/**
 * Approves a specific observation, updating its status and the corresponding validation result.
 * It also checks if all observations for the request are resolved and updates the main request and affiliation status accordingly.
 *
 * @param db The database instance.
 * @param observationId The ID of the observation to approve.
 */
export const approveObservationService = (db: Database, observationId: number): void => {
  db.exec('BEGIN TRANSACTION;');

  try {
    // Step 1: Get the affiliation_request_id and observation_type_id from the observation being approved.
    const obsStmt = db.prepare(
      'SELECT affiliation_request_id, observation_type_id FROM t_affiliation_observation WHERE id = :id'
    );
    obsStmt.bind({ ':id': observationId });

    if (!obsStmt.step()) {
      obsStmt.free();
      throw new Error(`Observation with ID ${observationId} not found.`);
    }
    const { affiliation_request_id, observation_type_id } = obsStmt.getAsObject() as {
      affiliation_request_id: number;
      observation_type_id: number;
    };
    obsStmt.free();

    // Step 2: Update the observation's status to 'approved'.
    db.run(`UPDATE t_affiliation_observation SET status = 'approved', reviewed_by = 'system_review', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`, [observationId]);

    // Step 3: Get the main affiliation_id from the request.
    const reqStmt = db.prepare('SELECT affiliation_id FROM t_affiliation_request WHERE id = :id');
    reqStmt.bind({ ':id': affiliation_request_id });

    if (!reqStmt.step()) {
      reqStmt.free();
      throw new Error(`Affiliation request with ID ${affiliation_request_id} not found.`);
    }
    const { affiliation_id } = reqStmt.getAsObject() as { affiliation_id: string };
    reqStmt.free();

    // Step 4: Update the original validation result that caused the observation to 'passed'.
    db.run(
      `UPDATE t_affiliation_validation_result SET status = 'passed', comment = 'Observación aprobada manualmente.' WHERE affiliation_id = ? AND observation_type_id = ?`,
      [affiliation_id, observation_type_id]
    );

    // Step 5: Check if there are any other 'pending' observations for this request.
    const unresolvedStmt = db.prepare(
      `SELECT COUNT(*) FROM t_affiliation_observation WHERE affiliation_request_id = :reqId AND status = 'pending'`
    );
    unresolvedStmt.bind({ ':reqId': affiliation_request_id });
    unresolvedStmt.step();
    const unresolvedCount = unresolvedStmt.get()[0] as number;
    unresolvedStmt.free();

    // Step 6: If all observations are resolved, approve the request and the main affiliation.
    if (unresolvedCount === 0) {
      db.run(`UPDATE t_affiliation_request SET status = 'approved', reviewed_by = 'system_review', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`, [affiliation_request_id]);
      db.run(`UPDATE t_affiliation SET status = 'approved' WHERE id = ?`, [affiliation_id]);

      // Add a history log for the automatic approval.
      db.run(
        'INSERT INTO t_affiliation_request_history (affiliation_request_id, event_type, details, new_status, changed_by) VALUES (?, ?, ?, ?, ?)',
        [
          affiliation_request_id,
          'request_approved',
          'Todas las observaciones han sido resueltas. La solicitud se aprueba automáticamente.',
          'approved',
          'system_flow',
        ]
      );
    }

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    console.error('Failed to approve observation:', error);
    throw error;
  }
};
