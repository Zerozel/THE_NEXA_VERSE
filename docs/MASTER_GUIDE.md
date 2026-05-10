# NEXA v3.0 — Master Technical Guide

---

## Table of Contents
1. [What Was Built](#1-what-was-built)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [How to Launch](#4-how-to-launch)
5. [The Optimization Systems](#5-the-optimization-systems)
6. [The Database](#6-the-database)
7. [The Admin Panel](#7-the-admin-panel)
8. [Adding New Features](#8-adding-new-features)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. What Was Built

NEXA v3 is a **bulletproof, production-grade** mobile-first web platform for a campus services and store business. It is built on:

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 App Router | Server Components, caching, routing |
| Database | Supabase (PostgreSQL) | RLS security, Realtime, Auth, full-text search |
| Images | Cloudinary | On-the-fly compression, global CDN |
| Hosting | Vercel | Edge network, zero-config deploys |
| PWA | next-pwa | Offline support, installable on Android/iOS |

### Pages

| Route | Type | Description |
|---|---|---|
| `/` | Server + Client | Home — hero, services, store, reviews |
| `/services` | Server + Client | Services grid, booking modal |
| `/store` | Server + Client | Store with search, categories, cart modal |
| `/tools` | Server + Client | Cost Estimator, Bill Splitter, Electricity Calculator |
| `/about` | Server + Client | About, contact, admin secret door |
| `/admin/login` | Client | Supabase Auth login |
| `/admin/dashboard` | Client | Full CMS — settings, services, store, promos |
| `/admin/analytics` | Client | KPIs, 30-day chart, paginated tables, realtime |

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/track` | Receives visit + request events from browser |
| `GET /api/search?q=...` | Full-text search across services + store |
| `POST /api/settings` | Saves settings AND purges Next.js cache |

---

## 2. Architecture Overview

### The Two-Layer Pattern (Most Important Concept)

Every public page uses a **Server + Client split**:

```
app/services/page.tsx          ← SERVER COMPONENT
  └── fetches data from Supabase (cached, fast)
  └── renders HTML with real content
  └── passes data as props to:
        app/services/ServicesClient.tsx  ← CLIENT COMPONENT
          └── handles clicks, modals, forms, WhatsApp
```

**Why this matters:** In v2, the browser loaded a blank page, then fetched data. Users saw loading spinners. In v3, the server sends complete HTML with content already inside it. On a slow 3G campus network, this is the difference between 8 seconds and 2 seconds to first useful content.

### The Caching System

```
lib/supabase-server.ts
  └── getServices()       → cached 2 minutes, tag: 'services'
  └── getStoreItems()     → cached 2 minutes, tag: 'store-items'
  └── getActivePromo()    → cached 1 minute,  tag: 'promos'
  └── getTopReviews()     → cached 3 minutes, tag: 'reviews'
  └── getAllSettings()    → cached 5 minutes, tag: 'settings'
```

When an admin saves a service in the dashboard:
1. Supabase saves the new data
2. The dashboard calls `POST /api/settings` with `{ table: 'services' }`
3. The API route calls `revalidateTag('services')`
4. Next.js instantly drops the cached version
5. The next visitor gets fresh data

Result: Static performance + instant updates. Both.

### The Analytics Pipeline

```
Browser action (visit / book / order)
  ↓
lib/analytics.ts  →  navigator.sendBeacon('/api/track', payload)
  ↓
app/api/track/route.ts  (server, rate-limited)
  ↓
Supabase: visits table OR requests table
  ↓
Supabase Realtime WebSocket  →  Admin dashboard bell notification
```

`sendBeacon` is critical: it fires even when the user navigates away from the page. A normal `fetch` would be cancelled. This means zero lost analytics events.

### The Search System

```
User types in store search box
  ↓
useDebounce(350ms)  ← waits for user to stop typing
  ↓
Instant client-side filter (immediate, uses loaded data)
  +
fetch('/api/search?q=...') (parallel, more comprehensive)
  ↓
/api/search/route.ts
  ↓
Supabase: ILIKE query on name, description, category
  ↓
Results replace client-side filter
```

The two-stage approach (instant filter + server search) means users see results immediately with no wait, then get better results from the server when ready.

---

## 3. Project Structure

```
nexa-v3/
│
├── app/                          ← Next.js App Router pages
│   ├── layout.tsx                ← Root layout (metadata, fonts, CSS)
│   ├── globals.css               ← Global styles + Tailwind
│   ├── page.tsx                  ← / (Home — Server Component)
│   ├── HomeClient.tsx            ← / (Home — Client interactivity)
│   │
│   ├── services/
│   │   ├── page.tsx              ← /services (Server Component)
│   │   └── ServicesClient.tsx    ← /services (Client interactivity)
│   │
│   ├── store/
│   │   ├── page.tsx              ← /store (Server Component)
│   │   └── StoreClient.tsx       ← /store (search + modals)
│   │
│   ├── tools/
│   │   ├── page.tsx              ← /tools (Server Component)
│   │   └── ToolsClient.tsx       ← Cost Estimator + micro-tools
│   │
│   ├── about/
│   │   ├── page.tsx              ← /about (Server Component)
│   │   └── AboutClient.tsx       ← /about (interactivity)
│   │
│   ├── admin/
│   │   ├── login/page.tsx        ← /admin/login
│   │   ├── dashboard/page.tsx    ← /admin/dashboard (full CMS)
│   │   └── analytics/page.tsx    ← /admin/analytics (KPIs + charts)
│   │
│   └── api/
│       ├── track/route.ts        ← Analytics ingestion endpoint
│       ├── search/route.ts       ← Full-text search endpoint
│       └── settings/route.ts     ← Settings save + cache revalidation
│
├── components/
│   ├── Header.tsx                ← Fixed header (Server Component)
│   ├── BottomNav.tsx             ← Bottom navigation (Client)
│   ├── Modal.tsx                 ← Bottom-sheet modal (Client)
│   ├── PromoBanner.tsx           ← Promo banner (Client, data from server)
│   └── admin/
│       └── RealtimeNotifications.tsx  ← Live request bell (Client)
│
├── lib/
│   ├── supabase.ts               ← Browser client + TypeScript types
│   ├── supabase-server.ts        ← Server client + cached fetchers
│   ├── cloudinary.ts             ← Upload + URL optimization transforms
│   ├── analytics.ts              ← Client-side event tracking
│   ├── whatsapp.ts               ← WA link builder
│   └── useWhatsApp.ts            ← Hook: fetches phone from settings
│
├── middleware.ts                 ← Edge: auth guard + rate limiting
│
├── supabase/
│   └── schema.sql                ← Complete DB setup (run once)
│
├── public/
│   ├── logo.png                  ← Your logo
│   └── manifest.json             ← PWA manifest
│
├── next.config.js                ← PWA + image optimization + headers
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── .env.example                  ← Copy to .env.local
```

---

## 4. How to Launch

### Step 1 — Supabase Setup (5 minutes)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region closest to Nigeria (Europe West is closest)
3. **SQL Editor → New Query** → paste entire `supabase/schema.sql` → **Run**
4. **Authentication → Providers → Email** → Enable it
5. **Authentication → Users → Add User** → enter your admin email + strong password
6. **Settings → API** → copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret)
7. **Database → Replication** → find `requests` table → enable it (for realtime)

### Step 2 — Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=deiv9e6xt
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=stuecos_upload
NEXT_PUBLIC_DEFAULT_WHATSAPP=2347079722171
```

### Step 3 — Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Step 4 — Deploy to Vercel

```bash
# Install Vercel CLI once
npm i -g vercel

# Deploy
vercel

# Follow prompts, then add env vars in Vercel dashboard:
# Project → Settings → Environment Variables
# Add all 6 variables from .env.example
```

OR connect via GitHub:
1. Push to GitHub
2. [vercel.com](https://vercel.com) → **New Project** → Import GitHub repo
3. Add environment variables in the UI
4. Deploy

### Step 5 — Add Your Logo

Replace `public/logo.png` with your actual logo file (same filename).

### Step 6 — Access Admin

- URL: `yourdomain.com/admin/login`
- Or: long-press the copyright text at bottom of any page for 2 seconds
- After login: `/admin/dashboard`

---

## 5. The Optimization Systems

### 5.1 Server Components (Primary Performance Win)

**Before (v2):** Browser loads → blank page → fetches data → renders content (2–3 extra round trips on slow network)

**After (v3):** Server fetches → renders HTML with content → sends complete page to browser (1 round trip)

Every public page is a Server Component. Only interactive parts (modals, forms, buttons) are Client Components.

**Rule:** If a component needs `useState`, `useEffect`, or event handlers → Client Component. Everything else → Server Component (no `'use client'`).

### 5.2 Caching with `unstable_cache`

Located in `lib/supabase-server.ts`. Each cached function has:
- A unique key array (identifies what's cached)
- A tag string (used to purge the cache on demand)
- A revalidate interval (safety net if cache never manually purged)

To add a new cached query:
```typescript
export const getMyData = unstable_cache(
  async () => {
    const { data } = await serverClient().from('my_table').select('*');
    return data ?? [];
  },
  ['my-data'],              // unique cache key
  { tags: ['my-data'], revalidate: 120 }  // 2 minute TTL
);
```

To purge it when data changes (in an API route):
```typescript
import { revalidateTag } from 'next/cache';
revalidateTag('my-data');
```

### 5.3 Image Optimization

All images go through `lib/cloudinary.ts`. The `imgSizes` helpers add transformation parameters to Cloudinary URLs:

```typescript
imgSizes.thumb(url)  // 80×80px  — admin gallery
imgSizes.card(url)   // 300×240px — store/service cards  
imgSizes.modal(url)  // 600px wide — modal detail view
imgSizes.hero(url)   // 1200px wide — hero backgrounds
```

This means a 3MB original photo becomes a 40KB WebP on mobile. Multiply by 100 products = massive data savings for users on campus networks.

### 5.4 Full-Text Search

The schema adds a `search_vector` column to `services` and `store_items`:

```sql
search_vector tsvector generated always as (
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
) stored;
```

This is a pre-computed search index that PostgreSQL updates automatically on every insert/update. Searches run against this index instead of scanning every row.

The `/api/search` route uses `ILIKE` for broad matching. For even better search (typo tolerance), upgrade to:
```sql
-- In /api/search/route.ts, replace .or() with:
.textSearch('search_vector', tsQuery, { type: 'websearch' })
```

### 5.5 Real-Time Notifications

Located in `components/admin/RealtimeNotifications.tsx`.

Uses Supabase's WebSocket channel — no polling, no timers. The server pushes to the client when a new row is inserted into `requests`.

**Prerequisites:**
- In Supabase: Database → Replication → enable `requests` table
- Or run: `ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;`

When a new request arrives:
1. Badge count increments
2. Toast notification appears for 5 seconds
3. Browser notification fires (if user granted permission)
4. The request row appears at the top of the requests table

### 5.6 Analytics Tracking

All tracking goes through `POST /api/track` — never directly to Supabase from the browser. This means:

- Rate limiting catches bots (30 requests/minute per IP)
- Input validation prevents garbage data
- The service role key (full DB access) stays server-side

`sendBeacon` vs `fetch`: sendBeacon is fire-and-forget, survives page navigation. Use it for analytics. Regular fetch for anything that needs a response.

### 5.7 PWA + Offline Support

`next-pwa` generates a service worker that caches:
- App shell (HTML, CSS, JS) — served instantly offline
- Cloudinary images — cached after first view, instant on repeat
- Google Fonts — cached forever
- API responses — cached 5 minutes, stale-while-revalidate

Users can browse services and the store offline after their first visit. The cache updates in the background when network returns.

### 5.8 Rate Limiting (Middleware)

`middleware.ts` runs at the Vercel Edge — before any Next.js code. It limits `/api/track` to 30 requests per minute per IP using an in-memory map.

For higher scale, replace with Upstash Redis:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(30, '1m') });
```

### 5.9 Security Headers

`next.config.js` adds HTTP security headers to every response:
- `X-Content-Type-Options: nosniff` — prevents MIME confusion attacks
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `Strict-Transport-Security` — forces HTTPS
- `Referrer-Policy` — limits referrer information leakage

---

## 6. The Database

### Tables Reference

| Table | Purpose | Public Read | Public Write |
|---|---|---|---|
| `services` | Service listings | ✅ | ❌ |
| `store_items` | Store products | ✅ | ❌ |
| `promos` | Banner promotions | ✅ | ❌ |
| `reviews` | Customer reviews | ✅ | ✅ (insert only) |
| `requests` | Bookings + orders | ❌ | ✅ (insert only) |
| `visits` | Page analytics | ❌ | ✅ (insert only) |
| `settings` | CMS config | ✅ | ❌ |
| `technicians` | Service pros | ✅ (active only) | ❌ |
| `agents` | Referral partners | ❌ | ❌ |

### Request Source Tags

The `source` column on `requests` tells you where every conversion came from:

| Source | Meaning |
|---|---|
| `home_service_click` | Tapped service card on home page |
| `home_store_click` | Ordered from home page store modal |
| `service_booking` | Booked from services page modal |
| `service_custom_req` | Custom service request form |
| `store_order` | Ordered from store page modal |
| `store_custom_req` | Custom product request form |
| `estimator_book` | Booked via cost estimator result |
| `hero_cta` | Tapped hero button (Inspect / Fix It) |

### Adding a New Table

1. Write the SQL in Supabase SQL Editor
2. Add the TypeScript type to `lib/supabase.ts`
3. Add RLS policies (always enable RLS, then add explicit policies)
4. If it needs caching, add a fetcher in `lib/supabase-server.ts`
5. If admin can edit it, add a tab in `/admin/dashboard`

---

## 7. The Admin Panel

### Dashboard Tabs

**Settings** — controls all dynamic text on the site without touching code:
- WhatsApp number (updates sitewide instantly via `settings` table)
- Homepage hero headline, subtext, background image
- Services page hero title
- Problem + solution section titles

**Services** — add/edit/delete service cards with images, price, highlight flag

**Store** — add/edit/delete products with category, dual pricing, images

**Promos** — create banner promotions with on/off toggle

### How Cache Revalidation Works in the Dashboard

When you save in the dashboard:
1. Data is written to Supabase directly
2. Dashboard calls `POST /api/settings` with `{ table: 'services' }`
3. `/api/settings` calls `revalidateTag('services')`
4. Next.js cache for services is immediately purged
5. Next visitor gets fresh data

Without step 3-5, users would see stale data for up to 2 minutes after admin saves.

### Real-Time Bell

The notification bell in the header connects to Supabase Realtime. Any new booking or order anywhere in the world appears instantly in the admin panel — no refresh needed. The bell shows a red badge count and a toast popup with the item name and source.

---

## 8. Adding New Features

### Add a New Public Page

```typescript
// app/mypage/page.tsx — Server Component
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import MyPageClient from './MyPageClient';
import { getServices } from '@/lib/supabase-server'; // reuse cached fetchers

export const metadata = { title: 'My Page' };

export default async function MyPage() {
  const data = await getServices(); // fetched + cached server-side
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-[80px]">
      <Header title="MY PAGE" />
      <MyPageClient initialData={data} />
      <BottomNav />
    </div>
  );
}
```

```typescript
'use client';
// app/mypage/MyPageClient.tsx — Client Component
export default function MyPageClient({ initialData }: { initialData: any[] }) {
  // All useState, useEffect, click handlers go here
  return <div>...</div>;
}
```

Add the route to `components/BottomNav.tsx` NAV array.

### Add a New Tracked Event

In any Client Component:
```typescript
import { trackRequest } from '@/lib/analytics';

// Fire-and-forget — never blocks UI
trackRequest('Item Name', 'my_custom_source', 5000);
```

This writes to the `requests` table and appears in analytics immediately.

### Add a New Setting

1. In Supabase SQL Editor:
```sql
insert into public.settings (key, value) values ('my_setting', '{"field": "default value"}') on conflict do nothing;
```

2. In `lib/supabase-server.ts`, it's automatically included in `getAllSettings()`.

3. In the page Server Component:
```typescript
const settings = await getAllSettings();
const myValue = settings['my_setting']?.field ?? 'default';
```

4. In `/admin/dashboard`, add an input field to the Settings tab and call:
```typescript
await saveSetting('my_setting', { field: inputValue });
```

---

## 9. Troubleshooting

### "Supabase connection failed"
- Check `.env.local` has the correct URL and anon key
- Make sure there's no trailing slash on the URL
- Verify the Supabase project is not paused (free tier pauses after 1 week inactive)

### "Admin dashboard redirects to login"
- The middleware checks for a valid Supabase session cookie
- Make sure cookies are enabled in the browser
- Try signing out and back in

### "Analytics not tracking"
- Check browser console for errors on `/api/track`
- Verify the service role key in `.env.local` is correct
- The rate limiter may have triggered (30 req/min per IP in dev)

### "Real-time notifications not working"
- Run: `ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;` in Supabase SQL Editor
- Check Supabase Dashboard → Database → Replication — `requests` should be listed
- Notifications require the admin to be on the dashboard page

### "Images not loading"
- Cloudinary transforms only work on URLs that contain `res.cloudinary.com`
- Local images (in `/public`) are passed through unchanged
- If an image shows broken, the Cloudinary URL may have expired or been deleted

### "Build fails on Vercel"
- Ensure all 6 environment variables are set in Vercel dashboard
- Run `npm run type-check` locally to catch TypeScript errors before deploying
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set (it's server-only, not `NEXT_PUBLIC_`)

### Waking Up a Paused Supabase Project
Free Supabase projects pause after 7 days of inactivity. To prevent this, upgrade to the Pro plan ($25/month) or set up a cron job that pings the database every 5 days.

---

*NEXA v3.0 — Built for speed on low-bandwidth Nigerian campus networks.*
