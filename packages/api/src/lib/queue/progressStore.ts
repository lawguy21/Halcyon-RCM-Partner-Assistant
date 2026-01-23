/**
 * Halcyon RCM Partner Assistant - Progress Store
 *
 * In-memory progress tracking with Server-Sent Events (SSE) support.
 * For production multi-instance deployments, consider using Redis.
 */

import { ImportProgress } from './jobs.js';

/** Callback type for progress subscribers */
type ProgressCallback = (progress: ImportProgress) => void;

/** In-memory store for progress data */
const progressStore = new Map<string, ImportProgress>();

/** Subscriber callbacks for SSE notifications */
const subscribers = new Map<string, Set<ProgressCallback>>();

/**
 * Get current progress for an import
 */
export function getProgress(importId: string): ImportProgress | undefined {
  return progressStore.get(importId);
}

/**
 * Set progress for an import (replaces existing)
 */
export function setProgress(importId: string, progress: ImportProgress): void {
  progressStore.set(importId, progress);
  notifySubscribers(importId, progress);
}

/**
 * Update progress with partial data
 */
export function updateProgress(
  importId: string,
  updates: Partial<ImportProgress>
): ImportProgress | undefined {
  const current = progressStore.get(importId);
  if (current) {
    const updated = { ...current, ...updates };
    progressStore.set(importId, updated);
    notifySubscribers(importId, updated);
    return updated;
  }
  return undefined;
}

/**
 * Delete progress data for an import
 */
export function deleteProgress(importId: string): void {
  progressStore.delete(importId);
  // Clean up subscribers
  const subs = subscribers.get(importId);
  if (subs) {
    subs.clear();
    subscribers.delete(importId);
  }
}

/**
 * Subscribe to progress updates for an import
 * Returns an unsubscribe function
 */
export function subscribe(
  importId: string,
  callback: ProgressCallback
): () => void {
  if (!subscribers.has(importId)) {
    subscribers.set(importId, new Set());
  }
  subscribers.get(importId)!.add(callback);

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(importId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(importId);
      }
    }
  };
}

/**
 * Notify all subscribers of a progress update
 */
function notifySubscribers(importId: string, progress: ImportProgress): void {
  const subs = subscribers.get(importId);
  if (subs) {
    subs.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error notifying progress subscriber:', error);
      }
    });
  }
}

/**
 * Get all active (non-completed, non-failed) imports
 */
export function getActiveImports(): ImportProgress[] {
  return Array.from(progressStore.values()).filter(
    (p) => p.status !== 'completed' && p.status !== 'failed' && p.status !== 'cancelled'
  );
}

/**
 * Get all imports for a specific user or organization
 */
export function getImportsByContext(
  userId?: string,
  organizationId?: string
): ImportProgress[] {
  // Note: In current implementation, progress objects don't store user/org context
  // This would need to be enhanced if filtering by context is required
  return Array.from(progressStore.values());
}

/**
 * Get count of active imports
 */
export function getActiveImportCount(): number {
  return getActiveImports().length;
}

/**
 * Get subscriber count for an import
 */
export function getSubscriberCount(importId: string): number {
  return subscribers.get(importId)?.size || 0;
}

/**
 * Clear all progress data (useful for testing)
 */
export function clearAllProgress(): void {
  progressStore.clear();
  subscribers.forEach((subs) => subs.clear());
  subscribers.clear();
}

/**
 * Get a summary of all tracked imports
 */
export function getProgressSummary(): {
  total: number;
  active: number;
  completed: number;
  failed: number;
} {
  const all = Array.from(progressStore.values());
  return {
    total: all.length,
    active: all.filter((p) => !['completed', 'failed', 'cancelled'].includes(p.status)).length,
    completed: all.filter((p) => p.status === 'completed').length,
    failed: all.filter((p) => p.status === 'failed').length,
  };
}

/**
 * Clean up old completed/failed imports (older than specified minutes)
 */
export function cleanupOldProgress(maxAgeMinutes: number = 60): number {
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  let cleaned = 0;

  for (const [importId, progress] of progressStore.entries()) {
    if (
      ['completed', 'failed', 'cancelled'].includes(progress.status) &&
      progress.completedAt
    ) {
      const age = now - new Date(progress.completedAt).getTime();
      if (age > maxAgeMs) {
        deleteProgress(importId);
        cleaned++;
      }
    }
  }

  return cleaned;
}
