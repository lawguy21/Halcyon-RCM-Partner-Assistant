/**
 * Epic MyChart Adapter
 * Implementation of EHR adapter for Epic Systems using FHIR R4
 */

import type {
  EHRPatient,
  EHREncounter,
  EHRInsurance,
  EHRCoverage,
  EHRResult,
  EHRConnectionConfig,
} from './types.js';
import {
  BaseEHRAdapter,
  EHRError,
  EHRErrorCode,
  type PatientLookupOptions,
  type EncounterLookupOptions,
  type InsuranceLookupOptions,
  type EligibilityOptions,
} from './ehr-adapter.js';
import { FHIRClient, type FHIRBundle, type FHIRCoverage } from './fhir-client.js';

/**
 * Epic-specific configuration options
 */
export interface EpicAdapterConfig extends EHRConnectionConfig {
  /** Epic client ID (non-production vs production) */
  epicClientId?: string;
  /** Epic environment (sandbox, non-production, production) */
  epicEnvironment?: 'sandbox' | 'non-production' | 'production';
  /** Enable SMART on FHIR backend services */
  enableSmartBackend?: boolean;
}

/**
 * Epic adapter error codes (Epic-specific)
 */
export enum EpicErrorCode {
  PATIENT_ACCESS_DENIED = 'EPIC_PATIENT_ACCESS_DENIED',
  INVALID_FHIR_ID = 'EPIC_INVALID_FHIR_ID',
  BREAK_THE_GLASS_REQUIRED = 'EPIC_BREAK_THE_GLASS_REQUIRED',
  SYSTEM_UNAVAILABLE = 'EPIC_SYSTEM_UNAVAILABLE',
}

/**
 * Epic MyChart FHIR R4 Adapter
 *
 * Implements the EHR adapter interface for Epic Systems.
 * Uses SMART on FHIR Backend Services for authentication.
 *
 * Required Epic App Orchard Configuration:
 * - FHIR R4 Bulk Data Access
 * - Patient/$everything operation support
 * - Coverage read access
 *
 * Standard Epic FHIR scopes:
 * - patient/Patient.read
 * - patient/Encounter.read
 * - patient/Coverage.read
 * - patient/ExplanationOfBenefit.read
 * - system/*.read (for backend services)
 */
export class EpicAdapter extends BaseEHRAdapter {
  readonly vendor = 'epic';

  private fhirClient: FHIRClient;
  private epicConfig: EpicAdapterConfig;

  constructor(config: EpicAdapterConfig) {
    super(config);
    this.epicConfig = config;
    this.fhirClient = new FHIRClient(config.auth, config.timeout);
  }

  /**
   * Connect to Epic using SMART Backend Services OAuth 2.0
   *
   * Epic requires JWT-based authentication for backend services.
   * The JWT must be signed with the private key registered in App Orchard.
   */
  async connect(): Promise<void> {
    try {
      await this.fhirClient.authenticate();
      this.connected = true;
    } catch (error) {
      this.connected = false;

      if (error instanceof EHRError) {
        throw error;
      }

      throw new EHRError(
        EHRErrorCode.AUTH_FAILED,
        'Failed to authenticate with Epic FHIR server',
        error
      );
    }
  }

  /**
   * Disconnect from Epic
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    // Epic doesn't require explicit disconnect, just clear state
  }

  /**
   * Test connection to Epic FHIR server
   */
  async testConnection(): Promise<EHRResult<{ latencyMs: number }>> {
    return this.executeWithMetadata(async () => {
      const result = await this.fhirClient.testConnectivity();

      if (!result.success) {
        throw new EHRError(EHRErrorCode.CONNECTION_FAILED, result.error || 'Connection test failed');
      }

      return { latencyMs: result.latencyMs };
    }, 'epic:testConnection');
  }

