/**
 * Charge Capture Service
 * Handles charge creation, validation, calculation, and audit
 */

import { prisma } from '../lib/prisma.js';
import {
  getCPTCode,
  getICD10Code,
  getRevenueCode,
  type CPTCode,
  type ICD10Code,
  type RevenueCode,
} from '@halcyon-rcm/core';

// ============================================================================
// Types
// ============================================================================

export interface ChargeInput {
  encounterId: string;
  cptCode: string;
  icdCodes: string[];
  revenueCode?: string;
  units: number;
  modifiers?: string[];
  serviceDate: Date;
  providerId?: string;
  placeOfService?: string;
  notes?: string;
}

export interface ChargeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  medicalNecessity: MedicalNecessityResult;
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  severity: 'warning';
}

export interface MedicalNecessityResult {
  passed: boolean;
  icdCptPairs: IcdCptPairResult[];
  recommendations: string[];
}

export interface IcdCptPairResult {
  icdCode: string;
  cptCode: string;
  isValid: boolean;
  reason?: string;
}

export interface FeeSchedule {
  id: string;
  name: string;
  conversionFactor: number;
  effectiveDate: Date;
  expirationDate?: Date;
  payerType: 'medicare' | 'medicaid' | 'commercial' | 'self_pay';
}

export interface ChargeCalculationResult {
  baseAmount: number;
  adjustedAmount: number;
  modifierAdjustments: ModifierAdjustment[];
  feeScheduleUsed: string;
  conversionFactor: number;
  totalRVU: number;
}

export interface ModifierAdjustment {
  modifier: string;
  adjustmentPercent: number;
  adjustmentAmount: number;
  reason: string;
}

export interface ChargeAuditResult {
  isCompliant: boolean;
  auditFindings: AuditFinding[];
  riskScore: number;
  recommendations: string[];
}

export interface AuditFinding {
  code: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  remediation: string;
}

// ============================================================================
// Modifier Definitions
// ============================================================================

const MODIFIER_ADJUSTMENTS: Record<string, { percent: number; description: string }> = {
  '25': { percent: 0, description: 'Significant, separately identifiable E/M service' },
  '26': { percent: 0, description: 'Professional component' },
  'TC': { percent: 0, description: 'Technical component' },
  '50': { percent: 50, description: 'Bilateral procedure' },
  '51': { percent: -50, description: 'Multiple procedures (50% reduction)' },
  '52': { percent: -20, description: 'Reduced services' },
  '53': { percent: -30, description: 'Discontinued procedure' },
  '59': { percent: 0, description: 'Distinct procedural service' },
  '62': { percent: -37.5, description: 'Two surgeons (each surgeon 62.5%)' },
  '66': { percent: 0, description: 'Surgical team' },
  '76': { percent: 0, description: 'Repeat procedure by same physician' },
  '77': { percent: 0, description: 'Repeat procedure by another physician' },
  '78': { percent: -30, description: 'Unplanned return to OR - related procedure' },
  '79': { percent: 0, description: 'Unrelated procedure during postoperative period' },
  '80': { percent: 16, description: 'Assistant surgeon (16% of fee)' },
  '81': { percent: 10, description: 'Minimum assistant surgeon (10% of fee)' },
  '82': { percent: 16, description: 'Assistant surgeon when qualified resident not available' },
  'AS': { percent: 13.6, description: 'PA/NP/CNS assistant at surgery' },
  'LT': { percent: 0, description: 'Left side' },
  'RT': { percent: 0, description: 'Right side' },
  'GY': { percent: 0, description: 'Item or service statutorily excluded' },
  'GZ': { percent: 0, description: 'Item or service expected to be denied' },
};

// ============================================================================
// Default Fee Schedule (Medicare 2024)
// ============================================================================

const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  id: 'medicare-2024',
  name: 'Medicare Fee Schedule 2024',
  conversionFactor: 33.29,
  effectiveDate: new Date('2024-01-01'),
  payerType: 'medicare',
};

// ============================================================================
// Service Class
// ============================================================================

