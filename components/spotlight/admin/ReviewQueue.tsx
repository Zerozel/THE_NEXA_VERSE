'use client';
// components/spotlight/admin/ReviewQueue.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Client component: search input + paginated list + row links.
// Fetches from the queue API on mount, on page change, and on search
// (debounced 400ms so typing doesn't fire a request per keystroke).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';
import type { SubmissionQueueItem, SubmissionQueueResponse } from '@/lib/spotlight/types';

const PAGE_SIZE = 20;

export default function ReviewQueue() {
  const [items, setItems]     = useState<SubmissionQueueItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (s.trim()) params.set('search', s.trim());
      const res = await fetch(`/api/spotlight/admin/submissions?${params}`);
      if (!res.ok) throw new Error('Failed to load queue.');
      const body: SubmissionQueueResponse = await res.json();
      setItems(body.items);
      setTotal(body.total);
    } catch {
      setError('Could not load the review queue. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, search); }, [page, load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { setPage(0); load(0, search); }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or category\u2026"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mb-4 outline-none focus:border-[#D4AF37]"
      />

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm py-8 text-center">Loading\u2026</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">
          {search ? 'No submissions match your search.' : 'No submissions are pending review.'}
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-4">
          {items.map(item => (
            <Link
              key={item.id}
              href={`/spotlight/admin/submissions/${item.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-bold text-gray-800 text-sm truncate">
                  {item.participant_name || 'Unnamed Applicant'}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {item.category || 'No category'}
                  {item.submitted_at && (
                    <> \u00b7 {new Date(item.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
                  )}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(p - 1, 0))}
            className="text-sm font-semibold text-gray-500 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            \u2190 Previous
          </button>
          <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
            className="text-sm font-semibold text-gray-500 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            Next \u2192
          </button>
        </div>
      )}
    </div>
  );
}
