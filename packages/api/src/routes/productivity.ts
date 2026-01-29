/**
 * Productivity Routes
 *
 * REST API endpoints for staff productivity tracking and metrics.
 */

import { Router } from 'express';
import {
  // Task tracking
  startTask,
  completeTask,
  getActiveTask,
  logManualTime,

  // Productivity retrieval
  getMyProductivity,
  getTeamProductivity,
  getDepartmentProductivity,
  getLeaderboard,
  getBenchmarks,

  // Goal management
  setGoals,
  getGoalProgress,

  // Reports
  generateReport,

  // Real-time
  getActiveUsers,
  streamProductivityUpdates,
} from '../controllers/productivityController.js';

export const productivityRouter = Router();

// ============================================================================
// Task Tracking Routes
// ============================================================================

/**
 * POST /api/productivity/tasks/start
 * Start tracking a task
 *
 * Body:
 * - userId: string (optional if authenticated)
 * - taskType: TaskType (required) - CHARGE_ENTRY, CLAIM_SUBMISSION, etc.
 * - accountId: string (optional) - Account being worked on
 * - claimId: string (optional) - Claim being worked on
 * - metadata: object (optional) - Additional metadata
 *
 * Returns: Active timer details
 */
productivityRouter.post('/tasks/start', startTask);

/**
 * POST /api/productivity/tasks/complete
 * Complete the active task and record time
 *
 * Body:
 * - userId: string (optional if authenticated)
 * - result: ActivityResult (optional, default: SUCCESS)
 * - notes: string (optional) - Notes about the work
 * - metadata: object (optional) - Additional metadata
 *
 * Returns: Completed time entry with duration
 */
productivityRouter.post('/tasks/complete', completeTask);

/**
 * GET /api/productivity/tasks/active
 * Get the user's currently active task
 *
 * Query params:
 * - userId: string (optional if authenticated)
 *
 * Returns: Active task details with elapsed time
 */
productivityRouter.get('/tasks/active', getActiveTask);

/**
 * POST /api/productivity/time/manual
 * Log a manual time entry (for retroactive logging)
 *
 * Body:
 * - userId: string (optional if authenticated)
 * - taskType: TaskType (required)
 * - duration: number (required) - Duration in seconds
 * - notes: string (optional)
 * - accountId: string (optional)
 * - claimId: string (optional)
 * - date: string (optional) - ISO date, defaults to now
 *
 * Returns: Created time entry
 */
productivityRouter.post('/time/manual', logManualTime);

// ============================================================================
// Productivity Retrieval Routes
// ============================================================================

/**
 * GET /api/productivity/me
 * Get personal productivity dashboard
 *
 * Query params:
 * - userId: string (optional if authenticated)
 * - startDate: string (optional, ISO date) - Start of date range
 * - endDate: string (optional, ISO date) - End of date range
 *
 * Returns: Personal productivity metrics, efficiency score, goals, trends
 */
productivityRouter.get('/me', getMyProductivity);

/**
 * GET /api/productivity/team
 * Get team productivity (for managers/supervisors)
 *
 * Query params:
 * - managerId: string (optional if authenticated)
 * - startDate: string (optional)
 * - endDate: string (optional)
 *
 * Returns: Team metrics, member productivity, leaderboard, training needs
 */
productivityRouter.get('/team', getTeamProductivity);

/**
 * GET /api/productivity/department/:dept
 * Get department-level productivity
 *
 * Params:
 * - dept: string - Department identifier
 *
 * Query params:
 * - startDate: string (optional)
 * - endDate: string (optional)
 *
 * Returns: Department metrics, breakdown by role, top performers
 */
productivityRouter.get('/department/:dept', getDepartmentProductivity);

/**
 * GET /api/productivity/leaderboard
 * Get top performers leaderboard
 *
 * Query params:
 * - metric: BenchmarkMetric (optional, default: ACCOUNTS_PER_DAY)
 * - startDate: string (optional)
 * - endDate: string (optional)
 * - limit: number (optional, default: 10)
 *
 * Returns: Top performers with rankings and scores
 */
productivityRouter.get('/leaderboard', getLeaderboard);

/**
 * GET /api/productivity/benchmarks
 * Get industry benchmark values
 *
 * Query params:
 * - role: StaffRole (optional, default: BILLER)
 *
 * Returns: Benchmark values for the role
 */
productivityRouter.get('/benchmarks', getBenchmarks);

// ============================================================================
// Goal Management Routes
// ============================================================================

/**
 * POST /api/productivity/goals
 * Set productivity goals for a user
 *
 * Body:
 * - userId: string (optional if authenticated)
 * - goals: array of:
 *   - metric: BenchmarkMetric (required)
 *   - target: number (required)
 *   - period: 'daily' | 'weekly' | 'monthly' | 'quarterly' (optional)
 *   - startDate: string (optional)
 *   - endDate: string (optional)
 *
 * Returns: Created goals
 */
productivityRouter.post('/goals', setGoals);

/**
 * GET /api/productivity/goals/progress
 * Get progress on active goals
 *
 * Query params:
 * - userId: string (optional if authenticated)
 *
 * Returns: Goal progress with projections
 */
productivityRouter.get('/goals/progress', getGoalProgress);

// ============================================================================
// Report Routes
// ============================================================================

/**
 * GET /api/productivity/report
 * Generate detailed productivity report
 *
 * Query params:
 * - startDate: string (optional)
 * - endDate: string (optional)
 * - userId: string (optional) - Filter to specific user
 * - organizationId: string (optional) - Filter to organization
 * - department: string (optional) - Filter to department
 *
 * Returns: Comprehensive productivity report with summary and details
 */
productivityRouter.get('/report', generateReport);

// ============================================================================
// Real-Time Routes
// ============================================================================

/**
 * GET /api/productivity/realtime/active-users
 * Get currently active users and their tasks
 *
 * Returns: List of users with active timers
 */
productivityRouter.get('/realtime/active-users', getActiveUsers);

/**
 * GET /api/productivity/realtime/stream
 * Server-Sent Events stream for real-time updates
 *
 * Returns: SSE stream with periodic updates on active users
 *
 * Events:
 * - connected: Initial connection confirmation
 * - heartbeat: Keep-alive (every 30s)
 * - update: Active users update (every 5s)
 */
productivityRouter.get('/realtime/stream', streamProductivityUpdates);
