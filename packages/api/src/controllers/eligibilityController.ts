// @ts-nocheck
/**
 * Eligibility Controller
 * Business logic for Medicaid/Medicare/SSI eligibility determination
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
import { getMugetsuClientSafe, isMugetsuConfigured } from '../integrations/mugetsu/index.js';
import type { MugetsuAssessmentInput, MugetsuAssessmentResult } from '../integrations/mugetsu/index.js';

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

  // Patient contact & demographic details
  ssn?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phoneNumber?: string;
  email?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated';
  minorDependents?: Array<{
    age: number;
    relationshipStatus: 'biological_child' | 'step_child' | 'adopted' | 'foster_child' | 'legal_guardian' | 'other';
    sameHousehold: boolean;
    medicaidEligible: 'yes' | 'no' | 'unknown';
    snapEligible: 'yes' | 'no' | 'unknown';
  }>;

  // SSI Eligibility fields (for Mugetsu integration)
  includeSSI?: boolean;
  medicalConditions?: string[];
  functionalLimitations?: string[];
  medications?: string[];
  disabilitySeverity?: 'mild' | 'moderate' | 'severe' | 'disabling';
  hospitalizations?: number;
  education?: string;
  workHistory?: Array<{
    jobTitle: string;
    employer?: string;
    startDate?: string;
    endDate?: string;
  }>;
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

  // SSI Eligibility Analysis (from Mugetsu)
  ssi?: {
    score: number;
    recommendation: string;
    viabilityRating: string;
    keyFactors: string[];
    ssaWaterfallRates?: {
      initial: { baseRate: number; adjustedRate: number };
      reconsideration: { baseRate: number; adjustedRate: number };
      aljHearing: { baseRate: number; adjustedRate: number };
      cumulative: number;
    };
    strategicTiming?: {
      recommendation: string;
      nextCategoryAge?: number;
      daysUntilNextCategory?: number;
    };
    confidence: number;
    isFallback?: boolean;
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
    // Sum all income sources to get gross income
    const grossIncome = annualIncome || (
      (input.wages || 0) +
      (input.selfEmployment || 0) +
      (input.socialSecurity || 0) +
      (input.unemployment || 0) +
      (input.pension || 0) +
      (input.investment || 0) +
      (input.alimony || 0)
    );

    const magiInput: MAGICalculatorInput = {
      income: {
        grossIncome: grossIncome,
        // These are excluded from MAGI (non-taxable income)
        childSupportReceived: 0,
        ssiBenefits: 0,
        workersCompensation: 0,
        veteransBenefits: 0,
        otherExcludedIncome: 0
      },
      household: {
        householdSize: input.householdSize,
        stateCode: input.stateOfResidence,
        applicantCategory: this.determineMAGICategory(input)
      }
    };

    const magiResult = calculateMAGI(magiInput);

    // Evaluate presumptive eligibility
    const monthlyIncome = input.incomeFrequency === 'monthly'
      ? input.householdIncome
      : input.householdIncome / 12;

    const peInput: PresumptiveEligibilityInput = {
      isQualifiedHPEEntity: true, // Assume hospital is qualified HPE entity
      patientCategory: this.determinePatientCategory(input),
      grossMonthlyIncome: monthlyIncome,
      householdSize: input.householdSize,
      stateOfResidence: input.stateOfResidence,
      applicationDate: input.applicationDate ? new Date(input.applicationDate) : new Date()
    };

    const peResult = evaluatePresumptiveEligibility(peInput);

    // Calculate retroactive coverage
    const retroInput: RetroactiveCoverageInput = {
      stateOfResidence: input.stateOfResidence,
      dateOfService: new Date(input.dateOfService || new Date().toISOString().split('T')[0]),
      applicationDate: new Date(input.applicationDate || new Date().toISOString().split('T')[0]),
      wasEligibleOnDOS: magiResult.isEligible,
      encounterType: 'outpatient',
      totalCharges: 0
    };

    const retroResult = calculateRetroactiveCoverage(retroInput);

    // Evaluate Medicare eligibility
    const medicareInput: MedicareAgeInput = {
      dateOfBirth: new Date(input.dateOfBirth),
      dateOfService: new Date(input.dateOfService || new Date().toISOString().split('T')[0]),
      hasESRD: input.hasEndStageRenalDisease || false,
      hasALS: input.hasALS || false,
      ssdiStatus: input.isReceivingSSDI ? 'receiving' : 'none',
      ssdiEffectiveDate: input.ssdiStartDate ? new Date(input.ssdiStartDate) : undefined
    };

    const medicareResult = evaluateMedicareAgeEligibility(medicareInput);

    // Evaluate dual eligible status if both programs apply
    let dualResult = undefined;
    if ((input.hasMedicare || medicareResult.isEligible) &&
        (input.hasMedicaid || magiResult.isEligible)) {
      const dualInput: DualEligibleInput = {
        dateOfBirth: new Date(input.dateOfBirth),
        dateOfService: new Date(input.dateOfService || new Date().toISOString().split('T')[0]),
        medicarePartA: input.medicarePartA || medicareResult.isEligible ? 'enrolled' : 'not_enrolled',
        medicarePartB: input.medicarePartB ? 'enrolled' : 'not_enrolled',
        medicarePartD: 'not_enrolled',
        hasMedicareAdvantage: false,
        medicaidStatus: input.medicaidStatus === 'active' ? 'active' : (input.medicaidStatus === 'pending' ? 'pending' : 'inactive'),
        medicaidState: input.stateOfResidence,
        hasDSNP: false,
        hasPACE: false,
        hasLIS: false,
        monthlyIncome: input.incomeFrequency === 'monthly' ? input.householdIncome : input.householdIncome / 12
      };

      const dualEvalResult = evaluateDualEligible(dualInput);
      dualResult = {
        isDualEligible: dualEvalResult.isDualEligible,
        category: dualEvalResult.dualCategory,
        billingInstructions: dualEvalResult.billingInstructions?.map(b => b.instruction) || [],
        confidence: 85 // DualEligibleResult doesn't have confidence, use a reasonable default
      };
    }

    // SSI Eligibility assessment (if requested and patient is disabled)
    let ssiResult = undefined;
    if (input.includeSSI && (input.isDisabled || input.medicalConditions?.length > 0)) {
      ssiResult = await this.assessSSIEligibility(input);
    }

    // Determine primary path and recommendation
    const recommendation = this.generateRecommendation(
      magiResult,
      peResult,
      retroResult,
      medicareResult,
      dualResult,
      ssiResult
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
        isEligible: peResult.canGrantPE,
        programsAvailable: peResult.requiredActions || [],
        coverageEndDate: peResult.temporaryCoverageEnd?.toISOString().split('T')[0],
        applicationDeadline: peResult.fullApplicationDeadline?.toISOString().split('T')[0],
        confidence: peResult.confidence
      },
      retroactive: {
        isEligible: retroResult.isWithinWindow,
        coverageStartDate: retroResult.coverageStartDate?.toISOString().split('T')[0],
        monthsCovered: Math.ceil(retroResult.daysBetweenDOSAndApplication / 30),
        hasWaiverRestriction: retroResult.stateHasWaiver,
        confidence: retroResult.recoveryConfidence
      },
      medicare: {
        isEligible: medicareResult.isEligible,
        eligibilityBasis: medicareResult.eligibilityReason,
        eligibilityDate: medicareResult.effectiveDate?.toISOString().split('T')[0],
        confidence: medicareResult.confidence
      },
      dualEligible: dualResult,
      ssi: ssiResult,
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
    // Convert monthly income to annual for MAGI calculation
    const annualIncome = monthlyIncome * 12;
    // quickMAGICheck signature: (grossIncome, householdSize, stateCode)
    const result = quickMAGICheck(annualIncome, householdSize, stateCode);
    return {
      isLikelyEligible: result.eligible,
      fplPercentage: result.fplPercentage,
      threshold: result.threshold
    };
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

  private determinePatientCategory(input: EligibilityScreeningInput): 'child' | 'pregnant' | 'adult' | 'formerFosterCare' | 'parentCaretaker' {
    if (input.isPregnant) return 'pregnant';

    const age = this.calculateAge(input.dateOfBirth);
    if (age < 19) return 'child';

    return 'adult';
  }

  private determineMAGICategory(input: EligibilityScreeningInput): 'adult' | 'parent_caretaker' | 'pregnant_woman' | 'child' | 'former_foster_youth' {
    if (input.isPregnant) return 'pregnant_woman';

    const age = this.calculateAge(input.dateOfBirth);
    if (age < 19) return 'child';
    if (age < 26) return 'former_foster_youth'; // Could be former foster youth - default assumption for young adults

    return 'adult';
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
    dualResult: any,
    ssiResult?: any
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
    } else if (medicareResult.isEligible) {
      primaryPath = `Medicare (${medicareResult.eligibilityReason})`;
      confidence = medicareResult.confidence;
      actions.push('Verify Medicare enrollment');
      actions.push('Submit claim to Medicare');
      documents.push('Medicare card', 'Social Security documentation');
    } else if (magiResult.isEligible) {
      if (peResult.canGrantPE) {
        primaryPath = 'Presumptive Eligibility + Full Medicaid Application';
        confidence = Math.max(peResult.confidence, magiResult.confidence);
        actions.push('Enroll in Hospital Presumptive Eligibility immediately');
        actions.push('Submit full Medicaid application before deadline');
        documents.push('Proof of income', 'State ID', 'Social Security card');
      } else {
        primaryPath = 'Medicaid Application';
        confidence = magiResult.confidence;
        actions.push('Submit Medicaid application');
        if (retroResult.isWithinWindow) {
          const monthsCovered = Math.ceil(retroResult.daysBetweenDOSAndApplication / 30);
          actions.push(`Apply for ${monthsCovered} months of retroactive coverage`);
        }
        documents.push('Proof of income', 'State ID', 'Social Security card', 'Proof of residency');
      }
    } else if (peResult.canGrantPE) {
      primaryPath = 'Presumptive Eligibility (Pending Full Determination)';
      confidence = peResult.confidence;
      actions.push('Enroll in Presumptive Eligibility');
      actions.push('Submit full application for determination');
      documents.push('Basic identification', 'Income estimate');
    }

    // Add SSI pathway if strong candidate
    if (ssiResult && ssiResult.score >= 50) {
      if (primaryPath === 'Self-Pay') {
        primaryPath = `SSI Application (${ssiResult.viabilityRating} Viability)`;
        confidence = ssiResult.confidence;
      } else {
        primaryPath = `${primaryPath} + SSI Application`;
      }
      actions.push(`Consider SSI application - ${ssiResult.recommendation}`);
      if (ssiResult.strategicTiming?.recommendation) {
        actions.push(`Strategic timing: ${ssiResult.strategicTiming.recommendation}`);
      }
      documents.push('Medical records', 'Disability documentation', 'Work history');
    } else if (ssiResult && ssiResult.score >= 30) {
      actions.push('Evaluate SSI eligibility after gathering more medical evidence');
    }

    // Add retroactive coverage actions if applicable
    if (retroResult.isWithinWindow && !actions.some(a => a.includes('retroactive'))) {
      actions.push(`Request retroactive coverage back to ${retroResult.coverageStartDate?.toISOString().split('T')[0]}`);
    }

    return {
      primaryPath,
      confidence,
      immediateActions: actions,
      documentsNeeded: documents
    };
  }

  /**
   * Assess SSI eligibility using Mugetsu engine
   */
  private async assessSSIEligibility(input: EligibilityScreeningInput): Promise<ComprehensiveEligibilityResult['ssi'] | undefined> {
    try {
      const client = getMugetsuClientSafe();

      // Calculate age
      const age = this.calculateAge(input.dateOfBirth);

      // Build Mugetsu input
      const mugetsuInput: MugetsuAssessmentInput = {
        medicalConditions: input.medicalConditions || [],
        age,
        education: input.education || 'High School',
        workHistory: (input.workHistory || []).map(w => ({
          jobTitle: w.jobTitle,
          employer: w.employer,
          startDate: w.startDate,
          endDate: w.endDate,
        })),
        functionalLimitations: input.functionalLimitations || [],
        severity: input.disabilitySeverity || 'moderate',
        hospitalizations: input.hospitalizations || 0,
        medications: input.medications || [],
        stateOfResidence: input.stateOfResidence,
        dateOfBirth: input.dateOfBirth,
      };

      // Try Mugetsu if available
      if (client && await client.healthCheck()) {
        const result = await client.assessDisability(mugetsuInput);
        return {
          score: result.score,
          recommendation: result.recommendation,
          viabilityRating: result.viabilityRating,
          keyFactors: result.keyFactors,
          ssaWaterfallRates: result.ssaWaterfallRates ? {
            initial: {
              baseRate: result.ssaWaterfallRates.initial.baseRate,
              adjustedRate: result.ssaWaterfallRates.initial.adjustedRate,
            },
            reconsideration: {
              baseRate: result.ssaWaterfallRates.reconsideration.baseRate,
              adjustedRate: result.ssaWaterfallRates.reconsideration.adjustedRate,
            },
            aljHearing: {
              baseRate: result.ssaWaterfallRates.aljHearing.baseRate,
              adjustedRate: result.ssaWaterfallRates.aljHearing.adjustedRate,
            },
            cumulative: result.ssaWaterfallRates.cumulative,
          } : undefined,
          strategicTiming: result.ageProgressionAnalysis?.strategicTiming ? {
            recommendation: result.ageProgressionAnalysis.strategicTiming.recommendation,
            nextCategoryAge: result.ageProgressionAnalysis.nextCategoryAge,
            daysUntilNextCategory: result.ageProgressionAnalysis.daysUntilNextCategory,
          } : undefined,
          confidence: result.score >= 70 ? 85 : result.score >= 50 ? 70 : 55,
        };
      }

      // Fallback scoring
      return this.calculateFallbackSSIScore(mugetsuInput);
    } catch (error) {
      console.warn('[EligibilityController] SSI assessment failed:', error);
      return undefined;
    }
  }

  /**
   * Calculate fallback SSI score when Mugetsu is unavailable
   */
  private calculateFallbackSSIScore(input: MugetsuAssessmentInput): ComprehensiveEligibilityResult['ssi'] {
    let score = 30;
    const keyFactors: string[] = [];

    // Age factor
    if (input.age >= 55) {
      score += 20;
      keyFactors.push('Age 55+ provides Grid Rule advantage');
    } else if (input.age >= 50) {
      score += 10;
      keyFactors.push('Age 50-54 provides some Grid Rule benefit');
    }

    // Severity
    if (input.severity === 'disabling') {
      score += 25;
      keyFactors.push('Disabling severity documented');
    } else if (input.severity === 'severe') {
      score += 15;
      keyFactors.push('Severe impairment documented');
    }

    // Conditions
    if (input.medicalConditions.length >= 3) {
      score += 10;
      keyFactors.push('Multiple conditions support combined effects');
    }

    // Limitations
    if (input.functionalLimitations.length >= 4) {
      score += 10;
      keyFactors.push('Multiple functional limitations documented');
    }

    score = Math.min(95, Math.max(5, score));

    const viabilityRating = score >= 70 ? 'High' : score >= 50 ? 'Moderate' : score >= 30 ? 'Low' : 'Very Low';
    const recommendation = score >= 70 ? 'Highly Recommended' : score >= 50 ? 'Recommended' : score >= 30 ? 'Consider with Caution' : 'Not Recommended';

    return {
      score,
      recommendation,
      viabilityRating,
      keyFactors,
      confidence: 50,
      isFallback: true,
    };
  }
}

// Export singleton instance
export const eligibilityController = new EligibilityController();
