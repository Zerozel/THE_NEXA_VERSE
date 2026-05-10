// app/api/admin/upload/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server-side image upload proxy to Cloudinary.
//
// WHY PROXY THROUGH THE SERVER:
//   The Cloudinary upload preset is public (it's fine). But going through
//   the server lets us: validate file type/size, add virus scanning later,
//   and ensure only authenticated admins can upload to our Cloudinary account.
//
// USAGE:
//   POST /api/admin/upload  { formData with 'file' field }
//   Returns: { url: 'https://res.cloudinary.com/...' }
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

// Max 5MB per image
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 });
    }

    // Forward to Cloudinary
    const cloudForm = new FormData();
    cloudForm.append('file', file);
    cloudForm.append('upload_preset', UPLOAD_PRESET);
    // Request eager transform on upload — card-size version ready immediately
    cloudForm.append('eager', 'f_auto,q_auto:good,w_400,h_300,c_fill');
    cloudForm.append('folder', 'nexa');

    const res = await fetch(UPLOAD_URL, { method: 'POST', body: cloudForm });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cloudinary error: ${err}`);
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, url: data.secure_url as string });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    console.error('[/api/admin/upload]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
