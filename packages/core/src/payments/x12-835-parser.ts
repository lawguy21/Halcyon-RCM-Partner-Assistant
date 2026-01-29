/**
 * X12 835 ERA Parser
 * Parses X12 835 Electronic Remittance Advice files
 */

import type {
  PaymentRemittance,
  ClaimPayment,
  ServicePayment,
  AdjustmentInfo,
  PayerPayeeInfo,
  FinancialInfo,
  TraceNumber,
  ProviderLevelAdjustment,
  PaymentSummary,
  ClaimPaymentStatus,
  PaymentMethod,
  CARCAdjustmentGroup,
  PatientInfo,
  InsuredInfo,
  ProviderInfo,
  InpatientAdjudication,
  OutpatientAdjudication,
  ClaimReference,
  ClaimDate,
  ClaimAmount,
  ClaimQuantity,
  ServiceReference,
  ServiceDate,
  ContactInfo,
  AddressInfo,
} from './payment-types.js';

// ============================================================================
// SEGMENT TYPES
// ============================================================================

interface Segment {
  id: string;
  elements: string[];
  raw: string;
}

interface ParsedX12 {
  segments: Segment[];
  elementSeparator: string;
  segmentTerminator: string;
  componentSeparator: string;
}

// ============================================================================
// CLAIM STATUS CODE DESCRIPTIONS
// ============================================================================

const CLAIM_STATUS_DESCRIPTIONS: Record<string, string> = {
  '1': 'Processed as Primary',
  '2': 'Processed as Secondary',
  '3': 'Processed as Tertiary',
  '4': 'Denied',
  '19': 'Processed as Primary, Forwarded to Additional Payer(s)',
  '20': 'Processed as Secondary, Forwarded to Additional Payer(s)',
  '21': 'Processed as Tertiary, Forwarded to Additional Payer(s)',
  '22': 'Reversal of Previous Payment',
  '23': 'Not Our Claim, Forwarded to Another Payer(s)',
  '25': 'Predetermination Pricing Only - No Payment',
};

// ============================================================================
// PARSER CLASS
// ============================================================================

export class X12835Parser {
  private parsed: ParsedX12 | null = null;
  private currentIndex: number = 0;

  /**
   * Parse raw X12 835 content into structured data
   */
  parse835File(content: string): PaymentRemittance {
    // Normalize line endings and trim
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    // Parse the X12 structure
    this.parsed = this.parseX12Structure(normalizedContent);
    this.currentIndex = 0;

    // Parse all components
    const isaSegment = this.findSegment('ISA');
    const gsSegment = this.findSegment('GS');
    const stSegment = this.findSegment('ST');
    const bprSegment = this.findSegment('BPR');
    const trnSegment = this.findSegment('TRN');

    if (!isaSegment || !gsSegment || !stSegment || !bprSegment || !trnSegment) {
      throw new Error('Invalid 835 file: missing required segments (ISA, GS, ST, BPR, or TRN)');
    }

    // Parse header information
    const financialInfo = this.parseBPR(bprSegment);
    const traceNumber = this.parseTRN(trnSegment);

    // Parse receiver identification (REF*EV)
    const receiverRef = this.findSegmentWithQualifier('REF', 'EV');
    const receiverId = receiverRef ? receiverRef.elements[2] : undefined;

    // Parse production date
    const productionDateSeg = this.findSegmentWithQualifier('DTM', '405');
    const productionDate = productionDateSeg ? productionDateSeg.elements[2] : undefined;

    // Parse payer and payee (N1 loops)
    const payer = this.parsePayerPayee('PR');
    const payee = this.parsePayerPayee('PE');

    // Parse all claims (CLP loops)
    const claims = this.parseAllClaims();

    // Parse provider-level adjustments (PLB segments)
    const providerAdjustments = this.parseProviderAdjustments();

    // Calculate summary
    const summary = this.calculateSummary(claims, providerAdjustments, financialInfo.totalAmount);

    return {
      interchangeSenderId: isaSegment.elements[6]?.trim() || '',
      interchangeReceiverId: isaSegment.elements[8]?.trim() || '',
      interchangeDate: isaSegment.elements[9] || '',
      interchangeTime: isaSegment.elements[10] || '',
      interchangeControlNumber: isaSegment.elements[13] || '',
      groupControlNumber: gsSegment.elements[6] || '',
      transactionSetControlNumber: stSegment.elements[2] || '',
      financialInfo,
      traceNumber,
      receiverId,
      productionDate,
      payer,
      payee,
      claims,
      providerAdjustments,
      summary,
      rawContent: content,
      processedAt: new Date(),
      status: 'PENDING',
    };
  }

