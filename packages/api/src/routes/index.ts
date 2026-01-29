/**
 * API Routes Index
 * Central router that combines all API routes
 */

import { Router } from 'express';
import { healthRouter } from './health.js';
import { assessmentsRouter } from './assessments.js';
import { importRouter } from './import.js';
import { exportRouter } from './export.js';
import { presetsRouter } from './presets.js';
import { reportsRouter } from './reports.js';

// Authentication and authorization routes
import { authRouter } from './auth.js';
import { organizationsRouter } from './organizations.js';

// RBAC routes
import { rbacRouter } from './rbac.js';

// SFTP connection management routes
import { sftpRouter } from './sftp.js';

// Document processing routes
import { documentRouter } from './documents.js';

// Batch import routes
import batchImportRouter from './batchImport.js';

// New RCM workflow routes
import { eligibilityRouter } from './eligibility.js';
import { complianceRouter } from './compliance.js';
import { denialsRouter } from './denials.js';
import { workQueueRouter } from './workQueue.js';
import { collectionsRouter } from './collections.js';
import { paymentsRouter } from './payments.js';
import { payersRouter } from './payers.js';
import { clearinghouseRouter } from './clearinghouse.js';
import { claimSubmissionRouter } from './claimSubmission.js';

// Legacy routes (keeping for backward compatibility)
import { claimsRouter } from './claims.js';
import { fileRouter } from './files.js';

// Charge capture and coding routes
import { chargesRouter } from './charges.js';

// SSI Eligibility routes (Mugetsu integration)
import { ssiEligibilityRouter } from './ssiEligibility.js';

// Price transparency routes (CMS compliance)
import { transparencyRouter } from './transparency.js';

// Workflow rules engine routes
import { workflowRouter } from './workflow.js';

// Predictive analytics routes
import { analyticsRouter } from './analytics.js';

// Staff productivity tracking routes
import { productivityRouter } from './productivity.js';

export const apiRouter = Router();

// ============================================================================
// Authentication & Authorization Routes
// ============================================================================

/**
 * Authentication Routes
 * POST   /auth/login             - User login
 * POST   /auth/register          - User registration
 * POST   /auth/forgot-password   - Request password reset
 * POST   /auth/reset-password    - Reset password with token
 * POST   /auth/refresh           - Refresh access token
 * GET    /auth/me                - Get current user
 * PUT    /auth/profile           - Update profile
 * PUT    /auth/change-password   - Change password
 * POST   /auth/logout            - Logout
 */
apiRouter.use('/auth', authRouter);

/**
 * Organization Routes
 * GET    /organizations          - List organizations
 * POST   /organizations          - Create organization (admin)
 * GET    /organizations/:id      - Get organization
 * PUT    /organizations/:id      - Update organization
 * DELETE /organizations/:id      - Delete organization (admin)
 * GET    /organizations/:id/stats - Organization statistics
 * POST   /organizations/:id/users - Add user to org (admin)
 * DELETE /organizations/:id/users/:userId - Remove user (admin)
 */
apiRouter.use('/organizations', organizationsRouter);

/**
 * RBAC (Role-Based Access Control) Routes
 * GET    /rbac/me/permissions       - Get current user's permissions
 * GET    /rbac/me/roles             - Get current user's roles
 * GET    /rbac/me/departments       - Get current user's departments
 * GET    /rbac/roles                - List all roles
 * GET    /rbac/roles/:id            - Get role details
 * POST   /rbac/roles                - Create custom role
 * PUT    /rbac/roles/:id            - Update custom role
 * DELETE /rbac/roles/:id            - Delete custom role
 * GET    /rbac/roles/:id/permissions - Get role permissions
 * PUT    /rbac/roles/:id/permissions - Update role permissions
 * GET    /rbac/users/:id/permissions - Get user's effective permissions
 * GET    /rbac/users/:id/roles       - Get user's roles
 * POST   /rbac/users/:id/roles       - Assign role to user
 * DELETE /rbac/users/:id/roles/:roleId - Revoke role from user
 * GET    /rbac/users/:id/departments - Get user's departments
 * POST   /rbac/users/:id/departments - Assign department to user
 * DELETE /rbac/users/:id/departments/:deptId - Remove department from user
 * GET    /rbac/permissions          - List all permissions
 * POST   /rbac/check-permission     - Check if user has permission
 * GET    /rbac/departments          - List all departments
 * GET    /rbac/audit                - Get access audit logs
 */
