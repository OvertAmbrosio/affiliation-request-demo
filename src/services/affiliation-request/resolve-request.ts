import type { Database } from 'sql.js';

export interface ResolveRequestParams {
  requestId: number;
  newStatus: 'approved' | 'rejected';
  resolvedBy: string;
}

export const resolveRequestService = (
  db: Database,
  params: ResolveRequestParams
): { success: boolean; error?: string } => {
  const { requestId, newStatus, resolvedBy } = params;

  db.exec('BEGIN TRANSACTION;');
  try {
    const reqStmt = db.prepare('SELECT status, affiliation_id FROM t_affiliation_request WHERE id = :id');
    reqStmt.bind({ ':id': requestId });

    let request: { status: string; affiliation_id: string } | null = null;
    if (reqStmt.step()) {
      request = reqStmt.getAsObject() as { status: string; affiliation_id: string };
    }
    reqStmt.free();

    if (!request) {
      throw new Error(`Request with ID ${requestId} not found.`);
    }

    const previousStatus = request.status;

    if (previousStatus === 'approved' || previousStatus === 'rejected') {
        return { success: false, error: 'La solicitud ya ha sido finalizada.' };
    }

    db.run('UPDATE t_affiliation_request SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?', [
      newStatus,
      resolvedBy,
      requestId,
    ]);

    db.run(`UPDATE t_affiliation SET status = ? WHERE id = ?`, [newStatus, request.affiliation_id]);

    db.run(
      'INSERT INTO t_affiliation_request_history (affiliation_request_id, event_type, details, previous_status, new_status, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
      [
        requestId,
        'status_change',
        `Request manually reviewed and set to ${newStatus}`,
        previousStatus,
        newStatus,
        resolvedBy,
      ]
    );

    db.exec('COMMIT;');
    return { success: true };

  } catch (e) {
    db.exec('ROLLBACK;');
    const error = e instanceof Error ? e.message : 'An unknown error occurred';
    console.error(`Failed to resolve request: ${error}`);
    return { success: false, error };
  }
};
