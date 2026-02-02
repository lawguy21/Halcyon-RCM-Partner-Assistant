'use client';

import { useState, useCallback, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const STORAGE_KEY = 'halcyon_user_preferences';

export interface UserPreferences {
  showDemoData: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  showDemoData: true,
};

interface UseUserPreferencesReturn {
  preferences: UserPreferences;
  showDemoData: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
}

// Get cached preferences from localStorage
function getCachedPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('Error reading cached preferences:', err);
  }
  return null;
}

// Save preferences to localStorage cache
function setCachedPreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (err) {
    console.warn('Error caching preferences:', err);
  }
}

export function useUserPreferences(): UseUserPreferencesReturn {
  // Initialize with cached value for quick access
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    return getCachedPreferences() || DEFAULT_PREFERENCES;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch preferences from API on mount
  const refreshPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/preferences`, {
        credentials: 'include',
      });

      if (!response.ok) {
        // If API is not available, use cached or default preferences
        console.warn('Preferences API not available, using cached/default preferences');
        const cached = getCachedPreferences();
        if (cached) {
          setPreferences(cached);
        }
        return;
      }

      const data = await response.json();
      const apiPreferences: UserPreferences = {
        showDemoData: data.showDemoData ?? DEFAULT_PREFERENCES.showDemoData,
      };

      setPreferences(apiPreferences);
      setCachedPreferences(apiPreferences);
    } catch (err) {
      console.warn('Error fetching preferences, using cached/default:', err);
      // Keep using cached or current preferences on error
      const cached = getCachedPreferences();
      if (cached) {
        setPreferences(cached);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refreshPreferences();
  }, [refreshPreferences]);

  // Update a single preference
  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K]
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);

      const newPreferences = { ...preferences, [key]: value };

      // Optimistically update local state and cache
      setPreferences(newPreferences);
      setCachedPreferences(newPreferences);

      try {
        const response = await fetch(`${API_BASE_URL}/api/user/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ [key]: value }),
        });

        if (!response.ok) {
          // API may not be available, but we've already updated local cache
          console.warn('Preferences API not available, preference saved locally only');
          return true;
        }

        const data = await response.json();
        // Update with server response if available
        if (data.preferences) {
          const serverPreferences: UserPreferences = {
            showDemoData: data.preferences.showDemoData ?? newPreferences.showDemoData,
          };
          setPreferences(serverPreferences);
          setCachedPreferences(serverPreferences);
        }

        return true;
      } catch (err) {
        // Even on error, keep the local update since it's cached
        console.warn('Error saving preference to API, saved locally:', err);
        return true;
      } finally {
        setSaving(false);
      }
    },
    [preferences]
  );

  return {
    preferences,
    showDemoData: preferences.showDemoData,
    loading,
    saving,
    error,
    updatePreference,
    refreshPreferences,
  };
}
