# NEXA v3.0 — Campus & Home Services Platform

> Mobile-first, bulletproof web platform for campus and home services.
> Built for **speed on poor Nigerian campus networks**.

---

## Quick Start (5 minutes)

### 1. Clone and install
```bash
git clone <your-repo-url> nexa-v3
cd nexa-v3
npm install
```

### 2. Set up Supabase
1. [supabase.com](https://supabase.com) → New Project
2. **SQL Editor** → paste `supabase/schema.sql` → Run
3. **Authentication** → Providers → Enable Email
4. **Authentication** → Users → Add User (your admin email + password)
5. **Database** → Replication → enable `requests` table (for realtime)

### 3. Environment variables
```bash
cp .env.example .env.local
# Fill in your Supabase URL, Anon Key, Service Role Key
```

### 4. Run locally
```bash
npm run dev
# → http://localhost:3000
```

### 5. Deploy
```bash
vercel --prod
# Add all env vars in Vercel dashboard
```

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Home — hero, services, store, reviews |
| `/services` | Services grid + booking modal |
| `/store` | Full store with search |
| `/tools` | Price Guide, Job Estimator, Bill Splitter, Power Cost |
| `/about` | About + contact |
| `/admin/login` | Admin login |
| `/admin/dashboard` | CMS — settings, content, images |
| `/admin/analytics` | KPIs, 30-day chart, realtime requests |

## API Routes

| Route | Purpose |
|---|---|
| `POST /api/track` | Analytics ingestion |
| `GET /api/search` | Full-text search |
| `POST /api/settings` | Settings + cache revalidation |
| `POST/PATCH/DELETE /api/admin/content` | CRUD with cache purge |
| `POST /api/admin/upload` | Image upload proxy |
| `GET /api/health` | Uptime check |

## Tools — Real NEXA Price Data

The Tools page includes real NEXA pricing for:
- **Generator** — Changeover installation
- **Electrical** — Outage fixing, sockets, rewiring, fans, maintenance, repairs
- **Fresh Piping** — Full/half conduit, surface/trunking
- **Fresh Wiring** — Full/half conduit, surface wiring
- **Plumbing** — Burst pipes, water supply, tanks, toilets, blockages, leaks
- **Carpentry** — Maintenance

All prices show as a range (±30% margin). All negotiable.

The **Job Estimator** tab lets users pick a service + store items for a combined estimate.

---

## Uptime Monitoring (Prevents Supabase from Pausing)

Set up a free monitor at [UptimeRobot.com](https://uptimerobot.com):
- Monitor type: HTTP(s)
- URL: `https://yoursite.com/api/health`
- Check interval: Every 5 minutes

This keeps your Supabase project active (free tier pauses after 7 days without traffic).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Images | Cloudinary |
| Hosting | Vercel |
| PWA | next-pwa |
| Styling | Tailwind CSS |

---

*See `docs/MASTER_GUIDE.md` for the complete technical reference.*
