// app/not-found.tsx
// Shown whenever a URL doesn't match any page.
// Keeps the user in-app rather than showing a bare browser 404.
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-[80px]">
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-5 text-center">
        <p className="text-[#D4AF37] font-black text-8xl mb-4" style={{ fontFamily: 'var(--font-headline)' }}>
          404
        </p>
        <h1 className="text-white font-bold text-2xl mb-2">Page Not Found</h1>
        <p className="text-gray-500 text-sm mb-8 max-w-xs">
          This page doesn't exist. Let's get you back to something useful.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/" className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-xl text-sm text-center">
            Go Home
          </Link>
          <Link href="/services" className="w-full border border-[#333] text-white font-semibold py-3.5 rounded-xl text-sm text-center">
            Browse Services
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
