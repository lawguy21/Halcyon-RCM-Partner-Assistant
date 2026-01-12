import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  headers?: Record<string, string>;
}

export function useApi<T>(endpoint: string, options: UseApiOptions = {}) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(
    async (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      body?: unknown
    ): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        setState({ data: null, loading: false, error });
        return null;
      }
    },
    [endpoint, options.headers]
  );

  const get = useCallback(() => request('GET'), [request]);
  const post = useCallback((body: unknown) => request('POST', body), [request]);
  const put = useCallback((body: unknown) => request('PUT', body), [request]);
  const del = useCallback(() => request('DELETE'), [request]);

  return {
    ...state,
    get,
    post,
    put,
    delete: del,
  };
}
