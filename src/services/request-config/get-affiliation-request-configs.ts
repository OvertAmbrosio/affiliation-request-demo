import type { Database } from 'sql.js';
import type { AffiliationRequestConfigView } from '../../interfaces/views';

/**
 * Retrieves all affiliation request configurations along with their product names.
 * @param db The database instance.
 * @returns An array of affiliation request configurations.
 */
export const getAffiliationRequestConfigs = (db: Database): AffiliationRequestConfigView[] => {
  const stmt = db.prepare(`
    SELECT
      arc.id,
      mp.name AS product_name,
      arc.auto_approve
    FROM t_affiliation_request_config arc
    JOIN t_mae_product mp ON arc.product_id = mp.id;
  `);

  const configs: AffiliationRequestConfigView[] = [];
  while (stmt.step()) {
    configs.push(stmt.getAsObject() as unknown as AffiliationRequestConfigView);
  }
  stmt.free();

  return configs;
};
