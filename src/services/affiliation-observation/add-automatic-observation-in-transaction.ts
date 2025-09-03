import type { Database } from 'sql.js';
import { ObservationStatus } from '../../interfaces/enums.type';
import { USER_SYSTEM_UUID } from '../../utils/constants';

interface AddAutomaticObservationParams {
  requestId: number;
  observationTypeId: number;
  comment: string | null;
}

/**
 * Adds an automatic observation to a request within an existing transaction.
 * This is intended to be called by the validation processing logic.
 * It does NOT manage the transaction itself.
 */
export const addAutomaticObservationInTransaction = (
  db: Database,
  params: AddAutomaticObservationParams
) => {
  const { requestId, observationTypeId, comment } = params;

  const obsStmt = db.prepare(`
    INSERT INTO t_affiliation_observation (affiliation_request_id, observation_type_id, comment, status, created_by)
    VALUES (:reqId, :typeId, :comment, :status, :createdBy)
  `);
  obsStmt.run({
    ':reqId': requestId,
    ':typeId': observationTypeId,
    ':comment': comment || null,
    ':status': ObservationStatus.Pending, 
    ':createdBy': USER_SYSTEM_UUID, 
  });
  obsStmt.free();
};
