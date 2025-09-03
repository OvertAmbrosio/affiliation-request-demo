import type { Database } from 'sql.js';
import type { AffiliationListView } from '../../interfaces/views';

/**
 * Retrieves all affiliations, including those in progress or rejected during the sales flow.
 * @param db The database instance.
 * @returns An array of affiliations.
 */
export const getAllAffiliations = (db: Database): AffiliationListView[] => {
  const stmt = db.prepare(`
    SELECT
      a.*,
      mp.name as product_name
    FROM t_affiliation a
    JOIN t_mae_product mp ON a.product_id = mp.id
    ORDER BY a.created_at DESC;
  `);

  const affiliations: AffiliationListView[] = [];
  while (stmt.step()) {
    affiliations.push(stmt.getAsObject() as unknown as AffiliationListView);
  }
  stmt.free();

  return affiliations;
};
