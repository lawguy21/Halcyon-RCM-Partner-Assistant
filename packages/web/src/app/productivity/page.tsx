'use client';

import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ActiveTask {
  userId: string;
  taskType: string;
  accountId?: string;
  startTime: string;
  elapsedSeconds: number;
}

interface ProductivityMetrics {
  accountsTouched: number;
  claimsProcessed: number;
  paymentsPosted: number;
  denialsWorked: number;
  callsCompleted: number;
}

interface EfficiencyScore {
  overallScore: number;
  components: {
    volumeScore: number;
    speedScore: number;
    accuracyScore: number;
    consistencyScore: number;
  };
  rating: string;
  strengths: string[];
  improvementAreas: string[];
}

interface GoalProgress {
  goalId: string;
  metric: string;
  target: number;
  current: number;
  percentComplete: number;
  onTrack: boolean;
  daysRemaining: number;
}

interface ProductiveTime {
  totalHours: number;
  averageDailyHours: number;
  byTaskType: Record<string, number>;
}

interface PersonalProductivity {
  userId: string;
  productiveTime: ProductiveTime;
  efficiencyScore: EfficiencyScore;
  metrics: ProductivityMetrics;
  goalProgress: GoalProgress[];
  trends: Array<{ date: string; efficiency: number; volume: number }>;
}

interface TeamMember {
  userId: string;
  userName?: string;
  efficiency: number;
  volume: number;
}

interface LeaderboardEntry {
  userId: string;
  userName?: string;
  rank: number;
  value: number;
  percentOfTarget: number;
  rating: string;
}

// ============================================================================
// Task Type Mapping
// ============================================================================

