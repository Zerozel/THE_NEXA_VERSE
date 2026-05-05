'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

// 1. We move the form logic into its own component
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/admin/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); }
    else router.replace(redirect);
  }

  return (
    <form onSubmit={handleLogin} className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 space-y-4">
      <h2 className="text-white font-bold text-lg text-center">Sign In</h2>
      {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 text-sm px-4 py-2.5 rounded-lg">{error}</div>}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-1.5">Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
          className="w-full bg-[#111] border border-[#333] text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
          placeholder="admin@nexa.ng" />
      </div>
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-1.5">Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
          className="w-full bg-[#111] border border-[#333] text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
          placeholder="••••••••" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 mt-2">
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}

// 2. The main page now wraps the form in a Suspense bubble
export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="NEXA" width={48} height={48} className="mx-auto mb-3 object-contain" />
          <span className="text-white text-3xl tracking-widest font-black" style={{ fontFamily:'var(--font-headline)' }}>NEXA OPS</span>
          <p className="text-gray-500 text-sm mt-1">Admin Operations Panel v3.0</p>
        </div>
        
        {/* The Next.js Builder will now ignore the URL logic inside this bubble */}
        <Suspense fallback={<div className="text-white text-center py-4">Loading...</div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-gray-700 text-xs mt-6">Admin area · NEXA Operations v3.0</p>
      </div>
    </div>
  );
}
