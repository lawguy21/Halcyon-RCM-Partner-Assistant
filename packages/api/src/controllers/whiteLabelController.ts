// @ts-nocheck
/**
 * White-Label Controller
 *
 * REST API endpoints for white-label configuration management.
 */

import { Response } from 'express';
import { RBACRequest } from '../middleware/rbac.js';
import { whiteLabelService } from '../services/whiteLabelService.js';

// ============================================================================
// CURRENT ORGANIZATION CONFIG ENDPOINTS
// ============================================================================

/**
 * GET /white-label/config
 * Get white-label configuration for the current user's organization
 */
export async function getConfig(req: RBACRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    if (!req.user.organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User is not associated with an organization',
          code: 'NO_ORGANIZATION',
        },
      });
    }

    const config = await whiteLabelService.getConfig(req.user.organizationId);

    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[WhiteLabel] Get config error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get white-label configuration',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * PUT /white-label/config
 * Update white-label configuration for the current user's organization
 * Requires org admin permission
 */
export async function updateConfig(req: RBACRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    if (!req.user.organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User is not associated with an organization',
          code: 'NO_ORGANIZATION',
        },
      });
    }

    const config = await whiteLabelService.updateConfig(
      req.user.organizationId,
      req.body,
      req.user.id
    );

    return res.json({
      success: true,
      data: config,
      message: 'White-label configuration updated successfully',
    });
  } catch (error) {
    console.error('[WhiteLabel] Update config error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update configuration';
    const statusCode = message.includes('Validation failed') ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * DELETE /white-label/config
 * Delete white-label configuration for the current user's organization (reset to defaults)
 * Requires org admin permission
 */
export async function deleteConfig(req: RBACRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    if (!req.user.organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User is not associated with an organization',
          code: 'NO_ORGANIZATION',
        },
      });
    }

    await whiteLabelService.deleteConfig(req.user.organizationId, req.user.id);

    return res.json({
      success: true,
      message: 'White-label configuration reset to defaults',
    });
  } catch (error) {
    console.error('[WhiteLabel] Delete config error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete configuration';
    const statusCode = message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * GET /white-label/defaults
 * Get default white-label configuration values
 */
export async function getDefaults(req: RBACRequest, res: Response) {
  try {
    const defaults = whiteLabelService.getDefaultConfig();

    return res.json({
      success: true,
      data: defaults,
    });
  } catch (error) {
    console.error('[WhiteLabel] Get defaults error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get default configuration',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * POST /white-label/validate
 * Validate white-label configuration values without saving
 */
export async function validateConfig(req: RBACRequest, res: Response) {
  try {
    const validation = whiteLabelService.validateConfig(req.body);

    return res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('[WhiteLabel] Validate config error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to validate configuration',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

// ============================================================================
// SUPER ADMIN ORGANIZATION CONFIG ENDPOINTS
// ============================================================================

/**
 * GET /organizations/:id/white-label
 * Get white-label configuration for a specific organization
 * Super admin only
 */
export async function getOrgConfig(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Organization ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const config = await whiteLabelService.getConfig(id);

    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[WhiteLabel] Get org config error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get organization white-label configuration',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * PUT /organizations/:id/white-label
 * Update white-label configuration for a specific organization
 * Super admin only
 */
export async function updateOrgConfig(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Organization ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const config = await whiteLabelService.updateConfig(
      id,
      req.body,
      req.user?.id
    );

    return res.json({
      success: true,
      data: config,
      message: 'Organization white-label configuration updated successfully',
    });
  } catch (error) {
    console.error('[WhiteLabel] Update org config error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update configuration';

    if (message.includes('Organization not found')) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Organization not found',
          code: 'NOT_FOUND',
        },
      });
    }

    const statusCode = message.includes('Validation failed') ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * DELETE /organizations/:id/white-label
 * Delete white-label configuration for a specific organization (reset to defaults)
 * Super admin only
 */
export async function deleteOrgConfig(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Organization ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    await whiteLabelService.deleteConfig(id, req.user?.id);

    return res.json({
      success: true,
      message: 'Organization white-label configuration reset to defaults',
    });
  } catch (error) {
    console.error('[WhiteLabel] Delete org config error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete configuration';
    const statusCode = message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
      },
    });
  }
}