apiRouter.use('/rbac', rbacRouter);

/**
 * SFTP Connection Routes
 * GET    /sftp/connections           - List SFTP connections
 * POST   /sftp/connections           - Create connection (admin/user)
 * GET    /sftp/connections/:id       - Get connection details
 * PUT    /sftp/connections/:id       - Update connection (admin/user)
 * DELETE /sftp/connections/:id       - Delete connection (admin)
 * POST   /sftp/test                  - Test connection settings
 * POST   /sftp/connections/:id/sync  - Trigger manual sync (admin/user)
 * GET    /sftp/connections/:id/logs  - Get sync logs
 * POST   /sftp/connections/:id/upload - Upload results (admin/user)
 */
apiRouter.use('/sftp', sftpRouter);

// ============================================================================
// Core RCM Routes
// ============================================================================

/**
 * Recovery Assessment Routes
 * POST   /assessments              - Create single assessment
 * POST   /assessments/batch        - Create batch assessments
 * GET    /assessments              - List assessments (paginated, filterable)
 * GET    /assessments/:id          - Get single assessment
 * PATCH  /assessments/:id          - Update assessment metadata
 * PUT    /assessments/:id/recalculate - Recalculate with new input
 * DELETE /assessments/:id          - Delete assessment
 * GET    /assessments/:id/export   - Export single assessment
 */
apiRouter.use('/assessments', assessmentsRouter);

/**
 * File Import Routes
 * POST   /import/csv               - Upload and import CSV
 * POST   /import/preview           - Preview CSV with detected columns
 * POST   /import/validate          - Validate CSV without importing
 * GET    /import/history           - Get import history
 * GET    /import/history/:id       - Get single import details
 */
apiRouter.use('/import', importRouter);

/**
 * Batch Import Routes (for large CSV files 1000+ rows)
 * POST   /batch-import/start              - Start async batch import job
 * POST   /batch-import/validate           - Validate CSV without importing
 * GET    /batch-import/status/:importId   - Get import job status
 * GET    /batch-import/progress/:id/stream - SSE progress stream
 * POST   /batch-import/cancel/:importId   - Cancel running import
 * POST   /batch-import/resume/:importId   - Resume failed import
 * GET    /batch-import/errors/:importId   - Export errors as CSV
 * GET    /batch-import/list               - List all batch imports
 */
apiRouter.use('/batch-import', batchImportRouter);

/**
 * Export Routes
 * POST   /export/csv               - Export assessments to CSV
 * POST   /export/worklist          - Export prioritized worklist
 * POST   /export/executive-summary - Export executive summary
 * POST   /export/pdf               - Export PDF report data
 * GET    /export/templates         - Get export templates
 */
apiRouter.use('/export', exportRouter);

/**
 * Mapping Preset Routes
 * GET    /presets                  - List all presets
 * GET    /presets/vendors          - List vendors
 * GET    /presets/:id              - Get preset details
 * GET    /presets/:id/export       - Export preset as JSON
 * POST   /presets                  - Create custom preset
 * POST   /presets/:id/clone        - Clone existing preset
 * PUT    /presets/:id              - Update custom preset
 * DELETE /presets/:id              - Delete custom preset
 */
apiRouter.use('/presets', presetsRouter);

/**
 * Reporting Routes
 * GET    /reports/summary          - Overall recovery summary
 * GET    /reports/by-pathway       - Breakdown by pathway
 * GET    /reports/by-state         - Breakdown by state
 * GET    /reports/by-urgency       - Breakdown by urgency
 * GET    /reports/trends           - Recovery trends over time
 * GET    /reports/quick-stats      - Dashboard quick stats
 * GET    /reports/comparison       - Compare two periods
 */
apiRouter.use('/reports', reportsRouter);

/**
 * Document Processing Routes
 * POST   /documents/process        - Process document with OCR and AI extraction
 * POST   /documents/process-direct - Process with Claude direct PDF extraction
 * GET    /documents/status         - Get document processing service status
 */
apiRouter.use('/documents', documentRouter);

// ============================================================================
// New RCM Workflow Routes
// ============================================================================

/**
 * Eligibility Screening Routes
 * POST   /eligibility/screen       - Perform comprehensive eligibility screening
 * POST   /eligibility/quick-magi   - Quick MAGI check
 * GET    /eligibility/state/:code  - Get state-specific eligibility info
 * POST   /eligibility/save         - Save screening result
 * GET    /eligibility/states       - Get all states summary
 * GET    /eligibility/expansion-states - Get expansion states list
 */
