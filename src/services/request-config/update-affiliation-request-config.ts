import type { Database } from 'sql.js';

/**
 * Updates the auto_approve status for a specific affiliation request configuration.
 * @param db The database instance.
 * @param configId The ID of the configuration to update.
 * @param newStatus The new auto_approve status.
 */
export const updateAffiliationRequestConfig = (db: Database, configId: number, newStatus: boolean) => {
  try {
    const stmt = db.prepare(`
      UPDATE t_affiliation_request_config
      SET auto_approve = :newStatus
      WHERE id = :configId;
    `);
    stmt.run({ ':newStatus': newStatus ? 1 : 0, ':configId': configId });
    stmt.free();
  } catch (error) {
    console.error('Failed to update affiliation request config:', error);
    throw error;
  }
};
