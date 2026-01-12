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
import { sftpService } from './services/index.js';

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

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
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
// Routes
// ============================================================================

// Health check routes (no /api prefix)
app.use('/health', healthRouter);

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
export function startServer(port: number = Number(PORT)) {
  const server = app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Halcyon RCM Partner Assistant API                        ║
║                                                            ║
║   Server running at: http://localhost:${port}               ║
║   Environment: ${NODE_ENV.padEnd(41)}║
║   Version: ${VERSION.padEnd(45)}║
║                                                            ║
║   Endpoints:                                               ║
║   - Health:      GET  /health                              ║
║   - API Docs:    GET  /api                                 ║
║   - Auth:        POST /api/auth/login                      ║
║   - Assessments: POST /api/assessments                     ║
║   - Import:      POST /api/import/csv                      ║
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

// Only start if this is the main module
if (require.main === module) {
  startServer();
}

// ============================================================================
// Exports
// ============================================================================

export { app };
export const VERSION = '1.0.0';

// Export controllers for programmatic use
export { assessmentController } from './controllers/assessmentController.js';
export { importController } from './controllers/importController.js';
export { exportController } from './controllers/exportController.js';
export { reportController } from './controllers/reportController.js';

// Export services
export { sftpService } from './services/index.js';

// Export auth utilities
export * as authController from './controllers/authController.js';
export * as organizationController from './controllers/organizationController.js';
export {
  authenticateToken,
  requireRole,
  optionalAuth,
  generateToken,
  verifyToken,
  generateRefreshToken,
} from './middleware/auth.js';
export type { AuthRequest, JWTPayload } from './middleware/auth.js';
export { validateRequest, validateQuery, validateParams } from './middleware/validateRequest.js';

// Export types
export type { StoredAssessment, AssessmentFilters, PaginatedResponse } from './controllers/assessmentController.js';
export type { ImportHistoryEntry, ImportOptions, CSVValidationResult } from './controllers/importController.js';
export type { CSVExportOptions, WorklistExportOptions, ExecutiveSummaryOptions, PDFExportOptions } from './controllers/exportController.js';
export type { SummaryReport, PathwayBreakdownReport, StateBreakdownReport, UrgencyBreakdownReport, TrendReport } from './controllers/reportController.js';
