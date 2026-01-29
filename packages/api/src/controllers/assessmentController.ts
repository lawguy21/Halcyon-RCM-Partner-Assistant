// @ts-nocheck
/**
 * Assessment Controller
 * Business logic for recovery assessment operations
 * Uses Prisma for database storage
 */

import { calculateHospitalRecovery } from '@halcyon-rcm/core';
import type { HospitalRecoveryInput, HospitalRecoveryResult } from '@halcyon-rcm/core';
import { prisma } from '../lib/prisma.js';
import {
  resultToAssessmentInput,
  assessmentToResponse,
  buildAssessmentFilters,
  buildOrderBy,
  type AssessmentFilters,
  type AssessmentResponse,
} from '../lib/db-helpers.js';

// Types for assessment storage (API-level types)
export interface StoredAssessment {
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

// Re-export AssessmentFilters for backward compatibility
export type { AssessmentFilters };

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export class AssessmentController {
  /**
   * Create a single assessment from manual input
   */
  async createAssessment(
    input: HospitalRecoveryInput,
    metadata?: {
      tags?: string[];
      notes?: string;
      patientIdentifier?: string;
      accountNumber?: string;
      userId?: string;
      organizationId?: string;
    }
  ): Promise<StoredAssessment> {
    // Run the recovery calculation
    const result = calculateHospitalRecovery(input);

    // Create the database record
    const dbInput = resultToAssessmentInput(input, result, {
      tags: metadata?.tags,
      notes: metadata?.notes,
      patientIdentifier: metadata?.patientIdentifier,
      accountNumber: metadata?.accountNumber,
      userId: metadata?.userId,
      organizationId: metadata?.organizationId,
    });

    const assessment = await prisma.assessment.create({
      data: dbInput,
    });

    console.log(`[Assessment] Created assessment ${assessment.id} - Path: ${result.primaryRecoveryPath}, Recovery: $${result.estimatedTotalRecovery}`);

    return this.toStoredAssessment(assessment);
  }

  /**
   * Process batch of patient data into assessments
   */
  async batchAssessment(
    inputs: Array<{
      input: HospitalRecoveryInput;
      patientIdentifier?: string;
      accountNumber?: string;
    }>,
    metadata?: {
      userId?: string;
      organizationId?: string;
      importId?: string;
    }
  ): Promise<{
    successful: StoredAssessment[];
    failed: Array<{ index: number; error: string }>;
    totalProcessed: number;
    successCount: number;
    failureCount: number;
  }> {
    const successful: StoredAssessment[] = [];
    const failed: Array<{ index: number; error: string }> = [];

    // Process in a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < inputs.length; i++) {
        try {
          const { input, patientIdentifier, accountNumber } = inputs[i];
          const result = calculateHospitalRecovery(input);

          const dbInput = resultToAssessmentInput(input, result, {
            patientIdentifier,
            accountNumber,
            userId: metadata?.userId,
            organizationId: metadata?.organizationId,
            importId: metadata?.importId,
          });

          const assessment = await tx.assessment.create({
            data: dbInput,
          });

          successful.push(this.toStoredAssessment(assessment));
        } catch (error) {
          failed.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    console.log(`[Assessment] Batch processed ${inputs.length} assessments - ${successful.length} successful, ${failed.length} failed`);

    return {
      successful,
      failed,
      totalProcessed: inputs.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  /**
   * List assessments with filters and pagination
   */
  async getAssessments(filters: AssessmentFilters = {}): Promise<PaginatedResponse<StoredAssessment>> {
    const where = buildAssessmentFilters(filters);
    const orderBy = buildOrderBy(filters.sortBy, filters.sortOrder);
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    // Execute count and findMany in parallel
    const [total, assessments] = await Promise.all([
      prisma.assessment.count({ where }),
      prisma.assessment.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
    ]);

    return {
      data: assessments.map((a) => this.toStoredAssessment(a)),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get single assessment by ID
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async getAssessmentById(id: string, organizationId?: string): Promise<StoredAssessment | null> {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return null;
    }

    // Verify tenant ownership if organizationId provided
    if (organizationId && assessment.organizationId !== organizationId) {
      return null; // Return null instead of exposing cross-tenant data
    }

    return this.toStoredAssessment(assessment);
  }

  /**
   * Delete an assessment
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async deleteAssessment(id: string, organizationId?: string): Promise<boolean> {
    try {
      // First verify the record belongs to the organization
      if (organizationId) {
        const existing = await prisma.assessment.findUnique({
          where: { id },
          select: { organizationId: true },
        });
        if (!existing || existing.organizationId !== organizationId) {
          return false; // Not found or doesn't belong to this org
        }
      }

      await prisma.assessment.delete({
        where: { id },
      });
      console.log(`[Assessment] Deleted assessment ${id}`);
      return true;
    } catch (error) {
      // If record not found, return false instead of throwing
      if (error?.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Update assessment metadata (tags, notes)
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async updateAssessmentMetadata(
    id: string,
    metadata: {
      tags?: string[];
      notes?: string;
    },
    organizationId?: string
  ): Promise<StoredAssessment | null> {
    try {
      // First verify the record belongs to the organization
      if (organizationId) {
        const existing = await prisma.assessment.findUnique({
          where: { id },
          select: { organizationId: true },
        });
        if (!existing || existing.organizationId !== organizationId) {
          return null; // Not found or doesn't belong to this org
        }
      }

      const assessment = await prisma.assessment.update({
        where: { id },
        data: {
          tags: metadata.tags,
          notes: metadata.notes,
          updatedAt: new Date(),
        },
      });

      console.log(`[Assessment] Updated metadata for assessment ${id}`);
      return this.toStoredAssessment(assessment);
    } catch (error) {
      // If record not found, return null
      if (error?.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Recalculate an assessment with updated input
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async recalculateAssessment(
    id: string,
    input: HospitalRecoveryInput,
    organizationId?: string
  ): Promise<StoredAssessment | null> {
    // First check if the assessment exists
    const existing = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    // Verify tenant ownership if organizationId provided
    if (organizationId && existing.organizationId !== organizationId) {
      return null; // Return null instead of exposing cross-tenant data
    }

    // Run new calculation
    const result = calculateHospitalRecovery(input);

    // Update the record
    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        input: input as any,
        result: result as any,
        primaryRecoveryPath: result.primaryRecoveryPath,
        overallConfidence: result.overallConfidence,
        estimatedTotalRecovery: result.estimatedTotalRecovery,
        currentExposure: result.currentExposure,
        stateOfService: input.stateOfService,
        facilityState: input.facilityState,
        encounterType: input.encounterType,
        updatedAt: new Date(),
      },
    });

    console.log(`[Assessment] Recalculated assessment ${id} - New path: ${result.primaryRecoveryPath}`);
    return this.toStoredAssessment(assessment);
  }

  /**
   * Get all assessments (for internal use - limited to 10000)
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async getAllAssessments(organizationId?: string): Promise<StoredAssessment[]> {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const assessments = await prisma.assessment.findMany({
      where,
      take: 10000,
      orderBy: { createdAt: 'desc' },
    });

    return assessments.map((a) => this.toStoredAssessment(a));
  }

  /**
   * Get assessments by import ID
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async getAssessmentsByImportId(importId: string, organizationId?: string): Promise<StoredAssessment[]> {
    const where: any = { importId };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return assessments.map((a) => this.toStoredAssessment(a));
  }

  /**
   * Delete all assessments for a specific import
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async deleteAssessmentsByImportId(importId: string, organizationId?: string): Promise<number> {
    const where: any = { importId };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const result = await prisma.assessment.deleteMany({
      where,
    });

    console.log(`[Assessment] Deleted ${result.count} assessments for import ${importId}`);
    return result.count;
  }

  /**
   * Get aggregated statistics
   */
  async getStatistics(filters?: AssessmentFilters): Promise<{
    totalCount: number;
    totalRecovery: number;
    totalExposure: number;
    averageConfidence: number;
    averageRecovery: number;
  }> {
    const where = filters ? buildAssessmentFilters(filters) : {};

    const stats = await prisma.assessment.aggregate({
      where,
      _count: true,
      _sum: {
        estimatedTotalRecovery: true,
        currentExposure: true,
      },
      _avg: {
        overallConfidence: true,
        estimatedTotalRecovery: true,
      },
    });

    return {
      totalCount: stats._count,
      totalRecovery: stats._sum.estimatedTotalRecovery?.toNumber() || 0,
      totalExposure: stats._sum.currentExposure?.toNumber() || 0,
      averageConfidence: Math.round(stats._avg.overallConfidence || 0),
      averageRecovery: Math.round(stats._avg.estimatedTotalRecovery?.toNumber() || 0),
    };
  }

  /**
   * Convert Prisma Assessment to StoredAssessment
   */
  private toStoredAssessment(assessment: any): StoredAssessment {
    return {
      id: assessment.id,
      input: assessment.input as HospitalRecoveryInput,
      result: assessment.result as HospitalRecoveryResult,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
      tags: assessment.tags?.length > 0 ? assessment.tags : undefined,
      notes: assessment.notes || undefined,
      patientIdentifier: assessment.patientIdentifier || undefined,
      accountNumber: assessment.accountNumber || undefined,
      userId: assessment.userId || undefined,
      organizationId: assessment.organizationId || undefined,
      importId: assessment.importId || undefined,
    };
  }

  /**
   * Clear all assessments (for testing)
   * WARNING: This is a destructive operation for testing only
   * IMPORTANT: In production, should require organizationId to prevent cross-tenant deletion
   */
  async clearAll(organizationId?: string): Promise<void> {
    if (organizationId) {
      // Safe: only clear assessments for this organization
      await prisma.assessment.deleteMany({
        where: { organizationId },
      });
      console.log(`[Assessment] Cleared all assessments for organization ${organizationId}`);
    } else {
      // DANGER: Only for testing - clears ALL assessments
      // In production, this should be disabled or require super admin privileges
      console.warn('[Assessment] WARNING: Clearing ALL assessments across all organizations');
      await prisma.assessment.deleteMany({});
      console.log('[Assessment] Cleared all assessments');
    }
  }
}

// Export singleton instance
export const assessmentController = new AssessmentController();
