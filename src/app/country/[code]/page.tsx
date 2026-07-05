'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { teamHref, playerHref } from '@/lib/utils';
import { Country, League, Team, Player } from '@/types';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import { NoData } from '@/components/ui/NoData';
import { LeagueCard } from '@/components/leagues/LeagueCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { PageHeader } from '@/components/layout/PageHeader';

function CountryLeaguesTab({ countryCode, lng }: { countryCode: string; lng: string }) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetch = async () => {
      try {
        // Endpoint returns a single { ..., leagues: League[] } object
        const data = await api.leagues.getByCountry(countryCode, lng) as { leagues?: League[] } | League[];
        const list = Array.isArray(data) ? data : (data?.leagues || []);
        setLeagues(list);
      } catch { setLeagues([]); }
      finally { setLoading(false); }
    };
    fetch();
  }, [countryCode, lng]);

  if (loading) return <LoadingSpinner />;
  if (!leagues.length) return <NoData title={t('NoDataTitle')} />;

  // Group into Leagues and Cups, mirroring the mobile screen
  const cups = leagues.filter((l) => l.type?.toLowerCase() === 'cup');
  const competitions = leagues.filter((l) => l.type?.toLowerCase() !== 'cup');
  const sections = [
    { title: t('Leagues'), items: competitions },
    { title: t('cups'), items: cups },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-2 px-2 text-sm font-semibold text-orange-500">{section.title}</h3>
          <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white">
            {section.items.map((l) => <LeagueCard key={l.id} league={l} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CountryTeamsTab({ countryCode, national, lng }: { countryCode: string; national: boolean; lng: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // Endpoint returns a Spring Page: { content, totalPages }
        const data = await api.teams.getByCountryCode(countryCode, page, national, lng) as { content?: Team[]; totalPages?: number };
        const list = data?.content || [];
        setTeams((prev) => page === 0 ? list : [...prev, ...list]);
        setHasMore(page + 1 < (data?.totalPages || 0));
      } catch { if (page === 0) setTeams([]); }
      finally { setLoading(false); }
    };
    fetch();
  }, [countryCode, page, national, lng]);

  const filtered = search ? teams.filter((tm) => tm.name.toLowerCase().includes(search.toLowerCase())) : teams;

  if (loading && page === 0) return <LoadingSpinner />;
  if (!teams.length) return <NoData title={t('NoDataTitle')} />;

  return (
    <div className="space-y-3">
      <SearchBar value={search} onChange={setSearch} placeholder={t('Search_Teams')} />
      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white">
        {filtered.map((team) => (
          <Link key={team.id} href={teamHref(team.id, team.name)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
            <div className="relative h-8 w-8 shrink-0">
              <Image src={team.logo} alt={team.name} fill className="object-contain" unoptimized />
            </div>
            <span className="text-sm font-medium text-gray-900">{team.name}</span>
          </Link>
        ))}
      </div>
      {hasMore && !search && (
        <InfiniteScrollTrigger onLoadMore={() => setPage((p) => p + 1)} loading={loading} />
      )}
    </div>
  );
}

function CountryPlayersTab({ countryCode, lng }: { countryCode: string; lng: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const { t } = useTranslation(lng);

  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // Endpoint returns a Spring Page: { content, totalPages }
        const data = await api.players.getByCountryCode(countryCode, page, lng) as { content?: Player[]; totalPages?: number };
        const list = data?.content || [];
        setPlayers((prev) => page === 0 ? list : [...prev, ...list]);
        setHasMore(page + 1 < (data?.totalPages || 0));
      } catch { if (page === 0) setPlayers([]); }
      finally { setLoading(false); }
    };
    fetch();
  }, [countryCode, page, lng]);

  if (loading && page === 0) return <LoadingSpinner />;
  if (!players.length) return <NoData title={t('NoDataTitle')} />;

  return (
    <div className="space-y-3">
      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white">
        {players.map((player) => (
          <Link key={player.id} href={playerHref(player.id, player.name)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
              <Image src={player.photo} alt={player.name} fill className="object-cover" unoptimized />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{player.name}</p>
              {player.position && <p className="text-xs text-gray-500">{t(player.position)}</p>}
            </div>
          </Link>
        ))}
      </div>
      {hasMore && (
        <InfiniteScrollTrigger onLoadMore={() => setPage((p) => p + 1)} loading={loading} />
      )}
    </div>
  );
}

export default function CountryPage() {
  const params = useParams();
  const countryCode = params.code as string;
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const data = await api.countries.getCountry(countryCode, lng) as Country;
        setCountry(data);
      } catch { setCountry(null); }
      finally { setLoading(false); }
    };
    fetchCountry();
  }, [countryCode, lng]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          {country?.flag && (
            <Image src={country.flag} alt={country.name} width={32} height={22} className="rounded" unoptimized />
          )}
          <h1 className="text-[17px] font-bold text-gray-900">{country?.name || countryCode}</h1>
        </div>
      </PageHeader>

      <div className="p-3">
        <Tabs
          tabs={[
            { key: 'leagues', label: t('CountryLeagues'), content: <CountryLeaguesTab countryCode={countryCode} lng={lng} /> },
            { key: 'national', label: t('CountryNationalTeams'), content: <CountryTeamsTab countryCode={countryCode} national={true} lng={lng} /> },
            { key: 'clubs', label: t('CountryTeams'), content: <CountryTeamsTab countryCode={countryCode} national={false} lng={lng} /> },
            { key: 'players', label: t('CountryPlayers'), content: <CountryPlayersTab countryCode={countryCode} lng={lng} /> },
          ]}
        />
      </div>
    </div>
  );
}
