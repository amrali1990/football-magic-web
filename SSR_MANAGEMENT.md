# Managing SSR Load & Crawl Traffic (Vercel + Google Search Console)

This guide explains **why your gateway is getting flooded with calls**, how to
**control** that traffic, and how to **stop SSR** entirely if you decide to.

Your web app (`football-magic-web`) is Next.js 16 with server-side rendering
(SSR) + incremental static regeneration (ISR). It's deployed on **Vercel**, and
you added the site to **Google Search Console**. Those two facts together are the
source of the load you saw on the API gateway (the blocked IP `18.209.163.71` is
Vercel's serverless egress).

---

## 1. Why the calls happen (the chain)

```
Googlebot / Bingbot / AI crawlers  ──crawl a page──►  Vercel SSR function
                                                          │
                              (on cache MISS only)        ▼
                                                   Your API Gateway  ──►  core/engine
```

- Every **page render** on the server fetches several endpoints from the gateway
  (`getTopLeagues`, `getPlayerInformations`, `getTeamInformations`, `getLeague`,
  `getFixture`, `getLeaguesByDate`, …). See `src/lib/server-api.ts`.
- Vercel **caches** each `fetch()` for its `revalidate` window (Vercel Data
  Cache). Within that window, repeat requests for the same URL are served from
  cache and **do not hit your gateway**.
- The load explodes because:
  1. **You expose a huge URL space** — every team, player, league, match, and
     country, mirrored in **both English and Arabic** (`/…` and `/ar/…`). That's
     easily tens of thousands of unique URLs.
  2. **`robots.ts` invites many crawlers** — Googlebot plus ~12 AI crawlers
     (GPTBot, ClaudeBot, PerplexityBot, Bytespider, CCBot, …), each crawling the
     full bilingual tree.
  3. Every **unique** URL a crawler visits is a **cache miss** → a fresh burst of
     gateway fetches. Short revalidate windows (match/home = 60s) mean popular
     pages also re-fetch every minute.

So a Search-Console-triggered crawl of your whole site = a very large number of
one-time gateway calls, all from Vercel's IP → the gateway's per-IP rate limiter
blocklisted it.

---

## 2. Do you actually want to stop SSR?

**Usually no.** SSR/ISR is what gives you the SEO and AI-answer-engine visibility
this app was built for (bilingual metadata, JSON-LD, OG images, sitemaps). If you
turn it off, you lose most of that. The right move is almost always to **control
the call volume**, not eliminate SSR.

Jump to [Section 6](#6-if-you-really-want-to-stop-ssr) only if you've decided the
SEO tradeoff is acceptable.

---

## 3. Control the volume — biggest levers first

### 3.1 Cache longer (the #1 lever)

Longer `revalidate` = fewer origin fetches. Vercel serves everything from its Data
Cache within the window. Football data does not change every 60 seconds outside of
live matches, so you can raise these a lot.

Edit `src/lib/server-api.ts` and the per-page `export const revalidate`:

| Content | File(s) | Now | Suggested |
|---|---|---|---|
| Home / match pages | `src/app/(ar/)match/[id]/…`, `src/app/(ar/)page.tsx`, `server-api.ts` `getFixture*`, `getMatchesByDate` | `60` | `300` (5 min) — or keep 60s **only** for live matches (see 3.2) |
| Team / player / league pages | `src/app/(ar/)team|player|league/[id]/…`, `server-api.ts` default | `3600` | `21600` (6 h) or `86400` (24 h) |
| League/team lists, countries | `server-api.ts` `getAllLeagues/getTopTeams/getTopLeagues/getCountry` | `86400` | keep `86400` |
| Sitemap | `src/app/sitemap.ts` | `3600` | `21600`+ |

**Impact:** raising entity pages from 1 h to 24 h cuts their origin fetches ~24×.

### 3.2 Only refresh live matches often

Instead of a blanket 60s on all match pages, keep long caching and refresh a match
only while it's in play. Options:
- Set `revalidate = 300` globally and accept 5-min-stale live scores, **or**
- Use **on-demand revalidation**: when your backend records a score change, call
  a Vercel revalidate webhook (`revalidateTag` / `revalidatePath`) so only that
  match re-renders. This is the most efficient pattern — pages never poll; they
  update exactly when data changes. See the Next.js "On-Demand Revalidation" docs
  bundled at `node_modules/next/dist/docs/`.

### 3.3 Don't disable caching by accident

Make sure no `fetch` uses `cache: 'no-store'` or `next: { revalidate: 0 }` on the
public data path — that forces a gateway hit on **every** render. (Your guest
**token** fetch in `guest-server.ts` uses `no-store` on purpose; that's fine — it's
one call per token per hour, not per page.)

---

## 4. Control the crawlers

The other half is how much Google + AI bots crawl. You can't hard-limit Googlebot's
rate anymore in Search Console (Google removed that setting), but you control the
**surface area** it crawls.

### 4.1 Shrink the indexable surface (`src/app/robots.ts`)
- **Reconsider the AI-crawler allowlist.** You currently invite ~12 crawlers to the
  full tree. Each one independently crawls everything. Keep the ones that send real
  traffic (Googlebot, Bingbot, GPTBot/OAI, ClaudeBot, PerplexityBot) and consider
  `disallow: '/'` for aggressive low-value ones (e.g. `Bytespider`, `CCBot`).
- **Consider disallowing deep, low-value pages** from crawling (e.g. individual
  player pages if they add little SEO value) so bots spend crawl budget on your
  important pages.
- The bilingual `/ar` tree **doubles** every URL. It's correct for SEO, but if
  Arabic isn't a priority market yet, you could `disallow: '/ar'` temporarily to
  halve crawl volume.

### 4.2 Trim the sitemap (`src/app/sitemap.ts`)
Search engines crawl what you advertise. The sitemap currently lists matches
(yesterday→+7 days), **all** top teams (with squads → players), and leagues, ×2 for
bilingual. Reduce it to the pages you truly want indexed:
- Drop or shorten the match window if match pages aren't your SEO priority.
- List only top-N teams/leagues instead of everything.
- Keep `lastModified` accurate so Google re-crawls only what changed.

### 4.3 Google Search Console
- **Crawl Stats** (Settings → Crawl stats) shows how many requests Googlebot makes
  and to what. Use it to see whether Google or an AI bot is the bigger driver.
- If Googlebot is over-crawling due to server errors, fix those — Google backs off
  healthy sites and hammers ones returning 5xx/timeouts. (Ironically, the gateway
  returning 403/429 to Vercel can *increase* crawl attempts.)
- Submit a **clean, trimmed sitemap** so Google prioritizes it.

---

## 5. Protect the gateway from crawl spikes

Even after tuning, crawl bursts will happen. Make sure they can't take the API down
(this is what already happened — Vercel's IP got auto-blocked).

### 5.1 Secure SSR bypass + 50K/day quota (implemented)

The clean, IP-independent way to exempt your SSR from rate-limiting is now built in.
It does **not** rely on a static key (which anyone who saw the traffic could replay)
— the SSR proves itself with a **rotating HMAC signature**, and its bypass is capped
at a **daily unique-call budget** (default **50,000/day**).

**How it's secured (no static secret on the wire):**
- A single secret, `SSR_SHARED_SECRET`, is shared between the **gateway** and the
  **Vercel server env** only. On the web side it is a **non-public** env var — never
  `NEXT_PUBLIC_…` — so it is never sent to a browser.
- On each gateway call the SSR sends `X-SSR-Ts` (timestamp) and
  `X-SSR-Auth = base64(HMAC-SHA256(secret, timestamp))`. The **secret itself never
  travels**; only a signature does. The gateway recomputes the HMAC and constant-time
  compares it, and rejects any timestamp older than `SSR_FRESHNESS_SECONDS` (default
  60 s). So a captured header is useless within a minute and cannot be forged.
- The bypass **only waives rate-limiting** — every request still passes JWT auth in
  `AuthenticationFilter`. A leaked/replayed signature therefore grants no data a plain
  guest token wouldn't; it just skips throttling, briefly, within the quota.

**The 50K/day quota:** the SSR sends `X-SSR-Call-Id` (a hash of method+path+body). The
gateway counts **unique** call ids per UTC day in Redis (HyperLogLog, constant
memory). Re-renders of the same page within its cache window reuse one id and don't
consume budget. Once the day's unique count passes the cap, further SSR calls get
`429 {"message":"SSR daily quota exceeded"}` and `server-api.ts` returns `null`, so
those pages fall back gracefully (no crash) until the next UTC day or a higher cap.

**Rollout (both sides must share the same secret):**
1. Generate a strong secret, e.g. `openssl rand -base64 48`.
2. **Gateway** env:
   ```
   SSR_SHARED_SECRET=<the-secret>
   SSR_FRESHNESS_SECONDS=60      # optional, default 60
   SSR_QUOTA_MAX=50000           # optional, default 50000 unique calls PER DAY
   ```
3. **Vercel** → Project → Settings → Environment Variables (Production + Preview):
   ```
   SSR_SHARED_SECRET=<the-same-secret>     # NOT NEXT_PUBLIC_
   ```
4. Redeploy both. Verify: SSR calls stop being rate-limited/blocked; watch the gateway
   for `SSR daily unique-call quota (...) exceeded` as you approach the cap.

To rotate the secret: set the new value on the gateway and on Vercel, redeploy both
(a brief mismatch just means SSR calls fall back to normal rate-limiting during the
overlap — allowlist your egress IP temporarily if that window matters).

### 5.1b Allowlist an IP (fallback, e.g. an internal LB)
For non-SSR trusted infra (an internal load balancer, a monitoring box), the gateway
also supports an IP allowlist that bypasses throttling **and** the blocklist:
```
RATE_LIMIT_ALLOWLIST=10.0.,18.209.163.71
```
(comma-separated; exact IPs or a dotted prefix). Note: Vercel Hobby/Pro egress IPs
are **dynamic**, so prefer the signed SSR bypass above for Vercel; use IP allowlisting
only for infra with stable IPs (or a Vercel dedicated egress IP add-on).

### 5.2 Tune the limiter for server-side callers
If you keep IP-based limiting, the defaults (120 req/min/IP) are too low for an SSR
server that aggregates all visitors. Raise via gateway env:
```
RATE_LIMIT_BASELINE=1200          # per IP per window
RATE_LIMIT_BLOCK_OFFENSES=10      # breaches before an auto-block
```
But allowlisting your own SSR is cleaner than trying to out-tune it.

### 5.3 Unblock an IP that's already blocked
```
# via admin API (ADMIN bearer token):
DELETE https://<gateway>/gateway/blocklist?ip=18.209.163.71

# or directly in Redis:
redis-cli DEL bl:ip:18.209.163.71 off:ip:18.209.163.71 blc:ip:18.209.163.71
```

---

## 6. If you really want to stop SSR

You have a spectrum, from "less server work" to "no server rendering." All reduce
gateway calls; the lower ones cost you SEO.

1. **Fully static with long ISR (recommended if you want to minimize load but keep
   SEO):** raise `revalidate` to a day+ everywhere (Section 3.1). Pages are then
   served as static HTML from Vercel's edge and only re-render occasionally. This is
   "SSR" in name only — origin calls become rare.

2. **Pre-render a fixed set at build, don't render on-demand:** add
   `export const dynamicParams = false` to the dynamic route segments
   (`team/[id]`, `player/[id]`, …) and provide `generateStaticParams()` listing only
   the URLs you pre-build. Any other URL returns 404 instead of rendering on the
   server. This caps SSR to exactly the pages you choose.

3. **Force static, no revalidation:** `export const dynamic = 'force-static'` (and
   no `revalidate`) on a route → built once, never re-fetches. Data goes stale until
   the next deploy. Fine for rarely-changing pages, bad for scores.

4. **Client-side rendering (drops SEO):** move data fetching to the browser
   (`src/lib/api.ts` in a client component / `useEffect`). The server sends an empty
   shell; the **user's browser** calls the gateway, so crawlers see little content
   and your SEO/GEO largely disappears. Only do this for pages you don't need
   indexed (it's already how the private/interactive parts work).

**Recommendation:** do **#1** (long ISR) + on-demand revalidation for live scores
(Section 3.2). You keep SEO and cut gateway calls by orders of magnitude — without
"turning off" SSR.

---

## 7. Monitoring

- **Vercel → your project → Observability / Logs**: see SSR function invocations and
  outbound fetch volume. Vercel → Usage shows function/data-cache usage.
- **Search Console → Settings → Crawl stats**: total crawl requests, by response
  code and by Googlebot type. This tells you if Google is the driver.
- **Gateway logs**: block events are logged once at `WARN`
  (`BlocklistService: IP … blocked …`); per-request rejections are `DEBUG` (so they
  no longer flood). Watch for repeated auto-blocks of your Vercel egress.

---

## 8. Quick-start checklist

1. **Unblock** your Vercel IP now (Section 5.3).
2. **Set `SSR_SHARED_SECRET`** to the same value on the gateway and on Vercel
   (server-only), then redeploy both — the SSR bypass + 50K/day quota is now live
   and immune to Vercel's IP churn (Section 5.1). Adjust `SSR_QUOTA_MAX` if 50,000 is
   not the number you want.
3. **Raise `revalidate`**: entity pages → 24 h, match/home → 300 s (Section 3.1).
   This alone removes most of the load and keeps you comfortably under the quota.
4. **Trim `robots.ts` and `sitemap.ts`** to shrink what bots crawl (Section 4).
5. **Watch** Vercel logs + Search Console crawl stats + the gateway's SSR-quota WARN
   for a day and adjust.
6. (Optional) Add **on-demand revalidation** for live match scores (Section 3.2).
