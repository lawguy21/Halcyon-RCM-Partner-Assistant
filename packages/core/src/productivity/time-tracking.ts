/**
 * Time Tracking Module
 *
 * Provides time tracking functionality for staff productivity metrics.
 * Tracks time spent on various RCM tasks including charge entry, claim submission,
 * payment posting, denial work, collection calls, eligibility verification, and coding.
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Task types for time tracking
 */
export enum TaskType {
  CHARGE_ENTRY = 'CHARGE_ENTRY',
  CLAIM_SUBMISSION = 'CLAIM_SUBMISSION',
  PAYMENT_POSTING = 'PAYMENT_POSTING',
  DENIAL_WORK = 'DENIAL_WORK',
  COLLECTION_CALL = 'COLLECTION_CALL',
  ELIGIBILITY_VERIFICATION = 'ELIGIBILITY_VERIFICATION',
  CODING = 'CODING',
  OTHER = 'OTHER',
}

/**
 * Time entry interface
 */
export interface TimeEntry {
  id: string;
  userId: string;
  taskType: TaskType;
  accountId?: string;
  claimId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // Duration in seconds
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Active timer state
 */
export interface ActiveTimer {
  userId: string;
  taskType: TaskType;
  accountId?: string;
  claimId?: string;
  startTime: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Date range for queries
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Manual time entry input
 */
export interface ManualTimeInput {
  userId: string;
  taskType: TaskType;
  duration: number; // Duration in seconds
  notes?: string;
  accountId?: string;
  claimId?: string;
  date?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Productive time result
 */
export interface ProductiveTimeResult {
  userId: string;
  dateRange: DateRange;
  totalSeconds: number;
  totalHours: number;
  byTaskType: Record<TaskType, number>;
  dailyBreakdown: DailyTimeEntry[];
  averageDailyHours: number;
}

/**
 * Daily time entry breakdown
 */
export interface DailyTimeEntry {
  date: string;
  totalSeconds: number;
  totalHours: number;
  byTaskType: Record<TaskType, number>;
}

/**
 * Start timer result
 */
export interface StartTimerResult {
  success: boolean;
  timer?: ActiveTimer;
  error?: string;
}

/**
 * Stop timer result
 */
export interface StopTimerResult {
  success: boolean;
  timeEntry?: TimeEntry;
  duration?: number;
  error?: string;
}

// ============================================================================
// IN-MEMORY STORAGE (for active timers)
// In production, this would be backed by Redis or similar
// ============================================================================

const activeTimers = new Map<string, ActiveTimer>();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `te_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate duration between two dates in seconds
 */
function calculateDuration(startTime: Date, endTime: Date): number {
  return Math.round((endTime.getTime() - startTime.getTime()) / 1000);
}

/**
 * Format date as YYYY-MM-DD string
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get all task types
 */
export function getAllTaskTypes(): TaskType[] {
  return Object.values(TaskType);
}

/**
 * Get task type display name
 */
export function getTaskTypeDisplayName(taskType: TaskType): string {
  const displayNames: Record<TaskType, string> = {
    [TaskType.CHARGE_ENTRY]: 'Charge Entry',
    [TaskType.CLAIM_SUBMISSION]: 'Claim Submission',
    [TaskType.PAYMENT_POSTING]: 'Payment Posting',
    [TaskType.DENIAL_WORK]: 'Denial Work',
    [TaskType.COLLECTION_CALL]: 'Collection Call',
    [TaskType.ELIGIBILITY_VERIFICATION]: 'Eligibility Verification',
    [TaskType.CODING]: 'Coding',
    [TaskType.OTHER]: 'Other',
  };
  return displayNames[taskType] || taskType;
}

// ============================================================================
// TIME TRACKING FUNCTIONS
// ============================================================================

/**
 * Start a timer for a user
 *
 * @param userId - The user ID
 * @param taskType - The type of task being performed
 * @param accountId - Optional account ID being worked on
 * @param claimId - Optional claim ID being worked on
 * @param metadata - Optional additional metadata
 * @returns Start timer result
 */
export function startTimer(
  userId: string,
  taskType: TaskType,
  accountId?: string,
  claimId?: string,
  metadata?: Record<string, unknown>
): StartTimerResult {
  // Check if user already has an active timer
  const existingTimer = activeTimers.get(userId);
  if (existingTimer) {
    return {
      success: false,
      error: `User already has an active timer for ${getTaskTypeDisplayName(existingTimer.taskType)}. Please stop the current timer first.`,
    };
  }

  const timer: ActiveTimer = {
    userId,
    taskType,
    accountId,
    claimId,
    startTime: new Date(),
    metadata,
  };

  activeTimers.set(userId, timer);

  return {
    success: true,
    timer,
  };
}

/**
 * Stop the active timer for a user
 *
 * @param userId - The user ID
 * @param notes - Optional notes about the work performed
 * @returns Stop timer result with the completed time entry
 */
export function stopTimer(userId: string, notes?: string): StopTimerResult {
  const activeTimer = activeTimers.get(userId);

  if (!activeTimer) {
    return {
      success: false,
      error: 'No active timer found for this user.',
    };
  }

  const endTime = new Date();
  const duration = calculateDuration(activeTimer.startTime, endTime);

  // Minimum duration of 1 second
  if (duration < 1) {
    activeTimers.delete(userId);
    return {
      success: false,
      error: 'Timer duration too short (less than 1 second).',
    };
  }

  const timeEntry: TimeEntry = {
    id: generateId(),
    userId: activeTimer.userId,
    taskType: activeTimer.taskType,
    accountId: activeTimer.accountId,
    claimId: activeTimer.claimId,
    startTime: activeTimer.startTime,
    endTime,
    duration,
    notes,
    metadata: activeTimer.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Remove the active timer
  activeTimers.delete(userId);

  return {
    success: true,
    timeEntry,
    duration,
  };
}

/**
 * Get the active timer for a user
 *
 * @param userId - The user ID
 * @returns The active timer or undefined
 */
export function getActiveTimer(userId: string): ActiveTimer | undefined {
  return activeTimers.get(userId);
}

/**
 * Check if a user has an active timer
 *
 * @param userId - The user ID
 * @returns True if the user has an active timer
 */
export function hasActiveTimer(userId: string): boolean {
  return activeTimers.has(userId);
}

/**
 * Get the elapsed time for an active timer in seconds
 *
 * @param userId - The user ID
 * @returns Elapsed time in seconds or undefined if no active timer
 */
export function getActiveTimerElapsed(userId: string): number | undefined {
  const timer = activeTimers.get(userId);
  if (!timer) return undefined;
  return calculateDuration(timer.startTime, new Date());
}

/**
 * Cancel an active timer without saving
 *
 * @param userId - The user ID
 * @returns True if a timer was cancelled
 */
export function cancelTimer(userId: string): boolean {
  if (!activeTimers.has(userId)) {
    return false;
  }
  activeTimers.delete(userId);
  return true;
}

/**
 * Create a manual time entry (for logging time retroactively)
 *
 * @param input - Manual time entry input
 * @returns The created time entry
 */
export function logManualTime(input: ManualTimeInput): TimeEntry {
  const {
    userId,
    taskType,
    duration,
    notes,
    accountId,
    claimId,
    date,
    metadata,
  } = input;

  if (duration < 1) {
    throw new Error('Duration must be at least 1 second');
  }

  const entryDate = date || new Date();
  const startTime = new Date(entryDate);
  const endTime = new Date(startTime.getTime() + duration * 1000);

  const timeEntry: TimeEntry = {
    id: generateId(),
    userId,
    taskType,
    accountId,
    claimId,
    startTime,
    endTime,
    duration,
    notes,
    metadata: {
      ...metadata,
      manualEntry: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return timeEntry;
}

/**
 * Calculate total productive time for a user over a date range
 * This function expects time entries to be passed in (from database)
 *
 * @param userId - The user ID
 * @param dateRange - The date range to calculate
 * @param timeEntries - Array of time entries from the database
 * @returns Productive time calculation result
 */
export function calculateProductiveTime(
  userId: string,
  dateRange: DateRange,
  timeEntries: TimeEntry[]
): ProductiveTimeResult {
  // Filter entries for the user and date range
  const filteredEntries = timeEntries.filter((entry) => {
    if (entry.userId !== userId) return false;
    if (!entry.duration) return false;
    const entryDate = new Date(entry.startTime);
    return entryDate >= dateRange.startDate && entryDate <= dateRange.endDate;
  });

  // Initialize task type totals
  const byTaskType: Record<TaskType, number> = {
    [TaskType.CHARGE_ENTRY]: 0,
    [TaskType.CLAIM_SUBMISSION]: 0,
    [TaskType.PAYMENT_POSTING]: 0,
    [TaskType.DENIAL_WORK]: 0,
    [TaskType.COLLECTION_CALL]: 0,
    [TaskType.ELIGIBILITY_VERIFICATION]: 0,
    [TaskType.CODING]: 0,
    [TaskType.OTHER]: 0,
  };

  // Daily breakdown map
  const dailyMap = new Map<string, DailyTimeEntry>();

  // Calculate totals
  let totalSeconds = 0;

  for (const entry of filteredEntries) {
    const duration = entry.duration || 0;
    totalSeconds += duration;
    byTaskType[entry.taskType] = (byTaskType[entry.taskType] || 0) + duration;

    // Daily breakdown
    const dateKey = formatDateKey(entry.startTime);
    let dailyEntry = dailyMap.get(dateKey);
    if (!dailyEntry) {
      dailyEntry = {
        date: dateKey,
        totalSeconds: 0,
        totalHours: 0,
        byTaskType: {
          [TaskType.CHARGE_ENTRY]: 0,
          [TaskType.CLAIM_SUBMISSION]: 0,
          [TaskType.PAYMENT_POSTING]: 0,
          [TaskType.DENIAL_WORK]: 0,
          [TaskType.COLLECTION_CALL]: 0,
          [TaskType.ELIGIBILITY_VERIFICATION]: 0,
          [TaskType.CODING]: 0,
          [TaskType.OTHER]: 0,
        },
      };
      dailyMap.set(dateKey, dailyEntry);
    }
    dailyEntry.totalSeconds += duration;
    dailyEntry.totalHours = dailyEntry.totalSeconds / 3600;
    dailyEntry.byTaskType[entry.taskType] =
      (dailyEntry.byTaskType[entry.taskType] || 0) + duration;
  }

  // Sort daily entries by date
  const dailyBreakdown = Array.from(dailyMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Calculate number of working days
  const workingDays = dailyBreakdown.length || 1;

  return {
    userId,
    dateRange,
    totalSeconds,
    totalHours: totalSeconds / 3600,
    byTaskType,
    dailyBreakdown,
    averageDailyHours: totalSeconds / 3600 / workingDays,
  };
}

/**
 * Get all active timers (admin function)
 * @returns Map of user IDs to active timers
 */
export function getAllActiveTimers(): Map<string, ActiveTimer> {
  return new Map(activeTimers);
}

/**
 * Clear all active timers (for testing or system reset)
 */
export function clearAllActiveTimers(): void {
  activeTimers.clear();
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "2h 30m 15s")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Parse duration string to seconds
 * @param durationStr - Duration string (e.g., "2h 30m", "1h", "45m")
 * @returns Duration in seconds
 */
export function parseDuration(durationStr: string): number {
  let totalSeconds = 0;

  // Match hours
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  }

  // Match minutes
  const minutesMatch = durationStr.match(/(\d+)\s*m/i);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  }

  // Match seconds
  const secondsMatch = durationStr.match(/(\d+)\s*s/i);
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1], 10);
  }

  return totalSeconds;
}
