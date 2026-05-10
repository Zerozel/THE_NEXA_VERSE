'use client';
// components/admin/RealtimeNotifications.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real-time notification bell for the admin panel.
//
// HOW IT WORKS:
//   Supabase Realtime uses WebSockets to push database change events.
//   We subscribe to INSERT events on the `requests` table.
//   When a new booking or order comes in, a badge appears + browser notification.
//
//   This is zero-polling — no interval, no wasted requests.
//   The server pushes to us, we don't pull from the server.
//
// PREREQUISITES:
//   In Supabase Dashboard → Database → Replication → enable `requests` table
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import { supabase, type Request } from '@/lib/supabase';

interface Props {
  onNewRequest?: (req: Request) => void;
}

export default function RealtimeNotifications({ onNewRequest }: Props) {
  const [count, setCount] = useState(0);
  const [latest, setLatest] = useState<Request | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleNew = useCallback((req: Request) => {
    setCount(c => c + 1);
    setLatest(req);
    setShowToast(true);
    onNewRequest?.(req);

    // Browser notification (only if user granted permission)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('🔔 New NEXA Request', {
        body: `${req.item} (${req.source})`,
        icon: '/logo.png',
        tag: 'nexa-request', // Replaces previous notification instead of stacking
      });
    }

    // Auto-hide toast after 5 seconds
    setTimeout(() => setShowToast(false), 5000);
  }, [onNewRequest]);

  useEffect(() => {
    // Request browser notification permission on mount
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to new rows in `requests`
    const channel = supabase
      .channel('admin-requests-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        (payload) => handleNew(payload.new as Request)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to requests channel ✓');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleNew]);

  const clearCount = () => setCount(0);

  return (
    <>
      {/* Bell icon with badge */}
      <button
        onClick={clearCount}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="New requests"
        aria-label={`${count} new requests`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[0.6rem] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Toast notification */}
      {showToast && latest && (
        <div className="fixed top-4 right-4 z-[99999] bg-white border border-gray-200 rounded-xl shadow-xl p-4 max-w-xs slide-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold text-black text-sm">New Request!</p>
              <p className="text-gray-600 text-xs mt-0.5">{latest.item}</p>
              <p className="text-gray-400 text-xs">Source: {latest.source}</p>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600 ml-auto">×</button>
          </div>
        </div>
      )}
    </>
  );
}
