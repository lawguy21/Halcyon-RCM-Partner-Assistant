/**
 * EHR Integration Module
 * Exports all EHR adapters, types, and utilities
 */

// Import types for local use
import type { EHRConnectionConfig } from './types.js';
import type { EHRAdapter } from './ehr-adapter.js';
import { EpicAdapter } from './epic-adapter.js';
import { CernerAdapter } from './cerner-adapter.js';

// Types
export type {
  EHRPatient,
  EHREncounter,
  EHRInsurance,
  EHRCoverage,
  EHRAuthConfig,
  EHRConnectionConfig,
  EHRResult,
} from './types.js';

// Adapter interface and base class
export {
  type EHRAdapter,
  BaseEHRAdapter,
  EHRError,
  EHRErrorCode,
  type PatientLookupOptions,
  type EncounterLookupOptions,
  type InsuranceLookupOptions,
  type EligibilityOptions,
} from './ehr-adapter.js';

// FHIR Client
export {
  FHIRClient,
  type FHIRBundle,
  type FHIRPatient,
  type FHIREncounter,
  type FHIRCoverage,
  type FHIRResourceType,
} from './fhir-client.js';

// Epic Adapter
export {
  EpicAdapter,
  createEpicAdapter,
  type EpicAdapterConfig,
  EpicErrorCode,
} from './epic-adapter.js';

// Cerner Adapter
export {
  CernerAdapter,
  createCernerAdapter,
  type CernerAdapterConfig,
  CernerErrorCode,
} from './cerner-adapter.js';

/**
 * Supported EHR vendor types
 */
export type EHRVendor = 'epic' | 'cerner' | 'meditech' | 'allscripts' | 'athenahealth' | 'other';

/**
 * Factory function to create the appropriate EHR adapter based on vendor
 *
 * @param config - EHR connection configuration
 * @returns Configured EHR adapter instance
 * @throws Error if vendor is not supported
 *
 * @example
 * ```typescript
 * const adapter = createEHRAdapter({
 *   id: 'epic-prod',
 *   name: 'Epic Production',
 *   vendor: 'epic',
 *   auth: {
 *     clientId: 'your-client-id',
 *     tokenEndpoint: 'https://fhir.epic.com/oauth2/token',
 *     fhirBaseUrl: 'https://fhir.epic.com/api/FHIR/R4',
 *     scopes: ['system/*.read'],
 *   },
 *   organizationId: 'org-123',
 *   enabled: true,
 * });
 *
 * await adapter.connect();
 * const patient = await adapter.getPatient('12345678');
 * ```
 */
export function createEHRAdapter(config: EHRConnectionConfig): EHRAdapter {
  switch (config.vendor) {
    case 'epic':
      return new EpicAdapter(config);
    case 'cerner':
      return new CernerAdapter(config);
    case 'meditech':
    case 'allscripts':
    case 'athenahealth':
    case 'other':
      throw new Error(
        `EHR vendor "${config.vendor}" adapter is not yet implemented. ` +
        `Supported vendors: epic, cerner`
      );
    default:
      throw new Error(`Unknown EHR vendor: ${config.vendor}`);
  }
}

/**
 * Get list of supported EHR vendors with their status
 */
export function getSupportedVendors(): Array<{
  vendor: EHRVendor;
  name: string;
  status: 'available' | 'coming-soon' | 'not-planned';
  fhirVersion: string;
}> {
  return [
    {
      vendor: 'epic',
      name: 'Epic Systems (MyChart)',
      status: 'available',
      fhirVersion: 'R4',
    },
    {
      vendor: 'cerner',
      name: 'Oracle Health (Cerner PowerChart)',
      status: 'available',
      fhirVersion: 'R4',
    },
    {
      vendor: 'meditech',
      name: 'MEDITECH',
      status: 'coming-soon',
      fhirVersion: 'R4',
    },
    {
      vendor: 'allscripts',
      name: 'Allscripts',
      status: 'coming-soon',
      fhirVersion: 'R4',
    },
    {
      vendor: 'athenahealth',
      name: 'athenahealth',
      status: 'coming-soon',
      fhirVersion: 'R4',
    },
    {
      vendor: 'other',
      name: 'Generic FHIR R4',
      status: 'coming-soon',
      fhirVersion: 'R4',
    },
  ];
}
