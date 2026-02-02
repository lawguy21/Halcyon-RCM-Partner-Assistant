/**
 * @halcyon-rcm/api
 * Express API server for Halcyon RCM Partner Assistant
 *
 * A comprehensive REST API for revenue cycle management operations including:
 * - Recovery assessments (single and batch)
 * - CSV file import with column mapping
 * - Data export (CSV, worklist, executive summary, PDF)
 * - Mapping preset management
 * - Analytics and reporting
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { healthRouter, apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { tenantResolver } from './middleware/tenantResolver.js';
import { sftpService } from './services/index.js';
import { fileURLToPath } from 'url';
import { initializeQueue, stopQueue } from './lib/queue/index.js';
import { registerCSVImportWorker } from './lib/queue/workers/csvImportWorker.js';

// Version constant (defined early for use in routes)
export const VERSION = '1.0.0';

// ============================================================================
// App Configuration
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// Middleware Stack
// ============================================================================

// Security headers
app.use(helmet({
  // Allow CORS preflight
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration - restrict in production
const corsOrigin = process.env.CORS_ORIGIN;
if (NODE_ENV === 'production' && !corsOrigin) {
  console.warn(
    '[Security] WARNING: CORS_ORIGIN not set in production. ' +
    'Defaulting to same-origin only. Set CORS_ORIGIN to allow specific origins.'
  );
}
app.use(cors({
  origin: NODE_ENV === 'production'
    ? corsOrigin || false // Reject cross-origin in production if not configured
    : corsOrigin || true, // Allow all in development
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['Content-Disposition', 'X-Total-Count'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Request logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ============================================================================
// Multi-Tenant Domain Routing
// ============================================================================

// Tenant resolver middleware - resolves organization from custom domains
// This must run early to set req.organizationId and req.tenant context
app.use(tenantResolver);

// ============================================================================
// Routes
// ============================================================================

// Health check routes (both /health and /api/health for Railway compatibility)
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

// API routes
app.use('/api', apiRouter);

// API documentation endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: '@halcyon-rcm/api',
    version: VERSION,
    description: 'Halcyon RCM Partner Assistant API',
    documentation: '/api/docs',
    endpoints: {
      health: {
        'GET /health': 'Health check',
        'GET /health/ready': 'Readiness check',
        'GET /health/live': 'Liveness check',
      },
      auth: {
        'POST /api/auth/login': 'User login',
        'POST /api/auth/register': 'User registration',
        'POST /api/auth/forgot-password': 'Request password reset',
        'POST /api/auth/reset-password': 'Reset password with token',
        'POST /api/auth/refresh': 'Refresh access token',
        'GET /api/auth/me': 'Get current user',
        'PUT /api/auth/profile': 'Update user profile',
        'PUT /api/auth/change-password': 'Change password',
        'POST /api/auth/logout': 'Logout',
      },
      rbac: {
        'GET /api/rbac/me/permissions': 'Get current user permissions',
        'GET /api/rbac/me/roles': 'Get current user roles',
        'GET /api/rbac/me/departments': 'Get current user departments',
        'GET /api/rbac/roles': 'List all roles',
        'POST /api/rbac/roles': 'Create custom role',
        'GET /api/rbac/roles/:id/permissions': 'Get role permissions',
        'PUT /api/rbac/roles/:id/permissions': 'Update role permissions',
        'GET /api/rbac/users/:id/permissions': 'Get user effective permissions',
        'POST /api/rbac/users/:id/roles': 'Assign role to user',
        'POST /api/rbac/users/:id/departments': 'Assign department to user',
        'GET /api/rbac/permissions': 'List all available permissions',
        'GET /api/rbac/audit': 'Get access audit logs',
      },
      organizations: {
        'GET /api/organizations': 'List organizations',
        'POST /api/organizations': 'Create organization (admin)',
        'GET /api/organizations/:id': 'Get organization',
        'PUT /api/organizations/:id': 'Update organization',
        'DELETE /api/organizations/:id': 'Delete organization (admin)',
        'GET /api/organizations/:id/stats': 'Get organization stats',
        'POST /api/organizations/:id/users': 'Add user to organization (admin)',
        'DELETE /api/organizations/:id/users/:userId': 'Remove user (admin)',
      },
      domains: {
        'GET /api/tenant': 'Get tenant info for current domain',
        'POST /api/organizations/:id/domains': 'Add custom domain',
        'GET /api/organizations/:id/domains': 'List organization domains',
        'GET /api/organizations/:id/domains/:domain': 'Get domain details',
        'DELETE /api/organizations/:id/domains/:domain': 'Remove domain',
        'POST /api/organizations/:id/domains/:domain/verify': 'Verify domain ownership',
        'PUT /api/organizations/:id/domains/:domain/primary': 'Set primary domain',
        'GET /api/admin/domains': 'List all domains (admin)',
        'DELETE /api/admin/domains/:id': 'Force delete domain (admin)',
      },
      assessments: {
        'POST /api/assessments': 'Create single assessment',
        'POST /api/assessments/batch': 'Create batch assessments',
        'GET /api/assessments': 'List assessments (paginated)',
        'GET /api/assessments/:id': 'Get single assessment',
        'PATCH /api/assessments/:id': 'Update assessment metadata',
        'PUT /api/assessments/:id/recalculate': 'Recalculate assessment',
        'DELETE /api/assessments/:id': 'Delete assessment',
        'GET /api/assessments/:id/export': 'Export single assessment',
      },
      import: {
        'POST /api/import/csv': 'Import CSV file',
        'POST /api/import/preview': 'Preview CSV with detected columns',
        'POST /api/import/validate': 'Validate CSV without importing',
        'GET /api/import/history': 'Get import history',
      },
      batchImport: {
        'POST /api/batch-import/start': 'Start async batch import (1000+ rows)',
        'POST /api/batch-import/validate': 'Validate large CSV without importing',
        'GET /api/batch-import/status/:id': 'Get batch import status',
        'GET /api/batch-import/progress/:id/stream': 'SSE progress stream',
        'POST /api/batch-import/cancel/:id': 'Cancel running import',
        'POST /api/batch-import/resume/:id': 'Resume failed/cancelled import',
        'GET /api/batch-import/errors/:id': 'Export errors as CSV',
        'GET /api/batch-import/list': 'List all batch imports',
      },
      export: {
        'POST /api/export/csv': 'Export to CSV',
        'POST /api/export/worklist': 'Export prioritized worklist',
        'POST /api/export/executive-summary': 'Export executive summary',
        'POST /api/export/pdf': 'Export PDF report data',
        'GET /api/export/templates': 'Get export templates',
      },
      presets: {
        'GET /api/presets': 'List mapping presets',
        'GET /api/presets/:id': 'Get preset details',
        'POST /api/presets': 'Create custom preset',
        'POST /api/presets/:id/clone': 'Clone preset',
        'PUT /api/presets/:id': 'Update custom preset',
        'DELETE /api/presets/:id': 'Delete custom preset',
      },
      reports: {
        'GET /api/reports/summary': 'Overall recovery summary',
        'GET /api/reports/by-pathway': 'Breakdown by pathway',
        'GET /api/reports/by-state': 'Breakdown by state',
        'GET /api/reports/by-urgency': 'Breakdown by urgency',
        'GET /api/reports/trends': 'Recovery trends over time',
        'GET /api/reports/quick-stats': 'Dashboard quick stats',
        'GET /api/reports/comparison': 'Compare time periods',
      },
    },
  });
});

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
    },
  });
});

// Error handling
app.use(errorHandler);

// ============================================================================
// Server Management
// ============================================================================

/**
 * Start the API server
 */
