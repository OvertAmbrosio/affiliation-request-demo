import type { Database } from 'sql.js';

/**
 * Rejects a specific affiliation observation by updating its status to 'rejected'.
 * This is a terminal status for an observation that cannot be retried or approved.
 *
 * @param db The database instance.
 * @param observationId The ID of the observation to reject.
 */
export const rejectObservation = (db: Database, observationId: number) => {
  try {
    db.run(
      'UPDATE t_affiliation_observation SET status = ?, updated_at = ? WHERE id = ?',
      ['rejected', new Date().toISOString(), observationId]
    );
  } catch (error) {
    console.error(`Failed to reject observation ${observationId}:`, error);
    throw new Error(`Failed to reject observation ${observationId}.`);
  }
};
