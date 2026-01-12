/**
 * Azure Computer Vision OCR Service
 * Extracts text from documents using Azure Computer Vision Read API
 */

import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import type { OCREngineResult } from './types.js';

// Lazy initialization of Azure client
let azureClient: ComputerVisionClient | null = null;

function getAzureClient(): ComputerVisionClient | null {
  if (azureClient) return azureClient;

  const apiKey = process.env.AZURE_COMPUTER_VISION_KEY;
  const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT;

  if (!apiKey || !endpoint) {
    console.log('[AzureVision] Credentials not configured');
    return null;
  }

  azureClient = new ComputerVisionClient(
    new ApiKeyCredentials({
      inHeader: { 'Ocp-Apim-Subscription-Key': apiKey },
    }),
    endpoint
  );

  return azureClient;
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
      const isRateLimit = error.statusCode === 429;
      const isLastAttempt = attempt === maxRetries - 1;

      if (!isRateLimit || isLastAttempt) {
        throw error;
      }

      const delaySeconds = Math.pow(2, attempt);
      console.log(`[AzureVision] Rate limit hit, retrying in ${delaySeconds}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }

  throw new Error(`Max retries (${maxRetries}) exceeded for ${operation}`);
}

/**
 * Extract text from document using Azure Computer Vision Read API
 */
export async function extractWithAzureVision(
  fileBuffer: Buffer
): Promise<OCREngineResult> {
  const client = getAzureClient();

  if (!client) {
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
    };
  }

  try {
    console.log('[AzureVision] Processing document');

    const result = await retryWithBackoff(async () => {
      // Start the read operation
      const readResponse = await client.readInStream(fileBuffer);
      const operationLocation = readResponse.operationLocation;

      if (!operationLocation) {
        throw new Error('No operation location returned');
      }

      // Extract operation ID from the URL
      const operationId = operationLocation.split('/').slice(-1)[0];

      // Poll for results
      let readResult: any;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait

      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        readResult = await client.getReadResult(operationId);
        attempts++;

        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for Azure Vision results');
        }
      } while (readResult.status === 'running' || readResult.status === 'notStarted');

      return readResult;
    }, 3, 'Azure Vision');

    if (result.status === 'succeeded' && result.analyzeResult?.readResults) {
      const textLines: string[] = [];

      for (const page of result.analyzeResult.readResults) {
        if (page.lines) {
          for (const line of page.lines) {
            if (line.text) {
              textLines.push(line.text);
            }
          }
        }
      }

      const text = textLines.join('\n');

      console.log('[AzureVision] Completed', {
        textLength: text.length,
        pages: result.analyzeResult.readResults.length,
      });

      return {
        text,
        confidence: 0.85, // Azure doesn't return overall confidence
        keyValuePairs: {},
        success: true,
      };
    }

    console.log('[AzureVision] No text detected or operation failed');
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
    };
  } catch (error) {
    console.error('[AzureVision] Failed:', error);
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
    };
  }
}
