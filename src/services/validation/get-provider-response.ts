import type { Database } from 'sql.js';

export const getProviderResponse = (
  db: Database,
  responseId: number
): string | null => {
  const stmt = db.prepare('SELECT response_json FROM t_validation_provider_response WHERE id = :id');
  stmt.bind({ ':id': responseId });

  let responseJson: string | null = null;
  if (stmt.step()) {
    const result = stmt.getAsObject();
    responseJson = result.response_json as string;
  }

  stmt.free();
  return responseJson;
};
