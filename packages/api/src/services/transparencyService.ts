/**
 * Price Transparency Service
 *
 * Business logic for CMS price transparency compliance including:
 * - Patient price estimates
 * - Good Faith Estimates (No Surprises Act)
 * - Machine Readable File management
 * - Estimate accuracy tracking
 */

import { prisma } from '../lib/prisma.js';
import {
  estimatePrice,
  applyBenefits,
  calculateOutOfPocket,
  comparePayerPrices,
  estimateBundledPackage,
  getShoppableServices,
  getShoppableService,
  searchShoppableServices,
  getServicePackages,
  generateMachineReadableFile,
  validateMRFCompliance,
  mrfToJSON,
  type ServiceItem,
  type PatientInfo,
  type BenefitsInfo,
  type Accumulators,
  type EstimateResult,
  type ShoppableService,
  type ServicePackage,
  type HospitalConfig,
  type ChargemasterEntry,
  type MachineReadableFile,
  type MRFValidationResult,
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

/** Request to create a price estimate */
export interface CreateEstimateRequest {
  /** Patient ID (optional) */
  patientId?: string;
  /** Services to estimate */
  services: {
    cptCode: string;
    description?: string;
    modifiers?: string[];
    units: number;
    dateOfService?: string;
  }[];
  /** Payer ID */
  payerId?: string;
  /** Patient information */
  patientInfo?: {
    memberId?: string;
    groupNumber?: string;
    deductibleMet?: boolean;
    accumulatedDeductible?: number;
    outOfPocketMaxMet?: boolean;
    accumulatedOutOfPocket?: number;
  };
  /** Insurance benefits */
  benefits?: {
    planName?: string;
    deductible: number;
    outOfPocketMax: number;
    coinsurance: number;
    copay?: number;
    isInNetwork?: boolean;
  };
  /** Organization ID */
  organizationId?: string;
}

/** Good Faith Estimate request */
export interface GoodFaithEstimateRequest {
  /** Patient ID */
  patientId: string;
  /** Scheduled services */
  services: {
    cptCode: string;
    description?: string;
    scheduledDate: string;
    providerId?: string;
    facilityId?: string;
  }[];
  /** Primary diagnosis */
  diagnosisCode?: string;
  /** Requesting provider */
  requestingProviderId?: string;
  /** Organization ID */
  organizationId: string;
}

/** Good Faith Estimate response */
export interface GoodFaithEstimate {
  /** GFE identifier */
  gfeId: string;
  /** Patient ID */
  patientId: string;
  /** Date issued */
  issuedDate: Date;
  /** Valid until */
  validUntil: Date;
  /** Total estimated cost */
  totalEstimate: number;
  /** Service details */
  services: {
    cptCode: string;
    description: string;
    scheduledDate: string;
    providerName?: string;
    facilityName?: string;
    estimatedCost: number;
  }[];
  /** Disclaimer */
  disclaimer: string;
  /** Patient rights notice */
  patientRightsNotice: string;
}

/** Estimate history entry */
export interface EstimateHistoryEntry {
  id: string;
  patientId: string | null;
  payerId: string | null;
  grossCharges: number;
  expectedAllowed: number;
  patientResponsibility: number;
  services: any;
  createdAt: Date;
}

/** Estimate accuracy result */
export interface EstimateAccuracyResult {
  estimateId: string;
  claimId: string;
  estimatedPatientCost: number;
  actualPatientCost: number;
  variance: number;
  variancePercent: number;
  isWithinThreshold: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** GFE validity period in days (per No Surprises Act) */
const GFE_VALIDITY_DAYS = 90;

/** Standard GFE disclaimer */
const GFE_DISCLAIMER = `This Good Faith Estimate shows the costs of items and services that are reasonably expected for your health care needs for an item or service. The estimate is based on information known at the time the estimate was created. The Good Faith Estimate does not include any unknown or unexpected costs that may arise during treatment. You could be charged more if complications or special circumstances occur.`;

/** Patient rights notice for GFE */
const PATIENT_RIGHTS_NOTICE = `If you are billed for more than this Good Faith Estimate, you have the right to dispute the bill. You may contact the health care provider or facility listed to let them know the billed charges are higher than the Good Faith Estimate. You can ask them to update the bill to match the Good Faith Estimate, ask to negotiate the bill, or ask if there is financial assistance available. You may also start a dispute resolution process with the U.S. Department of Health and Human Services (HHS). If you choose to use the dispute resolution process, you must start the dispute process within 120 calendar days of the date on the original bill.`;

// ============================================================================
// ESTIMATE FUNCTIONS
// ============================================================================

/**
 * Create a price estimate for services
 */
export async function createEstimate(
  request: CreateEstimateRequest
): Promise<EstimateResult & { id: string }> {
  // Convert request to ServiceItem array
  const services: ServiceItem[] = request.services.map((s) => ({
    cptCode: s.cptCode,
    description: s.description,
    modifiers: s.modifiers,
    units: s.units,
    dateOfService: s.dateOfService ? new Date(s.dateOfService) : undefined,
  }));

  // Create patient info if provided
  const patientInfo: PatientInfo | undefined = request.patientInfo
    ? {
        patientId: request.patientId,
        memberId: request.patientInfo.memberId,
        groupNumber: request.patientInfo.groupNumber,
        deductibleMet: request.patientInfo.deductibleMet,
        accumulatedDeductible: request.patientInfo.accumulatedDeductible,
        outOfPocketMaxMet: request.patientInfo.outOfPocketMaxMet,
        accumulatedOutOfPocket: request.patientInfo.accumulatedOutOfPocket,
      }
    : undefined;

  // Generate base estimate
  let estimate = estimatePrice(services, request.payerId, patientInfo);

  // Apply benefits if provided
  if (request.benefits) {
    const benefits: BenefitsInfo = {
      planName: request.benefits.planName,
      deductible: request.benefits.deductible,
      outOfPocketMax: request.benefits.outOfPocketMax,
      coinsurance: request.benefits.coinsurance,
      copay: request.benefits.copay,
      isInNetwork: request.benefits.isInNetwork,
    };
    estimate = applyBenefits(estimate, benefits);

    // Apply accumulators if available
    if (
      request.patientInfo?.accumulatedDeductible !== undefined ||
      request.patientInfo?.accumulatedOutOfPocket !== undefined
    ) {
      const accumulators: Accumulators = {
        deductiblePaid: request.patientInfo.accumulatedDeductible || 0,
        outOfPocketPaid: request.patientInfo.accumulatedOutOfPocket || 0,
        deductibleRemaining:
          request.benefits.deductible -
          (request.patientInfo.accumulatedDeductible || 0),
        outOfPocketRemaining:
          request.benefits.outOfPocketMax -
          (request.patientInfo.accumulatedOutOfPocket || 0),
      };
      estimate = calculateOutOfPocket(estimate, accumulators);
    }
  }

  // Save to database
  const savedEstimate = await prisma.priceEstimate.create({
    data: {
      patientId: request.patientId,
      payerId: request.payerId,
      grossCharges: estimate.grossCharges,
      expectedAllowed: estimate.expectedAllowed,
      patientResponsibility: estimate.patientResponsibility.total,
      services: request.services as any,
      breakdown: estimate.breakdown as any,
      estimateType: estimate.estimateType,
      confidenceLevel: estimate.confidenceLevel,
      validUntil: estimate.validUntil,
      organizationId: request.organizationId,
    },
  });

  return {
    ...estimate,
    id: savedEstimate.id,
  };
}

/**
 * Get estimate by ID
 */
export async function getEstimate(
  estimateId: string
): Promise<EstimateResult | null> {
  const estimate = await prisma.priceEstimate.findUnique({
    where: { id: estimateId },
  });

  if (!estimate) {
    return null;
  }

  // Reconstruct the estimate result
  return {
    estimateId: estimate.id,
    createdAt: estimate.createdAt,
    grossCharges: estimate.grossCharges.toNumber(),
    contractualAdjustment:
      estimate.grossCharges.toNumber() - estimate.expectedAllowed.toNumber(),
    expectedAllowed: estimate.expectedAllowed.toNumber(),
    patientResponsibility: {
      deductible: 0,
      copay: 0,
      coinsurance: 0,
      total: estimate.patientResponsibility.toNumber(),
    },
    insurancePayment:
      estimate.expectedAllowed.toNumber() -
      estimate.patientResponsibility.toNumber(),
    breakdown: (estimate.breakdown as any) || [],
    estimateType: (estimate.estimateType as any) || 'single',
    payerInfo: estimate.payerId
      ? { payerId: estimate.payerId, isInNetwork: true }
      : undefined,
    disclaimer:
      'This is an estimate and actual costs may vary.',
    validUntil: estimate.validUntil,
    confidenceLevel: estimate.confidenceLevel,
    notes: [],
  };
}

/**
 * Get shoppable service prices
 */
export async function getShoppableServicePrices(
  serviceCode: string,
  organizationId?: string
): Promise<{
  service: ShoppableService | null;
  prices: {
    grossCharge: number;
    cashPrice: number;
    medicareRate: number;
    payerRates: {
      payerId: string;
      payerName: string;
      rate: number;
    }[];
  } | null;
}> {
  const service = getShoppableService(serviceCode);

  if (!service) {
    return { service: null, prices: null };
  }

  // Get prices from database if available, otherwise use defaults
  const prices = {
    grossCharge: service.averagePrice * 3.5, // Typical markup
    cashPrice: service.averagePrice * 1.5, // Self-pay discount
    medicareRate: service.averagePrice,
    payerRates: [] as { payerId: string; payerName: string; rate: number }[],
  };

  // In production, fetch actual payer rates from contracts
  // This is placeholder data
  prices.payerRates = [
    { payerId: 'BCBS001', payerName: 'Blue Cross Blue Shield', rate: service.averagePrice * 1.2 },
    { payerId: 'AETNA001', payerName: 'Aetna', rate: service.averagePrice * 1.15 },
    { payerId: 'UHC001', payerName: 'United Healthcare', rate: service.averagePrice * 1.25 },
    { payerId: 'CIGNA001', payerName: 'Cigna', rate: service.averagePrice * 1.18 },
  ];

  return { service, prices };
}

/**
 * Generate Good Faith Estimate per No Surprises Act
 */
export async function generateGoodFaithEstimate(
  request: GoodFaithEstimateRequest
): Promise<GoodFaithEstimate> {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + GFE_VALIDITY_DAYS);

  // Convert services for estimation
  const serviceItems: ServiceItem[] = request.services.map((s) => ({
    cptCode: s.cptCode,
    description: s.description,
    units: 1,
    dateOfService: new Date(s.scheduledDate),
  }));

  // Generate estimate (no insurance for GFE - uninsured/self-pay)
  const estimate = estimatePrice(serviceItems);

  // Build GFE response
  const gfeId = `GFE-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;

  const gfeServices = request.services.map((s, index) => ({
    cptCode: s.cptCode,
    description:
      s.description || getShoppableService(s.cptCode)?.description || s.cptCode,
    scheduledDate: s.scheduledDate,
    providerName: undefined,
    facilityName: undefined,
    estimatedCost: estimate.breakdown[index]?.grossCharge || 0,
  }));

  // Save GFE to database
  await prisma.priceEstimate.create({
    data: {
      patientId: request.patientId,
      grossCharges: estimate.grossCharges,
      expectedAllowed: estimate.grossCharges, // For GFE, use gross (no insurance)
      patientResponsibility: estimate.grossCharges,
      services: request.services as any,
      breakdown: estimate.breakdown as any,
      estimateType: 'episode',
      confidenceLevel: estimate.confidenceLevel,
      validUntil,
      organizationId: request.organizationId,
      isGoodFaithEstimate: true,
      gfeId,
    },
  });

  return {
    gfeId,
    patientId: request.patientId,
    issuedDate: now,
    validUntil,
    totalEstimate: estimate.grossCharges,
    services: gfeServices,
    disclaimer: GFE_DISCLAIMER,
    patientRightsNotice: PATIENT_RIGHTS_NOTICE,
  };
}

/**
 * Export machine readable file
 */
export async function exportMachineReadableFile(
  hospitalId: string,
  hospitalConfig: HospitalConfig
): Promise<{
  mrf: MachineReadableFile;
  validation: MRFValidationResult;
  metadata: {
    hospitalId: string;
    version: string;
    generatedAt: Date;
    itemCount: number;
  };
}> {
  // In production, fetch chargemaster from database
  // This is placeholder implementation
  const chargemaster: ChargemasterEntry[] = getShoppableServices().map(
    (service) => ({
      chargeCode: `CHG-${service.code}`,
      cptCode: service.code,
      description: service.description,
      chargeAmount: service.averagePrice * 3.5,
      effectiveDate: new Date(),
      isActive: true,
    })
  );

  // Generate MRF
  const mrf = generateMachineReadableFile(hospitalConfig, chargemaster, []);

  // Validate
  const validation = validateMRFCompliance(mrf);

  // Save MRF record
  const mrfRecord = await prisma.machineReadableFile.create({
    data: {
      hospitalId,
      version: mrf.hospital_identification.version,
      fileContent: mrfToJSON(mrf),
      itemCount: mrf.standard_charge_information.length,
      payerCount: 0, // Will be updated with actual payer data
      isValid: validation.isValid,
      validationErrors: validation.errors as any,
      validationWarnings: validation.warnings as any,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  return {
    mrf,
    validation,
    metadata: {
      hospitalId,
      version: mrf.hospital_identification.version,
      generatedAt: mrfRecord.generatedAt,
      itemCount: mrf.standard_charge_information.length,
    },
  };
}

/**
 * Get estimate history for a patient
 */
export async function getEstimateHistory(
  patientId: string,
  limit: number = 50
): Promise<EstimateHistoryEntry[]> {
  const estimates = await prisma.priceEstimate.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return estimates.map((e) => ({
    id: e.id,
    patientId: e.patientId,
    payerId: e.payerId,
    grossCharges: e.grossCharges.toNumber(),
    expectedAllowed: e.expectedAllowed.toNumber(),
    patientResponsibility: e.patientResponsibility.toNumber(),
    services: e.services,
    createdAt: e.createdAt,
  }));
}

/**
 * Compare estimate to actual claim
 */
export async function compareEstimateToActual(
  estimateId: string,
  claimId: string
): Promise<EstimateAccuracyResult | null> {
  const estimate = await prisma.priceEstimate.findUnique({
    where: { id: estimateId },
  });

  if (!estimate) {
    return null;
  }

  // In production, fetch actual claim data
  // This is placeholder - would query ClaimSubmission or ClaimPayment
  const actualPatientCost = estimate.patientResponsibility.toNumber() * 1.05; // Simulated 5% variance

  const estimatedCost = estimate.patientResponsibility.toNumber();
  const variance = actualPatientCost - estimatedCost;
  const variancePercent =
    estimatedCost > 0 ? (variance / estimatedCost) * 100 : 0;

  // Update estimate with accuracy data
  await prisma.priceEstimate.update({
    where: { id: estimateId },
    data: {
      actualPatientResponsibility: actualPatientCost,
      linkedClaimId: claimId,
    },
  });

  return {
    estimateId,
    claimId,
    estimatedPatientCost: estimatedCost,
    actualPatientCost,
    variance: Math.round(variance * 100) / 100,
    variancePercent: Math.round(variancePercent * 10) / 10,
    isWithinThreshold: Math.abs(variancePercent) <= 10, // Within 10% is acceptable
  };
}

/**
 * Get all shoppable services
 */
export function getAllShoppableServices(): ShoppableService[] {
  return getShoppableServices();
}

/**
 * Search shoppable services
 */
export function searchServices(
  keyword: string,
  limit?: number
): ShoppableService[] {
  return searchShoppableServices(keyword, limit);
}

/**
 * Get all service packages
 */
export function getAllServicePackages(): ServicePackage[] {
  return getServicePackages();
}

/**
 * Compare payer prices for services
 */
export function comparePayers(
  services: ServiceItem[],
  payerIds: string[]
): ReturnType<typeof comparePayerPrices> {
  return comparePayerPrices(services, payerIds);
}

/**
 * Get estimate accuracy report
 */
export async function getEstimateAccuracyReport(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEstimates: number;
  estimatesWithActuals: number;
  averageVariance: number;
  accuracyRate: number;
  byCategory: {
    category: string;
    count: number;
    avgVariance: number;
  }[];
}> {
  const where: any = {
    organizationId,
    linkedClaimId: { not: null },
    actualPatientResponsibility: { not: null },
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const estimates = await prisma.priceEstimate.findMany({
    where,
    select: {
      patientResponsibility: true,
      actualPatientResponsibility: true,
      estimateType: true,
    },
  });

  const totalEstimates = await prisma.priceEstimate.count({
    where: { organizationId },
  });

  let totalVariance = 0;
  let withinThreshold = 0;

  const categoryMap = new Map<string, { total: number; variance: number }>();

  for (const est of estimates) {
    const estimated = est.patientResponsibility.toNumber();
    const actual = est.actualPatientResponsibility?.toNumber() || estimated;
    const variance = Math.abs((actual - estimated) / estimated) * 100;

    totalVariance += variance;
    if (variance <= 10) withinThreshold++;

    const category = est.estimateType || 'single';
    const existing = categoryMap.get(category) || { total: 0, variance: 0 };
    categoryMap.set(category, {
      total: existing.total + 1,
      variance: existing.variance + variance,
    });
  }

  const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    count: data.total,
    avgVariance: data.total > 0 ? data.variance / data.total : 0,
  }));

  return {
    totalEstimates,
    estimatesWithActuals: estimates.length,
    averageVariance:
      estimates.length > 0 ? totalVariance / estimates.length : 0,
    accuracyRate:
      estimates.length > 0 ? (withinThreshold / estimates.length) * 100 : 0,
    byCategory,
  };
}

export default {
  createEstimate,
  getEstimate,
  getShoppableServicePrices,
  generateGoodFaithEstimate,
  exportMachineReadableFile,
  getEstimateHistory,
  compareEstimateToActual,
  getAllShoppableServices,
  searchServices,
  getAllServicePackages,
  comparePayers,
  getEstimateAccuracyReport,
};
