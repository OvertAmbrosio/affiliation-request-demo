import type { Database } from 'sql.js';
import type { AffiliationRequestDetailView } from '../../interfaces/views';

/**
 * Retrieves a specific affiliation request by its ID, formatted for detailed display.
 * @param db The sql.js database instance.
 * @param id The ID of the affiliation request.
 * @returns A detailed affiliation request view or null if not found.
 */
export const getAffiliationRequestDetail = (
  db: Database,
  id: number
): AffiliationRequestDetailView | null => {
  if (!db) return null;

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
      p.name as product_name,
      EXISTS (
        SELECT 1
        FROM t_product_observation_type pot
        JOIN t_affiliation_observation_type aot ON pot.observation_type_id = aot.id
        WHERE pot.product_id = a.product_id AND aot.type = 'manual'
      ) as can_be_observed
    FROM t_affiliation_request ar
    JOIN t_affiliation a ON ar.affiliation_id = a.id
    JOIN t_mae_product p ON a.product_id = p.id
    WHERE ar.id = :id
  `);

  stmt.bind({ ':id': id });

  let request: AffiliationRequestDetailView | null = null;
  if (stmt.step()) {
    request = stmt.getAsObject() as unknown as AffiliationRequestDetailView;
  }
  stmt.free();

  // If no request is found, return null immediately.
  if (!request) {
    return null;
  }

  // 2. Get all validation results for this affiliation.
  const validationStmt = db.prepare(`
    SELECT
      vr.id, vr.code, vr.affiliation_id, vr.observation_type_id, vr.status, vr.comment,
      vr.created_at, vr.updated_at,
      ot.label as observation_type_label
    FROM t_affiliation_validation_result vr
    LEFT JOIN t_affiliation_observation_type ot ON vr.observation_type_id = ot.id
    WHERE vr.affiliation_id = :affiliationId
  `);
  validationStmt.bind({ ':affiliationId': request.affiliation_id });

  request.validations = [];
  while (validationStmt.step()) {
    request.validations.push(validationStmt.getAsObject() as any);
  }
  validationStmt.free();

  return request;
};
