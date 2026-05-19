'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Modal from '@/components/Modal';
import { type Service } from '@/lib/supabase';
import { trackVisit, trackRequest } from '@/lib/analytics';
import { openWhatsApp } from '@/lib/whatsapp';
import { imgSizes } from '@/lib/cloudinary';

interface Props { initialServices: Service[]; pageTitle: string; whatsapp: string; }

const STATIC_FALLBACKS: Service[] = [
  { id:'s1', name:'Electrician',  description:'Wiring, Repairs & Solar', price:2000, market_price:null, highlight:true,  images:[], created_at:'' },
  { id:'s2', name:'Plumber',      description:'Pipes, Taps & Drainage',  price:2500, market_price:null, highlight:false, images:[], created_at:'' },
  { id:'s3', name:'Painter',      description:'Interior & Exterior',     price:5000, market_price:null, highlight:false, images:[], created_at:'' },
  { id:'s4', name:'Carpenter',    description:'Furniture & Roofing',     price:3000, market_price:null, highlight:false, images:[], created_at:'' },
];

export default function ServicesClient({ initialServices, pageTitle, whatsapp }: Props) {
  const services = initialServices.length > 0 ? initialServices : STATIC_FALLBACKS;
  const [selected, setSelected] = useState<Service | null>(null);
  const [customReq, setCustomReq] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { trackVisit('services'); }, []);

  function openModal(svc: Service) { setSelected(svc); }

  async function bookService() {
    if (!selected) return;
    trackRequest(selected.name, 'service_booking');
    setSelected(null);
    openWhatsApp(whatsapp, `Hi NEXA, I want to book: ${selected.name}`);
  }

  async function handleCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customReq.trim()) return;
    setSubmitting(true);
    trackRequest(customReq, 'service_custom_req');
    openWhatsApp(whatsapp, `Hi NEXA, I need a service not listed: ${customReq}`);
  }

  return (
    <>
      {/* Hero */}
      <section className="pt-[80px] pb-6 px-5">
        <h1 className="text-white text-[2rem] leading-[1.2] mb-3" style={{ fontFamily:'var(--font-headline)' }}
            dangerouslySetInnerHTML={{ __html: pageTitle }} />
        <blockquote className="border-l-4 border-[#D4AF37] pl-4 text-white/80 italic text-base mb-5">
          "You won't feel powerless when you call Nexa"
        </blockquote>
        <div className="flex gap-3">
          <button onClick={() => { trackRequest('Inspection', 'hero_cta'); openWhatsApp(whatsapp, 'I want to Request Inspection'); }}
            className="flex-1 bg-[#D4AF37] text-black font-bold py-3 px-4 rounded-xl text-sm">Request Inspection</button>
          <button onClick={() => { trackRequest('Fix It', 'hero_cta'); openWhatsApp(whatsapp, 'I need to Fix It'); }}
            className="flex-1 border border-white text-white font-bold py-3 px-4 rounded-xl text-sm">Send "Fix It"</button>
        </div>
        <p className="text-gray-500 text-sm mt-4">{services.length} services available — select below.</p>
      </section>

      {/* Grid */}
      <section className="px-5 pb-6">
        <div className="grid grid-cols-2 gap-4">
          {services.map(svc => {
            // FIX: Check for Cloudinary URL before optimizing
            const rawImage = svc.images?.[0];
            const img = rawImage && rawImage.includes('cloudinary') ? imgSizes.card(rawImage) : '/logo.png';
            
            return (
              <div key={svc.id} className="relative h-48 rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform shadow-lg bg-[#111] flex items-center justify-center"
                   onClick={() => openModal(svc)}>
                <Image src={img} alt={svc.name} fill className={rawImage ? "object-cover" : "object-contain p-4 opacity-30"} sizes="(max-width: 768px) 45vw, 200px" />
                <div className="poster-overlay absolute inset-0" />
                <span className={`absolute top-2 right-2 text-[0.6rem] font-black px-2 py-0.5 rounded uppercase z-10 ${svc.highlight ? 'bg-red-500 text-white' : 'bg-[#D4AF37] text-black'}`}>
                  {svc.highlight ? 'Popular' : 'Service'}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                  <h3 className="text-white font-bold text-sm">{svc.name}</h3>
                  <p className="text-gray-300 text-[0.7rem] mt-0.5 truncate">{svc.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom Request */}
      <section className="bg-[#f4f6f8] mx-5 mb-6 rounded-xl p-5 text-black">
        <h3 className="font-bold text-base mb-1">Can't find what you need?</h3>
        <p className="text-gray-500 text-sm mb-4">Tell us exactly what you are looking for.</p>
        <form onSubmit={handleCustom} className="flex flex-col gap-3">
          <input value={customReq} onChange={e=>setCustomReq(e.target.value)} placeholder="e.g. Generator Repair, Tiling..." className="nexa-input" required />
          <button type="submit" disabled={submitting} className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg text-sm disabled:opacity-60">
            {submitting ? 'Connecting...' : 'Find Me A Pro'}
          </button>
        </form>
      </section>

      {/* Floating WA */}
      <a href={`https://wa.me/${whatsapp}?text=Hi%20NEXA,%20I%20need%20help.`}
         className="fixed bottom-[80px] right-5 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center text-2xl shadow-lg z-[1000]">💬</a>

      {/* Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="modal-gallery p-4 pb-2">
              {(selected.images?.length ? selected.images : ['/logo.png']).map((src,i) => {
                // FIX: Check for Cloudinary URL before optimizing in the modal
                const modalImg = src.includes('cloudinary') ? imgSizes.modal(src) : src;
                return <img key={i} src={modalImg} alt={selected.name} className={!src.includes('cloudinary') ? "opacity-30 object-contain h-32 w-full" : "w-full rounded-xl object-cover"} />
              })}
            </div>
            <div className="px-6 pb-8">
              <h2 className="text-xl font-black text-black mt-3 mb-1">{selected.name}</h2>
              <p className="text-[#D4AF37] font-bold text-lg mb-3">
                {selected.price ? `Starts at ₦${Number(selected.price).toLocaleString()}` : 'Price on request'}
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap">{selected.description ?? 'Professional service by verified experts.'}</p>
              <button onClick={bookService} className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm">Book on WhatsApp</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
