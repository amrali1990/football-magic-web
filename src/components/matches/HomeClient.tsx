'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useRightSidebar } from '@/lib/layout-context';

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

  // Seed the selected day from the URL (`?date=yyyy-MM-dd`) so shared or
  // bookmarked links open on the right day (replaces the old useSearchParams
  // read, which forced this subtree to render client-side only).
  useEffect(() => {
    const fromUrl = parseDate(new URLSearchParams(window.location.search).get('date'));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fromUrl && formatDate(fromUrl) !== initialDate) setSelectedDate(fromUrl);
  }, [initialDate]);

  // `selectedDate` is the single runtime source of truth. We mirror it into
  // the URL with history.replaceState rather than router.replace(): a
  // query-only router navigation on a statically-rendered route remounts this
  // subtree against a stale snapshot, which made the 2nd+ date tap appear
  // stuck. Rewriting the address bar directly keeps the URL shareable while
  // leaving React in full control of the rendered state.
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    const params = new URLSearchParams(window.location.search);
    if (isTodayDate(date)) {
      params.delete('date');
    } else {
      params.set('date', formatDate(date));
    }
    const qs = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    );
  }, []);

  // Follow browser back/forward into local state (the address bar may carry a
  // different `?date=` from a prior history entry).
  useEffect(() => {
    const onPopState = () => {
      setSelectedDate(parseDate(new URLSearchParams(window.location.search).get('date')) ?? new Date());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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
