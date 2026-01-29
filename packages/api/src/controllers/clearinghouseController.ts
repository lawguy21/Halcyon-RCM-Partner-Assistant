// @ts-nocheck
/**
 * Clearinghouse Controller
 * REST API handlers for clearinghouse operations
 */

import type { Request, Response } from 'express';
import { clearinghouseService } from '../services/clearinghouseService.js';
import { prisma } from '../lib/prisma.js';
import {
  getSupportedClearinghouses,
  validateClearinghouseConfig,
  getConfigTemplate,
  type ClearinghouseConfig,
} from '../integrations/clearinghouse/index.js';

/**
 * Clearinghouse Controller
 *
 * Handles HTTP requests for clearinghouse operations including:
 * - Claim submission
 * - Status checking
 * - Eligibility verification
 * - ERA/remittance retrieval
 * - Configuration management
 */
export class ClearinghouseController {
  /**
   * POST /clearinghouse/submit
   * Submit claims to clearinghouse
   */
  async submitClaims(req: Request, res: Response): Promise<void> {
    try {
      const { claimIds, organizationId, clearinghouseConfigId, priority } = req.body;

      // Validate input
      if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'claimIds must be a non-empty array',
        });
        return;
      }

      // Limit batch size
      if (claimIds.length > 500) {
        res.status(400).json({
          error: 'Batch too large',
          message: 'Maximum 500 claims per batch',
        });
        return;
      }

      const result = await clearinghouseService.submitClaimBatch(claimIds, {
        organizationId,
        clearinghouseConfigId,
        priority,
      });

      res.status(200).json({
        success: true,
        data: {
          transactionId: result.transactionId,
          summary: {
            accepted: result.accepted,
            rejected: result.rejected,
            pending: result.pending,
            total: claimIds.length,
          },
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Submit error:', error);
      res.status(500).json({
        error: 'Submission failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /clearinghouse/status/:claimId
   * Check status of a claim
   */
  async checkStatus(req: Request, res: Response): Promise<void> {
    try {
      const { claimId } = req.params;
      const { organizationId, clearinghouseConfigId } = req.query;

      if (!claimId) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'claimId is required',
        });
        return;
      }

      // Get claim from database
      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
        include: {
          account: {
            include: {
              assessment: true,
            },
          },
          denials: {
            orderBy: { denialDate: 'desc' },
            take: 5,
          },
          appeals: {
            orderBy: { filedDate: 'desc' },
            take: 5,
          },
        },
      });

      if (!claim) {
        res.status(404).json({
          error: 'Claim not found',
          message: `No claim found with ID: ${claimId}`,
        });
        return;
      }

      // Return current status from database
      // Real-time status check would be triggered separately
      res.status(200).json({
        success: true,
        data: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          status: claim.status,
          submittedDate: claim.submittedDate,
          billedAmount: claim.billedAmount,
          allowedAmount: claim.allowedAmount,
          paidAmount: claim.paidAmount,
          patientResponsibility: claim.patientResponsibility,
          denial: claim.denialCode ? {
            code: claim.denialCode,
            reason: claim.denialReason,
            date: claim.denialDate,
          } : null,
          recentDenials: claim.denials,
          recentAppeals: claim.appeals,
          lastUpdated: claim.updatedAt,
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Status check error:', error);
      res.status(500).json({
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /clearinghouse/status/refresh
   * Trigger real-time status refresh for claims
   */
  async refreshStatus(req: Request, res: Response): Promise<void> {
    try {
      const { claimIds } = req.body;

      if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'claimIds must be a non-empty array',
        });
        return;
      }

      if (claimIds.length > 100) {
        res.status(400).json({
          error: 'Batch too large',
          message: 'Maximum 100 claims per status refresh',
        });
        return;
      }

      // Trigger status poll for specific claims
      // This would call the clearinghouse directly
      const result = await clearinghouseService.pollClaimStatus();

      res.status(200).json({
        success: true,
        data: {
          checked: result.checked,
          updated: result.updated,
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Status refresh error:', error);
      res.status(500).json({
        error: 'Status refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /clearinghouse/eligibility
   * Verify patient eligibility
   */
  async verifyEligibility(req: Request, res: Response): Promise<void> {
    try {
      const {
        patientId,
        payerId,
        organizationId,
        clearinghouseConfigId,
        serviceType,
        dateOfService,
        providerNpi,
      } = req.body;

      // Validate required fields
      if (!patientId) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'patientId is required',
        });
        return;
      }

      if (!payerId) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'payerId is required',
        });
        return;
      }

      const result = await clearinghouseService.verifyEligibility(patientId, payerId, {
        organizationId,
        clearinghouseConfigId,
        serviceType,
        dateOfService: dateOfService ? new Date(dateOfService) : undefined,
        providerNpi,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('[ClearinghouseController] Eligibility check error:', error);
      res.status(500).json({
        error: 'Eligibility verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /clearinghouse/remittances
   * Get available Electronic Remittance Advice records
   */
  async getRemittances(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        organizationId,
        clearinghouseConfigId,
        limit,
        offset,
      } = req.query;

      // Build query filters
      const where: any = {
        type: 'ERA_DOWNLOAD',
      };

      if (clearinghouseConfigId) {
        where.configId = clearinghouseConfigId;
      }

      if (startDate || endDate) {
        where.submittedAt = {};
        if (startDate) {
          where.submittedAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.submittedAt.lte = new Date(endDate as string);
        }
      }

      // If organization filter needed, join through config
      if (organizationId) {
        const orgConfigs = await prisma.clearinghouseConfig.findMany({
          where: { organizationId: organizationId as string },
          select: { id: true },
        });
        where.configId = { in: orgConfigs.map((c) => c.id) };
      }

      // Query transactions
      const [transactions, total] = await Promise.all([
        prisma.clearinghouseTransaction.findMany({
          where,
          orderBy: { submittedAt: 'desc' },
          take: Math.min(Number(limit) || 50, 100),
          skip: Number(offset) || 0,
          include: {
            config: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        }),
        prisma.clearinghouseTransaction.count({ where }),
      ]);

      // Map to remittance format
      const remittances = transactions.map((t) => ({
        id: t.transactionId || t.id,
        clearinghouse: t.config,
        paymentDate: t.submittedAt,
        downloadedAt: t.completedAt,
        claimCount: t.claimIds?.length || 0,
        details: t.response,
      }));

      res.status(200).json({
        success: true,
        data: {
          remittances,
          pagination: {
            total,
            limit: Math.min(Number(limit) || 50, 100),
            offset: Number(offset) || 0,
          },
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Get remittances error:', error);
      res.status(500).json({
        error: 'Failed to retrieve remittances',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /clearinghouse/remittances/download
   * Trigger ERA download from clearinghouses
   */
  async downloadRemittances(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, clearinghouseConfigId } = req.body;

      const result = await clearinghouseService.downloadRemittances();

      res.status(200).json({
        success: true,
        data: {
          downloaded: result.downloaded,
          totalPayments: result.totalPayments,
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Download remittances error:', error);
      res.status(500).json({
        error: 'ERA download failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /clearinghouse/test-connection
   * Test connectivity to a clearinghouse
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.body;

      if (!configId) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'configId is required',
        });
        return;
      }

      const result = await clearinghouseService.testConnection(configId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('[ClearinghouseController] Test connection error:', error);
      res.status(500).json({
        error: 'Connection test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /clearinghouse/supported
   * Get list of supported clearinghouses
   */
  async getSupportedClearinghouses(req: Request, res: Response): Promise<void> {
    try {
      const clearinghouses = getSupportedClearinghouses();

      res.status(200).json({
        success: true,
        data: clearinghouses,
      });
    } catch (error) {
      console.error('[ClearinghouseController] Get supported error:', error);
      res.status(500).json({
        error: 'Failed to retrieve supported clearinghouses',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /clearinghouse/configs
   * List clearinghouse configurations for an organization
   */
  async listConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.query;

      const configs = await prisma.clearinghouseConfig.findMany({
        where: organizationId ? { organizationId: organizationId as string } : undefined,
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      });

      // Mask sensitive credentials
      const safeConfigs = configs.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        apiUrl: c.apiUrl,
        organizationId: c.organizationId,
        isActive: c.isActive,
        isPrimary: c.isPrimary,
        supportedTransactions: c.supportedTransactions,
        environment: c.environment,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        // Don't expose credentials
      }));

      res.status(200).json({
        success: true,
        data: safeConfigs,
      });
    } catch (error) {
      console.error('[ClearinghouseController] List configs error:', error);
      res.status(500).json({
        error: 'Failed to retrieve configurations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /clearinghouse/configs/:id
   * Get a specific clearinghouse configuration
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const config = await prisma.clearinghouseConfig.findUnique({
        where: { id },
      });

      if (!config) {
        res.status(404).json({
          error: 'Configuration not found',
          message: `No configuration found with ID: ${id}`,
        });
        return;
      }

      // Mask sensitive credentials
      res.status(200).json({
        success: true,
        data: {
          id: config.id,
          name: config.name,
          type: config.type,
          apiUrl: config.apiUrl,
          tokenEndpoint: config.tokenEndpoint,
          organizationId: config.organizationId,
          isActive: config.isActive,
          isPrimary: config.isPrimary,
          supportedTransactions: config.supportedTransactions,
          environment: config.environment,
          timeout: config.timeout,
          retry: config.retry,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          // Credentials masked
          hasClientId: !!(config.credentials as any)?.clientId,
          hasClientSecret: !!(config.credentials as any)?.clientSecret,
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Get config error:', error);
      res.status(500).json({
        error: 'Failed to retrieve configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /clearinghouse/configs
   * Create a new clearinghouse configuration
   */
  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const configData = req.body;

      // Validate configuration
      const validation = validateClearinghouseConfig(configData);
      if (!validation.valid) {
        res.status(400).json({
          error: 'Invalid configuration',
          messages: validation.errors,
        });
        return;
      }

      // Encrypt credentials before storing
      const encryptedCredentials = this.encryptCredentials(configData.credentials);

      const config = await prisma.clearinghouseConfig.create({
        data: {
          name: configData.name,
          type: configData.type,
          apiUrl: configData.apiUrl,
          tokenEndpoint: configData.tokenEndpoint,
          credentials: encryptedCredentials,
          supportedTransactions: configData.supportedTransactions,
          organizationId: configData.organizationId,
          isActive: configData.isActive ?? false,
          isPrimary: configData.isPrimary ?? false,
          timeout: configData.timeout ?? 30000,
          retry: configData.retry ?? { maxRetries: 3, retryDelay: 1000 },
          environment: configData.environment ?? 'sandbox',
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: config.id,
          name: config.name,
          type: config.type,
          isActive: config.isActive,
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Create config error:', error);
      res.status(500).json({
        error: 'Failed to create configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /clearinghouse/configs/:id
   * Update a clearinghouse configuration
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await prisma.clearinghouseConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          error: 'Configuration not found',
          message: `No configuration found with ID: ${id}`,
        });
        return;
      }

      // Build update data
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.apiUrl !== undefined) updateData.apiUrl = updates.apiUrl;
      if (updates.tokenEndpoint !== undefined) updateData.tokenEndpoint = updates.tokenEndpoint;
      if (updates.supportedTransactions !== undefined) updateData.supportedTransactions = updates.supportedTransactions;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      if (updates.isPrimary !== undefined) updateData.isPrimary = updates.isPrimary;
      if (updates.timeout !== undefined) updateData.timeout = updates.timeout;
      if (updates.retry !== undefined) updateData.retry = updates.retry;
      if (updates.environment !== undefined) updateData.environment = updates.environment;

      // Handle credential updates
      if (updates.credentials) {
        updateData.credentials = this.encryptCredentials(updates.credentials);
      }

      const config = await prisma.clearinghouseConfig.update({
        where: { id },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        data: {
          id: config.id,
          name: config.name,
          type: config.type,
          isActive: config.isActive,
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Update config error:', error);
      res.status(500).json({
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /clearinghouse/configs/:id
   * Delete a clearinghouse configuration
   */
  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const existing = await prisma.clearinghouseConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          error: 'Configuration not found',
          message: `No configuration found with ID: ${id}`,
        });
        return;
      }

      // Check if there are related transactions
      const transactionCount = await prisma.clearinghouseTransaction.count({
        where: { configId: id },
      });

      if (transactionCount > 0) {
        res.status(400).json({
          error: 'Cannot delete',
          message: `Configuration has ${transactionCount} associated transactions. Deactivate instead.`,
        });
        return;
      }

      await prisma.clearinghouseConfig.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Configuration deleted successfully',
      });
    } catch (error) {
      console.error('[ClearinghouseController] Delete config error:', error);
      res.status(500).json({
        error: 'Failed to delete configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /clearinghouse/template/:type
   * Get configuration template for a clearinghouse type
   */
  async getConfigTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;

      const template = getConfigTemplate(type as any);

      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('[ClearinghouseController] Get template error:', error);
      res.status(500).json({
        error: 'Failed to get template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /clearinghouse/transactions
   * Get clearinghouse transaction history
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const {
        type,
        status,
        configId,
        startDate,
        endDate,
        limit,
        offset,
      } = req.query;

      const where: any = {};

      if (type) where.type = type;
      if (status) where.status = status;
      if (configId) where.configId = configId;

      if (startDate || endDate) {
        where.submittedAt = {};
        if (startDate) where.submittedAt.gte = new Date(startDate as string);
        if (endDate) where.submittedAt.lte = new Date(endDate as string);
      }

      const [transactions, total] = await Promise.all([
        prisma.clearinghouseTransaction.findMany({
          where,
          orderBy: { submittedAt: 'desc' },
          take: Math.min(Number(limit) || 50, 100),
          skip: Number(offset) || 0,
          include: {
            config: {
              select: { id: true, name: true, type: true },
            },
          },
        }),
        prisma.clearinghouseTransaction.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            limit: Math.min(Number(limit) || 50, 100),
            offset: Number(offset) || 0,
          },
        },
      });
    } catch (error) {
      console.error('[ClearinghouseController] Get transactions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Encrypt credentials for storage
   * In production, use proper encryption (e.g., AWS KMS, HashiCorp Vault)
   */
  private encryptCredentials(credentials: any): any {
    // Simple base64 encoding for development
    // In production, use proper encryption
    return Buffer.from(JSON.stringify(credentials)).toString('base64');
  }
}

export const clearinghouseController = new ClearinghouseController();
