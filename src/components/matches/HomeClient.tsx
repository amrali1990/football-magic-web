'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { showLoading, hideLoading } from '@/store/slices/loadingSlice';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { formatDate, parseDate, isTodayDate } from '@/lib/utils';
import { LeagueWithFixtures } from '@/types';
import { DateStrip } from '@/components/matches/DateStrip';
import { LeagueMatchGroup } from '@/components/matches/LeagueMatchGroup';
import { SearchBar } from '@/components/ui/SearchBar';
import { NoData } from '@/components/ui/NoData';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import { SeoIntro } from '@/components/seo/SeoSections';
import { useRouteLanguageSync } from '@/lib/useRouteLanguageSync';
import { PageHeader } from '@/components/layout/PageHeader';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { useRightSidebar, SidebarScope } from '@/lib/layout-context';

/**
 * Feeds the router's `?date=` param into HomeClient. Lives in its own
 * component under a <Suspense> boundary: useSearchParams() on a statically
 * rendered route bails the enclosing boundary out to client-side rendering,
 * and scoping it to this null-rendering child keeps the page HTML intact
 * (HomeClient itself must never call useSearchParams — see CLAUDE.md).
 * Unlike a window.location read on mount, the router param updates on every
 * navigation — date taps (history.replaceState), the Matches tab Link
 * (query-only navigation that leaves this tree mounted), and back/forward.
 */
function UrlDateSync({ onDateParam }: { onDateParam: (dateParam: string | null) => void }) {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  useEffect(() => onDateParam(dateParam), [dateParam, onDateParam]);
  return null;
}

interface HomeClientProps {
  /** Server-rendered day (yyyy-MM-dd) whose matches are in initialLeagues. */
  initialDate: string;
  initialLeagues: LeagueWithFixtures[];
  initialTotalPages: number;
  /** Locale the server fetched the initial matches in ('en' route or '/ar' route). */
  initialLng?: string;
  /** Server-generated intro sentence (SEO copy rendered into the static HTML). */
  intro?: string;
  introLabel?: string;
}

