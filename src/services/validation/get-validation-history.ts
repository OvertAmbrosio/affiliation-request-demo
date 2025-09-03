import type { Database } from 'sql.js';
import type { ValidationHistoryView } from '../../interfaces/views';

export const getValidationHistory = (
  db: Database,
  validationResultId: number
): ValidationHistoryView[] => {
  const historyStmt = db.prepare(`
    SELECT
      h.id,
      h.validation_result_id,
      h.status,
      h.comment,
      h.created_at,
      p.response_json
    FROM t_affiliation_validation_history h
    LEFT JOIN t_validation_provider_response p ON h.provider_response_id = p.id
    WHERE h.validation_result_id = :validationResultId
    ORDER BY h.created_at DESC
  `);

  historyStmt.bind({ ':validationResultId': validationResultId });

  const history: ValidationHistoryView[] = [];
  while (historyStmt.step()) {
    const row = historyStmt.getAsObject();
    history.push({
      ...row,
      response_json: row.response_json ? JSON.parse(row.response_json as string) : null,
    } as ValidationHistoryView);
  }

  historyStmt.free();
  return history;
};
