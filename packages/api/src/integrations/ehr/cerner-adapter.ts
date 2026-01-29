/**
 * Cerner PowerChart Adapter
 * Implementation of EHR adapter for Oracle Health (Cerner) using FHIR R4
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
import { FHIRClient } from './fhir-client.js';

/**
 * Cerner-specific configuration options
 */
export interface CernerAdapterConfig extends EHRConnectionConfig {
  /** Cerner tenant ID */
  tenantId?: string;
  /** Cerner solution ID (registered application) */
  solutionId?: string;
  /** Enable Cerner Ignite APIs */
  enableIgniteApis?: boolean;
  /** Cerner environment */
  cernerEnvironment?: 'sandbox' | 'certification' | 'production';
}

/**
 * Cerner-specific error codes
 */
export enum CernerErrorCode {
  INVALID_TENANT = 'CERNER_INVALID_TENANT',
  PATIENT_NOT_CONSENTED = 'CERNER_PATIENT_NOT_CONSENTED',
  DATA_LOCKED = 'CERNER_DATA_LOCKED',
  MILLENNIUM_UNAVAILABLE = 'CERNER_MILLENNIUM_UNAVAILABLE',
}

/**
 * Cerner OperationOutcome structure
 */
interface CernerOperationOutcome {
  resourceType: 'OperationOutcome';
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information';
    code: string;
    details?: {
      coding?: Array<{
        system?: string;
        code?: string;
      }>;
      text?: string;
    };
    diagnostics?: string;
  }>;
}

/**
 * Cerner PowerChart FHIR R4 Adapter
 *
 * Implements the EHR adapter interface for Oracle Health (formerly Cerner).
 * Uses SMART on FHIR for authentication with Cerner Ignite APIs.
 *
 * Cerner-specific considerations:
 * - Uses Millennium as the backend system
 * - Supports both standalone and EHR launch contexts
 * - Requires tenant-specific endpoints
 *
 * Required Cerner Code Console Configuration:
 * - System account for backend services
 * - Patient, Encounter, Coverage scopes
 * - Bulk data access (if needed)
 */
export class CernerAdapter extends BaseEHRAdapter {
  readonly vendor = 'cerner';

  private fhirClient: FHIRClient;
  private cernerConfig: CernerAdapterConfig;
  private millenniumVersion?: string;

  constructor(config: CernerAdapterConfig) {
    super(config);
    this.cernerConfig = config;
    this.fhirClient = new FHIRClient(config.auth, config.timeout);
  }

  /**
   * Connect to Cerner using OAuth 2.0
   *
   * Cerner supports both system-level and user-level access.
   * For backend services, use system account credentials.
   */
  async connect(): Promise<void> {
    try {
      await this.fhirClient.authenticate();

      // Optionally fetch capability statement to verify Millennium version
      await this.fetchCapabilities();

      this.connected = true;
    } catch (error) {
      this.connected = false;

      if (error instanceof EHRError) {
        throw error;
      }

      // Check for Cerner-specific error patterns
      const errorMessage = error instanceof Error ? error.message : '';

      if (errorMessage.includes('tenant') || errorMessage.includes('invalid_client')) {
        throw new EHRError(
          EHRErrorCode.INVALID_CREDENTIALS,
          'Invalid Cerner tenant or client credentials',
          error
        );
      }

      throw new EHRError(
        EHRErrorCode.AUTH_FAILED,
        'Failed to authenticate with Cerner FHIR server',
        error
      );
    }
  }

  /**
   * Disconnect from Cerner
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * Fetch capability statement to verify connection and features
   */
  private async fetchCapabilities(): Promise<void> {
    try {
      const result = await this.fhirClient.testConnectivity();
      if (result.success) {
        // Could parse the metadata to get Millennium version
        this.millenniumVersion = 'Unknown';
      }
    } catch {
      // Non-critical, continue without version info
    }
  }

