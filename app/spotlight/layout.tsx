// app/spotlight/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Spotlight root layout. Server Component.
//
// ISOLATION: This layout is completely independent of the Nexa layout.
// - No Nexa Header
// - No Nexa BottomNav
// - No Nexa PromoBanner
// - Spotlight-specific fonts and metadata
//
// All pages under /spotlight/* inherit this layout.
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Spotlight — Nexaverse', template: '%s | Spotlight' },
  description: 'Share your story with the Nexaverse community. Apply for your Spotlight feature.',
};

export default function SpotlightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Spotlight uses a light background — forms are easier to read on light.
    // This overrides the dark Nexa body background for all Spotlight pages.
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-body)' }}>
      {children}
    </div>
  );
}
