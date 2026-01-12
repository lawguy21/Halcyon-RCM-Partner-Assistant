/**
 * Google Cloud Vision OCR Service
 * Extracts text from documents using Google Cloud Vision API
 */

import type { OCREngineResult } from './types.js';

/**
 * Google Vision API response types
 */
interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description?: string;
      boundingPoly?: unknown;
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

/**
 * Retry with exponential backoff for rate limit errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  operation: string = 'operation'
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.status === 429 || error.statusCode === 429;
      const isLastAttempt = attempt === maxRetries - 1;

      if (!isRateLimit || isLastAttempt) {
        throw error;
      }

      const delaySeconds = Math.pow(2, attempt);
      console.log(`[GoogleVision] Rate limit hit, retrying in ${delaySeconds}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }

  throw new Error(`Max retries (${maxRetries}) exceeded for ${operation}`);
}

/**
 * Extract text from document using Google Cloud Vision API
 */
export async function extractWithGoogleVision(
  fileBuffer: Buffer
): Promise<OCREngineResult> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  if (!apiKey) {
    console.log('[GoogleVision] API key not configured');
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
    };
  }

  try {
    console.log('[GoogleVision] Processing document');

    const result = await retryWithBackoff<GoogleVisionResponse>(async () => {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: fileBuffer.toString('base64') },
                features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw { status: response.status, message: errorText };
      }

      return response.json() as Promise<GoogleVisionResponse>;
    }, 3, 'Google Vision');

    const textAnnotations = result.responses?.[0]?.textAnnotations;

    if (textAnnotations && textAnnotations.length > 0) {
      const text = textAnnotations[0].description || '';

      console.log('[GoogleVision] Completed', {
        textLength: text.length,
      });

      return {
        text,
        confidence: 0.85, // Google Vision doesn't return per-document confidence
        keyValuePairs: {},
        success: true,
      };
    }

    console.log('[GoogleVision] No text detected');
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
    };
  } catch (error) {
    console.error('[GoogleVision] Failed:', error);
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
    };
  }
}
