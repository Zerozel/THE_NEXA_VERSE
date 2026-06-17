// app/spotlight/submit/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Submit flow layout. Wraps all /spotlight/submit/* pages.
// Provides the Spotlight header and the constrained content width.
// ─────────────────────────────────────────────────────────────────────────────
import Image from 'next/image';
import Link  from 'next/link';

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── SPOTLIGHT HEADER ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/spotlight" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="NEXA"
            width={28}
            height={28}
            className="object-contain opacity-90"
          />
          <div>
            <span
              className="text-[#0A0A0A] font-black text-base tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              SPOTLIGHT
            </span>
            <span className="text-gray-400 text-[0.6rem] uppercase tracking-wider block leading-none">
              by NEXA
            </span>
          </div>
        </Link>

        {/* Optional: exit link */}
        <Link
          href="/spotlight"
          className="text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors"
        >
          Exit
        </Link>
      </header>

      {/* ── PAGE CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-5 py-6">
        {children}
      </main>
    </div>
  );
}
