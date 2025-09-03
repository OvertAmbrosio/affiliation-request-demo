import type { Database } from 'sql.js';
import type { AffiliationRequestHistory } from '../../interfaces/models';

/**
 * Retrieves the status change history for a request.
 * @param db The sql.js database instance.
 * @param requestId The ID of the affiliation request.
 * @returns An array of history records for the request.
 */
export const getRequestHistory = (
  db: Database,
  requestId: number
): AffiliationRequestHistory[] => {
  if (!db) return [];

  const stmt = db.prepare(
    'SELECT * FROM t_affiliation_request_history WHERE affiliation_request_id = :id ORDER BY changed_at DESC'
  );
  stmt.bind({ ':id': requestId });

  const results: AffiliationRequestHistory[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as AffiliationRequestHistory);
  }

  stmt.free();
  return results;
};
