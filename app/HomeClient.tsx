'use client';
// app/HomeClient.tsx — HOME PAGE CLIENT LAYER
// ─────────────────────────────────────────────────────────────────────────────
// Handles all interactivity on the home page:
//   - Visit tracking (fires once on mount)
//   - Service card booking (track + WhatsApp redirect)
//   - Store product modals (image gallery, order button)
//   - Review form submission
//   - Admin secret door (long press footer)
//
// Receives all initial data as props from the Server Component above.
// No data fetching happens here on load — data was already fetched server-side.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { supabase, type Service, type StoreItem, type Review } from '@/lib/supabase';
import { trackVisit, trackRequest } from '@/lib/analytics';
import { openWhatsApp } from '@/lib/whatsapp';
import { imgSizes } from '@/lib/cloudinary';

interface Props {
  hero: Record<string, string>;
  titles: Record<string, string>;
  whatsapp: string;
  initialServices: Service[];
  initialStoreItems: StoreItem[];
  initialReviews: Review[];
}

interface ModalItem { name: string; price: number; marketPrice?: number | null; description?: string | null; images: string[]; }

export default function HomeClient({ hero, titles, whatsapp, initialServices, initialStoreItems, initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [modalItem, setModalItem] = useState<ModalItem | null>(null);
  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { trackVisit('home'); }, []);

  async function bookService(svc: Service) {
    trackRequest(svc.name, 'home_service_click');
    openWhatsApp(whatsapp, `I need ${svc.name}`);
  }

  async function orderItem(item: ModalItem) {
    trackRequest(item.name, 'home_store_click', item.price);
    setModalItem(null);
    openWhatsApp(whatsapp, `Hi NEXA, I want to order: ${item.name} (₦${item.price.toLocaleString()})`);
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!revName || !revComment) return;
    setSubmitting(true);
    const { data } = await supabase.from('reviews').insert({ name: revName, rating: revRating, comment: revComment }).select().single();
    if (data) setReviews(r => [data as Review, ...r].slice(0, 6));
    setRevName(''); setRevRating(5); setRevComment('');
    setSubmitting(false);
  }

  const startPress = () => { pressTimer.current = setTimeout(() => window.location.href = '/admin/login', 2500); };
  const endPress = () => clearTimeout(pressTimer.current);

  const heroImage = hero.image || '/hero-image-1.jpg';
  const headline = hero.headline || "Tired of Unreliable <br/><span style='color:#D4AF37'>Artisans?</span>";
  const subtext = hero.subtext || "Get your home or office fixed. Guaranteed.";
  const problemTitle = titles.problem || 'The Stress is Real';
  const solutionTitle = titles.solution || 'Your 3-Step Fix';

  return (
    <>
      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative w-full h-[60vh] bg-cover bg-center flex items-end mt-[60px]"
               style={{ backgroundImage: `url('${heroImage}')` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-white text-[2.4rem] leading-[1.1] mb-2"
              style={{ fontFamily: 'var(--font-headline)' }}
              dangerouslySetInnerHTML={{ __html: headline }} />
          <p className="text-gray-300 text-sm mb-4" dangerouslySetInnerHTML={{ __html: subtext }} />
          <div className="flex gap-3">
            <Link href="/services" className="bg-[#D4AF37] text-black font-bold px-5 py-3 rounded-lg text-sm">Book a Verified Pro</Link>
            <Link href="/store" className="border border-white text-white font-bold px-5 py-3 rounded-lg text-sm">Shop Store</Link>
          </div>
        </div>
      </section>

      {/* ── PROBLEMS ───────────────────────────────────────────── */}
      <section className="bg-[#111] py-8 px-5">
        <h2 className="text-white text-2xl mb-4" style={{ fontFamily: 'var(--font-headline)' }}>{problemTitle}</h2>
        <div className="scroll-row">
          {[['⏳','Wasted Time'],['🚫','No Trust'],['💸','Unclear Pricing'],['😤','Poor Quality']].map(([icon, label]) => (
            <div key={label} className="flex-shrink-0 w-36 h-36 bg-[#1a1a1a] border border-[#333] rounded-xl flex flex-col items-center justify-center gap-2 p-3">
              <span className="text-3xl">{icon}</span>
              <span className="text-white text-xs font-semibold text-center">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOLUTION STEPS ─────────────────────────────────────── */}
      <section className="bg-white py-8 px-5">
        <h2 className="text-black text-2xl mb-4" style={{ fontFamily: 'var(--font-headline)' }}>{solutionTitle}</h2>
        <div className="scroll-row">
          {[
            { n:'1', t:'Tell Us Your Need',   b:"Message us what's wrong. A leaky tap, a flickering light—whatever it is." },
            { n:'2', t:'We Dispatch a Pro',   b:'We send a verified, professional specialist right to your door.' },
            { n:'3', t:'Job Done.',            b:'You get high-quality work. Simple, clean, and stress-free.' },
          ].map(s => (
            <div key={s.n} className="flex-shrink-0 w-52 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center font-black text-black text-sm mb-2">{s.n}</div>
              <h3 className="font-bold text-black text-base mb-1">{s.t}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES PREVIEW ───────────────────────────────────── */}
      <section className="py-8 px-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-2xl" style={{ fontFamily: 'var(--font-headline)' }}>Our Services</h2>
          <Link href="/services" className="text-[#D4AF37] text-sm font-semibold">See All →</Link>
        </div>
        <div className="scroll-row">
          {initialServices.slice(0, 6).map(svc => {
            // FIX 1: Service Preview Grid
            const rawImage = svc.images?.[0];
            const img = rawImage && rawImage.includes('cloudinary') ? imgSizes.card(rawImage) : '/logo.png';
            
            return (
              <div key={svc.id} className="flex-shrink-0 w-44 h-52 relative rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform bg-[#111] flex items-center justify-center"
                   onClick={() => bookService(svc)}>
                <Image src={img} alt={svc.name} fill className={rawImage ? "object-cover" : "object-contain p-4 opacity-30"} sizes="176px" />
                <div className="poster-overlay absolute inset-0" />
                {svc.highlight && <span className="absolute top-2 right-2 bg-[#D4AF37] text-black text-[0.6rem] font-black px-2 py-0.5 rounded uppercase z-10">Popular</span>}
                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                  <h3 className="text-white font-bold text-sm">{svc.name}</h3>
                  <div className="mt-1 w-full text-center text-[0.7rem] font-bold uppercase tracking-wide bg-white/20 backdrop-blur border border-white/30 text-white py-1.5 rounded-md">Book Now</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TRUST ──────────────────────────────────────────────── */}
      <section className="bg-[#f5f5f5] py-8 px-5">
        <h2 className="text-black text-2xl mb-5" style={{ fontFamily: 'var(--font-headline)' }}>Why Trust NEXA?</h2>
        <div className="space-y-5">
          {[['✅','Verified Community Pros','Every specialist is background-checked and skill-verified.'],
            ['💰','Student-Friendly Pricing',"High-quality work at prices designed for a student's budget."],
            ['🛡️','Guaranteed Work',"If you're not satisfied, we'll work to make it right."],
            ['⚡','On-Demand Service','Fast response. We get a trusted pro to you when you need them.'],
          ].map(([icon,title,body]) => (
            <div key={title} className="flex gap-4 items-start">
              <span className="text-2xl mt-0.5">{icon}</span>
              <div><h3 className="font-bold text-black text-sm">{title}</h3><p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{body}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ────────────────────────────────────────────── */}
      <section className="bg-white py-8 px-5">
        <h2 className="text-black text-2xl mb-4" style={{ fontFamily: 'var(--font-headline)' }}>What People Say</h2>
        <div className="scroll-row">
          {reviews.map(r => (
            <div key={r.id} className="flex-shrink-0 w-64 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-[#f1c40f] text-base mb-2">{'⭐'.repeat(r.rating)}</div>
              <p className="italic text-gray-600 text-sm leading-relaxed">"{r.comment}"</p>
              <p className="text-right font-bold text-black text-xs mt-2">— {r.name ?? 'Student'}</p>
            </div>
          ))}
        </div>
        {/* Review Form */}
        <form onSubmit={submitReview} className="mt-6 bg-gray-50 rounded-xl p-5 max-w-md mx-auto">
          <h3 className="font-bold text-black text-center mb-4">Rate your experience</h3>
          <input value={revName} onChange={e=>setRevName(e.target.value)} placeholder="Your Name" required className="nexa-input mb-3" />
          <select value={revRating} onChange={e=>setRevRating(Number(e.target.value))} className="nexa-input mb-3 appearance-none">
            {[5,4,3,2,1,0].map(n=><option key={n} value={n}>{'⭐'.repeat(n)} {['Terrible','Poor','Fair','Okay','Good','Excellent'][n]}</option>)}
          </select>
          <textarea value={revComment} onChange={e=>setRevComment(e.target.value)} placeholder="What happened?" rows={3} required className="nexa-input mb-3 resize-none" />
          <button type="submit" disabled={submitting} className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg text-sm disabled:opacity-60">
            {submitting ? 'Posting...' : 'Post Review'}
          </button>
        </form>
      </section>

      {/* ── STORE SCROLLER ─────────────────────────────────────── */}
      <section className="py-8 px-5 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-2xl" style={{ fontFamily: 'var(--font-headline)' }}>Campus Store</h2>
          <Link href="/store" className="text-[#D4AF37] text-sm font-semibold">Visit Store →</Link>
        </div>
        <div className="scroll-row">
          {initialStoreItems.slice(0, 6).map(item => {
            // FIX 2: Store Scroller Grid
            const rawImage = item.images?.[0];
            const img = rawImage && rawImage.includes('cloudinary') ? imgSizes.card(rawImage) : '/logo.png';
            
            return (
              <div key={item.id} className="flex-shrink-0 w-44 bg-white rounded-xl overflow-hidden cursor-pointer shadow-md active:scale-[0.98] transition-transform"
                   onClick={() => setModalItem({ name: item.name, price: item.price, marketPrice: item.market_price, description: item.description, images: item.images })}>
                <div className="relative w-full h-36 bg-gray-100 flex items-center justify-center">
                  <Image src={img} alt={item.name} fill className={rawImage ? "object-cover" : "object-contain p-4 opacity-30"} sizes="176px" />
                </div>
                <div className="p-3">
                  <p className="font-bold text-black text-sm truncate">{item.name}</p>
                  <p className="text-red-600 font-bold text-sm">₦{item.price.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <div className="text-center py-6 px-5 text-gray-600 text-xs">
        <div className="flex justify-center gap-4 mb-3">
          <a href="https://whatsapp.com/channel/0029Vb6iRrXGk1FkDdCY7G39" className="text-[#D4AF37] font-bold">WhatsApp Channel</a>
          <span>|</span>
          <a href="https://www.instagram.com/nexa.0001" className="text-[#D4AF37] font-bold">Instagram</a>
        </div>
        <span onMouseDown={startPress} onMouseUp={endPress} onTouchStart={startPress} onTouchEnd={endPress}
              className="cursor-default select-none">© 2026 NEXA. All rights reserved.</span>
      </div>

      {/* ── PRODUCT MODAL ──────────────────────────────────────── */}
      <Modal open={!!modalItem} onClose={() => setModalItem(null)}>
        {modalItem && (
          <>
            <div className="modal-gallery p-4 pb-2">
              {(modalItem.images?.length ? modalItem.images : ['/logo.png']).map((src, i) => {
                // FIX 3: The Modal
                const modalImg = src.includes('cloudinary') ? imgSizes.modal(src) : src;
                return <img key={i} src={modalImg} alt={modalItem.name} className={!src.includes('cloudinary') ? "opacity-30 object-contain h-32 w-full" : "w-full rounded-xl object-cover"} />
              })}
            </div>
            <div className="px-6 pb-8">
              <h2 className="text-xl font-black text-black mt-2 mb-1">{modalItem.name}</h2>
              {modalItem.marketPrice && modalItem.marketPrice > modalItem.price
                ? <p className="mb-3"><s className="text-gray-400 text-sm mr-2">₦{modalItem.marketPrice.toLocaleString()}</s><span className="text-green-600 font-bold text-lg">₦{modalItem.price.toLocaleString()}</span></p>
                : <p className="text-[#D4AF37] font-bold text-xl mb-3">₦{modalItem.price.toLocaleString()}</p>}
              <p className="text-gray-600 text-sm leading-relaxed mb-5 whitespace-pre-wrap">{modalItem.description ?? 'Fresh stock from NEXA.'}</p>
              <button onClick={() => orderItem(modalItem)} className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm">Order on WhatsApp</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
