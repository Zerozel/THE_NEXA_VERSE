'use client';
// components/spotlight/admin/ContentQueue.tsx
// Enhanced with "Generate All" button for each submission.
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CONTENT_TYPE_LABELS, CONTENT_STATUS_LABELS } from '@/lib/spotlight/contentTypes';
import type { ContentQueueItem, ContentQueueResponse } from '@/lib/spotlight/types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '',                   label: 'All Statuses' },
  { value: 'pending_generation', label: 'Pending Generation' },
  { value: 'generated',          label: 'Generated' },
  { value: 'approved',           label: 'Approved' },
  { value: 'needs_revision',     label: 'Needs Revision' },
  { value: 'rejected',           label: 'Rejected' },
  { value: 'queued',             label: 'Queued' },
  { value: 'published',          label: 'Published' },
];

// Group items by submission
function groupBySubmission(items: ContentQueueItem[]): Map<string, ContentQueueItem[]> {
  const groups = new Map<string, ContentQueueItem[]>();
  for (const item of items) {
    const key = item.submission_id;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  return groups;
}

export default function ContentQueue() {
  const [items, setItems] = useState<ContentQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Generation state per submission
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generationResults, setGenerationResults] = useState<Record<string, { message: string; succeeded: number; failed: number }>>({});

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

  useEffect(() => {
    load(page, search, status);
  }, [page, search, status, load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    load(0, search, status);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPage(0);
  };

  const handleGenerateAll = async (submissionId: string, participantName: string) => {
    if (generating[submissionId]) return;

    setGenerating(prev => ({ ...prev, [submissionId]: true }));
    setGenerationResults(prev => ({ ...prev, [submissionId]: { message: 'Generating...', succeeded: 0, failed: 0 } }));

    try {
      const res = await fetch('/api/spotlight/admin/content/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenerationResults(prev => ({
          ...prev,
          [submissionId]: { message: data.error || 'Generation failed.', succeeded: 0, failed: 0 }
        }));
        return;
      }

      setGenerationResults(prev => ({
        ...prev,
        [submissionId]: {
          message: data.message || 'Generation complete!',
          succeeded: data.succeeded || 0,
          failed: data.failed || 0,
        }
      }));

      // Refresh the list to show updated statuses
      setTimeout(() => load(page, search, status), 2000);
    } catch {
      setGenerationResults(prev => ({
        ...prev,
        [submissionId]: { message: 'Network error. Please try again.', succeeded: 0, failed: 0 }
      }));
    } finally {
      setGenerating(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  // Group items by submission
  const groupedItems = groupBySubmission(items);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      {/* Search and Filter */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Search by participant name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-[#D4AF37] focus:ring-[#D4AF37] sm:text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#D4AF37] hover:bg-[#C9A227] text-black font-semibold rounded-md text-sm transition-colors"
            >
              Search
            </button>
          </form>
          <select
            value={status}
            onChange={handleStatusChange}
            className="rounded-md border-gray-300 shadow-sm focus:border-[#D4AF37] focus:ring-[#D4AF37] sm:text-sm"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {total} items total
          </span>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="p-8 text-center text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-gray-400 border-t-[#D4AF37] rounded-full animate-spin mr-2" />
          Loading...
        </div>
      )}

      {error && (
        <div className="p-8 text-center text-red-600">
          {error}
        </div>
      )}

      {/* Content Groups */}
      {!loading && !error && (
        <ul className="divide-y divide-gray-200">
          {Array.from(groupedItems.entries()).map(([submissionId, submissionItems]) => {
            const participantName = submissionItems[0]?.participant_name || 'Unknown';
            const pendingItems = submissionItems.filter(i => 
              i.status === 'pending_generation' || i.status === 'needs_revision'
            );
            const hasPending = pendingItems.length > 0;
            const isGenerating = generating[submissionId] || false;
            const result = generationResults[submissionId];

            return (
              <li key={submissionId} className="px-4 py-4 hover:bg-gray-50">
                {/* Submission Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {participantName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {submissionItems.length} content items · 
                      {pendingItems.length} pending
                    </p>
                  </div>
                  
                  {/* Generate All Button */}
                  {hasPending && (
                    <button
                      onClick={() => handleGenerateAll(submissionId, participantName)}
                      disabled={isGenerating}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                        isGenerating
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#D4AF37] hover:bg-[#C9A227] text-black'
                      }`}
                    >
                      {isGenerating ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        `✦ Generate All (${pendingItems.length})`
                      )}
                    </button>
                  )}
                </div>

                {/* Generation Result Message */}
                {result && (
                  <div className={`mb-3 text-sm p-2 rounded-md ${
                    result.failed > 0 
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      : 'bg-green-50 text-green-800 border border-green-200'
                  }`}>
                    {result.message}
                    {result.succeeded > 0 && ` (${result.succeeded} generated)`}
                    {result.failed > 0 && `, ${result.failed} failed`}
                  </div>
                )}

                {/* Content Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {submissionItems.map(item => {
                    const statusLabel = CONTENT_STATUS_LABELS[item.status as keyof typeof CONTENT_STATUS_LABELS] || item.status;
                    const typeLabel = CONTENT_TYPE_LABELS[item.format as keyof typeof CONTENT_TYPE_LABELS] || item.format;
                    
                    const statusColor = 
                      item.status === 'approved' ? 'text-green-700 bg-green-50 border-green-200' :
                      item.status === 'generated' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                      item.status === 'pending_generation' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                      item.status === 'needs_revision' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                      item.status === 'rejected' ? 'text-red-700 bg-red-50 border-red-200' :
                      'text-gray-700 bg-gray-50 border-gray-200';

                    return (
                      <Link
                        key={item.id}
                        href={`/spotlight/admin/content/${item.id}`}
                        className="block p-3 rounded-lg border border-gray-100 hover:border-[#D4AF37] transition-colors bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {typeLabel}
                          </span>
                          <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {item.title && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {item.title}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-600 font-medium">No content items found</p>
          <p className="text-gray-400 text-sm">Content is created automatically when you approve a submission.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between">
            <button
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
