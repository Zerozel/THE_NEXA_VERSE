'use client';
// app/admin/analytics/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, type Request, type Visit, type Review } from '@/lib/supabase';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import RealtimeNotifications from '@/components/admin/RealtimeNotifications';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const PAGE_SIZE = 50;

function fmt(ts: string) {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

const SOURCE_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  home_service_click: { label: 'Home Service',    bg: '#fcf3cf', color: '#d4ac0d' },
  home_store_click:   { label: 'Home Store',      bg: '#e8f6f3', color: '#1abc9c' },
  service_booking:    { label: 'Service Book',    bg: '#d5f5e3', color: '#27ae60' },
  service_custom_req: { label: 'Custom Service',  bg: '#fdebd0', color: '#e67e22' },
  store_order:        { label: 'Store Order',     bg: '#d6eaf8', color: '#2980b9' },
  store_custom_req:   { label: 'Custom Store',    bg: '#f9ebea', color: '#c0392b' },
  estimator_book:     { label: 'Estimator',       bg: '#e8daef', color: '#8e44ad' },
  hero_cta:           { label: 'Hero CTA',        bg: '#f0f0f0', color: '#555'    },
};
function getBadge(source: string) {
  return SOURCE_BADGES[source] ?? { label: source, bg: '#f0f0f0', color: '#666' };
}

