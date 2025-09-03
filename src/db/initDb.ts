import initSqlJs, { type Database } from 'sql.js';
import { CULQI_FULL_PRODUCT_ID, CULQI_LINK_PRODUCT_ID, CULQI_ONLINE_PRODUCT_ID } from '../utils/constants';

// Constants for Observation Type IDs to avoid magic numbers in seed data
const WEB_NO_ECOMMERCE_ID = 3;
const WEB_INCOMPLETE_ID = 4;

/**
 * Creates the database schema by dropping existing tables and creating new ones.
 * @param db The sql.js database instance.
 */
const _createSchema = (db: Database) => {
  // Drop tables in reverse order of dependency to avoid foreign key constraints
  db.exec(`
    DROP TABLE IF EXISTS t_affiliation_validation_history;
    DROP TABLE IF EXISTS t_affiliation_validation_result;
    DROP TABLE IF EXISTS t_validation_provider_response;
    DROP TABLE IF EXISTS t_affiliation_request_history;
    DROP TABLE IF EXISTS t_affiliation_observation_selected_cause;
    DROP TABLE IF EXISTS t_affiliation_observation;
    DROP TABLE IF EXISTS t_affiliation_observation_cause;
    DROP TABLE IF EXISTS t_product_observation_type;
    DROP TABLE IF EXISTS t_affiliation_observation_type;
    DROP TABLE IF EXISTS t_affiliation_request;
    DROP TABLE IF EXISTS t_affiliation_request_config;
    DROP TABLE IF EXISTS t_affiliation;
    DROP TABLE IF EXISTS t_mae_product;
  `);

  // Create tables
  db.exec(`
    CREATE TABLE t_mae_product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE t_affiliation (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      channel_id INTEGER NOT NULL,
      ruc TEXT,
      business_name TEXT,
      status TEXT, -- pending | approved | rejected | observed
      current_step INTEGER,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES t_mae_product(id)
    );

    CREATE TABLE t_affiliation_request_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      auto_approve BOOLEAN,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES t_mae_product(id)
    );

    CREATE TABLE t_affiliation_request (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliation_id TEXT NOT NULL,
      request_config_id INTEGER NOT NULL,
      status TEXT,
      created_by TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (affiliation_id) REFERENCES t_affiliation(id),
      FOREIGN KEY (request_config_id) REFERENCES t_affiliation_request_config(id)
    );

    CREATE TABLE t_affiliation_observation_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      type TEXT NOT NULL, -- manual | system
      label TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE t_product_observation_type (
      product_id INTEGER NOT NULL,
      observation_type_id INTEGER NOT NULL,
      PRIMARY KEY (product_id, observation_type_id),
      FOREIGN KEY (product_id) REFERENCES t_mae_product(id),
      FOREIGN KEY (observation_type_id) REFERENCES t_affiliation_observation_type(id)
    );

    CREATE TABLE t_affiliation_observation_cause (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      observation_type_id INTEGER NOT NULL,
      label TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (observation_type_id) REFERENCES t_affiliation_observation_type(id)
    );

    CREATE TABLE t_affiliation_observation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliation_request_id INTEGER NOT NULL,
      observation_type_id INTEGER NOT NULL,
      comment TEXT,
      status TEXT NOT NULL, -- pending | approved | rejected | ignored
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (affiliation_request_id) REFERENCES t_affiliation_request(id),
      FOREIGN KEY (observation_type_id) REFERENCES t_affiliation_observation_type(id)
    );

    CREATE TABLE t_affiliation_observation_selected_cause (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliation_observation_id INTEGER NOT NULL,
      observation_cause_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (affiliation_observation_id) REFERENCES t_affiliation_observation(id),
      FOREIGN KEY (observation_cause_id) REFERENCES t_affiliation_observation_cause(id)
    );

    CREATE TABLE t_affiliation_request_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliation_request_id INTEGER NOT NULL,
      event_type TEXT,
      details TEXT,
      previous_status TEXT,
      new_status TEXT,
      changed_by TEXT,
      changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (affiliation_request_id) REFERENCES t_affiliation_request(id)
    );

    CREATE TABLE t_validation_provider_response (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_code TEXT,
      validation_code TEXT,
      document_number TEXT,
      document_type TEXT,
      account_number TEXT,
      product_id TEXT,
      channel_id TEXT,
      status TEXT, -- success | error
      error_message TEXT,
      error_code TEXT,
      response_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE t_affiliation_validation_result (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      affiliation_id TEXT NOT NULL,
      observation_type_id INTEGER NOT NULL,
      status TEXT, -- passed | failed | observed
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (affiliation_id) REFERENCES t_affiliation(id),
      FOREIGN KEY (observation_type_id) REFERENCES t_affiliation_observation_type(id),
      UNIQUE (affiliation_id, observation_type_id)
    );

    CREATE TABLE t_affiliation_validation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      validation_result_id INTEGER NOT NULL,
      provider_response_id INTEGER,
      attempt_number INTEGER,
      status TEXT, -- passed | failed | observed
      comment TEXT,
      triggered_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (validation_result_id) REFERENCES t_affiliation_validation_result(id),
      FOREIGN KEY (provider_response_id) REFERENCES t_validation_provider_response(id)
    );
  `);
};

/**
 * Seeds the database with initial data for products, configurations, and observations.
 * @param db The sql.js database instance.
 */
