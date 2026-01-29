/**
 * Productivity Controller
 *
 * REST endpoint handlers for staff productivity tracking and metrics.
 */

import { Request, Response } from 'express';
import {
  productivityService,
  type GoalInput,
} from '../services/productivityService.js';
import {
  TaskType,
  ActivityResult,
  StaffRole,
  BenchmarkMetric,
} from '@halcyon-rcm/core';

// ============================================================================
// TASK TRACKING ENDPOINTS
// ============================================================================

/**
 * POST /productivity/tasks/start
 * Start tracking a task
 */
export async function startTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || req.body.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const { taskType, accountId, claimId, metadata } = req.body;

    if (!taskType || !Object.values(TaskType).includes(taskType)) {
      res.status(400).json({
        success: false,
        error: 'Valid taskType is required',
        validTypes: Object.values(TaskType),
      });
      return;
    }

    const result = await productivityService.startTask({
      userId,
      taskType,
      accountId,
      claimId,
      metadata,
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.timer,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Error starting task:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start task',
    });
  }
}

/**
 * POST /productivity/tasks/complete
 * Complete the active task
 */
export async function completeTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || req.body.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const { result, notes, metadata } = req.body;

    const completeResult = await productivityService.completeTask({
      userId,
      result: result || ActivityResult.SUCCESS,
      notes,
      metadata,
    });

    if (completeResult.success) {
      res.json({
        success: true,
        data: {
          timeEntry: completeResult.timeEntry,
          duration: completeResult.duration,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: completeResult.error,
      });
    }
  } catch (error: any) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete task',
    });
  }
}

/**
 * GET /productivity/tasks/active
 * Get the user's active task
 */
export async function getActiveTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || req.query.userId as string;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const activeTask = await productivityService.getActiveTask(userId);

    res.json({
      success: true,
      data: activeTask,
    });
  } catch (error: any) {
    console.error('Error getting active task:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active task',
    });
  }
}

/**
 * POST /productivity/time/manual
 * Log manual time entry
 */
export async function logManualTime(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || req.body.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const { taskType, duration, notes, accountId, claimId, date } = req.body;

    if (!taskType || !Object.values(TaskType).includes(taskType)) {
      res.status(400).json({
        success: false,
        error: 'Valid taskType is required',
      });
      return;
    }

    if (!duration || typeof duration !== 'number' || duration < 1) {
      res.status(400).json({
        success: false,
        error: 'Duration must be a positive number (in seconds)',
      });
      return;
    }

    const timeEntry = await productivityService.logManualTime({
      userId,
      taskType,
      duration,
      notes,
      accountId,
      claimId,
      date: date ? new Date(date) : undefined,
    });

    res.status(201).json({
      success: true,
      data: timeEntry,
    });
  } catch (error: any) {
    console.error('Error logging manual time:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log manual time',
    });
  }
}

// ============================================================================
// PRODUCTIVITY RETRIEVAL ENDPOINTS
// ============================================================================

/**
 * GET /productivity/me
 * Get personal productivity dashboard
 */
export async function getMyProductivity(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || req.query.userId as string;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
    };

    const productivity = await productivityService.getMyProductivity(userId, dateRange);

    res.json({
      success: true,
      data: productivity,
    });
  } catch (error: any) {
    console.error('Error getting personal productivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get productivity data',
    });
  }
}

/**
 * GET /productivity/team
 * Get team productivity (for managers)
 */
export async function getTeamProductivity(req: Request, res: Response): Promise<void> {
  try {
    const managerId = (req as any).user?.id || req.query.managerId as string;
    if (!managerId) {
      res.status(400).json({
        success: false,
        error: 'Manager ID is required',
      });
      return;
    }

    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
    };

    const teamProductivity = await productivityService.getTeamProductivity(managerId, dateRange);

    res.json({
      success: true,
      data: teamProductivity,
    });
  } catch (error: any) {
    console.error('Error getting team productivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get team productivity',
    });
  }
}

/**
 * GET /productivity/department/:dept
 * Get department productivity
 */
export async function getDepartmentProductivity(req: Request, res: Response): Promise<void> {
  try {
    const { dept } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
    };

    const deptProductivity = await productivityService.getDepartmentProductivity(dept, dateRange);

    res.json({
      success: true,
      data: deptProductivity,
    });
  } catch (error: any) {
    console.error('Error getting department productivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get department productivity',
    });
  }
}

