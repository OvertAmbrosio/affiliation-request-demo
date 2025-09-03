import type { Database } from 'sql.js';
import type { LogEntry } from '../../components/SimulationLog';
import { createAffiliationService } from '../flow/create-affiliation.service';
import { finalizeAffiliationService } from '../flow/finalize-affiliation.service';
import { runStepValidationService } from '../flow/run-step-validations.service';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Orchestrates the simulation of two standard affiliation processes 
 * (CulqiOnline with observations and CulqiFull auto-approved) in a single run.
 */
export const runStandardSimulations = async (
  db: Database,
  addLog: (level: LogEntry['level'], message: string) => void
): Promise<void> => {
  addLog('loading', 'Iniciando simulación estándar...');
  db.exec('BEGIN TRANSACTION;');
  await delay(500);

  try {
    // --- Simulación 1: CulqiOnline con Observaciones --- 
    addLog('info', '--- Iniciando Simulación 1: CulqiOnline con Observaciones ---');
    const culqiOnlineId = createAffiliationService(db, {
      businessName: 'Tienda Online de Ropa (Observada)',
      ruc: '20123456789',
      productId: 2, // CulqiOnline
      channelId: 1, // Digital
    });
    addLog('success', `Afiliación CulqiOnline #${culqiOnlineId} creada.`);
    await delay(500);

    // Validaciones para CulqiOnline
    runStepValidationService(db, { affiliationId: culqiOnlineId, validationCode: 'EQUIFAX_DOCUMENT_CHECK', status: 'approved', comment: 'Documento validado.', nextStep: 1 });
    runStepValidationService(db, { affiliationId: culqiOnlineId, validationCode: 'TERMS_ACCEPTANCE_VALIDATION', status: 'approved', comment: 'Términos aceptados.', nextStep: 2 });
    runStepValidationService(db, {
      affiliationId: culqiOnlineId,
      validationCode: 'PLAFT_RISK',
      status: 'observed',
      comment: 'Riesgo PLAFT medio detectado. Requiere revisión manual.',
      nextStep: 3,
    });
    await delay(500);

    // Finalizar y crear solicitud de revisión si hay observaciones

    addLog('warning', "Validación PLAFT para CulqiOnline resultó en 'OBSERVADO'.");
    runStepValidationService(db, {
      affiliationId: culqiOnlineId,
      validationCode: 'MATCH_VALIDATION',
      status: 'observed',
      comment: 'No se pudo completar la validación por error del proveedor (timeout).',
      nextStep: 3,
    });
    addLog('warning', "Validación MATCH para CulqiOnline resultó en 'OBSERVADO'.");
    runStepValidationService(db, { affiliationId: culqiOnlineId, validationCode: 'BANK_ACCOUNT_CHECK', status: 'approved', comment: 'Cuenta bancaria validada.', nextStep: 3 });

    const onlineRequestCreated = finalizeAffiliationService(db, culqiOnlineId);
    if (onlineRequestCreated) {
      addLog('success', `Solicitud de revisión para CulqiOnline #${culqiOnlineId} creada.`);
    } else {
      addLog('error', 'Error: Se esperaba una solicitud de revisión para CulqiOnline.');
    }
    addLog('info', '--- Simulación 1 Completada ---');
    await delay(1000);

    // --- Simulación 2: CulqiFull Auto-Aprobada --- 
    addLog('info', '--- Iniciando Simulación 2: CulqiFull Auto-Aprobada ---');
    const culqiFullId = createAffiliationService(db, {
      businessName: 'Restaurante Gourmet (Aprobado)',
      ruc: '20987654321',
      productId: 1, // CulqiFull
      channelId: 2, // Presencial
    });
    addLog('success', `Afiliación CulqiFull #${culqiFullId} creada.`);
    await delay(500);

    // Validaciones para CulqiFull (todas pasan)
    runStepValidationService(db, { affiliationId: culqiFullId, validationCode: 'EQUIFAX_DOCUMENT_CHECK', status: 'approved', comment: 'Documento validado.', nextStep: 1 });
    runStepValidationService(db, { affiliationId: culqiFullId, validationCode: 'TERMS_ACCEPTANCE_VALIDATION', status: 'approved', comment: 'Términos aceptados.', nextStep: 2 });
    runStepValidationService(db, { affiliationId: culqiFullId, validationCode: 'PLAFT_RISK', status: 'approved', comment: 'Sin riesgo PLAFT detectado.', nextStep: 3 });
    runStepValidationService(db, { affiliationId: culqiFullId, validationCode: 'MATCH_VALIDATION', status: 'approved', comment: 'Sin coincidencias en lista MATCH.', nextStep: 3 });
    runStepValidationService(db, { affiliationId: culqiFullId, validationCode: 'BANK_ACCOUNT_CHECK', status: 'observed', comment: 'Error de comunicación con el banco.', nextStep: 3 });

    const fullRequestCreated = finalizeAffiliationService(db, culqiFullId);
    if (!fullRequestCreated) {
      addLog('success', `CulqiFull #${culqiFullId} fue auto-aprobada, no se creó solicitud.`);
    } else {
      addLog('error', 'Error: No se esperaba una solicitud de revisión para CulqiFull.');
    }
    addLog('info', '--- Simulación 2 Completada ---');

    db.exec('COMMIT;');
    addLog('success', 'Transacción completada. Ambas simulaciones confirmadas.');

  } catch (error) {
    db.exec('ROLLBACK;');
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    addLog('error', `Error en la simulación: ${errorMessage}`);
    console.error('Simulation Error:', error);
    throw error; // Re-throw to be caught by the UI handler
  }
};
