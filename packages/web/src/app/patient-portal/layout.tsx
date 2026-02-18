'use client';

import { usePathname } from 'next/navigation';

/**
 * Patient Portal Layout
 * Uses the clean layout (no sidebar) for token-based patient pages,
 * falls back to default layout for the landing page.
 */
export default function PatientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Only apply clean layout for /patient-portal/[token] routes
  const isTokenRoute = pathname.split('/').length > 2 && pathname.startsWith('/patient-portal/');

  if (!isTokenRoute) {
    // Landing page uses the default app layout (with sidebar)
    return <>{children}</>;
  }

  // Token-based patient pages get a clean, minimal layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Clean Patient Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-slate-900">Patient Portal</span>
          </div>
          <div className="text-sm text-slate-500">Secure Document Upload</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-500">
          <p>Need help? Contact our patient services team.</p>
          <p className="mt-1">This is a secure portal. Your documents are encrypted and protected.</p>
        </div>
      </footer>
    </div>
  );
}
