import type { Database } from 'sql.js';
import type { AffiliationRequestStatus } from '../../interfaces/enums.type';

interface AddHistoryEventParams {
  requestId: number;
  eventType: 'status_change' | 'observation_update' | 'info_update' | 'simulation' | 'automatic_observation_retry';
  details: string | null;
  changedBy: string;
  previousStatus?: AffiliationRequestStatus | 'created';
  newStatus?: AffiliationRequestStatus;
}

export const addHistoryEvent = (db: Database, params: AddHistoryEventParams) => {
  const { requestId, eventType, details, changedBy, previousStatus, newStatus } = params;
  const historyStmt = db.prepare(`
    INSERT INTO t_affiliation_request_history (affiliation_request_id, event_type, details, previous_status, new_status, changed_by)
    VALUES (:reqId, :eventType, :details, :prevStatus, :newStatus, :changedBy)
  `);
  historyStmt.run({
    ':reqId': requestId,
    ':eventType': eventType,
    ':details': details || null,
    ':prevStatus': previousStatus || null,
    ':newStatus': newStatus || null,
    ':changedBy': changedBy,
  });
  historyStmt.free();
};
