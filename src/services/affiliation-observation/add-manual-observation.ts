import type { Database } from 'sql.js';
import {
  AffiliationRequestStatus,
  ObservationStatus,
} from '../../interfaces/enums.type';
import type { AddManualObservationParams } from '../../interfaces/services';
import {
  addHistoryEvent,
  updateAffiliationRequestStatusInTransaction,
} from '../affiliation-request';

/**
 * Adds a manual observation to a request. This is a complex transaction that:
 * 1. Creates the observation record.
 * 2. Links any selected causes.
 * 3. Updates the parent request's status to 'observed'.
 * 4. Logs the event to the request's history.
 * @param db The sql.js database instance.
 * @param params The parameters for creating the observation.
 * @returns A success or error object.
 */
export const addManualObservation = (
  db: Database,
  params: AddManualObservationParams
): { success: boolean; error?: string } => {
  if (!db) return { success: false, error: 'Database not available' };

  const { requestId, observationTypeId, causeIds, comment, createdBy } = params;

  db.exec('BEGIN TRANSACTION;');
  try {
    const reqStmt = db.prepare('SELECT status FROM t_affiliation_request WHERE id = :id');
    reqStmt.bind({ ':id': requestId });
    let previousStatus: AffiliationRequestStatus | 'created' = 'created';
    if (reqStmt.step()) {
      previousStatus = reqStmt.getAsObject().status as AffiliationRequestStatus;
    }
    reqStmt.free();

    const obsStmt = db.prepare(`
      INSERT INTO t_affiliation_observation (affiliation_request_id, observation_type_id, comment, status, created_by)
      VALUES (:reqId, :typeId, :comment, :status, :createdBy)
    `);
    obsStmt.run({
      ':reqId': requestId,
      ':typeId': observationTypeId,
      ':comment': comment || null,
      ':status': ObservationStatus.Pending,
      ':createdBy': createdBy,
    });
    obsStmt.free();

    const obsId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

    if (causeIds && causeIds.length > 0) {
      const causeStmt = db.prepare(
        'INSERT INTO t_affiliation_observation_selected_cause (affiliation_observation_id, observation_cause_id) VALUES (:obsId, :causeId)'
      );
      for (const causeId of causeIds) {
        causeStmt.run({ ':obsId': obsId, ':causeId': causeId });
      }
      causeStmt.free();
    }

    updateAffiliationRequestStatusInTransaction(db, {
      requestId,
      newStatus: AffiliationRequestStatus.Observed,
      changedBy: createdBy,
    });

    addHistoryEvent(db, {
      requestId,
      eventType: 'observation_update',
      details: `Manual observation added: ${comment || 'No comment'}`,
      previousStatus: previousStatus,
      newStatus: AffiliationRequestStatus.Observed,
      changedBy: createdBy,
    });

    db.exec('COMMIT;');
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    const errorMsg = `Error in transaction: ${(err as Error).message}`;
    console.error(errorMsg, err);
    return { success: false, error: errorMsg };
  }
};