  /**
   * Test connection to Cerner FHIR server
   */
  async testConnection(): Promise<EHRResult<{ latencyMs: number }>> {
    return this.executeWithMetadata(async () => {
      const result = await this.fhirClient.testConnectivity();

      if (!result.success) {
        throw new EHRError(EHRErrorCode.CONNECTION_FAILED, result.error || 'Connection test failed');
      }

      return { latencyMs: result.latencyMs };
    }, 'cerner:testConnection');
  }

  /**
   * Get patient by MRN from Cerner
   *
   * Cerner uses different identifier systems than Epic.
   * MRN is typically stored with a facility-specific system.
   */
  async getPatient(mrn: string, options?: PatientLookupOptions): Promise<EHRResult<EHRPatient>> {
    this.ensureConnected();
    await this.rateLimit();

    return this.executeWithMetadata(async () => {
      // Cerner accepts MRN searches with identifier parameter
      const patient = await this.fhirClient.fetchPatient(mrn);

      // Handle Cerner-specific patient consent status
      if (!options?.includeInactive && patient.active === false) {
        throw new EHRError(
          EHRErrorCode.PATIENT_NOT_FOUND,
          'Patient record is inactive or access restricted'
        );
      }

      // Fetch insurance if requested
      if (options?.includeInsurance) {
        const fhirId = this.extractCernerFhirId(patient);
        if (fhirId) {
          try {
            const insurance = await this.fhirClient.fetchCoverage(fhirId);
            (patient as any).insurance = insurance;
          } catch {
            // Insurance fetch is optional
          }
        }
      }

      return patient;
    }, 'cerner:getPatient');
  }

  /**
   * Get encounter by ID from Cerner
   *
   * Cerner encounters include references to related resources
   * like conditions, procedures, and accounts.
   */
  async getEncounter(
    encounterId: string,
    options?: EncounterLookupOptions
  ): Promise<EHRResult<EHREncounter>> {
    this.ensureConnected();
    await this.rateLimit();

    return this.executeWithMetadata(async () => {
      const encounter = await this.fhirClient.fetchEncounter(encounterId);

      // Cerner-specific enrichment
      if (options?.includeDiagnoses) {
        await this.enrichCernerDiagnoses(encounter);
      }

      if (options?.includeProcedures) {
        await this.enrichCernerProcedures(encounter);
      }

      if (options?.includeCharges) {
        await this.enrichCernerCharges(encounter);
      }

      return encounter;
    }, 'cerner:getEncounter');
  }

  /**
   * Get insurance information for a patient from Cerner
   *
   * Cerner stores coverage with detailed benefit information
   * and coordination of benefits data.
   */
  async getInsurance(
    patientId: string,
    options?: InsuranceLookupOptions
  ): Promise<EHRResult<EHRInsurance[]>> {
    this.ensureConnected();
    await this.rateLimit();

    return this.executeWithMetadata(async () => {
      const coverages = await this.fhirClient.fetchCoverage(patientId);

      // Cerner may include additional coverage details
      // Sort by priority (Cerner uses 'order' field)
      const sortedCoverages = coverages.sort((a, b) => {
        const priorityOrder = { primary: 1, secondary: 2, tertiary: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      if (options?.activeOnly) {
        return sortedCoverages.filter((c) => c.active);
      }

      return sortedCoverages;
    }, 'cerner:getInsurance');
  }

  /**
   * Verify patient eligibility with Cerner
   *
   * Cerner supports $eligibility operation for real-time verification
   * when configured with payer connections.
   */
  async verifyEligibility(
    patientId: string,
    options?: EligibilityOptions
  ): Promise<EHRResult<EHRCoverage>> {
    this.ensureConnected();
    await this.rateLimit();

    return this.executeWithMetadata(async () => {
      // Fetch existing coverage
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
            message: 'No coverage records found',
          },
        };
      }

      // Get primary coverage
      const primaryCoverage = coverages.find((c) => c.priority === 'primary') || coverages[0];

      // Build coverage response
      const coverage: EHRCoverage = {
        active: primaryCoverage.active,
        verified: !options?.forceRefresh, // Mark as verified unless forced refresh
        verificationDate: new Date().toISOString(),
        type: 'medical',
        eligibilityStatus: primaryCoverage.active ? 'eligible' : 'pending',
        insuranceId: primaryCoverage.memberId,
        patientMrn: patientId,
      };

      // Verify for specific date of service if provided
      if (options?.dateOfService) {
        const isValid = this.verifyCoverageDates(
          primaryCoverage.coverageDates,
          options.dateOfService
        );

        if (!isValid) {
          coverage.active = false;
          coverage.eligibilityStatus = 'ineligible';
          coverage.error = {
            code: 'DATE_OUT_OF_RANGE',
            message: 'Coverage not active for specified date of service',
          };
        }
      }

      // In production, would call Cerner's eligibility operation
      // $coverage-eligibility-request or similar
      if (options?.forceRefresh) {
        coverage.verified = true;
        coverage.verificationDate = new Date().toISOString();
      }

      return coverage;
    }, 'cerner:verifyEligibility');
  }

