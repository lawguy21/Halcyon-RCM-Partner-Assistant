/**
 * X12 837 Claim Formatter
 * Formats healthcare claims to X12 837P (Professional) and 837I (Institutional) format
 * Implements HIPAA 5010 standards
 */

import type {
  ProfessionalClaim,
  InstitutionalClaim,
  InterchangeInfo,
  FunctionalGroupInfo,
  TransactionSetInfo,
  ProviderInfo,
  BillingProviderInfo,
  RenderingProviderInfo,
  ReferringProviderInfo,
  FacilityInfo,
  PatientInfo,
  SubscriberInfo,
  PayerInfo,
  DiagnosisInfo,
  DiagnosisSet,
  ProcedureInfo,
  RevenueCodeLine,
  InstitutionalProcedure,
  OccurrenceCode,
  ValueCode,
  ConditionCode,
  ClaimHeader,
  RelatedCause,
} from './claim-types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** X12 element separator (default: *) */
const ELEMENT_SEPARATOR = '*';

/** X12 segment terminator (default: ~) */
const SEGMENT_TERMINATOR = '~';

/** X12 component element separator (default: :) */
const COMPONENT_SEPARATOR = ':';

/** X12 repetition separator (default: ^) */
const REPETITION_SEPARATOR = '^';

/** 837P Implementation Convention Reference */
const IMPL_CONV_REF_837P = '005010X222A1';

/** 837I Implementation Convention Reference */
const IMPL_CONV_REF_837I = '005010X223A2';

// ============================================================================
// FORMATTER OPTIONS
// ============================================================================

export interface FormatterOptions {
  /** Element separator (default: *) */
  elementSeparator?: string;
  /** Segment terminator (default: ~) */
  segmentTerminator?: string;
  /** Component separator (default: :) */
  componentSeparator?: string;
  /** Repetition separator (default: ^) */
  repetitionSeparator?: string;
  /** Include line breaks after segments (default: true) */
  includeLineBreaks?: boolean;
  /** Test/Production indicator (default: P) */
  usageIndicator?: 'P' | 'T' | 'I';
}

// ============================================================================
// X12 SEGMENT BUILDER
// ============================================================================

class SegmentBuilder {
  private elements: string[] = [];
  private segmentId: string;
  private options: Required<FormatterOptions>;

  constructor(segmentId: string, options: Required<FormatterOptions>) {
    this.segmentId = segmentId;
    this.options = options;
  }

  /** Add an element to the segment */
  add(value: string | number | undefined | null): this {
    this.elements.push(this.formatValue(value));
    return this;
  }

  /** Add a component element (colon-separated within an element) */
  addComponent(...values: Array<string | number | undefined | null>): this {
    const formattedValues = values.map(v => this.formatValue(v));
    // Remove trailing empty values
    while (formattedValues.length > 0 && formattedValues[formattedValues.length - 1] === '') {
      formattedValues.pop();
    }
    this.elements.push(formattedValues.join(this.options.componentSeparator));
    return this;
  }

  /** Build the complete segment string */
  build(): string {
    // Remove trailing empty elements
    while (this.elements.length > 0 && this.elements[this.elements.length - 1] === '') {
      this.elements.pop();
    }

    const segment = this.segmentId +
      this.options.elementSeparator +
      this.elements.join(this.options.elementSeparator) +
      this.options.segmentTerminator;

    return this.options.includeLineBreaks ? segment + '\n' : segment;
  }

  private formatValue(value: string | number | undefined | null): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    // Remove any characters that could break X12 format
    return value.toString()
      .replace(/[~*:^]/g, '')
      .trim();
  }
}

// ============================================================================
// X12 837 FORMATTER CLASS
// ============================================================================