const _seedData = (db: Database) => {
  // 1. Seed Products
  db.exec(`
    INSERT INTO t_mae_product (id, name) VALUES
      (${CULQI_ONLINE_PRODUCT_ID}, 'CulqiOnline'),
      (${CULQI_FULL_PRODUCT_ID}, 'CulqiFull'),
      (${CULQI_LINK_PRODUCT_ID}, 'CulqiLink');
  `);

  // 2. Seed Request Configurations
  db.exec(`
    INSERT INTO t_affiliation_request_config (product_id, auto_approve) VALUES
      (${CULQI_ONLINE_PRODUCT_ID}, 0), -- CulqiOnline requires manual review
      (${CULQI_FULL_PRODUCT_ID}, 1),   -- CulqiFull is auto-approved if no observations
      (${CULQI_LINK_PRODUCT_ID}, 1);    -- CulqiLink is auto-approved
  `);

  // 3. Seed Observation Types
  db.exec(`
    INSERT INTO t_affiliation_observation_type (id, code, title, type, label) VALUES
      (1, 'PLAFT_RISK', 'Alto riesgo según listas PLAFT', 'system', 'Riesgo PLAFT'),
      (2, 'BLACKLIST_MATCH', 'Coincidencia en listas negras internas', 'system', 'Listas Negras'),
      (3, 'WEB_NO_ECOMMERCE', 'Página web no es un e-commerce', 'manual', 'Web sin E-commerce'),
      (4, 'WEB_INCOMPLETE', 'Página web incompleta o en construcción', 'manual', 'Web Incompleta'),
      (5, 'RUC_INVALID', 'Estado de RUC no es ACTIVO o HABIDO', 'system', 'Estado RUC Inválido'),
      (6, 'CREDIT_HISTORY_NEGATIVE', 'Historial crediticio negativo o insuficiente', 'system', 'Historial Crediticio'),
      (7, 'BANK_ACCOUNT_CHECK', 'Cuenta bancaria no pudo ser validada', 'system', 'Cuenta Bancaria Inválida'),
      (8, 'EQUIFAX_DOCUMENT_CHECK', 'Verificación de documentos', 'system', 'Equifax Document Check'),
      (9, 'TERMS_ACCEPTANCE_VALIDATION', 'Aceptación de términos y condiciones', 'system', 'Aceptación de Términos y Condiciones'),
      (10, 'MATCH_VALIDATION', 'Coincidencia en listas negras internas', 'system', 'Listas Negras');
  `);

  // 4. Link Observation Types to Products
  db.exec(`
    INSERT INTO t_product_observation_type (product_id, observation_type_id) VALUES
      -- Core automatic observations for ALL products
      (${CULQI_ONLINE_PRODUCT_ID}, 1), (${CULQI_FULL_PRODUCT_ID}, 1), (${CULQI_LINK_PRODUCT_ID}, 1), -- PLAFT
      (${CULQI_ONLINE_PRODUCT_ID}, 2), (${CULQI_FULL_PRODUCT_ID}, 2), (${CULQI_LINK_PRODUCT_ID}, 2), -- Blacklist
      (${CULQI_ONLINE_PRODUCT_ID}, 5), (${CULQI_FULL_PRODUCT_ID}, 5), (${CULQI_LINK_PRODUCT_ID}, 5), -- RUC
      (${CULQI_ONLINE_PRODUCT_ID}, 6), (${CULQI_FULL_PRODUCT_ID}, 6), (${CULQI_LINK_PRODUCT_ID}, 6), -- Credit History
      (${CULQI_ONLINE_PRODUCT_ID}, 7), (${CULQI_FULL_PRODUCT_ID}, 7), (${CULQI_LINK_PRODUCT_ID}, 7), -- Bank Account
      (${CULQI_ONLINE_PRODUCT_ID}, 8), (${CULQI_FULL_PRODUCT_ID}, 8), (${CULQI_LINK_PRODUCT_ID}, 8), -- Equifax Document Check
      (${CULQI_ONLINE_PRODUCT_ID}, 9), (${CULQI_FULL_PRODUCT_ID}, 9), (${CULQI_LINK_PRODUCT_ID}, 9), -- Terms Acceptance

      -- Web-specific observations for Online & Link
      (${CULQI_ONLINE_PRODUCT_ID}, 3), (${CULQI_LINK_PRODUCT_ID}, 3),
      (${CULQI_ONLINE_PRODUCT_ID}, 4), (${CULQI_LINK_PRODUCT_ID}, 4);
  `);

  // 5. Seed Observation Causes for manual types
  db.exec(`
    -- For 'WEB_NO_ECOMMERCE'
    INSERT INTO t_affiliation_observation_cause (observation_type_id, label) VALUES
      (${WEB_NO_ECOMMERCE_ID}, 'No tiene carrito de compras'),
      (${WEB_NO_ECOMMERCE_ID}, 'El carrito no funciona o está vacío'),
      (${WEB_NO_ECOMMERCE_ID}, 'Los productos no tienen precio o descripción'),

    -- For 'WEB_INCOMPLETE'
      (${WEB_INCOMPLETE_ID}, 'No tiene políticas de privacidad o T&C'),
      (${WEB_INCOMPLETE_ID}, 'Los enlaces de contacto están rotos'),
      (${WEB_INCOMPLETE_ID}, 'El diseño parece de prueba o "lorem ipsum"');
  `);
};

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  });

  const db = new SQL.Database();

  // Enable foreign key support
  db.exec("PRAGMA foreign_keys = ON;");

  // Create the database schema
  _createSchema(db);

  // Seed the database with initial data
  _seedData(db);

  return db;
}
// 271