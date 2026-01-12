/**
 * Configuration Management
 * Settings and configuration utilities
 */

export interface CoreConfig {
  environment: 'development' | 'staging' | 'production';
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
  processing: {
    batchSize: number;
    maxRetries: number;
    retryDelayMs: number;
  };
}

export const defaultConfig: CoreConfig = {
  environment: 'development',
  logging: {
    level: 'info',
    format: 'json',
  },
  processing: {
    batchSize: 100,
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

export function mergeConfig(partial: Partial<CoreConfig>): CoreConfig {
  return {
    ...defaultConfig,
    ...partial,
    logging: {
      ...defaultConfig.logging,
      ...partial.logging,
    },
    processing: {
      ...defaultConfig.processing,
      ...partial.processing,
    },
  };
}

// Hospital Recovery Engine configuration
export * from './state-programs.js';
export * from './income-thresholds.js';
