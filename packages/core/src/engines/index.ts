/**
 * Recovery Engines
 * Business logic for revenue cycle management operations
 */

export interface RecoveryEngine {
  name: string;
  version: string;
  process(data: unknown): Promise<unknown>;
}

// Placeholder for engine implementations
export const engines: RecoveryEngine[] = [];

// Hospital Recovery Engine exports
export { evaluateMedicaidRecovery } from './medicaid-recovery.js';
export { evaluateMedicareRecovery } from './medicare-recovery.js';
export { evaluateDSHRelevance } from './dsh-relevance.js';
export { evaluateStateProgram } from './state-programs.js';
export { calculateHospitalRecovery } from './recovery-calculator.js';
