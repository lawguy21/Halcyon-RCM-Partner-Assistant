// @ts-nocheck
/**
 * Clearinghouse API Routes
 * REST endpoints for clearinghouse operations
 */

import { Router, type Request, type Response } from 'express';
import { clearinghouseController } from '../controllers/clearinghouseController.js';

export const clearinghouseRouter = Router();

// ============================================================================
// Claim Submission Routes
// ============================================================================

/**
 * POST /api/clearinghouse/submit
 * Submit claims to clearinghouse
 *
 * Body:
 * - claimIds: string[] - Array of claim IDs to submit
 * - organizationId?: string - Organization ID (optional if claims have org)
 * - clearinghouseConfigId?: string - Specific clearinghouse to use
 * - priority?: 'normal' | 'high' | 'urgent' - Submission priority
 *
 * Response:
 * - transactionId: string - Clearinghouse transaction ID
 * - summary: { accepted, rejected, pending, total }
 * - errors: string[] - Any error messages
 */
clearinghouseRouter.post('/submit', async (req: Request, res: Response) => {
  await clearinghouseController.submitClaims(req, res);
});

// ============================================================================
// Claim Status Routes
// ============================================================================

/**
 * GET /api/clearinghouse/status/:claimId
 * Get status of a specific claim
 *
 * Params:
 * - claimId: string - Claim ID
 *
 * Query:
 * - organizationId?: string - Organization ID
 * - clearinghouseConfigId?: string - Clearinghouse config ID
 *
 * Response:
 * - claimId, claimNumber, status, dates, amounts, denial info
 */
clearinghouseRouter.get('/status/:claimId', async (req: Request, res: Response) => {
  await clearinghouseController.checkStatus(req, res);
});

/**
 * POST /api/clearinghouse/status/refresh
 * Trigger real-time status refresh for claims
 *
 * Body:
 * - claimIds: string[] - Array of claim IDs to refresh
 *
 * Response:
 * - checked: number - Claims checked
 * - updated: number - Claims updated
 * - errors: number - Errors encountered
 */
clearinghouseRouter.post('/status/refresh', async (req: Request, res: Response) => {
  await clearinghouseController.refreshStatus(req, res);
});

// ============================================================================
// Eligibility Routes
// ============================================================================

/**
 * POST /api/clearinghouse/eligibility
 * Verify patient eligibility with payer
 *
 * Body:
 * - patientId: string - Patient/Assessment ID
 * - payerId: string - Payer ID
 * - organizationId?: string - Organization ID
 * - clearinghouseConfigId?: string - Specific clearinghouse
 * - serviceType?: string - Service type code (default: '30')
 * - dateOfService?: string - Date of service (ISO 8601)
 * - providerNpi?: string - Provider NPI for network check
 *
 * Response:
 * - active: boolean - Coverage active
 * - coverageDetails, copay, deductible, coinsurance, etc.
 */
clearinghouseRouter.post('/eligibility', async (req: Request, res: Response) => {
  await clearinghouseController.verifyEligibility(req, res);
});

// ============================================================================
// Remittance Routes
// ============================================================================

/**
 * GET /api/clearinghouse/remittances
 * Get available Electronic Remittance Advice records
 *
 * Query:
 * - startDate?: string - Filter start date (ISO 8601)
 * - endDate?: string - Filter end date (ISO 8601)
 * - organizationId?: string - Filter by organization
 * - clearinghouseConfigId?: string - Filter by clearinghouse
 * - limit?: number - Max results (default 50, max 100)
 * - offset?: number - Pagination offset
 *
 * Response:
 * - remittances: array of ERA records
 * - pagination: { total, limit, offset }
 */
clearinghouseRouter.get('/remittances', async (req: Request, res: Response) => {
  await clearinghouseController.getRemittances(req, res);
});

/**
 * POST /api/clearinghouse/remittances/download
 * Trigger ERA download from clearinghouses
 *
 * Body:
 * - startDate?: string - Download start date (optional, defaults to last 7 days)
 * - endDate?: string - Download end date
 * - clearinghouseConfigId?: string - Specific clearinghouse
 *
 * Response:
 * - downloaded: number - ERAs downloaded
 * - totalPayments: number - Total payment amount
 * - errors: number - Errors encountered
 */
clearinghouseRouter.post('/remittances/download', async (req: Request, res: Response) => {
  await clearinghouseController.downloadRemittances(req, res);
});

// ============================================================================
// Connection Test Routes
// ============================================================================

