/**
 * Mugetsu SSI Eligibility Engine Integration
 *
 * Module exports and factory functions for the Halcyon-Mugetsu
 * SSI/SSDI eligibility determination integration.
 */

// Export types
export * from './types.js';

// Export client
export {
  MugetsuClient,
  MugetsuError,
  MugetsuErrorCode,
  getMugetsuClient,
  resetMugetsuClient,
} from './client.js';

// Re-export commonly used types for convenience
export type {
  MugetsuClientConfig,
  MugetsuAssessmentInput,
  MugetsuAssessmentResult,
  SSAWaterfallRates,
  SequentialEvaluationAnalysis,
  AgeProgressionAnalysis,
  WorkHistoryItem,
  ScoreBreakdown,
  BatchAssessmentRequest,
  BatchAssessmentResponse,
} from './types.js';

import type { MugetsuClientConfig } from './types.js';
import { MugetsuClient } from './client.js';

/**
 * Default configuration from environment variables
 */
export const defaultConfig: MugetsuClientConfig = {
  baseUrl: process.env.MUGETSU_API_URL || 'http://localhost:3001/api',
  apiKey: process.env.MUGETSU_API_KEY || '',
  timeout: parseInt(process.env.MUGETSU_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.MUGETSU_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.MUGETSU_RETRY_DELAY || '1000', 10),
};

/**
 * Create a new Mugetsu client with custom configuration
 *
 * @param config - Client configuration
 * @returns New MugetsuClient instance
 *
 * @example
 * ```typescript
 * const client = createMugetsuClient({
 *   baseUrl: 'https://mugetsu.example.com/api',
 *   apiKey: 'your-api-key',
 *   timeout: 60000,
 * });
 *
 * const result = await client.assessDisability({
 *   medicalConditions: ['Multiple Sclerosis', 'Depression'],
 *   age: 55,
 *   education: 'High School',
 *   workHistory: [{ jobTitle: 'Construction Worker' }],
 *   functionalLimitations: ['Cannot walk long distances', 'Difficulty concentrating'],
 *   severity: 'severe',
 *   hospitalizations: 3,
 *   medications: ['Copaxone', 'Prozac'],
 * });
 *
 * console.log(`SSI Eligibility Score: ${result.score}/100`);
 * console.log(`Recommendation: ${result.recommendation}`);
 * ```
 */
export function createMugetsuClient(
  config?: Partial<MugetsuClientConfig>
): MugetsuClient {
  const fullConfig: MugetsuClientConfig = {
    ...defaultConfig,
    ...config,
  };

  // Validate required fields
  if (!fullConfig.baseUrl) {
    throw new Error('MUGETSU_API_URL environment variable is required or baseUrl must be provided');
  }

  if (!fullConfig.apiKey) {
    console.warn(
      '[Mugetsu] Warning: No API key configured. Set MUGETSU_API_KEY environment variable.'
    );
  }

  return new MugetsuClient(fullConfig);
}

/**
 * Check if Mugetsu integration is configured
 *
 * @returns True if Mugetsu is properly configured
 */
export function isMugetsuConfigured(): boolean {
  return Boolean(process.env.MUGETSU_API_URL && process.env.MUGETSU_API_KEY);
}

/**
 * Safely get a Mugetsu client, returning null if not configured
 *
 * @returns MugetsuClient or null if not configured
 */
export function getMugetsuClientSafe(): MugetsuClient | null {
  if (!isMugetsuConfigured()) {
    return null;
  }

  try {
    return createMugetsuClient();
  } catch (error) {
    console.error('[Mugetsu] Failed to create client:', error);
    return null;
  }
}
