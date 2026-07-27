# Task-Scoped Event-Driven ISR Revalidation — Design

**Scope:** wire engine task-completion events through to Next.js `revalidateTag`, so a task that changes N entities regenerates exactly those entities' pages (both locales + OG), with timers demoted to a safety net.

**Headline finding (read this first):** most of what this prompt asks to *design* **already exists and runs**. The engine already captures changed entity IDs per task run and publishes an ID-only, batched, overflow-guarded event; a dedicated `seo-geo-crawler` microservice already consumes it, resolves IDs→URLs, debounces, crawls, and pings **IndexNow**. What does **not** exist is the one missing hop: **nothing calls `revalidateTag`/`revalidatePath` on the frontend.** Crawling a page only regenerates it if it is *already past its TTL* (ISR stale-while-revalidate); within the TTL the crawler gets the cached stale copy. So the design here is **narrow**: add a revalidation sink to the frontend and a small additive revalidation call to the existing crawler — not a new change-capture/batching/eventing system.

---

## Phase 0 — Ground truth

**From `docs/ssr-analysis.md` (invalidation-relevant only):**
1. Every cache is **time-based**; grep-confirmed zero `revalidateTag`/`revalidatePath`/`unstable_cache`/`'use cache'` in `src`.
2. Route TTLs: home/match `60`, team/league/player/leagues `3600`; Data-Cache TTLs per getter in `src/lib/server-api.ts` — fixture/events/lineup/matches-by-date `60`, entity getters `3600` default, top-teams/top-leagues/country/all-leagues `86400`.
3. **Cache key = pathname** (locale is in the path: `/team/...` vs `/ar/team/...`), so en and ar are *separate* Full-Route-Cache entries; `/og/*` are separate route entries again. React `cache()` dedups a getter within one render; the same getter is called by the page, `generateMetadata`, and the OG route.
4. Auth for server→gateway calls is the HMAC scheme in `src/lib/ssr-auth.ts` (`X-SSR-Auth`/`X-SSR-Ts`), keyed on `SSR_SHARED_SECRET`; it **degrades silently to no signature if the secret is unset** (`ssr-auth.ts:13,21-22`).
5. Canonical URLs are slugged; ID-only paths 308→slug. So **path-based** invalidation needs slug resolution; **tag-based** does not.

**The engine repo.** The "engine" with scheduled jobs is **`engine/`** (Spring Boot 2.7.1, Java 17, Spring Cloud, RabbitMQ, Feign) — *not* `11-magicians-engine`, which is the React admin panel (root `CLAUDE.md`). Scheduler = Spring `@Scheduled` cron in `engine/src/main/java/com/dream/football/engine/configurations/ScheduledTasks.java`. It talks to RapidAPI via Feign and to siblings over RabbitMQ/Feign; it publishes SEO events to a RabbitMQ topic exchange.

**Premise check — "the service calls all the pages every hour":** **False as stated; it is (a) a real job but event-driven + debounced, not a blanket hourly walk — and (b) it does not revalidate.** Evidence:
- The page-fetching job is the **`seo-geo-crawler`** microservice (`seo-geo-crawler/README.md`), triggered *by RabbitMQ events after engine tasks complete*, not on a fixed hourly page-walk. It debounces to **≤1 incremental crawl per 15 min** (`CrawlerProperties.java:27`) and coalesces bulk-task clusters into **≤1 full audit per 6 h** (`CrawlerProperties.java:33`), with a weekly Sunday full-audit safety net (`seo-geo-crawler/configurations/ScheduledTasks.java`).
- Its purpose is **SEO/GEO auditing + IndexNow pings** (`IndexNowService.java`), i.e. telling *search engines* content changed — **not** purging Vercel's cache. Grep for `revalidat` across `seo-geo-crawler` and `engine`: no matches. So ISR freshness today is still 100% TTL-driven; the "hourly" impression is ISR lazy regeneration (Vercel Data/Route cache expiry), plus crawler traffic that happens to warm already-expired pages.
- Both sides are **off by default**: engine `seo.events.enabled=false` (`SeoEventsProducer.java:44`), crawler `crawler.enabled` per-message (`README` §Feature flag).

