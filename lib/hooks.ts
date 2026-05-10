'use client';
// lib/hooks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared React hooks used across multiple pages.
// Centralised here so we don't duplicate logic.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';

// ── useDebounce ───────────────────────────────────────────────────────────
// Delays updating a value until the user stops changing it.
// Used in search inputs to avoid firing a request on every keystroke.
//
// EXAMPLE:
//   const debouncedQuery = useDebounce(searchInput, 350);
//   useEffect(() => { fetch('/api/search?q=' + debouncedQuery); }, [debouncedQuery]);
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ── useLongPress ──────────────────────────────────────────────────────────
// Fires a callback after the user holds down on an element.
// Used for the secret admin door (long-press footer copyright).
//
// EXAMPLE:
//   const bind = useLongPress(() => router.push('/admin/login'), 2000);
//   <span {...bind}>© 2026 NEXA</span>
export function useLongPress(callback: () => void, durationMs = 2000) {
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const start = useCallback(() => {
    timer.current = setTimeout(callback, durationMs);
  }, [callback, durationMs]);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp:   cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd:   cancel,
  };
}

// ── useLocalStorage ───────────────────────────────────────────────────────
// Persists state in localStorage (survives page refresh).
// Falls back gracefully when localStorage is unavailable (e.g. SSR, private browsing).
//
// NOTE: Do NOT use this for sensitive data. Only for user preferences.
//
// EXAMPLE:
//   const [theme, setTheme] = useLocalStorage('theme', 'dark');
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (err) {
      console.error('[useLocalStorage] Error saving:', err);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

// ── useOnline ─────────────────────────────────────────────────────────────
// Tracks whether the user has an internet connection.
// Use this to show "Offline mode" banners or disable API-dependent features.
//
// EXAMPLE:
//   const isOnline = useOnline();
//   {!isOnline && <div>You are offline — showing cached data</div>}
export function useOnline(): boolean {
  const [online, setOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

// ── useScrollTop ──────────────────────────────────────────────────────────
// Returns true when the page is scrolled past a threshold.
// Useful for showing/hiding UI elements based on scroll position.
//
// EXAMPLE:
//   const isScrolled = useScrollTop(100);
//   <header className={isScrolled ? 'shadow-lg' : ''}>...</header>
export function useScrollTop(threshold = 50): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [threshold]);

  return scrolled;
}
