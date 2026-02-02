'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = 'ADMIN' | 'USER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  organizationId?: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// ============================================================================
// AUTH HOOK - NextAuth Integration
// ============================================================================

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (data: ResetPasswordData) => Promise<boolean>;
  updateProfile: (data: UpdateProfileData) => Promise<boolean>;
  changePassword: (data: ChangePasswordData) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): AuthContextType {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Map NextAuth session user to our User type
  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        role: (session.user.role as UserRole) || 'USER',
        organizationId: session.user.organizationId,
      }
    : null;

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      try {
        const result = await signIn('credentials', {
          email: credentials.email,
          password: credentials.password,
          redirect: false,
        });

        if (result?.error) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          return false;
        }

        // Auto-login after successful registration
        return login({
          email: credentials.email,
          password: credentials.password,
        });
      } catch {
        return false;
      }
    },
    [login]
  );

  const logout = useCallback(async (): Promise<void> => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  }, [router]);

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const resetPassword = useCallback(
    async (data: ResetPasswordData): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        return response.ok;
      } catch {
        return false;
      }
    },
    []
  );

  const updateProfile = useCallback(
    async (data: UpdateProfileData): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          // Refresh the session to get updated user data
          await update();
          return true;
        }

        return false;
      } catch {
        return false;
      }
    },
    [update]
  );

  const changePassword = useCallback(
    async (data: ChangePasswordData): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        return response.ok;
      } catch {
        return false;
      }
    },
    []
  );

  const refreshUser = useCallback(async (): Promise<void> => {
    await update();
  }, [update]);

  const clearError = useCallback(() => {
    // NextAuth handles errors internally
  }, []);

  return {
    user,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    error: null,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    refreshUser,
    clearError,
  };
}

// ============================================================================
// ROLE HELPERS
// ============================================================================

export function hasRole(user: User | null, requiredRole: UserRole): boolean {
  if (!user) return false;

  const roleHierarchy: Record<UserRole, number> = {
    ADMIN: 3,
    USER: 2,
    VIEWER: 1,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'ADMIN';
}

export function canEdit(user: User | null): boolean {
  return hasRole(user, 'USER');
}

export function canView(user: User | null): boolean {
  return hasRole(user, 'VIEWER');
}
