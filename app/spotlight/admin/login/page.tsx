'use client';
// app/spotlight/admin/login/page.tsx
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { spotlightSupabase } from '@/lib/spotlight/supabaseBrowser';
import SpotlightButton from '@/components/spotlight/ui/SpotlightButton';
import SpotlightInput  from '@/components/spotlight/ui/SpotlightInput';

export default function SpotlightAdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await spotlightSupabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get('redirect') || '/spotlight/admin';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-[#F7F8FA]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl mb-2">\ud83d\udd26</p>
          <h1 className="text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-headline)' }}>
            Spotlight Admin
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to review submissions.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SpotlightInput
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <SpotlightInput
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            error={error || undefined}
          />
          <SpotlightButton type="submit" variant="primary" fullWidth loading={loading}>
            Sign In
          </SpotlightButton>
        </form>
      </div>
    </div>
  );
}
