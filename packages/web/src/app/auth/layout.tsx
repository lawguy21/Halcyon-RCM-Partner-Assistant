'use client';

import { ReactNode } from 'react';
import { useWhiteLabel } from '@/providers/WhiteLabelProvider';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { config: whiteLabel } = useWhiteLabel();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI5M2EiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtNHY2aDJ2NGgtMnY0aDR2LTJoMnYtMmgtMnYtNHptLTggMGgydi00aC0ydjR6bTggNmgydi0yaC0ydjJ6bTItMTJoMnYtMmgtMnYyem0tNiA2aDJ2LTJoLTJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white tracking-tight">{whiteLabel?.brandName || 'RCM Partner'}</h1>
              <p className="text-blue-400 text-sm font-medium">RCM Partner Assistant</p>
            </div>
          </div>
        </div>

        {/* Card Container */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            {whiteLabel?.brandName || 'RCM Partner'}
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Healthcare Revenue Cycle Management
          </p>
        </div>
      </div>

      {/* Security Badge */}
      <div className="relative pb-6 flex justify-center">
        <div className="flex items-center space-x-2 text-slate-500 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>HIPAA Compliant | SOC 2 Type II</span>
        </div>
      </div>
    </div>
  );
}
