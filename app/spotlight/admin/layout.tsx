import Link from 'next/link';

export default function SpotlightAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-[#0A0A0A] px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/spotlight/admin" className="flex items-center gap-2.5">
          <span
            className="text-white font-black text-base tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            SPOTLIGHT
          </span>
          <span className="bg-[#D4AF37] text-black text-[0.6rem] font-black uppercase px-1.5 py-0.5 rounded">
            Admin
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            href="/spotlight/admin/submissions" 
            className="text-gray-300 text-sm font-medium hover:text-white transition-colors"
          >
            Review Queue
          </Link>
          <Link 
            href="/spotlight/admin/content" 
            className="text-gray-300 text-sm font-medium hover:text-white transition-colors"
          >
            Content Queue
          </Link>
          <Link 
            href="/spotlight/admin/profiles" 
            className="text-gray-300 text-sm font-medium hover:text-white transition-colors"
          >
            Manage Profiles
          </Link>
          <Link 
            href="/spotlight" 
            className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
          >
            Exit
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-6">
        {children}
      </main>
    </div>
  );
}
