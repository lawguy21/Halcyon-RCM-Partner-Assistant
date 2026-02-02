// @ts-nocheck
/**
 * Claim Submission Controller
 * REST API endpoints for X12 837 claim submission
 */

import { Request, Response } from 'express';
import {
  claimSubmissionService,
  type CreateClaimInput,
  type ResubmitClaimInput,
} from '../services/claimSubmissionService.js';
import type { ClaimSubmissionStatus } from '@halcyon-rcm/core/claims';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

interface CreateClaimRequest extends Request {
  body: CreateClaimInput;
}

interface SubmitClaimRequest extends Request {
  params: { id: string };
}

interface GetClaimStatusRequest extends Request {
  params: { id: string };
}

interface ResubmitClaimRequest extends Request {
  params: { id: string };
  body: ResubmitClaimInput;
}

interface BatchSubmitRequest extends Request {
  body: {
    claimSubmissionIds: string[];
  };
}

interface GetX12Request extends Request {
  params: { id: string };
}

interface ListClaimsRequest extends Request {
  query: {
    status?: string;
    payerId?: string;
    recoveryAccountId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: string;
    offset?: string;
  };
}

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

class ClaimSubmissionController {
  /**
   * POST /claims/create
   * Create a claim from encounter/recovery account data
   */
  async createClaim(req: CreateClaimRequest, res: Response): Promise<void> {
    try {
      const input = req.body;

      // Validate required fields
      if (!input.claimType) {
        res.status(400).json({
          success: false,
          error: 'claimType is required (professional or institutional)',
        });
        return;
      }

      if (!['professional', 'institutional'].includes(input.claimType)) {
        res.status(400).json({
          success: false,
          error: 'claimType must be either "professional" or "institutional"',
        });
        return;
      }

      if (!input.billingProvider) {
        res.status(400).json({
          success: false,
          error: 'billingProvider is required',
        });
        return;
      }

      if (!input.subscriber) {
        res.status(400).json({
          success: false,
          error: 'subscriber is required',
        });
        return;
      }

      if (!input.patient) {
        res.status(400).json({
          success: false,
          error: 'patient is required',
        });
        return;
      }

      if (!input.payer) {
        res.status(400).json({
          success: false,
          error: 'payer is required',
        });
        return;
      }

      if (!input.diagnoses || !input.diagnoses.principal) {
        res.status(400).json({
          success: false,
          error: 'diagnoses with at least a principal diagnosis is required',
        });
        return;
      }

      // Validate claim type specific requirements
      if (input.claimType === 'professional' && (!input.serviceLines || input.serviceLines.length === 0)) {
        res.status(400).json({
          success: false,
          error: 'serviceLines are required for professional claims',
        });
        return;
      }

      if (input.claimType === 'institutional' && (!input.revenueLines || input.revenueLines.length === 0)) {
        res.status(400).json({
          success: false,
          error: 'revenueLines are required for institutional claims',
        });
        return;
      }

      const result = await claimSubmissionService.createClaim(input);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            claimSubmissionId: result.claimSubmissionId,
            claimId: result.claimId,
            validation: result.validation,
          },
          message: 'Claim created successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          validation: result.validation,
          errors: result.errors,
        });
      }
    } catch (error: any) {
      console.error('[ClaimSubmissionController] Error creating claim:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  /**
   * POST /claims/:id/submit
   * Submit a claim to the clearinghouse
   */
  async submitClaim(req: SubmitClaimRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Claim submission ID is required',
        });
        return;
      }

      const result = await claimSubmissionService.submitClaim(id);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            claimSubmissionId: result.claimSubmissionId,
            status: result.status,
            interchangeControlNumber: result.interchangeControlNumber,
            clearinghouseTrackingNumber: result.clearinghouseTrackingNumber,
          },
          message: 'Claim submitted successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          claimSubmissionId: result.claimSubmissionId,
          status: result.status,
          errors: result.errors,
        });
      }
    } catch (error: any) {
      console.error('[ClaimSubmissionController] Error submitting claim:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  /**
   * GET /claims/:id/status
   * Get claim status and history
   */
  async getClaimStatus(req: GetClaimStatusRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Claim submission ID is required',
        });
        return;
      }

      const result = await claimSubmissionService.getClaimStatus(id);

      if (result) {
        res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Claim submission not found',
        });
      }
    } catch (error: any) {
      console.error('[ClaimSubmissionController] Error getting claim status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  /**
   * POST /claims/:id/resubmit
   * Resubmit a rejected/denied claim with corrections
   */
  async resubmitClaim(req: ResubmitClaimRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const input = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Claim submission ID is required',
        });
        return;
      }

      if (!input.corrections) {
        res.status(400).json({
          success: false,
          error: 'Corrections data is required for resubmission',
        });
        return;
      }

      const result = await claimSubmissionService.resubmitClaim(id, input);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            claimSubmissionId: result.claimSubmissionId,
            claimId: result.claimId,
            validation: result.validation,
            originalClaimId: id,
          },
          message: 'Claim resubmitted successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          validation: result.validation,
          errors: result.errors,
        });
      }
    } catch (error: any) {
      console.error('[ClaimSubmissionController] Error resubmitting claim:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  /**
   * POST /claims/batch
   * Batch submit multiple claims
   */
  async batchSubmit(req: BatchSubmitRequest, res: Response): Promise<void> {
    try {
      const { claimSubmissionIds } = req.body;

      if (!claimSubmissionIds || !Array.isArray(claimSubmissionIds)) {
        res.status(400).json({
          success: false,
          error: 'claimSubmissionIds array is required',
        });
        return;
      }

      if (claimSubmissionIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one claim submission ID is required',
        });
        return;
      }

      // Limit batch size
      if (claimSubmissionIds.length > 100) {
        res.status(400).json({
          success: false,
          error: 'Maximum batch size is 100 claims',
        });
        return;
      }

      const result = await claimSubmissionService.batchSubmit(claimSubmissionIds);

      res.status(200).json({
        success: result.success,
        data: {
          results: result.results,
          summary: result.summary,
        },
        message: result.success
          ? 'All claims submitted successfully'
          : `${result.summary.successful} of ${result.summary.total} claims submitted successfully`,
      });
    } catch (error: any) {
      console.error('[ClaimSubmissionController] Error batch submitting claims:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  /**
   * GET /claims/:id/x12
   * Get raw X12 837 content for a claim
   */
  async getX12Content(req: GetX12Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Claim submission ID is required',
        });
        return;
      }

      const x12Content = await claimSubmissionService.getX12Content(id);

      if (x12Content) {
        // Check if client wants JSON or raw X12
        const acceptHeader = req.get('Accept') || '';

        if (acceptHeader.includes('application/json')) {
          res.status(200).json({
            success: true,
            data: {
              claimSubmissionId: id,
              x12Content,
              contentLength: x12Content.length,
            },
          });
        } else {
          // Return raw X12 content
          res.setHeader('Content-Type', 'application/x-x12');
          res.setHeader('Content-Disposition', `attachment; filename="claim_${id}.x12"`);
          res.status(200).send(x12Content);
        }
      } else {
        res.status(404).json({
          success: false,
          error: 'Claim submission not found',
        });
      }
    } catch (error: any) {
      console.error('[ClaimSubmissionController] Error getting X12 content:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  /**
   * GET /claims
   * List claim submissions with filtering
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async listClaims(req: ListClaimsRequest, res: Response): Promise<void> {
    try {
      const {
        status,
        payerId,
        recoveryAccountId,
        fromDate,
        toDate,
        limit,
        offset,
      } = req.query;

      // TENANT ISOLATION: Get organizationId from authenticated user
      const organizationId = (req as any).user?.organizationId;

      const options: {
        status?: ClaimSubmissionStatus;
        payerId?: string;
        recoveryAccountId?: string;
        fromDate?: Date;
        toDate?: Date;
        limit?: number;
        offset?: number;
        organizationId?: string;
      } = {
        organizationId, // Always include for tenant isolation
      };

      if (status) {
        options.status = status as ClaimSubmissionStatus;
      }

      if (payerId) {
        options.payerId = payerId;
      }

      if (recoveryAccountId) {
        options.recoveryAccountId = recoveryAccountId;
      }

      if (fromDate) {
        const date = new Date(fromDate);
        if (!isNaN(date.getTime())) {
          options.fromDate = date;
        }
      }

      if (toDate) {
        const date = new Date(toDate);
        if (!isNaN(date.getTime())) {
          options.toDate = date;
        }
      }

      if (limit) {
        const parsedLimit = parseInt(limit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          options.limit = Math.min(parsedLimit, 100); // Max 100
        }
      }

      if (offset) {
        const parsedOffset = parseInt(offset, 10);
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          options.offset = parsedOffset;
        }
      }

      const result = await claimSubmissionService.listClaims(options);

      res.status(200).json({
        success: true,
        data: {
          claims: result.claims,
          pagination: {
            total: result.total,
            limit: options.limit || 50,
            offset: options.offset || 0,
            hasMore: (options.offset || 0) + result.claims.length < result.total,
          },
        },
      });
    } catch (error: any) {
      console.error('[ClaimSubmissionController] Error listing claims:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  /**
   * GET /claims/:id
   * Get a single claim submission by ID
   */
  async getClaim(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Claim submission ID is required',
        });
        return;
      }

      const status = await claimSubmissionService.getClaimStatus(id);

      if (status) {
        // Get additional details
        const x12Content = await claimSubmissionService.getX12Content(id);

        res.status(200).json({
          success: true,
          data: {
            ...status,
            x12ContentAvailable: !!x12Content,
            x12ContentLength: x12Content?.length || 0,
          },
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Claim submission not found',
        });
      }
    } catch (error: any) {
      console.error('[ClaimSubmissionController] Error getting claim:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
}

// Export singleton instance
export const claimSubmissionController = new ClaimSubmissionController();

// Export class for testing
export { ClaimSubmissionController };
