// app/spotlight/track/layout.tsx
// Shared header for both /spotlight/track and /spotlight/track/[trackingToken].
import Image from 'next/image';
import Link  from 'next/link';

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/spotlight" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="NEXA" width={28} height={28} className="object-contain opacity-90" />
          <div>
            <span
              className="text-[#0A0A0A] font-black text-base tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              SPOTLIGHT
            </span>
            <span className="text-gray-400 text-[0.6rem] uppercase tracking-wider block leading-none">
              Tracking
            </span>
          </div>
        </Link>
        <Link href="/spotlight" className="text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors">
          Back to Spotlight
        </Link>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-5 py-6">
        {children}
      </main>
    </div>
  );
 }
