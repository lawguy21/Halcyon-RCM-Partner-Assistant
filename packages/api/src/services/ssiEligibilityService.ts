/**
 * SSI Eligibility Service
 *
 * Service layer for SSI/SSDI eligibility determination using
 * the Halcyon-Mugetsu SSI eligibility engine.
 */

import { prisma } from '../lib/prisma.js';
import {
  getMugetsuClient,
  getMugetsuClientSafe,
  isMugetsuConfigured,
  MugetsuError,
  MugetsuErrorCode,
} from '../integrations/mugetsu/index.js';
import type {
  MugetsuAssessmentInput,
  MugetsuAssessmentResult,
  SSAWaterfallRates,
  WorkHistoryItem,
  AgeProgressionAnalysis,
  SequentialEvaluationAnalysis,
} from '../integrations/mugetsu/index.js';

/**
 * Patient data for SSI eligibility assessment
 */
export interface PatientForSSIAssessment {
  id: string;
  dateOfBirth?: Date | null;
  stateOfResidence?: string | null;
  // Medical data
  medicalConditions?: string[];
  medications?: string[];
  hospitalizations?: number;
  // Functional data
  functionalLimitations?: string[];
  severity?: 'mild' | 'moderate' | 'severe' | 'disabling';
  // Vocational data
  education?: string;
  workHistory?: WorkHistoryItem[];
  // Additional context
  isDisabled?: boolean;
  assistiveDevices?: boolean;
}

/**
 * Full SSI assessment result
 */
export interface SSIAssessmentResult {
  patientId: string;
  mugetsuScore: number;
  recommendation: string;
  viabilityRating: string;
  keyFactors: string[];
  suggestedActions: string[];
  ssaWaterfallRates: SSAWaterfallRates;
  sequentialEvaluation: SequentialEvaluationAnalysis;
  ageProgressionAnalysis: AgeProgressionAnalysis;
  scoreBreakdown?: Record<string, number | undefined>;
  conditionAnalysis?: {
    averageApprovalRate?: number;
    conditions?: Array<{
      condition: string;
      approvalRate?: number;
      category?: string;
    }>;
  };
  timestamp: string;
  mugetsuAssessmentId?: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

/**
 * Quick score result
 */
export interface QuickScoreResult {
  patientId: string;
  score: number;
  viabilityRating: string;
  recommendation: string;
  keyFactors: string[];
  timestamp: string;
  isFallback?: boolean;
}

/**
 * Strategic recommendations result
 */
export interface StrategicRecommendationsResult {
  patientId: string;
  ageProgressionAnalysis: AgeProgressionAnalysis;
  strategicTiming: {
    recommendation: string;
    reasoning: string;
    optimalFilingDate?: string;
    scoreImpact?: number;
  };
  ssaWaterfallRates: SSAWaterfallRates;
  suggestedActions: string[];
  timestamp: string;
}

/**
 * Batch assessment result
 */
export interface BatchSSIAssessmentResult {
  results: Array<{
    patientId: string;
    success: boolean;
    result?: SSIAssessmentResult;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    averageScore: number;
    mugetsuAvailable: boolean;
  };
}

/**
 * SSI Eligibility Service
 *
 * Provides methods for SSI/SSDI eligibility determination using
 * the Mugetsu eligibility engine with graceful fallback.
 */
export class SSIEligibilityService {
  /**
   * Perform a full SSI eligibility assessment for a patient
   *
   * @param patientId - The patient ID to assess
   * @returns Full SSI assessment result
   */
  async assessSSIEligibility(patientId: string): Promise<SSIAssessmentResult> {
    // Get patient data from database
    const patient = await this.getPatientData(patientId);

    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Map patient to Mugetsu input
    const mugetsuInput = this.mapPatientToMugetsuInput(patient);

    // Try Mugetsu assessment
    const client = getMugetsuClientSafe();

    if (client) {
      try {
        const isHealthy = await client.healthCheck();
        if (isHealthy) {
          const mugetsuResult = await client.assessDisability(mugetsuInput);
          const enrichedResult = this.enrichWithMugetsuResults(patientId, mugetsuResult);

          // Save assessment to database
          await this.saveAssessment(patientId, enrichedResult);

          return enrichedResult;
        }
      } catch (error) {
        console.warn('[SSIEligibilityService] Mugetsu assessment failed:', error);
        // Fall through to fallback
      }
    }

    // Fallback assessment
    console.log('[SSIEligibilityService] Using fallback SSI assessment');
    const fallbackResult = this.generateFallbackAssessment(patientId, mugetsuInput);

    // Save fallback assessment
    await this.saveAssessment(patientId, fallbackResult);

    return fallbackResult;
  }

