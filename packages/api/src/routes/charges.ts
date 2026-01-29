/**
 * Charge Capture and Coding Routes
 * REST API endpoints for charge management and code lookups
 */

import { Router } from 'express';
import {
  // Charge operations
  createCharge,
  getCharge,
  getChargesByEncounter,
  updateCharge,
  deleteCharge,
  validateCharge,
  auditCharge,
  calculateChargeAmount,
  createChargesBatch,
  validateChargesBatch,

  // Code lookups
  searchCPTCodes,
  getCPTCodeDetails,
  searchICD10Codes,
  getICD10CodeDetails,
  searchRevenueCodesEndpoint,
  getRevenueCodeDetails,
} from '../controllers/chargeController.js';

export const chargesRouter = Router();

// ============================================================================
// Charge Management Routes
// ============================================================================

/**
 * POST /api/charges
 * Create a new charge
 *
 * Body:
 * - encounterId: string (required) - The encounter ID
 * - cptCode: string (required) - CPT procedure code
 * - icdCodes: string[] (required) - Array of ICD-10 diagnosis codes
 * - revenueCode: string (optional) - UB-04 revenue code
 * - units: number (optional, default: 1) - Number of units
 * - modifiers: string[] (optional) - Array of modifiers
 * - serviceDate: string (required) - Date of service (ISO format)
 * - providerId: string (optional) - Provider ID
 * - placeOfService: string (optional) - Place of service code
 * - notes: string (optional) - Additional notes
 */
chargesRouter.post('/', createCharge);

/**
 * GET /api/charges/:id
 * Get a charge by ID
 */
chargesRouter.get('/:id', getCharge);

/**
 * GET /api/charges/encounter/:encounterId
 * Get all charges for an encounter
 */
chargesRouter.get('/encounter/:encounterId', getChargesByEncounter);

/**
 * PUT /api/charges/:id
 * Update a charge
 *
 * Body: Same fields as POST (all optional)
 */
chargesRouter.put('/:id', updateCharge);

/**
 * DELETE /api/charges/:id
 * Delete a charge (soft delete)
 */
chargesRouter.delete('/:id', deleteCharge);

/**
 * POST /api/charges/validate
 * Validate a charge without creating it
 *
 * Body: Same as POST /charges
 *
 * Returns validation result with errors, warnings, and medical necessity check
 */
chargesRouter.post('/validate', validateCharge);

/**
 * POST /api/charges/:id/audit
 * Audit a charge for compliance issues
 *
 * Returns audit findings, risk score, and recommendations
 */
chargesRouter.post('/:id/audit', auditCharge);

/**
 * POST /api/charges/calculate
 * Calculate charge amount based on fee schedule
 *
 * Body:
 * - cptCode: string (required) - CPT code
 * - modifiers: string[] (optional) - Modifiers
 * - units: number (optional, default: 1) - Units
 *
 * Returns calculated amount with RVU breakdown
 */
chargesRouter.post('/calculate', calculateChargeAmount);

/**
 * POST /api/charges/batch
 * Create multiple charges at once
 *
 * Body:
 * - charges: ChargeInput[] - Array of charge objects (max 100)
 *
 * Returns success/failure for each charge
 */
chargesRouter.post('/batch', createChargesBatch);

/**
 * POST /api/charges/batch/validate
 * Validate multiple charges at once
 *
 * Body:
 * - charges: ChargeInput[] - Array of charge objects (max 100)
 *
 * Returns validation results for each charge
 */
chargesRouter.post('/batch/validate', validateChargesBatch);

// ============================================================================
// Code Lookup Routes
// ============================================================================

/**
 * GET /api/codes/cpt/search
 * Search CPT codes
 *
 * Query params:
 * - q: string (optional) - Search query (code or description)
 * - category: string (optional) - CPT category filter
 * - limit: number (optional, default: 50, max: 100) - Result limit
 *
 * Either q or category is required
 */
chargesRouter.get('/codes/cpt/search', searchCPTCodes);

/**
 * GET /api/codes/cpt/:code
 * Get a specific CPT code with full details
 */
chargesRouter.get('/codes/cpt/:code', getCPTCodeDetails);

/**
 * GET /api/codes/icd10/search
 * Search ICD-10 codes
 *
 * Query params:
 * - q: string (optional) - Search query (code or description)
 * - category: string (optional) - ICD-10 category filter
 * - limit: number (optional, default: 50, max: 100) - Result limit
 *
 * Either q or category is required
 */
chargesRouter.get('/codes/icd10/search', searchICD10Codes);

/**
 * GET /api/codes/icd10/:code
 * Get a specific ICD-10 code with full details
 */
chargesRouter.get('/codes/icd10/:code', getICD10CodeDetails);

/**
 * GET /api/codes/revenue/search
 * Search UB-04 revenue codes
 *
 * Query params:
 * - q: string (optional) - Search query (code or description)
 * - category: string (optional) - Revenue code category filter
 * - limit: number (optional, default: 50, max: 100) - Result limit
 *
 * Either q or category is required
 */
chargesRouter.get('/codes/revenue/search', searchRevenueCodesEndpoint);

/**
 * GET /api/codes/revenue/:code
 * Get a specific revenue code with full details
 */
chargesRouter.get('/codes/revenue/:code', getRevenueCodeDetails);