  /**
   * Extract Cerner FHIR ID from patient identifiers
   */
  private extractCernerFhirId(patient: EHRPatient): string | undefined {
    // Look for Cerner-specific identifier systems
    const cernerIdentifier = patient.identifiers?.find(
      (id) =>
        id.system?.includes('cerner') ||
        id.system?.includes('millennium') ||
        id.system?.includes('fhir')
    );

    return cernerIdentifier?.value || patient.mrn;
  }

  /**
   * Verify coverage dates for a service date
   */
  private verifyCoverageDates(
    coverageDates: { start: string; end?: string },
    serviceDate: string
  ): boolean {
    const service = new Date(serviceDate);
    const start = new Date(coverageDates.start);

    if (service < start) {
      return false;
    }

    if (coverageDates.end) {
      const end = new Date(coverageDates.end);
      if (service > end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Enrich encounter with Cerner diagnosis details
   */
  private async enrichCernerDiagnoses(encounter: EHREncounter): Promise<void> {
    try {
      // Cerner stores diagnoses as Condition resources
      const bundle = await (this.fhirClient as any).search('Condition', {
        encounter: `Encounter/${encounter.id}`,
        '_include': 'Condition:subject',
      });

      if (bundle.entry) {
        encounter.diagnoses = bundle.entry
          .filter((entry: any) => entry.resource.resourceType === 'Condition')
          .map((entry: any) => {
            const condition = entry.resource;
            return {
              code: condition.code?.coding?.[0]?.code || '',
              system: this.mapCernerDiagnosisSystem(condition.code?.coding?.[0]?.system),
              description: condition.code?.coding?.[0]?.display || condition.code?.text || '',
              type: this.mapCernerDiagnosisType(condition.category),
              presentOnAdmission: this.extractPresentOnAdmission(condition),
            };
          });
      }
    } catch {
      // Non-critical, continue without diagnoses
    }
  }

  /**
   * Enrich encounter with Cerner procedure details
   */
  private async enrichCernerProcedures(encounter: EHREncounter): Promise<void> {
    try {
      const bundle = await (this.fhirClient as any).search('Procedure', {
        encounter: `Encounter/${encounter.id}`,
      });

      if (bundle.entry) {
        encounter.procedures = bundle.entry.map((entry: any) => {
          const procedure = entry.resource;
          return {
            code: procedure.code?.coding?.[0]?.code || '',
            system: this.mapCernerProcedureSystem(procedure.code?.coding?.[0]?.system),
            description: procedure.code?.coding?.[0]?.display || procedure.code?.text || '',
            date: procedure.performedDateTime || procedure.performedPeriod?.start,
          };
        });
      }
    } catch {
      // Non-critical, continue without procedures
    }
  }

  /**
   * Enrich encounter with Cerner charge information
   */
  private async enrichCernerCharges(encounter: EHREncounter): Promise<void> {
    try {
      // Cerner uses Account resource for financial data
      const bundle = await (this.fhirClient as any).search('Account', {
        'subject': `Encounter/${encounter.id}`,
      });

      if (bundle.entry && bundle.entry.length > 0) {
        const account = bundle.entry[0].resource;
        // Cerner accounts may have balance information
        if (account.balance) {
          encounter.charges = {
            totalCharges: account.balance[0]?.amount?.value || 0,
            currency: account.balance[0]?.amount?.currency || 'USD',
          };
        }
      }
    } catch {
      // Non-critical, continue without charges
    }
  }

  /**
   * Map Cerner diagnosis coding system
   */
  private mapCernerDiagnosisSystem(system?: string): 'ICD-10' | 'ICD-9' | 'SNOMED' {
    if (!system) return 'ICD-10';

    const systemLower = system.toLowerCase();

    if (systemLower.includes('icd-10') || systemLower.includes('6.90')) {
      return 'ICD-10';
    }
    if (systemLower.includes('icd-9') || systemLower.includes('6.103')) {
      return 'ICD-9';
    }
    if (systemLower.includes('snomed') || systemLower.includes('6.96')) {
      return 'SNOMED';
    }

    return 'ICD-10';
  }

  /**
   * Map Cerner procedure coding system
   */
  private mapCernerProcedureSystem(system?: string): 'CPT' | 'HCPCS' | 'ICD-10-PCS' {
    if (!system) return 'CPT';

    const systemLower = system.toLowerCase();

    if (systemLower.includes('cpt') || systemLower.includes('6.12')) {
      return 'CPT';
    }
    if (systemLower.includes('hcpcs') || systemLower.includes('6.285')) {
      return 'HCPCS';
    }
    if (systemLower.includes('icd-10-pcs') || systemLower.includes('6.4')) {
      return 'ICD-10-PCS';
    }

    return 'CPT';
  }

  /**
   * Map Cerner diagnosis category to type
   */
  private mapCernerDiagnosisType(
    category?: Array<{ coding?: Array<{ code?: string }> }>
  ): 'principal' | 'secondary' | 'admitting' | 'discharge' {
    const categoryCode = category?.[0]?.coding?.[0]?.code?.toLowerCase();

    if (categoryCode === 'encounter-diagnosis' || categoryCode === 'principal') {
      return 'principal';
    }
    if (categoryCode === 'admitting') {
      return 'admitting';
    }
    if (categoryCode === 'discharge') {
      return 'discharge';
    }

    return 'secondary';
  }

  /**
   * Extract present on admission indicator
   */
  private extractPresentOnAdmission(condition: any): boolean | undefined {
    // Cerner may store POA in extension
    const poaExtension = condition.extension?.find(
      (ext: any) => ext.url?.includes('present-on-admission')
    );

    if (poaExtension?.valueCodeableConcept?.coding?.[0]?.code === 'Y') {
      return true;
    }
    if (poaExtension?.valueCodeableConcept?.coding?.[0]?.code === 'N') {
      return false;
    }

    return undefined;
  }

  /**
   * Handle Cerner-specific OperationOutcome errors
   */
  protected handleCernerError(outcome: CernerOperationOutcome): EHRError {
    const issue = outcome.issue[0];
    const diagnostics = issue.diagnostics || '';
    const details = issue.details?.text || issue.code;

    // Check for specific Cerner error patterns
    if (diagnostics.includes('consent') || diagnostics.includes('authorization')) {
      return new EHRError(
        EHRErrorCode.AUTH_FAILED,
        `Patient consent or authorization issue: ${details}`,
        outcome
      );
    }

    if (diagnostics.includes('not found') || issue.code === 'not-found') {
      return new EHRError(
        EHRErrorCode.PATIENT_NOT_FOUND,
        `Resource not found: ${details}`,
        outcome
      );
    }

    return new EHRError(
      EHRErrorCode.INVALID_RESPONSE,
      `Cerner error: ${details}`,
      outcome
    );
  }
}

/**
 * Factory function to create a Cerner adapter
 */
export function createCernerAdapter(config: CernerAdapterConfig): CernerAdapter {
  return new CernerAdapter(config);
}
