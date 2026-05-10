'use client';
import { useEffect, useRef } from 'react';
import { trackVisit } from '@/lib/analytics';

export default function AboutClient({ whatsapp }: { whatsapp: string }) {
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => { trackVisit('about'); }, []);
  const start = () => { pressTimer.current = setTimeout(() => window.location.href = '/admin/login', 2000); };
  const end = () => clearTimeout(pressTimer.current);

  return (
    <>
      <section className="pt-[80px] px-5 pb-6">
        <h1 className="text-3xl leading-[1.2] mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
          {"We're on a Mission to "}
          <br />
          <span className="text-[#D4AF37]">Make Life Easier.</span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed">
          NEXA was founded on a simple idea: finding a reliable artisan should not be stressful.
        </p>
      </section>

      <section className="bg-[#111] border-t border-b border-[#222] py-5 px-5">
        <div className="flex justify-around text-center">
          {[['100%','Verified Pros'],['24/7','Support'],['v3.0','Platform']].map(([n,l]) => (
            <div key={l}>
              <div className="text-[#D4AF37] text-3xl font-black" style={{ fontFamily:'var(--font-headline)' }}>{n}</div>
              <div className="text-gray-500 text-[0.7rem] uppercase tracking-widest mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
            <h3 className="text-[#D4AF37] font-bold uppercase tracking-wider text-sm mb-3">Our Mission</h3>
            <p className="text-gray-300 text-sm leading-relaxed">To relieve the stress for homeowners and students by providing a single, reliable source for guaranteed, high-quality repairs.</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
            <h3 className="text-[#D4AF37] font-bold uppercase tracking-wider text-sm mb-3">Our Vision</h3>
            <p className="text-gray-300 text-sm leading-relaxed">To build the most trusted network of specialists in the community, known for reliability, fair pricing, and expert work.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#111] border-t border-b border-[#222] px-5 py-8">
        <h2 className="text-2xl text-white mb-5" style={{ fontFamily:'var(--font-headline)' }}>Message From The Founders</h2>
        <div className="border-l-4 border-[#D4AF37] pl-5 space-y-4 text-gray-300 text-sm leading-relaxed">
          <p>I started NEXA for one simple reason: <strong className="text-white">I was tired of the anxiety.</strong></p>
          <p>{"We're a founding team of three who got tired of hearing \"I don't know who to call.\" So we built NEXA to be the answer."}</p>
          <p className="text-[#D4AF37] font-black text-base">{"That's our promise."}</p>
        </div>
      </section>

      <section className="bg-[#111] border-t border-[#222] px-5 py-8">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 text-center">
          <h3 className="font-bold text-white text-xl mb-2">Contact Us</h3>
          <p className="text-gray-500 text-sm mb-6">Have a question, complaint, or want to join as a Pro?</p>
          <a href={"https://wa.me/" + whatsapp} className="flex items-center justify-center gap-2 w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm mb-3">
            Chat on WhatsApp
          </a>
          <a href="mailto:nexatechnologies.ng@gmail.com" className="flex items-center justify-center gap-2 w-full border border-[#444] text-white font-bold py-4 rounded-xl text-sm">
            Email Support
          </a>
        </div>
        <div className="text-center mt-8 text-gray-700 text-xs">
          <span onMouseDown={start} onMouseUp={end} onTouchStart={start} onTouchEnd={end} className="cursor-default select-none">
            2026 NEXA. Version 3.0
          </span>
        </div>
      </section>
    </>
  );
}
