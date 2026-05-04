// lib/cloudinary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary image utilities.
//
// KEY CONCEPT — URL TRANSFORMATIONS:
//   Cloudinary can transform images ON THE FLY via URL parameters.
//   Instead of serving a raw 3MB photo, we tell Cloudinary:
//     "Serve this as WebP, compress to quality 80, scale to 400px wide"
//   The transformed version is cached on Cloudinary's CDN globally.
//   This is the single biggest performance win for image-heavy pages.
//
// USAGE:
//   const src = optimizeImage(rawUrl, { width: 400, quality: 80 });
//   <Image src={src} ... />
// ─────────────────────────────────────────────────────────────────────────────

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;     // 1–100, default 80
  format?: 'auto' | 'webp' | 'avif'; // 'auto' picks best for the browser
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  gravity?: 'auto' | 'face' | 'center';
}

/**
 * Transforms a raw Cloudinary URL to include optimization parameters.
 * Non-Cloudinary URLs are returned unchanged.
 *
 * @example
 * optimizeImage('https://res.cloudinary.com/demo/image/upload/sample.jpg', { width: 400 })
 * → 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:good,w_400/sample.jpg'
 */
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
    ...(width || height ? [`c_${crop}`, `g_${gravity}`] : []),
  ];

  // Insert transforms after '/upload/'
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}

// Pre-configured size helpers for consistent usage across the app
export const imgSizes = {
  /** 80px thumbnail — admin gallery, cart items */
  thumb: (url: string) => optimizeImage(url, { width: 80, height: 80, quality: 75 }),
  /** 300px card — store grid, service cards */
  card: (url: string) => optimizeImage(url, { width: 300, height: 240, quality: 80 }),
  /** 600px modal — product detail images */
  modal: (url: string) => optimizeImage(url, { width: 600, quality: 85, crop: 'fit' }),
  /** 1200px hero — homepage background */
  hero: (url: string) => optimizeImage(url, { width: 1200, quality: 85, crop: 'scale' }),
};

// ── UPLOAD ────────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  // Request eager transformation on upload — thumbnail ready immediately
  formData.append('eager', 'f_auto,q_auto:good,w_400');

  try {
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
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