class ChargeService {
  /**
   * Create a new charge
   */
  async createCharge(input: ChargeInput, userId?: string): Promise<any> {
    // Validate the charge first
    const validation = await this.validateCharge(input);
    if (!validation.isValid) {
      throw new Error(
        `Charge validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Calculate the charge amount
    const calculation = await this.calculateChargeAmount(input.cptCode, input.modifiers);

    // Create the charge in the database
    const charge = await prisma.charge.create({
      data: {
        encounterId: input.encounterId,
        cptCode: input.cptCode,
        icdCodes: input.icdCodes,
        revenueCode: input.revenueCode || this.getDefaultRevenueCode(input.cptCode),
        units: input.units,
        modifiers: input.modifiers || [],
        amount: calculation.adjustedAmount * input.units,
        baseAmount: calculation.baseAmount,
        totalRVU: calculation.totalRVU,
        feeScheduleId: calculation.feeScheduleUsed,
        serviceDate: input.serviceDate,
        providerId: input.providerId,
        placeOfService: input.placeOfService,
        notes: input.notes,
        status: 'PENDING',
        validationResult: validation,
        createdById: userId,
      },
    });

    // Create audit log entry
    await this.createAuditEntry(charge.id, 'CREATE', null, charge, userId);

    return charge;
  }

  /**
   * Validate a charge for coding compliance and medical necessity
   */
  async validateCharge(input: ChargeInput): Promise<ChargeValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate CPT code exists
    const cptCode = getCPTCode(input.cptCode);
    if (!cptCode) {
      errors.push({
        code: 'INVALID_CPT',
        field: 'cptCode',
        message: `Invalid CPT code: ${input.cptCode}`,
        severity: 'error',
      });
    }

    // Validate ICD-10 codes exist
    const validIcdCodes: ICD10Code[] = [];
    for (const icdCodeStr of input.icdCodes) {
      const icdCode = getICD10Code(icdCodeStr);
      if (!icdCode) {
        errors.push({
          code: 'INVALID_ICD10',
          field: 'icdCodes',
          message: `Invalid ICD-10 code: ${icdCodeStr}`,
          severity: 'error',
        });
      } else {
        validIcdCodes.push(icdCode);
      }
    }

    // Validate at least one ICD-10 code is provided
    if (input.icdCodes.length === 0) {
      errors.push({
        code: 'MISSING_DIAGNOSIS',
        field: 'icdCodes',
        message: 'At least one ICD-10 diagnosis code is required',
        severity: 'error',
      });
    }

    // Validate revenue code if provided
    if (input.revenueCode) {
      const revCode = getRevenueCode(input.revenueCode);
      if (!revCode) {
        errors.push({
          code: 'INVALID_REVENUE_CODE',
          field: 'revenueCode',
          message: `Invalid revenue code: ${input.revenueCode}`,
          severity: 'error',
        });
      } else if (revCode.requiresCPT && !cptCode) {
        warnings.push({
          code: 'REVENUE_REQUIRES_CPT',
          field: 'revenueCode',
          message: `Revenue code ${input.revenueCode} typically requires a valid CPT code`,
          severity: 'warning',
        });
      }
    }

    // Validate units
    if (input.units < 1) {
      errors.push({
        code: 'INVALID_UNITS',
        field: 'units',
        message: 'Units must be at least 1',
        severity: 'error',
      });
    }

    // Validate modifiers
    if (input.modifiers) {
      for (const modifier of input.modifiers) {
        if (!this.isValidModifier(modifier)) {
          warnings.push({
            code: 'UNKNOWN_MODIFIER',
            field: 'modifiers',
            message: `Unknown modifier: ${modifier}. Verify this is correct.`,
            severity: 'warning',
          });
        }
      }

      // Check for conflicting modifiers
      const conflicts = this.checkModifierConflicts(input.modifiers);
      for (const conflict of conflicts) {
        errors.push({
          code: 'CONFLICTING_MODIFIERS',
          field: 'modifiers',
          message: conflict,
          severity: 'error',
        });
      }
    }

    // Medical necessity validation
    const medicalNecessity = this.validateMedicalNecessity(
      input.cptCode,
      input.icdCodes,
      cptCode,
      validIcdCodes
    );

    if (!medicalNecessity.passed) {
      warnings.push({
        code: 'MEDICAL_NECESSITY_WARNING',
        field: 'icdCodes',
        message: 'Medical necessity may not be established. Review diagnosis-procedure relationship.',
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      medicalNecessity,
    };
  }

  /**
   * Calculate charge amount based on fee schedule
   */
  async calculateChargeAmount(
    cptCode: string,
    modifiers?: string[],
    feeSchedule?: FeeSchedule
  ): Promise<ChargeCalculationResult> {
    const schedule = feeSchedule || DEFAULT_FEE_SCHEDULE;
    const cpt = getCPTCode(cptCode);

    if (!cpt) {
      throw new Error(`Invalid CPT code: ${cptCode}`);
    }

    // Calculate base amount from RVU
    const baseAmount = Math.round(cpt.totalRVU * schedule.conversionFactor * 100) / 100;

    // Apply modifier adjustments
    const modifierAdjustments: ModifierAdjustment[] = [];
    let adjustmentFactor = 1.0;

    if (modifiers) {
      for (const modifier of modifiers) {
        const adjustment = MODIFIER_ADJUSTMENTS[modifier.toUpperCase()];
        if (adjustment) {
          const adjustmentPercent = adjustment.percent;
          const adjustmentAmount = (baseAmount * adjustmentPercent) / 100;

          modifierAdjustments.push({
            modifier,
            adjustmentPercent,
            adjustmentAmount,
            reason: adjustment.description,
          });

          // Apply the adjustment (only for payment-affecting modifiers)
          if (adjustmentPercent !== 0) {
            adjustmentFactor += adjustmentPercent / 100;
          }
        }
      }
    }

    const adjustedAmount = Math.round(baseAmount * adjustmentFactor * 100) / 100;

    return {
      baseAmount,
      adjustedAmount,
      modifierAdjustments,
      feeScheduleUsed: schedule.id,
      conversionFactor: schedule.conversionFactor,
      totalRVU: cpt.totalRVU,
    };
  }

  /**
   * Audit a charge for compliance issues
   */
  async auditCharge(chargeId: string): Promise<ChargeAuditResult> {
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: { encounter: true },
    });

    if (!charge) {
      throw new Error(`Charge not found: ${chargeId}`);
    }

    const findings: AuditFinding[] = [];
    let riskScore = 0;

    // Check for unbundling
    const unbundlingIssues = await this.checkUnbundling(charge);
    findings.push(...unbundlingIssues);
    riskScore += unbundlingIssues.length * 10;

    // Check for upcoding indicators
    const upcodingIssues = this.checkUpcoding(charge);
    findings.push(...upcodingIssues);
    riskScore += upcodingIssues.filter(f => f.severity === 'high').length * 20;
    riskScore += upcodingIssues.filter(f => f.severity === 'medium').length * 10;

    // Check modifier usage
    const modifierIssues = this.checkModifierCompliance(charge);
    findings.push(...modifierIssues);
    riskScore += modifierIssues.length * 5;

    // Check for duplicate charges
    const duplicateIssues = await this.checkDuplicates(charge);
    findings.push(...duplicateIssues);
    riskScore += duplicateIssues.length * 15;

    // Generate recommendations
    const recommendations = this.generateAuditRecommendations(findings);

    return {
      isCompliant: findings.filter(f => f.severity === 'high').length === 0,
      auditFindings: findings,
      riskScore: Math.min(riskScore, 100),
      recommendations,
    };
  }

  /**
   * Get charge by ID
   */
  async getCharge(chargeId: string): Promise<any> {
    return prisma.charge.findUnique({
      where: { id: chargeId },
      include: {
        encounter: true,
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get charges by encounter
   */
  async getChargesByEncounter(encounterId: string): Promise<any[]> {
    return prisma.charge.findMany({
      where: { encounterId },
      orderBy: { serviceDate: 'asc' },
    });
  }

  /**
   * Update a charge
   */
  async updateCharge(chargeId: string, updates: Partial<ChargeInput>, userId?: string): Promise<any> {
    const existingCharge = await prisma.charge.findUnique({ where: { id: chargeId } });
    if (!existingCharge) {
      throw new Error(`Charge not found: ${chargeId}`);
    }

    // If code-related fields are being updated, re-validate
    if (updates.cptCode || updates.icdCodes || updates.modifiers) {
      const validationInput: ChargeInput = {
        encounterId: existingCharge.encounterId,
        cptCode: updates.cptCode || existingCharge.cptCode,
        icdCodes: updates.icdCodes || existingCharge.icdCodes,
        units: updates.units || existingCharge.units,
        modifiers: updates.modifiers || existingCharge.modifiers as string[],
        serviceDate: updates.serviceDate || existingCharge.serviceDate,
      };

      const validation = await this.validateCharge(validationInput);
      if (!validation.isValid) {
        throw new Error(
          `Charge validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      // Recalculate amount if code changed
      if (updates.cptCode || updates.modifiers) {
        const calculation = await this.calculateChargeAmount(
          updates.cptCode || existingCharge.cptCode,
          updates.modifiers || existingCharge.modifiers as string[]
        );
        (updates as any).amount = calculation.adjustedAmount * (updates.units || existingCharge.units);
        (updates as any).baseAmount = calculation.baseAmount;
        (updates as any).totalRVU = calculation.totalRVU;
      }
    }

    const updatedCharge = await prisma.charge.update({
      where: { id: chargeId },
      data: updates as any,
    });

    // Create audit log entry
    await this.createAuditEntry(chargeId, 'UPDATE', existingCharge, updatedCharge, userId);

    return updatedCharge;
  }

  /**
   * Delete a charge
   */
  async deleteCharge(chargeId: string, userId?: string): Promise<void> {
    const existingCharge = await prisma.charge.findUnique({ where: { id: chargeId } });
    if (!existingCharge) {
      throw new Error(`Charge not found: ${chargeId}`);
    }

    // Soft delete by updating status
    await prisma.charge.update({
      where: { id: chargeId },
      data: { status: 'DELETED' },
    });

    // Create audit log entry
    await this.createAuditEntry(chargeId, 'DELETE', existingCharge, null, userId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private isValidModifier(modifier: string): boolean {
    return MODIFIER_ADJUSTMENTS.hasOwnProperty(modifier.toUpperCase()) ||
      /^[0-9A-Z]{2}$/i.test(modifier);
  }

  private checkModifierConflicts(modifiers: string[]): string[] {
    const conflicts: string[] = [];
    const modifierSet = new Set(modifiers.map(m => m.toUpperCase()));

    // Check for LT/RT conflicts
    if (modifierSet.has('LT') && modifierSet.has('RT')) {
      // This could be valid for bilateral procedures, but check for 50
      if (!modifierSet.has('50')) {
        conflicts.push('LT and RT modifiers together without bilateral modifier 50');
      }
    }

    // Check for 26/TC conflicts
    if (modifierSet.has('26') && modifierSet.has('TC')) {
      conflicts.push('26 (professional) and TC (technical) cannot be used together');
    }

    // Check for multiple reduction modifiers
    const reductionModifiers = ['51', '52', '53'].filter(m => modifierSet.has(m));
    if (reductionModifiers.length > 1) {
      conflicts.push(`Multiple reduction modifiers: ${reductionModifiers.join(', ')}`);
    }

    return conflicts;
  }

  private validateMedicalNecessity(
    cptCodeStr: string,
    icdCodeStrs: string[],
    cptCode: CPTCode | undefined,
    icdCodes: ICD10Code[]
  ): MedicalNecessityResult {
    const pairs: IcdCptPairResult[] = [];
    let allValid = true;

    // Basic category matching for medical necessity
    for (const icdCode of icdCodes) {
      const pairResult: IcdCptPairResult = {
        icdCode: icdCode.code,
        cptCode: cptCodeStr,
        isValid: true,
      };

      // Check if diagnosis can support the procedure (simplified logic)
      // In production, this would use LCD/NCD databases
      if (cptCode) {
        // E/M codes generally pair with most diagnoses
        if (cptCode.category === 'evaluation_management') {
          pairResult.isValid = true;
        }
        // Lab codes need clinical indication
        else if (cptCode.category === 'pathology_lab') {
          if (icdCode.severity === 'mild' && icdCode.category === 'symptoms_signs') {
            pairResult.isValid = true;
            pairResult.reason = 'Symptom codes support diagnostic testing';
          }
        }
        // Surgery codes need specific diagnoses
        else if (cptCode.category === 'surgery') {
          if (icdCode.isPrincipalDiagnosis) {
            pairResult.isValid = true;
          } else {
            pairResult.isValid = false;
            pairResult.reason = 'Secondary diagnosis may not support surgical procedure';
            allValid = false;
          }
        }
      }

      pairs.push(pairResult);
    }

    const recommendations: string[] = [];
    if (!allValid) {
      recommendations.push('Consider adding a more specific principal diagnosis');
      recommendations.push('Review LCD/NCD requirements for this procedure');
    }

    return {
      passed: allValid || pairs.some(p => p.isValid),
      icdCptPairs: pairs,
      recommendations,
    };
  }

  private async checkUnbundling(charge: any): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Get other charges for the same encounter on the same date
    const relatedCharges = await prisma.charge.findMany({
      where: {
        encounterId: charge.encounterId,
        serviceDate: charge.serviceDate,
        id: { not: charge.id },
        status: { not: 'DELETED' },
      },
    });

    // Check for common unbundling patterns
    const cpt = getCPTCode(charge.cptCode);
    if (!cpt) return findings;

    for (const relatedCharge of relatedCharges) {
      // Check for E/M with procedure without modifier 25
      if (cpt.category === 'evaluation_management') {
        const relatedCpt = getCPTCode(relatedCharge.cptCode);
        if (relatedCpt && relatedCpt.category === 'surgery') {
          if (!charge.modifiers?.includes('25')) {
            findings.push({
              code: 'UNBUNDLE_EM_PROCEDURE',
              severity: 'medium',
              category: 'unbundling',
              description: `E/M code ${charge.cptCode} billed with procedure ${relatedCharge.cptCode} without modifier 25`,
              remediation: 'Add modifier 25 to E/M if service was significant and separately identifiable',
            });
          }
        }
      }
    }

    return findings;
  }

  private checkUpcoding(charge: any): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const cpt = getCPTCode(charge.cptCode);
    if (!cpt) return findings;

    // Check E/M level against diagnosis severity
    if (cpt.category === 'evaluation_management') {
      const highLevelEM = ['99205', '99215', '99223', '99233', '99285', '99291'];
      if (highLevelEM.includes(charge.cptCode)) {
        const icdCodes = (charge.icdCodes as string[]).map(c => getICD10Code(c)).filter(Boolean);
        const hasSevereDiagnosis = icdCodes.some(icd => icd?.severity === 'severe' || icd?.mccWeight);

        if (!hasSevereDiagnosis) {
          findings.push({
            code: 'POTENTIAL_UPCODING',
            severity: 'high',
            category: 'upcoding',
            description: `High-level E/M code ${charge.cptCode} without corresponding high-severity diagnosis`,
            remediation: 'Review documentation to ensure MDM supports this level of service',
          });
        }
      }
    }

    return findings;
  }

  private checkModifierCompliance(charge: any): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const modifiers = charge.modifiers as string[] || [];

    // Check for excessive modifier usage
    if (modifiers.length > 4) {
      findings.push({
        code: 'EXCESSIVE_MODIFIERS',
        severity: 'low',
        category: 'modifiers',
        description: `${modifiers.length} modifiers on a single charge line may indicate documentation issues`,
        remediation: 'Review if all modifiers are necessary and properly documented',
      });
    }

    return findings;
  }

