/**
 * OCR Orchestrator
 * Runs multiple OCR engines in parallel and selects the best result
 */

import { extractWithTextract } from './textract.js';
import { extractWithGoogleVision } from './googleVision.js';
import { extractWithAzureVision } from './azureVision.js';
import type { OCRResult, OCREngineResult, MultiOCRResults } from './types.js';
import { PDFDocument } from 'pdf-lib';

/**
 * Select the best OCR result based on text length, confidence, and key-value pairs
 */
function selectBestResult(
  textractResult: PromiseSettledResult<OCREngineResult>,
  googleResult: PromiseSettledResult<OCREngineResult>,
  azureResult: PromiseSettledResult<OCREngineResult>
): OCRResult {
  const candidates: Array<OCRResult> = [];

  // Collect successful results
  if (textractResult.status === 'fulfilled' && textractResult.value.success) {
    candidates.push({ ...textractResult.value, engine: 'aws-textract' });
  }
  if (googleResult.status === 'fulfilled' && googleResult.value.success) {
    candidates.push({ ...googleResult.value, engine: 'google-vision' });
  }
  if (azureResult.status === 'fulfilled' && azureResult.value.success) {
    candidates.push({ ...azureResult.value, engine: 'azure-vision' });
  }

  // If no successful results, return empty result
  if (candidates.length === 0) {
    console.log('[OCR] No OCR engine returned successful results');
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
      engine: 'none',
    };
  }

  // Score each candidate based on:
  // 1. Text length (longer is usually better for medical documents)
  // 2. Confidence score
  // 3. Number of key-value pairs (Textract advantage for forms)
  const scored = candidates.map(candidate => {
    const textScore = candidate.text.length / 100;
    const confidenceScore = candidate.confidence * 50;
    const kvScore = Object.keys(candidate.keyValuePairs).length * 5;
    const totalScore = textScore + confidenceScore + kvScore;

    return {
      ...candidate,
      score: totalScore,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  console.log('[OCR] Selected best result', {
    engine: best.engine,
    textLength: best.text.length,
    confidence: (best.confidence * 100).toFixed(1) + '%',
    keyValuePairs: Object.keys(best.keyValuePairs).length,
    score: best.score.toFixed(2),
  });

  return best;
}

/**
 * Empty OCR result for failed engines
 */
const emptyResult: OCREngineResult = {
  text: '',
  confidence: 0,
  keyValuePairs: {},
  success: false,
};

/**
 * Run all OCR engines in parallel and return the best result
 */
export async function extractTextWithMultipleEngines(
  fileBuffer: Buffer
): Promise<MultiOCRResults> {
  console.log('[OCR] Starting parallel multi-engine extraction');
  const startTime = performance.now();

  // Run all OCR engines in parallel
  const [textractResult, googleResult, azureResult] = await Promise.allSettled([
    extractWithTextract(fileBuffer),
    extractWithGoogleVision(fileBuffer),
    extractWithAzureVision(fileBuffer),
  ]);

  const endTime = performance.now();
  const durationMs = Math.round(endTime - startTime);
  console.log(`[OCR] Parallel extraction completed in ${durationMs}ms`);

  // Select the best result
  const bestResult = selectBestResult(textractResult, googleResult, azureResult);

  return {
    textract: textractResult.status === 'fulfilled' ? textractResult.value : emptyResult,
    google: googleResult.status === 'fulfilled' ? googleResult.value : emptyResult,
    azure: azureResult.status === 'fulfilled' ? azureResult.value : emptyResult,
    best: bestResult,
  };
}

/**
 * Split large PDF into smaller chunks
 */
export async function splitPDFIntoChunks(
  pdfBuffer: Buffer,
  pagesPerChunk: number = 10
): Promise<Buffer[]> {
  try {
    console.log('[OCR] Splitting PDF into chunks');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    console.log(`[OCR] PDF has ${totalPages} pages, splitting into ${pagesPerChunk}-page chunks`);

    const chunks: Buffer[] = [];

    for (let i = 0; i < totalPages; i += pagesPerChunk) {
      const chunkDoc = await PDFDocument.create();
      const endPage = Math.min(i + pagesPerChunk, totalPages);

      // Copy pages to chunk
      const pageIndices = Array.from({ length: endPage - i }, (_, j) => i + j);
      const pages = await chunkDoc.copyPages(pdfDoc, pageIndices);
      pages.forEach(page => chunkDoc.addPage(page));

      // Save chunk as buffer
      const chunkBytes = await chunkDoc.save();
      const chunkBuffer = Buffer.from(chunkBytes);
      chunks.push(chunkBuffer);

      console.log(`[OCR] Created chunk ${chunks.length}: pages ${i + 1}-${endPage} (${(chunkBuffer.length / 1024).toFixed(0)}KB)`);
    }

    return chunks;
  } catch (error) {
    console.error('[OCR] Failed to split PDF:', error);
    throw error;
  }
}

/**
 * Process large PDF by splitting into chunks and processing in parallel
 */
export async function processLargePDF(
  pdfBuffer: Buffer,
  concurrency: number = 5,
  fastMode: boolean = false
): Promise<string> {
  const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB

  // For small files, process directly
  if (pdfBuffer.length < FILE_SIZE_THRESHOLD) {
    console.log('[OCR] File is small enough to process directly');
    const result = await extractTextWithMultipleEngines(pdfBuffer);
    return result.best.text;
  }

  // For large files, split into chunks
  console.log('[OCR] Large file detected, splitting into chunks');
  const chunks = await splitPDFIntoChunks(pdfBuffer, 10);

  const allText: string[] = [];

  // Process chunks in batches
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);

    console.log(`[OCR] Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(chunks.length / concurrency)}`);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (chunk, batchIdx) => {
        const chunkIndex = i + batchIdx;
        try {
          const result = await extractTextWithMultipleEngines(chunk);
          return result.best.text || '';
        } catch (error) {
          console.error(`[OCR] Failed to process chunk ${chunkIndex + 1}:`, error);
          return '';
        }
      })
    );

    allText.push(...batchResults);

    // Rate limiting between batches
    if (i + concurrency < chunks.length) {
      console.log('[OCR] Rate limiting: waiting 1 second before next batch');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allText.join('\n\n');
}

// Re-export types
export type { OCRResult, OCREngineResult, MultiOCRResults } from './types.js';
