import type { Database } from 'sql.js';
import type { AffiliationRequestListView } from '../../interfaces/views';

/**
 * Retrieves all affiliation requests with their associated business data,
 * formatted for list display in the UI.
 * @param db The sql.js database instance.
 * @returns An array of affiliation requests ready for the view.
 */
export const getAffiliationRequests = (db: Database): AffiliationRequestListView[] => {
  if (!db) return [];

  const stmt = db.prepare(`
    SELECT
      ar.id,
      ar.affiliation_id,
      ar.request_config_id,
      ar.status,
      ar.created_by,
      ar.reviewed_by,
      ar.reviewed_at,
      ar.created_at,
      ar.updated_at,
      a.ruc,
      a.product_id,
      a.business_name,
      p.name as product_name
    FROM t_affiliation_request ar
    JOIN t_affiliation a ON ar.affiliation_id = a.id
    JOIN t_mae_product p ON a.product_id = p.id
    ORDER BY ar.created_at DESC
  `);

  const requests: AffiliationRequestListView[] = [];
  while (stmt.step()) {
    requests.push(stmt.getAsObject() as unknown as AffiliationRequestListView);
  }

  stmt.free();
  return requests;
};