  private async checkDuplicates(charge: any): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Check for exact duplicates
    const duplicates = await prisma.charge.findMany({
      where: {
        encounterId: charge.encounterId,
        cptCode: charge.cptCode,
        serviceDate: charge.serviceDate,
        id: { not: charge.id },
        status: { not: 'DELETED' },
      },
    });

    if (duplicates.length > 0) {
      findings.push({
        code: 'DUPLICATE_CHARGE',
        severity: 'high',
        category: 'duplicate',
        description: `Potential duplicate charge: ${duplicates.length} other charge(s) with same CPT code on same date`,
        remediation: 'Review charges and remove duplicates or add appropriate modifiers (76, 77)',
      });
    }

    return findings;
  }

  private generateAuditRecommendations(findings: AuditFinding[]): string[] {
    const recommendations: string[] = [];

    if (findings.some(f => f.category === 'unbundling')) {
      recommendations.push('Review NCCI edits for proper bundling/unbundling');
    }
    if (findings.some(f => f.category === 'upcoding')) {
      recommendations.push('Ensure documentation supports the level of service billed');
    }
    if (findings.some(f => f.category === 'duplicate')) {
      recommendations.push('Implement charge capture review process to catch duplicates');
    }
    if (findings.some(f => f.category === 'modifiers')) {
      recommendations.push('Provide modifier training to coding staff');
    }

    return recommendations;
  }

  private getDefaultRevenueCode(cptCode: string): string {
    const cpt = getCPTCode(cptCode);
    if (!cpt) return '0999';

    // Map CPT categories to default revenue codes
    const categoryToRevenue: Record<string, string> = {
      'evaluation_management': '0510',
      'anesthesia': '0370',
      'surgery': '0360',
      'radiology': '0320',
      'pathology_lab': '0300',
      'medicine': '0500',
    };

    return categoryToRevenue[cpt.category] || '0999';
  }

  private async createAuditEntry(
    chargeId: string,
    action: string,
    oldValue: any,
    newValue: any,
    userId?: string
  ): Promise<void> {
    await prisma.chargeAudit.create({
      data: {
        chargeId,
        action,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        userId,
      },
    });
  }
}

export const chargeService = new ChargeService();
