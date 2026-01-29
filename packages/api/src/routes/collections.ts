// @ts-nocheck
/**
 * Collections Routes
 *
 * Routes for collections management operations including
 * account management, dunning, agency assignments, and reporting.
 */

import { Router } from 'express';
import { collectionController } from '../controllers/collectionController.js';

export const collectionsRouter = Router();

// ============================================================================
// ACCOUNT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /collections/accounts
 * List accounts by state with filters
 *
 * Query params:
 * - state: single state filter
 * - states: comma-separated states
 * - agencyId: filter by agency
 * - minBalance: minimum balance
 * - maxBalance: maximum balance
 * - minDaysPastDue: minimum days past due
 * - maxDaysPastDue: maximum days past due
 * - organizationId: filter by organization
 * - limit: pagination limit (default 50)
 * - offset: pagination offset (default 0)
 */
collectionsRouter.get('/accounts', (req, res, next) => {
  collectionController.getAccounts(req, res, next);
});

/**
 * GET /collections/accounts/:id
 * Get account detail with state config and allowed transitions
 */
collectionsRouter.get('/accounts/:id', (req, res, next) => {
  collectionController.getAccountById(req, res, next);
});

/**
 * POST /collections/accounts/:id/transition
 * Change account state
 *
 * Body:
 * - newState: target state
 * - reason: reason for transition
 */
collectionsRouter.post('/accounts/:id/transition', (req, res, next) => {
  collectionController.transitionAccount(req, res, next);
});

// ============================================================================
// DUNNING ROUTES
// ============================================================================

/**
 * POST /collections/dunning/run
 * Run dunning batch for all eligible accounts
 *
 * Body:
 * - organizationId: optional org filter
 */
collectionsRouter.post('/dunning/run', (req, res, next) => {
  collectionController.runDunningBatch(req, res, next);
});

// ============================================================================
// AGENCY MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /collections/agency/assign
 * Assign accounts to collection agency
 *
 * Body:
 * - accountIds: array of account IDs
 * - agencyId: target agency ID
 */
collectionsRouter.post('/agency/assign', (req, res, next) => {
  collectionController.assignToAgency(req, res, next);
});

/**
 * POST /collections/agency/recall
 * Recall account from agency
 *
 * Body:
 * - accountId: account to recall
 */
collectionsRouter.post('/agency/recall', (req, res, next) => {
  collectionController.recallFromAgency(req, res, next);
});

// ============================================================================
// PAYMENT MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /collections/promise-to-pay
 * Record a promise to pay
 *
 * Body:
 * - accountId: account ID
 * - promiseDate: date of promised payment
 * - amount: promised amount
 * - notes: optional notes
 */
collectionsRouter.post('/promise-to-pay', (req, res, next) => {
  collectionController.recordPromiseToPay(req, res, next);
});

/**
 * POST /collections/payment-plan
 * Set up a payment plan
 *
 * Body:
 * - accountId: account ID
 * - totalAmount: total amount to be paid
 * - numberOfPayments: number of payments
 * - paymentFrequency: WEEKLY, BIWEEKLY, or MONTHLY
 * - firstPaymentDate: date of first payment
 * - paymentAmount: amount per payment
 * - notes: optional notes
 */
collectionsRouter.post('/payment-plan', (req, res, next) => {
  collectionController.processPaymentPlan(req, res, next);
});

// ============================================================================
// REPORTING ROUTES
// ============================================================================

/**
 * GET /collections/dashboard
 * Get collection metrics dashboard
 *
 * Query params:
 * - organizationId: optional org filter
 */
collectionsRouter.get('/dashboard', (req, res, next) => {
  collectionController.getDashboard(req, res, next);
});

/**
 * GET /collections/aging-report
 * Get aging buckets report
 *
 * Query params:
 * - organizationId: optional org filter
 */
collectionsRouter.get('/aging-report', (req, res, next) => {
  collectionController.getAgingReport(req, res, next);
});

/**
 * GET /collections/prioritized
 * Get prioritized accounts by collection score
 *
 * Query params:
 * - organizationId: optional org filter
 * - limit: max accounts to return (default 100)
 */
collectionsRouter.get('/prioritized', (req, res, next) => {
  collectionController.getPrioritizedAccounts(req, res, next);
});

/**
 * GET /collections/states
 * Get available collection states and their configurations
 */
collectionsRouter.get('/states', (req, res, next) => {
  collectionController.getStates(req, res, next);
});
