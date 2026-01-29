/**
 * 501(r) Charity Care Compliance Engine
 *
 * Evaluates compliance with IRS 501(r) requirements for nonprofit hospitals.
 * Calculates FAP (Financial Assistance Policy) eligibility and tracks
 * compliance with ECA (Extraordinary Collection Actions) notification requirements.
 *
 * Key features:
 * - FAP eligibility determination (free/discounted/not eligible)
 * - 501(r) compliance timeline tracking
 * - ECA notification requirements and restrictions
 * - Compliance checklist generation
 */

import { calculateFPLThreshold } from './magi-calculator.js';

// ============================================================================
// TYPES
// ============================================================================

export type FAPEligibilityStatus = 'free' | 'discounted' | 'not_eligible';
export type ComplianceStatus = 'compliant' | 'at_risk' | 'non_compliant';

export type NotificationType =
  | 'plain_language_summary'
  | 'fap_application'
  | 'eca_120_day_notice'
  | 'eca_30_day_written_notice'
  | 'presumptive_eligibility_screening'
  | 'fap_determination_notice';

// ============================================================================
// INPUT INTERFACES
// ============================================================================

export interface HospitalFAPPolicy {
  /** FPL percentage threshold for free care (e.g., 200 = 200% FPL) */
  freeCareFPLThreshold: number;
  /** FPL percentage threshold for discounted care (e.g., 400 = 400% FPL) */
  discountedCareFPLThreshold: number;
  /** Discount tiers for sliding scale */
  discountPercentages: DiscountTier[];
}

export interface DiscountTier {
  /** FPL range string (e.g., "201-300% FPL") */
  fplRange: string;
  /** Discount percentage for this tier (e.g., 75 = 75% discount) */
  discount: number;
}

export interface NotificationRecord {
  /** Type of notification sent */
  type: NotificationType;
  /** Date the notification was sent */
  date: Date;
  /** Method of delivery (mail, email, in-person) */
  deliveryMethod?: string;
}

export interface CharityCare501rInput {
  /** Patient's annual household income */
  patientIncome: number;
  /** Number of people in patient's household */
  householdSize: number;
  /** Hospital's FAP policy configuration */
  hospitalFAPPolicy: HospitalFAPPolicy;
  /** Age of the account in days since date of service */
  accountAge: number;
  /** Array of notifications sent to the patient */
  notificationsSent: NotificationRecord[];
  /** Whether service was emergency medical care */
  isEmergencyService: boolean;
  /** Original billed charges */
  originalCharges?: number;
}

// ============================================================================
// OUTPUT INTERFACES
// ============================================================================

export interface ECAStatus {
  /** Whether ECAs are currently allowed */
  allowed: boolean;
  /** Date ECAs will be/were allowed */
  allowedDate: Date;
  /** Days until ECAs are allowed */
  daysUntilAllowed: number;
  /** List of blocked collection actions */
  blockedActions: string[];
  /** Reason for current status */
  reason: string;
}

export interface RequiredNotification {
  /** Type of notification */
  type: NotificationType;
  /** Deadline for sending this notification */
  deadline: Date;
  /** Whether notification has been sent */
  sent: boolean;
  /** Description of the requirement */
  description: string;
}

export interface ComplianceChecklistItem {
  /** Description of the compliance item */
  item: string;
  /** Whether the item is complete */
  completed: boolean;
  /** Category of the item */
  category: 'policy' | 'notification' | 'documentation' | 'eca_restriction';
}

