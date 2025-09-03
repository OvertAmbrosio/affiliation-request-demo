import type { Database, Statement } from 'sql.js';

/**
 * Finalizes the affiliation process by checking for observations and creating a review request if needed.
 * @param db The database instance.
 * @param affiliationId The ID of the affiliation to finalize.
 * @returns True if a request was created, false otherwise.
 */
export const finalizeAffiliationService = (db: Database, affiliationId: string): boolean => {
  let observedStmt: Statement | undefined;
  let typeIdStmt: Statement | undefined;
  let newRequestIdStmt: Statement | undefined;

  try {
    // Step 1: Find all 'observed' validation results for this affiliation.
    observedStmt = db.prepare(
      `SELECT code, comment FROM t_affiliation_validation_result WHERE affiliation_id = :id AND status = 'observed'`
    );
    observedStmt.bind({ ':id': affiliationId });

    const observedResults: { code: string; comment: string }[] = [];
    while (observedStmt.step()) {
      observedResults.push(observedStmt.getAsObject() as { code: string; comment: string });
    }

    if (observedResults.length === 0) {
      // No observations, so no request is created. The affiliation might be auto-approved later.
      return false;
    }

    // Step 2: Update the main affiliation status to 'observed' since it has observations.
    db.run(`UPDATE t_affiliation SET status = 'observed' WHERE id = ?`, [affiliationId]);

    // Step 3: Create the affiliation request for manual review with 'observed' status.
    const requestStatus = 'observed'; // The request itself is pending review.
    db.run(
      'INSERT INTO t_affiliation_request (affiliation_id, status, request_config_id, created_by) VALUES (?, ?, ?, ?)',
      [affiliationId, requestStatus, 1, 'system_simulation'] // request_config_id = 1 (Standard Review)
    );

    // Step 3: Get the ID of the newly created request.
    newRequestIdStmt = db.prepare('SELECT last_insert_rowid()');
    newRequestIdStmt.step();
    const newRequestId = newRequestIdStmt.get()[0] as number;
    newRequestIdStmt.free(); // Free immediately after use
    newRequestIdStmt = undefined;

    // Step 4: Create a detailed history record for the request creation.
    const detailComments = observedResults.map(r => r.comment).join('; ');
    const details = `Solicitud creada por observaciones: ${detailComments}`;

    db.run(
      'INSERT INTO t_affiliation_request_history (affiliation_request_id, event_type, details, new_status, changed_by) VALUES (?, ?, ?, ?, ?)',
      [
        newRequestId,
        'request_created',
        details,
        requestStatus,
        'system_simulation',
      ]
    );

    // Step 5: For each observed validation, create an entry in t_affiliation_observation.
    for (const row of observedResults) {
      typeIdStmt = db.prepare('SELECT id FROM t_affiliation_observation_type WHERE code = :code');
      typeIdStmt.bind({ ':code': row.code });

      if (typeIdStmt.step()) {
        const observationTypeId = typeIdStmt.get()[0] as number;
        db.run(
          'INSERT INTO t_affiliation_observation (affiliation_request_id, observation_type_id, status, comment) VALUES (?, ?, ?, ?)',
          [newRequestId, observationTypeId, 'pending', row.comment]
        );
      } else {
        throw new Error(`Observation type not found for code: ${row.code}`);
      }
      typeIdStmt.free(); // Free inside the loop
      typeIdStmt = undefined;
    }



    return true;

  } finally {
    // Ensure all statements are freed even if an error occurs.
    if (observedStmt) observedStmt.free();
    if (typeIdStmt) typeIdStmt.free();
    if (newRequestIdStmt) newRequestIdStmt.free();
  }
};