export async function startServer(port: number = Number(PORT)) {
  // Initialize job queue for batch imports
  let queueInitialized = false;
  try {
    const boss = await initializeQueue();
    await registerCSVImportWorker(boss);
    queueInitialized = true;
    console.log('[Server] Job queue initialized for batch imports');
  } catch (error) {
    console.warn('[Server] Job queue not available (batch imports will be limited):',
      error instanceof Error ? error.message : 'Unknown error');
  }

  const server = app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Halcyon RCM Partner Assistant API                        ║
║                                                            ║
║   Server running at: http://localhost:${port}               ║
║   Environment: ${NODE_ENV.padEnd(41)}║
║   Version: ${VERSION.padEnd(45)}║
║   Job Queue: ${(queueInitialized ? 'Active' : 'Disabled').padEnd(43)}║
║                                                            ║
║   Endpoints:                                               ║
║   - Health:      GET  /health                              ║
║   - API Docs:    GET  /api                                 ║
║   - Auth:        POST /api/auth/login                      ║
║   - Assessments: POST /api/assessments                     ║
║   - Import:      POST /api/import/csv                      ║
║   - Batch:       POST /api/batch-import/start              ║
║   - Export:      POST /api/export/csv                      ║
║   - Reports:     GET  /api/reports/summary                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Start SFTP service if enabled
    if (process.env.SFTP_SERVICE_ENABLED === 'true') {
      sftpService.start().then(() => {
        console.log('[Server] SFTP service started');
      }).catch((error) => {
        console.error('[Server] Failed to start SFTP service:', error);
      });
    }
  });

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('\n[Server] Shutting down...');

    // Stop job queue
    if (queueInitialized) {
      console.log('[Server] Stopping job queue...');
      await stopQueue();
    }

    if (sftpService.isServiceRunning()) {
      await sftpService.stop();
    }
    server.close(() => {
      console.log('[Server] Closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}

// Only start if this is the main module (ESM compatible)
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  startServer();
}

// ============================================================================
// Exports
// ============================================================================

export { app, startServer };

// Export controllers for programmatic use
export { assessmentController } from './controllers/assessmentController.js';
export { importController } from './controllers/importController.js';
export { batchImportController } from './controllers/batchImportController.js';
export { exportController } from './controllers/exportController.js';
export { reportController } from './controllers/reportController.js';

// Export services
export { sftpService } from './services/index.js';

// Export auth utilities
export * as authController from './controllers/authController.js';
export * as organizationController from './controllers/organizationController.js';
export * as rbacController from './controllers/rbacController.js';
export {
  authenticateToken,
  requireRole,
  optionalAuth,
  generateToken,
  verifyToken,
  generateRefreshToken,
} from './middleware/auth.js';
export type { AuthRequest, JWTPayload } from './middleware/auth.js';

// Export RBAC middleware
export {
  loadRBAC,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole as requireRBACRole,
  requireDepartment,
  requireOwnership,
  requirePermissionOrOwnership,
  combineMiddleware,
  registerOwnershipChecker,
} from './middleware/rbac.js';
export type { RBACRequest, OwnershipChecker } from './middleware/rbac.js';

// Export RBAC service
export { rbacService } from './services/rbacService.js';

// Export tenant resolver middleware and utilities
export {
  tenantResolver,
  createTenantResolver,
  requireTenant,
  getTenantInfo,
  clearDomainCache,
  clearOrganizationCache,
  clearAllCache,
} from './middleware/tenantResolver.js';
export type { TenantInfo, TenantRequest, TenantResolverOptions } from './middleware/tenantResolver.js';

// Export domain service and controller
export { domainService } from './services/domainService.js';
export * as domainController from './controllers/domainController.js';
export type { DomainInput, DomainInfo, DomainVerificationResult, DomainListResult } from './services/domainService.js';

export { validateRequest, validateQuery, validateParams } from './middleware/validateRequest.js';

// Export types
export type { StoredAssessment, AssessmentFilters, PaginatedResponse } from './controllers/assessmentController.js';
export type { ImportHistoryEntry, ImportOptions, CSVValidationResult } from './controllers/importController.js';
export type { CSVExportOptions, WorklistExportOptions, ExecutiveSummaryOptions, PDFExportOptions } from './controllers/exportController.js';
export type { SummaryReport, PathwayBreakdownReport, StateBreakdownReport, UrgencyBreakdownReport, TrendReport } from './controllers/reportController.js';
