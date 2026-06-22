'use client';
// components/spotlight/tracking/TrackingLookupForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SpotlightButton from '@/components/spotlight/ui/SpotlightButton';
import SpotlightInput  from '@/components/spotlight/ui/SpotlightInput';
import { isValidTrackingTokenFormat } from '@/lib/spotlight/tracking';

export default function TrackingLookupForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      setError('Enter your tracking code to continue.');
      return;
    }
    if (!isValidTrackingTokenFormat(trimmed)) {
      setError('That doesn\u2019t look like a valid tracking code. It should start with "sp_trk_".');
      return;
    }
    router.push(`/spotlight/track/${trimmed}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <SpotlightInput
        label="Tracking Code"
        placeholder="sp_trk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        value={value}
        onChange={e => { setValue(e.target.value); setError(''); }}
        error={error || undefined}
        helpText="You received this code after submitting your Spotlight application."
      />
      <SpotlightButton type="submit" variant="primary" fullWidth className="mt-2">
        Track My Spotlight →
      </SpotlightButton>
    </form>
  );
}
