// lib/cloudinary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary image utilities.
// ─────────────────────────────────────────────────────────────────────────────

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif';
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  gravity?: 'auto' | 'face' | 'center';
}

export function optimizeImage(url: string, opts: ImageTransformOptions = {}): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const {
    width,
    height,
    quality = 80,
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
  } = opts;

  const transforms: string[] = [
    `f_${format}`,
    `q_auto:${quality >= 90 ? 'best' : quality >= 70 ? 'good' : 'eco'}`,
    ...(width  ? [`w_${width}`]  : []),
    ...(height ? [`h_${height}`] : []),
  ];

  // FIX: Only apply gravity if the crop mode supports it
  if (width || height) {
    transforms.push(`c_${crop}`);
    if (crop === 'fill' || crop === 'thumb') {
      transforms.push(`g_${gravity}`);
    }
  }

  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}

export const imgSizes = {
  thumb: (url: string) => optimizeImage(url, { width: 80, height: 80, quality: 75 }),
  card: (url: string) => optimizeImage(url, { width: 300, height: 240, quality: 80 }),
  modal: (url: string) => optimizeImage(url, { width: 600, quality: 85, crop: 'fit' }),
  hero: (url: string) => optimizeImage(url, { width: 1200, quality: 85, crop: 'scale' }),
};

// ── UPLOAD ────────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error('[Cloudinary Detailed Error]:', errorData);
      throw new Error(`Upload failed: ${res.status}`);
    }
    
    const data = await res.json();
    return data.secure_url ?? null;
  } catch (err) {
    console.error('[Cloudinary] Upload error:', err);
    return null;
  }
}

export async function uploadImages(files: FileList): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i]);
    if (url) urls.push(url);
  }
  return urls;
}