**Consequence for this design:** we are adding the missing revalidation hop onto a mature, tested, debounced, ID-only event pipeline. Phases 1–2 below are therefore mostly an *inventory of existing capability* with a short list of true gaps, not a build.

---

## Phase 1 — Engine task inventory

Source: `ScheduledTasks.java:146-260+`, `SeoEventsProducer.java:37-40`, recorder call sites via grep.

| Task | Trigger | Freq | Entity types written | Knows changed IDs? | IDs available at | Batch size/run | Notes |
|---|---|---|---|---|---|---|---|
| `performEachMinute` → `saveTodayFixtures` | cron `0 * * * * ?` | 1/min | MATCH (whole day) | **No (deliberately not instrumented)** | — | ~10³ fixtures/min | ADR-002: instrumenting it would mark ~1000 dirty/min; excluded on purpose |
| `performEachMinute` → `updateOnGoingFixtures` | 1/min | MATCH | **Yes** | `FixturesService.java:607,670` (`recordMatch(apiId)`) | 10–200 live | Core live-score path |
| `performEach5Minute` → `updateUnupdatedFinishedFixtures` | cron `30 */5 * * * ?` | 1/5min | MATCH | **Yes** | `FixturesService.java:811` `recordMatch` | small | just-finished fixtures |
| `performEach5Minute` → `updateFinishedFixturesLeagueStanding` | 1/5min | LEAGUE, MATCH | **Yes** | `FixturesService.java:812,875` `recordLeague`/`recordMatch` | small | standings after final whistle |
| `performEach5Minute` → `updateFinishedFixturesPlayerStatistics` | 1/5min | PLAYER (stats) | **No — `recordPlayer` never called** | n/a | small | **GAP (see below)** |
| `performEachDayAt3` (`updateAllLeagues`, `updateCurrentLeaguesTask`) | cron `0 0 3` | daily | LEAGUE | **No** → `fullAuditRequired` | n/a | not ID-tracked |
| `performEachDayAt4` (`loadAllLeagues`, `updateAllLeaguesData`, `updateTeamStatistics`) | cron `0 0 4` | daily | LEAGUE, TEAM | **No** → `fullAuditRequired` | huge | bulk |
| `performEachDayAt5` (`updateTodayFixturesTeams`, `loadAllVenues`, …) | cron `0 0 5` | daily | TEAM, VENUE | **No** → `fullAuditRequired` | huge | bulk |
| `performEachDayAt6` (localized/Arabic data) | cron `0 0 6` | daily | translations (all types) | **No** → `fullAuditRequired` | huge | bulk |
| `saturdayScheduleJob` / `fridayScheduleJob` | weekly cron | weekly | LEAGUE fixtures | **Forced** `fullAuditRequired` | n/a | `SeoEventsProducer.java:37` |

**Tasks that mutate SSR-visible data:** all fixture flows (MATCH → `/match`, scores on `/` , league standings text on `/league` & `/team`), league/team bulk syncs (names/logos/venues/standings → entity pages, sidebar seed, sitemap `lastmod`), Arabic localization (the `/ar` tree). **EXCLUDED (write internal/non-rendered data):** none cleanly separable today — the recorder is only invoked from fixture flows, and bulk tasks already degrade to `fullAuditRequired` rather than emitting IDs, so nothing over-fires. `updateTeamStatistics`/`updateFinishedFixturesPlayerStatistics` write stats that are *rendered in interactive client tabs, not server HTML* — see the "fields" gap in Phase 2.

**Tasks that write entities but discard the changed-ID set (need instrumentation to become targeted):**
- **PLAYER: `updateFinishedFixturesPlayerStatistics`** — `recordPlayer` exists (`SeoChangeRecorder.java:46`) but is **never called** (grep confirmed). Player pages therefore get **no** targeted event today; they rely on the daily full audit / TTL.
- **TEAM: `updateTeamStatistics`, `updateTodayFixturesTeams`** — `recordTeam` (`SeoChangeRecorder.java:38`) is **never called**; these run in bulk daily tasks that already emit `fullAuditRequired`, so team pages are covered only coarsely.

