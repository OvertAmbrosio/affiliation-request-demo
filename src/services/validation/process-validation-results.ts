import type { Database } from 'sql.js';
import { AffiliationRequestStatus, ProviderResponseStatus } from '../../interfaces/enums.type';
import type { ValidationProviderResponse } from '../../interfaces/models';
import { USER_SYSTEM_UUID } from '../../utils/constants';
// Note: These imports will be updated once the other services are refactored.
import { addAutomaticObservationInTransaction } from '../affiliation-observation';
import { addHistoryEvent, updateAffiliationRequestStatusInTransaction } from '../affiliation-request';

/**
 * Processes all validation results for a given affiliation, and updates the
 * corresponding request status to Rejected, Observed, or Approved based on the outcomes.
 * This is the main orchestrator for the automated validation flow.
 * @param db The sql.js database instance.
 * @param requestId The ID of the affiliation request to process.
 * @returns A success or error object.
 */
export const processValidationResultsForRequest = (
  db: Database,
  requestId: number
): { success: boolean; error?: string } => {
  if (!db) return { success: false, error: 'Database not available' };

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Get request, affiliation, and config data
    const reqStmt = db.prepare(`
      SELECT ar.status as current_status, a.id as affiliation_id, arc.auto_approve
      FROM t_affiliation_request ar
      JOIN t_affiliation a ON ar.affiliation_id = a.id
      JOIN t_affiliation_request_config arc ON ar.request_config_id = arc.id
      WHERE ar.id = :id
    `);
    reqStmt.bind({ ':id': requestId });
    if (!reqStmt.step()) {
      throw new Error(`Request with ID ${requestId} not found.`);
    }
    const { current_status, affiliation_id, auto_approve } = reqStmt.getAsObject() as { current_status: AffiliationRequestStatus, affiliation_id: string, auto_approve: 0 | 1 };
    reqStmt.free();

    // 2. Get all validation responses for the affiliation
    const valStmt = db.prepare('SELECT * FROM t_validation_provider_response WHERE affiliation_id = :affId');
    valStmt.bind({ ':affId': affiliation_id });
    const validationResults: ValidationProviderResponse[] = [];
    while (valStmt.step()) {
      validationResults.push(valStmt.getAsObject() as unknown as ValidationProviderResponse);
    }
    valStmt.free();

    // 3. Analyze results: Check for errors first
    const errors = validationResults.filter(r => r.status === ProviderResponseStatus.Error);
    if (errors.length > 0) {
      updateAffiliationRequestStatusInTransaction(db, { requestId, newStatus: AffiliationRequestStatus.Rejected, changedBy: USER_SYSTEM_UUID });
      addHistoryEvent(db, { requestId, eventType: 'status_change', details: `Request automatically rejected due to validation errors: ${errors.map(e => e.validation_code).join(', ')}`, previousStatus: current_status, newStatus: AffiliationRequestStatus.Rejected, changedBy: USER_SYSTEM_UUID });
      db.exec('COMMIT;');
      return { success: true };
    }

    // 4. Analyze results: Check for conditions that trigger an observation
    const successfulValidations = validationResults.filter(r => r.status === ProviderResponseStatus.Success);
    const validationsToObserve: ValidationProviderResponse[] = [];

    for (const validation of successfulValidations) {
      if (validation.validation_code === 'PLAFT_RISK' && validation.response_json) {
        try {
          const response = JSON.parse(validation.response_json);
          if (response.risk_level === 'medium') {
            validationsToObserve.push(validation);
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    }

    if (validationsToObserve.length > 0) {
      for (const obs of validationsToObserve) {
        if (obs.validation_code) {
          const typeStmt = db.prepare('SELECT id FROM t_affiliation_observation_type WHERE code = :code');
          typeStmt.bind({ ':code': obs.validation_code });
          if (typeStmt.step()) {
            const typeId = typeStmt.getAsObject().id as number;
            addAutomaticObservationInTransaction(db, { requestId, observationTypeId: typeId, comment: obs.error_message ?? null });
          }
          typeStmt.free();
        }
      }
      updateAffiliationRequestStatusInTransaction(db, { requestId, newStatus: AffiliationRequestStatus.Observed, changedBy: USER_SYSTEM_UUID });
      addHistoryEvent(db, { requestId, eventType: 'status_change', details: `Request automatically observed due to validation results: ${validationsToObserve.map(o => o.validation_code).join(', ')}`, previousStatus: current_status, newStatus: AffiliationRequestStatus.Observed, changedBy: USER_SYSTEM_UUID });
      db.exec('COMMIT;');
      return { success: true };
    }

    // 5. All clear: Handle auto-approval
    if (auto_approve) {
      updateAffiliationRequestStatusInTransaction(db, { requestId, newStatus: AffiliationRequestStatus.Approved, changedBy: USER_SYSTEM_UUID });
      addHistoryEvent(db, { requestId, eventType: 'status_change', details: 'Request automatically approved based on product configuration.', previousStatus: current_status, newStatus: AffiliationRequestStatus.Approved, changedBy: USER_SYSTEM_UUID });
    } else {
      addHistoryEvent(db, { requestId, eventType: 'info_update', details: 'All validations passed. Request is pending manual review.', changedBy: USER_SYSTEM_UUID });
    }

    db.exec('COMMIT;');
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    const errorMsg = `Error in transaction: ${(err as Error).message}`;
    console.error(errorMsg, err);
    return { success: false, error: errorMsg };
  }
};
