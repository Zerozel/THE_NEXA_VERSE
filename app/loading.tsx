// app/loading.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows while any page-level Server Component is fetching data.
// Next.js automatically shows this during navigation + initial load.
//
// Kept intentionally minimal — a pulsing logo so the app feels alive
// without a distracting spinner. The real content arrives fast anyway
// because of server-side caching.
// ─────────────────────────────────────────────────────────────────────────────
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Logo pulse */}
        <div className="relative">
          <img
            src="/logo.png"
            alt="NEXA"
            className="w-12 h-12 object-contain opacity-80"
            style={{ animation: 'pulse 1.5s infinite' }}
          />
        </div>
        {/* Skeleton bars */}
        <div className="space-y-2 w-48">
          <div className="skeleton h-3 w-full rounded-full" />
          <div className="skeleton h-3 w-3/4 rounded-full" />
          <div className="skeleton h-3 w-1/2 rounded-full" />
        </div>
      </div>
    </div>
  );
}
