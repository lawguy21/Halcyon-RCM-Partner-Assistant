/**
 * Data Models
 * Core data structures for RCM operations
 */

// Existing core models
export interface Claim {
  id: string;
  patientId: string;
  providerId: string;
  amount: number;
  status: ClaimStatus;
  dateOfService: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ClaimStatus =
  | 'pending'
  | 'submitted'
  | 'accepted'
  | 'denied'
  | 'paid'
  | 'appealed';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  insuranceId?: string;
}

export interface Provider {
  id: string;
  name: string;
  npi: string;
  taxId: string;
}

export interface RecoveryResult {
  claimId: string;
  originalAmount: number;
  recoveredAmount: number;
  status: 'success' | 'partial' | 'failed';
  notes?: string;
}

// Hospital Recovery Engine models
export * from './patient.js';
export * from './encounter.js';
export * from './recovery-result.js';
