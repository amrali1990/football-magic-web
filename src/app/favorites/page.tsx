'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Team, League } from '@/types';
import { leagueHref, teamHref, rememberLeagueName } from '@/lib/utils';
import { LoginForm } from '@/components/auth/LoginForm';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { PageHeader } from '@/components/layout/PageHeader';

interface FavoritesData {
  teams?: Array<{ team: Team; pastMatch?: { id: number; date: string }; upcomingMatch?: { id: number; date: string } }>;
  leagues?: Array<{ league: League }>;
}

function FavoriteTeams({ data, lng }: { data: FavoritesData; lng: string }) {
  const { t } = useTranslation(lng);
  const teams = data.teams || [];
  if (!teams.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white">
      {teams.map((item) => (
        <div key={item.team.id} className="flex items-center gap-3 px-4 py-3">
          <Link href={teamHref(item.team.id, item.team.name)} className="flex flex-1 items-center gap-3">
            <div className="relative h-9 w-9 shrink-0">
              <Image src={item.team.logo} alt={item.team.name} fill className="object-contain" unoptimized />
            </div>
            <span className="text-sm font-medium text-gray-900">{item.team.name}</span>
          </Link>
          <FavoriteButton entityId={item.team.id} entityType="TEAM" />
        </div>
      ))}
    </div>
  );
}

function FavoriteLeagues({ data, lng }: { data: FavoritesData; lng: string }) {
  const { t } = useTranslation(lng);
  const leagues = data.leagues || [];
  if (!leagues.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white">
      {leagues.map((item) => (
        <div key={item.league.id} className="flex items-center gap-3 px-4 py-3">
          <Link href={leagueHref(item.league.id, item.league.name, item.league.logo)} onClick={() => rememberLeagueName(item.league.id, item.league.name, lng)} className="flex flex-1 items-center gap-3">
            <div className="relative h-8 w-8 shrink-0">
              <Image src={item.league.logo} alt={item.league.name} fill className="object-contain" unoptimized />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">{item.league.name}</span>
              <p className="text-xs text-gray-500">{item.league.country?.name}</p>
            </div>
          </Link>
          <FavoriteButton entityId={item.league.id} entityType="LEAGUE" />
        </div>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const user = useAppSelector((state) => state.Authentication.user);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [data, setData] = useState<FavoritesData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchFavorites = async () => {
      try {
        const result = await api.favorites.get(user.accessToken, lng) as FavoritesData;
        setData(result || {});
      } catch {
        setData({});
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [user, lng]);

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="px-4 pt-3 pb-1">
          <h1 className="text-xl font-bold text-gray-900">{t('Favorits_Teams').split(' ')[0] || 'Favorites'}</h1>
        </div>
      </PageHeader>
      {!user ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoginForm />
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="p-3">
          <Tabs
            tabs={[
              {
                key: 'teams',
                label: t('Favorits_Teams'),
                content: <FavoriteTeams data={data} lng={lng} />,
              },
              {
                key: 'leagues',
                label: t('Favorits_Leagues'),
                content: <FavoriteLeagues data={data} lng={lng} />,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
