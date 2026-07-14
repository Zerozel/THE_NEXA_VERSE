'use client';
// components/spotlight/admin/ContentQueue.tsx
// Mirrors Phase 4's ReviewQueue.tsx structure: debounced search + a native
// status filter dropdown + a paginated list linking to the detail page.
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CONTENT_TYPE_LABELS, CONTENT_STATUS_LABELS } from '@/lib/spotlight/contentTypes';
import type { ContentQueueItem, ContentQueueResponse } from '@/lib/spotlight/types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '',                   label: 'All Statuses' },
  { value: 'pending_generation', label: 'Pending Generation' },
  { value: 'generated',          label: 'Generated' },
  { value: 'reviewed',           label: 'Reviewed' },
  { value: 'approved',           label: 'Approved' },
  { value: 'queued',             label: 'Queued' },
  { value: 'published',          label: 'Published' },
];

export default function ContentQueue() {
  const [items, setItems]     = useState<ContentQueueItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async (p: number, s: string, st: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (s.trim()) params.set('search', s.trim());
      if (st) params.set('status', st);
      const res = await fetch(`/api/spotlight/admin/content?${params}`);
      if (!res.ok) throw new Error('Failed to load content queue.');
      const body: ContentQueueResponse = await res.json();
      setItems(body.items);
      setTotal(body.total);
    } catch {
      setError('Could not load the content queue. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, search, status); }, [page, status, load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); load(0, search, status); }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by participant name\u2026"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#D4AF37]"
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(0); }}
          className="px-3 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-[#D4AF37]"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm py-8 text-center">Loading\u2026</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">No content assets match your filters.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-4">
          {items.map(item => (
            <Link
  key={item.id}
  href={`/spotlight/admin/content/${item.id}`}
  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
>
  {/* Left: participant + category */}
  <div className="min-w-0">
    <p className="font-bold text-gray-800 text-sm truncate">
      {item.participant_name || 'Unnamed Applicant'}
    </p>
    <p className="text-gray-400 text-xs mt-0.5">
      {item.category || 'No category'}
      {item.submitted_at && (
        <> · {new Date(item.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
      )}
    </p>
  </div>

  {/* Right: type, status, generation info */}
  <div className="text-right shrink-0">
    <p className="text-xs font-bold text-gray-700">
      {CONTENT_TYPE_LABELS[item.content_type as keyof typeof CONTENT_TYPE_LABELS] ?? item.content_type}
    </p>
    <span className={`inline-block mt-0.5 text-[0.65rem] font-bold px-2 py-0.5 rounded-full
      ${item.content_status === 'generated'
        ? 'bg-green-100 text-green-700'
        : 'bg-blue-100 text-blue-700'}`}
    >
      {CONTENT_STATUS_LABELS[item.content_status as keyof typeof CONTENT_STATUS_LABELS] ?? item.content_status}
    </span>
    {/* Phase 5B-2: generation count + date */}
    {item.generation_count > 0 && (
      <p className="text-[0.62rem] text-gray-400 mt-0.5">
        v{item.generation_count}
        {item.last_generated_at && (
          <> · {new Date(item.last_generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
        )}
      </p>
    )}
  </div>
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
