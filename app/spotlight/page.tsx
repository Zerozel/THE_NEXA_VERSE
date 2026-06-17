// app/spotlight/page.tsx — SERVER COMPONENT
// Spotlight landing page. Entry point before the questionnaire.
import Image  from 'next/image';
import Link   from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Spotlight — Nexaverse' };

export default function SpotlightLandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="NEXA" width={28} height={28} className="object-contain opacity-90" />
          <div>
            <span className="text-[#0A0A0A] font-black text-base tracking-widest uppercase" style={{ fontFamily: 'var(--font-headline)' }}>SPOTLIGHT</span>
            <span className="text-gray-400 text-[0.6rem] uppercase tracking-wider block leading-none">by NEXA</span>
          </div>
        </div>
        <Link href="/" className="text-gray-400 text-xs font-medium hover:text-gray-600 transition-colors">← Back to NEXA</Link>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] pulse" />
            <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-wider">Now Accepting Applications</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4" style={{ fontFamily: 'var(--font-headline)' }}>
            Tell Your Story to the<br />
            <span className="text-[#D4AF37]">Nexaverse Community</span>
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-sm mx-auto">
            Spotlight features builders, creators, entrepreneurs, and professionals
            across the Nexaverse. One application. Real visibility.
          </p>
        </div>

        {/* What you get */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">What Spotlight includes</p>
          <div className="space-y-3">
            {[
              ['✍️', 'A structured story about you and your work'],
              ['📣', 'Distribution across Nexaverse channels and communities'],
              ['🔗', 'Contact details shared with the right people'],
              ['🌟', 'Future: a public profile in the Nexaverse directory'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                <p className="text-gray-700 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {['Business Owners','Freelancers','Creators','Developers','Artisans','Students','Technicians','Builders'].map(tag => (
            <span key={tag} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">{tag}</span>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/spotlight/submit"
          className="block w-full bg-[#D4AF37] text-black font-bold text-center py-4 rounded-xl text-base hover:bg-[#C9A227] active:scale-[0.98] transition-all"
        >
          Apply for Your Spotlight →
        </Link>
        <p className="text-center text-gray-400 text-xs mt-3">Free · Takes about 10 minutes · No account required</p>
      </main>
    </div>
  );
}