export function HomeClient({ initialDate, initialLeagues, initialTotalPages, initialLng = 'en', intro, introLabel }: HomeClientProps) {
  const dispatch = useAppDispatch();
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);
  useRouteLanguageSync(initialLng);

  const [selectedDate, setSelectedDate] = useState<Date>(() => parseDate(initialDate) ?? new Date());
  const [leagues, setLeagues] = useState<LeagueWithFixtures[]>(initialLeagues);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialTotalPages > 1);

  // The server already rendered initialDate/page 0/English — skip the very
  // first client fetch so hydration reuses the server HTML untouched.
  const initialStateConsumed = useRef(false);

  // The date strip highlights "today" in the visitor's timezone, which can
  // differ from the server; render it only after mount to avoid a hydration
  // mismatch on interactive chrome that carries no SEO value.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Follow the router's `?date=` param (via UrlDateSync below). First call is
  // the initial mount: only honor an explicit ?date= from a shared/bookmarked
  // link. Later calls are real navigations — a date tap's replaceState (same
  // value, ignored), browser back/forward, or the Matches tab Link. That last
  // one is a query-only navigation on a static route: it strips ?date= but
  // leaves this tree mounted, so absent param must reset the state to today
  // or the page keeps showing the previously selected day under a bare `/`.
  const urlDateConsumedOnce = useRef(false);
  const handleUrlDate = useCallback((dateParam: string | null) => {
    const fromUrl = parseDate(dateParam);
    if (!urlDateConsumedOnce.current) {
      urlDateConsumedOnce.current = true;
      if (fromUrl && formatDate(fromUrl) !== initialDate) setSelectedDate(fromUrl);
      return;
    }
    const next = fromUrl ?? new Date();
    setSelectedDate((prev) => (formatDate(next) === formatDate(prev) ? prev : next));
  }, [initialDate]);

  // Date taps go through router.replace so the router's canonical URL (and
  // useSearchParams) track the selected day. A raw history.replaceState only
  // rewrites the address bar — the router still believes it is at `/`, so a
  // later Matches-tab <Link href="/"> becomes a no-op navigation that strips
  // ?date= without re-rendering anything, leaving the old day on screen under
  // a bare `/`. We still set the state eagerly: the UrlDateSync round-trip
  // then sees an already-matching date and does nothing.
  const router = useRouter();
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    const params = new URLSearchParams(window.location.search);
    if (isTodayDate(date)) {
      params.delete('date');
    } else {
      params.set('date', formatDate(date));
    }
    const qs = params.toString();
    router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname, { scroll: false });
  }, [router]);

  useRightSidebar(() => <RightSidebar />);

  // Discard out-of-order responses (e.g. a fetch for the previous language or
  // day resolving after the current one) — only the latest request may apply.
  const requestSeq = useRef(0);

  const fetchMatches = useCallback(async (date: Date, pageNum: number, searchText: string, append: boolean) => {
    const requestId = ++requestSeq.current;
    const isCurrent = () => requestId === requestSeq.current;
    if (pageNum === 0) setLoading(true);
    // The global overlay is only for full reloads; appended pages show a
    // small inline spinner at the list end instead.
    if (!append) dispatch(showLoading());

    try {
      let data: LeagueWithFixtures[];
      if (searchText.trim()) {
        const response = await api.matches.searchByDate(formatDate(date), searchText, lng);
        const typed = response as { list: LeagueWithFixtures[] };
        data = Array.isArray(typed?.list) ? typed.list : Array.isArray(response) ? response as LeagueWithFixtures[] : [];
        if (isCurrent()) setHasMore(false);
      } else {
        const response = await api.matches.getByDate(formatDate(date), pageNum, lng);
        const typed = response as { list: LeagueWithFixtures[]; totalPages: number };
        data = Array.isArray(typed?.list) ? typed.list : Array.isArray(response) ? response as LeagueWithFixtures[] : [];
        if (isCurrent()) setHasMore(pageNum + 1 < (typed?.totalPages || 0));
      }
      if (isCurrent()) setLeagues((prev) => append ? [...prev, ...data] : data);
    } catch {
      if (isCurrent() && !append) setLeagues([]);
    } finally {
      if (isCurrent()) setLoading(false);
      if (!append) dispatch(hideLoading());
    }
  }, [lng, dispatch]);

  useEffect(() => {
    if (!initialStateConsumed.current) {
      initialStateConsumed.current = true;
      if (formatDate(selectedDate) === initialDate && !search && lng === initialLng) return;
    }
    setPage(0);
    setHasMore(true);
    fetchMatches(selectedDate, 0, search, false);
  }, [selectedDate, search, fetchMatches, initialDate, initialLng, lng]);

  // Auto-load the next page when the list end scrolls into view.
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore || search) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    try {
      await fetchMatches(selectedDate, nextPage, search, true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, hasMore, search, page, selectedDate, fetchMatches]);

  return (
    <div className="flex flex-col">
      <Suspense fallback={null}>
        <UrlDateSync onDateParam={handleUrlDate} />
      </Suspense>
      {/* Sidebar shows top leagues/teams playing on the selected day. */}
      <SidebarScope params={{ date: formatDate(selectedDate) }} />
      <PageHeader>
        <div className="px-4 pt-3">
          <h1 className="text-xl font-bold text-gray-900">{t('Matches')}</h1>
        </div>
        <div className="px-4 py-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('search_matches')}
          />
        </div>
        {mounted ? (
          <DateStrip selectedDate={selectedDate} onDateSelect={handleDateSelect} lng={lng} />
        ) : (
          <div aria-hidden className="h-[118px]" />
        )}
      </PageHeader>

      {intro && <SeoIntro label={introLabel ?? "Today's overview"} text={intro} />}

      <div className="p-3 space-y-3">
        {loading ? (
          <LoadingSpinner />
        ) : leagues.length === 0 ? (
          <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />
        ) : (
          <>
            {leagues.map((leagueWithFixtures, index) => (
              <LeagueMatchGroup
                key={`${leagueWithFixtures.id}-${index}`}
                leagueWithFixtures={leagueWithFixtures}
                lng={lng}
              />
            ))}

            {hasMore && !search && (
              <InfiniteScrollTrigger onLoadMore={loadMore} loading={loadingMore} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
