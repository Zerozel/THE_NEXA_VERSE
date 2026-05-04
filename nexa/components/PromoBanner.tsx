'use client';
// components/PromoBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Accepts promo data as a prop (fetched server-side in the page).
// This means NO extra client fetch on load — data arrives with the HTML.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import type { Promo } from '@/lib/supabase';

interface Props { promo: Promo | null; }

export default function PromoBanner({ promo }: Props) {
  const [visible, setVisible] = useState(true);
  if (!promo || !visible) return null;
  return (
    <div className="relative bg-[#D4AF37] text-black text-sm font-bold text-center px-10 py-3 z-[90]"
         style={{ animation: 'slideDown 0.4s ease' }}>
      <strong>{promo.title}:</strong> {promo.message}
      <button onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none cursor-pointer bg-none border-none">×</button>
    </div>
  );
}
