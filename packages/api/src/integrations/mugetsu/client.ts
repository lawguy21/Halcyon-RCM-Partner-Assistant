/**
 * Mugetsu SSI Eligibility Engine Client
 *
 * HTTP client for integrating with the Halcyon-Mugetsu SSI/SSDI
 * eligibility determination engine.
 */

import type {
  MugetsuClientConfig,
  MugetsuAssessmentInput,
  MugetsuAssessmentResult,
  MugetsuHealthResponse,
  MugetsuErrorResponse,
  ConditionScoreResponse,
  SSAWaterfallRates,
  BatchAssessmentRequest,
  BatchAssessmentResponse,
} from './types.js';

/**
 * Error class for Mugetsu API errors
 */
export class MugetsuError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'MugetsuError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Error codes for Mugetsu operations
 */
export enum MugetsuErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  INVALID_INPUT = 'INVALID_INPUT',
  ASSESSMENT_FAILED = 'ASSESSMENT_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Mugetsu API Client
 *
 * Provides methods to interact with the Mugetsu SSI eligibility engine.
 */
export class MugetsuClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private lastRequestTime: number = 0;
  private isHealthy: boolean = true;
  private lastHealthCheck: number = 0;
  private readonly healthCheckInterval: number = 60000; // 1 minute

  constructor(config: MugetsuClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  /**
   * Assess disability eligibility
   *
   * @param input - Assessment input data
   * @returns Assessment result with score and recommendations
   */
  async assessDisability(
    input: MugetsuAssessmentInput
  ): Promise<MugetsuAssessmentResult> {
    this.logRequest('assessDisability', { conditions: input.medicalConditions.length, age: input.age });

    const response = await this.makeRequest<MugetsuAssessmentResult>(
      '/api/assessment',
      'POST',
      input
    );

    this.logResponse('assessDisability', { score: response.score, viability: response.viabilityRating });
    return response;
  }

  /**
   * Get condition score for a specific condition
   *
   * @param condition - Medical condition name
   * @returns Condition score and approval rate
   */
  async getConditionScore(condition: string): Promise<number> {
    this.logRequest('getConditionScore', { condition });

    const response = await this.makeRequest<ConditionScoreResponse>(
      '/api/conditions/score',
      'POST',
      { condition }
    );

    this.logResponse('getConditionScore', { score: response.score });
    return response.score;
  }

  /**
   * Get detailed condition analysis
   *
   * @param condition - Medical condition name
   * @returns Full condition analysis including SSA listing matches
   */
  async getConditionAnalysis(condition: string): Promise<ConditionScoreResponse> {
    this.logRequest('getConditionAnalysis', { condition });

    const response = await this.makeRequest<ConditionScoreResponse>(
      '/api/conditions/analyze',
      'POST',
      { condition }
    );

    return response;
  }

  /**
   * Calculate SSA Waterfall approval rates
   *
   * @param score - Overall assessment score
   * @param age - Patient age
   * @param options - Additional options for calculation
   * @returns Waterfall rates at each appeal level
   */
  async calculateSSAWaterfall(
    score: number,
    age: number,
    options?: {
      conditions?: string[];
      functionalLimitations?: string[];
      education?: string;
    }
  ): Promise<SSAWaterfallRates> {
    this.logRequest('calculateSSAWaterfall', { score, age });

    const response = await this.makeRequest<SSAWaterfallRates>(
      '/api/waterfall/calculate',
      'POST',
      { score, age, ...options }
    );

    return response;
  }

  /**
   * Perform batch assessment for multiple patients
   *
   * @param request - Batch assessment request
   * @returns Batch assessment results
   */
  async batchAssess(request: BatchAssessmentRequest): Promise<BatchAssessmentResponse> {
    this.logRequest('batchAssess', { count: request.assessments.length });

    const response = await this.makeRequest<BatchAssessmentResponse>(
      '/api/assessment/batch',
      'POST',
      request,
      { timeout: this.timeout * 3 } // Extended timeout for batch
    );

    this.logResponse('batchAssess', {
      total: response.summary.total,
      successful: response.summary.successful,
    });

    return response;
  }

  /**
   * Health check for Mugetsu service
   *
   * @returns Health status of the Mugetsu service
   */
  async healthCheck(): Promise<boolean> {
    // Use cached result if recent
    if (Date.now() - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy;
    }

    try {
      const response = await this.makeRequest<MugetsuHealthResponse>(
        '/health',
        'GET',
        undefined,
        { timeout: 5000, skipRetry: true }
      );

      this.isHealthy = response.status === 'healthy';
      this.lastHealthCheck = Date.now();

      return this.isHealthy;
    } catch (error) {
      console.warn('[MugetsuClient] Health check failed:', error);
      this.isHealthy = false;
      this.lastHealthCheck = Date.now();
      return false;
    }
  }

  /**
   * Get detailed health status
   *
   * @returns Full health response
   */
  async getHealthStatus(): Promise<MugetsuHealthResponse> {
    const response = await this.makeRequest<MugetsuHealthResponse>(
      '/health',
      'GET',
      undefined,
      { timeout: 5000, skipRetry: true }
    );

    this.isHealthy = response.status === 'healthy';
    this.lastHealthCheck = Date.now();

    return response;
  }

  /**
   * Check if the service is currently healthy (cached)
   */
  get healthy(): boolean {
    return this.isHealthy;
  }

  /**
   * Make an HTTP request to the Mugetsu API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown,
    options?: {
      timeout?: number;
      skipRetry?: boolean;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options?.timeout ?? this.timeout;
    const skipRetry = options?.skipRetry ?? false;

    let lastError: Error | null = null;
    const maxAttempts = skipRetry ? 1 : this.maxRetries;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Apply rate limiting
        await this.rateLimit();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Client': 'halcyon-rcm-partner-assistant',
            'X-Request-Id': this.generateRequestId(),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          throw new MugetsuError(
            errorData.message,
            this.mapStatusToErrorCode(response.status),
            response.status,
            errorData.details
          );
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof MugetsuError) {
          if (
            error.code === MugetsuErrorCode.AUTHENTICATION_FAILED ||
            error.code === MugetsuErrorCode.INVALID_INPUT ||
            error.statusCode === 400 ||
            error.statusCode === 401 ||
            error.statusCode === 403
          ) {
            throw error;
          }
        }

        // Check for abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new MugetsuError(
            `Request timed out after ${timeout}ms`,
            MugetsuErrorCode.TIMEOUT,
            undefined
          );
        }

        // Retry with exponential backoff
        if (attempt < maxAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(
            `[MugetsuClient] Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new MugetsuError(
      'Request failed after all retries',
      MugetsuErrorCode.UNKNOWN_ERROR
    );
  }

  /**
   * Parse error response from the API
   */
  private async parseErrorResponse(
    response: Response
  ): Promise<{ message: string; details?: unknown }> {
    try {
      const data = await response.json() as MugetsuErrorResponse;
      return {
        message: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        details: data.error?.details,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  /**
   * Map HTTP status code to error code
   */
  private mapStatusToErrorCode(status: number): MugetsuErrorCode {
    switch (status) {
      case 400:
        return MugetsuErrorCode.INVALID_INPUT;
      case 401:
      case 403:
        return MugetsuErrorCode.AUTHENTICATION_FAILED;
      case 429:
        return MugetsuErrorCode.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
      case 504:
        return MugetsuErrorCode.SERVICE_UNAVAILABLE;
      default:
        return MugetsuErrorCode.UNKNOWN_ERROR;
    }
  }

  /**
   * Apply rate limiting between requests
   */
  private async rateLimit(minInterval: number = 50): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < minInterval) {
      await this.sleep(minInterval - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `rcm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log request (development only)
   */
  private logRequest(method: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MugetsuClient] ${method} request:`, data);
    }
  }

  /**
   * Log response (development only)
   */
  private logResponse(method: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MugetsuClient] ${method} response:`, data);
    }
  }
}

/**
 * Create a singleton client instance
 */
let clientInstance: MugetsuClient | null = null;

/**
 * Get or create the Mugetsu client instance
 *
 * @param config - Optional configuration (uses env vars if not provided)
 * @returns Mugetsu client instance
 */
export function getMugetsuClient(config?: Partial<MugetsuClientConfig>): MugetsuClient {
  if (!clientInstance || config) {
    const fullConfig: MugetsuClientConfig = {
      baseUrl: config?.baseUrl || process.env.MUGETSU_API_URL || 'http://localhost:3001/api',
      apiKey: config?.apiKey || process.env.MUGETSU_API_KEY || '',
      timeout: config?.timeout || parseInt(process.env.MUGETSU_TIMEOUT || '30000', 10),
      maxRetries: config?.maxRetries || parseInt(process.env.MUGETSU_MAX_RETRIES || '3', 10),
      retryDelay: config?.retryDelay || parseInt(process.env.MUGETSU_RETRY_DELAY || '1000', 10),
    };

    clientInstance = new MugetsuClient(fullConfig);
  }

  return clientInstance;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetMugetsuClient(): void {
  clientInstance = null;
}