**Enormous-ID tasks (must not fan out):** the daily 3/4/5/6 am tasks and Fri/Sat weekly refreshes touch whole-catalogue sets (leagues, all team stats, all venues, all translations). These are **already handled**: they are not ID-tracked, so `SeoEventsProducer` sends `changedEntities:[], fullAuditRequired:true` (`SeoEventsProducer.java:59-71`). Largest realistic N on the *targeted* path is the minute/5-min fixture set, capped at **500** (`seo.events.max-entities`, `SeoEventsProducer.java:47`); above 500 it also degrades to `fullAuditRequired`.

---

## Phase 2 — Change capture (engine side) — **mostly already built**

**Row-written vs row-changed:** ADR-002 accepts **"recorded = attempted-to-update"** (`docs/ADR-002:26-29`) — slight over-reporting, never under-reporting. The recorder is called at the point a fixture/standing is updated, not gated on a dirty check. Cheapest reliable tightening if precision matters later: compare Hibernate managed-entity state or a payload hash before `record*()`; **recommendation: leave as-is** — over-reporting a live fixture costs one extra tag purge, and the 60s match TTL already re-renders those anyway. Not worth the ORM complexity.

**Normalized event shape — exists** (`SeoTaskCompletedEventDTO.java`, ADR-002:8-16):
```json
{ "eventId":"uuid", "occurredAt":"...", "taskName":"performEachMinute",
  "changedEntities":[{"type":"MATCH","id":12345}], "fullAuditRequired":false }
```
**Gap vs the prompt's ideal shape:** no `changeKind`, no `fields[]`, no `runId` (though `eventId`+`taskName` serve as run identity). This has two consequences:
- **No field-level filtering.** The frontend cannot tell a *score* change (server-rendered) from a *player-stat* change (client-tab only). Today this is moot because only MATCH/LEAGUE fire and both are server-rendered. It becomes relevant only if PLAYER/TEAM instrumentation is added — then an additive `fields[]` allowlist would prevent stat-only changes from purging a page whose server HTML didn't change.
- **No slug/rename signal (the one mandatory path-invalidation case).** A team/league rename changes the **canonical URL**; targeted tag revalidation refreshes the *content* at the new URL but does not purge the *old* slug's Route-Cache entry. Today renames arrive only via bulk daily tasks → `fullAuditRequired` (coarse, TTL-backed), so this is latent, not broken. If rename precision is ever wanted, extend the event with `changeKind:"slug-changed"` + old/new identifiers and use `revalidatePath` on both.

**SSR-relevant field allowlist (derive filtering from what the components render, per analysis Phase 3):**

| Entity | Fields that appear in **server HTML** (→ should invalidate) | Fields that are **client-tab only** (→ no-op) |
|---|---|---|
| team | name, country, founded, venue, national, current-league standing row, next/last fixtures, squad (names) | transfers, per-season stat tables, detailed squad numbers |
| league | name, country, type, current season, standings (leader/teamCount/table order) | player-stats sub-pages (`/league/[id]/stats/*` are client) |
| player | name, bio basics rendered in `PlayerEntityPage` | per-season stat tables (client) |
| match | teams, score, status, league, venue, round, **events (goals) + starting line-ups** (server-rendered into HTML, `MatchEntityPage.tsx:101-153`) | H2H, interactive tabs |
| country | name (metadata only — body is a **client** component) | leagues/teams/players lists (client) |

**Accumulation/batching/overflow — all exist:**
- Per-run dedup by `(type,id)` via `LinkedHashSet<SeoChangedEntityDTO>` (`SeoChangeRecorder.java:28,31,53`).
- **One message per task run**, emitted at run end (`ScheduledTasks.java:101`), never per row.
- **Overflow rule already implemented**: `changedEntities.size() > maxEntities (500)` → `fullAuditRequired`, empty list (`SeoEventsProducer.java:59-71`). Justification for 500 in ADR-002:41-48: minute/5-min tasks touch 10–200 fixtures, so 500 clears normal operation with headroom; beyond it a full audit is cheaper than 500+ targeted purges. **Keep 500.** Downstream, the frontend's coarse-tag path (Phase 3) handles `fullAuditRequired` without fanning out.