export default function AnalyticsPage() {
  const router = useRouter();

  // KPIs
  const [kpis, setKpis] = useState({ visits: 0, requests: 0, reviews: 0, avgRating: '0.0' });

  // Chart
  const [chartData, setChartData] = useState<{ labels: string[]; visits: number[]; requests: number[] } | null>(null);

  // Paginated tables
  const [reqPage, setReqPage]     = useState(0);
  const [reqTotal, setReqTotal]   = useState(0);
  const [reqRows, setReqRows]     = useState<Request[]>([]);

  const [visitPage, setVisitPage]   = useState(0);
  const [visitTotal, setVisitTotal] = useState(0);
  const [visitRows, setVisitRows]   = useState<Visit[]>([]);

  const [reviews, setReviews]     = useState<Review[]>([]);
  const [loading, setLoading]     = useState(true);

  // Realtime: prepend new requests
  const handleNewRequest = useCallback((req: Request) => {
    setReqRows(prev => [req, ...prev]);
    setReqTotal(t => t + 1);
    setKpis(k => ({ ...k, requests: k.requests + 1 }));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
    });
    loadKpis();
    loadChart();
    loadReviews();
  }, []);

  useEffect(() => { loadRequests(reqPage); }, [reqPage]);
  useEffect(() => { loadVisits(visitPage); }, [visitPage]);

  async function loadKpis() {
    const [v, r, rev] = await Promise.all([
      supabase.from('visits').select('id', { count: 'exact', head: true }),
      supabase.from('requests').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('rating'),
    ]);
    const ratings = rev.data ?? [];
    const avg = ratings.length ? (ratings.reduce((s, x) => s + (x.rating ?? 0), 0) / ratings.length).toFixed(1) : '0.0';
    setKpis({ visits: v.count ?? 0, requests: r.count ?? 0, reviews: ratings.length, avgRating: avg });
    setLoading(false);
  }

  async function loadChart() {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const cut = cutoff.toISOString();
    const [vr, rr] = await Promise.all([
      supabase.from('visits').select('created_at').gte('created_at', cut),
      supabase.from('requests').select('created_at').gte('created_at', cut),
    ]);
    const toMap = (rows: { created_at: string }[]) => {
      const m: Record<string, number> = {};
      rows.forEach(r => { const k = fmt(r.created_at).date; m[k] = (m[k] ?? 0) + 1; });
      return m;
    };
    const labels = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    });
    const vm = toMap(vr.data ?? []);
    const rm = toMap(rr.data ?? []);
    setChartData({ labels, visits: labels.map(l => vm[l] ?? 0), requests: labels.map(l => rm[l] ?? 0) });
  }

  async function loadRequests(page: number) {
    const from = page * PAGE_SIZE, to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase.from('requests').select('*', { count: 'exact' })
      .order('created_at', { ascending: false }).range(from, to);
    setReqRows(data ?? []); setReqTotal(count ?? 0);
  }

  async function loadVisits(page: number) {
    const from = page * PAGE_SIZE, to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase.from('visits').select('*', { count: 'exact' })
      .order('created_at', { ascending: false }).range(from, to);
    setVisitRows(data ?? []); setVisitTotal(count ?? 0);
  }

  async function loadReviews() {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    setReviews(data ?? []);
  }

  async function delReview(id: string) {
    if (!confirm('Delete review?')) return;
    await supabase.from('reviews').delete().eq('id', id);
    setReviews(r => r.filter(x => x.id !== id));
    setKpis(k => ({ ...k, reviews: k.reviews - 1 }));
  }

  async function delRequest(id: string) {
    if (!confirm('Delete request?')) return;
    await supabase.from('requests').delete().eq('id', id);
    setReqRows(r => r.filter(x => x.id !== id));
    setReqTotal(t => t - 1);
    setKpis(k => ({ ...k, requests: k.requests - 1 }));
  }

  function exportCSV() {
    let csv = 'Date,Time,Type,Details,Source\n';
    reqRows.forEach(r => { const f = fmt(r.created_at); csv += `${f.date},${f.time},Request,${r.item},${r.source}\n`; });
    visitRows.forEach(v => { const f = fmt(v.created_at); csv += `${f.date},${f.time},Visit,${v.page},-\n`; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `NEXA_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const totalReqPages   = Math.ceil(reqTotal / PAGE_SIZE);
  const totalVisitPages = Math.ceil(visitTotal / PAGE_SIZE);

  const KPI = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-white rounded-xl p-5 text-center shadow-sm">
      <div className="text-3xl font-black text-[#D4AF37] mb-1" style={{ fontFamily: 'var(--font-headline)' }}>{value}</div>
      <div className="text-[0.7rem] text-gray-400 uppercase tracking-widest font-bold">{label}</div>
      {sub && <div className="text-[0.65rem] text-gray-300 mt-0.5">{sub}</div>}
    </div>
  );

  const Pager = ({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) => total <= 1 ? null : (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50">
      <button disabled={page === 0} onClick={() => onChange(page - 1)} className="text-xs font-bold text-[#D4AF37] disabled:text-gray-300">← Prev</button>
      <span className="text-xs text-gray-400">Page {page + 1} of {total}</span>
      <button disabled={page >= total - 1} onClick={() => onChange(page + 1)} className="text-xs font-bold text-[#D4AF37] disabled:text-gray-300">Next →</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-10">
      <header className="bg-[#D4AF37] px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="NEXA" className="w-7 h-7 object-contain" />
          <span className="font-bold text-black">NEXA Intel v3</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-black/10 rounded-lg px-1"><RealtimeNotifications onNewRequest={handleNewRequest} /></div>
          <Link href="/admin/dashboard" className="bg-black/10 text-black text-xs font-bold px-3 py-1.5 rounded-lg">← Dashboard</Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/admin/login'); }}
            className="bg-black/10 text-black text-xs font-bold px-3 py-1.5 rounded-lg">Logout</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <KPI label="Total Visits"    value={kpis.visits}   sub={`${visitTotal} logged`} />
          <KPI label="Requests"        value={kpis.requests} sub={`${reqTotal} total`} />
          <KPI label="Reviews"         value={kpis.reviews} />
          <KPI label="Avg Rating"      value={kpis.avgRating} />
        </div>

        {/* Chart — 30 days */}
        <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Growth Trends — Last 30 Days</h3>
            <button onClick={exportCSV} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">⬇ CSV</button>
          </div>
          <div className="h-[240px]">
            {chartData && (
              <Line
                data={{
                  labels: chartData.labels,
                  datasets: [
                    { label: 'Visits',   data: chartData.visits,   borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)', borderWidth: 2, pointRadius: 2, tension: 0.3, fill: true },
                    { label: 'Requests', data: chartData.requests, borderColor: '#27ae60', backgroundColor: 'rgba(39,174,96,0.08)',   borderWidth: 2, pointRadius: 2, borderDash: [4,4], tension: 0.3, fill: true },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 } } },
                  },
                }}
              />
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* REQUESTS */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-green-600 text-sm">Incoming Requests</h3>
              <span className="text-xs text-gray-400">{reqTotal} total</span>
            </div>
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 340 }}>
              {loading && <p className="text-center text-gray-400 py-6 text-sm">Loading...</p>}
              <table className="admin-table w-full">
                <tbody>
                  {reqRows.map(r => {
                    const { date, time } = fmt(r.created_at);
                    const badge = getBadge(r.source);
                    return (
                      <tr key={r.id}>
                        <td className="w-[28%]">
                          <div className="font-bold text-xs">{date}</div>
                          <div className="text-gray-400 text-[0.65rem]">{time}</div>
                        </td>
                        <td>
                          <div className="font-semibold text-sm text-black truncate max-w-[140px]">{r.item}</div>
                          <div className="flex items-center justify-between mt-1 gap-1">
                            <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                            <button onClick={() => delRequest(r.id)} className="text-red-500 text-[0.6rem] font-bold shrink-0">DEL</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={reqPage} total={totalReqPages} onChange={setReqPage} />
          </div>

          {/* REVIEWS */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-[#D4AF37] text-sm">Reviews ({reviews.length})</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3" style={{ maxHeight: 340 }}>
              {reviews.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No reviews yet.</p>}
              {reviews.map(r => (
                <div key={r.id} className="border-b border-gray-50 pb-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-black text-sm">{r.name ?? 'Anonymous'}</span>
                    <span className="text-yellow-400 text-xs">{'⭐'.repeat(r.rating ?? 0)}</span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">"{r.comment}"</p>
                  <div className="text-right mt-1">
                    <button onClick={() => delReview(r.id)} className="text-red-500 text-[0.65rem] font-bold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TRAFFIC LOG */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between">
            <h3 className="font-bold text-gray-800 text-sm">Traffic Log</h3>
            <span className="text-xs text-gray-400">{visitTotal} total visits</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
            <table className="admin-table w-full">
              <thead><tr><th>Time</th><th>Page</th><th>Device</th></tr></thead>
              <tbody>
                {visitRows.map(v => {
                  const { date, time } = fmt(v.created_at);
                  return (
                    <tr key={v.id}>
                      <td><span className="font-bold text-xs">{date}</span> <span className="text-gray-400 text-[0.65rem]">{time}</span></td>
                      <td><span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{v.page ?? 'home'}</span></td>
                      <td className="text-gray-400 text-xs max-w-[180px] truncate">{(v.user_agent ?? 'Unknown').substring(0, 55)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={visitPage} total={totalVisitPages} onChange={setVisitPage} />
        </div>
      </div>
    </div>
  );
}
