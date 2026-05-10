// app/about/page.tsx — SERVER COMPONENT
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AboutClient from './AboutClient';
import { getAllSettings } from '@/lib/supabase-server';

export const metadata = { title: 'About Us' };

export default async function AboutPage() {
  const settings = await getAllSettings();
  const whatsapp = settings['phone']?.number ?? process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP ?? '2347079722171';
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-[100px]">
      <Header title="ABOUT" />
      <AboutClient whatsapp={whatsapp} />
      <BottomNav />
    </div>
  );
}
