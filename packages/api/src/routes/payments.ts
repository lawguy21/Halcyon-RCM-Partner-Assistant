// @ts-nocheck
/**
 * Payment Routes
 * ERA 835 payment posting API endpoints
 */

import { Router } from 'express';
import {
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
} from '../controllers/paymentController.js';

export const paymentsRouter = Router();

/**
 * @route   POST /payments/import-era
 * @desc    Upload and parse ERA 835 file
 * @access  Private
 * @body    { fileContent: string, fileName?: string }
 * @returns { success, remittanceId, checkNumber, payerName, totalAmount, claimCount, errors?, warnings? }
 */
paymentsRouter.post('/import-era', importERA);

/**
 * @route   GET /payments/remittances
 * @desc    List all remittances with filtering and pagination
 * @access  Private
 * @query   status - Filter by status (PENDING, REVIEWED, PARTIAL, POSTED, RECONCILED, ERROR)
 * @query   payerName - Filter by payer name (partial match)
 * @query   fromDate - Filter from date (ISO 8601)
 * @query   toDate - Filter to date (ISO 8601)
 * @query   limit - Page size (default 50)
 * @query   offset - Skip records
 * @returns { remittances, total, limit, offset }
 */
paymentsRouter.get('/remittances', listRemittances);

/**
 * @route   GET /payments/remittances/:id
 * @desc    Get single remittance with full details
 * @access  Private
 * @params  id - Remittance ID
 * @returns { success, remittance }
 */
paymentsRouter.get('/remittances/:id', getRemittance);

/**
 * @route   POST /payments/post
 * @desc    Post a payment to a claim
 * @access  Private
 * @body    { remittanceId, claimId, eraClaimNumber, amount, adjustments? }
 * @returns { success, paymentId?, error?, warnings, amountPosted, adjustmentsPosted, writeOffsCreated }
 */
paymentsRouter.post('/post', postPayment);

/**
 * @route   POST /payments/auto-post/:remittanceId
 * @desc    Auto-post all eligible payments in a remittance
 * @access  Private
 * @params  remittanceId - Remittance ID
 * @returns { success, posted, failed, skipped, errors }
 */
paymentsRouter.post('/auto-post/:remittanceId', autoPostPayments);

/**
 * @route   GET /payments/unmatched
 * @desc    Get unmatched payments for a remittance
 * @access  Private
 * @query   remittanceId - Required remittance ID
 * @returns { success, unmatched, count }
 */
paymentsRouter.get('/unmatched', getUnmatchedPayments);

/**
 * @route   POST /payments/write-off
 * @desc    Create a write-off for a claim
 * @access  Private
 * @body    { claimId, amount, reason, carcCode? }
 * @returns { success, writeOffId?, error? }
 */
paymentsRouter.post('/write-off', createWriteOff);

/**
 * @route   GET /payments/reconciliation
 * @desc    Get reconciliation report
 * @access  Private
 * @query   fromDate - Report start date (ISO 8601)
 * @query   toDate - Report end date (ISO 8601)
 * @returns { success, report }
 */
paymentsRouter.get('/reconciliation', getReconciliationReport);

/**
 * @route   POST /payments/reconcile
 * @desc    Reconcile remittances with a bank deposit
 * @access  Private
 * @body    { depositId, depositAmount, depositDate?, remittanceIds[], notes? }
 * @returns { success, depositId, depositAmount, matchedAmount, variance, isReconciled, ... }
 */
paymentsRouter.post('/reconcile', reconcileDeposit);

/**
 * @route   GET /payments/stats
 * @desc    Get payment posting statistics
 * @access  Private
 * @query   fromDate - Stats start date (ISO 8601)
 * @query   toDate - Stats end date (ISO 8601)
 * @returns { success, stats }
 */
paymentsRouter.get('/stats', getPaymentStats);

/**
 * @route   GET /payments/search
 * @desc    Search claim payments
 * @access  Private
 * @query   claimNumber - Search by claim number
 * @query   patientName - Search by patient name
 * @query   checkNumber - Search by check/trace number
 * @query   fromDate - Filter from date
 * @query   toDate - Filter to date
 * @query   limit - Page size
 * @query   offset - Skip records
 * @returns { success, payments, total }
 */
paymentsRouter.get('/search', searchClaimPayments);

export default paymentsRouter;