**Net engine work needed for this project:** *optionally* add `recordPlayer`/`recordTeam` calls (closes the PLAYER/TEAM targeting gap) and *optionally* extend the DTO with `changeKind`/`fields`. **Neither is required for a first shippable version** — MATCH+LEAGUE targeting + `fullAuditRequired` coarse handling already covers the highest-value, highest-volatility pages.

---

## Phase 3 — Entity → cache-key mapping (frontend) — **recommend TAG-BASED (B)**

### A (path) vs B (tag)

| Criterion | (A) `revalidatePath(url)` | (B) `revalidateTag('team:541')` |
|---|---|---|
| Needs the slug? | **Yes** — canonical is slugged; must resolve id→slug per locale, per entity, and reconstruct `/team/{id}/{slug}` + `/ar/team/{id}/{ar-slug}` + `/og/team/{id}` | **No** — tag is `{type}:{id}`, slug-independent |
| Invalidates Data Cache? | No (only Route Cache for that path) | **Yes** |
| Invalidates Full Route Cache? | Yes, for the exact path only | **Yes**, for *every route whose render consumed a fetch carrying that tag* |
| Bilingual + OG coverage | Must enumerate 3+ paths per entity | **One tag covers en page + ar page + OG route** because all three call the same tagged getter (`getFixture`, `getTeamInfo`, …) |
| Cross-reference fan-out | Manual and slug-dependent | **Emergent & correct** (see below) |
| Cost in `server-api.ts` | 0 (but big endpoint logic) | Thread one optional `tags` field through `doFetch`; tags derived mechanically from the getter's first arg — ~15 getter lines |

**Recommend (B) tag-based.** The decisive advantages: (1) it needs only the ID the engine already emits — **no slug resolution at invalidation time**, which the engine/crawler event does not carry; (2) tagging a *getter* automatically cascades to **all three route-cache entries** (en, ar, OG) that call it; (3) **emergent cross-fan-out**: the team page calls `getLeagueStandings(currentLeague.leagueId)` (`TeamEntityPage.tsx:107`), so its Route-Cache entry is tagged `league:{id}` — meaning `revalidateTag('league:{id})` after a standings update refreshes **both** the league page **and** every team page in that league, with no extra bookkeeping. Path-based cannot do this without enumerating every affected slug.

### Tag instrumentation (mechanical, in `src/lib/server-api.ts`)

Add `tags?: string[]` to `ServerFetchOptions`, set `next: { revalidate, tags }` in `doFetch` (`server-api.ts:55`), and pass a tag from each getter derived from its key argument:

| Getter (`server-api.ts`) | Tag |
|---|---|
| `getTeamInfo`, `getTeamLeagues`, `getTeamSeasonFixtures`, `getTeamSquad` (`:117,129,134,148`) | `team:{teamId}` |
| `getLeague` (`:153`) | `league:{leagueId}` |
| `getLeagueStandings` (`:158`) | `league:{leagueId}` (ties team & league pages to the league tag) |
| `getPlayer` (`:166`) | `player:{playerId}` |
| `getFixture`, `getFixtureEvents`, `getFixtureLineup` (`:171,190,212`) | `match:{fixtureId}` |
| `getMatchesByDate` (`:216`) | `matches:{date}` |
| `getAllLeagues` (`:237`) | `leagues-index` |
| `getTopTeams` (`:250`) | `top-teams` |
| `getTopLeagues` (`:260`) | `top-leagues` |
| `getCountry` (`:265`) | `country:{code}` |
| `getXSitemapPage` (`:300-318`) | `sitemap` |

Tag string omits `lng` on purpose so one tag spans both locales.

### Concrete mapping (recommended tag approach)

