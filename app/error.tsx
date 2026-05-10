'use client';
// app/error.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Global error boundary — catches unhandled runtime errors in any page.
// MUST be a Client Component (error boundaries require useState internally).
//
// When this renders: something crashed hard enough that Next.js couldn't
// recover. The user sees a clean screen with a retry button instead of a
// raw stack trace.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging — in production you'd send to Sentry/LogRocket
    console.error('[NEXA Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-5 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h1 className="text-white font-bold text-xl mb-2">Something went wrong</h1>
      <p className="text-gray-500 text-sm mb-2 max-w-xs">
        The page hit an unexpected error. This has been noted.
      </p>
      {error.digest && (
        <p className="text-gray-700 text-xs mb-6 font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-xl text-sm"
        >
          Try Again
        </button>
        <a href="/" className="w-full border border-[#333] text-white font-semibold py-3.5 rounded-xl text-sm">
          Go Home
        </a>
      </div>
    </div>
  );
}
