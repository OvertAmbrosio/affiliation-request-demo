import type { Database } from 'sql.js';

export interface CreateAffiliationParams {
  businessName: string;
  ruc: string;
  productId: number;
  channelId: number;
}

/**
 * Creates a new affiliation record in the database.
 * @param db The database instance.
 * @param params The parameters for creating the affiliation.
 * @returns The ID of the newly created affiliation.
 */
export const createAffiliationService = (db: Database, params: CreateAffiliationParams): string => {
  // Generate a more realistic, unique string-based ID for the affiliation.
  const newAffiliationId = `aff_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // For simulation, we'll use a mock customer ID.
  const customerId = `cus_${Math.random().toString(36).substring(2, 10)}`;

  db.run(
    'INSERT INTO t_affiliation (id, customer_id, business_name, ruc, status, current_step, product_id, channel_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      newAffiliationId,
      customerId,
      params.businessName,
      params.ruc,
      'pending', // Initial status
      0, // Initial step
      params.productId,
      params.channelId,
      'system_simulation' // Actor
    ]
  );

  return newAffiliationId;
};
