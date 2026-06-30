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
- Auth: Bearer token for logged-in users, Basic Auth fallback
- All requests send `lng` header for server-side localization

### State Management
- Redux Toolkit + Redux Persist (matching mobile app's store structure)
- Slices: Authentication, leagueSeason, language, loading
- Store: `src/store/store.ts`, Provider: `src/store/provider.tsx`

### i18n
- Custom lightweight i18n (no next-intl routing)
- Translations: `src/i18n/en.json`, `src/i18n/ar.json`
- RTL support via `dir` attribute on root layout

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
