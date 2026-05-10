'use client';
// components/OfflineBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows a non-intrusive banner when the user loses internet connection.
// Disappears automatically when connection is restored.
//
// On Nigerian campus networks, connectivity drops frequently.
// This tells the user what's happening instead of silently failing.
// The service worker still serves cached content — the app keeps working.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [online, setOnline]   = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Sync with real connection state on mount
    setOnline(navigator.onLine);

    const handleOnline  = () => { setOnline(true);  setTimeout(() => setVisible(false), 2000); };
    const handleOffline = () => { setOnline(false); setVisible(true); };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!visible && online) return null;

  return (
    <div
      className={`fixed top-[60px] left-0 right-0 z-[800] text-center text-xs font-bold py-2 px-4 transition-all duration-300 ${
        online
          ? 'bg-green-600 text-white'
          : 'bg-[#e74c3c] text-white'
      }`}
      style={{ animation: 'slideDown 0.3s ease' }}
    >
      {online
        ? '✓ Back online'
        : '⚠ No internet — showing cached content'}
    </div>
  );
}
