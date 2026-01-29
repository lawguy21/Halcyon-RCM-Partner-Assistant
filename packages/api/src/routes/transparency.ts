/**
 * Price Transparency Routes
 *
 * CMS Price Transparency Rule compliant endpoints for:
 * - Patient price estimates
 * - Shoppable services (300 CMS-required)
 * - Good Faith Estimates (No Surprises Act)
 * - Machine Readable Files
 * - Estimate accuracy tracking
 */

import { Router } from 'express';
import transparencyController from '../controllers/transparencyController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

export const transparencyRouter = Router();

// ============================================================================
// Price Estimate Routes
// ============================================================================

/**
 * POST /transparency/estimate
 * Create a price estimate for one or more services
 *
 * Body:
 * - services: Array of { cptCode, description?, modifiers?, units, dateOfService? }
 * - patientId?: string
 * - payerId?: string
 * - patientInfo?: { memberId?, groupNumber?, deductibleMet?, etc. }
 * - benefits?: { deductible, outOfPocketMax, coinsurance, copay?, isInNetwork? }
 */
transparencyRouter.post('/estimate', optionalAuth, transparencyController.createEstimate);

/**
 * GET /transparency/estimate/:id
 * Get a specific estimate by ID
 */
transparencyRouter.get('/estimate/:id', optionalAuth, transparencyController.getEstimate);

/**
 * GET /transparency/estimate/history/:patientId
 * Get estimate history for a patient
 *
 * Query params:
 * - limit?: number (default 50)
 */
transparencyRouter.get(
  '/estimate/history/:patientId',
  authenticateToken,
  transparencyController.getEstimateHistory
);

/**
 * POST /transparency/estimate/:id/compare
 * Compare an estimate to the actual claim outcome
 *
 * Body:
 * - claimId: string
 */
transparencyRouter.post(
  '/estimate/:id/compare',
  authenticateToken,
  transparencyController.compareEstimateToActual
);

// ============================================================================
// Shoppable Services Routes
// ============================================================================

/**
 * GET /transparency/shoppable-services
 * List all 300 CMS-required shoppable services
 *
 * Query params:
 * - search?: string (search by code or description)
 * - category?: string (filter by category)
 * - limit?: number
 */
transparencyRouter.get('/shoppable-services', transparencyController.listShoppableServices);

/**
 * GET /transparency/shoppable-services/packages
 * Get common service packages (bundles)
 */
transparencyRouter.get(
  '/shoppable-services/packages',
  transparencyController.getServicePackages
);

/**
 * GET /transparency/shoppable-services/:code/prices
 * Get prices for a specific shoppable service
 */
transparencyRouter.get(
  '/shoppable-services/:code/prices',
  optionalAuth,
  transparencyController.getServicePrices
);

// ============================================================================
// Good Faith Estimate Routes
// ============================================================================

/**
 * POST /transparency/good-faith-estimate
 * Generate a Good Faith Estimate per No Surprises Act
 *
 * Body:
 * - patientId: string
 * - services: Array of { cptCode, description?, scheduledDate, providerId?, facilityId? }
 * - diagnosisCode?: string
 * - requestingProviderId?: string
 * - organizationId: string
 */
transparencyRouter.post(
  '/good-faith-estimate',
  authenticateToken,
  transparencyController.generateGoodFaithEstimate
);

// ============================================================================
// Machine Readable File Routes
// ============================================================================

/**
 * GET /transparency/machine-readable-file
 * Download the current Machine Readable File
 *
 * Query params:
 * - format?: 'json' | 'csv' (default: 'json')
 */
transparencyRouter.get(
  '/machine-readable-file',
  authenticateToken,
  transparencyController.getMachineReadableFile
);

/**
 * POST /transparency/machine-readable-file/generate
 * Regenerate the Machine Readable File
 *
 * Body:
 * - hospitalName?: string
 * - address?: { street, city, state, zipCode }
 * - ccn?: string
 * - npi?: string
 * - ein?: string
 * - cashDiscountPercent?: number
 * - publicationUrl?: string
 */
transparencyRouter.post(
  '/machine-readable-file/generate',
  authenticateToken,
  transparencyController.generateMachineReadableFile
);

/**
 * POST /transparency/machine-readable-file/validate
 * Validate the current Machine Readable File for CMS compliance
 */
transparencyRouter.post(
  '/machine-readable-file/validate',
  authenticateToken,
  transparencyController.validateMachineReadableFile
);

// ============================================================================
// Estimate Accuracy Routes
// ============================================================================

/**
 * GET /transparency/estimate-accuracy
 * Get estimate accuracy report
 *
 * Query params:
 * - startDate?: string (ISO date)
 * - endDate?: string (ISO date)
 */
transparencyRouter.get(
  '/estimate-accuracy',
  authenticateToken,
  transparencyController.getEstimateAccuracyReport
);

// ============================================================================
// Payer Comparison Routes
// ============================================================================

/**
 * POST /transparency/payer-comparison
 * Compare prices across multiple payers for the same services
 *
 * Body:
 * - services: Array of { cptCode, description?, units }
 * - payerIds?: string[] (if empty, uses Medicare as baseline)
 */
transparencyRouter.post('/payer-comparison', optionalAuth, transparencyController.comparePayerPrices);

export default transparencyRouter;
