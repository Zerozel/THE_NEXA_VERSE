// app/spotlight/not-found.tsx
import Link from 'next/link';

export default function SpotlightNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
      <p className="text-5xl mb-4">🔦</p>
      <h1 className="font-black text-gray-900 text-2xl mb-2" style={{ fontFamily: 'var(--font-headline)' }}>
        Page Not Found
      </h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        This Spotlight page doesn't exist. Let's get you back on track.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/spotlight/submit"
          className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-xl text-sm text-center">
          Apply for Spotlight
        </Link>
        <Link href="/spotlight"
          className="w-full border border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl text-sm text-center">
          Back to Spotlight
        </Link>
      </div>
    </div>
  );
}