| Entity change | Tags to invalidate | Also affected (why) | Deliberately NOT invalidated (until TTL) |
|---|---|---|---|
| **MATCH** id | `match:{id}` | Covers `/match/{id}`, `/ar/match/{id}`, `/og/match/{id}` (all call `getFixture`/events/lineup). | `/` & `/ar` home (call `getMatchesByDate(today)`, tagged `matches:{date}` not `match:{id}`) — left to the 60s home timer; team pages (score rarely changes team SEO — mirrors ADR-002 `expandMatchToTeams=off`) |
| **LEAGUE** id | `league:{id}` | `/league/{id}` (+ar, +OG) **and every `/team/{id}` in that league** via the shared `getLeagueStandings` tag; if `includeLeaguesIndexOnLeague`, also `leagues-index` | `/leagues` unless league added/removed (name edits don't change the list membership) |
| **PLAYER** id | `player:{id}` | `/player/{id}` (+ar). *(No player OG route exists.)* | player's team page (`expandPlayerToTeam=off`) |
| **TEAM** id | `team:{id}` | `/team/{id}` (+ar, +OG) | league standings text (team name in a table) — TTL; sidebar seed — TTL |
| **match events / lineups** | `match:{id}` (same tag as fixture) | Server-rendered events/line-ups sections | — |
| **COUNTRY** code | `country:{code}` | `/country/{code}` **metadata only** (body is client) — low value; consider skipping | country page body (client-fetched anyway) |
| **standings** | `league:{id}` | League page table text + all member team pages (emergent) | — |
| **top-teams / top-leagues sidebar seed** | `top-teams` / `top-leagues` | Sidebar seed in the **root layout** → affects *every* page's HTML; only fire on the daily refresh, never per-entity | per-page bodies |
| **sitemap** | `sitemap` | `/sitemap.xml` + children | — |
| **`fullAuditRequired` (bulk/overflow)** | **coarse set only:** `top-teams`, `top-leagues`, `leagues-index`, `sitemap` (+ optionally `home`) | Refreshes shared shells + discovery; entity bodies ride their own TTL | **NOT** a per-entity fan-out — that is the whole point of the overflow rule |

---

## Phase 4 — The revalidation endpoint (frontend)

**Route:** `POST /api/revalidate` — App Router route handler at `src/app/api/revalidate/route.ts`, **`export const runtime = 'nodejs'`** (revalidate APIs require Node, and this deployment already runs Node). Reuse the existing audit route folder convention (`src/app/api/audit/not-found/route.ts`).

**Auth — reuse `SSR_SHARED_SECRET` + the `ssr-auth.ts` HMAC, verified server-side, FAIL CLOSED:**
- The sender (crawler) sends `X-SSR-Ts` and `X-SSR-Auth = base64(HMAC-SHA256(SSR_SHARED_SECRET, ts))` — identical to what `ssr-auth.ts:21-34` *produces* for outbound gateway calls; here we *verify* it inbound.
- Verify: `const secret = process.env.SSR_SHARED_SECRET; if (!secret) return 503;` — **never process without a secret** (the analysis's known failure mode is `ssr-auth` degrading to `{}`; the endpoint must refuse, not open). Recompute HMAC over `ts`, **constant-time compare** (`crypto.timingSafeEqual`), reject if `|now - ts| > 60_000` (replay window; matches `SSR_FRESHNESS_SECONDS`). Reject missing/oversized bodies.
- Replay: timestamp window + **idempotency by `eventId`** (revalidateTag is itself idempotent, so a replay is harmless; optionally record recent `eventId`s in a short-TTL store to short-circuit — not required for correctness). A nonce store would need Redis/Edge Config (stateless serverless) — call out as optional.

**Request contract (batched):**
```jsonc
POST /api/revalidate?dryRun=false
{ "eventId":"uuid", "taskName":"performEach5Minute",
  "changedEntities":[{"type":"MATCH","id":123},{"type":"LEAGUE","id":39}],
  "fullAuditRequired": false }
```
Server maps each `{type,id}` → tag(s) per Phase 3; on `fullAuditRequired:true` ignores the (empty) list and purges the **coarse set** only.

**Response (per-item, so the crawler can log partials):**
```jsonc
{ "eventId":"uuid", "dryRun":false, "invalidated":["match:123","league:39"],
  "coarse": false, "counts":{"MATCH":1,"LEAGUE":1}, "skipped":[], "durationMs": 8 }
```

**Dry-run (`?dryRun=true`) — non-negotiable:** compute and return `invalidated[]` (the tags that *would* be purged) **without** calling `revalidateTag`. This is how the mapping is validated before trusting it (Phase 6 gate 1).

**Size/rate limits:** cap `changedEntities` at the engine's 500 (reject 413 above it — engine never sends more, but defend anyway). Endpoint is internal (crawler→site); no public exposure. Consider `maxDuration` small; each `revalidateTag` is O(1).

**Failure semantics (engine/crawler side):** revalidation failing **must never fail the crawl/task**. Treat `2xx` = done; `4xx` = log + drop (contract/mapping bug, don't retry blindly — a malformed batch won't fix itself); `5xx`/timeout = log + optional single retry, then drop. Worst case the TTL catches the missed change. Mirror the crawler's existing `IndexNowService` posture (`IndexNowService.java:78-81` swallows and returns status 0).

**Observability:** log `eventId`, `taskName`, per-type counts, tags invalidated, `coarse`, duration. Reuse `src/lib/audit.ts` (`logWebAuditEvent`, fire-and-forget) with a new `eventType:'revalidation'` so it lands in the same `T_WEB_EVENT_AUDIT` table as slug/404/server-error events — consistent with the existing audit path, no new infra. Pathnames/tags only, never tokens.

---

## Phase 5 — TTL rebalancing (diff shown, **not applied**; apply only per Phase 6)

Rule: a TTL is the staleness you accept **if the webhook silently dies**. Live-score paths keep a short timer regardless.

| Route | Current | Proposed | Rationale | If event never fires |
|---|---|---|---|---|
| `/`, `/ar` | 60 | **60 (keep)** | Live scores; never trust events alone | ≤60s stale — fine |
| `/match/[id]` (+ar) | 60 | **60 (keep)** initially; 300 once MATCH events proven | Scores go stale in seconds | ≤60s (or ≤300s) stale |
| `/team/[id]` (+ar) | 3600 | **86400** *after* TEAM/LEAGUE events proven | Daily bulk task + LEAGUE-tag cascade cover changes | ≤24h stale team SEO — acceptable |
| `/league/[id]` (+ar) | 3600 | **86400** *after* LEAGUE events proven | 5-min standings events + daily task | ≤24h stale |
| `/player/[id]` (+ar) | 3600 | **86400** *only after* `recordPlayer` instrumented; else keep 3600 | Bios change slowly, but no targeted event today | ≤24h stale (risky without player events → keep 3600 until instrumented) |
| `/leagues` (+ar) | 3600 | **86400** (fix now) | Data source `getAllLeagues` is already `86400`; route's 1h is a pure mismatch, safe to fix independent of events | ≤24h — matches data volatility |
| `/sitemap.xml` | 3600 | **21600** | Discovery; children already 86400 | ≤6h |

```diff
// src/app/leagues/page.tsx  (+ src/app/ar/leagues/page.tsx) — safe NOW, no events needed
- export const revalidate = 3600;
+ export const revalidate = 86400;

// src/app/team/[id]/[[...slug]]/page.tsx (+ ar)  — ONLY after TEAM/LEAGUE events proven
- export const revalidate = 3600;
+ export const revalidate = 86400;

// src/app/league/[id]/[[...slug]]/page.tsx (+ ar)  — ONLY after LEAGUE events proven
- export const revalidate = 3600;
+ export const revalidate = 86400;

// src/app/player/[id]/[[...slug]]/page.tsx (+ ar)  — ONLY after recordPlayer instrumented
- export const revalidate = 3600;
+ export const revalidate = 86400;   // else leave at 3600

// src/app/sitemap.xml/route.ts
- export const revalidate = 3600;
+ export const revalidate = 21600;
```

---

## Phase 6 — Rollout, verification, rollback

**The bridge decision (recommended):** implement the outbound revalidation call **inside the existing `seo-geo-crawler`**, not the engine. The crawler already consumes the event (`TaskCompletedConsumer`), already debounces/coalesces (`CrawlPlanner`), already resolves entities and makes signed outbound HTTP (`GatewaySignatures`, `IndexNowService` is the model), and already has DLQ + circuit breakers. Add a `RevalidationService` that POSTs `changedEntities`/`fullAuditRequired` to `/api/revalidate` **before the crawl fetch** (so the crawl regenerates+audits fresh content), gated by a new `crawler.revalidation.enabled` flag (`CrawlerProperties` nested class, mirroring `IndexNow`). Zero engine changes; zero new RabbitMQ bindings. (Rejected alternatives: a brand-new consumer duplicates debounce; engine→Vercel direct loses coalescing and violates the engine's fire-and-forget-over-RabbitMQ posture.)

**Phased rollout (TTLs LAST):**
1. **Dry-run only.** Ship tags in `server-api.ts` + the `/api/revalidate` endpoint. Exercise with `?dryRun=true`. No behavior change, fully revertible.
2. **One entity type — MATCH first.** Safest because match pages already have a 60s TTL floor (an over/under-invalidation can only ever be ≤60s wrong), it's the highest-volatility/highest-value page, and MATCH events already fire from `updateOnGoingFixtures`. Turn on live revalidation for `match:*` only.
3. **All emitted types (add LEAGUE, then `fullAuditRequired` coarse path).** Add PLAYER/TEAM only if/after the engine instruments `recordPlayer`/`recordTeam`.
4. **TTL lengthening LAST** — only once each type's events are observed working end-to-end, and only for the types with working events. **Why last:** the long TTL is the *safety net*; if you lengthen TTLs before proving events, a dead/broken webhook silently serves 24h-stale pages that used to self-heal at 1h. Events must be proven to be the primary mechanism before you weaken the fallback.

**Verify each phase:**
- Tags land: `curl -sI https://<host>/team/541/real-madrid` → note `x-vercel-cache`. After `POST /api/revalidate {team:541}`, the next request shows `MISS`/`STALE`→`HIT` transition and updated content; a sibling like `/team/999/...` stays `HIT` unchanged.
- End-to-end timing: push a real fixture through the engine (or replay a `SeoTaskCompletedEventDTO`), watch the match page update **faster than its TTL would allow** (e.g. content changes at ~seconds while TTL is 60/300s — proving the event, not the timer, did it).
- Coarse path: send `fullAuditRequired:true`, confirm only `top-teams|top-leagues|leagues-index|sitemap` purge and **no** per-entity fan-out.

**Canary (the real failure mode is over-invalidation):** pick an entity you did **not** change; confirm its `x-vercel-cache` stays `HIT` and its `lastmod`/content is unchanged across a revalidation run. Over-invalidation quietly recreates today's cost (mass cold renders) — the dry-run diff and this canary are how you catch it before TTLs are lengthened.

**Rollback / kill switch (no deploy):**
- Frontend: `REVALIDATION_ENABLED` env → when false the endpoint returns `200 {skipped:"disabled"}` without purging. Pure-TTL behavior restored instantly (Vercel env change, no code deploy).
- Crawler: `crawler.revalidation.enabled=false` via config server + `POST /actuator/refresh` (hot, per the existing `crawler.enabled` pattern).
- Engine: `seo.events.enabled=false` stops events at the source.

**Monitoring a silently-dead webhook:** alert on **events-received-count → 0 while tasks keep running** — e.g. compare the audit `revalidation` event rate against the engine task-run rate (or the crawler's `TaskCompletedConsumer` message count). Also alert on `/api/revalidate` 5xx rate and on Vercel Data-Cache MISS volume climbing back toward pre-event levels (means invalidation stopped and TTL is doing all the work again).

---

## Phase 7 — Risks

| Risk | Likelihood | Blast radius | Mitigation |
|---|---|---|---|
| **Missed event → page stale past intended freshness** | Med (flags off by default; deploy skew) | Bounded by TTL | Keep TTLs as safety net; lengthen only after proof (Phase 6); dead-webhook alert |
| **Over-invalidation → more cold renders than today** (esp. wrong fan-out, or firing `top-teams` per-entity) | Med | Could spike gateway load / SSR quota | Dry-run diff + canary before trusting; coarse set is a *fixed* small tag list; never tag sidebar getters per-entity |
| **Bulk task stampede** — a `fullAuditRequired` (or a mis-sized batch) forcing mass cold renders that blow the gateway's **50k/day SSR quota** (`SSR_MANAGEMENT.md §5.1`) | Med | Gateway 429s → `server-api.ts` returns null → pages degrade | `fullAuditRequired` purges only coarse tags (not entities); rely on crawler's 6h full-audit cooldown; keep the 500 cap |
| **Slug/rename race — old canonical stays cached** | Low today (renames only via bulk→coarse) | One stale URL until TTL | Documented limitation; needs additive `changeKind:'slug-changed'` + `revalidatePath(old,new)` if ever prioritized |
| **PLAYER/TEAM under-emission** (recorders unused) | High (current state) | Player/team pages get no targeted refresh | Do **not** lengthen those TTLs until `recordPlayer`/`recordTeam` are wired; keep 3600 |
| **Engine/frontend deploy out of sync → payload mismatch** | Med | Endpoint rejects → no revalidation (fails safe to TTL) | Version the contract; endpoint tolerates unknown fields; both sides flag-gated so either can lead |
| **Cloudflare cache in front of Vercel makes invalidation invisible to users** (open Q in analysis) | Unknown | `revalidateTag` purges Vercel but a Cloudflare edge cache could keep serving old HTML | **Confirm** whether Cloudflare caches HTML for these routes and with what TTL / purge hook; if it does, revalidation must also purge Cloudflare (API token) or Cloudflare must be set to bypass/short-TTL for document responses |

---

## Open questions

1. **Cloudflare layer.** Does the Cloudflare→Vercel path cache HTML documents (not just assets)? If yes, `revalidateTag` alone won't reach users; we'd need a Cloudflare purge or a bypass rule. Not determinable from either repo.
2. **`SSR_SHARED_SECRET` availability to the crawler.** The secret is shared gateway↔Vercel today. Is it (or should it be) also provisioned to `seo-geo-crawler` for signing `/api/revalidate`? Or should the crawler use its own `X-Gateway-Auth` secret and the endpoint verify *that* instead? (Both are HMAC-SHA256(secret, ts); only the secret+header names differ — `GatewaySignatures.java` uses 300s skew, `ssr-auth` 60s.)
3. **Is `/api/revalidate` reachable from the crawler's network** without going through the API gateway (the crawler's site calls currently hit `crawler.site-url` directly)? Confirm egress + that the endpoint isn't accidentally gateway-routed/rate-limited.
4. **Player/team instrumentation appetite.** Is closing the PLAYER/TEAM targeting gap (add `recordPlayer`/`recordTeam`, possibly `fields[]`) in scope, or is coarse daily-audit coverage acceptable for those?
5. **Does core expose a season for a match/team at event time** so `matches:{date}`/home could be targeted, or is home freshness intentionally left to the 60s timer? (Recommend leaving it on the timer.)
6. **IndexNow vs revalidation ordering** — should a revalidation failure block the IndexNow ping, or are they independent? (Recommend independent; neither should fail the crawl.)

## Implementation order (smallest safe, independently shippable commits)

1. **Frontend, safe now, no events:** apply the `/leagues` + sitemap TTL fixes (`revalidate 3600→86400` / `→21600`). Independently correct per the analysis; revertible one-liners.
2. **Frontend:** add `tags` to `ServerFetchOptions`/`doFetch` and tag every getter in `server-api.ts` (Phase 3 table). No behavior change (tags are inert until something revalidates them).
3. **Frontend:** add `POST /api/revalidate` (Node runtime) with HMAC verify (fail-closed), `?dryRun=true`, coarse-vs-targeted mapping, `REVALIDATION_ENABLED` kill switch, audit logging. Ship **dry-run-validated** — exercise via curl, nothing purges yet.
4. **Crawler:** add `RevalidationService` + `crawler.revalidation.enabled` flag; POST the already-consumed event to `/api/revalidate` for **MATCH only** first, before the crawl fetch. (Reuses `GatewaySignatures`, `IndexNowService` pattern.)
5. **Enable end-to-end for MATCH** (`seo.events.enabled=true` + crawler flag) in preview; verify + canary.
6. **Extend crawler mapping to LEAGUE + `fullAuditRequired` coarse path;** verify.
7. **(Optional) Engine:** wire `recordPlayer`/`recordTeam` (and additive `fields[]`/`changeKind` if rename precision wanted); verify PLAYER/TEAM events.
8. **TTL lengthening LAST**, per Phase 5 diff, one entity type at a time, only where events are proven.
