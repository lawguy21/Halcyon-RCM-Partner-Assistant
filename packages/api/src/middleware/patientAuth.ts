/**
 * Patient Portal Token Authentication Middleware
 * Validates patient access tokens from URL params
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export interface PatientRequest extends Request {
  patientToken?: {
    id: string;
    token: string;
    assessmentId: string;
    patientEmail: string | null;
    patientName: string | null;
  };
}

/**
 * Middleware to validate patient access token from route param :token
 */
export async function authenticatePatientToken(req: PatientRequest, res: Response, next: NextFunction) {
  const { token } = req.params;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token is required', code: 'TOKEN_REQUIRED' },
    });
  }

  try {
    const accessToken = await prisma.patientAccessToken.findUnique({
      where: { token },
    });

    if (!accessToken) {
      return res.status(404).json({
        success: false,
        error: { message: 'Invalid or expired access link', code: 'TOKEN_NOT_FOUND' },
      });
    }

    if (accessToken.isRevoked) {
      return res.status(403).json({
        success: false,
        error: { message: 'This access link has been revoked', code: 'TOKEN_REVOKED' },
      });
    }

    if (new Date() > accessToken.expiresAt) {
      return res.status(403).json({
        success: false,
        error: { message: 'This access link has expired', code: 'TOKEN_EXPIRED' },
      });
    }

    // Update last accessed time
    await prisma.patientAccessToken.update({
      where: { id: accessToken.id },
      data: { lastAccessedAt: new Date() },
    });

    // Attach token data to request
    req.patientToken = {
      id: accessToken.id,
      token: accessToken.token,
      assessmentId: accessToken.assessmentId,
      patientEmail: accessToken.patientEmail,
      patientName: accessToken.patientName,
    };

    next();
  } catch (error) {
    console.error('[PatientAuth] Token validation error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Authentication failed', code: 'AUTH_ERROR' },
    });
  }
}
