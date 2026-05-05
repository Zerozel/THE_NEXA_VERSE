// app/tools/page.tsx
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ToolsClient from './ToolsClient';

export const metadata = { title: 'Tools' };

export default function ToolsPage() {
  // We are now using your exact .env variable name here.
  // The "||" means "OR". If the .env is empty, use the fallback number so the site doesn't crash.
  const whatsappNumber = process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP || "2348000000000";

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-[80px]">
      <Header title="TOOLS" />
      
      {/* Passing the number cleanly to the Client */}
      <ToolsClient whatsapp={whatsappNumber} />
      
      <BottomNav />
    </div>
  );
}
