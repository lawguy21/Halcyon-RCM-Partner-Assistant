'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useWhiteLabel } from '@/providers/WhiteLabelProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();
  const { config: whiteLabel } = useWhiteLabel();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationId: '',
    acceptTerms: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    clearError();

    // Basic validation
    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setFormError('Please enter a valid email address');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (!formData.acceptTerms) {
      setFormError('You must accept the terms of service to continue');
      return;
    }

    const success = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      organizationId: formData.organizationId || undefined,
    });

    if (success) {
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    }
  };

  const displayError = formError || error;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
        <p className="text-slate-600 mt-2">Get started with {whiteLabel?.brandName || 'RCM Partner'} Assistant</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{displayError}</p>
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            autoComplete="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-slate-900 placeholder-slate-400"
            placeholder="John Smith"
          />
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-slate-900 placeholder-slate-400"
            placeholder="you@company.com"
          />
        </div>

        {/* Organization Input (Optional) */}
        <div>
          <label htmlFor="organizationId" className="block text-sm font-medium text-slate-700 mb-1.5">
            Organization code <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            id="organizationId"
            name="organizationId"
            value={formData.organizationId}
            onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-slate-900 placeholder-slate-400"
            placeholder="Enter organization code if you have one"
          />
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-slate-900 placeholder-slate-400"
            placeholder="Create a strong password"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Must be at least 8 characters with uppercase, lowercase, and numbers
          </p>
        </div>

        {/* Confirm Password Input */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-slate-900 placeholder-slate-400"
            placeholder="Confirm your password"
          />
        </div>

        {/* Terms Acceptance */}
        <div className="pt-2">
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-offset-0 mt-0.5"
            />
            <span className="ml-2 text-sm text-slate-600">
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                Privacy Policy
              </Link>
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create account</span>
          )}
        </button>
      </form>

      {/* Login Link */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
