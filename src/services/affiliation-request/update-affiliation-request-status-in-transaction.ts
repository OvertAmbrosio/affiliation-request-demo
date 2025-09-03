import type { Database } from 'sql.js';
import type { AffiliationRequestStatus } from '../../interfaces/enums.type';

interface UpdateStatusInTransactionParams {
  requestId: number;
  newStatus: AffiliationRequestStatus;
  changedBy: string;
}

/**
 * Updates the status of a request and logs the change to history within an existing transaction.
 * This function does NOT manage transactions itself and should be wrapped in a transaction by the caller.
 */
export const updateAffiliationRequestStatusInTransaction = (db: Database, params: UpdateStatusInTransactionParams) => {
  const { requestId, newStatus, changedBy } = params;

  const updateStmt = db.prepare('UPDATE t_affiliation_request SET status = :status, reviewed_by = :reviewer, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
  updateStmt.run({ ':status': newStatus, ':reviewer': changedBy, ':id': requestId });
  updateStmt.free();
};