export class X12837Formatter {
  private options: Required<FormatterOptions>;
  private segmentCount: number = 0;
  private hierarchicalIdCounter: number = 0;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      elementSeparator: options.elementSeparator || ELEMENT_SEPARATOR,
      segmentTerminator: options.segmentTerminator || SEGMENT_TERMINATOR,
      componentSeparator: options.componentSeparator || COMPONENT_SEPARATOR,
      repetitionSeparator: options.repetitionSeparator || REPETITION_SEPARATOR,
      includeLineBreaks: options.includeLineBreaks ?? true,
      usageIndicator: options.usageIndicator || 'P',
    };
  }

  /**
   * Format a Professional Claim (837P)
   */
  formatProfessionalClaim(
    claim: ProfessionalClaim,
    interchange: InterchangeInfo,
    functionalGroup: FunctionalGroupInfo
  ): string {
    this.segmentCount = 0;
    this.hierarchicalIdCounter = 0;

    const segments: string[] = [];

    // ISA - Interchange Control Header
    segments.push(this.formatISA(interchange));

    // GS - Functional Group Header
    segments.push(this.formatGS(functionalGroup));

    // ST - Transaction Set Header
    const transactionSet: TransactionSetInfo = {
      transactionSetIdentifierCode: '837',
      transactionSetControlNumber: this.padNumber(parseInt(interchange.interchangeControlNumber), 4),
      implementationConventionReference: IMPL_CONV_REF_837P,
    };
    segments.push(this.formatST(transactionSet));

    // BHT - Beginning of Hierarchical Transaction
    segments.push(this.formatBHT('0019', '00', claim.header.claimId, this.formatDateCCYYMMDD(new Date()), this.formatTime(new Date()), 'CH'));

    // Loop 1000A - Submitter Name
    segments.push(...this.formatLoop1000A(claim.billingProvider));

    // Loop 1000B - Receiver Name
    segments.push(...this.formatLoop1000B(claim.payer));

    // Loop 2000A - Billing Provider Hierarchical Level
    const billingHierarchyId = ++this.hierarchicalIdCounter;
    segments.push(this.formatHL(billingHierarchyId.toString(), '', '20', '1'));
    segments.push(...this.formatLoop2010AA(claim.billingProvider));
    if (claim.billingProvider.payToAddress1) {
      segments.push(...this.formatLoop2010AB(claim.billingProvider));
    }

    // Loop 2000B - Subscriber Hierarchical Level
    const subscriberHierarchyId = ++this.hierarchicalIdCounter;
    const hasPatient = claim.patient.relationshipToSubscriber !== '18';
    segments.push(this.formatHL(subscriberHierarchyId.toString(), billingHierarchyId.toString(), '22', hasPatient ? '1' : '0'));
    segments.push(this.formatSBR('P', claim.patient.relationshipToSubscriber, claim.subscriber.groupNumber, '', '', '', '', '', claim.payer.claimFilingIndicator));
    segments.push(...this.formatLoop2010BA(claim.subscriber));
    segments.push(...this.formatLoop2010BB(claim.payer));

    // Loop 2000C - Patient Hierarchical Level (if different from subscriber)
    if (hasPatient) {
      const patientHierarchyId = ++this.hierarchicalIdCounter;
      segments.push(this.formatHL(patientHierarchyId.toString(), subscriberHierarchyId.toString(), '23', '0'));
      segments.push(this.formatPAT(claim.patient.relationshipToSubscriber));
      segments.push(...this.formatLoop2010CA(claim.patient));
    }

    // Loop 2300 - Claim Information
    segments.push(...this.formatLoop2300Professional(claim));

    // Loop 2400 - Service Lines
    let lineSequence = 0;
    for (const line of claim.serviceLines) {
      lineSequence++;
      segments.push(...this.formatLoop2400Professional(line, lineSequence, claim.diagnoses));
    }

    // SE - Transaction Set Trailer
    segments.push(this.formatSE(transactionSet.transactionSetControlNumber));

    // GE - Functional Group Trailer
    segments.push(this.formatGE(functionalGroup.groupControlNumber));

    // IEA - Interchange Control Trailer
    segments.push(this.formatIEA(interchange.interchangeControlNumber));

    return segments.join('');
  }

  /**
   * Format an Institutional Claim (837I)
   */
  formatInstitutionalClaim(
    claim: InstitutionalClaim,
    interchange: InterchangeInfo,
    functionalGroup: FunctionalGroupInfo
  ): string {
    this.segmentCount = 0;
    this.hierarchicalIdCounter = 0;

    const segments: string[] = [];

    // ISA - Interchange Control Header
    segments.push(this.formatISA(interchange));

    // GS - Functional Group Header
    segments.push(this.formatGS(functionalGroup));

    // ST - Transaction Set Header
    const transactionSet: TransactionSetInfo = {
      transactionSetIdentifierCode: '837',
      transactionSetControlNumber: this.padNumber(parseInt(interchange.interchangeControlNumber), 4),
      implementationConventionReference: IMPL_CONV_REF_837I,
    };
    segments.push(this.formatST(transactionSet));

    // BHT - Beginning of Hierarchical Transaction
    segments.push(this.formatBHT('0019', '00', claim.header.claimId, this.formatDateCCYYMMDD(new Date()), this.formatTime(new Date()), 'CH'));

    // Loop 1000A - Submitter Name
    segments.push(...this.formatLoop1000A(claim.billingProvider));

    // Loop 1000B - Receiver Name
    segments.push(...this.formatLoop1000B(claim.payer));

    // Loop 2000A - Billing Provider Hierarchical Level
    const billingHierarchyId = ++this.hierarchicalIdCounter;
    segments.push(this.formatHL(billingHierarchyId.toString(), '', '20', '1'));
    segments.push(...this.formatLoop2010AAInstitutional(claim.billingProvider));

    // Loop 2000B - Subscriber Hierarchical Level
    const subscriberHierarchyId = ++this.hierarchicalIdCounter;
    const hasPatient = claim.patient.relationshipToSubscriber !== '18';
    segments.push(this.formatHL(subscriberHierarchyId.toString(), billingHierarchyId.toString(), '22', hasPatient ? '1' : '0'));
    segments.push(this.formatSBR('P', claim.patient.relationshipToSubscriber, claim.subscriber.groupNumber, '', '', '', '', '', claim.payer.claimFilingIndicator));
    segments.push(...this.formatLoop2010BA(claim.subscriber));
    segments.push(...this.formatLoop2010BB(claim.payer));

    // Loop 2000C - Patient Hierarchical Level (if different from subscriber)
    if (hasPatient) {
      const patientHierarchyId = ++this.hierarchicalIdCounter;
      segments.push(this.formatHL(patientHierarchyId.toString(), subscriberHierarchyId.toString(), '23', '0'));
      segments.push(this.formatPAT(claim.patient.relationshipToSubscriber));
      segments.push(...this.formatLoop2010CA(claim.patient));
    }

    // Loop 2300 - Claim Information
    segments.push(...this.formatLoop2300Institutional(claim));

    // Loop 2400 - Service Lines
    let lineSequence = 0;
    for (const line of claim.revenueLines) {
      lineSequence++;
      segments.push(...this.formatLoop2400Institutional(line, lineSequence));
    }

    // SE - Transaction Set Trailer
    segments.push(this.formatSE(transactionSet.transactionSetControlNumber));

    // GE - Functional Group Trailer
    segments.push(this.formatGE(functionalGroup.groupControlNumber));

    // IEA - Interchange Control Trailer
    segments.push(this.formatIEA(interchange.interchangeControlNumber));

    return segments.join('');
  }

  // ============================================================================
  // ENVELOPE SEGMENTS (ISA, GS, ST, SE, GE, IEA)
  // ============================================================================

  private formatISA(info: InterchangeInfo): string {
    this.segmentCount++;
    // ISA is fixed width - each element has specific length requirements
    return new SegmentBuilder('ISA', this.options)
      .add('00') // ISA01 - Authorization Information Qualifier
      .add(this.padRight('', 10)) // ISA02 - Authorization Information (10 chars)
      .add('00') // ISA03 - Security Information Qualifier
      .add(this.padRight('', 10)) // ISA04 - Security Information (10 chars)
      .add(info.senderIdQualifier.padEnd(2)) // ISA05 - Interchange ID Qualifier
      .add(this.padRight(info.senderId, 15)) // ISA06 - Interchange Sender ID (15 chars)
      .add(info.receiverIdQualifier.padEnd(2)) // ISA07 - Interchange ID Qualifier
      .add(this.padRight(info.receiverId, 15)) // ISA08 - Interchange Receiver ID (15 chars)
      .add(info.interchangeDate) // ISA09 - Interchange Date (YYMMDD)
      .add(info.interchangeTime) // ISA10 - Interchange Time (HHMM)
      .add(info.repetitionSeparator || '^') // ISA11 - Repetition Separator
      .add('00501') // ISA12 - Interchange Control Version Number
      .add(this.padNumber(parseInt(info.interchangeControlNumber), 9)) // ISA13 - Interchange Control Number
      .add(info.acknowledgmentRequested) // ISA14 - Acknowledgment Requested
      .add(info.usageIndicator) // ISA15 - Usage Indicator
      .add(this.options.componentSeparator) // ISA16 - Component Element Separator
      .build();
  }

  private formatGS(info: FunctionalGroupInfo): string {
    this.segmentCount++;
    return new SegmentBuilder('GS', this.options)
      .add(info.functionalIdentifierCode) // GS01 - Functional Identifier Code (HC)
      .add(info.applicationSenderCode) // GS02 - Application Sender's Code
      .add(info.applicationReceiverCode) // GS03 - Application Receiver's Code
      .add(info.groupDate) // GS04 - Date (CCYYMMDD)
      .add(info.groupTime) // GS05 - Time (HHMM or HHMMSS)
      .add(info.groupControlNumber) // GS06 - Group Control Number
      .add(info.responsibleAgencyCode) // GS07 - Responsible Agency Code (X)
      .add(info.versionIdentifier) // GS08 - Version/Release/Industry Identifier Code
      .build();
  }

  private formatST(info: TransactionSetInfo): string {
    this.segmentCount++;
    return new SegmentBuilder('ST', this.options)
      .add(info.transactionSetIdentifierCode) // ST01 - Transaction Set Identifier Code (837)
      .add(info.transactionSetControlNumber) // ST02 - Transaction Set Control Number
      .add(info.implementationConventionReference) // ST03 - Implementation Convention Reference
      .build();
  }

  private formatSE(transactionSetControlNumber: string): string {
    this.segmentCount++;
    return new SegmentBuilder('SE', this.options)
      .add(this.segmentCount.toString()) // SE01 - Number of Included Segments
      .add(transactionSetControlNumber) // SE02 - Transaction Set Control Number
      .build();
  }

  private formatGE(groupControlNumber: string): string {
    return new SegmentBuilder('GE', this.options)
      .add('1') // GE01 - Number of Transaction Sets Included
      .add(groupControlNumber) // GE02 - Group Control Number
      .build();
  }

  private formatIEA(interchangeControlNumber: string): string {
    return new SegmentBuilder('IEA', this.options)
      .add('1') // IEA01 - Number of Included Functional Groups
      .add(this.padNumber(parseInt(interchangeControlNumber), 9)) // IEA02 - Interchange Control Number
      .build();
  }

  // ============================================================================
  // BHT - Beginning of Hierarchical Transaction
  // ============================================================================

  private formatBHT(
    hierarchicalStructureCode: string,
    transactionSetPurposeCode: string,
    referenceIdentification: string,
    date: string,
    time: string,
    transactionTypeCode: string
  ): string {
    this.segmentCount++;
    return new SegmentBuilder('BHT', this.options)
      .add(hierarchicalStructureCode) // BHT01 - Hierarchical Structure Code
      .add(transactionSetPurposeCode) // BHT02 - Transaction Set Purpose Code
      .add(referenceIdentification) // BHT03 - Reference Identification
      .add(date) // BHT04 - Date
      .add(time) // BHT05 - Time
      .add(transactionTypeCode) // BHT06 - Transaction Type Code
      .build();
  }

  // ============================================================================
  // LOOP 1000A - SUBMITTER NAME
  // ============================================================================

  private formatLoop1000A(provider: BillingProviderInfo): string[] {
    const segments: string[] = [];

    // NM1 - Submitter Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('41') // NM101 - Entity Identifier Code (Submitter)
      .add(provider.entityType) // NM102 - Entity Type Qualifier
      .add(provider.entityType === '2' ? provider.name : provider.lastName)
      .add(provider.entityType === '1' ? provider.firstName : '')
      .add(provider.entityType === '1' ? '' : '') // NM105 - Middle Name
      .add('') // NM106 - Name Prefix
      .add('') // NM107 - Name Suffix
      .add('46') // NM108 - Identification Code Qualifier (ETIN)
      .add(provider.npi) // NM109 - Identification Code
      .build());

    // PER - Submitter EDI Contact Information
    this.segmentCount++;
    segments.push(new SegmentBuilder('PER', this.options)
      .add('IC') // PER01 - Contact Function Code
      .add(provider.contactName || provider.name) // PER02 - Name
      .add('TE') // PER03 - Communication Number Qualifier (Telephone)
      .add(provider.phone || '') // PER04 - Communication Number
      .add(provider.contactEmail ? 'EM' : '') // PER05 - Communication Number Qualifier (Email)
      .add(provider.contactEmail || '') // PER06 - Communication Number
      .build());

    return segments;
  }

  // ============================================================================
  // LOOP 1000B - RECEIVER NAME
  // ============================================================================

  private formatLoop1000B(payer: PayerInfo): string[] {
    const segments: string[] = [];

    // NM1 - Receiver Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('40') // NM101 - Entity Identifier Code (Receiver)
      .add('2') // NM102 - Entity Type Qualifier (Non-Person Entity)
      .add(payer.name) // NM103 - Organization Name
      .add('') // NM104
      .add('') // NM105
      .add('') // NM106
      .add('') // NM107
      .add('46') // NM108 - Identification Code Qualifier (ETIN)
      .add(payer.payerId) // NM109 - Identification Code
      .build());

    return segments;
  }

  // ============================================================================
  // HIERARCHICAL LEVEL (HL)
  // ============================================================================

  private formatHL(hierarchicalIdNumber: string, hierarchicalParentId: string, hierarchicalLevelCode: string, hierarchicalChildCode: string): string {
    this.segmentCount++;
    return new SegmentBuilder('HL', this.options)
      .add(hierarchicalIdNumber) // HL01
      .add(hierarchicalParentId) // HL02
      .add(hierarchicalLevelCode) // HL03
      .add(hierarchicalChildCode) // HL04
      .build();
  }

  // ============================================================================
  // LOOP 2010AA - BILLING PROVIDER NAME (837P)
  // ============================================================================

  private formatLoop2010AA(provider: BillingProviderInfo): string[] {
    const segments: string[] = [];

    // NM1 - Billing Provider Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('85') // NM101 - Entity Identifier Code (Billing Provider)
      .add(provider.entityType) // NM102 - Entity Type Qualifier
      .add(provider.entityType === '2' ? provider.name : provider.lastName)
      .add(provider.entityType === '1' ? provider.firstName : '')
      .add('') // NM105
      .add('') // NM106
      .add(provider.entityType === '1' ? (provider as any).suffix || '' : '')
      .add('XX') // NM108 - Identification Code Qualifier (NPI)
      .add(provider.npi) // NM109 - NPI
      .build());

    // N3 - Billing Provider Address
    this.segmentCount++;
    segments.push(new SegmentBuilder('N3', this.options)
      .add(provider.address1)
      .add(provider.address2 || '')
      .build());

    // N4 - Billing Provider City, State, ZIP
    this.segmentCount++;
    segments.push(new SegmentBuilder('N4', this.options)
      .add(provider.city)
      .add(provider.state)
      .add(provider.zipCode.replace(/-/g, ''))
      .build());

    // REF - Billing Provider Tax ID
    this.segmentCount++;
    segments.push(new SegmentBuilder('REF', this.options)
      .add('EI') // REF01 - Reference Identification Qualifier (Employer's ID Number)
      .add(provider.taxId.replace(/-/g, '')) // REF02 - Reference Identification
      .build());

    return segments;
  }

  // ============================================================================
  // LOOP 2010AA - BILLING PROVIDER NAME (837I)
  // ============================================================================

  private formatLoop2010AAInstitutional(provider: BillingProviderInfo): string[] {
    const segments: string[] = [];

    // NM1 - Billing Provider Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('85') // NM101 - Entity Identifier Code (Billing Provider)
      .add('2') // NM102 - Entity Type Qualifier (Non-Person Entity for 837I)
      .add(provider.name)
      .add('') // NM104
      .add('') // NM105
      .add('') // NM106
      .add('') // NM107
      .add('XX') // NM108 - Identification Code Qualifier (NPI)
      .add(provider.npi) // NM109 - NPI
      .build());

    // N3 - Billing Provider Address
    this.segmentCount++;
    segments.push(new SegmentBuilder('N3', this.options)
      .add(provider.address1)
      .add(provider.address2 || '')
      .build());

    // N4 - Billing Provider City, State, ZIP
    this.segmentCount++;
    segments.push(new SegmentBuilder('N4', this.options)
      .add(provider.city)
      .add(provider.state)
      .add(provider.zipCode.replace(/-/g, ''))
      .build());

    // REF - Billing Provider Tax ID
    this.segmentCount++;
    segments.push(new SegmentBuilder('REF', this.options)
      .add('EI') // REF01 - Reference Identification Qualifier
      .add(provider.taxId.replace(/-/g, ''))
      .build());

    return segments;
  }

  // ============================================================================
  // LOOP 2010AB - PAY-TO ADDRESS (Optional)
  // ============================================================================

  private formatLoop2010AB(provider: BillingProviderInfo): string[] {
    const segments: string[] = [];

    if (!provider.payToAddress1) return segments;

    // NM1 - Pay-To Address Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('87') // NM101 - Entity Identifier Code (Pay-To Provider)
      .add('2') // NM102 - Entity Type Qualifier
      .build());

    // N3 - Pay-To Address
    this.segmentCount++;
    segments.push(new SegmentBuilder('N3', this.options)
      .add(provider.payToAddress1)
      .add(provider.payToAddress2 || '')
      .build());

    // N4 - Pay-To City, State, ZIP
    this.segmentCount++;
    segments.push(new SegmentBuilder('N4', this.options)
      .add(provider.payToCity || '')
      .add(provider.payToState || '')
      .add((provider.payToZipCode || '').replace(/-/g, ''))
      .build());

    return segments;
  }

  // ============================================================================
  // SUBSCRIBER BENEFIT RELATED (SBR)
  // ============================================================================

  private formatSBR(
    payerResponsibilitySequence: string,
    relationshipCode: string,
    groupNumber: string | undefined,
    claimFilingIndicator1: string,
    claimFilingIndicator2: string,
    claimFilingIndicator3: string,
    claimFilingIndicator4: string,
    claimFilingIndicator5: string,
    claimFilingIndicatorCode: string
  ): string {
    this.segmentCount++;
    return new SegmentBuilder('SBR', this.options)
      .add(payerResponsibilitySequence) // SBR01 - Payer Responsibility Sequence Number Code
      .add(relationshipCode) // SBR02 - Individual Relationship Code
      .add(groupNumber || '') // SBR03 - Reference Identification (Group Number)
      .add('') // SBR04 - Name
      .add('') // SBR05 - Insurance Type Code
      .add('') // SBR06
      .add('') // SBR07
      .add('') // SBR08
      .add(claimFilingIndicatorCode) // SBR09 - Claim Filing Indicator Code
      .build();
  }

  // ============================================================================
  // LOOP 2010BA - SUBSCRIBER NAME
  // ============================================================================

  private formatLoop2010BA(subscriber: SubscriberInfo): string[] {
    const segments: string[] = [];

    // NM1 - Subscriber Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('IL') // NM101 - Entity Identifier Code (Insured/Subscriber)
      .add('1') // NM102 - Entity Type Qualifier (Person)
      .add(subscriber.lastName)
      .add(subscriber.firstName)
      .add(subscriber.middleName || '')
      .add('') // NM106 - Name Prefix
      .add(subscriber.suffix || '')
      .add('MI') // NM108 - Identification Code Qualifier (Member ID)
      .add(subscriber.memberId)
      .build());

    // N3 - Subscriber Address (if available)
    if (subscriber.address1) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('N3', this.options)
        .add(subscriber.address1)
        .add(subscriber.address2 || '')
        .build());

      // N4 - Subscriber City, State, ZIP
      this.segmentCount++;
      segments.push(new SegmentBuilder('N4', this.options)
        .add(subscriber.city || '')
        .add(subscriber.state || '')
        .add((subscriber.zipCode || '').replace(/-/g, ''))
        .build());
    }

    // DMG - Subscriber Demographics (if available)
    if (subscriber.dateOfBirth) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('DMG', this.options)
        .add('D8') // DMG01 - Date Time Period Format Qualifier
        .add(this.formatDateCCYYMMDD(new Date(subscriber.dateOfBirth)))
        .add(subscriber.gender || '')
        .build());
    }

    return segments;
  }

  // ============================================================================
  // LOOP 2010BB - PAYER NAME
  // ============================================================================

  private formatLoop2010BB(payer: PayerInfo): string[] {
    const segments: string[] = [];

    // NM1 - Payer Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('PR') // NM101 - Entity Identifier Code (Payer)
      .add('2') // NM102 - Entity Type Qualifier (Non-Person Entity)
      .add(payer.name)
      .add('') // NM104
      .add('') // NM105
      .add('') // NM106
      .add('') // NM107
      .add('PI') // NM108 - Identification Code Qualifier (Payor Identification)
      .add(payer.payerId)
      .build());

    // N3 - Payer Address (if available)
    if (payer.address1) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('N3', this.options)
        .add(payer.address1)
        .add(payer.address2 || '')
        .build());

      // N4 - Payer City, State, ZIP
      this.segmentCount++;
      segments.push(new SegmentBuilder('N4', this.options)
        .add(payer.city || '')
        .add(payer.state || '')
        .add((payer.zipCode || '').replace(/-/g, ''))
        .build());
    }

    return segments;
  }

  // ============================================================================
  // PATIENT INFORMATION (PAT)
  // ============================================================================

  private formatPAT(relationshipCode: string): string {
    this.segmentCount++;
    return new SegmentBuilder('PAT', this.options)
      .add(relationshipCode) // PAT01 - Individual Relationship Code
      .build();
  }

  // ============================================================================
  // LOOP 2010CA - PATIENT NAME
  // ============================================================================

  private formatLoop2010CA(patient: PatientInfo): string[] {
    const segments: string[] = [];

    // NM1 - Patient Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('QC') // NM101 - Entity Identifier Code (Patient)
      .add('1') // NM102 - Entity Type Qualifier (Person)
      .add(patient.lastName)
      .add(patient.firstName)
      .add(patient.middleName || '')
      .add('') // NM106 - Name Prefix
      .add(patient.suffix || '')
      .build());

    // N3 - Patient Address
    this.segmentCount++;
    segments.push(new SegmentBuilder('N3', this.options)
      .add(patient.address1)
      .add(patient.address2 || '')
      .build());

    // N4 - Patient City, State, ZIP
    this.segmentCount++;
    segments.push(new SegmentBuilder('N4', this.options)
      .add(patient.city)
      .add(patient.state)
      .add(patient.zipCode.replace(/-/g, ''))
      .build());

    // DMG - Patient Demographics
    this.segmentCount++;
    segments.push(new SegmentBuilder('DMG', this.options)
      .add('D8') // DMG01 - Date Time Period Format Qualifier
      .add(this.formatDateCCYYMMDD(new Date(patient.dateOfBirth)))
      .add(patient.gender)
      .build());

    return segments;
  }

  // ============================================================================
  // LOOP 2300 - CLAIM INFORMATION (837P)
  // ============================================================================

  private formatLoop2300Professional(claim: ProfessionalClaim): string[] {
    const segments: string[] = [];
    const header = claim.header;

    // CLM - Claim Information
    this.segmentCount++;
    const healthCareServiceLocationInfo = `${claim.serviceFacility ? '12' : '11'}${this.options.componentSeparator}B${this.options.componentSeparator}1`;
    segments.push(new SegmentBuilder('CLM', this.options)
      .add(header.patientControlNumber) // CLM01 - Patient Control Number
      .add(this.formatAmount(header.totalChargeAmount)) // CLM02 - Total Claim Charge Amount
      .add('') // CLM03
      .add('') // CLM04
      .add(healthCareServiceLocationInfo) // CLM05 - Health Care Service Location Information
      .add(header.providerSignatureOnFile ? 'Y' : 'N') // CLM06 - Provider or Supplier Signature Indicator
      .add(header.providerAcceptAssignment ? 'A' : 'C') // CLM07 - Provider Accept Assignment Code
      .add(header.benefitsAssignmentCertification ? 'Y' : 'N') // CLM08 - Benefits Assignment Certification Indicator
      .add(header.releaseOfInformation) // CLM09 - Release of Information Code
      .build());

    // DTP - Date - Onset of Current Illness
    if (header.onsetDate) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('DTP', this.options)
        .add('431') // DTP01 - Date/Time Qualifier (Onset of Current Illness)
        .add('D8') // DTP02 - Date Time Period Format Qualifier
        .add(this.formatDateCCYYMMDD(new Date(header.onsetDate)))
        .build());
    }

    // DTP - Date - Initial Treatment Date
    if (header.initialTreatmentDate) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('DTP', this.options)
        .add('454') // DTP01 - Date/Time Qualifier (Initial Treatment)
        .add('D8')
        .add(this.formatDateCCYYMMDD(new Date(header.initialTreatmentDate)))
        .build());
    }

    // REF - Prior Authorization
    if (header.priorAuthorizationNumber) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('REF', this.options)
        .add('G1') // REF01 - Reference Identification Qualifier (Prior Authorization)
        .add(header.priorAuthorizationNumber)
        .build());
    }

    // REF - Referral Number
    if (header.referralNumber) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('REF', this.options)
        .add('9F') // REF01 - Reference Identification Qualifier (Referral Number)
        .add(header.referralNumber)
        .build());
    }

    // HI - Health Care Diagnosis Codes
    segments.push(...this.formatHIDiagnoses(claim.diagnoses));

    // Referring Provider (Loop 2310A)
    if (claim.referringProvider) {
      segments.push(...this.formatLoop2310A(claim.referringProvider));
    }

    // Rendering Provider (Loop 2310B)
    if (claim.renderingProvider) {
      segments.push(...this.formatLoop2310B(claim.renderingProvider));
    }

    // Service Facility Location (Loop 2310C)
    if (claim.serviceFacility) {
      segments.push(...this.formatLoop2310C(claim.serviceFacility));
    }

    return segments;
  }

  // ============================================================================
  // LOOP 2300 - CLAIM INFORMATION (837I)
  // ============================================================================

  private formatLoop2300Institutional(claim: InstitutionalClaim): string[] {
    const segments: string[] = [];
    const header = claim.header;

    // CLM - Claim Information
    this.segmentCount++;
    const facilityTypeCode = header.facilityTypeCode || '11';
    const frequencyCode = header.claimFrequencyCode || '1';
    const healthCareServiceLocationInfo = `${facilityTypeCode}${this.options.componentSeparator}${this.options.componentSeparator}${frequencyCode}`;

    segments.push(new SegmentBuilder('CLM', this.options)
      .add(header.patientControlNumber)
      .add(this.formatAmount(header.totalChargeAmount))
      .add('')
      .add('')
      .add(healthCareServiceLocationInfo)
      .add(header.providerSignatureOnFile ? 'Y' : 'N')
      .add(header.providerAcceptAssignment ? 'A' : 'C')
      .add(header.benefitsAssignmentCertification ? 'Y' : 'N')
      .add(header.releaseOfInformation)
      .build());

    // DTP - Statement Dates
    this.segmentCount++;
    segments.push(new SegmentBuilder('DTP', this.options)
      .add('434') // DTP01 - Date/Time Qualifier (Statement)
      .add('RD8') // DTP02 - Date Time Period Format Qualifier (Range)
      .add(`${this.formatDateCCYYMMDD(new Date(claim.statementFromDate))}-${this.formatDateCCYYMMDD(new Date(claim.statementThroughDate))}`)
      .build());

    // DTP - Admission Date
    if (header.admissionDate) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('DTP', this.options)
        .add('435') // Admission Date/Time
        .add('DT') // Date and Time
        .add(`${this.formatDateCCYYMMDD(new Date(header.admissionDate))}${header.admissionHour || '0000'}`)
        .build());
    }

    // DTP - Discharge Date
    if (header.dischargeDate) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('DTP', this.options)
        .add('096') // Discharge Date
        .add('TM') // Time
        .add(header.dischargeHour || '0000')
        .build());
    }

    // CL1 - Institutional Claim Code
    this.segmentCount++;
    segments.push(new SegmentBuilder('CL1', this.options)
      .add(header.admissionTypeCode || '') // CL101 - Admission Type Code
      .add(header.admissionSourceCode || '') // CL102 - Admission Source Code
      .add(header.patientStatusCode || '') // CL103 - Patient Status Code
      .build());

    // REF - Prior Authorization
    if (header.priorAuthorizationNumber) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('REF', this.options)
        .add('G1')
        .add(header.priorAuthorizationNumber)
        .build());
    }

    // HI - Health Care Diagnosis Codes
    segments.push(...this.formatHIDiagnosesInstitutional(claim.diagnoses));

    // HI - Condition Codes
    if (claim.conditionCodes && claim.conditionCodes.length > 0) {
      segments.push(this.formatHIConditionCodes(claim.conditionCodes));
    }

    // HI - Occurrence Codes
    if (claim.occurrenceCodes && claim.occurrenceCodes.length > 0) {
      segments.push(...this.formatHIOccurrenceCodes(claim.occurrenceCodes));
    }

    // HI - Value Codes
    if (claim.valueCodes && claim.valueCodes.length > 0) {
      segments.push(...this.formatHIValueCodes(claim.valueCodes));
    }

    // HI - Principal Procedure (837I)
    if (claim.principalProcedure) {
      segments.push(this.formatHIPrincipalProcedure(claim.principalProcedure));
    }

    // Attending Provider (Loop 2310A for 837I)
    if (claim.attendingProvider) {
      segments.push(...this.formatLoop2310AInstitutional(claim.attendingProvider));
    }

    // Operating Provider (Loop 2310B for 837I)
    if (claim.operatingProvider) {
      segments.push(...this.formatLoop2310BInstitutional(claim.operatingProvider));
    }

    return segments;
  }

  // ============================================================================
  // HI - HEALTH CARE DIAGNOSIS CODES
  // ============================================================================

  private formatHIDiagnoses(diagnoses: DiagnosisSet): string[] {
    const segments: string[] = [];

    // Principal Diagnosis
    this.segmentCount++;
    const principalCode = diagnoses.principal.code.replace('.', '');
    segments.push(new SegmentBuilder('HI', this.options)
      .addComponent(diagnoses.principal.qualifier, principalCode)
      .build());

    // Secondary Diagnoses (up to 11 per HI segment)
    if (diagnoses.secondary && diagnoses.secondary.length > 0) {
      for (let i = 0; i < diagnoses.secondary.length; i += 11) {
        this.segmentCount++;
        const batch = diagnoses.secondary.slice(i, i + 11);
        const builder = new SegmentBuilder('HI', this.options);

        for (const diag of batch) {
          const code = diag.code.replace('.', '');
          builder.addComponent(diag.qualifier, code);
        }

        segments.push(builder.build());
      }
    }

    return segments;
  }

  private formatHIDiagnosesInstitutional(diagnoses: DiagnosisSet): string[] {
    const segments: string[] = [];

    // Principal Diagnosis (BK qualifier for 837I)
    this.segmentCount++;
    const principalCode = diagnoses.principal.code.replace('.', '');
    segments.push(new SegmentBuilder('HI', this.options)
      .addComponent('BK', principalCode)
      .build());

    // Admitting Diagnosis
    if (diagnoses.admitting) {
      this.segmentCount++;
      const admittingCode = diagnoses.admitting.code.replace('.', '');
      segments.push(new SegmentBuilder('HI', this.options)
        .addComponent('BJ', admittingCode)
        .build());
    }

    // Secondary Diagnoses (BF qualifier)
    if (diagnoses.secondary && diagnoses.secondary.length > 0) {
      this.segmentCount++;
      const builder = new SegmentBuilder('HI', this.options);

      for (const diag of diagnoses.secondary.slice(0, 11)) {
        const code = diag.code.replace('.', '');
        builder.addComponent('BF', code);
      }

      segments.push(builder.build());
    }

    // Patient Reason for Visit
    if (diagnoses.patientReasonForVisit && diagnoses.patientReasonForVisit.length > 0) {
      this.segmentCount++;
      const builder = new SegmentBuilder('HI', this.options);

      for (const diag of diagnoses.patientReasonForVisit.slice(0, 3)) {
        const code = diag.code.replace('.', '');
        builder.addComponent('PR', code);
      }

      segments.push(builder.build());
    }

    // External Cause of Injury
    if (diagnoses.externalCause && diagnoses.externalCause.length > 0) {
      this.segmentCount++;
      const builder = new SegmentBuilder('HI', this.options);

      for (const diag of diagnoses.externalCause.slice(0, 12)) {
        const code = diag.code.replace('.', '');
        builder.addComponent('BN', code);
      }

      segments.push(builder.build());
    }

    return segments;
  }

  private formatHIConditionCodes(conditionCodes: ConditionCode[]): string {
    this.segmentCount++;
    const builder = new SegmentBuilder('HI', this.options);

    for (const cc of conditionCodes.slice(0, 11)) {
      builder.addComponent('BG', cc.code);
    }

    return builder.build();
  }

  private formatHIOccurrenceCodes(occurrenceCodes: OccurrenceCode[]): string[] {
    const segments: string[] = [];

    for (let i = 0; i < occurrenceCodes.length; i += 11) {
      this.segmentCount++;
      const batch = occurrenceCodes.slice(i, i + 11);
      const builder = new SegmentBuilder('HI', this.options);

      for (const oc of batch) {
        builder.addComponent('BH', oc.code, 'D8', this.formatDateCCYYMMDD(new Date(oc.date)));
      }

      segments.push(builder.build());
    }

    return segments;
  }

  private formatHIValueCodes(valueCodes: ValueCode[]): string[] {
    const segments: string[] = [];

    for (let i = 0; i < valueCodes.length; i += 12) {
      this.segmentCount++;
      const batch = valueCodes.slice(i, i + 12);
      const builder = new SegmentBuilder('HI', this.options);

      for (const vc of batch) {
        builder.addComponent('BE', vc.code, '', '', '', this.formatAmount(vc.amount));
      }

      segments.push(builder.build());
    }

    return segments;
  }

  private formatHIPrincipalProcedure(procedure: InstitutionalProcedure): string {
    this.segmentCount++;
    return new SegmentBuilder('HI', this.options)
      .addComponent(procedure.qualifier, procedure.code, 'D8', this.formatDateCCYYMMDD(new Date(procedure.date)))
      .build();
  }

  // ============================================================================
  // LOOP 2310A - REFERRING PROVIDER (837P)
  // ============================================================================

  private formatLoop2310A(provider: ReferringProviderInfo): string[] {
    const segments: string[] = [];

    // NM1 - Referring Provider Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('DN') // NM101 - Entity Identifier Code (Referring Provider)
      .add('1') // NM102 - Entity Type Qualifier (Person)
      .add(provider.lastName)
      .add(provider.firstName)
      .add('') // NM105
      .add('') // NM106
      .add('') // NM107
      .add('XX') // NM108 - Identification Code Qualifier (NPI)
      .add(provider.npi)
      .build());

    return segments;
  }

  // ============================================================================
  // LOOP 2310B - RENDERING PROVIDER (837P)
  // ============================================================================

  private formatLoop2310B(provider: RenderingProviderInfo): string[] {
    const segments: string[] = [];

    // NM1 - Rendering Provider Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('82') // NM101 - Entity Identifier Code (Rendering Provider)
      .add(provider.entityType)
      .add(provider.entityType === '2' ? provider.name : provider.lastName)
      .add(provider.entityType === '1' ? provider.firstName : '')
      .add('') // NM105
      .add('') // NM106
      .add('') // NM107
      .add('XX')
      .add(provider.npi)
      .build());

    // PRV - Rendering Provider Specialty
    if (provider.taxonomyCode) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('PRV', this.options)
        .add('PE') // PRV01 - Provider Code (Performing)
        .add('PXC') // PRV02 - Reference Identification Qualifier (Healthcare Provider Taxonomy)
        .add(provider.taxonomyCode)
        .build());
    }

    return segments;
  }

  // ============================================================================
  // LOOP 2310C - SERVICE FACILITY LOCATION (837P)
  // ============================================================================

  private formatLoop2310C(facility: FacilityInfo): string[] {
    const segments: string[] = [];

    // NM1 - Service Facility Location Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('77') // NM101 - Entity Identifier Code (Service Facility Location)
      .add('2') // NM102 - Entity Type Qualifier (Non-Person Entity)
      .add(facility.name)
      .add('') // NM104
      .add('') // NM105
      .add('') // NM106
      .add('') // NM107
      .add('XX')
      .add(facility.npi)
      .build());

    // N3 - Service Facility Address
    this.segmentCount++;
    segments.push(new SegmentBuilder('N3', this.options)
      .add(facility.address1)
      .add(facility.address2 || '')
      .build());

    // N4 - Service Facility City, State, ZIP
    this.segmentCount++;
    segments.push(new SegmentBuilder('N4', this.options)
      .add(facility.city)
      .add(facility.state)
      .add(facility.zipCode.replace(/-/g, ''))
      .build());

    return segments;
  }

  // ============================================================================
  // LOOP 2310A - ATTENDING PROVIDER (837I)
  // ============================================================================

  private formatLoop2310AInstitutional(provider: ProviderInfo): string[] {
    const segments: string[] = [];

    // NM1 - Attending Provider Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('71') // NM101 - Entity Identifier Code (Attending Provider)
      .add('1') // NM102 - Entity Type Qualifier (Person)
      .add(provider.lastName || provider.name)
      .add(provider.firstName || '')
      .add('') // NM105
      .add('') // NM106
      .add('') // NM107
      .add('XX')
      .add(provider.npi)
      .build());

    // PRV - Attending Provider Specialty
    if (provider.taxonomyCode) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('PRV', this.options)
        .add('AT') // PRV01 - Provider Code (Attending)
        .add('PXC')
        .add(provider.taxonomyCode)
        .build());
    }

    return segments;
  }

  // ============================================================================
  // LOOP 2310B - OPERATING PROVIDER (837I)
  // ============================================================================

  private formatLoop2310BInstitutional(provider: ProviderInfo): string[] {
    const segments: string[] = [];

    // NM1 - Operating Provider Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('72') // NM101 - Entity Identifier Code (Operating Provider)
      .add('1')
      .add(provider.lastName || provider.name)
      .add(provider.firstName || '')
      .add('') // NM105
      .add('') // NM106
      .add('') // NM107
      .add('XX')
      .add(provider.npi)
      .build());

    return segments;
  }

  // ============================================================================
  // LOOP 2400 - SERVICE LINE (837P)
  // ============================================================================

  private formatLoop2400Professional(
    line: ProcedureInfo,
    lineSequence: number,
    diagnoses: DiagnosisSet
  ): string[] {
    const segments: string[] = [];

    // LX - Service Line Number
    this.segmentCount++;
    segments.push(new SegmentBuilder('LX', this.options)
      .add(lineSequence.toString())
      .build());

    // SV1 - Professional Service
    this.segmentCount++;
    const procedureCode = `${line.qualifier || 'HC'}${this.options.componentSeparator}${line.code}`;
    const modifiers = line.modifiers
      ? line.modifiers.map(m => this.options.componentSeparator + m).join('')
      : '';

    // Map diagnosis pointers to actual positions
    const diagPointers = line.diagnosisPointers
      .map(p => p.toString())
      .join(this.options.componentSeparator);

    segments.push(new SegmentBuilder('SV1', this.options)
      .add(procedureCode + modifiers) // SV101 - Composite Medical Procedure Identifier
      .add(this.formatAmount(line.chargeAmount)) // SV102 - Line Item Charge Amount
      .add(line.unitType || 'UN') // SV103 - Unit or Basis for Measurement Code
      .add(line.units.toString()) // SV104 - Service Unit Count
      .add(line.placeOfService) // SV105 - Place of Service Code
      .add('') // SV106
      .add(diagPointers) // SV107 - Composite Diagnosis Code Pointer
      .build());

    // DTP - Service Date
    this.segmentCount++;
    if (line.serviceEndDate && line.serviceEndDate !== line.serviceDate) {
      segments.push(new SegmentBuilder('DTP', this.options)
        .add('472') // DTP01 - Date/Time Qualifier (Service)
        .add('RD8') // DTP02 - Date Time Period Format Qualifier (Range)
        .add(`${this.formatDateCCYYMMDD(new Date(line.serviceDate))}-${this.formatDateCCYYMMDD(new Date(line.serviceEndDate))}`)
        .build());
    } else {
      segments.push(new SegmentBuilder('DTP', this.options)
        .add('472')
        .add('D8')
        .add(this.formatDateCCYYMMDD(new Date(line.serviceDate)))
        .build());
    }

    // REF - Line Item Control Number
    if (line.lineItemControlNumber) {
      this.segmentCount++;
      segments.push(new SegmentBuilder('REF', this.options)
        .add('6R')
        .add(line.lineItemControlNumber)
        .build());
    }

    // Rendering Provider at Line Level (if different from claim level)
    if (line.renderingProvider) {
      segments.push(...this.formatLoop2420A(line.renderingProvider));
    }

    return segments;
  }

  // ============================================================================
  // LOOP 2400 - SERVICE LINE (837I)
  // ============================================================================

  private formatLoop2400Institutional(line: RevenueCodeLine, lineSequence: number): string[] {
    const segments: string[] = [];

    // LX - Service Line Number
    this.segmentCount++;
    segments.push(new SegmentBuilder('LX', this.options)
      .add(lineSequence.toString())
      .build());

    // SV2 - Institutional Service Line
    this.segmentCount++;
    let procedureComponent = line.revenueCode;
    if (line.procedureCode) {
      const modifiers = line.modifiers
        ? line.modifiers.map(m => this.options.componentSeparator + m).join('')
        : '';
      procedureComponent = `HC${this.options.componentSeparator}${line.procedureCode}${modifiers}`;
    }

    segments.push(new SegmentBuilder('SV2', this.options)
      .add(line.revenueCode) // SV201 - Revenue Code
      .add(line.procedureCode ? procedureComponent : '') // SV202 - Composite Medical Procedure Identifier
      .add(this.formatAmount(line.chargeAmount)) // SV203 - Line Item Charge Amount
      .add('UN') // SV204 - Unit or Basis for Measurement Code
      .add(line.units.toString()) // SV205 - Service Unit Count
      .add(line.unitRate ? this.formatAmount(line.unitRate) : '') // SV206 - Unit Rate
      .add(line.nonCoveredCharges ? this.formatAmount(line.nonCoveredCharges) : '') // SV207 - Non-Covered Charge Amount
      .build());

    // DTP - Service Date
    this.segmentCount++;
    segments.push(new SegmentBuilder('DTP', this.options)
      .add('472')
      .add('D8')
      .add(this.formatDateCCYYMMDD(new Date(line.serviceDate)))
      .build());

    return segments;
  }

  // ============================================================================
  // LOOP 2420A - RENDERING PROVIDER (LINE LEVEL)
  // ============================================================================

  private formatLoop2420A(provider: RenderingProviderInfo): string[] {
    const segments: string[] = [];

    // NM1 - Rendering Provider Name
    this.segmentCount++;
    segments.push(new SegmentBuilder('NM1', this.options)
      .add('82')
      .add(provider.entityType)
      .add(provider.entityType === '2' ? provider.name : provider.lastName)
      .add(provider.entityType === '1' ? provider.firstName : '')
      .add('')
      .add('')
      .add('')
      .add('XX')
      .add(provider.npi)
      .build());

    return segments;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private formatDateCCYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private formatDateYYMMDD(date: Date): string {
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}${minutes}`;
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  private padNumber(num: number, length: number): string {
    return String(num).padStart(length, '0');
  }

  private padRight(str: string, length: number): string {
    return str.padEnd(length, ' ');
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Format a Professional Claim (837P)
 */
export function formatProfessionalClaim(
  claim: ProfessionalClaim,
  interchange: InterchangeInfo,
  functionalGroup: FunctionalGroupInfo,
  options?: FormatterOptions
): string {
  const formatter = new X12837Formatter(options);
  return formatter.formatProfessionalClaim(claim, interchange, functionalGroup);
}

/**
 * Format an Institutional Claim (837I)
 */
export function formatInstitutionalClaim(
  claim: InstitutionalClaim,
  interchange: InterchangeInfo,
  functionalGroup: FunctionalGroupInfo,
  options?: FormatterOptions
): string {
  const formatter = new X12837Formatter(options);
  return formatter.formatInstitutionalClaim(claim, interchange, functionalGroup);
}

/**
 * Generate interchange control number
 */
export function generateInterchangeControlNumber(): string {
  return String(Math.floor(Math.random() * 999999999)).padStart(9, '0');
}

/**
 * Generate group control number
 */
export function generateGroupControlNumber(): string {
  return String(Math.floor(Math.random() * 999999999));
}

/**
 * Generate transaction set control number
 */
export function generateTransactionSetControlNumber(): string {
  return String(Math.floor(Math.random() * 9999)).padStart(4, '0');
}

/**
 * Create default interchange info
 */
export function createDefaultInterchangeInfo(
  senderId: string,
  receiverId: string,
  options: { isProduction?: boolean; senderQualifier?: string; receiverQualifier?: string } = {}
): InterchangeInfo {
  const now = new Date();
  return {
    senderId,
    senderIdQualifier: options.senderQualifier || 'ZZ',
    receiverId,
    receiverIdQualifier: options.receiverQualifier || 'ZZ',
    interchangeControlNumber: generateInterchangeControlNumber(),
    interchangeDate: String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0'),
    interchangeTime: String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0'),
    version: '00501',
    acknowledgmentRequested: '1',
    usageIndicator: options.isProduction ? 'P' : 'T',
  };
}

/**
 * Create default functional group info
 */
export function createDefaultFunctionalGroupInfo(
  applicationSenderCode: string,
  applicationReceiverCode: string,
  claimType: 'professional' | 'institutional'
): FunctionalGroupInfo {
  const now = new Date();
  return {
    functionalIdentifierCode: 'HC',
    applicationSenderCode,
    applicationReceiverCode,
    groupControlNumber: generateGroupControlNumber(),
    groupDate: String(now.getFullYear()) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0'),
    groupTime: String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0'),
    responsibleAgencyCode: 'X',
    versionIdentifier: claimType === 'professional' ? IMPL_CONV_REF_837P : IMPL_CONV_REF_837I,
  };
}
