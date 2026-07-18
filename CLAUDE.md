@AGENTS.md

# Football Magic Web

Web version of the Football Magic React Native mobile app. Built with Next.js 16, TypeScript, Tailwind CSS.

## Commands
```bash
npm run dev     # Start dev server
npm run build   # Production build
npm start       # Start production server
npm run lint    # Run ESLint
```

## Architecture

### API Layer
- `src/lib/api.ts` — centralized API client mirroring the mobile app's `apiCall.tsx`
- Same backend: `https://api.football-magic.com`
- Auth: Bearer token for logged-in users; scoped read-only **guest token**
  (`/auth/guest`, see `src/lib/guest.ts` / `guest-server.ts`) when no user is
  logged in — the old Basic-auth fallback has been removed
- All requests send `lng` header for server-side localization

### State Management
- Redux Toolkit + Redux Persist (matching mobile app's store structure)
- Slices: Authentication, leagueSeason, language, loading
- Store: `src/store/store.ts`, Provider: `src/store/provider.tsx`

### i18n
- Custom lightweight i18n (no next-intl routing)
- Translations: `src/i18n/en.json`, `src/i18n/ar.json`
- RTL support via `dir` attribute on root layout

### SEO / SSR Architecture
- **Bilingual URL trees**: English is canonical on unprefixed URLs (`/team/541/real-madrid`); Arabic mirrors every public page under `/ar` with fully localized content and Arabic slugs (`/ar/team/541/ريال-مدريد`, percent-encoded). Both are linked via hreflang alternates (x-default → English). Shared per-entity implementations live in `src/components/pages/*EntityPage.tsx`; the route files under `app/...` and `app/ar/...` are thin locale wrappers. All localized SEO copy (titles, descriptions, intros, FAQs, labels) comes from `src/lib/seo-i18n.ts`. `/ar` URLs force the app language to Arabic on mount via `useRouteLanguageSync`.
- Public entity routes are Server Components with on-demand ISR (`/team|player|league/[id]/[[...slug]]` revalidate 1h, `/match/[id]/[[...slug]]` 60s, `/` 60s). The server page fetches via `src/lib/server-api.ts` (native fetch + guest token + React `cache()`), builds metadata/JSON-LD/intro/FAQ/internal links, and passes `initialData` to a `*PageClient` component that keeps all interactive behavior (refetches only on language change). Entity getters return null only when the API definitively reports the entity missing (404 or 200-empty-body) — pages `notFound()` on that; transient upstream failures throw `UpstreamApiError` so the render fails instead of baking a 404 into the ISR cache (list getters degrade to empty instead). The guest-token fetch (`guest-server.ts`) uses **axios**, not fetch: a `no-store` fetch inside an ISR render throws app-static-to-dynamic-error and 500s every cold instance.
- Canonical URLs are slugged (`/team/541/real-madrid`); ID-only or wrong-slug URLs 308-redirect via `permanentRedirect()`. Always build entity links with `teamHref/playerHref/leagueHref/matchHref` from `src/lib/utils.ts` (backed by `src/lib/seo.ts`) and pass the current `lng` so Arabic sessions link into the `/ar` tree. Slugs are always **NFC-normalized** (`normalizeSlug` in `src/lib/slug.ts` — Arabic hamza letters have two Unicode byte forms and browsers/Google emit NFC); `src/proxy.ts` 301-redirects any non-NFC request path to the NFC form before routing.
- **Audit events**: `src/lib/audit.ts` (server-only) posts routing events — `slug_normalization_mismatch` (from `proxy.ts`), `not_found` (browser logger in `app/not-found.tsx` → `/api/audit/not-found`), `server_error` (`src/instrumentation.ts` `onRequestError`) — through the gateway to the audit service (`POST /audit/web-events`, table `T_WEB_EVENT_AUDIT`). Fire-and-forget, all failures swallowed; pathnames only, never query strings (token safety).
- `src/lib/normalize.ts` holds API response normalizers shared by server and client. `app/sitemap.ts`, `app/robots.ts`, `public/llms.txt` handle discovery; JSON-LD builders live in `src/lib/schema.ts` rendered via `<JsonLd />`.
- `StoreProvider` renders children as the PersistGate fallback — never set `loading={null}` there or all SSR HTML disappears.
- The root layout server-fetches top teams/leagues and seeds the right sidebars via `LayoutProvider sidebarSeed` so those internal links exist in every page's HTML. Pages scope the sidebar to their content by rendering `<SidebarScope params={{ date | countryCode | leagueId | teamId }} />`; `useSidebarData()` then fetches the context-aware `GET /leagues/getSidebar` core endpoint (web-only, 5-min Redis cache) and falls back to the seed on failure. Match pages server-render events + starting line-ups into collapsed sections and emit BreadcrumbList JSON-LD (all entity pages do). OG images are generated at `/og/match|team|league/[id]` and `/og/home` (ImageResponse, English names only — no Arabic glyphs in satori's default font).
- Avoid `useSearchParams()` directly in components used on static routes (forces a CSR bailout that blanks the page). For one-shot reads on mount, read `window.location.search` in an effect (see `Tabs.tsx`). If state must *track* the param across navigations, isolate `useSearchParams()` in a null-rendering child inside its own `<Suspense>` boundary (see `UrlDateSync` in `HomeClient.tsx`) — a window.location read misses later query-only navigations. Never mirror state into the URL with raw `history.replaceState`: it rewrites the address bar but does **not** sync the router's canonical URL, so a later `<Link>` to the same pathname becomes a no-op that strips the query without re-rendering; use `router.replace(..., { scroll: false })`.

### Route → Mobile Screen Mapping
| Route | Mobile Screen |
|-------|---------------|
| `/` | MatchesScreen (tab) |
| `/leagues` | LeaguesScreen (tab) |
| `/favorites` | FavoritsScreen (tab) |
| `/settings` | MoreScreen (tab) |
| `/match/[id]` | MatchScreen + tabs (Info, Events, LineUp, H2H) |
| `/league/[id]` | LeagueScreen + tabs (Matches, Table, Players Stats, Winners, Info) |
| `/team/[id]` | TeamScreen + tabs (Info, Seasons, Matches, Transfers, Squad) |
| `/player/[id]` | PlayerScreen + tabs (Info, Seasons, Transfers) |
| `/country/[code]` | CountryScreen + tabs (Leagues, National Teams, Clubs, Players) |
| `/profile` | ProfileScreen / LoginScreen |
| `/register` | RegistrationScreen |
| `/notifications` | NotificationScreen |
