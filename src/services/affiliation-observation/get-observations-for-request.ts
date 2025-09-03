import type { Database } from 'sql.js';
import type { AffiliationObservationView } from '../../interfaces/views';

/**
 * Retrieves all observations for a given affiliation request, enriching them
 * with details from the observation type table for UI display.
 * @param db The sql.js database instance.
 * @param requestId The ID of the affiliation request.
 * @returns An array of observations formatted for the view.
 */
export const getObservationsForRequest = (
  db: Database,
  requestId: number
): AffiliationObservationView[] => {
  if (!db) return [];

  const stmt = db.prepare(`
    SELECT
      ao.*,
      aot.code as observation_type_code,
      aot.type as type,
      aot.title as observation_type_title,
      aot.label as observation_type_label
    FROM t_affiliation_observation ao
    JOIN t_affiliation_observation_type aot ON ao.observation_type_id = aot.id
    WHERE ao.affiliation_request_id = :requestId
    ORDER BY ao.created_at DESC
  `);

  stmt.bind({ ':requestId': requestId });

  const results: AffiliationObservationView[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as AffiliationObservationView);
  }

  stmt.free();
  return results;
};