  /**
   * Get quick SSI approval likelihood score for a patient
   *
   * @param patientId - The patient ID to assess
   * @returns Quick score result
   */
  async getSSIApprovalLikelihood(patientId: string): Promise<QuickScoreResult> {
    const patient = await this.getPatientData(patientId);

    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    const mugetsuInput = this.mapPatientToMugetsuInput(patient);
    const client = getMugetsuClientSafe();

    if (client && await client.healthCheck()) {
      try {
        const result = await client.assessDisability(mugetsuInput);
        return {
          patientId,
          score: result.score,
          viabilityRating: result.viabilityRating,
          recommendation: result.recommendation,
          keyFactors: result.keyFactors.slice(0, 3),
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.warn('[SSIEligibilityService] Quick score failed:', error);
      }
    }

    // Fallback quick score
    const fallbackScore = this.calculateFallbackScore(mugetsuInput);
    return {
      patientId,
      score: fallbackScore.score,
      viabilityRating: fallbackScore.viabilityRating,
      recommendation: fallbackScore.recommendation,
      keyFactors: fallbackScore.keyFactors,
      timestamp: new Date().toISOString(),
      isFallback: true,
    };
  }

  /**
   * Get strategic recommendations for SSI filing
   *
   * @param patientId - The patient ID
   * @returns Strategic timing and recommendations
   */
  async getStrategicRecommendations(
    patientId: string
  ): Promise<StrategicRecommendationsResult> {
    const patient = await this.getPatientData(patientId);

    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    const mugetsuInput = this.mapPatientToMugetsuInput(patient);
    const client = getMugetsuClientSafe();

    if (client && await client.healthCheck()) {
      try {
        const result = await client.assessDisability(mugetsuInput);
        return {
          patientId,
          ageProgressionAnalysis: result.ageProgressionAnalysis,
          strategicTiming: result.ageProgressionAnalysis.strategicTiming,
          ssaWaterfallRates: result.ssaWaterfallRates,
          suggestedActions: result.suggestedActions,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.warn('[SSIEligibilityService] Strategic recommendations failed:', error);
      }
    }

    // Fallback recommendations
    return this.generateFallbackStrategicRecommendations(patientId, mugetsuInput);
  }

  /**
   * Batch assess multiple patients
   *
   * @param patientIds - Array of patient IDs to assess
   * @returns Batch assessment results
   */
  async batchAssess(patientIds: string[]): Promise<BatchSSIAssessmentResult> {
    const results: BatchSSIAssessmentResult['results'] = [];
    let successfulScores: number[] = [];
    const client = getMugetsuClientSafe();
    const mugetsuAvailable = client ? await client.healthCheck() : false;

    for (const patientId of patientIds) {
      try {
        const result = await this.assessSSIEligibility(patientId);
        results.push({
          patientId,
          success: true,
          result,
        });
        successfulScores.push(result.mugetsuScore);
      } catch (error) {
        results.push({
          patientId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      results,
      summary: {
        total: patientIds.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        averageScore:
          successfulScores.length > 0
            ? successfulScores.reduce((a, b) => a + b, 0) / successfulScores.length
            : 0,
        mugetsuAvailable,
      },
    };
  }

  /**
   * Check if Mugetsu service is available
   */
  async isMugetsuAvailable(): Promise<boolean> {
    if (!isMugetsuConfigured()) {
      return false;
    }

    const client = getMugetsuClientSafe();
    if (!client) {
      return false;
    }

    try {
      return await client.healthCheck();
    } catch {
      return false;
    }
  }

  /**
   * Map patient data to Mugetsu assessment input
   */
  mapPatientToMugetsuInput(patient: PatientForSSIAssessment): MugetsuAssessmentInput {
    const age = patient.dateOfBirth
      ? Math.floor(
          (Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        )
      : 50; // Default age if not provided

    return {
      medicalConditions: patient.medicalConditions || [],
      age,
      education: patient.education || 'High School',
      workHistory: patient.workHistory || [],
      functionalLimitations: patient.functionalLimitations || [],
      severity: patient.severity || 'moderate',
      hospitalizations: patient.hospitalizations || 0,
      medications: patient.medications || [],
      stateOfResidence: patient.stateOfResidence || undefined,
      dateOfBirth: patient.dateOfBirth?.toISOString().split('T')[0],
      assistiveDevices: patient.assistiveDevices,
    };
  }

  /**
   * Enrich assessment with Mugetsu results
   */
  enrichWithMugetsuResults(
    patientId: string,
    mugetsuResult: MugetsuAssessmentResult
  ): SSIAssessmentResult {
    return {
      patientId,
      mugetsuScore: mugetsuResult.score,
      recommendation: mugetsuResult.recommendation,
      viabilityRating: mugetsuResult.viabilityRating,
      keyFactors: mugetsuResult.keyFactors,
      suggestedActions: mugetsuResult.suggestedActions,
      ssaWaterfallRates: mugetsuResult.ssaWaterfallRates,
      sequentialEvaluation: mugetsuResult.sequentialEvaluation,
      ageProgressionAnalysis: mugetsuResult.ageProgressionAnalysis,
      scoreBreakdown: mugetsuResult.scoreBreakdown,
      conditionAnalysis: mugetsuResult.conditionAnalysis,
      timestamp: mugetsuResult.timestamp || new Date().toISOString(),
      mugetsuAssessmentId: mugetsuResult.assessmentId,
    };
  }

  // Private methods

  /**
   * Get patient data from database
   */
  private async getPatientData(patientId: string): Promise<PatientForSSIAssessment | null> {
    // Try to find patient in Assessment table first
    const assessment = await prisma.assessment.findUnique({
      where: { id: patientId },
    });

    if (assessment) {
      return {
        id: assessment.id,
        dateOfBirth: assessment.patientDob,
        stateOfResidence: assessment.patientState,
        medicalConditions: [], // Would need to be stored separately
        medications: [], // Would need to be stored separately
        hospitalizations: 0,
        functionalLimitations: [],
        severity: this.mapDisabilityLikelihood(assessment.disabilityLikelihood),
        education: 'High School', // Default
        workHistory: [],
        isDisabled: assessment.ssiEligibilityLikely || false,
      };
    }

    // Try CollectionPatient (using raw query to handle Prisma type issues)
    try {
      const collectionPatient = await (prisma as any).collectionPatient?.findUnique({
        where: { id: patientId },
      });

      if (collectionPatient) {
        return {
          id: collectionPatient.id,
          dateOfBirth: collectionPatient.dateOfBirth,
          stateOfResidence: collectionPatient.state,
          medicalConditions: [],
          medications: [],
          hospitalizations: 0,
          functionalLimitations: [],
          severity: 'moderate',
          education: 'High School',
          workHistory: [],
        };
      }
    } catch (e) {
      // CollectionPatient model may not exist in older schema versions
      console.warn('[SSIEligibilityService] CollectionPatient lookup failed:', e);
    }

    return null;
  }

  /**
   * Map disability likelihood string to severity
   */
  private mapDisabilityLikelihood(
    likelihood: string | null
  ): 'mild' | 'moderate' | 'severe' | 'disabling' {
    if (!likelihood) return 'moderate';
    const lower = likelihood.toLowerCase();
    if (lower.includes('high') || lower.includes('likely')) return 'severe';
    if (lower.includes('low') || lower.includes('unlikely')) return 'mild';
    return 'moderate';
  }

  /**
   * Save assessment to database
   */
  private async saveAssessment(
    patientId: string,
    result: SSIAssessmentResult
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SSI_ASSESSMENT',
          entityType: 'SSIAssessment',
          entityId: patientId,
          details: JSON.stringify({
            score: result.mugetsuScore,
            recommendation: result.recommendation,
            viabilityRating: result.viabilityRating,
            keyFactors: result.keyFactors,
            ssaWaterfallRates: result.ssaWaterfallRates,
            isFallback: result.isFallback || false,
            timestamp: result.timestamp,
          }),
        },
      });
    } catch (error) {
      console.error('[SSIEligibilityService] Failed to save assessment:', error);
    }
  }

  /**
   * Generate fallback assessment when Mugetsu is unavailable
   */
  private generateFallbackAssessment(
    patientId: string,
    input: MugetsuAssessmentInput
  ): SSIAssessmentResult {
    const fallbackScore = this.calculateFallbackScore(input);

    return {
      patientId,
      mugetsuScore: fallbackScore.score,
      recommendation: fallbackScore.recommendation,
      viabilityRating: fallbackScore.viabilityRating,
      keyFactors: fallbackScore.keyFactors,
      suggestedActions: this.generateFallbackSuggestedActions(fallbackScore.score),
      ssaWaterfallRates: this.generateFallbackWaterfallRates(fallbackScore.score, input.age),
      sequentialEvaluation: this.generateFallbackSequentialEvaluation(input),
      ageProgressionAnalysis: this.generateFallbackAgeProgression(input.age),
      timestamp: new Date().toISOString(),
      isFallback: true,
      fallbackReason: 'Mugetsu service unavailable',
    };
  }

  /**
   * Calculate fallback score based on basic heuristics
   */
  private calculateFallbackScore(input: MugetsuAssessmentInput): {
    score: number;
    viabilityRating: string;
    recommendation: string;
    keyFactors: string[];
  } {
    let score = 30; // Base score
    const keyFactors: string[] = [];

    // Age factor (Grid Rules favor older claimants)
    if (input.age >= 55) {
      score += 20;
      keyFactors.push('Age 55+ provides significant Grid Rule advantage');
    } else if (input.age >= 50) {
      score += 10;
      keyFactors.push('Age 50-54 provides Grid Rule advantage');
    } else if (input.age < 40) {
      score -= 5;
      keyFactors.push('Younger age requires stronger medical evidence');
    }

    // Condition severity
    if (input.severity === 'disabling') {
      score += 25;
      keyFactors.push('Disabling severity level supports claim');
    } else if (input.severity === 'severe') {
      score += 15;
      keyFactors.push('Severe impairment documented');
    } else if (input.severity === 'mild') {
      score -= 10;
      keyFactors.push('Mild severity may require additional evidence');
    }

    // Number of conditions
    if (input.medicalConditions.length >= 3) {
      score += 10;
      keyFactors.push(`${input.medicalConditions.length} medical conditions support combined effects argument`);
    }

    // Functional limitations
    if (input.functionalLimitations.length >= 4) {
      score += 10;
      keyFactors.push('Multiple functional limitations documented');
    }

    // Hospitalizations
    if (input.hospitalizations >= 2) {
      score += 5;
      keyFactors.push(`${input.hospitalizations} hospitalizations indicate severity`);
    }

    // Cap score
    score = Math.min(95, Math.max(5, score));

    // Determine viability rating
    let viabilityRating: string;
    let recommendation: string;

    if (score >= 70) {
      viabilityRating = 'High';
      recommendation = 'Highly Recommended';
    } else if (score >= 50) {
      viabilityRating = 'Moderate';
      recommendation = 'Recommended';
    } else if (score >= 30) {
      viabilityRating = 'Low';
      recommendation = 'Consider with Caution';
    } else {
      viabilityRating = 'Very Low';
      recommendation = 'Not Recommended';
    }

    return { score, viabilityRating, recommendation, keyFactors };
  }

  /**
   * Generate fallback suggested actions
   */
  private generateFallbackSuggestedActions(score: number): string[] {
    if (score >= 70) {
      return [
        'Proceed with SSI/SSDI application',
        'Gather all medical records from past 12 months',
        'Obtain treating physician RFC assessment',
        'Document all work attempts and limitations',
      ];
    } else if (score >= 50) {
      return [
        'Consider applying with proper preparation',
        'Obtain detailed medical documentation',
        'Request functional capacity evaluation',
        'Document daily living limitations',
      ];
    } else {
      return [
        'Build stronger medical documentation',
        'Seek specialist evaluations',
        'Document treatment history consistently',
        'Consider waiting for condition progression',
      ];
    }
  }

  /**
   * Generate fallback waterfall rates
   */
  private generateFallbackWaterfallRates(score: number, age: number): SSAWaterfallRates {
    const baseInitial = 0.38;
    const baseRecon = 0.14;
    const baseALJ = 0.54;

    let multiplier = score / 50; // 1.0 at score 50
    if (age >= 55) multiplier *= 1.2;
    else if (age >= 50) multiplier *= 1.1;

    const adjustedInitial = Math.min(0.60, Math.max(0.15, baseInitial * multiplier));
    const adjustedRecon = Math.min(0.25, Math.max(0.08, baseRecon * multiplier));
    const adjustedALJ = Math.min(0.70, Math.max(0.35, baseALJ * multiplier));

    const cumulative =
      adjustedInitial +
      (1 - adjustedInitial) * adjustedRecon +
      (1 - adjustedInitial) * (1 - adjustedRecon) * adjustedALJ;

    return {
      initial: {
        baseRate: baseInitial,
        adjustedRate: adjustedInitial,
        factors: ['Fallback estimate based on basic factors'],
      },
      reconsideration: {
        baseRate: baseRecon,
        adjustedRate: adjustedRecon,
        factors: ['Fallback estimate based on basic factors'],
      },
      aljHearing: {
        baseRate: baseALJ,
        adjustedRate: adjustedALJ,
        factors: ['Fallback estimate based on basic factors'],
      },
      cumulative: Math.min(0.95, cumulative),
      explanation: 'Fallback estimate - Mugetsu service unavailable for detailed analysis',
    };
  }

  /**
   * Generate fallback sequential evaluation
   */
  private generateFallbackSequentialEvaluation(
    input: MugetsuAssessmentInput
  ): SequentialEvaluationAnalysis {
    return {
      step1: {
        satisfied: true,
        analysis: 'Fallback assessment - detailed SGA analysis requires Mugetsu service',
      },
      step2: {
        satisfied: input.medicalConditions.length > 0,
        analysis: input.medicalConditions.length > 0
          ? `${input.medicalConditions.length} condition(s) documented`
          : 'No conditions documented - requires further evaluation',
      },
      step3: {
        satisfied: input.severity === 'disabling' || input.severity === 'severe',
        analysis: 'Fallback assessment - detailed listing analysis requires Mugetsu service',
        matchedListings: [],
      },
      step4: {
        satisfied: input.functionalLimitations.length >= 3,
        analysis: 'Fallback assessment - detailed PRW analysis requires Mugetsu service',
      },
      step5: {
        satisfied: input.age >= 50 && input.functionalLimitations.length >= 2,
        analysis: 'Fallback assessment - detailed Grid Rule analysis requires Mugetsu service',
      },
      overallConclusion: 'Fallback assessment - full sequential evaluation requires Mugetsu service',
      criticalFactors: {
        age: input.age,
        hasGridAdvantage: input.age >= 50,
        expectedRFC: input.severity === 'disabling' ? 'Sedentary' : 'Light',
        transferableSkills: false,
        likelyCannotReturnToPRW: input.functionalLimitations.length >= 3,
      },
    };
  }

  /**
   * Generate fallback age progression analysis
   */
  private generateFallbackAgeProgression(age: number): AgeProgressionAnalysis {
    let currentCategory: string;
    let nextCategoryAge: number | undefined;
    let daysUntilNext: number | undefined;

    if (age >= 55) {
      currentCategory = 'Advanced Age (55+)';
    } else if (age >= 50) {
      currentCategory = 'Closely Approaching Advanced Age (50-54)';
      nextCategoryAge = 55;
      daysUntilNext = (55 - age) * 365;
    } else if (age >= 45) {
      currentCategory = 'Younger Individual (45-49)';
      nextCategoryAge = 50;
      daysUntilNext = (50 - age) * 365;
    } else {
      currentCategory = 'Younger Individual (18-44)';
      nextCategoryAge = 45;
      daysUntilNext = (45 - age) * 365;
    }

    return {
      currentAgeCategory: currentCategory,
      nextCategoryAge,
      daysUntilNextCategory: daysUntilNext,
      strategicTiming: {
        recommendation:
          daysUntilNext && daysUntilNext < 365
            ? 'Consider timing application near next age category'
            : 'No specific timing advantage identified',
        reasoning: 'Fallback assessment - detailed timing analysis requires Mugetsu service',
      },
      ageFactors: [`Current age: ${age}`, `Category: ${currentCategory}`],
    };
  }

  /**
   * Generate fallback strategic recommendations
   */
  private generateFallbackStrategicRecommendations(
    patientId: string,
    input: MugetsuAssessmentInput
  ): StrategicRecommendationsResult {
    const ageProgression = this.generateFallbackAgeProgression(input.age);
    const fallbackScore = this.calculateFallbackScore(input);

    return {
      patientId,
      ageProgressionAnalysis: ageProgression,
      strategicTiming: ageProgression.strategicTiming,
      ssaWaterfallRates: this.generateFallbackWaterfallRates(fallbackScore.score, input.age),
      suggestedActions: this.generateFallbackSuggestedActions(fallbackScore.score),
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const ssiEligibilityService = new SSIEligibilityService();
