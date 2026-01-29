// @ts-nocheck
/**
 * Eligibility Controller
 * Business logic for Medicaid/Medicare eligibility determination
 */

import {
  calculateMAGI,
  quickMAGICheck,
  evaluatePresumptiveEligibility,
  calculateRetroactiveCoverage,
  evaluateMedicareAgeEligibility,
  evaluateDualEligible,
  type MAGICalculatorInput,
  type PresumptiveEligibilityInput,
  type RetroactiveCoverageInput,
  type MedicareAgeInput,
  type DualEligibleInput
} from '@halcyon-rcm/core';
import { prisma } from '../lib/prisma.js';

export interface EligibilityScreeningInput {
  // Patient demographics
  patientId?: string;
  dateOfBirth: string;
  stateOfResidence: string;

  // Household info
  householdSize: number;
  householdIncome: number;
  incomeFrequency: 'annual' | 'monthly';

  // Income breakdown
  wages?: number;
  selfEmployment?: number;
  socialSecurity?: number;
  unemployment?: number;
  pension?: number;
  investment?: number;
  alimony?: number;

  // Eligibility factors
  isPregnant?: boolean;
  isDisabled?: boolean;
  hasEndStageRenalDisease?: boolean;
  hasALS?: boolean;
  isReceivingSSDI?: boolean;
  ssdiStartDate?: string;

  // Insurance status
  hasMedicare?: boolean;
  medicarePartA?: boolean;
  medicarePartB?: boolean;
  hasMedicaid?: boolean;
  medicaidStatus?: 'active' | 'pending' | 'denied' | 'none';

  // Encounter info
  dateOfService?: string;
  applicationDate?: string;
}

export interface ComprehensiveEligibilityResult {
  // MAGI Analysis
  magi: {
    totalMAGI: number;
    fplPercentage: number;
    isEligible: boolean;
    confidence: number;
    incomeBreakdown: {
      countedIncome: number;
      disregards: number;
      netCountableIncome: number;
    };
  };

  // Presumptive Eligibility
  presumptive: {
    isEligible: boolean;
    programsAvailable: string[];
    coverageEndDate?: string;
    applicationDeadline?: string;
    confidence: number;
  };

  // Retroactive Coverage
  retroactive: {
    isEligible: boolean;
    coverageStartDate?: string;
    monthsCovered: number;
    hasWaiverRestriction: boolean;
    confidence: number;
  };

  // Medicare Analysis
  medicare: {
    isEligible: boolean;
    eligibilityBasis?: string;
    eligibilityDate?: string;
    confidence: number;
  };

  // Dual Eligible Analysis
  dualEligible?: {
    isDualEligible: boolean;
    category?: string;
    billingInstructions?: string[];
    confidence: number;
  };

  // Overall recommendation
  recommendation: {
    primaryPath: string;
    confidence: number;
    immediateActions: string[];
    documentsNeeded: string[];
  };
}

