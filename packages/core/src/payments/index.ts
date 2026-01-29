/**
 * Payments Module
 * ERA 835 payment processing and matching
 */

// Types
export * from './payment-types.js';

// X12 835 Parser
export {
  X12835Parser,
  parse835File,
  validate835File,
  extractTraceNumber,
  extractPayerName,
  extractTotalAmount,
} from './x12-835-parser.js';

// Payment Matcher
export {
  PaymentMatcher,
  createPaymentMatcher,
  matchPaymentToClaim,
  matchByPatient,
  calculateVariance,
  suggestWriteOff,
} from './payment-matcher.js';

export type {
  SystemClaim,
  SystemPatient,
  WriteOffCodeMapping,
} from './payment-matcher.js';
