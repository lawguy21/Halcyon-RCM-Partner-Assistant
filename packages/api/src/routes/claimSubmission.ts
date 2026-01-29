/**
 * Claim Submission Routes
 * X12 837 claim submission API endpoints
 */

import { Router } from 'express';
import { claimSubmissionController } from '../controllers/claimSubmissionController.js';

export const claimSubmissionRouter = Router();

/**
 * GET /claim-submission
 * List claim submissions with filtering
 *
 * Query Parameters:
 *   - status: Filter by status (draft, validated, queued, submitted, acknowledged, accepted, rejected, pending, paid, denied, cancelled)
 *   - payerId: Filter by payer ID
 *   - recoveryAccountId: Filter by recovery account ID
 *   - fromDate: Filter by created date (ISO 8601)
 *   - toDate: Filter by created date (ISO 8601)
 *   - limit: Number of results (default: 50, max: 100)
 *   - offset: Pagination offset (default: 0)
 */
claimSubmissionRouter.get('/', (req, res) =>
  claimSubmissionController.listClaims(req as any, res)
);

/**
 * POST /claim-submission/create
 * Create a new claim from encounter/recovery account data
 *
 * Request Body:
 * {
 *   claimType: 'professional' | 'institutional',
 *   billingProvider: { npi, taxId, name, entityType, address1, city, state, zipCode, ... },
 *   renderingProvider?: { ... }, // Optional, if different from billing
 *   referringProvider?: { ... }, // Optional
 *   serviceFacility?: { ... }, // Optional
 *   subscriber: { memberId, firstName, lastName, ... },
 *   patient: { firstName, lastName, dateOfBirth, gender, address1, city, state, zipCode, relationshipToSubscriber, ... },
 *   payer: { payerId, name, claimFilingIndicator, ... },
 *   diagnoses: {
 *     principal: { code, qualifier, pointer },
 *     secondary?: [{ code, qualifier, pointer }, ...]
 *   },
 *   serviceLines?: [ // Required for professional claims
 *     { code, chargeAmount, units, serviceDate, placeOfService, diagnosisPointers, ... }
 *   ],
 *   revenueLines?: [ // Required for institutional claims
 *     { revenueCode, chargeAmount, units, serviceDate, ... }
 *   ],
 *   priorAuthorizationNumber?: string,
 *   referralNumber?: string,
 *   encounterId?: string,
 *   recoveryAccountId?: string
 * }
 */
claimSubmissionRouter.post('/create', (req, res) =>
  claimSubmissionController.createClaim(req as any, res)
);

/**
 * POST /claim-submission/batch
 * Batch submit multiple claims to clearinghouse
 *
 * Request Body:
 * {
 *   claimSubmissionIds: string[]
 * }
 *
 * Maximum batch size: 100 claims
 */
claimSubmissionRouter.post('/batch', (req, res) =>
  claimSubmissionController.batchSubmit(req as any, res)
);

/**
 * GET /claim-submission/:id
 * Get a single claim submission by ID
 */
claimSubmissionRouter.get('/:id', (req, res) =>
  claimSubmissionController.getClaim(req, res)
);

/**
 * POST /claim-submission/:id/submit
 * Submit a validated claim to the clearinghouse
 *
 * The claim must be in 'validated' status to be submitted.
 */
claimSubmissionRouter.post('/:id/submit', (req, res) =>
  claimSubmissionController.submitClaim(req as any, res)
);

/**
 * GET /claim-submission/:id/status
 * Get claim status and history
 *
 * Returns:
 * {
 *   claimSubmissionId: string,
 *   status: string,
 *   statusCode?: string,
 *   statusDescription?: string,
 *   payerClaimControlNumber?: string,
 *   clearinghouseTrackingNumber?: string,
 *   submittedAt?: Date,
 *   lastUpdatedAt?: Date,
 *   history: [{ status, timestamp, details }, ...]
 * }
 */
claimSubmissionRouter.get('/:id/status', (req, res) =>
  claimSubmissionController.getClaimStatus(req as any, res)
);

/**
 * POST /claim-submission/:id/resubmit
 * Resubmit a rejected or denied claim with corrections
 *
 * The original claim must be in 'rejected' or 'denied' status.
 *
 * Request Body:
 * {
 *   corrections: { ... }, // Full claim data with corrections applied
 *   reason?: string       // Reason for resubmission
 * }
 */
claimSubmissionRouter.post('/:id/resubmit', (req, res) =>
  claimSubmissionController.resubmitClaim(req as any, res)
);

/**
 * GET /claim-submission/:id/x12
 * Get raw X12 837 content for a claim
 *
 * Accept Header:
 *   - application/json: Returns JSON with x12Content field
 *   - application/x-x12 or other: Returns raw X12 file download
 */
claimSubmissionRouter.get('/:id/x12', (req, res) =>
  claimSubmissionController.getX12Content(req as any, res)
);

export default claimSubmissionRouter;
