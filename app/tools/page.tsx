// app/tools/page.tsx — SERVER COMPONENT
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ToolsClient from './ToolsClient';
import { getAllSettings } from '@/lib/supabase-server';

export const metadata = { title: 'Tools' };

export default async function ToolsPage() {
  const settings = await getAllSettings();
  const whatsapp = settings['phone']?.number ?? process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP ?? '2347079722171';
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-[80px]">
      <Header title="TOOLS" />
      <ToolsClient whatsapp={whatsapp} />
      <BottomNav />
    </div>
  );
}
