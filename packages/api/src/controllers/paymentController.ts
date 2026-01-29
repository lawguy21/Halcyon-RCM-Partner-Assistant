// @ts-nocheck
/**
 * Payment Controller
 * Handles ERA 835 payment posting operations
 */

import type { Request, Response } from 'express';
import {
  paymentPostingService,
  type ImportERAResult,
  type PostPaymentInput,
  type WriteOffInput,
  type ReconciliationInput,
} from '../services/paymentPostingService.js';

/**
 * Import ERA 835 file
 * POST /payments/import-era
 */
export async function importERA(req: Request, res: Response): Promise<void> {
  try {
    const { fileContent, fileName } = req.body;

    if (!fileContent) {
      res.status(400).json({
        success: false,
        error: 'File content is required',
      });
      return;
    }

    // Get user and org from auth context (if available)
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;

    const result = await paymentPostingService.importERA(
      fileContent,
      fileName,
      userId,
      organizationId
    );

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Import ERA error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * List remittances
 * GET /payments/remittances
 */
export async function listRemittances(req: Request, res: Response): Promise<void> {
  try {
    const {
      status,
      payerName,
      fromDate,
      toDate,
      limit,
      offset,
    } = req.query;

    const organizationId = req.user?.organizationId;

    const result = await paymentPostingService.listRemittances({
      status: status as any,
      payerName: payerName as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      organizationId,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('List remittances error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Get remittance detail
 * GET /payments/remittances/:id
 */
export async function getRemittance(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const remittance = await paymentPostingService.getRemittance(id);

    if (!remittance) {
      res.status(404).json({
        success: false,
        error: 'Remittance not found',
      });
      return;
    }

    res.json({
      success: true,
      remittance,
    });
  } catch (error) {
    console.error('Get remittance error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Post payment to claim
 * POST /payments/post
 */
export async function postPayment(req: Request, res: Response): Promise<void> {
  try {
    const {
      remittanceId,
      claimId,
      eraClaimNumber,
      amount,
      adjustments,
    } = req.body;

    if (!remittanceId || !claimId || !eraClaimNumber) {
      res.status(400).json({
        success: false,
        error: 'remittanceId, claimId, and eraClaimNumber are required',
      });
      return;
    }

    const postedBy = req.user?.id || 'system';

    const result = await paymentPostingService.postPayment({
      remittanceId,
      claimId,
      eraClaimNumber,
      amount: parseFloat(amount) || 0,
      adjustments,
      postedBy,
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Post payment error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Auto-post all eligible payments in a remittance
 * POST /payments/auto-post/:remittanceId
 */
export async function autoPostPayments(req: Request, res: Response): Promise<void> {
  try {
    const { remittanceId } = req.params;
    const postedBy = req.user?.id || 'system';

    const result = await paymentPostingService.autoPostPayments(remittanceId, postedBy);

    res.json(result);
  } catch (error) {
    console.error('Auto-post payments error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Get unmatched payments
 * GET /payments/unmatched
 */
export async function getUnmatchedPayments(req: Request, res: Response): Promise<void> {
  try {
    const { remittanceId } = req.query;

    if (!remittanceId) {
      res.status(400).json({
        success: false,
        error: 'remittanceId is required',
      });
      return;
    }

    const unmatched = await paymentPostingService.reviewUnmatched(remittanceId as string);

    res.json({
      success: true,
      unmatched,
      count: unmatched.length,
    });
  } catch (error) {
    console.error('Get unmatched payments error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Create write-off
 * POST /payments/write-off
 */
export async function createWriteOff(req: Request, res: Response): Promise<void> {
  try {
    const {
      claimId,
      amount,
      reason,
      carcCode,
    } = req.body;

    if (!claimId || amount === undefined || !reason) {
      res.status(400).json({
        success: false,
        error: 'claimId, amount, and reason are required',
      });
      return;
    }

    const approvedBy = req.user?.id;

    const result = await paymentPostingService.createWriteOff({
      claimId,
      amount: parseFloat(amount),
      reason,
      carcCode,
      approvedBy,
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create write-off error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Get reconciliation report
 * GET /payments/reconciliation
 */
export async function getReconciliationReport(req: Request, res: Response): Promise<void> {
  try {
    const { fromDate, toDate } = req.query;
    const organizationId = req.user?.organizationId;

    const report = await paymentPostingService.getReconciliationReport({
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      organizationId,
    });

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Get reconciliation report error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Reconcile remittances with deposit
 * POST /payments/reconcile
 */
export async function reconcileDeposit(req: Request, res: Response): Promise<void> {
  try {
    const {
      depositId,
      depositAmount,
      depositDate,
      remittanceIds,
      notes,
    } = req.body;

    if (!depositId || depositAmount === undefined || !remittanceIds || !Array.isArray(remittanceIds)) {
      res.status(400).json({
        success: false,
        error: 'depositId, depositAmount, and remittanceIds are required',
      });
      return;
    }

    const result = await paymentPostingService.reconcileDeposit({
      depositId,
      depositAmount: parseFloat(depositAmount),
      depositDate: depositDate ? new Date(depositDate) : new Date(),
      remittanceIds,
      notes,
    });

    res.json({
      success: result.isReconciled,
      ...result,
    });
  } catch (error) {
    console.error('Reconcile deposit error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Get payment posting statistics
 * GET /payments/stats
 */
export async function getPaymentStats(req: Request, res: Response): Promise<void> {
  try {
    const { fromDate, toDate } = req.query;
    const organizationId = req.user?.organizationId;

    // Get summary stats from reconciliation report
    const report = await paymentPostingService.getReconciliationReport({
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      organizationId,
    });

    res.json({
      success: true,
      stats: {
        totalRemittances: report.totals.totalRemittances,
        totalAmount: report.totals.totalAmount,
        reconciledAmount: report.totals.reconciledAmount,
        unreconciledAmount: report.totals.unreconciledAmount,
        pendingCount: report.totals.pendingCount,
        postedCount: report.totals.postedCount,
        reconciledCount: report.totals.reconciledCount,
        reconciledPercentage: report.totals.totalRemittances > 0
          ? Math.round((report.totals.reconciledCount / report.totals.totalRemittances) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Search claim payments
 * GET /payments/search
 */
export async function searchClaimPayments(req: Request, res: Response): Promise<void> {
  try {
    const {
      claimNumber,
      patientName,
      checkNumber,
      fromDate,
      toDate,
      limit,
      offset,
    } = req.query;

    // This would need a more sophisticated search implementation
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Search functionality - query parameters received',
      query: {
        claimNumber,
        patientName,
        checkNumber,
        fromDate,
        toDate,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Search claim payments error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// Export all controller functions
export const paymentController = {
  importERA,
  listRemittances,
  getRemittance,
  postPayment,
  autoPostPayments,
  getUnmatchedPayments,
  createWriteOff,
  getReconciliationReport,
  reconcileDeposit,
  getPaymentStats,
  searchClaimPayments,
};