export class EligibilityController {
  /**
   * Perform comprehensive eligibility screening
   */
  async screenEligibility(input: EligibilityScreeningInput): Promise<ComprehensiveEligibilityResult> {
    const annualIncome = input.incomeFrequency === 'monthly'
      ? input.householdIncome * 12
      : input.householdIncome;

    // Calculate MAGI
    const magiInput: MAGICalculatorInput = {
      stateCode: input.stateOfResidence,
      householdSize: input.householdSize,
      income: {
        wages: input.wages || 0,
        selfEmployment: input.selfEmployment || 0,
        socialSecurity: input.socialSecurity || 0,
        unemployment: input.unemployment || 0,
        pension: input.pension || 0,
        investment: input.investment || 0,
        alimony: input.alimony || 0,
        other: 0
      },
      household: {
        isPregnant: input.isPregnant || false,
        isBlindOrDisabled: input.isDisabled || false,
        ageCategory: this.calculateAgeCategory(input.dateOfBirth),
        isFormerFosterCare: false
      }
    };

    const magiResult = calculateMAGI(magiInput);

    // Evaluate presumptive eligibility
    const peInput: PresumptiveEligibilityInput = {
      stateCode: input.stateOfResidence,
      category: this.determinePatientCategory(input),
      estimatedFPL: magiResult.fplPercentage,
      dateOfService: input.dateOfService || new Date().toISOString().split('T')[0]
    };

    const peResult = evaluatePresumptiveEligibility(peInput);

    // Calculate retroactive coverage
    const retroInput: RetroactiveCoverageInput = {
      stateCode: input.stateOfResidence,
      dateOfService: input.dateOfService || new Date().toISOString().split('T')[0],
      applicationDate: input.applicationDate || new Date().toISOString().split('T')[0],
      isExpansionAdult: magiResult.applicantCategory === 'adult' && magiResult.fplPercentage <= 138
    };

    const retroResult = calculateRetroactiveCoverage(retroInput);

    // Evaluate Medicare eligibility
    const medicareInput: MedicareAgeInput = {
      dateOfBirth: input.dateOfBirth,
      hasEndStageRenalDisease: input.hasEndStageRenalDisease || false,
      hasALS: input.hasALS || false,
      isReceivingSSDI: input.isReceivingSSDI || false,
      ssdiStartDate: input.ssdiStartDate,
      evaluationDate: input.dateOfService
    };

    const medicareResult = evaluateMedicareAgeEligibility(medicareInput);

    // Evaluate dual eligible status if both programs apply
    let dualResult = undefined;
    if ((input.hasMedicare || medicareResult.isCurrentlyEligible) &&
        (input.hasMedicaid || magiResult.isEligible)) {
      const dualInput: DualEligibleInput = {
        medicarePartA: input.medicarePartA || medicareResult.isCurrentlyEligible,
        medicarePartB: input.medicarePartB || false,
        medicaidStatus: input.medicaidStatus === 'active' ? 'full' : 'none',
        stateCode: input.stateOfResidence,
        incomeAsPercentFPL: magiResult.fplPercentage,
        resourcesUnderLimit: true
      };

      const dualEvalResult = evaluateDualEligible(dualInput);
      dualResult = {
        isDualEligible: dualEvalResult.isDualEligible,
        category: dualEvalResult.category,
        billingInstructions: dualEvalResult.billingInstructions?.map(b => b.instruction) || [],
        confidence: dualEvalResult.confidence
      };
    }

    // Determine primary path and recommendation
    const recommendation = this.generateRecommendation(
      magiResult,
      peResult,
      retroResult,
      medicareResult,
      dualResult
    );

    return {
      magi: {
        totalMAGI: magiResult.totalMAGI,
        fplPercentage: magiResult.fplPercentage,
        isEligible: magiResult.isEligible,
        confidence: magiResult.confidence,
        incomeBreakdown: {
          countedIncome: magiResult.breakdown.grossIncome,
          disregards: magiResult.breakdown.incomeDisregard,
          netCountableIncome: magiResult.breakdown.netCountableIncome
        }
      },
      presumptive: {
        isEligible: peResult.isEligible,
        programsAvailable: peResult.availablePrograms || [],
        coverageEndDate: peResult.coverageEndDate,
        applicationDeadline: peResult.applicationDeadline,
        confidence: peResult.confidence
      },
      retroactive: {
        isEligible: retroResult.isEligible,
        coverageStartDate: retroResult.coverageStartDate,
        monthsCovered: retroResult.monthsCovered,
        hasWaiverRestriction: retroResult.hasWaiverRestriction,
        confidence: retroResult.confidence
      },
      medicare: {
        isEligible: medicareResult.isCurrentlyEligible,
        eligibilityBasis: medicareResult.eligibilityBasis,
        eligibilityDate: medicareResult.eligibilityDate,
        confidence: medicareResult.confidence
      },
      dualEligible: dualResult,
      recommendation
    };
  }

  /**
   * Quick MAGI check for preliminary screening
   */
  async quickMAGIScreen(
    stateCode: string,
    householdSize: number,
    monthlyIncome: number
  ): Promise<{ isLikelyEligible: boolean; fplPercentage: number; threshold: number }> {
    const result = quickMAGICheck(stateCode, householdSize, monthlyIncome);
    return result;
  }

