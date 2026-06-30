'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { PageHeader } from '@/components/layout/PageHeader';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { useRightSidebar } from '@/lib/layout-context';

function MatchesPageContent() {
  const dispatch = useAppDispatch();
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  // Seed the selected day from the URL (`?date=yyyy-MM-dd`) so shared/bookmarked
  // links open on the right day; no param means today. Reading `useSearchParams`
  // also keeps this subtree below the Suspense boundary, so the initial day
  // renders client-side without a hydration mismatch.
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => parseDate(searchParams.get('date')) ?? new Date()
  );

  // `selectedDate` is the single runtime source of truth, so every tap updates
  // it directly and reliably. We mirror it into the URL with history.replaceState
  // rather than router.replace(): on the statically-rendered `/` route a
  // query-only router navigation remounts this subtree against a stale
  // searchParams snapshot, which made the 2nd+ date tap appear stuck. Rewriting
  // the address bar directly keeps the URL shareable while leaving React in
  // full control of the rendered state.
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

  const [leagues, setLeagues] = useState<LeagueWithFixtures[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useRightSidebar(() => <RightSidebar />);

  const fetchMatches = useCallback(async (date: Date, pageNum: number, searchText: string, append: boolean) => {
    if (pageNum === 0) setLoading(true);
    dispatch(showLoading());

    try {
      let data: LeagueWithFixtures[];
      if (searchText.trim()) {
        const response = await api.matches.searchByDate(formatDate(date), searchText, lng);
        const typed = response as { list: LeagueWithFixtures[] };
        data = Array.isArray(typed?.list) ? typed.list : Array.isArray(response) ? response as LeagueWithFixtures[] : [];
        setHasMore(false);
      } else {
        const response = await api.matches.getByDate(formatDate(date), pageNum, lng);
        const typed = response as { list: LeagueWithFixtures[]; totalPages: number };
        data = Array.isArray(typed?.list) ? typed.list : Array.isArray(response) ? response as LeagueWithFixtures[] : [];
        setHasMore(pageNum + 1 < (typed?.totalPages || 0));
      }
      setLeagues((prev) => append ? [...prev, ...data] : data);
    } catch {
      if (!append) setLeagues([]);
    } finally {
      setLoading(false);
      dispatch(hideLoading());
    }
  }, [lng, dispatch]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchMatches(selectedDate, 0, search, false);
  }, [selectedDate, search, fetchMatches]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMatches(selectedDate, nextPage, search, true);
  };

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
        <DateStrip selectedDate={selectedDate} onDateSelect={handleDateSelect} lng={lng} />
      </PageHeader>

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
              <div className="flex justify-center py-2">
                <button
                  onClick={loadMore}
                  className="rounded-full border border-gray-200 px-8 py-2.5 text-sm font-bold text-orange-500 transition-colors hover:bg-orange-50"
                >
                  {t('Show_All')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MatchesPage() {
  // `useSearchParams` (used in MatchesPageContent) requires a Suspense boundary
  // on a statically-rendered route, otherwise the production build fails.
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MatchesPageContent />
    </Suspense>
  );
}
