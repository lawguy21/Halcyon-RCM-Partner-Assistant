'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWhiteLabel } from '@/providers/WhiteLabelProvider';

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration. Please contact support.',
  AccessDenied: 'You do not have permission to access this resource.',
  Verification: 'The verification link is invalid or has expired.',
  OAuthSignin: 'An error occurred during the sign-in process. Please try again.',
  OAuthCallback: 'An error occurred during authentication. Please try again.',
  OAuthCreateAccount: 'Could not create user account. Please try again.',
  EmailCreateAccount: 'Could not create user account. Please try again.',
  Callback: 'An error occurred during authentication. Please try again.',
  OAuthAccountNotLinked: 'This email is already associated with another account.',
  EmailSignin: 'The sign-in email could not be sent.',
  CredentialsSignin: 'Invalid email or password. Please check your credentials and try again.',
  SessionRequired: 'Please sign in to access this page.',
  default: 'An unexpected error occurred. Please try again.',
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const { config: whiteLabel } = useWhiteLabel();
  const errorType = searchParams.get('error') || 'default';
  const errorMessage = errorMessages[errorType] || errorMessages.default;

  const getErrorIcon = () => {
    if (errorType === 'AccessDenied') {
      return (
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    }
    if (errorType === 'SessionRequired') {
      return (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  };

  const getErrorBgColor = () => {
    if (errorType === 'AccessDenied') {
      return 'bg-yellow-100';
    }
    if (errorType === 'SessionRequired') {
      return 'bg-blue-100';
    }
    return 'bg-red-100';
  };

  const getErrorTitle = () => {
    if (errorType === 'AccessDenied') {
      return 'Access Denied';
    }
    if (errorType === 'SessionRequired') {
      return 'Sign In Required';
    }
    if (errorType === 'CredentialsSignin') {
      return 'Sign In Failed';
    }
    return 'Authentication Error';
  };

  return (
    <div className="p-8">
      <div className="text-center">
        {/* Error Icon */}
        <div className={`mx-auto w-16 h-16 ${getErrorBgColor()} rounded-full flex items-center justify-center mb-6`}>
          {getErrorIcon()}
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{getErrorTitle()}</h2>

        {/* Error Message */}
        <p className="text-slate-600 mb-8 max-w-sm mx-auto">
          {errorMessage}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
          >
            Try signing in again
          </Link>

          {errorType === 'Verification' && (
            <Link
              href="/auth/forgot-password"
              className="block w-full py-3 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors hover:bg-slate-50 text-center"
            >
              Request new verification link
            </Link>
          )}

          <Link
            href="/"
            className="block w-full py-3 px-4 text-slate-600 hover:text-slate-900 font-medium transition-colors text-center"
          >
            Go to homepage
          </Link>
        </div>

        {/* Support Info */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            If this problem persists, please{' '}
            <a href={`mailto:${whiteLabel?.supportEmail || 'support@example.com'}`} className="text-blue-600 hover:text-blue-700 font-medium">
              contact support
            </a>
          </p>
          {errorType !== 'default' && (
            <p className="text-xs text-slate-400 mt-2">
              Error code: {errorType}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
