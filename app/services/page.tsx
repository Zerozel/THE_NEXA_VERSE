// app/services/page.tsx — SERVER COMPONENT
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import PromoBanner from '@/components/PromoBanner';
import ServicesClient from './ServicesClient';
import { getServices, getActivePromo, getAllSettings } from '@/lib/supabase-server';

export const revalidate = 120;
export const metadata = { title: 'Services' };

export default async function ServicesPage() {
  const [services, promo, settings] = await Promise.all([
    getServices(),
    getActivePromo(),
    getAllSettings(),
  ]);
  const pageTitle = settings['service_hero']?.title ?? "What do you need <br/><span style='color:#D4AF37'>fixed today?</span>";
  const whatsapp = settings['phone']?.number ?? process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP ?? '2347079722171';

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-[80px]">
      <Header title="SERVICES" />
      <PromoBanner promo={promo} />
      <ServicesClient initialServices={services} pageTitle={pageTitle} whatsapp={whatsapp} />
      <BottomNav />
    </div>
  );
}