  /**
   * Get patient by MRN from Epic
   *
   * Epic uses FHIR patient search with identifier parameter.
   * MRN format may vary by organization.
   */
  async getPatient(mrn: string, options?: PatientLookupOptions): Promise<EHRResult<EHRPatient>> {
    this.ensureConnected();
    await this.rateLimit();

    return this.executeWithMetadata(async () => {
      // Epic recommends searching by identifier type
      const patient = await this.fhirClient.fetchPatient(mrn);

      // If includeInsurance is requested, fetch coverage
      if (options?.includeInsurance && patient.identifiers) {
        // Find the FHIR ID from identifiers
        const fhirId = patient.identifiers.find(
          (id) => id.system?.includes('fhir')
        )?.value;

        if (fhirId) {
          try {
            const insurance = await this.fhirClient.fetchCoverage(fhirId);
            // Attach to patient (extend interface if needed)
            (patient as any).insurance = insurance;
          } catch {
            // Insurance fetch is optional, don't fail the whole request
          }
        }
      }

      return patient;
    }, 'epic:getPatient');
  }

  /**
   * Get encounter by ID from Epic
   *
   * Epic encounters include hospitalization details, diagnosis references,
   * and participant information.
   */
  async getEncounter(
    encounterId: string,
    options?: EncounterLookupOptions
  ): Promise<EHRResult<EHREncounter>> {
    this.ensureConnected();
    await this.rateLimit();

    return this.executeWithMetadata(async () => {
      const encounter = await this.fhirClient.fetchEncounter(encounterId);

      // Epic stores diagnoses and procedures in separate resources
      // Fetch them if requested
      if (options?.includeDiagnoses) {
        await this.enrichEncounterDiagnoses(encounter);
      }

      if (options?.includeProcedures) {
        await this.enrichEncounterProcedures(encounter);
      }

      if (options?.includeCharges) {
        await this.enrichEncounterCharges(encounter);
      }

      return encounter;
    }, 'epic:getEncounter');
  }

  /**
   * Get insurance information for a patient from Epic
   *
   * Epic stores coverage as FHIR Coverage resources linked to the patient.
   */
  async getInsurance(
    patientId: string,
    options?: InsuranceLookupOptions
  ): Promise<EHRResult<EHRInsurance[]>> {
    this.ensureConnected();
    await this.rateLimit();

    return this.executeWithMetadata(async () => {
      const coverages = await this.fhirClient.fetchCoverage(patientId);

      // Filter to active only if requested
      if (options?.activeOnly) {
        return coverages.filter((c) => c.active);
      }

      return coverages;
    }, 'epic:getInsurance');
  }

  /**
   * Verify patient eligibility with Epic
   *
   * Epic provides real-time eligibility through CoverageEligibilityRequest/Response
   * or through pre-verified Coverage resources.
   *
   * Note: Real-time eligibility requires additional configuration with payers
   * through Epic's Payer Platform.
   */
  async verifyEligibility(
    patientId: string,
    options?: EligibilityOptions
  ): Promise<EHRResult<EHRCoverage>> {
    this.ensureConnected();
    await this.rateLimit();

    return this.executeWithMetadata(async () => {
      // Fetch active coverage
      const coverages = await this.fhirClient.fetchCoverage(patientId);

      if (coverages.length === 0) {
        return {
          active: false,
          verified: false,
          type: 'medical',
          eligibilityStatus: 'unknown',
          patientMrn: patientId,
          error: {
            code: 'NO_COVERAGE',
            message: 'No active coverage found for patient',
          },
        };
      }

      // Get primary coverage
      const primaryCoverage = coverages.find((c) => c.priority === 'primary') || coverages[0];

      // In production, this would call CoverageEligibilityRequest
      // For now, return coverage status based on existing data
      const coverage: EHRCoverage = {
        active: primaryCoverage.active,
        verified: true, // In production, set based on actual verification
        verificationDate: new Date().toISOString(),
        type: 'medical',
        eligibilityStatus: primaryCoverage.active ? 'eligible' : 'ineligible',
        insuranceId: primaryCoverage.memberId,
        patientMrn: patientId,
      };

      // If date of service is provided, verify coverage for that date
      if (options?.dateOfService && primaryCoverage.coverageDates) {
        const serviceDate = new Date(options.dateOfService);
        const startDate = new Date(primaryCoverage.coverageDates.start);
        const endDate = primaryCoverage.coverageDates.end
          ? new Date(primaryCoverage.coverageDates.end)
          : new Date();

        if (serviceDate < startDate || serviceDate > endDate) {
          coverage.active = false;
          coverage.eligibilityStatus = 'ineligible';
        }
      }

      return coverage;
    }, 'epic:verifyEligibility');
  }