/**
 * POST /api/clearinghouse/test-connection
 * Test connectivity to a clearinghouse
 *
 * Body:
 * - configId: string - Clearinghouse configuration ID
 *
 * Response:
 * - success: boolean
 * - latencyMs: number
 * - message: string
 */
clearinghouseRouter.post('/test-connection', async (req: Request, res: Response) => {
  await clearinghouseController.testConnection(req, res);
});

// ============================================================================
// Configuration Routes
// ============================================================================

/**
 * GET /api/clearinghouse/supported
 * Get list of supported clearinghouse types
 *
 * Response:
 * - Array of { type, name, status, description, supportedTransactions }
 */
clearinghouseRouter.get('/supported', async (req: Request, res: Response) => {
  await clearinghouseController.getSupportedClearinghouses(req, res);
});

/**
 * GET /api/clearinghouse/configs
 * List clearinghouse configurations
 *
 * Query:
 * - organizationId?: string - Filter by organization
 *
 * Response:
 * - Array of configurations (credentials masked)
 */
clearinghouseRouter.get('/configs', async (req: Request, res: Response) => {
  await clearinghouseController.listConfigs(req, res);
});

/**
 * GET /api/clearinghouse/configs/:id
 * Get a specific clearinghouse configuration
 *
 * Params:
 * - id: string - Configuration ID
 *
 * Response:
 * - Configuration details (credentials masked)
 */
clearinghouseRouter.get('/configs/:id', async (req: Request, res: Response) => {
  await clearinghouseController.getConfig(req, res);
});

/**
 * POST /api/clearinghouse/configs
 * Create a new clearinghouse configuration
 *
 * Body:
 * - name: string - Display name
 * - type: string - Clearinghouse type (change_healthcare, availity)
 * - apiUrl: string - Base API URL
 * - tokenEndpoint?: string - OAuth token endpoint
 * - credentials: object - Authentication credentials
 * - supportedTransactions: string[] - Transaction types
 * - organizationId: string - Organization ID
 * - isActive?: boolean - Whether active
 * - isPrimary?: boolean - Whether primary for org
 * - timeout?: number - Request timeout
 * - retry?: object - Retry configuration
 * - environment?: string - sandbox or production
 *
 * Response:
 * - Created configuration (id, name, type, isActive)
 */
clearinghouseRouter.post('/configs', async (req: Request, res: Response) => {
  await clearinghouseController.createConfig(req, res);
});

/**
 * PUT /api/clearinghouse/configs/:id
 * Update a clearinghouse configuration
 *
 * Params:
 * - id: string - Configuration ID
 *
 * Body:
 * - Any fields to update (same as create)
 *
 * Response:
 * - Updated configuration (id, name, type, isActive)
 */
clearinghouseRouter.put('/configs/:id', async (req: Request, res: Response) => {
  await clearinghouseController.updateConfig(req, res);
});

/**
 * DELETE /api/clearinghouse/configs/:id
 * Delete a clearinghouse configuration
 *
 * Params:
 * - id: string - Configuration ID
 *
 * Note: Cannot delete if there are associated transactions
 *
 * Response:
 * - success message
 */
clearinghouseRouter.delete('/configs/:id', async (req: Request, res: Response) => {
  await clearinghouseController.deleteConfig(req, res);
});

/**
 * GET /api/clearinghouse/template/:type
 * Get configuration template for a clearinghouse type
 *
 * Params:
 * - type: string - Clearinghouse type
 *
 * Response:
 * - Default configuration template
 */
clearinghouseRouter.get('/template/:type', async (req: Request, res: Response) => {
  await clearinghouseController.getConfigTemplate(req, res);
});

// ============================================================================
// Transaction History Routes
// ============================================================================

/**
 * GET /api/clearinghouse/transactions
 * Get clearinghouse transaction history
 *
 * Query:
 * - type?: string - Filter by transaction type
 * - status?: string - Filter by status
 * - configId?: string - Filter by clearinghouse config
 * - startDate?: string - Filter start date
 * - endDate?: string - Filter end date
 * - limit?: number - Max results (default 50, max 100)
 * - offset?: number - Pagination offset
 *
 * Response:
 * - transactions: array of transaction records
 * - pagination: { total, limit, offset }
 */
clearinghouseRouter.get('/transactions', async (req: Request, res: Response) => {
  await clearinghouseController.getTransactions(req, res);
});

export default clearinghouseRouter;
