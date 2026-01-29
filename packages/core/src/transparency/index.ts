/**
 * Price Transparency Module
 *
 * CMS Hospital Price Transparency compliance module including:
 * - Price estimation engine
 * - 300 CMS-required shoppable services
 * - Machine readable file (MRF) generation
 *
 * Compliant with:
 * - CMS Hospital Price Transparency Rule (45 CFR 180)
 * - No Surprises Act Good Faith Estimate requirements
 */

// Price Estimator
export {
  estimatePrice,
  applyBenefits,
  calculateOutOfPocket,
  comparePayerPrices,
  estimateBundledPackage,
  estimateEpisodeOfCare,
  formatEstimateForDisplay,
  type ServiceItem,
  type PatientInfo,
  type BenefitsInfo,
  type Accumulators,
  type ServiceBreakdown,
  type EstimateResult,
  type PayerComparison,
  type EpisodeOfCare,
} from './price-estimator.js';

// Shoppable Services
export {
  getShoppableServices,
  getCMSSpecifiedServices,
  isShoppableService,
  isCMSSpecifiedService,
  getShoppableService,
  getServicesByCategory,
  searchShoppableServices,
  getServicePackages,
  getServicePackage,
  getPackagesByCategory,
  findPackagesWithService,
  getServiceCategoryCounts,
  type ServiceCategory,
  type ShoppableService,
  type ServicePackage,
} from './shoppable-services.js';

// Machine Readable File
export {
  generateMachineReadableFile,
  generateChargemasterFile,
  validateMRFCompliance,
  mrfToJSON,
  mrfToCSV,
  getMRFMetadata,
  type HospitalIdentification,
  type ChargeSetting,
  type ModifierInformation,
  type BillingCodeInformation,
  type PayerSpecificNegotiatedCharge,
  type StandardChargeItem,
  type MachineReadableFile,
  type MRFValidationResult,
  type MRFValidationError,
  type MRFValidationWarning,
  type ChargemasterEntry,
  type HospitalConfig,
  type PayerContractSummary,
} from './machine-readable-file.js';
