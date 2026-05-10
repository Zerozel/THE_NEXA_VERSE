// app/store/page.tsx — SERVER COMPONENT
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import PromoBanner from '@/components/PromoBanner';
import StoreClient from './StoreClient';
import { getStoreItems, getActivePromo, getAllSettings } from '@/lib/supabase-server';

export const revalidate = 120;
export const metadata = { title: 'Campus Store' };

export default async function StorePage() {
  const [items, promo, settings] = await Promise.all([
    getStoreItems(),
    getActivePromo(),
    getAllSettings(),
  ]);
  const whatsapp = settings['phone']?.number ?? process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP ?? '2347079722171';

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-[80px]">
      <Header title="STORE" />
      <PromoBanner promo={promo} />
      <StoreClient initialItems={items} whatsapp={whatsapp} />
      <BottomNav />
    </div>
  );
}
