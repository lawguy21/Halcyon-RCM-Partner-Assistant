'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole, hasRole } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallbackUrl?: string;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-slate-900">Halcyon</h1>
            <p className="text-blue-600 text-sm font-medium">RCM Partner Assistant</p>
          </div>
        </div>

        {/* Spinner */}
        <div className="flex justify-center mb-4">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <p className="text-slate-500 text-sm">Verifying authentication...</p>
      </div>
    </div>
  );
}

function UnauthorizedView({ requiredRole }: { requiredRole?: UserRole }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            You don&apos;t have permission to access this page.
            {requiredRole && (
              <span className="block mt-1">
                Required role: <span className="font-medium">{requiredRole}</span>
              </span>
            )}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Go back
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors hover:bg-slate-50"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, requiredRole, fallbackUrl = '/auth/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      // Store the intended destination for redirect after login
      const currentPath = window.location.pathname;
      const redirectUrl = `${fallbackUrl}?callbackUrl=${encodeURIComponent(currentPath)}`;
      router.push(redirectUrl);
    }
  }, [isAuthenticated, isLoading, router, fallbackUrl]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - show nothing while redirecting
  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  // Check role authorization
  if (requiredRole && !hasRole(user, requiredRole)) {
    return <UnauthorizedView requiredRole={requiredRole} />;
  }

  // Authenticated and authorized - render children
  return <>{children}</>;
}

// HOC version for page components
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole?: UserRole
) {
  const WithProtectedRoute = (props: P) => {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };

  WithProtectedRoute.displayName = `withProtectedRoute(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithProtectedRoute;
}

// Convenience exports for specific role requirements
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="ADMIN">{children}</ProtectedRoute>;
}

export function UserRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="USER">{children}</ProtectedRoute>;
}

export function ViewerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="VIEWER">{children}</ProtectedRoute>;
}

export default ProtectedRoute;
