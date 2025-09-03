import type { Database } from 'sql.js';
import type { AffiliationObservationCause, AffiliationObservationType } from '../../interfaces/models';

/**
 * Represents an observation type with its possible causes, used for manual selection.
 */
export type ManualObservationSelection = AffiliationObservationType & {
  causes: AffiliationObservationCause[];
};

/**
 * Retrieves all observation types and their associated causes from the database.
 * @param db The database instance.
 * @returns An array of observation types with their causes.
 */
export const getAllObservationTypesWithCauses = (db: Database): ManualObservationSelection[] => {
  const typesStmt = db.prepare(`
    SELECT id, code, title, label, type, is_active
    FROM t_affiliation_observation_type
    WHERE is_active = 1;
  `);

  const types: ManualObservationSelection[] = [];
  while (typesStmt.step()) {
    const type = typesStmt.getAsObject() as unknown as AffiliationObservationType;
    const causesStmt = db.prepare(`
      SELECT id, observation_type_id, label, is_active
      FROM t_affiliation_observation_cause
      WHERE observation_type_id = :typeId AND is_active = 1;
    `);
    causesStmt.bind({ ':typeId': type.id });

    const causes: AffiliationObservationCause[] = [];
    while (causesStmt.step()) {
      causes.push(causesStmt.getAsObject() as unknown as AffiliationObservationCause);
    }
    causesStmt.free();

    types.push({ ...type, causes });
  }
  typesStmt.free();

  return types;
};
