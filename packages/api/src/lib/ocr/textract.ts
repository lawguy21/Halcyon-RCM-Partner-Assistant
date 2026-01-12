/**
 * AWS Textract OCR Service
 * Extracts text and form fields from documents using AWS Textract
 */

import {
  TextractClient,
  AnalyzeDocumentCommand,
  Block,
  BlockType,
  Relationship,
} from '@aws-sdk/client-textract';
import type { OCREngineResult } from './types.js';

// Lazy initialization of Textract client
let textractClient: TextractClient | null = null;

function getTextractClient(): TextractClient | null {
  if (textractClient) return textractClient;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || accessKeyId === 'your_aws_access_key_here') {
    console.log('[Textract] AWS credentials not configured');
    return null;
  }

  textractClient = new TextractClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId,
      secretAccessKey: secretAccessKey || '',
    },
  });

  return textractClient;
}

/**
 * Extract text blocks from Textract response
 */
function extractTextFromResponse(blocks: Block[] | undefined): string {
  if (!blocks) return '';

  const lines: string[] = [];

  for (const block of blocks) {
    if (block.BlockType === BlockType.LINE && block.Text) {
      lines.push(block.Text);
    }
  }

  return lines.join('\n');
}

/**
 * Extract key-value pairs from Textract response (form fields)
 */
function extractKeyValuePairs(blocks: Block[] | undefined): Record<string, string> {
  if (!blocks) return {};

  const keyValuePairs: Record<string, string> = {};
  const blockMap: Map<string, Block> = new Map();

  // Build block map for relationship lookups
  for (const block of blocks) {
    if (block.Id) {
      blockMap.set(block.Id, block);
    }
  }

  // Find KEY_VALUE_SET blocks
  for (const block of blocks) {
    if (block.BlockType === BlockType.KEY_VALUE_SET && block.EntityTypes?.includes('KEY')) {
      const keyText = getTextFromRelationship(block, blockMap, 'CHILD');
      const valueBlock = getValueBlock(block, blockMap);
      const valueText = valueBlock
        ? getTextFromRelationship(valueBlock, blockMap, 'CHILD')
        : '';

      if (keyText) {
        keyValuePairs[keyText.trim()] = valueText.trim();
      }
    }
  }

  return keyValuePairs;
}

/**
 * Get text from child relationships
 */
function getTextFromRelationship(
  block: Block,
  blockMap: Map<string, Block>,
  relationshipType: string
): string {
  const relationship = block.Relationships?.find(
    (r: Relationship) => r.Type === relationshipType
  );

  if (!relationship?.Ids) return '';

  const words: string[] = [];
  for (const id of relationship.Ids) {
    const childBlock = blockMap.get(id);
    if (childBlock?.Text) {
      words.push(childBlock.Text);
    }
  }

  return words.join(' ');
}

/**
 * Get value block from key block
 */
function getValueBlock(keyBlock: Block, blockMap: Map<string, Block>): Block | null {
  const valueRelationship = keyBlock.Relationships?.find(
    (r: Relationship) => r.Type === 'VALUE'
  );

  if (!valueRelationship?.Ids?.[0]) return null;

  return blockMap.get(valueRelationship.Ids[0]) || null;
}

/**
 * Calculate overall confidence from Textract response
 */
function calculateConfidence(blocks: Block[] | undefined): number {
  if (!blocks || blocks.length === 0) return 0;

  let totalConfidence = 0;
  let count = 0;

  for (const block of blocks) {
    if (block.Confidence !== undefined) {
      totalConfidence += block.Confidence;
      count++;
    }
  }

  return count > 0 ? totalConfidence / count / 100 : 0;
}

/**
 * Extract text and form fields from document using AWS Textract
 */
export async function extractWithTextract(
  fileBuffer: Buffer
): Promise<OCREngineResult> {
  const client = getTextractClient();

  if (!client) {
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
    };
  }

  try {
    console.log('[Textract] Processing document with Forms API');

    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: fileBuffer },
      FeatureTypes: ['FORMS', 'TABLES'],
    });

    const response = await client.send(command);

    const text = extractTextFromResponse(response.Blocks);
    const keyValuePairs = extractKeyValuePairs(response.Blocks);
    const confidence = calculateConfidence(response.Blocks);

    console.log('[Textract] Completed', {
      textLength: text.length,
      formFields: Object.keys(keyValuePairs).length,
      confidence: (confidence * 100).toFixed(1) + '%',
    });

    return {
      text,
      confidence,
      keyValuePairs,
      success: true,
    };
  } catch (error) {
    console.error('[Textract] Failed:', error);
    return {
      text: '',
      confidence: 0,
      keyValuePairs: {},
      success: false,
    };
  }
}
