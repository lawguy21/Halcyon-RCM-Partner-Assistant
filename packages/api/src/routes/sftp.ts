/**
 * SFTP Routes
 * API endpoints for managing SFTP connections and file synchronization
 */

import { Router } from 'express';
import * as sftpController from '../controllers/sftpController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /sftp/connections
 * List all SFTP connections
 * Query params: organizationId (optional)
 */
router.get('/connections', sftpController.listConnections);

/**
 * POST /sftp/test
 * Test an SFTP connection (before creating)
 * Body: { host, port, username, password?, privateKey?, inboundPath?, outboundPath?, filePattern? }
 */
router.post('/test', sftpController.testConnection);

/**
 * POST /sftp/connections
 * Create a new SFTP connection
 * Requires ADMIN or USER role
 */
router.post('/connections', requireRole('ADMIN', 'USER'), sftpController.createConnection);

/**
 * GET /sftp/connections/:id
 * Get a single SFTP connection by ID
 */
router.get('/connections/:id', sftpController.getConnection);

/**
 * PUT /sftp/connections/:id
 * Update an existing SFTP connection
 * Requires ADMIN or USER role
 */
router.put('/connections/:id', requireRole('ADMIN', 'USER'), sftpController.updateConnection);

/**
 * DELETE /sftp/connections/:id
 * Delete an SFTP connection
 * Requires ADMIN role
 */
router.delete('/connections/:id', requireRole('ADMIN'), sftpController.deleteConnection);

/**
 * POST /sftp/connections/:id/sync
 * Trigger a manual sync for an SFTP connection
 * Requires ADMIN or USER role
 */
router.post('/connections/:id/sync', requireRole('ADMIN', 'USER'), sftpController.triggerSync);

/**
 * GET /sftp/connections/:id/logs
 * Get sync logs for an SFTP connection
 * Query params: limit (default 20), offset (default 0)
 */
router.get('/connections/:id/logs', sftpController.getSyncLogs);

/**
 * POST /sftp/connections/:id/upload
 * Upload results to an SFTP server
 * Requires ADMIN or USER role
 * Body: { content, filename }
 */
router.post('/connections/:id/upload', requireRole('ADMIN', 'USER'), sftpController.uploadResults);

export { router as sftpRouter };
