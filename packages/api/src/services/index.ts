/**
 * Services Index
 * Central export for all background services
 */

export { sftpService } from './sftpService.js';
export { emailService } from './emailService.js';
export type { EmailOptions, EmailResult, TemplateData, EmailProvider } from './emailService.js';
export { communicationService } from './communicationService.js';
export type {
  CommunicationType,
  Notice501rType,
  CommunicationStatus,
  CommunicationLog,
  SendResult,
} from './communicationService.js';
export { collectionService } from './collectionService.js';
export type {
  CollectionAccountFilters,
  TransitionResult,
  PromiseToPayInput,
  PaymentPlanInput,
  AgencyAssignmentResult,
  DunningBatchResult,
  AgingBucket,
  CollectionDashboard,
} from './collectionService.js';
export { payerService } from './payerService.js';
export type {
  CreatePayerInput,
  UpdatePayerInput,
  CreateContractInput,
  FeeScheduleImportInput,
  AuthRequirementInput,
} from './payerService.js';
export { clearinghouseService } from './clearinghouseService.js';
export { rbacService } from './rbacService.js';
export type {
  RoleCreateInput,
  RoleUpdateInput,
  UserRoleInput,
  UserDepartmentInput,
  PermissionCheckResult,
  AccessAuditInput,
  EffectivePermissions,
} from './rbacService.js';
export { ssiEligibilityService, SSIEligibilityService } from './ssiEligibilityService.js';
export type {
  PatientForSSIAssessment,
  SSIAssessmentResult,
  QuickScoreResult,
  StrategicRecommendationsResult,
  BatchSSIAssessmentResult,
} from './ssiEligibilityService.js';
export { analyticsService } from './analyticsService.js';
export type {
  DenialPredictionParams,
  BatchDenialPredictionParams,
  CollectionPrioritizationParams,
  RevenueForecastParams,
  KPIDashboardParams,
  KPITrendParams,
  ExportParams,
} from './analyticsService.js';
export { workflowService, WorkflowService } from './workflowService.js';
export type {
  CreateRuleInput,
  UpdateRuleInput,
  RuleListFilters,
  TestRuleInput,
  RuleExecutionLog,
} from './workflowService.js';
export { productivityService } from './productivityService.js';
export type {
  StartTaskInput,
  CompleteTaskInput,
  ManualTimeInput,
  ProductivityFilters,
  GoalInput,
  GoalProgress,
  PersonalProductivity,
  TeamProductivity,
  DepartmentProductivity,
  ProductivityReport,
} from './productivityService.js';
export { default as transparencyService } from './transparencyService.js';
export type {
  CreateEstimateRequest,
  GoodFaithEstimateRequest,
  GoodFaithEstimate,
  EstimateHistoryEntry,
  EstimateAccuracyResult,
} from './transparencyService.js';
export { whiteLabelService } from './whiteLabelService.js';
export type {
  WhiteLabelConfig,
  WhiteLabelConfigInput,
  ValidationResult,
} from './whiteLabelService.js';
export { domainService } from './domainService.js';
export type {
  DomainInput,
  DomainInfo,
  DomainVerificationResult,
  DomainListResult,
} from './domainService.js';
