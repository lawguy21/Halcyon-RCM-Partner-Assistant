/**
 * User Preferences Routes
 * Routes for managing user preference settings like showDemoData
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const updatePreferencesSchema = z.object({
  showDemoData: z.boolean().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/user/preferences
 * Get current user's preferences
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
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

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        showDemoData: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'NOT_FOUND',
        },
      });
    }

    return res.json({
      success: true,
      showDemoData: user.showDemoData,
    });
  } catch (error) {
    console.error('[UserPreferences] Get preferences error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get preferences',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * PUT /api/user/preferences
 * Update current user's preferences
 */
router.put('/', authenticateToken, validateRequest(updatePreferencesSchema), async (req: AuthRequest, res: Response) => {
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

    const { showDemoData } = req.body;

    const updateData: { showDemoData?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (typeof showDemoData === 'boolean') {
      updateData.showDemoData = showDemoData;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        showDemoData: true,
      },
    });

    // Log the preference update
    await prisma.auditLog.create({
      data: {
        action: 'PREFERENCES_UPDATE',
        entityType: 'User',
        entityId: req.user.id,
        userId: req.user.id,
        details: { showDemoData: user.showDemoData },
      },
    });

    return res.json({
      success: true,
      preferences: {
        showDemoData: user.showDemoData,
      },
    });
  } catch (error) {
    console.error('[UserPreferences] Update preferences error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update preferences',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

export { router as userPreferencesRouter };
