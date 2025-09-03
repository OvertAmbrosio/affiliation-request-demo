import type { Database } from 'sql.js';
import type { ManualObservationSelectionView } from '../../interfaces/views';

/**
 * Retrieves all manual observation types available for a given product, including their potential causes.
 * This is used to populate UI selectors for adding manual observations.
 * @param db The sql.js database instance.
 * @param productId The ID of the product.
 * @returns An array of manual observation types structured for selection in the view.
 */
export const getManualObservationTypesForProduct = (
  db: Database,
  productId: number
): ManualObservationSelectionView[] => {
  if (!db) return [];

  // 1. Get all manual observation types for the product
  const typesStmt = db.prepare(`
    SELECT aot.*
    FROM t_affiliation_observation_type aot
    JOIN t_product_observation_type pot ON aot.id = pot.observation_type_id
    WHERE pot.product_id = :productId AND aot.type = 'manual' AND aot.is_active = 1
  `);
  typesStmt.bind({ ':productId': productId });

  const observationTypes: ManualObservationSelectionView[] = [];
  while (typesStmt.step()) {
    const type = typesStmt.getAsObject() as unknown as ManualObservationSelectionView;
    type.causes = []; // Initialize causes array
    observationTypes.push(type);
  }
  typesStmt.free();

  if (observationTypes.length === 0) {
    return [];
  }

  // 2. Get all causes for these observation types
  const typeIds = observationTypes.map(t => t.id);
  const placeholders = typeIds.map(() => '?').join(',');
  const causesStmt = db.prepare(`
    SELECT *
    FROM t_affiliation_observation_cause
    WHERE observation_type_id IN (${placeholders}) AND is_active = 1
  `);
  
  causesStmt.bind(typeIds);

  // 3. Map causes back to their parent observation types
  while (causesStmt.step()) {
    const cause = causesStmt.getAsObject() as any; 
    const parentType = observationTypes.find(t => t.id === cause.observation_type_id);
    if (parentType) {
      parentType.causes.push(cause);
    }
  }
  causesStmt.free();

  return observationTypes;
};
