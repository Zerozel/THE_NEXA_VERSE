// app/page.tsx — HOME PAGE (SERVER COMPONENT)
// ─────────────────────────────────────────────────────────────────────────────
// This page is a React Server Component. It runs on the server, fetches all
// data from Supabase (via cached fetchers), and sends complete HTML to the
// browser. The browser receives content immediately — no loading spinners
// for the initial render.
//
// WHAT HAPPENS:
//   Server: fetch settings + services + reviews + promo (all cached, parallel)
//   Server: render full HTML with real data
//   Browser: receives HTML with content already in it
//   Browser: hydrates only the interactive Client Components (modals, forms)
//
// This is the primary performance win over v2.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import PromoBanner from '@/components/PromoBanner';
import HomeClient from './HomeClient';
import {
  getServices, getStoreItems, getTopReviews,
  getActivePromo, getAllSettings,
} from '@/lib/supabase-server';

// Force dynamic rendering so fresh cache data is always used
export const revalidate = 60; // Revalidate this page every 60 seconds

export default async function HomePage() {
  // All fetches run in parallel — total time = slowest single fetch, not sum of all
  const [settings, services, storeItems, reviews, promo] = await Promise.all([
    getAllSettings(),
    getServices(),
    getStoreItems(),
    getTopReviews(),
    getActivePromo(),
  ]);

  const hero = settings['hero'] ?? {};
  const titles = settings['home_titles'] ?? {};
  const whatsapp = settings['phone']?.number ?? process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP ?? '2347079722171';

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-[80px]">
      <Header />
      <PromoBanner promo={promo} />

      {/*
        HomeClient receives all data as props (already fetched above).
        It handles: modals, review form submission, WhatsApp redirects,
        visit tracking. All interactivity lives here.
      */}
      <Suspense fallback={<div className="h-screen bg-[#0a0a0a]" />}>
        <HomeClient
          hero={hero}
          titles={titles}
          whatsapp={whatsapp}
          initialServices={services}
          initialStoreItems={storeItems}
          initialReviews={reviews}
        />
      </Suspense>

      <BottomNav />
    </div>
  );
}