  /**
   * Get state-specific eligibility information
   */
  async getStateEligibilityInfo(stateCode: string): Promise<{
    isExpansionState: boolean;
    incomeThresholds: Record<string, number>;
    hasPresumptiveEligibility: boolean;
    retroactiveWindow: number;
  }> {
    // Import state config dynamically
    const { getStateConfig } = await import('@halcyon-rcm/core');
    const config = getStateConfig(stateCode);

    if (!config) {
      throw new Error(`Unknown state code: ${stateCode}`);
    }

    return {
      isExpansionState: config.isExpansionState,
      incomeThresholds: config.incomeThresholds,
      hasPresumptiveEligibility: config.presumptiveEligibility.hospital,
      retroactiveWindow: config.retroactiveWindow
    };
  }

  /**
   * Save eligibility screening result
   */
  async saveScreeningResult(
    input: EligibilityScreeningInput,
    result: ComprehensiveEligibilityResult,
    userId?: string,
    organizationId?: string
  ): Promise<{ id: string }> {
    const auditLog = await prisma.auditLog.create({
      data: {
        action: 'ELIGIBILITY_SCREENING',
        entityType: 'EligibilityScreening',
        userId,
        details: {
          input,
          result,
          timestamp: new Date().toISOString()
        }
      }
    });

    return { id: auditLog.id };
  }

  // Private helper methods
  private calculateAgeCategory(dateOfBirth: string): 'child' | 'adult' | 'elderly' {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    if (age < 19) return 'child';
    if (age >= 65) return 'elderly';
    return 'adult';
  }

  private determinePatientCategory(input: EligibilityScreeningInput): 'children' | 'pregnant' | 'adults' | 'former_foster_care' | 'parent_caretaker' {
    if (input.isPregnant) return 'pregnant';

    const age = this.calculateAge(input.dateOfBirth);
    if (age < 19) return 'children';

    return 'adults';
  }

  private calculateAge(dateOfBirth: string): number {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    return Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  private generateRecommendation(
    magiResult: any,
    peResult: any,
    retroResult: any,
    medicareResult: any,
    dualResult: any
  ): { primaryPath: string; confidence: number; immediateActions: string[]; documentsNeeded: string[] } {
    const actions: string[] = [];
    const documents: string[] = [];
    let primaryPath = 'Self-Pay';
    let confidence = 50;

    // Determine primary path based on results
    if (dualResult?.isDualEligible) {
      primaryPath = 'Dual Eligible (Medicare/Medicaid)';
      confidence = Math.max(dualResult.confidence, 80);
      actions.push('Coordinate benefits between Medicare and Medicaid');
      actions.push('Bill Medicare as primary');
      documents.push('Medicare card', 'Medicaid card');
    } else if (medicareResult.isCurrentlyEligible) {
      primaryPath = `Medicare (${medicareResult.eligibilityBasis})`;
      confidence = medicareResult.confidence;
      actions.push('Verify Medicare enrollment');
      actions.push('Submit claim to Medicare');
      documents.push('Medicare card', 'Social Security documentation');
    } else if (magiResult.isEligible) {
      if (peResult.isEligible) {
        primaryPath = 'Presumptive Eligibility + Full Medicaid Application';
        confidence = Math.max(peResult.confidence, magiResult.confidence);
        actions.push('Enroll in Hospital Presumptive Eligibility immediately');
        actions.push('Submit full Medicaid application before deadline');
        documents.push('Proof of income', 'State ID', 'Social Security card');
      } else {
        primaryPath = 'Medicaid Application';
        confidence = magiResult.confidence;
        actions.push('Submit Medicaid application');
        if (retroResult.isEligible) {
          actions.push(`Apply for ${retroResult.monthsCovered} months of retroactive coverage`);
        }
        documents.push('Proof of income', 'State ID', 'Social Security card', 'Proof of residency');
      }
    } else if (peResult.isEligible) {
      primaryPath = 'Presumptive Eligibility (Pending Full Determination)';
      confidence = peResult.confidence;
      actions.push('Enroll in Presumptive Eligibility');
      actions.push('Submit full application for determination');
      documents.push('Basic identification', 'Income estimate');
    }

    // Add retroactive coverage actions if applicable
    if (retroResult.isEligible && !actions.some(a => a.includes('retroactive'))) {
      actions.push(`Request retroactive coverage back to ${retroResult.coverageStartDate}`);
    }

    return {
      primaryPath,
      confidence,
      immediateActions: actions,
      documentsNeeded: documents
    };
  }
}

// Export singleton instance
export const eligibilityController = new EligibilityController();