const TASK_TYPES = [
  { key: 'CHARGE_ENTRY', label: 'Charge Entry' },
  { key: 'CLAIM_SUBMISSION', label: 'Claim Submission' },
  { key: 'PAYMENT_POSTING', label: 'Payment Posting' },
  { key: 'DENIAL_WORK', label: 'Denial Work' },
  { key: 'COLLECTION_CALL', label: 'Collection Call' },
  { key: 'ELIGIBILITY_VERIFICATION', label: 'Eligibility Verification' },
  { key: 'CODING', label: 'Coding' },
  { key: 'OTHER', label: 'Other' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function getRatingColor(rating: string): string {
  switch (rating) {
    case 'exceptional':
      return 'text-green-600 bg-green-100';
    case 'above_average':
      return 'text-blue-600 bg-blue-100';
    case 'average':
      return 'text-yellow-600 bg-yellow-100';
    case 'below_average':
      return 'text-orange-600 bg-orange-100';
    case 'needs_improvement':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-slate-600 bg-slate-100';
  }
}

function formatRating(rating: string): string {
  return rating.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProductivityPage() {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [productivity, setProductivity] = useState<PersonalProductivity | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string>('CLAIM_SUBMISSION');
  const [isManager, setIsManager] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Mock user ID - in production, this would come from auth context
  const userId = 'current-user-id';

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchProductivityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch personal productivity
      const prodResponse = await fetch(
        `/api/productivity/me?userId=${userId}&startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      if (prodResponse.ok) {
        const prodData = await prodResponse.json();
        if (prodData.success) {
          setProductivity(prodData.data);
        }
      }

      // Fetch active task
      const activeResponse = await fetch(`/api/productivity/tasks/active?userId=${userId}`);
      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        if (activeData.success && activeData.data) {
          setActiveTask(activeData.data);
        }
      }

      // Fetch leaderboard
      const leaderboardResponse = await fetch(
        `/api/productivity/leaderboard?startDate=${dateRange.start}&endDate=${dateRange.end}&limit=10`
      );
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        if (leaderboardData.success) {
          setLeaderboard(leaderboardData.data.topPerformers || []);
        }
      }

      // If manager, fetch team data
      if (isManager) {
        const teamResponse = await fetch(
          `/api/productivity/team?managerId=${userId}&startDate=${dateRange.start}&endDate=${dateRange.end}`
        );
        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          if (teamData.success) {
            setTeamMembers(teamData.data.memberProductivity || []);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching productivity data:', err);
      setError(err.message || 'Failed to load productivity data');
    } finally {
      setLoading(false);
    }
  }, [userId, dateRange, isManager]);

  useEffect(() => {
    fetchProductivityData();
  }, [fetchProductivityData]);

  // Update elapsed time for active task
  useEffect(() => {
    if (!activeTask) return;

    const interval = setInterval(() => {
      setActiveTask((prev) =>
        prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask?.userId]);

  // ============================================================================
  // Task Actions
  // ============================================================================

  const handleStartTask = async () => {
    try {
      const response = await fetch('/api/productivity/tasks/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          taskType: selectedTaskType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setActiveTask({
          userId,
          taskType: selectedTaskType,
          startTime: new Date().toISOString(),
          elapsedSeconds: 0,
        });
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStopTask = async () => {
    try {
      const response = await fetch('/api/productivity/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          result: 'SUCCESS',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setActiveTask(null);
        // Refresh data
        fetchProductivityData();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Productivity Dashboard</h2>
          <p className="text-slate-500 mt-1">Track your work and monitor performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setIsManager(!isManager)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              isManager
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isManager ? 'Manager View' : 'Personal View'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Time Tracking Widget */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Time Tracking</h3>
        <div className="flex items-center space-x-4">
          {activeTask ? (
            <>
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {TASK_TYPES.find((t) => t.key === activeTask.taskType)?.label || activeTask.taskType}
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatDuration(activeTask.elapsedSeconds)}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleStopTask}
                className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
              >
                Stop Timer
              </button>
            </>
          ) : (
            <>
              <select
                value={selectedTaskType}
                onChange={(e) => setSelectedTaskType(e.target.value)}
                className="flex-1 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {TASK_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStartTask}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Start Timer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {!loading && productivity && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Efficiency Score"
            value={productivity.efficiencyScore.overallScore.toFixed(1)}
            suffix="/100"
            subtitle={
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRatingColor(productivity.efficiencyScore.rating)}`}>
                {formatRating(productivity.efficiencyScore.rating)}
              </span>
            }
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatCard
            title="Productive Hours"
            value={productivity.productiveTime.totalHours.toFixed(1)}
            suffix="hrs"
            subtitle={`${productivity.productiveTime.averageDailyHours.toFixed(1)} hrs/day avg`}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Accounts Touched"
            value={productivity.metrics.accountsTouched.toString()}
            subtitle={`${productivity.metrics.claimsProcessed} claims processed`}
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            title="Denials Worked"
            value={productivity.metrics.denialsWorked.toString()}
            subtitle={`${productivity.metrics.callsCompleted} calls completed`}
            icon={
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Efficiency Components */}
        {productivity && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Efficiency Breakdown</h3>
            <div className="space-y-4">
              <ProgressBar
                label="Volume"
                value={productivity.efficiencyScore.components.volumeScore}
                color="bg-blue-500"
              />
              <ProgressBar
                label="Speed"
                value={productivity.efficiencyScore.components.speedScore}
                color="bg-green-500"
              />
              <ProgressBar
                label="Accuracy"
                value={productivity.efficiencyScore.components.accuracyScore}
                color="bg-purple-500"
              />
              <ProgressBar
                label="Consistency"
                value={productivity.efficiencyScore.components.consistencyScore}
                color="bg-orange-500"
              />
            </div>

            {/* Strengths & Improvements */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              {productivity.efficiencyScore.strengths.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {productivity.efficiencyScore.strengths.map((s, i) => (
                      <li key={i} className="flex items-center text-sm text-green-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {productivity.efficiencyScore.improvementAreas.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Areas for Improvement</h4>
                  <ul className="space-y-1">
                    {productivity.efficiencyScore.improvementAreas.map((a, i) => (
                      <li key={i} className="flex items-center text-sm text-amber-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Goal Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Goal Progress</h3>
          {productivity?.goalProgress && productivity.goalProgress.length > 0 ? (
            <div className="space-y-4">
              {productivity.goalProgress.map((goal) => (
                <div key={goal.goalId} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {goal.metric.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        goal.onTrack ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {goal.onTrack ? 'On Track' : 'Behind'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${goal.onTrack ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, goal.percentComplete)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {goal.current} / {goal.target}
                    </span>
                    <span>{goal.daysRemaining} days remaining</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No active goals</p>
              <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">Set Goals</button>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Leaderboard</h3>
          {leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                      entry.rank === 1
                        ? 'bg-yellow-100 text-yellow-700'
                        : entry.rank === 2
                        ? 'bg-slate-200 text-slate-700'
                        : entry.rank === 3
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {entry.rank}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {entry.userName || `User ${entry.userId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.percentOfTarget.toFixed(0)}% of target
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{entry.value.toFixed(1)}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${getRatingColor(entry.rating)}`}
                    >
                      {formatRating(entry.rating)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">No leaderboard data</div>
          )}
        </div>
      </div>

      {/* Team View (for managers) */}
      {isManager && teamMembers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-sm font-medium text-slate-600">Team Member</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Efficiency</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Volume</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.userId} className="border-b border-slate-100">
                    <td className="py-3">
                      <span className="font-medium text-slate-900">
                        {member.userName || `User ${member.userId.slice(0, 8)}`}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, member.efficiency)}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-700">{member.efficiency.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-slate-700">{member.volume}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          member.efficiency >= 75
                            ? 'bg-green-100 text-green-700'
                            : member.efficiency >= 50
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {member.efficiency >= 75
                          ? 'Exceeding'
                          : member.efficiency >= 50
                          ? 'Meeting'
                          : 'Below Target'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatCardProps {
  title: string;
  value: string;
  suffix?: string;
  subtitle: React.ReactNode;
  icon: React.ReactNode;
}

function StatCard({ title, value, suffix, subtitle, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-lg bg-slate-100">{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">
            {value}
            {suffix && <span className="text-sm font-normal text-slate-500">{suffix}</span>}
          </p>
          <div className="text-sm text-slate-500 mt-1">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  color: string;
}

function ProgressBar({ label, value, color }: ProgressBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm text-slate-600">{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
