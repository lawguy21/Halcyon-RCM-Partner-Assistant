/**
 * Document Controller
 * Handles PDF document upload, OCR, and data extraction
 */

import type { Request, Response } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import {
  extractTextWithMultipleEngines,
  processLargePDF,
} from '../lib/ocr/ocrOrchestrator.js';
import { parseWithEnsemble } from '../lib/ai/aiEnsembleParser.js';
import { classifyDocument } from '../lib/ai/documentClassifier.js';
import {
  mapToAssessmentFields,
  getLowConfidenceFields,
  getHighConfidenceFields,
} from '../lib/ai/rcmFieldMapper.js';
import type { MappedAssessmentFields } from '../lib/ai/types.js';

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
];

/**
 * Process uploaded document and extract data
 */
export async function processDocument(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No document uploaded',
          code: 'NO_FILE',
        },
      });
    }

    const { buffer, originalname, size, mimetype } = req.file;

    console.log('[Document] Processing:', { originalname, size, mimetype });

    // Validate file size
    if (size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: {
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE',
        },
      });
    }

    // Validate file type using magic bytes
    const fileType = await fileTypeFromBuffer(buffer);
    const actualMimeType = fileType?.mime || mimetype;

    if (!ALLOWED_MIME_TYPES.includes(actualMimeType)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file type. Please upload a PDF or image file.',
          code: 'INVALID_FILE_TYPE',
        },
      });
    }

    // Get fast mode flag
    const fastMode = req.query.fastMode === 'true';

    console.log('[Document] Starting OCR extraction', { fastMode });

    // Step 1: OCR Extraction
    const ocrResult = await extractTextWithMultipleEngines(buffer);

    if (!ocrResult.best.success || !ocrResult.best.text) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Could not extract text from document. Please try a clearer image.',
          code: 'OCR_FAILED',
        },
      });
    }

    const extractedText = ocrResult.best.text;
    const keyValuePairs = ocrResult.best.keyValuePairs;

    console.log('[Document] OCR completed', {
      textLength: extractedText.length,
      engine: ocrResult.best.engine,
      confidence: (ocrResult.best.confidence * 100).toFixed(1) + '%',
    });

    // Step 2: Document Classification
    const classification = await classifyDocument(extractedText);
    console.log('[Document] Classified as:', classification.type);

    // Step 3: AI Ensemble Parsing
    console.log('[Document] Starting AI parsing');
    const parseResult = await parseWithEnsemble(extractedText, keyValuePairs);

    // Step 4: Map to Assessment Fields
    const mappedFields = mapToAssessmentFields(
      parseResult.consensus,
      parseResult.confidence
    );

    // Step 5: Identify fields needing review
    const lowConfidenceFields = getLowConfidenceFields(mappedFields, 0.7);
    const highConfidenceFields = getHighConfidenceFields(mappedFields, 0.9);

    const processingTime = Date.now() - startTime;

    console.log('[Document] Processing complete', {
      processingTime: processingTime + 'ms',
      fieldsExtracted: Object.keys(mappedFields._confidence).filter(
        k => mappedFields._confidence[k] > 0
      ).length,
      lowConfidenceFields: lowConfidenceFields.length,
    });

    // Return results
    return res.json({
      success: true,
      data: {
        // Mapped fields ready for form
        fields: mappedFields,

        // Document metadata
        document: {
          type: classification.type,
          typeConfidence: classification.confidence,
          classificationMethod: classification.method,
        },

        // OCR metadata
        ocr: {
          engine: ocrResult.best.engine,
          confidence: ocrResult.best.confidence,
          textLength: extractedText.length,
        },

        // AI parsing metadata
        parsing: {
          confidence: parseResult.confidence,
          agreementScore: parseResult.agreementScore,
          modelsUsed: parseResult.modelResults.map(r => ({
            model: r.model,
            success: r.data !== null,
            confidence: r.confidence,
            responseTime: r.responseTime,
          })),
        },

        // Fields for UI highlighting
        review: {
          lowConfidence: lowConfidenceFields,
          highConfidence: highConfidenceFields,
        },

        // Processing stats
        stats: {
          processingTimeMs: processingTime,
          fastMode,
        },
      },
    });
  } catch (error) {
    console.error('[Document] Processing error:', error);

    return res.status(500).json({
      success: false,
      error: {
        message: 'Document processing failed',
        code: 'PROCESSING_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * Process document with direct PDF extraction using Claude (for complex documents)
 */
export async function processDocumentWithClaude(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No document uploaded',
          code: 'NO_FILE',
        },
      });
    }

    const { buffer, originalname, size } = req.file;

    // Validate size
    if (size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: {
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE',
        },
      });
    }

    // Check for Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Claude API not configured',
          code: 'API_NOT_CONFIGURED',
        },
      });
    }

    console.log('[Document] Direct Claude processing:', { originalname, size });

    // Check file type - Claude direct only works with images
    const fileType = await fileTypeFromBuffer(buffer);
    const mimeType = fileType?.mime || 'application/octet-stream';

    // For PDFs, fall back to standard OCR pipeline
    if (mimeType === 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Direct Claude processing only supports images. Use /process endpoint for PDFs.',
          code: 'PDF_NOT_SUPPORTED_DIRECT',
        },
      });
    }

    // Validate it's an image type
    const supportedImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!supportedImageTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Unsupported file type for direct processing',
          code: 'UNSUPPORTED_TYPE',
        },
      });
    }

    // Use Claude's multimodal capability for images
    const Anthropic = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                data: buffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: `Extract ALL billing and patient information from this healthcare document image for revenue cycle management.

Return a JSON object with these fields:
- patientName, dateOfBirth, patientState
- accountNumber, dateOfService, encounterType (inpatient/outpatient/observation/ed)
- totalCharges (number), lengthOfStay (number)
- facilityName, facilityState
- insuranceType, medicaidId, medicareId
- diagnoses (array), primaryDiagnosis
- documentType (HOSPITAL_BILL, MEDICAL_RECORD, INSURANCE_EOB, etc.)

Return ONLY the JSON object.`,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Could not parse document content',
          code: 'PARSE_FAILED',
        },
      });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    const mappedFields = mapToAssessmentFields(extracted, 0.95);

    const processingTime = Date.now() - startTime;

    return res.json({
      success: true,
      data: {
        fields: mappedFields,
        document: {
          type: extracted.documentType || 'UNKNOWN',
          typeConfidence: 0.95,
          classificationMethod: 'ai',
        },
        ocr: {
          engine: 'claude-direct',
          confidence: 0.95,
          textLength: responseText.length,
        },
        parsing: {
          confidence: 0.95,
          agreementScore: 1.0,
          modelsUsed: [
            {
              model: 'claude-3.5-haiku',
              success: true,
              confidence: 0.95,
              responseTime: processingTime,
            },
          ],
        },
        review: {
          lowConfidence: getLowConfidenceFields(mappedFields, 0.7),
          highConfidence: getHighConfidenceFields(mappedFields, 0.9),
        },
        stats: {
          processingTimeMs: processingTime,
          method: 'claude-direct',
        },
      },
    });
  } catch (error) {
    console.error('[Document] Claude processing error:', error);

    return res.status(500).json({
      success: false,
      error: {
        message: 'Document processing failed',
        code: 'PROCESSING_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * Health check for document processing service
 */
export function getServiceStatus(_req: Request, res: Response) {
  const services = {
    aws: {
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      service: 'Textract OCR',
    },
    google: {
      configured: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
      service: 'Vision OCR',
    },
    azure: {
      configured: !!(process.env.AZURE_COMPUTER_VISION_KEY && process.env.AZURE_COMPUTER_VISION_ENDPOINT),
      service: 'Computer Vision OCR',
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      service: 'GPT-4o-mini Parser',
    },
    anthropic: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      service: 'Claude Parser',
    },
    gemini: {
      configured: !!process.env.GOOGLE_AI_API_KEY,
      service: 'Gemini Parser',
    },
  };

  const configuredCount = Object.values(services).filter(s => s.configured).length;

  res.json({
    success: true,
    data: {
      status: configuredCount >= 2 ? 'operational' : 'degraded',
      services,
      summary: {
        total: Object.keys(services).length,
        configured: configuredCount,
        ocrEngines: [services.aws, services.google, services.azure].filter(s => s.configured).length,
        aiParsers: [services.openai, services.anthropic, services.gemini].filter(s => s.configured).length,
      },
    },
  });
}
