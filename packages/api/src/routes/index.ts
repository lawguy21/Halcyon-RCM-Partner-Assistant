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
  assessmentsRouter,
  importRouter,
  exportRouter,
  presetsRouter,
  reportsRouter,
  claimsRouter,
  fileRouter,
};
