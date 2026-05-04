// next.config.js
// ─────────────────────────────────────────────────────────────────────────────
// NEXA v3 — Next.js configuration
// Wraps the config with next-pwa for service worker + offline support.
// Security headers harden the app against common web attacks.
// ─────────────────────────────────────────────────────────────────────────────
const withPWA = require('next-pwa')({
  dest: 'public',           // Service worker goes into /public
  register: true,           // Auto-register SW on load
  skipWaiting: true,        // Activate new SW immediately (no wait for tab close)
  disable: process.env.NODE_ENV === 'development', // Don't run SW in dev mode
  runtimeCaching: [
    // Cache Google Fonts — zero latency on repeat visits
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
    },
    // Cache Cloudinary images — product/service photos
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com/,
      handler: 'CacheFirst',
      options: { cacheName: 'cloudinary-images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
    },
    // Cache local static assets (logo, icons)
    {
      urlPattern: /\.(png|jpg|jpeg|svg|ico|webp)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'static-images', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 } },
    },
    // Network-first for API calls — try network, fall back to cache
    {
      urlPattern: /\/api\//,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', networkTimeoutSeconds: 5, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } },
    },
    // Stale-while-revalidate for all other pages
    {
      urlPattern: /^https?.*/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'pages-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── IMAGE OPTIMIZATION ────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    // Use WebP + AVIF for maximum compression
    formats: ['image/avif', 'image/webp'],
    // Aggressive caching — 1 year for optimized images
    minimumCacheTTL: 60 * 60 * 24 * 365,
    // Sizes matching our responsive breakpoints
    deviceSizes: [360, 414, 768, 1080, 1440],
    imageSizes: [64, 128, 256, 384],
  },

  // ── COMPRESSION ───────────────────────────────────────────────────────────
  compress: true,

  // ── SECURITY HEADERS ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent browsers from MIME-sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Block clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Force HTTPS
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/(.*)\\.(png|jpg|jpeg|svg|ico|webp|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  // ── REDIRECTS ─────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Legacy admin path
      { source: '/admin', destination: '/admin/dashboard', permanent: false },
    ];
  },
};

module.exports = withPWA(nextConfig);
