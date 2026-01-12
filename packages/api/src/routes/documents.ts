/**
 * Document Processing Routes
 * API endpoints for PDF document upload and extraction
 */

import { Router } from 'express';
import {
  processDocument,
  processDocumentWithClaude,
  getServiceStatus,
} from '../controllers/documentController.js';
import { handleDocumentUpload, requireDocument } from '../middleware/upload.js';
import { optionalAuth } from '../middleware/auth.js';

export const documentRouter = Router();

/**
 * POST /documents/process
 * Process a document with multi-engine OCR and AI extraction
 *
 * Query params:
 * - fastMode=true: Skip OCR corrections for faster processing
 *
 * Body: multipart/form-data with 'document' field
 *
 * Response: {
 *   success: true,
 *   data: {
 *     fields: MappedAssessmentFields,
 *     document: { type, confidence, method },
 *     ocr: { engine, confidence, textLength },
 *     parsing: { confidence, agreementScore, modelsUsed },
 *     review: { lowConfidence, highConfidence },
 *     stats: { processingTimeMs, fastMode }
 *   }
 * }
 */
documentRouter.post(
  '/process',
  optionalAuth,
  handleDocumentUpload('document'),
  requireDocument,
  processDocument
);

/**
 * POST /documents/process-direct
 * Process a document using Claude's direct PDF extraction
 * Better for complex documents where OCR might fail
 *
 * Body: multipart/form-data with 'document' field
 */
documentRouter.post(
  '/process-direct',
  optionalAuth,
  handleDocumentUpload('document'),
  requireDocument,
  processDocumentWithClaude
);

/**
 * GET /documents/status
 * Get the status of document processing services
 *
 * Response: {
 *   success: true,
 *   data: {
 *     status: 'operational' | 'degraded',
 *     services: { aws, google, azure, openai, anthropic, gemini },
 *     summary: { total, configured, ocrEngines, aiParsers }
 *   }
 * }
 */
documentRouter.get('/status', getServiceStatus);