  /**
   * Parse X12 structure and extract segments
   */
  private parseX12Structure(content: string): ParsedX12 {
    // ISA segment is always 106 characters (fixed length), or we detect separators from ISA
    // Element separator is character at position 3 (0-indexed)
    // Component separator is ISA16
    // Segment terminator follows ISA

    if (content.length < 106) {
      throw new Error('Invalid X12 file: content too short');
    }

    // ISA must start the file
    if (!content.startsWith('ISA')) {
      throw new Error('Invalid X12 file: must start with ISA segment');
    }

    // Element separator is character at position 3
    const elementSeparator = content.charAt(3);

    // Find component separator (ISA16, position 104)
    const componentSeparator = content.charAt(104);

    // Segment terminator follows ISA segment
    // ISA has 16 elements, each element position can vary, but total is ~106 chars
    // Find the end of ISA to determine segment terminator
    let isaEndPos = 105;
    const segmentTerminator = content.charAt(isaEndPos);

    // Handle cases where terminator might be followed by newline
    let terminatorWithNewline = segmentTerminator;
    if (content.charAt(isaEndPos + 1) === '\n') {
      terminatorWithNewline = segmentTerminator + '\n';
    }

    // Split content into segments
    const segmentStrings = content.split(new RegExp(`[${this.escapeRegex(segmentTerminator)}]`))
      .map(s => s.replace(/^\n+|\n+$/g, '').trim())
      .filter(s => s.length > 0);

    const segments: Segment[] = segmentStrings.map(segStr => {
      const elements = segStr.split(elementSeparator);
      return {
        id: elements[0],
        elements,
        raw: segStr,
      };
    });

    return {
      segments,
      elementSeparator,
      segmentTerminator,
      componentSeparator,
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Find a segment by ID
   */
  private findSegment(id: string, startFrom: number = 0): Segment | null {
    if (!this.parsed) return null;

    for (let i = startFrom; i < this.parsed.segments.length; i++) {
      if (this.parsed.segments[i].id === id) {
        return this.parsed.segments[i];
      }
    }
    return null;
  }

  /**
   * Find segment with specific qualifier in element 1
   */
  private findSegmentWithQualifier(id: string, qualifier: string, startFrom: number = 0): Segment | null {
    if (!this.parsed) return null;

    for (let i = startFrom; i < this.parsed.segments.length; i++) {
      if (this.parsed.segments[i].id === id && this.parsed.segments[i].elements[1] === qualifier) {
        return this.parsed.segments[i];
      }
    }
    return null;
  }

  /**
   * Find all segments by ID
   */
  private findAllSegments(id: string, startFrom: number = 0, endAt?: number): Segment[] {
    if (!this.parsed) return [];

    const result: Segment[] = [];
    const end = endAt ?? this.parsed.segments.length;

    for (let i = startFrom; i < end; i++) {
      if (this.parsed.segments[i].id === id) {
        result.push(this.parsed.segments[i]);
      }
    }
    return result;
  }

  /**
   * Find segment index
   */
  private findSegmentIndex(id: string, startFrom: number = 0): number {
    if (!this.parsed) return -1;

    for (let i = startFrom; i < this.parsed.segments.length; i++) {
      if (this.parsed.segments[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get segments between two indices
   */
  private getSegmentsBetween(startIndex: number, endIndex: number): Segment[] {
    if (!this.parsed) return [];
    return this.parsed.segments.slice(startIndex, endIndex);
  }

  /**
   * Parse BPR (Financial Information) segment
   */
  private parseBPR(segment: Segment): FinancialInfo {
    const elements = segment.elements;

    return {
      transactionHandlingCode: elements[1] || '',
      totalAmount: parseFloat(elements[2]) || 0,
      creditDebitFlag: (elements[3] || 'C') as 'C' | 'D',
      paymentMethod: (elements[4] || 'CHK') as PaymentMethod,
      paymentFormat: elements[5] || undefined,
      senderBankIdQualifier: elements[6] || undefined,
      senderBankId: elements[7] || undefined,
      senderAccountQualifier: elements[8] || undefined,
      senderAccountNumber: elements[9] || undefined,
      originatingCompanyId: elements[10] || undefined,
      receiverBankIdQualifier: elements[12] || undefined,
      receiverBankId: elements[13] || undefined,
      receiverAccountQualifier: elements[14] || undefined,
      receiverAccountNumber: elements[15] || undefined,
      effectiveDate: elements[16] || undefined,
    };
  }

  /**
   * Parse TRN (Trace Number) segment
   */
  private parseTRN(segment: Segment): TraceNumber {
    const elements = segment.elements;

    return {
      traceType: elements[1] || '',
      traceNumber: elements[2] || '',
      originatingCompanyId: elements[3] || undefined,
      originatingCompanySupplementalCode: elements[4] || undefined,
    };
  }

  /**
   * Parse N1 loop for Payer (PR) or Payee (PE)
   */
  private parsePayerPayee(entityCode: 'PR' | 'PE'): PayerPayeeInfo {
    if (!this.parsed) {
      return this.getEmptyPayerPayee(entityCode);
    }

    // Find N1 segment with the entity code
    const n1Index = this.findN1Index(entityCode);
    if (n1Index === -1) {
      return this.getEmptyPayerPayee(entityCode);
    }

    const n1Segment = this.parsed.segments[n1Index];
    const elements = n1Segment.elements;

    // Find end of this N1 loop (next N1 or HL or CLP)
    let endIndex = this.parsed.segments.length;
    for (let i = n1Index + 1; i < this.parsed.segments.length; i++) {
      const seg = this.parsed.segments[i];
      if (seg.id === 'N1' || seg.id === 'HL' || seg.id === 'CLP') {
        endIndex = i;
        break;
      }
    }

    // Get all segments in this loop
    const loopSegments = this.getSegmentsBetween(n1Index, endIndex);

    // Parse additional IDs (N1, REF segments)
    const additionalIds: Array<{ qualifier: string; id: string }> = [];
    const refSegments = loopSegments.filter(s => s.id === 'REF');
    for (const ref of refSegments) {
      if (ref.elements[1] && ref.elements[2]) {
        additionalIds.push({
          qualifier: ref.elements[1],
          id: ref.elements[2],
        });
      }
    }

    // Parse contact info (PER segment)
    const perSegment = loopSegments.find(s => s.id === 'PER');
    const contact = perSegment ? this.parsePER(perSegment) : undefined;

    // Parse address (N3/N4 segments)
    const n3Segment = loopSegments.find(s => s.id === 'N3');
    const n4Segment = loopSegments.find(s => s.id === 'N4');
    const address = this.parseAddress(n3Segment, n4Segment);

    return {
      entityType: entityCode,
      name: elements[2] || '',
      idQualifier: elements[3] || undefined,
      id: elements[4] || undefined,
      additionalIds,
      contact,
      address,
    };
  }

  /**
   * Find index of N1 segment with specific entity code
   */
  private findN1Index(entityCode: string): number {
    if (!this.parsed) return -1;

    for (let i = 0; i < this.parsed.segments.length; i++) {
      if (this.parsed.segments[i].id === 'N1' &&
          this.parsed.segments[i].elements[1] === entityCode) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Parse PER (Contact) segment
   */
  private parsePER(segment: Segment): ContactInfo {
    const elements = segment.elements;
    const contact: ContactInfo = {};

    contact.name = elements[2] || undefined;

    // Parse communication number pairs (elements 3-4, 5-6, 7-8)
    for (let i = 3; i <= 7; i += 2) {
      const qualifier = elements[i];
      const value = elements[i + 1];
      if (qualifier && value) {
        switch (qualifier) {
          case 'TE': contact.phoneNumber = value; break;
          case 'FX': contact.faxNumber = value; break;
          case 'EM': contact.email = value; break;
          case 'UR': contact.url = value; break;
        }
      }
    }

    return contact;
  }

  /**
   * Parse address from N3/N4 segments
   */
  private parseAddress(n3?: Segment, n4?: Segment): AddressInfo | undefined {
    if (!n3 && !n4) return undefined;

    const address: AddressInfo = {};

    if (n3) {
      address.addressLine1 = n3.elements[1] || undefined;
      address.addressLine2 = n3.elements[2] || undefined;
    }

    if (n4) {
      address.city = n4.elements[1] || undefined;
      address.state = n4.elements[2] || undefined;
      address.zipCode = n4.elements[3] || undefined;
      address.country = n4.elements[4] || undefined;
    }

    return address;
  }

  /**
   * Get empty payer/payee structure
   */
  private getEmptyPayerPayee(entityCode: 'PR' | 'PE'): PayerPayeeInfo {
    return {
      entityType: entityCode,
      name: '',
      additionalIds: [],
    };
  }

  /**
   * Parse all CLP (Claim) loops
   */
  private parseAllClaims(): ClaimPayment[] {
    if (!this.parsed) return [];

    const claims: ClaimPayment[] = [];

    // Find all CLP segment indices
    const clpIndices: number[] = [];
    for (let i = 0; i < this.parsed.segments.length; i++) {
      if (this.parsed.segments[i].id === 'CLP') {
        clpIndices.push(i);
      }
    }

    // Parse each claim loop
    for (let i = 0; i < clpIndices.length; i++) {
      const startIndex = clpIndices[i];
      const endIndex = clpIndices[i + 1] ?? this.findSegmentIndex('PLB', startIndex) ?? this.findSegmentIndex('SE', startIndex) ?? this.parsed.segments.length;

      const claim = this.parseClaimLoop(startIndex, endIndex);
      claims.push(claim);
    }

    return claims;
  }

  /**
   * Parse a single CLP (Claim) loop
   */
  private parseClaimLoop(startIndex: number, endIndex: number): ClaimPayment {
    if (!this.parsed) {
      throw new Error('Parser not initialized');
    }

    const loopSegments = this.getSegmentsBetween(startIndex, endIndex);
    const clpSegment = loopSegments[0];
    const elements = clpSegment.elements;

    // Parse CLP segment
    const statusCode = elements[2] || 'OTHER';
    const claim: ClaimPayment = {
      claimNumber: elements[1] || '',
      status: this.normalizeStatusCode(statusCode),
      statusDescription: CLAIM_STATUS_DESCRIPTIONS[statusCode] || 'Unknown Status',
      billedAmount: parseFloat(elements[3]) || 0,
      paidAmount: parseFloat(elements[4]) || 0,
      patientResponsibility: parseFloat(elements[5]) || 0,
      filingIndicator: elements[6] || undefined,
      payerClaimControlNumber: elements[7] || undefined,
      facilityTypeCode: elements[8] || undefined,
      frequencyCode: elements[9] || undefined,
      drgCode: elements[11] || undefined,
      drgWeight: elements[12] ? parseFloat(elements[12]) : undefined,
      dischargeFraction: elements[13] ? parseFloat(elements[13]) : undefined,
      patient: { lastName: '', firstName: '' },
      adjustments: [],
      services: [],
      references: [],
      dates: [],
      amounts: [],
      quantities: [],
    };

    // Find service line boundaries
    const svcIndices: number[] = [];
    for (let i = 0; i < loopSegments.length; i++) {
      if (loopSegments[i].id === 'SVC') {
        svcIndices.push(i);
      }
    }

    // Parse claim-level segments (before first SVC)
    const claimLevelEnd = svcIndices.length > 0 ? svcIndices[0] : loopSegments.length;

    for (let i = 1; i < claimLevelEnd; i++) {
      const seg = loopSegments[i];
      switch (seg.id) {
        case 'CAS':
          claim.adjustments.push(this.parseCAS(seg));
          break;
        case 'NM1':
          this.parseClaimNM1(seg, claim);
          break;
        case 'MIA':
          claim.inpatientAdjudication = this.parseMIA(seg);
          break;
        case 'MOA':
          claim.outpatientAdjudication = this.parseMOA(seg);
          break;
        case 'REF':
          claim.references.push(this.parseClaimREF(seg));
          break;
        case 'DTM':
          claim.dates.push(this.parseClaimDTM(seg));
          break;
        case 'AMT':
          claim.amounts.push(this.parseAMT(seg));
          break;
        case 'QTY':
          claim.quantities.push(this.parseQTY(seg));
          break;
        case 'PER':
          // Contact info for claim - typically corrections
          break;
      }
    }

    // Parse service lines
    for (let i = 0; i < svcIndices.length; i++) {
      const svcStart = svcIndices[i];
      const svcEnd = svcIndices[i + 1] ?? loopSegments.length;
      const service = this.parseServiceLoop(loopSegments.slice(svcStart, svcEnd), i + 1);
      claim.services.push(service);
    }

    return claim;
  }

  /**
   * Normalize status code
   */
  private normalizeStatusCode(code: string): ClaimPaymentStatus {
    const validCodes = ['1', '2', '3', '4', '19', '20', '21', '22', '23', '25'];
    return validCodes.includes(code) ? code as ClaimPaymentStatus : 'OTHER';
  }

  /**
   * Parse CAS (Claim Adjustment) segment
   */
  private parseCAS(segment: Segment): AdjustmentInfo {
    const elements = segment.elements;

    return {
      groupCode: (elements[1] || 'OA') as CARCAdjustmentGroup,
      reasonCode: elements[2] || '',
      amount: parseFloat(elements[3]) || 0,
      quantity: elements[4] ? parseFloat(elements[4]) : undefined,
      // Additional adjustment pairs can exist in elements 5-6, 7-8, etc.
      // For simplicity, returning first adjustment; in production, parse all
    };
  }

  /**
   * Parse all CAS adjustments including multiple reason codes per segment
   */
  private parseAllCASAdjustments(segment: Segment): AdjustmentInfo[] {
    const elements = segment.elements;
    const groupCode = (elements[1] || 'OA') as CARCAdjustmentGroup;
    const adjustments: AdjustmentInfo[] = [];

    // CAS can have up to 6 reason code/amount pairs: 2-4, 5-7, 8-10, 11-13, 14-16, 17-19
    for (let i = 2; i <= 17; i += 3) {
      if (elements[i]) {
        adjustments.push({
          groupCode,
          reasonCode: elements[i] || '',
          amount: parseFloat(elements[i + 1]) || 0,
          quantity: elements[i + 2] ? parseFloat(elements[i + 2]) : undefined,
        });
      }
    }

    return adjustments;
  }

  /**
   * Parse NM1 segment in claim context
   */
  private parseClaimNM1(segment: Segment, claim: ClaimPayment): void {
    const elements = segment.elements;
    const entityCode = elements[1];

    const nameInfo = {
      lastName: elements[3] || '',
      firstName: elements[4] || undefined,
      middleName: elements[5] || undefined,
      suffix: elements[7] || undefined,
      idQualifier: elements[8] || undefined,
      id: elements[9] || undefined,
    };

    switch (entityCode) {
      case 'QC': // Patient
        claim.patient = nameInfo as PatientInfo;
        break;
      case 'IL': // Insured/Subscriber
        claim.insured = nameInfo as InsuredInfo;
        break;
      case '74': // Corrected patient/insured
        claim.correctedInfo = nameInfo;
        break;
      case '82': // Rendering provider
        claim.renderingProvider = this.parseProviderNM1(segment);
        break;
      case 'TT': // Transfer to
      case 'PR': // Payer
        // Handle as needed
        break;
    }
  }

  /**
   * Parse NM1 for provider
   */
  private parseProviderNM1(segment: Segment): ProviderInfo {
    const elements = segment.elements;
    const entityType = (elements[2] || '1') as '1' | '2';

    if (entityType === '2') {
      return {
        entityType,
        organizationName: elements[3] || undefined,
        npi: elements[9] || undefined,
        idQualifier: elements[8] || undefined,
        id: elements[9] || undefined,
      };
    }

    return {
      entityType,
      lastName: elements[3] || undefined,
      firstName: elements[4] || undefined,
      npi: elements[9] || undefined,
      idQualifier: elements[8] || undefined,
      id: elements[9] || undefined,
    };
  }

  /**
   * Parse MIA (Inpatient Adjudication) segment
   */
  private parseMIA(segment: Segment): InpatientAdjudication {
    const elements = segment.elements;

    return {
      coveredDaysOrVisits: elements[1] ? parseFloat(elements[1]) : undefined,
      lifetimeReserveDays: elements[2] ? parseFloat(elements[2]) : undefined,
      claimDRGAmount: elements[3] ? parseFloat(elements[3]) : undefined,
      claimPaymentRemarkCode: elements[4] || undefined,
      claimDisproportionateShareAmount: elements[5] ? parseFloat(elements[5]) : undefined,
      claimMSPPassthroughAmount: elements[6] ? parseFloat(elements[6]) : undefined,
      claimPPSCapitalAmount: elements[7] ? parseFloat(elements[7]) : undefined,
      ppsCapitalFSPDRGAmount: elements[8] ? parseFloat(elements[8]) : undefined,
      ppsCapitalHSPDRGAmount: elements[9] ? parseFloat(elements[9]) : undefined,
      ppsCapitalDSHDRGAmount: elements[10] ? parseFloat(elements[10]) : undefined,
      oldCapitalAmount: elements[11] ? parseFloat(elements[11]) : undefined,
      ppsCapitalIMEAmount: elements[12] ? parseFloat(elements[12]) : undefined,
      ppsOperatingHospitalSpecificDRGAmount: elements[13] ? parseFloat(elements[13]) : undefined,
      costReportDayCount: elements[14] ? parseFloat(elements[14]) : undefined,
      ppsOperatingFederalSpecificDRGAmount: elements[15] ? parseFloat(elements[15]) : undefined,
      claimPPSCapitalOutlierAmount: elements[16] ? parseFloat(elements[16]) : undefined,
      claimIndirectTeachingAmount: elements[17] ? parseFloat(elements[17]) : undefined,
      nonpayableProfessionalComponentAmount: elements[18] ? parseFloat(elements[18]) : undefined,
      remarkCodes: [elements[19], elements[20], elements[21], elements[22], elements[23]].filter(Boolean) as string[],
    };
  }

  /**
   * Parse MOA (Outpatient Adjudication) segment
   */
  private parseMOA(segment: Segment): OutpatientAdjudication {
    const elements = segment.elements;

    return {
      reimbursementRate: elements[1] ? parseFloat(elements[1]) : undefined,
      claimHCPCSPayableAmount: elements[2] ? parseFloat(elements[2]) : undefined,
      remarkCode1: elements[3] || undefined,
      remarkCode2: elements[4] || undefined,
      remarkCode3: elements[5] || undefined,
      remarkCode4: elements[6] || undefined,
      remarkCode5: elements[7] || undefined,
      endStageRenalDiseasePaymentAmount: elements[8] ? parseFloat(elements[8]) : undefined,
      nonpayableProfessionalComponentAmount: elements[9] ? parseFloat(elements[9]) : undefined,
      remarkCodes: [elements[3], elements[4], elements[5], elements[6], elements[7]].filter(Boolean) as string[],
    };
  }

  /**
   * Parse REF segment at claim level
   */
  private parseClaimREF(segment: Segment): ClaimReference {
    return {
      qualifier: segment.elements[1] || '',
      value: segment.elements[2] || '',
      description: segment.elements[3] || undefined,
    };
  }

  /**
   * Parse DTM segment at claim level
   */
  private parseClaimDTM(segment: Segment): ClaimDate {
    const elements = segment.elements;
    const date: ClaimDate = {
      qualifier: elements[1] || '',
      date: elements[2] || '',
      description: this.getDateQualifierDescription(elements[1]),
    };

    if (elements[3]) {
      date.endDate = elements[3];
    }

    // Try to parse formatted date
    if (date.date && date.date.length === 8) {
      date.formattedDate = this.parseX12Date(date.date);
    }

    return date;
  }

  /**
   * Get date qualifier description
   */
  private getDateQualifierDescription(qualifier: string): string {
    const descriptions: Record<string, string> = {
      '232': 'Claim Statement Period Start',
      '233': 'Claim Statement Period End',
      '050': 'Received Date',
      '472': 'Service Date',
      '150': 'Service Period Start',
      '151': 'Service Period End',
      '036': 'Expiration Date',
    };
    return descriptions[qualifier] || '';
  }

  /**
   * Parse X12 date (CCYYMMDD) to Date object
   */
  private parseX12Date(dateStr: string): Date | undefined {
    if (!dateStr || dateStr.length !== 8) return undefined;

    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);

    return new Date(year, month, day);
  }

  /**
   * Parse AMT segment
   */
  private parseAMT(segment: Segment): ClaimAmount {
    const qualifierDescriptions: Record<string, string> = {
      'AU': 'Coverage Amount',
      'D8': 'Discount Amount',
      'DY': 'Per Day Limit',
      'F5': 'Patient Amount Paid',
      'I': 'Interest',
      'NL': 'Negative Ledger Balance',
      'T': 'Tax',
      'T2': 'Total Claim Before Taxes',
      'ZK': 'Federal Medicare or Medicaid Payment Mandate',
      'ZL': 'Patient Responsibility Actual',
      'ZM': 'Patient Responsibility Estimated',
      'ZN': 'Revised Patient Estimated Responsibility',
      'ZO': 'Payer Responsibility',
      'AAE': 'Allowed Actual',
    };

    return {
      qualifier: segment.elements[1] || '',
      amount: parseFloat(segment.elements[2]) || 0,
      description: qualifierDescriptions[segment.elements[1]] || undefined,
    };
  }

  /**
   * Parse QTY segment
   */
  private parseQTY(segment: Segment): ClaimQuantity {
    const qualifierDescriptions: Record<string, string> = {
      'CA': 'Covered - Actual',
      'CD': 'Co-insured - Actual',
      'LA': 'Life-time Reserve - Actual',
      'LE': 'Life-time Reserve - Estimated',
      'NE': 'Non-Covered - Estimated',
      'NR': 'Not Replaced Blood Units',
      'OU': 'Outlier Days',
      'PS': 'Prescription',
      'VS': 'Visits',
      'ZK': 'Federal Medicare or Medicaid Payment Mandate - Category 1',
      'ZL': 'Federal Medicare or Medicaid Payment Mandate - Category 2',
    };

    return {
      qualifier: segment.elements[1] || '',
      quantity: parseFloat(segment.elements[2]) || 0,
      description: qualifierDescriptions[segment.elements[1]] || undefined,
    };
  }

  /**
   * Parse SVC (Service Line) loop
   */
  private parseServiceLoop(loopSegments: Segment[], lineNumber: number): ServicePayment {
    const svcSegment = loopSegments[0];
    const elements = svcSegment.elements;

    // Parse procedure code (composite element)
    const procedureComposite = elements[1] || '';
    const procedureParts = procedureComposite.split(this.parsed?.componentSeparator || ':');

    const service: ServicePayment = {
      lineNumber,
      procedureQualifier: procedureParts[0] || '',
      procedureCode: procedureParts[1] || '',
      modifiers: [procedureParts[2], procedureParts[3], procedureParts[4], procedureParts[5]].filter(Boolean),
      chargedAmount: parseFloat(elements[2]) || 0,
      paidAmount: parseFloat(elements[3]) || 0,
      revenueCode: elements[4] || undefined,
      unitCount: elements[5] ? parseFloat(elements[5]) : undefined,
      originalUnits: elements[7] ? parseFloat(elements[7]) : undefined,
      adjustments: [],
      references: [],
      dates: [],
      controlNumber: undefined,
    };

    // Parse original procedure (element 6) if different
    if (elements[6]) {
      const originalProcParts = elements[6].split(this.parsed?.componentSeparator || ':');
      // Store original procedure info if needed
    }

    // Parse other segments in the SVC loop
    for (let i = 1; i < loopSegments.length; i++) {
      const seg = loopSegments[i];
      switch (seg.id) {
        case 'CAS':
          const adjustments = this.parseAllCASAdjustments(seg);
          service.adjustments.push(...adjustments);
          break;
        case 'REF':
          service.references.push({
            qualifier: seg.elements[1] || '',
            value: seg.elements[2] || '',
          });
          if (seg.elements[1] === '6R') {
            service.controlNumber = seg.elements[2];
          }
          break;
        case 'DTM':
          service.dates.push({
            qualifier: seg.elements[1] || '',
            date: seg.elements[2] || '',
            formattedDate: this.parseX12Date(seg.elements[2]),
          });
          break;
        case 'AMT':
          // Service-level amounts
          break;
        case 'QTY':
          // Service-level quantities
          break;
        case 'LQ':
          // Health care remark codes
          const rarcCode = seg.elements[2];
          if (rarcCode && service.adjustments.length > 0) {
            service.adjustments[service.adjustments.length - 1].rarcCode = rarcCode;
          }
          break;
      }
    }

    return service;
  }

  /**
   * Parse PLB (Provider Level Adjustment) segments
   */
  private parseProviderAdjustments(): ProviderLevelAdjustment[] {
    if (!this.parsed) return [];

    const plbSegments = this.findAllSegments('PLB');
    const adjustments: ProviderLevelAdjustment[] = [];

    for (const seg of plbSegments) {
      const elements = seg.elements;

      // PLB can have multiple adjustment pairs
      // PLB01 = Provider ID, PLB02 = Fiscal Period
      // PLB03-04, PLB05-06, PLB07-08... are adjustment pairs

      for (let i = 3; i <= 13; i += 2) {
        if (elements[i] && elements[i + 1]) {
          const adjustmentId = elements[i];
          const adjustmentParts = adjustmentId.split(this.parsed?.componentSeparator || ':');

          adjustments.push({
            providerId: elements[1] || '',
            fiscalPeriodDate: elements[2] || '',
            adjustmentCode: adjustmentParts[0] || '',
            referenceId: adjustmentParts[1] || undefined,
            amount: parseFloat(elements[i + 1]) || 0,
          });
        }
      }
    }

    return adjustments;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    claims: ClaimPayment[],
    providerAdjustments: ProviderLevelAdjustment[],
    bprTotal: number
  ): PaymentSummary {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalPatientResponsibility = 0;
    let contractualAdjustments = 0;
    let otherAdjustments = 0;
    let paidClaims = 0;
    let deniedClaims = 0;
    let partialClaims = 0;

    for (const claim of claims) {
      totalBilled += claim.billedAmount;
      totalPaid += claim.paidAmount;
      totalPatientResponsibility += claim.patientResponsibility;

      // Count by status
      if (claim.status === '4') {
        deniedClaims++;
      } else if (claim.paidAmount > 0 && claim.paidAmount < claim.billedAmount) {
        partialClaims++;
      } else if (claim.paidAmount > 0) {
        paidClaims++;
      }

      // Sum adjustments by group
      for (const adj of claim.adjustments) {
        if (adj.groupCode === 'CO') {
          contractualAdjustments += adj.amount;
        } else if (adj.groupCode !== 'PR') {
          otherAdjustments += adj.amount;
        }
      }

      // Include service-level adjustments
      for (const svc of claim.services) {
        for (const adj of svc.adjustments) {
          if (adj.groupCode === 'CO') {
            contractualAdjustments += adj.amount;
          } else if (adj.groupCode !== 'PR') {
            otherAdjustments += adj.amount;
          }
        }
      }
    }

    const providerAdjustmentsTotal = providerAdjustments.reduce(
      (sum, adj) => sum + adj.amount,
      0
    );

    return {
      totalClaims: claims.length,
      paidClaims,
      deniedClaims,
      partialClaims,
      totalBilled,
      totalPaid,
      totalAdjustments: contractualAdjustments + otherAdjustments,
      totalPatientResponsibility,
      contractualAdjustments,
      otherAdjustments,
      providerAdjustmentsTotal,
      netPayment: bprTotal,
    };
  }
}

/**
 * Parse raw X12 835 content
 * Convenience function for direct use
 */
export function parse835File(content: string): PaymentRemittance {
  const parser = new X12835Parser();
  return parser.parse835File(content);
}

/**
 * Validate X12 835 content
 * Returns array of validation errors (empty if valid)
 */
export function validate835File(content: string): string[] {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push('File content is empty');
    return errors;
  }

  if (!content.startsWith('ISA')) {
    errors.push('File must start with ISA segment');
  }

  // Check for required segments
  const requiredSegments = ['ISA', 'GS', 'ST', 'BPR', 'TRN', 'N1', 'SE', 'GE', 'IEA'];
  for (const seg of requiredSegments) {
    if (!content.includes(seg)) {
      errors.push(`Missing required segment: ${seg}`);
    }
  }

  // Check for at least one CLP (claim)
  if (!content.includes('CLP')) {
    errors.push('File contains no claim payment data (CLP segment)');
  }

  return errors;
}

/**
 * Extract check/trace number from 835 content
 * Quick extraction without full parse
 */
export function extractTraceNumber(content: string): string | null {
  const match = content.match(/TRN\*1\*([^*~]+)/);
  return match ? match[1] : null;
}

/**
 * Extract payer name from 835 content
 * Quick extraction without full parse
 */
export function extractPayerName(content: string): string | null {
  const match = content.match(/N1\*PR\*([^*~]+)/);
  return match ? match[1] : null;
}

/**
 * Extract total payment amount from 835 content
 * Quick extraction without full parse
 */
export function extractTotalAmount(content: string): number | null {
  const match = content.match(/BPR\*[^*]*\*([0-9.]+)/);
  return match ? parseFloat(match[1]) : null;
}
