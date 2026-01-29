/**
 * SSI Eligibility Controller
 *
 * REST API controller for SSI/SSDI eligibility determination
 * using the Halcyon-Mugetsu SSI eligibility engine.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ssiEligibilityService,
  type SSIAssessmentResult,
  type QuickScoreResult,
  type StrategicRecommendationsResult,
  type BatchSSIAssessmentResult,
} from '../services/ssiEligibilityService.js';
import type { MugetsuAssessmentInput, WorkHistoryItem } from '../integrations/mugetsu/index.js';

// Validation schemas
const workHistoryItemSchema = z.object({
  jobTitle: z.string(),
  employer: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  physicalDemands: z.enum(['sedentary', 'light', 'medium', 'heavy', 'very_heavy']).optional(),
  description: z.string().optional(),
  hoursPerWeek: z.number().optional(),
  monthlyEarnings: z.number().optional(),
});

const assessInputSchema = z.object({
  // Patient identification (one required)
  patientId: z.string().optional(),

  // Direct input fields (if no patientId)
  medicalConditions: z.array(z.string()).optional(),
  age: z.number().min(0).max(120).optional(),
  dateOfBirth: z.string().optional(),
  education: z.string().optional(),
  workHistory: z.array(workHistoryItemSchema).optional(),
  functionalLimitations: z.array(z.string()).optional(),
  severity: z.enum(['mild', 'moderate', 'severe', 'disabling']).optional(),
  hospitalizations: z.number().min(0).optional(),
  medications: z.array(z.string()).optional(),
  stateOfResidence: z.string().optional(),
  isChildDisabilityCase: z.boolean().optional(),
  assistiveDevices: z.boolean().optional(),
  consistentTreatment: z.enum(['yes', 'no']).optional(),
  treatmentHistory: z.enum(['intermittent', 'emergent_only', 'partial', 'none', 'consistent']).optional(),
});

const quickScoreSchema = z.object({
  patientId: z.string().optional(),
  medicalConditions: z.array(z.string()).optional(),
  age: z.number().min(0).max(120).optional(),
  severity: z.enum(['mild', 'moderate', 'severe', 'disabling']).optional(),
  functionalLimitations: z.array(z.string()).optional(),
});

const batchAssessSchema = z.object({
  patientIds: z.array(z.string()).min(1).max(100),
  options: z.object({
    skipAI: z.boolean().optional(),
    scoresOnly: z.boolean().optional(),
  }).optional(),
});

/**
 * SSI Eligibility Controller
 */
export class SSIEligibilityController {
  /**
   * POST /ssi-eligibility/assess
   * Run full SSI eligibility assessment
   */
  async assess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = assessInputSchema.parse(req.body);

      let result: SSIAssessmentResult;