export interface CharityCare501rResult {
  /** FAP eligibility determination */
  fapEligibility: FAPEligibilityStatus;
  /** Discount percentage (0-100) */
  discountPercentage: number;
  /** Amount after applying FAP discount */
  amountAfterDiscount: number;
  /** Patient income as percentage of FPL */
  incomeAsFPLPercentage: number;
  /** Overall compliance status */
  complianceStatus: ComplianceStatus;
  /** Date ECAs are allowed */
  ecaAllowedDate: Date;
  /** Detailed ECA status */
  ecaStatus: ECAStatus;
  /** Required notifications with deadlines */
  requiredNotifications: RequiredNotification[];
  /** Compliance checklist */
  complianceChecklist: ComplianceChecklistItem[];
  /** Recommended actions */
  actions: string[];
  /** Notes and warnings */
  notes: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Days required for ECA notification period */
export const ECA_NOTIFICATION_PERIOD_DAYS = 120;

/** Days required for written notice before specific ECA */
export const ECA_WRITTEN_NOTICE_DAYS = 30;

/** List of Extraordinary Collection Actions prohibited during notification period */
export const EXTRAORDINARY_COLLECTION_ACTIONS = [
  'Selling debt to third party',
  'Reporting to credit bureaus',
  'Deferring or denying care',
  'Requiring payment before providing care',
  'Liens on property',
  'Foreclosure on property',
  'Attachment or seizure of bank accounts',
  'Garnishment of wages',
  'Causing arrest or body attachment'
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse FPL range string into min/max values
 */
function parseFPLRange(rangeString: string): { min: number; max: number } | null {
  const match = rangeString.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match?.[1] && match?.[2]) {
    return {
      min: parseInt(match[1], 10),
      max: parseInt(match[2], 10)
    };
  }

  const singleMatch = rangeString.match(/(under|below|<)\s*(\d+)/i);
  if (singleMatch?.[2]) {
    return {
      min: 0,
      max: parseInt(singleMatch[2], 10)
    };
  }

  return null;
}

/**
 * Calculate discount percentage based on FPL tier
 */
function calculateTieredDiscount(
  incomeAsFPLPercentage: number,
  policy: HospitalFAPPolicy
): number {
  for (const tier of policy.discountPercentages) {
    const range = parseFPLRange(tier.fplRange);
    if (range && incomeAsFPLPercentage >= range.min && incomeAsFPLPercentage <= range.max) {
      return tier.discount;
    }
  }

  // Default sliding scale if no tier matches
  const { freeCareFPLThreshold, discountedCareFPLThreshold } = policy;
  const rangeSize = discountedCareFPLThreshold - freeCareFPLThreshold;
  const positionInRange = incomeAsFPLPercentage - freeCareFPLThreshold;
  const percentThroughRange = positionInRange / rangeSize;

  return Math.max(0, Math.round(100 * (1 - percentThroughRange)));
}

/**
 * Determine FAP eligibility based on income and hospital policy
 */
function determineFAPEligibility(
  incomeAsFPLPercentage: number,
  policy: HospitalFAPPolicy
): { eligibility: FAPEligibilityStatus; discountPercentage: number } {
  if (incomeAsFPLPercentage <= policy.freeCareFPLThreshold) {
    return { eligibility: 'free', discountPercentage: 100 };
  }

  if (incomeAsFPLPercentage <= policy.discountedCareFPLThreshold) {
    const discountPercentage = calculateTieredDiscount(incomeAsFPLPercentage, policy);
    return { eligibility: 'discounted', discountPercentage };
  }

  return { eligibility: 'not_eligible', discountPercentage: 0 };
}

/**
 * Calculate amount after applying FAP discount
 */
function calculateAmountAfterDiscount(originalCharges: number, discountPercentage: number): number {
  if (originalCharges <= 0) return 0;
  const discountAmount = originalCharges * (discountPercentage / 100);
  return Math.round((originalCharges - discountAmount) * 100) / 100;
}

/**
 * Calculate ECA status and timeline
 */
function calculateECAStatus(
  accountAge: number,
  notificationsSent: NotificationRecord[],
  isEmergencyService: boolean
): ECAStatus {
  const today = new Date();
  const serviceDate = new Date(today.getTime() - accountAge * 24 * 60 * 60 * 1000);
  const baseECADate = new Date(serviceDate.getTime() + ECA_NOTIFICATION_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const hasWrittenNotice = notificationsSent.some(n => n.type === 'eca_30_day_written_notice');
  const has120DayNotice = notificationsSent.some(n => n.type === 'eca_120_day_notice');
  const hasFAPOpportunity = notificationsSent.some(
    n => n.type === 'fap_application' || n.type === 'plain_language_summary'
  );

  let ecaAllowedDate = baseECADate;
  let reason = '';

  if (!hasFAPOpportunity) {
    ecaAllowedDate = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000);
    reason = 'FAP application opportunity not yet provided';
  } else if (!has120DayNotice) {
    reason = '120-day notification period not started';
  } else if (!hasWrittenNotice) {
    const latestECANotice = notificationsSent
      .filter(n => n.type === 'eca_120_day_notice')
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    if (latestECANotice) {
      const noticeDate = new Date(latestECANotice.date);
      ecaAllowedDate = new Date(Math.max(
        baseECADate.getTime(),
        noticeDate.getTime() + ECA_WRITTEN_NOTICE_DAYS * 24 * 60 * 60 * 1000
      ));
    }
    reason = '30-day written notice required before specific ECA';
  } else {
    reason = 'All notification requirements met';
  }

  const daysUntilAllowed = Math.max(
    0,
    Math.ceil((ecaAllowedDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  );

  const blockedActions = [...EXTRAORDINARY_COLLECTION_ACTIONS];
  if (isEmergencyService) {
    reason = reason || 'Emergency services - additional protections apply';
  }

  return {
    allowed: daysUntilAllowed === 0 && hasFAPOpportunity && has120DayNotice && hasWrittenNotice,
    allowedDate: ecaAllowedDate,
    daysUntilAllowed,
    blockedActions,
    reason
  };
}

/**
 * Generate list of required notifications with deadlines
 */
function generateRequiredNotifications(
  accountAge: number,
  notificationsSent: NotificationRecord[]
): RequiredNotification[] {
  const today = new Date();
  const notifications: RequiredNotification[] = [];

  const wasSent = (type: NotificationType): boolean =>
    notificationsSent.some(n => n.type === type);

  notifications.push({
    type: 'plain_language_summary',
    deadline: new Date(today.getTime() - accountAge * 24 * 60 * 60 * 1000),
    sent: wasSent('plain_language_summary'),
    description: 'Plain language summary of FAP must be provided to patient'
  });

  const fapDeadline = new Date(today.getTime() + (ECA_NOTIFICATION_PERIOD_DAYS - accountAge) * 24 * 60 * 60 * 1000);
  notifications.push({
    type: 'fap_application',
    deadline: fapDeadline > today ? fapDeadline : today,
    sent: wasSent('fap_application'),
    description: 'FAP application must be offered before initiating ECAs'
  });

  const ecaNotificationDeadline = new Date(today.getTime() + Math.max(0, ECA_NOTIFICATION_PERIOD_DAYS - accountAge) * 24 * 60 * 60 * 1000);
  notifications.push({
    type: 'eca_120_day_notice',
    deadline: ecaNotificationDeadline,
    sent: wasSent('eca_120_day_notice'),
    description: 'Notification of potential ECAs must be provided 120 days before action'
  });

  const writtenNoticeDeadline = new Date(today.getTime() + Math.max(0, ECA_NOTIFICATION_PERIOD_DAYS + ECA_WRITTEN_NOTICE_DAYS - accountAge) * 24 * 60 * 60 * 1000);
  notifications.push({
    type: 'eca_30_day_written_notice',
    deadline: writtenNoticeDeadline,
    sent: wasSent('eca_30_day_written_notice'),
    description: '30-day written notice required before taking specific ECA'
  });

  notifications.push({
    type: 'presumptive_eligibility_screening',
    deadline: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
    sent: wasSent('presumptive_eligibility_screening'),
    description: 'Screen for presumptive FAP eligibility using available data'
  });

  return notifications;
}

/**
 * Build comprehensive compliance checklist
 */
function buildComplianceChecklist(
  notificationsSent: NotificationRecord[],
  isEmergencyService: boolean
): ComplianceChecklistItem[] {
  const wasSent = (type: NotificationType): boolean =>
    notificationsSent.some(n => n.type === type);

  const checklist: ComplianceChecklistItem[] = [
    { item: 'Written FAP established and available', completed: true, category: 'policy' },
    { item: 'FAP applies to emergency and medically necessary care', completed: true, category: 'policy' },
    { item: 'Eligibility criteria based on FPL percentages defined', completed: true, category: 'policy' },
    { item: 'Method for applying for financial assistance documented', completed: true, category: 'policy' },
    { item: 'Plain language summary provided to patient', completed: wasSent('plain_language_summary'), category: 'notification' },
    { item: 'FAP application offered to patient', completed: wasSent('fap_application'), category: 'notification' },
    { item: '120-day notification period observed before ECAs', completed: wasSent('eca_120_day_notice'), category: 'notification' },
    { item: '30-day written notice provided before specific ECA', completed: wasSent('eca_30_day_written_notice'), category: 'notification' },
    { item: 'Billing and collections policy documented', completed: true, category: 'documentation' },
    { item: 'Amounts generally billed (AGB) calculated', completed: true, category: 'documentation' },
    { item: 'FAP eligibility determination documented', completed: wasSent('fap_determination_notice'), category: 'documentation' },
    { item: 'No debt sold before ECA timeline complete', completed: true, category: 'eca_restriction' },
    { item: 'No adverse credit reporting before ECA timeline', completed: true, category: 'eca_restriction' },
    { item: 'No care denial for prior unpaid bills', completed: true, category: 'eca_restriction' },
    { item: 'No liens, garnishments, or legal actions before compliance', completed: true, category: 'eca_restriction' }
  ];

  if (isEmergencyService) {
    checklist.push(
      { item: 'Emergency care provided regardless of payment ability', completed: true, category: 'policy' },
      { item: 'EMTALA compliance verified', completed: true, category: 'policy' }
    );
  }

  return checklist;
}

/**
 * Determine overall compliance status
 */
function determineComplianceStatus(
  checklist: ComplianceChecklistItem[],
  ecaStatus: ECAStatus,
  accountAge: number
): ComplianceStatus {
  const incompleteNotifications = checklist.filter(
    item => item.category === 'notification' && !item.completed
  ).length;

  const incompleteDocumentation = checklist.filter(
    item => item.category === 'documentation' && !item.completed
  ).length;

  const missingCritical = checklist.some(
    item => !item.completed && (
      item.item.includes('Plain language summary') ||
      item.item.includes('FAP application')
    )
  );

  if (missingCritical && accountAge > 30) {
    return 'non_compliant';
  }

  if (accountAge > ECA_NOTIFICATION_PERIOD_DAYS && !ecaStatus.allowed && incompleteNotifications > 0) {
    return 'non_compliant';
  }

  if (incompleteNotifications > 0 && accountAge > 60) {
    return 'at_risk';
  }

  if (incompleteDocumentation > 1) {
    return 'at_risk';
  }

  if (accountAge > 90 && incompleteNotifications > 0) {
    return 'at_risk';
  }

  return 'compliant';
}

/**
 * Generate recommended actions
 */
function generateActions(
  eligibility: FAPEligibilityStatus,
  complianceStatus: ComplianceStatus,
  notifications: RequiredNotification[],
  ecaStatus: ECAStatus
): string[] {
  const actions: string[] = [];

  switch (eligibility) {
    case 'free':
      actions.push('Apply 100% FAP discount - patient qualifies for free care');
      actions.push('Document FAP eligibility determination');
      actions.push('Update account status to reflect charity care write-off');
      break;
    case 'discounted':
      actions.push('Calculate and apply FAP discount based on FPL tier');
      actions.push('Generate patient-friendly billing statement with discount');
      actions.push('Offer payment plan for remaining balance if applicable');
      break;
    case 'not_eligible':
      actions.push('Document FAP ineligibility determination');
      actions.push('Provide patient with FAP denial notice including appeal rights');
      break;
  }

  const pendingNotifications = notifications.filter(n => !n.sent);
  for (const notification of pendingNotifications) {
    switch (notification.type) {
      case 'plain_language_summary':
        actions.push('URGENT: Provide plain language summary of FAP to patient');
        break;
      case 'fap_application':
        actions.push('Send FAP application to patient with instructions');
        break;
      case 'eca_120_day_notice':
        actions.push('Send 120-day ECA notification to patient');
        break;
      case 'eca_30_day_written_notice':
        actions.push('Prepare 30-day written notice before specific ECA');
        break;
      case 'presumptive_eligibility_screening':
        actions.push('Conduct presumptive eligibility screening using available data');
        break;
    }
  }

  if (complianceStatus === 'non_compliant') {
    actions.unshift('CRITICAL: Immediate action required to restore 501(r) compliance');
    actions.push('Review and remediate all missing compliance items');
    actions.push('Consult with compliance officer regarding potential exposure');
  } else if (complianceStatus === 'at_risk') {
    actions.push('Complete outstanding compliance items within 30 days');
    actions.push('Escalate to compliance team for monitoring');
  }

  if (!ecaStatus.allowed) {
    actions.push(`Do not initiate ECAs until ${ecaStatus.allowedDate.toLocaleDateString()}`);
  }

  return [...new Set(actions)];
}

/**
 * Generate compliance notes and warnings
 */
function generateNotes(
  eligibility: FAPEligibilityStatus,
  incomeAsFPLPercentage: number,
  complianceStatus: ComplianceStatus,
  isEmergencyService: boolean,
  ecaStatus: ECAStatus
): string[] {
  const notes: string[] = [];

  notes.push(`Patient income is ${incomeAsFPLPercentage}% of Federal Poverty Level`);

  switch (eligibility) {
    case 'free':
      notes.push('Patient qualifies for free care under hospital FAP policy');
      notes.push('501(r) requires charges not exceed amounts generally billed (AGB)');
      break;
    case 'discounted':
      notes.push('Patient qualifies for discounted care under hospital FAP policy');
      notes.push('Verify discount does not result in charges exceeding AGB');
      break;
    case 'not_eligible':
      notes.push('Patient does not meet FAP eligibility criteria');
      notes.push('Patient retains right to apply for FAP within application period');
      break;
  }

  if (isEmergencyService) {
    notes.push('Emergency services provided - EMTALA and 501(r) protections apply');
    notes.push('Cannot deny emergency care based on prior unpaid bills');
  }

  if (complianceStatus === 'non_compliant') {
    notes.push('WARNING: Hospital is currently non-compliant with 501(r) requirements');
    notes.push('Non-compliance may jeopardize tax-exempt status');
  } else if (complianceStatus === 'at_risk') {
    notes.push('CAUTION: Compliance at risk - action needed to maintain 501(r) status');
  }

  if (!ecaStatus.allowed) {
    notes.push(`ECAs blocked: ${ecaStatus.reason}`);
    notes.push(`${ecaStatus.daysUntilAllowed} days until ECAs may be permitted`);
  }

  notes.push('FAP must be widely publicized in the community');
  notes.push('All FAP applications must be processed fairly and timely');

  return notes;
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Evaluate 501(r) charity care compliance
 */
export function evaluateCharityCare501r(input: CharityCare501rInput): CharityCare501rResult {
  const {
    patientIncome,
    householdSize,
    hospitalFAPPolicy,
    accountAge,
    notificationsSent,
    isEmergencyService,
    originalCharges = 0
  } = input;

  // Calculate income as FPL percentage
  const fplThreshold = calculateFPLThreshold(householdSize);
  const incomeAsFPLPercentage = Math.round((patientIncome / fplThreshold) * 100);

  // Determine FAP eligibility and discount
  const { eligibility, discountPercentage } = determineFAPEligibility(
    incomeAsFPLPercentage,
    hospitalFAPPolicy
  );

  // Calculate amount after discount
  const amountAfterDiscount = calculateAmountAfterDiscount(originalCharges, discountPercentage);

  // Calculate ECA timeline and status
  const ecaStatus = calculateECAStatus(accountAge, notificationsSent, isEmergencyService);

  // Generate required notifications
  const requiredNotifications = generateRequiredNotifications(accountAge, notificationsSent);

  // Build compliance checklist
  const complianceChecklist = buildComplianceChecklist(notificationsSent, isEmergencyService);

  // Determine overall compliance status
  const complianceStatus = determineComplianceStatus(
    complianceChecklist,
    ecaStatus,
    accountAge
  );

  // Generate recommended actions
  const actions = generateActions(
    eligibility,
    complianceStatus,
    requiredNotifications,
    ecaStatus
  );

  // Generate notes and warnings
  const notes = generateNotes(
    eligibility,
    incomeAsFPLPercentage,
    complianceStatus,
    isEmergencyService,
    ecaStatus
  );

  return {
    fapEligibility: eligibility,
    discountPercentage,
    amountAfterDiscount,
    incomeAsFPLPercentage,
    complianceStatus,
    ecaAllowedDate: ecaStatus.allowedDate,
    ecaStatus,
    requiredNotifications,
    complianceChecklist,
    actions,
    notes
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if an account is within the ECA-prohibited period
 */
export function isECAProhibited(input: CharityCare501rInput): boolean {
  const result = evaluateCharityCare501r(input);
  return !result.ecaStatus.allowed;
}

/**
 * Get the earliest date ECAs can be initiated
 */
export function getECAAllowedDate(input: CharityCare501rInput): Date {
  const result = evaluateCharityCare501r(input);
  return result.ecaAllowedDate;
}

/**
 * Quick eligibility check without full compliance evaluation
 */
export function checkFAPEligibility(
  patientIncome: number,
  householdSize: number,
  hospitalFAPPolicy: HospitalFAPPolicy
): FAPEligibilityStatus {
  const fplThreshold = calculateFPLThreshold(householdSize);
  const incomeAsFPLPercentage = Math.round((patientIncome / fplThreshold) * 100);

  if (incomeAsFPLPercentage <= hospitalFAPPolicy.freeCareFPLThreshold) {
    return 'free';
  }
  if (incomeAsFPLPercentage <= hospitalFAPPolicy.discountedCareFPLThreshold) {
    return 'discounted';
  }
  return 'not_eligible';
}