apiRouter.use('/eligibility', eligibilityRouter);

/**
 * Compliance Routes
 * POST   /compliance/charity-care/evaluate - Evaluate 501(r) compliance
 * POST   /compliance/dsh/calculate   - Calculate DSH metrics
 * GET    /compliance/dashboard/:orgId - Get compliance dashboard data
 * POST   /compliance/notices         - Record compliance notice
 * GET    /compliance/notices/:accountId - Get account notices
 * GET    /compliance/eca-status/:accountId - Check ECA status
 * GET    /compliance/actions/:orgId/:type - Get accounts requiring action
 */
apiRouter.use('/compliance', complianceRouter);

/**
 * Denial Management Routes
 * POST   /denials/analyze           - Analyze denial and get recommendations
 * POST   /denials                   - Record a new denial
 * GET    /denials/analytics/:orgId  - Get denial analytics
 * GET    /denials/claim/:claimId    - Get claim denials
 * POST   /denials/appeals           - Create an appeal
 * PATCH  /denials/appeals/:id       - Update appeal status
 * GET    /denials/carc-codes        - Get all CARC codes
 * GET    /denials/carc-codes/:category - Get codes by category
 * POST   /denials/batch-recovery    - Calculate batch recovery potential
 */
apiRouter.use('/denials', denialsRouter);

/**
 * Work Queue Routes
 * GET    /work-queue                - Get work queue items
 * GET    /work-queue/stats          - Get work queue statistics
 * GET    /work-queue/next           - Get next item for user
 * GET    /work-queue/:itemId        - Get single item
 * POST   /work-queue                - Create work queue item
 * POST   /work-queue/bulk           - Bulk create items
 * POST   /work-queue/:id/claim      - Claim item
 * POST   /work-queue/:id/release    - Release item
 * POST   /work-queue/:id/complete   - Complete item
 * PATCH  /work-queue/:id/priority   - Update priority
 * POST   /work-queue/:id/reassign   - Reassign item
 * POST   /work-queue/auto-generate/:orgId - Auto-generate items
 */
apiRouter.use('/work-queue', workQueueRouter);

/**
 * Collections Management Routes
 * GET    /collections/accounts      - List accounts by state
 * GET    /collections/accounts/:id  - Get account detail
 * POST   /collections/accounts/:id/transition - Change state
 * POST   /collections/dunning/run   - Run dunning batch
 * POST   /collections/agency/assign - Assign to agency
 * POST   /collections/agency/recall - Recall from agency
 * POST   /collections/promise-to-pay - Record promise
 * POST   /collections/payment-plan  - Set up payment plan
 * GET    /collections/dashboard     - Collection metrics
 * GET    /collections/aging-report  - Aging buckets
 * GET    /collections/prioritized   - Prioritized accounts by score
 * GET    /collections/states        - Available states and configs
 */
apiRouter.use('/collections', collectionsRouter);

/**
 * Payment Posting Routes (ERA 835)
 * POST   /payments/import-era          - Upload and parse ERA 835 file
 * GET    /payments/remittances         - List all remittances
 * GET    /payments/remittances/:id     - Get remittance details
 * POST   /payments/post                - Post payment to claim
 * POST   /payments/auto-post/:id       - Auto-post all eligible payments
 * GET    /payments/unmatched           - Get unmatched payments
 * POST   /payments/write-off           - Create write-off
 * GET    /payments/reconciliation      - Get reconciliation report
 * POST   /payments/reconcile           - Reconcile with bank deposit
 * GET    /payments/stats               - Get payment statistics
 * GET    /payments/search              - Search claim payments
 */
apiRouter.use('/payments', paymentsRouter);

/**
 * Payer Contract Management Routes
 * GET    /payers                    - List all payers (built-in + custom)
 * GET    /payers/search             - Search payers by name/ID
 * GET    /payers/medicare           - Get Medicare payers
 * GET    /payers/medicaid           - Get Medicaid payers
 * GET    /payers/bcbs               - Get BCBS payers
 * GET    /payers/:id                - Get payer detail
 * POST   /payers                    - Create custom payer
 * PUT    /payers/:id                - Update payer
 * GET    /payers/:id/contracts      - Get payer contracts
 * POST   /payers/:id/contracts      - Create contract
 * POST   /payers/:id/fee-schedule   - Import fee schedule
 * GET    /payers/:id/fee-lookup     - Lookup fee for CPT code
 * POST   /payers/:id/expected-reimbursement - Calculate expected payment
 * POST   /payers/:id/compare-medicare - Compare to Medicare rates
 * GET    /payers/:id/auth-requirements - Get auth requirements
 * POST   /payers/:id/auth-requirements - Set auth requirement
 * GET    /payers/:id/timely-filing-deadline - Get filing deadline
 * GET    /payers/:id/appeal-deadline - Get appeal deadline
 */
