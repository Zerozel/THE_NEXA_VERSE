'use client';
// components/Modal.tsx
import { useEffect } from 'react';
interface ModalProps { open: boolean; onClose: () => void; children: React.ReactNode; }
export default function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[20000] flex flex-col justify-end items-center fade-in"
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-[20px] max-h-[88vh] overflow-y-auto relative slide-up text-black">
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/10 rounded-full w-9 h-9 flex items-center justify-center text-xl text-gray-600 z-10 hover:bg-black/20 transition-colors">×</button>
        {children}
      </div>
    </div>
  );
}
