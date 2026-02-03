// @ts-nocheck
/**
 * Database Helper Functions
 * Utility functions for converting between API types and Prisma models
 */

import { Prisma } from '@prisma/client';
import type { HospitalRecoveryInput, HospitalRecoveryResult } from '@halcyon-rcm/core';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AssessmentFilters {
  primaryRecoveryPath?: string;
  minConfidence?: number;
  maxConfidence?: number;
  state?: string;
  facilityState?: string;
  encounterType?: string;
  minRecovery?: number;
  maxRecovery?: number;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  userId?: string;
  organizationId?: string;
  importId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'estimatedRecovery' | 'confidence' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  /** Whether to include demo data in results. If false, filters out isDemoData=true records. */
  includeDemoData?: boolean;
}

export interface AssessmentResponse {
  id: string;
  input: HospitalRecoveryInput;
  result: HospitalRecoveryResult;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  notes?: string;
  patientIdentifier?: string;
  accountNumber?: string;
  userId?: string;
  organizationId?: string;
  importId?: string;
}

// Prisma Assessment model type (simplified for this context)
export interface PrismaAssessment {
  id: string;
  input: Prisma.JsonValue;
  result: Prisma.JsonValue;
  primaryRecoveryPath: string;
  overallConfidence: number;
  estimatedTotalRecovery: Prisma.Decimal;
  currentExposure: Prisma.Decimal;
  stateOfService: string;
  facilityState: string;
  encounterType: string;
  tags: string[];
  notes: string | null;
  patientIdentifier: string | null;
  accountNumber: string | null;
  userId: string | null;
  organizationId: string | null;
  importId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert HospitalRecoveryInput and Result to Prisma Assessment create input
 */
export function resultToAssessmentInput(
  input: HospitalRecoveryInput,
  result: HospitalRecoveryResult,
  metadata?: {
    userId?: string;
    organizationId?: string;
    importId?: string;
    patientIdentifier?: string;
    accountNumber?: string;
    tags?: string[];
    notes?: string;
  }
): Prisma.AssessmentCreateInput {
  return {
    // Store full input and result as JSON for backward compatibility
    input: input as unknown as Prisma.InputJsonValue,
    result: result as unknown as Prisma.InputJsonValue,

    // Encounter Details (required fields)
    encounterType: input.encounterType,
    totalCharges: new Prisma.Decimal(input.totalCharges),
    facilityState: input.facilityState,

    // Insurance Status (required)
    insuranceStatusOnDos: input.insuranceStatusOnDOS,

    // Recovery Results (required fields from calculation)
    primaryRecoveryPath: result.primaryRecoveryPath,
    overallConfidence: result.overallConfidence,
    estimatedTotalRecovery: new Prisma.Decimal(result.estimatedTotalRecovery),

    // Optional fields from input
    lengthOfStay: input.lengthOfStay || null,
    facilityType: input.facilityType || null,
    medicaidStatus: input.medicaidStatus || null,
    medicareStatus: input.medicareStatus || null,
    ssiStatus: input.ssiStatus || null,
    ssdiStatus: input.ssdiStatus || null,
    householdIncome: input.householdIncome || null,
    householdSize: input.householdSize || null,
    estimatedAssets: input.estimatedAssets || null,
    disabilityLikelihood: input.disabilityLikelihood || null,
    ssiEligibilityLikely: input.ssiEligibilityLikely ?? null,
    ssdiEligibilityLikely: input.ssdiEligibilityLikely ?? null,
    patientState: input.stateOfResidence || null,

    // Metadata
    tags: metadata?.tags || [],
    notes: metadata?.notes || null,
    accountNumber: metadata?.accountNumber || null,
    userId: metadata?.userId || null,
    organizationId: metadata?.organizationId || null,
    importId: metadata?.importId || null,
  };
}

/**
 * Convert Prisma Assessment to API response format
 */
export function assessmentToResponse(assessment: PrismaAssessment): AssessmentResponse {
  return {
    id: assessment.id,
    input: assessment.input as unknown as HospitalRecoveryInput,
    result: assessment.result as unknown as HospitalRecoveryResult,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
    tags: assessment.tags.length > 0 ? assessment.tags : undefined,
    notes: assessment.notes || undefined,
    patientIdentifier: assessment.patientIdentifier || undefined,
    accountNumber: assessment.accountNumber || undefined,
    userId: assessment.userId || undefined,
    organizationId: assessment.organizationId || undefined,
    importId: assessment.importId || undefined,
  };
}

/**
 * Build Prisma where clause from filters
 */
export function buildAssessmentFilters(filters: AssessmentFilters): Prisma.AssessmentWhereInput {
  const where: Prisma.AssessmentWhereInput = {};

  // Primary recovery path (case-insensitive contains)
  if (filters.primaryRecoveryPath) {
    where.primaryRecoveryPath = {
      contains: filters.primaryRecoveryPath,
      mode: 'insensitive',
    };
  }

  // Confidence range
  if (filters.minConfidence !== undefined || filters.maxConfidence !== undefined) {
    where.overallConfidence = {};
    if (filters.minConfidence !== undefined) {
      where.overallConfidence.gte = filters.minConfidence;
    }
    if (filters.maxConfidence !== undefined) {
      where.overallConfidence.lte = filters.maxConfidence;
    }
  }

  // State filter (matches either stateOfService or facilityState)
  if (filters.state) {
    where.OR = [
      { stateOfService: filters.state },
      { facilityState: filters.state },
    ];
  }

  // Facility state filter
  if (filters.facilityState) {
    where.facilityState = filters.facilityState;
  }

  // Encounter type filter
  if (filters.encounterType) {
    where.encounterType = filters.encounterType;
  }

  // Recovery amount range
  if (filters.minRecovery !== undefined || filters.maxRecovery !== undefined) {
    where.estimatedTotalRecovery = {};
    if (filters.minRecovery !== undefined) {
      where.estimatedTotalRecovery.gte = new Prisma.Decimal(filters.minRecovery);
    }
    if (filters.maxRecovery !== undefined) {
      where.estimatedTotalRecovery.lte = new Prisma.Decimal(filters.maxRecovery);
    }
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  // Tags filter (any match)
  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      hasSome: filters.tags,
    };
  }

  // User and organization filters
  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.organizationId) {
    where.organizationId = filters.organizationId;
  }

  if (filters.importId) {
    where.importId = filters.importId;
  }

  // Demo data filter - when includeDemoData is false, exclude demo records
  if (filters.includeDemoData === false) {
    where.isDemoData = false;
  }

  return where;
}

/**
 * Build Prisma orderBy from sort options
 */
export function buildOrderBy(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Prisma.AssessmentOrderByWithRelationInput {
  const order = sortOrder || 'desc';

  switch (sortBy) {
    case 'estimatedRecovery':
      return { estimatedTotalRecovery: order };
    case 'confidence':
      return { overallConfidence: order };
    case 'updatedAt':
      return { updatedAt: order };
    case 'createdAt':
    default:
      return { createdAt: order };
  }
}

/**
 * Convert Decimal to number for JSON serialization
 */
export function decimalToNumber(decimal: Prisma.Decimal | null | undefined): number {
  if (decimal === null || decimal === undefined) {
    return 0;
  }
  return decimal.toNumber();
}

/**
 * Helper to safely parse JSON from Prisma JsonValue
 */
export function parseJsonField<T>(value: Prisma.JsonValue): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value as unknown as T;
}
