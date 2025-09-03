import type { Database } from 'sql.js';

interface AddObservationTypeParams {
  code: string;
  label: string;
  description: string;
  type: 'manual' | 'system';
  causes: { label: string }[];
}

/**
 * Adds a new observation type along with its causes to the database.
 * @param db The database instance.
 * @param params The parameters for the new observation type.
 * @returns An object indicating success or failure.
 */
export const addObservationTypeWithCauses = (db: Database, params: AddObservationTypeParams) => {
  const { code, label, description, type, causes } = params;

  db.exec('BEGIN TRANSACTION;');
  try {
    const typeStmt = db.prepare(`
      INSERT INTO t_affiliation_observation_type (code, label, description, type, is_active)
      VALUES (:code, :label, :description, :type, 1);
    `);
    typeStmt.run({ ':code': code, ':label': label, ':description': description, ':type': type });
    typeStmt.free();

    const typeId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

    if (causes && causes.length > 0) {
      const causeStmt = db.prepare(`
        INSERT INTO t_affiliation_observation_cause (observation_type_id, label, is_active)
        VALUES (:observation_type_id, :label, 1);
      `);
      for (const cause of causes) {
        if (cause.label.trim()) {
          causeStmt.run({ ':observation_type_id': typeId, ':label': cause.label });
        }
      }
      causeStmt.free();
    }

    db.exec('COMMIT;');
    return { success: true };
  } catch (error) {
    db.exec('ROLLBACK;');
    console.error('Failed to add observation type with causes:', error);
    throw error;
  }
};
