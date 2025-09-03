import type { Database } from 'sql.js';
import type { AffiliationDetail, AffiliationValidationResultDetail } from '../../interfaces/models';

/**
 * Fetches all details for a specific affiliation, including its validation results.
 * @param db The database instance.
 * @param id The ID of the affiliation to fetch.
 * @returns An AffiliationDetail object or null if not found.
 */
export const getAffiliationDetailById = (db: Database, id: string): AffiliationDetail | null => {
  // 1. Get the main affiliation data using a prepared statement for safety and efficiency.
  const affiliationStmt = db.prepare(`
    SELECT
      a.id, a.customer_id, a.product_id, a.channel_id, a.ruc, a.business_name,
      a.status, a.current_step, a.created_at, a.updated_at,
      p.name as product_name,
      ar.id as affiliation_request_id
    FROM t_affiliation a
    LEFT JOIN t_mae_product p ON a.product_id = p.id
    LEFT JOIN t_affiliation_request ar ON ar.affiliation_id = a.id
    WHERE a.id = :id
  `);
  affiliationStmt.bind({ ':id': id });

  // If no affiliation is found, step() will be false.
  if (!affiliationStmt.step()) {
    affiliationStmt.free(); // Always free the statement to avoid memory leaks.
    return null;
  }

  const affiliationData = affiliationStmt.getAsObject();
  affiliationStmt.free();

  // 2. Get all validation results for this affiliation.
  const validationStmt = db.prepare(`
    SELECT
      vr.id, vr.code, vr.affiliation_id, vr.observation_type_id, vr.status, vr.comment,
      vr.created_at, vr.updated_at,
      ot.label as observation_type_label
    FROM t_affiliation_validation_result vr
    LEFT JOIN t_affiliation_observation_type ot ON vr.observation_type_id = ot.id
    WHERE vr.affiliation_id = :id
  `);
  validationStmt.bind({ ':id': id });

  const validations: AffiliationValidationResultDetail[] = [];
  while (validationStmt.step()) {
    validations.push(validationStmt.getAsObject() as unknown as AffiliationValidationResultDetail);
  }
  validationStmt.free();

  // 3. Combine into a single, structured object for the UI.
  const affiliationDetail: AffiliationDetail = {
    ...(affiliationData as any), // Cast to any to merge properties
    affiliation_request_id: affiliationData.affiliation_request_id as number | null,
    validations: validations,
    channel_name: 'Web', // Placeholder, can be made dynamic later
  };

  return affiliationDetail;
};
