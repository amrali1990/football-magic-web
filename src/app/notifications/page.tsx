'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { NotificationPreference } from '@/types';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { PageHeader } from '@/components/layout/PageHeader';

interface NotificationItem extends NotificationPreference {
  name?: string;
  logo?: string;
}

export default function NotificationsPage() {
  const user = useAppSelector((state) => state.Authentication.user);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [prefs, setPrefs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchPrefs = async () => {
      try {
        const data = await api.notifications.get(user.accessToken, lng) as NotificationItem[];
        setPrefs(data || []);
      } catch {
        setPrefs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, [user, lng]);

  const togglePref = async (index: number, field: 'goals' | 'allEvents') => {
    if (!user) return;
    const updated = [...prefs];
    updated[index] = { ...updated[index], [field]: !updated[index][field] };
    setPrefs(updated);
    try {
      await api.notifications.save(updated[index] as unknown as Record<string, unknown>, user.accessToken);
    } catch { /* revert silently on error */ }
  };

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="px-4 pt-3 pb-3">
          <h1 className="text-xl font-bold text-gray-900">{t('Notifications')}</h1>
        </div>
      </PageHeader>

      {!user ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoginForm />
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : !prefs.length ? (
        <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />
      ) : (
        <div className="p-3">
          <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white">
            {prefs.map((pref, index) => (
              <div key={`${pref.entityType}-${pref.entityId}`} className="px-4 py-3">
                <div className="mb-2 flex items-center gap-3">
                  {pref.logo && (
                    <div className="relative h-6 w-6 shrink-0">
                      <Image src={pref.logo} alt={pref.name || ''} fill className="object-contain" unoptimized />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900">{pref.name}</span>
                </div>
                <div className="flex gap-4 pl-9">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pref.goals}
                      onChange={() => togglePref(index, 'goals')}
                      className="rounded text-orange-500"
                    />
                    <span className="text-gray-600">{t('Goals')}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pref.allEvents}
                      onChange={() => togglePref(index, 'allEvents')}
                      className="rounded text-orange-500"
                    />
                    <span className="text-gray-600">{t('All Events')}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