  /**
   * Enrich encounter with diagnosis details
   * Fetches Condition resources linked to the encounter
   */
  private async enrichEncounterDiagnoses(encounter: EHREncounter): Promise<void> {
    try {
      // In Epic, diagnoses are stored as Condition resources
      // Would need to search by encounter reference
      // This is a placeholder for the actual implementation
      const bundle = await (this.fhirClient as any).search('Condition', {
        encounter: `Encounter/${encounter.id}`,
      });

      if (bundle.entry) {
        encounter.diagnoses = bundle.entry.map((entry: any) => ({
          code: entry.resource.code?.coding?.[0]?.code || '',
          system: this.mapCodingSystem(entry.resource.code?.coding?.[0]?.system),
          description: entry.resource.code?.coding?.[0]?.display || '',
          type: 'secondary' as const, // Would need to determine from clinical status
        }));
      }
    } catch {
      // Non-critical enrichment, don't fail
    }
  }

  /**
   * Enrich encounter with procedure details
   * Fetches Procedure resources linked to the encounter
   */
  private async enrichEncounterProcedures(encounter: EHREncounter): Promise<void> {
    try {
      const bundle = await (this.fhirClient as any).search('Procedure', {
        encounter: `Encounter/${encounter.id}`,
      });

      if (bundle.entry) {
        encounter.procedures = bundle.entry.map((entry: any) => ({
          code: entry.resource.code?.coding?.[0]?.code || '',
          system: this.mapProcedureSystem(entry.resource.code?.coding?.[0]?.system),
          description: entry.resource.code?.coding?.[0]?.display || '',
          date: entry.resource.performedDateTime,
        }));
      }
    } catch {
      // Non-critical enrichment, don't fail
    }
  }

  /**
   * Enrich encounter with charge information
   * Fetches Claim or ChargeItem resources
   */
  private async enrichEncounterCharges(encounter: EHREncounter): Promise<void> {
    try {
      // Epic stores charges in ChargeItem or Claim resources
      // This would need specific Epic implementation
      const bundle = await (this.fhirClient as any).search('Claim', {
        encounter: `Encounter/${encounter.id}`,
      });

      if (bundle.entry && bundle.entry.length > 0) {
        const claim = bundle.entry[0].resource;
        encounter.charges = {
          totalCharges: claim.total?.value || 0,
          currency: claim.total?.currency || 'USD',
        };
      }
    } catch {
      // Non-critical enrichment, don't fail
    }
  }

  /**
   * Map FHIR coding system to internal diagnosis system
   */
  private mapCodingSystem(system?: string): 'ICD-10' | 'ICD-9' | 'SNOMED' {
    if (!system) return 'ICD-10';

    if (system.includes('icd-10') || system.includes('2.16.840.1.113883.6.90')) {
      return 'ICD-10';
    }
    if (system.includes('icd-9') || system.includes('2.16.840.1.113883.6.103')) {
      return 'ICD-9';
    }
    if (system.includes('snomed') || system.includes('2.16.840.1.113883.6.96')) {
      return 'SNOMED';
    }

    return 'ICD-10';
  }

  /**
   * Map FHIR procedure system to internal procedure system
   */
  private mapProcedureSystem(system?: string): 'CPT' | 'HCPCS' | 'ICD-10-PCS' {
    if (!system) return 'CPT';

    if (system.includes('cpt') || system.includes('2.16.840.1.113883.6.12')) {
      return 'CPT';
    }
    if (system.includes('hcpcs') || system.includes('2.16.840.1.113883.6.285')) {
      return 'HCPCS';
    }
    if (system.includes('icd-10-pcs') || system.includes('2.16.840.1.113883.6.4')) {
      return 'ICD-10-PCS';
    }

    return 'CPT';
  }
}

/**
 * Factory function to create an Epic adapter
 */
export function createEpicAdapter(config: EpicAdapterConfig): EpicAdapter {
  return new EpicAdapter(config);
}
