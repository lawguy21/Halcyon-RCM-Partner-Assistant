/**
 * SSI Eligibility Routes
 *
 * Routes for SSI/SSDI eligibility determination using
 * the Halcyon-Mugetsu SSI eligibility engine.
 */

import { Router } from 'express';
import { ssiEligibilityController } from '../controllers/ssiEligibilityController.js';

export const ssiEligibilityRouter = Router();

/**
 * POST /ssi-eligibility/assess
 * Run full SSI eligibility assessment
 *
 * Body can contain either:
 * - patientId: string - Assess existing patient from database
 * - Direct input fields (medicalConditions, age, etc.)
 *
 * @example Request body with patientId:
 * {
 *   "patientId": "clx123abc"
 * }
 *
 * @example Request body with direct input:
 * {
 *   "medicalConditions": ["Multiple Sclerosis", "Depression"],
 *   "age": 55,
 *   "education": "High School",
 *   "workHistory": [{"jobTitle": "Construction Worker"}],
 *   "functionalLimitations": ["Cannot walk long distances", "Difficulty concentrating"],
 *   "severity": "severe",
 *   "hospitalizations": 3,
 *   "medications": ["Copaxone", "Prozac"]
 * }
 */
ssiEligibilityRouter.post('/assess', (req, res, next) =>
  ssiEligibilityController.assess(req, res, next)
);

/**
 * GET /ssi-eligibility/patient/:id
 * Get SSI eligibility for a specific patient
 *
 * @param id - Patient ID (from Assessment or CollectionPatient)
 *
 * @returns Full SSI assessment result including:
 * - mugetsuScore (0-100)
 * - recommendation
 * - viabilityRating
 * - ssaWaterfallRates
 * - sequentialEvaluation
 * - ageProgressionAnalysis
 */
ssiEligibilityRouter.get('/patient/:id', (req, res, next) =>
  ssiEligibilityController.getPatientEligibility(req, res, next)
);

/**
 * POST /ssi-eligibility/quick-score
 * Get quick approval likelihood score
 *
 * Returns a simplified score without full analysis.
 * Useful for screening large numbers of patients.
 *
 * @example Request body:
 * {
 *   "patientId": "clx123abc"
 * }
 * OR
 * {
 *   "medicalConditions": ["Back Pain", "Depression"],
 *   "age": 52,
 *   "severity": "moderate"
 * }
 */
ssiEligibilityRouter.post('/quick-score', (req, res, next) =>
  ssiEligibilityController.quickScore(req, res, next)
);

/**
 * GET /ssi-eligibility/strategic-timing/:id
 * Get strategic timing recommendations for SSI filing
 *
 * Analyzes patient's age and situation to recommend
 * optimal timing for SSI application based on Grid Rules.
 *
 * @param id - Patient ID
 *
 * @returns Strategic recommendations including:
 * - ageProgressionAnalysis
 * - strategicTiming recommendation
 * - ssaWaterfallRates
 * - suggestedActions
 */
ssiEligibilityRouter.get('/strategic-timing/:id', (req, res, next) =>
  ssiEligibilityController.strategicTiming(req, res, next)
);

/**
 * POST /ssi-eligibility/batch
 * Batch assessment for multiple patients
 *
 * Assess up to 100 patients in a single request.
 *
 * @example Request body:
 * {
 *   "patientIds": ["clx123abc", "clx456def", "clx789ghi"],
 *   "options": {
 *     "skipAI": true,
 *     "scoresOnly": false
 *   }
 * }
 *
 * @returns Batch results with summary statistics
 */
ssiEligibilityRouter.post('/batch', (req, res, next) =>
  ssiEligibilityController.batchAssess(req, res, next)
);

/**
 * GET /ssi-eligibility/status
 * Get Mugetsu service status
 *
 * Check if Mugetsu SSI eligibility engine is configured
 * and available. Useful for monitoring and debugging.
 *
 * @returns Service status including:
 * - configured: boolean
 * - available: boolean
 * - fallbackEnabled: boolean
 * - healthDetails (if available)
 */
ssiEligibilityRouter.get('/status', (req, res, next) =>
  ssiEligibilityController.getServiceStatus(req, res, next)
);