      if (parsed.patientId) {
        // Assess existing patient
        result = await ssiEligibilityService.assessSSIEligibility(parsed.patientId);
      } else {
        // Direct assessment with provided data
        if (!parsed.medicalConditions || parsed.medicalConditions.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Either patientId or medicalConditions is required',
              code: 'VALIDATION_ERROR',
            },
          });
          return;
        }

        // Calculate age from dateOfBirth if not provided
        let age = parsed.age;
        if (!age && parsed.dateOfBirth) {
          const dob = new Date(parsed.dateOfBirth);
          age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }
        if (!age) {
          age = 50; // Default age
        }

        const input: MugetsuAssessmentInput = {
          medicalConditions: parsed.medicalConditions,
          age,
          education: parsed.education || 'High School',
          workHistory: (parsed.workHistory as WorkHistoryItem[]) || [],
          functionalLimitations: parsed.functionalLimitations || [],
          severity: parsed.severity || 'moderate',
          hospitalizations: parsed.hospitalizations || 0,
          medications: parsed.medications || [],
          stateOfResidence: parsed.stateOfResidence,
          isChildDisabilityCase: parsed.isChildDisabilityCase,
          dateOfBirth: parsed.dateOfBirth,
          assistiveDevices: parsed.assistiveDevices,
          consistentTreatment: parsed.consistentTreatment,
          treatmentHistory: parsed.treatmentHistory,
        };

        // Use direct assessment
        const mugetsuClient = (await import('../integrations/mugetsu/index.js')).getMugetsuClientSafe();

        if (mugetsuClient && await mugetsuClient.healthCheck()) {
          const mugetsuResult = await mugetsuClient.assessDisability(input);
          result = ssiEligibilityService.enrichWithMugetsuResults('direct', mugetsuResult);
        } else {
          // Use fallback
          result = this.generateDirectFallbackAssessment(input);
        }
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /ssi-eligibility/patient/:id
   * Get SSI eligibility for a specific patient
   */
  async getPatientEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Patient ID is required',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const result = await ssiEligibilityService.assessSSIEligibility(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'PATIENT_NOT_FOUND',
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /ssi-eligibility/quick-score
   * Get quick approval likelihood score
   */
  async quickScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = quickScoreSchema.parse(req.body);

      let result: QuickScoreResult;

      if (parsed.patientId) {
        result = await ssiEligibilityService.getSSIApprovalLikelihood(parsed.patientId);
      } else {
        // Quick score with provided data
        if (!parsed.medicalConditions || parsed.medicalConditions.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Either patientId or medicalConditions is required',
              code: 'VALIDATION_ERROR',
            },
          });
          return;
        }

        const input: MugetsuAssessmentInput = {
          medicalConditions: parsed.medicalConditions,
          age: parsed.age || 50,
          education: 'High School',
          workHistory: [],
          functionalLimitations: parsed.functionalLimitations || [],
          severity: parsed.severity || 'moderate',
          hospitalizations: 0,
          medications: [],
        };

        // Calculate quick score
        const mugetsuClient = (await import('../integrations/mugetsu/index.js')).getMugetsuClientSafe();

        if (mugetsuClient && await mugetsuClient.healthCheck()) {
          const mugetsuResult = await mugetsuClient.assessDisability(input);
          result = {
            patientId: 'direct',
            score: mugetsuResult.score,
            viabilityRating: mugetsuResult.viabilityRating,
            recommendation: mugetsuResult.recommendation,
            keyFactors: mugetsuResult.keyFactors.slice(0, 3),
            timestamp: new Date().toISOString(),
          };
        } else {
          // Fallback quick score
          result = this.calculateQuickFallbackScore(input);
        }
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /ssi-eligibility/strategic-timing/:id
   * Get strategic timing recommendations
   */
  async strategicTiming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Patient ID is required',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const result = await ssiEligibilityService.getStrategicRecommendations(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'PATIENT_NOT_FOUND',
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /ssi-eligibility/batch
   * Batch assessment for multiple patients
   */
  async batchAssess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = batchAssessSchema.parse(req.body);

      const result = await ssiEligibilityService.batchAssess(parsed.patientIds);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /ssi-eligibility/status
   * Get Mugetsu service status
   */
  async getServiceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mugetsuClient = (await import('../integrations/mugetsu/index.js')).getMugetsuClientSafe();
      const isConfigured = (await import('../integrations/mugetsu/index.js')).isMugetsuConfigured();

      let isHealthy = false;
      let healthDetails = null;

      if (mugetsuClient) {
        try {
          isHealthy = await mugetsuClient.healthCheck();
          if (isHealthy) {
            healthDetails = await mugetsuClient.getHealthStatus();
          }
        } catch (error) {
          // Health check failed
        }
      }

      res.json({
        success: true,
        data: {
          configured: isConfigured,
          available: isHealthy,
          fallbackEnabled: true,
          healthDetails,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Private helper methods

  /**
   * Generate fallback assessment for direct input
   */
  private generateDirectFallbackAssessment(input: MugetsuAssessmentInput): SSIAssessmentResult {
    const score = this.calculateBasicScore(input);
    const viabilityRating = this.getViabilityRating(score);
    const recommendation = this.getRecommendation(score);

    return {
      patientId: 'direct',
      mugetsuScore: score,
      recommendation,
      viabilityRating,
      keyFactors: this.getKeyFactors(input, score),
      suggestedActions: this.getSuggestedActions(score),
      ssaWaterfallRates: this.calculateWaterfallRates(score, input.age),
      sequentialEvaluation: this.generateBasicSequentialEvaluation(input),
      ageProgressionAnalysis: this.generateBasicAgeProgression(input.age),
      timestamp: new Date().toISOString(),
      isFallback: true,
      fallbackReason: 'Mugetsu service unavailable',
    };
  }

  /**
   * Calculate quick fallback score
   */
  private calculateQuickFallbackScore(input: MugetsuAssessmentInput): QuickScoreResult {
    const score = this.calculateBasicScore(input);

    return {
      patientId: 'direct',
      score,
      viabilityRating: this.getViabilityRating(score),
      recommendation: this.getRecommendation(score),
      keyFactors: this.getKeyFactors(input, score).slice(0, 3),
      timestamp: new Date().toISOString(),
      isFallback: true,
    };
  }

  /**
   * Calculate basic score from input
   */
  private calculateBasicScore(input: MugetsuAssessmentInput): number {
    let score = 30;

    // Age factor
    if (input.age >= 55) score += 20;
    else if (input.age >= 50) score += 10;
    else if (input.age < 40) score -= 5;

    // Severity
    if (input.severity === 'disabling') score += 25;
    else if (input.severity === 'severe') score += 15;
    else if (input.severity === 'mild') score -= 10;

    // Conditions
    if (input.medicalConditions.length >= 3) score += 10;

    // Limitations
    if (input.functionalLimitations.length >= 4) score += 10;

    // Hospitalizations
    if (input.hospitalizations >= 2) score += 5;

    return Math.min(95, Math.max(5, score));
  }

  /**
   * Get viability rating from score
   */
  private getViabilityRating(score: number): string {
    if (score >= 70) return 'High';
    if (score >= 50) return 'Moderate';
    if (score >= 30) return 'Low';
    return 'Very Low';
  }

  /**
   * Get recommendation from score
   */
  private getRecommendation(score: number): string {
    if (score >= 70) return 'Highly Recommended';
    if (score >= 50) return 'Recommended';
    if (score >= 30) return 'Consider with Caution';
    return 'Not Recommended';
  }

  /**
   * Get key factors
   */
  private getKeyFactors(input: MugetsuAssessmentInput, score: number): string[] {
    const factors: string[] = [];

    if (input.age >= 55) {
      factors.push('Age 55+ provides significant Grid Rule advantage');
    } else if (input.age >= 50) {
      factors.push('Age 50-54 provides Grid Rule advantage');
    }

    if (input.severity === 'disabling' || input.severity === 'severe') {
      factors.push(`${input.severity.charAt(0).toUpperCase() + input.severity.slice(1)} impairment documented`);
    }

    if (input.medicalConditions.length >= 3) {
      factors.push(`${input.medicalConditions.length} medical conditions support combined effects`);
    }

    if (input.functionalLimitations.length >= 3) {
      factors.push(`${input.functionalLimitations.length} functional limitations documented`);
    }

    factors.push(`Overall score: ${score}/100`);

    return factors;
  }

  /**
   * Get suggested actions
   */
  private getSuggestedActions(score: number): string[] {
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
   * Calculate waterfall rates
   */
  private calculateWaterfallRates(score: number, age: number): SSIAssessmentResult['ssaWaterfallRates'] {
    const multiplier = (score / 50) * (age >= 55 ? 1.2 : age >= 50 ? 1.1 : 1.0);

    const initial = Math.min(0.60, Math.max(0.15, 0.38 * multiplier));
    const recon = Math.min(0.25, Math.max(0.08, 0.14 * multiplier));
    const alj = Math.min(0.70, Math.max(0.35, 0.54 * multiplier));

    const cumulative = initial + (1 - initial) * recon + (1 - initial) * (1 - recon) * alj;

    return {
      initial: { baseRate: 0.38, adjustedRate: initial, factors: ['Fallback estimate'] },
      reconsideration: { baseRate: 0.14, adjustedRate: recon, factors: ['Fallback estimate'] },
      aljHearing: { baseRate: 0.54, adjustedRate: alj, factors: ['Fallback estimate'] },
      cumulative: Math.min(0.95, cumulative),
      explanation: 'Fallback estimate - Mugetsu service unavailable',
    };
  }

  /**
   * Generate basic sequential evaluation
   */
  private generateBasicSequentialEvaluation(input: MugetsuAssessmentInput): SSIAssessmentResult['sequentialEvaluation'] {
    return {
      step1: { satisfied: true, analysis: 'Fallback assessment' },
      step2: { satisfied: input.medicalConditions.length > 0, analysis: 'Fallback assessment' },
      step3: { satisfied: input.severity === 'disabling' || input.severity === 'severe', analysis: 'Fallback assessment', matchedListings: [] },
      step4: { satisfied: input.functionalLimitations.length >= 3, analysis: 'Fallback assessment' },
      step5: { satisfied: input.age >= 50, analysis: 'Fallback assessment' },
      overallConclusion: 'Fallback assessment - detailed analysis requires Mugetsu service',
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
   * Generate basic age progression
   */
  private generateBasicAgeProgression(age: number): SSIAssessmentResult['ageProgressionAnalysis'] {
    let currentCategory = 'Younger Individual';
    let nextCategoryAge: number | undefined;
    let daysUntil: number | undefined;

    if (age >= 55) {
      currentCategory = 'Advanced Age (55+)';
    } else if (age >= 50) {
      currentCategory = 'Closely Approaching Advanced Age (50-54)';
      nextCategoryAge = 55;
      daysUntil = (55 - age) * 365;
    } else if (age >= 45) {
      currentCategory = 'Younger Individual (45-49)';
      nextCategoryAge = 50;
      daysUntil = (50 - age) * 365;
    } else {
      currentCategory = 'Younger Individual (18-44)';
      nextCategoryAge = 45;
      daysUntil = (45 - age) * 365;
    }

    return {
      currentAgeCategory: currentCategory,
      nextCategoryAge,
      daysUntilNextCategory: daysUntil,
      strategicTiming: {
        recommendation: daysUntil && daysUntil < 365
          ? 'Consider timing application near next age category'
          : 'No specific timing advantage',
        reasoning: 'Fallback assessment',
      },
      ageFactors: [`Current age: ${age}`, `Category: ${currentCategory}`],
    };
  }
}

// Export singleton instance
export const ssiEligibilityController = new SSIEligibilityController();