apiRouter.use('/payers', payersRouter);

/**
 * Clearinghouse Integration Routes
 * POST   /clearinghouse/submit          - Submit claims to clearinghouse
 * GET    /clearinghouse/status/:claimId - Check claim status
 * POST   /clearinghouse/status/refresh  - Trigger real-time status refresh
 * POST   /clearinghouse/eligibility     - Verify patient eligibility
 * GET    /clearinghouse/remittances     - Get available ERAs
 * POST   /clearinghouse/remittances/download - Trigger ERA download
 * POST   /clearinghouse/test-connection - Test clearinghouse connectivity
 * GET    /clearinghouse/supported       - Get supported clearinghouses
 * GET    /clearinghouse/configs         - List configurations
 * GET    /clearinghouse/configs/:id     - Get configuration
 * POST   /clearinghouse/configs         - Create configuration
 * PUT    /clearinghouse/configs/:id     - Update configuration
 * DELETE /clearinghouse/configs/:id     - Delete configuration
 * GET    /clearinghouse/template/:type  - Get configuration template
 * GET    /clearinghouse/transactions    - Get transaction history
 */
apiRouter.use('/clearinghouse', clearinghouseRouter);

/**
 * Claim Submission Routes (X12 837)
 * GET    /claim-submission                    - List claim submissions
 * POST   /claim-submission/create             - Create claim from encounter data
 * POST   /claim-submission/batch              - Batch submit multiple claims
 * GET    /claim-submission/:id                - Get claim submission details
 * POST   /claim-submission/:id/submit         - Submit to clearinghouse
 * GET    /claim-submission/:id/status         - Get claim status and history
 * POST   /claim-submission/:id/resubmit       - Resubmit with corrections
 * GET    /claim-submission/:id/x12            - Get raw X12 837 content
 */
apiRouter.use('/claim-submission', claimSubmissionRouter);

// ============================================================================
// Legacy Routes (for backward compatibility)
// ============================================================================

/**
 * Legacy Claims Routes
 * @deprecated Use /assessments for new implementations
 */
apiRouter.use('/claims', claimsRouter);

/**
 * Legacy File Routes
 * @deprecated Use /import and /export for new implementations
 */
apiRouter.use('/files', fileRouter);

// ============================================================================
// Charge Capture and Coding Routes
// ============================================================================

/**
 * Charge Capture Routes
 * POST   /charges                  - Create a new charge
 * GET    /charges/:id              - Get charge by ID
 * GET    /charges/encounter/:id    - Get charges by encounter
 * PUT    /charges/:id              - Update a charge
 * DELETE /charges/:id              - Delete a charge (soft delete)
 * POST   /charges/validate         - Validate charge before submission
 * POST   /charges/:id/audit        - Audit charge for compliance
 * POST   /charges/calculate        - Calculate charge amount
 * POST   /charges/batch            - Create multiple charges
 * POST   /charges/batch/validate   - Validate multiple charges
 *
 * Code Search Routes
 * GET    /charges/codes/cpt/search     - Search CPT codes
 * GET    /charges/codes/cpt/:code      - Get CPT code details
 * GET    /charges/codes/icd10/search   - Search ICD-10 codes
 * GET    /charges/codes/icd10/:code    - Get ICD-10 code details
 * GET    /charges/codes/revenue/search - Search revenue codes
 * GET    /charges/codes/revenue/:code  - Get revenue code details
 */
apiRouter.use('/charges', chargesRouter);

// ============================================================================
// SSI Eligibility Routes (Mugetsu Integration)
// ============================================================================

/**
 * SSI Eligibility Routes (Mugetsu Integration)
 * POST   /ssi-eligibility/assess         - Run full SSI assessment
 * GET    /ssi-eligibility/patient/:id    - Get patient SSI eligibility
 * POST   /ssi-eligibility/quick-score    - Quick approval likelihood
 * GET    /ssi-eligibility/strategic-timing/:id - Strategic recommendations
 * POST   /ssi-eligibility/batch          - Batch assessment
 * GET    /ssi-eligibility/status         - Service status
 */
