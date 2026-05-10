// app/layout.tsx — ROOT SERVER LAYOUT
// No 'use client' — this stays a Server Component.
// Metadata, viewport, and font preloads are injected here statically.
import type { Metadata, Viewport } from 'next';
import './globals.css';
import OfflineBanner from '@/components/OfflineBanner';

export const metadata: Metadata = {
  title: { default: 'NEXA — Campus & Home Services', template: '%s | NEXA' },
  description: 'Verified pros for campus & home repairs. Fast. Reliable. Affordable.',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png', apple: '/logo.png' },
  openGraph: {
    title: 'NEXA — Campus & Home Services',
    description: 'Verified pros for campus & home repairs. Fast. Reliable. Affordable.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#D4AF37',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to critical domains for faster first load */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
      </head>
      <body>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
