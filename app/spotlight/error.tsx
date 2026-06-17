'use client';
// app/spotlight/error.tsx — Spotlight-scoped error boundary
import { useEffect } from 'react';

export default function SpotlightError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[Spotlight Error]', error); }, [error]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h1 className="font-black text-gray-900 text-xl mb-2">Something went wrong</h1>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        We hit an unexpected error. Your progress may not be saved.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={reset}
          className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-xl text-sm">
          Try Again
        </button>
        <a href="/spotlight"
          className="w-full border border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl text-sm text-center">
          Back to Spotlight
        </a>
      </div>
    </div>
  );
}
