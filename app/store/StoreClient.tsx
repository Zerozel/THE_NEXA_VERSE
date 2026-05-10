'use client';
// app/store/StoreClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full store with:
//   - Instant client-side filtering on already-loaded data (no lag)
//   - Server-side full-text search for queries (hits /api/search)
//   - Debounced search to avoid hammering the API on every keystroke
//   - Hot deals horizontal scroller
//   - Product modal with image gallery
//   - Custom request form
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Modal from '@/components/Modal';
import { type StoreItem } from '@/lib/supabase';
import { trackVisit, trackRequest } from '@/lib/analytics';
import { openWhatsApp } from '@/lib/whatsapp';
import { imgSizes } from '@/lib/cloudinary';

interface Props { initialItems: StoreItem[]; whatsapp: string; }

// Debounce hook — waits N ms after last keystroke before updating value
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function StoreClient({ initialItems, whatsapp }: Props) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<StoreItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<StoreItem | null>(null);
  const [customReq, setCustomReq] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const debouncedSearch = useDebounce(search, 350); // 350ms debounce

  useEffect(() => { trackVisit('store'); }, []);

  // ── SEARCH LOGIC ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults(null);  // Show all items when search is empty
      return;
    }

    // First: instant client-side filter (shows results immediately)
    const q = debouncedSearch.toLowerCase();
    const instant = initialItems.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category ?? '').toLowerCase().includes(q) ||
      (i.description ?? '').toLowerCase().includes(q)
    );
    setSearchResults(instant);

    // Then: server-side full-text search (more comprehensive, replaces above)
    setSearchLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}&type=store`)
      .then(r => r.json())
      .then(data => {
        if (data.items?.length >= 0) setSearchResults(data.items);
      })
      .catch(() => {}) // keep client-side results on error
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch, initialItems]);

  const displayItems = searchResults ?? initialItems;

  const grouped = useMemo(() => {
    const map: Record<string, StoreItem[]> = {};
    displayItems.forEach(item => {
      const cat = item.category ?? 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [displayItems]);

  const hotItems = useMemo(() => initialItems.filter(i => i.highlight), [initialItems]);

  async function handleOrder() {
    if (!selected) return;
    trackRequest(selected.name, 'store_order', selected.price);
    setSelected(null);
    openWhatsApp(whatsapp, `Hi NEXA, I want to order: ${selected.name} (₦${selected.price.toLocaleString()})`);
  }

  async function handleCustomReq(e: React.FormEvent) {
    e.preventDefault();
    if (!customReq.trim()) return;
    setSubmitting(true);
    trackRequest(customReq, 'store_custom_req');
    openWhatsApp(whatsapp, `Hi NEXA, I am looking for this product: ${customReq}. Do you have it?`);
  }

  const ProductCard = ({ item }: { item: StoreItem }) => {
    // FIX: Only pass to imgSizes if it's a real Cloudinary URL, otherwise keep the local path intact
    const rawImage = item.images?.[0];
    const img = rawImage && rawImage.includes('cloudinary') ? imgSizes.card(rawImage) : '/logo.png';
    const hasDeal = item.market_price && item.market_price > item.price;
    
    return (
      <div className="bg-white rounded-xl overflow-hidden cursor-pointer shadow active:scale-[0.98] transition-transform relative"
           onClick={() => setSelected(item)}>
        {item.highlight && <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[0.6rem] font-black px-1.5 py-0.5 rounded">HOT</span>}
        <div className="relative w-full h-36 bg-gray-100 flex items-center justify-center">
           {/* If it's the logo fallback, we don't want it to stretch awkwardly */}
          <Image src={img} alt={item.name} fill className={rawImage ? "object-cover" : "object-contain p-4 opacity-30"} sizes="(max-width:768px) 45vw, 200px" />
        </div>
        <div className="p-3 pb-8">
          <p className="font-bold text-black text-sm truncate">{item.name}</p>
          {hasDeal
            ? <div className="flex items-baseline gap-1.5 mt-0.5">
                <s className="text-gray-400 text-xs">₦{Number(item.market_price).toLocaleString()}</s>
                <span className="text-green-600 font-bold text-sm">₦{item.price.toLocaleString()}</span>
              </div>
            : <p className="text-red-600 font-bold text-sm mt-0.5">₦{item.price.toLocaleString()}</p>}
          <div className="absolute bottom-3 right-3 w-7 h-7 bg-[#D4AF37] rounded-full flex items-center justify-center text-black font-black text-base">+</div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-[80px] px-5 pb-4">
        <h1 className="text-white text-[2rem] leading-tight mb-1" style={{ fontFamily:'var(--font-headline)' }}>
          Campus <span className="text-[#D4AF37]">Essentials</span>
        </h1>
        <p className="text-gray-500 text-sm mb-4">Quality products delivered to your door.</p>
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items (e.g. socket, bulb)..."
            className="w-full px-4 py-3 bg-[#222] border border-[#333] text-white rounded-lg text-sm focus:outline-none focus:border-[#D4AF37] transition-colors pr-10" />
          {searchLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">...</span>
          )}
        </div>
      </section>

      <section className="px-5">
        {/* Hot Deals */}
        {!search && hotItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[#D4AF37] font-bold uppercase tracking-widest text-xs mb-3">🔥 Hot Deals</h2>
            <div className="scroll-row flex gap-3 overflow-x-auto pb-4 snap-x">
              {hotItems.map(item => (
                <div key={item.id} className="flex-shrink-0 w-40 snap-start"><ProductCard item={item} /></div>
              ))}
            </div>
          </div>
        )}

        {/* Search empty state */}
        {search.length > 0 && search.length < 2 && (
          <p className="text-gray-500 text-sm text-center py-4">Keep typing to search...</p>
        )}

        {/* Category groups */}
        {grouped.map(([cat, items]) => (
          <div key={cat} className="mb-7">
            <h2 className="text-[#D4AF37] font-bold uppercase tracking-widest text-xs mb-3 border-b border-[#222] pb-2">{cat}</h2>
            <div className="grid grid-cols-2 gap-3">
              {items.map(item => <ProductCard key={item.id} item={item} />)}
            </div>
          </div>
        ))}

        {displayItems.length === 0 && search && (
          <p className="text-center text-gray-500 py-10">No items match "{search}"</p>
        )}

        {/* Custom Request */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 mt-2 mb-6 text-center">
          <h3 className="font-bold text-white text-base mb-1">Can't find what you need?</h3>
          <p className="text-gray-500 text-sm mb-4">Tell us, and we'll get it for you.</p>
          <form onSubmit={handleCustomReq} className="flex flex-col gap-3">
            <input value={customReq} onChange={e=>setCustomReq(e.target.value)} placeholder="e.g. 6 Watt Energy Bulb"
              className="w-full px-4 py-3 bg-[#111] border border-[#444] text-white rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]" required />
            <button type="submit" disabled={submitting} className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg text-sm disabled:opacity-60">
              {submitting ? 'Connecting...' : 'Request on WhatsApp'}
            </button>
          </form>
        </div>
      </section>

      {/* Floating Cart */}
      <a href={`https://wa.me/${whatsapp}?text=I%20want%20to%20buy%20something`}
         className="fixed bottom-[80px] right-5 w-14 h-14 bg-[#D4AF37] text-black rounded-full flex items-center justify-center text-2xl shadow-lg z-[1000]">🛒</a>

      {/* Product Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="modal-gallery p-4 pb-2">
              {(selected.images?.length ? selected.images : ['/logo.png']).map((src,i) => {
                // FIX: Only pass to imgSizes if it's a real Cloudinary URL
                const modalImg = src.includes('cloudinary') ? imgSizes.modal(src) : src;
                return <img key={i} src={modalImg} alt={selected.name} className={!src.includes('cloudinary') ? "opacity-30 object-contain h-32 w-full" : "w-full rounded-xl object-cover"} />
              })}
            </div>
            <div className="px-6 pb-8">
              <h2 className="text-xl font-black text-black mt-2 mb-1">{selected.name}</h2>
              {selected.market_price && selected.market_price > selected.price
                ? <p className="mb-3"><s className="text-gray-400 text-sm mr-2">₦{Number(selected.market_price).toLocaleString()}</s><span className="text-green-600 font-bold text-xl">₦{selected.price.toLocaleString()}</span></p>
                : <p className="text-red-600 font-bold text-xl mb-3">₦{selected.price.toLocaleString()}</p>}
              <p className="text-gray-600 text-sm leading-relaxed mb-6">{selected.description ?? 'Fresh stock from NEXA.'}</p>
              <button onClick={handleOrder} className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm">Order on WhatsApp</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
