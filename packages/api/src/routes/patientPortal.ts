/**
 * Patient Portal Routes
 * Public patient-facing routes for document upload and assessment access
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { authenticatePatientToken, type PatientRequest } from '../middleware/patientAuth.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { handleDocumentUpload, requireDocument } from '../middleware/upload.js';

export const patientPortalRouter = Router();

// Rate limiting for patient-facing endpoints (token validation, uploads)
const patientAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
  },
});

const patientUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Upload limit reached. Please try again later.', code: 'RATE_LIMITED' },
  },
});

// ============================================================================
// Staff-facing routes (require staff auth) — manage patient access tokens
// ============================================================================

/**
 * POST /patient-portal/tokens
 * Staff creates a patient access token for an assessment
 */
patientPortalRouter.post('/tokens', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { assessmentId, patientEmail, patientName, expiresInDays = 30 } = req.body;

    if (!assessmentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'assessmentId is required', code: 'VALIDATION_ERROR' },
      });
    }

    // Verify assessment exists
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Assessment not found', code: 'NOT_FOUND' },
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.min(expiresInDays, 90));

    const accessToken = await prisma.patientAccessToken.create({
      data: {
        assessmentId,
        patientEmail: patientEmail || null,
        patientName: patientName || null,
        expiresAt,
        createdById: req.user?.id || null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: accessToken.id,
        token: accessToken.token,
        assessmentId: accessToken.assessmentId,
        patientEmail: accessToken.patientEmail,
        patientName: accessToken.patientName,
        expiresAt: accessToken.expiresAt,
        createdAt: accessToken.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /patient-portal/tokens/:assessmentId
 * Staff lists active tokens for an assessment
 */
patientPortalRouter.get('/tokens/:assessmentId', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { assessmentId } = req.params;

    const tokens = await prisma.patientAccessToken.findMany({
      where: { assessmentId },
      select: {
        id: true,
        token: true,
        patientEmail: true,
        patientName: true,
        expiresAt: true,
        lastAccessedAt: true,
        isRevoked: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /patient-portal/tokens/:tokenId/revoke
 * Staff revokes a patient access token
 */
patientPortalRouter.delete('/tokens/:tokenId/revoke', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tokenId } = req.params;

    const token = await prisma.patientAccessToken.findUnique({ where: { id: tokenId } });
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { message: 'Token not found', code: 'NOT_FOUND' },
      });
    }

    await prisma.patientAccessToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });

    res.json({ success: true, message: 'Token revoked' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Patient-facing routes (token-based auth) — accessible via access link
// ============================================================================

/**
 * GET /patient-portal/access/:token
 * Patient validates token and gets assessment summary
 */
patientPortalRouter.get('/access/:token', patientAccessLimiter, authenticatePatientToken, async (req: PatientRequest, res: Response, next: NextFunction) => {
  try {
    const { assessmentId, patientName, patientEmail } = req.patientToken!;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        accountNumber: true,
        patientFirstName: true,
        patientLastName: true,
        encounterType: true,
        admissionDate: true,
        dischargeDate: true,
        totalCharges: true,
        facilityState: true,
        primaryRecoveryPath: true,
        status: true,
        createdAt: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Assessment not found', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      data: {
        patientName: patientName || `${assessment.patientFirstName || ''} ${assessment.patientLastName || ''}`.trim(),
        patientEmail,
        assessment: {
          id: assessment.id,
          accountNumber: assessment.accountNumber,
          encounterType: assessment.encounterType,
          admissionDate: assessment.admissionDate,
          dischargeDate: assessment.dischargeDate,
          facilityState: assessment.facilityState,
          status: assessment.status,
          createdAt: assessment.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /patient-portal/access/:token/upload
 * Patient uploads a document
 */
patientPortalRouter.post('/access/:token/upload', patientUploadLimiter, authenticatePatientToken, handleDocumentUpload('document'), requireDocument, async (req: PatientRequest, res: Response, next: NextFunction) => {
  try {
    const { assessmentId } = req.patientToken!;
    const file = req.file!;

    const attachment = await prisma.assessmentAttachment.create({
      data: {
        assessmentId,
        fileName: `patient-${Date.now()}-${file.originalname}`,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileData: file.buffer,
        uploadedById: null, // Patient uploads have no user ID
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: attachment.id,
        originalName: attachment.originalName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        createdAt: attachment.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /patient-portal/access/:token/documents
 * Patient lists their uploaded documents
 */
patientPortalRouter.get('/access/:token/documents', patientAccessLimiter, authenticatePatientToken, async (req: PatientRequest, res: Response, next: NextFunction) => {
  try {
    const { assessmentId } = req.patientToken!;

    const documents = await prisma.assessmentAttachment.findMany({
      where: { assessmentId, uploadedById: null },
      select: {
        id: true,
        originalName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /patient-portal/access/:token/documents/:documentId
 * Patient deletes their own uploaded document
 */
patientPortalRouter.delete('/access/:token/documents/:documentId', patientAccessLimiter, authenticatePatientToken, async (req: PatientRequest, res: Response, next: NextFunction) => {
  try {
    const { assessmentId } = req.patientToken!;
    const { documentId } = req.params;

    const attachment = await prisma.assessmentAttachment.findFirst({
      where: { id: documentId, assessmentId },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found', code: 'NOT_FOUND' },
      });
    }

    await prisma.assessmentAttachment.delete({ where: { id: documentId } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
