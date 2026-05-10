'use client';
// lib/useWhatsApp.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fetches the admin-configured WhatsApp number from the settings table.
// Falls back to the env var default instantly (no loading flicker).
// The server already knows the number — this hook syncs the client.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const DEFAULT = process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP ?? '2347079722171';

export function useWhatsApp(): string {
  const [phone, setPhone] = useState(DEFAULT);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'phone')
      .single()
      .then(({ data }) => {
        if (data?.value?.number) setPhone(data.value.number);
      });
  }, []);

  return phone;
}