apiRouter.use('/ssi-eligibility', ssiEligibilityRouter);

// ============================================================================
// Price Transparency Routes (CMS Compliance)
// ============================================================================

/**
 * Price Transparency Routes
 * POST   /transparency/estimate                    - Create price estimate
 * GET    /transparency/estimate/:id                - Get estimate details
 * GET    /transparency/estimate/history/:patientId - Get patient estimate history
 * POST   /transparency/estimate/:id/compare        - Compare estimate to actual
 * GET    /transparency/shoppable-services          - List 300 CMS shoppable services
 * GET    /transparency/shoppable-services/packages - Get service packages
 * GET    /transparency/shoppable-services/:code/prices - Get service prices
 * POST   /transparency/good-faith-estimate         - Generate No Surprises Act GFE
 * GET    /transparency/machine-readable-file       - Download MRF (JSON/CSV)
 * POST   /transparency/machine-readable-file/generate - Regenerate MRF
 * POST   /transparency/machine-readable-file/validate - Validate MRF compliance
 * GET    /transparency/estimate-accuracy           - Get accuracy report
 * POST   /transparency/payer-comparison            - Compare payer prices
 */
apiRouter.use('/transparency', transparencyRouter);

// ============================================================================
// Predictive Analytics Routes
// ============================================================================

/**
 * Predictive Analytics Routes
 * POST   /analytics/denial-prediction         - Predict denial risk for a claim
 * POST   /analytics/denial-prediction/batch   - Batch denial prediction
 * POST   /analytics/denial-prediction/train   - Train denial prediction model
 * GET    /analytics/collection-prioritization - Get prioritized collection list
 * GET    /analytics/revenue-forecast          - Get revenue forecast
 * GET    /analytics/seasonality               - Get seasonality patterns
 * POST   /analytics/cash-flow-projection      - Project cash flow from A/R
 * POST   /analytics/scenario-analysis         - Run what-if scenarios
 * GET    /analytics/kpi-dashboard             - Get KPI dashboard
 * GET    /analytics/kpi/:name/trend           - Get KPI trend over time
 * GET    /analytics/benchmarks                - Get industry benchmarks
 * POST   /analytics/export                    - Export analytics data
 */
apiRouter.use('/analytics', analyticsRouter);

// ============================================================================
// Workflow Rules Engine Routes
// ============================================================================

/**
 * Workflow Rules Routes
 * GET    /workflow/rules                  - List all rules
 * POST   /workflow/rules                  - Create new rule
 * GET    /workflow/rules/statistics       - Get rule statistics
 * GET    /workflow/rules/export           - Export rules
 * POST   /workflow/rules/import           - Import rules
 * POST   /workflow/rules/execute          - Execute rules for trigger
 * GET    /workflow/rules/:id              - Get rule detail
 * PUT    /workflow/rules/:id              - Update rule
 * DELETE /workflow/rules/:id              - Delete rule
 * POST   /workflow/rules/:id/toggle       - Enable/disable rule
 * POST   /workflow/rules/:id/test         - Test rule
 * GET    /workflow/rules/:id/history      - Execution history
 * GET    /workflow/templates              - Get rule templates
 * POST   /workflow/templates/:id/create   - Create rule from template
 */
apiRouter.use('/workflow', workflowRouter);

// ============================================================================
// Staff Productivity Routes
// ============================================================================

/**
 * Staff Productivity Tracking Routes
 */
apiRouter.use('/productivity', productivityRouter);

// ============================================================================
// Export individual routers for direct use
// ============================================================================

export {
  healthRouter,
  authRouter,
  organizationsRouter,
  rbacRouter,
  sftpRouter,
  documentRouter,
  assessmentsRouter,
  importRouter,
  exportRouter,
  presetsRouter,
  reportsRouter,
  claimsRouter,
  fileRouter,
  batchImportRouter,
  eligibilityRouter,
  complianceRouter,
  denialsRouter,
  workQueueRouter,
  collectionsRouter,
  paymentsRouter,
  payersRouter,
  clearinghouseRouter,
  claimSubmissionRouter,
  chargesRouter,
  ssiEligibilityRouter,
  transparencyRouter,
  analyticsRouter,
  workflowRouter,
  productivityRouter,
};
