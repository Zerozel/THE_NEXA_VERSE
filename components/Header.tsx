// components/Header.tsx
// Server Component — no 'use client' needed, renders as static HTML
import Image from 'next/image';

interface HeaderProps { title?: string; }

export default function Header({ title = 'NEXA' }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] bg-[rgba(10,10,10,0.98)] backdrop-blur-md border-b border-[#222] z-[900] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="NEXA" width={32} height={32} className="object-contain" priority />
        <span className="font-headline text-white text-xl tracking-[3px] uppercase" style={{ fontFamily: 'var(--font-headline)' }}>
          {title}
        </span>
      </div>
    </header>
  );
}
