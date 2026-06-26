// app/spotlight/success/page.tsx — SERVER COMPONENT
import Link from 'next/link';
import type { Metadata } from 'next';
import TrackingTokenCard from '@/components/spotlight/submission/TrackingTokenCard';

export const metadata: Metadata = { title: 'Application Submitted — Spotlight' };

export default function SpotlightSuccessPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? '';
  const isValidFormat = /^sp_trk_[0-9a-f]{32}$/.test(token);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="max-w-md w-full">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: 'var(--font-headline)' }}>
          Application Submitted
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Thank you for sharing your story with the Nexaverse community.
          Your Spotlight application is now in our review queue.
        </p>

        {isValidFormat ? (
          <TrackingTokenCard token={token} />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-amber-700 text-sm">
              Your application was submitted, but we couldn't display your tracking
              code on this page. Please contact the NEXA team if you need to
              reference your application.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 text-left">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
            What happens next
          </p>
          <ol className="space-y-3">
            {[
              ['1', 'Review', 'The NEXA team reviews your application — usually within 3–5 business days.'],
              ['2', 'Approval', 'If approved, we begin preparing your Spotlight content based on your answers.'],
              ['3', 'Publishing', 'Your Spotlight is shared across Nexaverse channels and communities.'],
            ].map(([num, title, desc]) => (
              <li key={num} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-black flex items-center justify-center mt-0.5">
                  {num}
                </span>
                <div>
                  <p className="text-gray-800 text-sm font-semibold">{title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Link
          href="/spotlight"
          className="block w-full bg-[#D4AF37] text-black font-bold text-center py-3.5 rounded-xl text-sm hover:bg-[#C9A227] active:scale-[0.98] transition-all"
        >
          Back to Spotlight
        </Link>
      </div>
    </div>
  );
}