/**
 * GET /productivity/leaderboard
 * Get top performers
 */
export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const { metric, startDate, endDate, limit } = req.query;

    const benchmarkMetric = (metric as BenchmarkMetric) || BenchmarkMetric.ACCOUNTS_PER_DAY;

    const dateRange = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
    };

    const leaderboard = await productivityService.getLeaderboard(
      benchmarkMetric,
      dateRange,
      limit ? parseInt(limit as string, 10) : 10
    );

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error: any) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get leaderboard',
    });
  }
}

/**
 * GET /productivity/benchmarks
 * Get benchmark values
 */
export async function getBenchmarks(req: Request, res: Response): Promise<void> {
  try {
    const { role } = req.query;
    const staffRole = (role as StaffRole) || StaffRole.BILLER;

    const benchmarks = await productivityService.getBenchmarks(staffRole);

    res.json({
      success: true,
      data: benchmarks,
    });
  } catch (error: any) {
    console.error('Error getting benchmarks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get benchmarks',
    });
  }
}

// ============================================================================
// GOAL MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /productivity/goals
 * Set productivity goals
 */
export async function setGoals(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || req.body.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const { goals } = req.body;

    if (!Array.isArray(goals) || goals.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Goals array is required',
      });
      return;
    }

    const goalInputs: GoalInput[] = goals.map((g: any) => ({
      userId,
      metric: g.metric,
      target: g.target,
      period: g.period || 'monthly',
      startDate: g.startDate ? new Date(g.startDate) : new Date(),
      endDate: g.endDate ? new Date(g.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }));

    const createdGoals = await productivityService.setGoals(userId, goalInputs);

    res.status(201).json({
      success: true,
      data: createdGoals,
    });
  } catch (error: any) {
    console.error('Error setting goals:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set goals',
    });
  }
}

/**
 * GET /productivity/goals/progress
 * Get goal progress
 */
export async function getGoalProgress(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || req.query.userId as string;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const progress = await productivityService.trackGoalProgress(userId);

    res.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    console.error('Error getting goal progress:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get goal progress',
    });
  }
}

// ============================================================================
// REPORT ENDPOINTS
// ============================================================================

/**
 * GET /productivity/report
 * Generate detailed productivity report
 */
export async function generateReport(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, userId, organizationId, department } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
      userId: userId as string | undefined,
      organizationId: organizationId as string | undefined,
      department: department as string | undefined,
    };

    const report = await productivityService.generateProductivityReport(filters);

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate report',
    });
  }
}

// ============================================================================
// REAL-TIME ENDPOINTS
// ============================================================================

/**
 * GET /productivity/realtime/active-users
 * Get currently active users with their tasks (for supervisors)
 */
export async function getActiveUsers(req: Request, res: Response): Promise<void> {
  try {
    // Import from core to get all active timers
    const { getAllActiveTimers } = await import('@halcyon-rcm/core');
    const activeTimers = getAllActiveTimers();

    const activeUsers = Array.from(activeTimers.entries()).map(([userId, timer]) => ({
      userId,
      taskType: timer.taskType,
      accountId: timer.accountId,
      startTime: timer.startTime,
      elapsedSeconds: Math.floor((Date.now() - timer.startTime.getTime()) / 1000),
    }));

    res.json({
      success: true,
      data: activeUsers,
      count: activeUsers.length,
    });
  } catch (error: any) {
    console.error('Error getting active users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active users',
    });
  }
}

/**
 * GET /productivity/realtime/stream
 * Server-Sent Events stream for real-time updates
 */
export async function streamProductivityUpdates(req: Request, res: Response): Promise<void> {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection event
  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ message: 'Connected to productivity stream' })}\n\n`);

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write('event: heartbeat\n');
    res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // Update interval (every 5 seconds)
  const updateInterval = setInterval(async () => {
    try {
      const { getAllActiveTimers } = await import('@halcyon-rcm/core');
      const activeTimers = getAllActiveTimers();

      const update = {
        activeUsers: Array.from(activeTimers.entries()).map(([userId, timer]) => ({
          userId,
          taskType: timer.taskType,
          elapsedSeconds: Math.floor((Date.now() - timer.startTime.getTime()) / 1000),
        })),
        timestamp: new Date().toISOString(),
      };

      res.write('event: update\n');
      res.write(`data: ${JSON.stringify(update)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE update:', error);
    }
  }, 5000);

  // Cleanup on close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(updateInterval);
  });
}
