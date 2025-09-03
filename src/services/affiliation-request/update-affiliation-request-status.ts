import type { Database } from 'sql.js';
import { AffiliationRequestStatus } from '../../interfaces/enums.type';
import type { UpdateStatusParams } from '../../interfaces/services';
import { USER_ADMIN_UUID, USER_SUPERVISOR_UUID } from '../../utils/constants';
import { addHistoryEvent } from './add-history-event';
import { updateAffiliationRequestStatusInTransaction } from './update-affiliation-request-status-in-transaction';



/**
 * Updates the status of a request and logs the change to history.
 * This public-facing function wraps the core logic in a transaction, making it safe to call from the UI.
 */
export const updateAffiliationRequestStatus = (db: Database, params: UpdateStatusParams): { success: boolean, error?: string } => {
  if (!db) return { success: false, error: "Database not available" };

  db.exec("BEGIN TRANSACTION;");
  try {
    const changer = params.changedBy || (params.newStatus === AffiliationRequestStatus.Approved || params.newStatus === AffiliationRequestStatus.Rejected ? USER_SUPERVISOR_UUID : USER_ADMIN_UUID);

    updateAffiliationRequestStatusInTransaction(db, {
      requestId: params.requestId,
      newStatus: params.newStatus,
      changedBy: changer
    });

    addHistoryEvent(db, {
      requestId: params.requestId,
      eventType: 'status_change',
      details: params.comment,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      changedBy: changer,
    });

    db.exec("COMMIT;");
    return { success: true };
  } catch (err) {
    db.exec("ROLLBACK;");
    const errorMsg = `Error in transaction: ${(err as Error).message}`;
    console.error(errorMsg, err);
    return { success: false, error: errorMsg };
  }
};
