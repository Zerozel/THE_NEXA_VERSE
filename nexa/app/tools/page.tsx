// app/tools/page.tsx
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ToolsClient from './ToolsClient';
export const metadata = { title: 'Tools' };
export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-[80px]">
      <Header title="TOOLS" />
      <ToolsClient />
      <BottomNav />
    </div>
  );
}
