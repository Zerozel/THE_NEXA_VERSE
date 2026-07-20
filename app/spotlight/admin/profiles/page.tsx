// app/spotlight/admin/profiles/page.tsx — SERVER COMPONENT
import type { Metadata }              from 'next';
import Link                           from 'next/link';
import { createAdminClient }          from '@/lib/supabase-server';
import { getAdminProfilesList }       from '@/lib/spotlight/profiles';

export const metadata: Metadata = { title: 'Profiles — Spotlight Admin' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AdminProfilesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(parseInt(searchParams.page ?? '0', 10) || 0, 0);
  const db   = createAdminClient();
  const { items, total } = await getAdminProfilesList(db, page, PAGE_SIZE);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-headline)' }}>
            Profiles
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Approved submissions and their publication status.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No approved submissions yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {items.map(item => {
            const approvedRatio = item.total_content_count > 0
              ? item.approved_content_count / item.total_content_count
              : 0;
            const isReady     = item.approved_content_count > 0;

            return (
              <Link
                key={item.submission_id}
                href={`/spotlight/admin/profiles/${item.submission_id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                {/* Left */}
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">
                    {item.participant_name || 'Unnamed Applicant'}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {item.category || 'No category'}
                  </p>
                  {/* Content progress bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF37] rounded-full"
                        style={{ width: `${approvedRatio * 100}%` }}
                      />
                    </div>
                    <span className="text-[0.65rem] text-gray-400">
                      {item.approved_content_count}/{item.total_content_count} approved
                    </span>
                  </div>
                </div>

                {/* Right */}
                <div className="text-right shrink-0">
                  {item.is_public ? (
                    <div>
                      <span className="inline-block text-[0.65rem] font-black text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
                        ✓ Published
                      </span>
                      {item.slug && (
                        <p className="text-[0.65rem] text-gray-400 mt-1 font-mono">
                          /spotlight/{item.slug}
                        </p>
                      )}
                    </div>
                  ) : item.profile_id ? (
                    <span className="inline-block text-[0.65rem] font-black text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                      Unpublished
                    </span>
                  ) : (
                    <span className={`inline-block text-[0.65rem] font-black px-2 py-0.5 rounded-full border ${
                      isReady
                        ? 'text-[#C9A227] bg-[#D4AF37]/10 border-[#D4AF37]/30'
                        : 'text-gray-400 bg-gray-50 border-gray-200'
                    }`}>
                      {isReady ? 'Ready to Publish' : 'Awaiting Content'}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Link
            href={page > 0 ? `?page=${page - 1}` : '#'}
            className={`text-sm font-semibold ${page === 0 ? 'text-gray-300 pointer-events-none' : 'text-gray-500 hover:text-gray-800'}`}
          >
            ← Previous
          </Link>
          <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
          <Link
            href={page < totalPages - 1 ? `?page=${page + 1}` : '#'}
            className={`text-sm font-semibold ${page >= totalPages - 1 ? 'text-gray-300 pointer-events-none' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
