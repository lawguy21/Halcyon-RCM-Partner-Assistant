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

// Legacy routes (keeping for backward compatibility)
import { claimsRouter } from './claims.js';
import { fileRouter } from './files.js';

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
// Export individual routers for direct use
// ============================================================================

export {
  healthRouter,
  authRouter,
  organizationsRouter,
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
};
