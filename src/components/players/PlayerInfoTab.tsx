'use client';

import Link from 'next/link';
import { Player } from '@/types';
import { useTranslation } from '@/i18n';
import { User, Flag, Calendar, MapPin, Ruler, Weight } from 'lucide-react';
import { localizeNumber } from '@/lib/utils';

interface PlayerInfoTabProps {
  player: Player;
  lng: string;
}

interface InfoItem {
  icon: typeof User;
  value: string;
  href?: string;
}

function formatBirthDate(birthDate: string | undefined, age: number | undefined, lng: string) {
  if (!birthDate) return '';
  const d = new Date(birthDate);
  const formatted = Number.isNaN(d.getTime())
    ? birthDate
    : new Intl.DateTimeFormat(lng === 'ar' ? 'ar-EG' : 'en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(d);
  return age != null ? `${formatted} (${localizeNumber(age, lng)})` : formatted;
}

export function PlayerInfoTab({ player, lng }: PlayerInfoTabProps) {
  const { t } = useTranslation(lng);

  const fullName = player.firstName
    ? `${player.firstName} ${player.lastName || ''}`.trim()
    : `${player.firstname || ''} ${player.lastname || ''}`.trim() || player.name;

  const items: InfoItem[] = [];

  if (fullName) {
    items.push({ icon: User, value: fullName });
  }
  if (player.nationality) {
    items.push({
      icon: Flag,
      value: player.nationality,
      href: player.nationalityCode ? `/country/${player.nationalityCode}` : undefined,
    });
  }
  const birth = formatBirthDate(player.birthDate, player.age, lng);
  if (birth) {
    items.push({ icon: Calendar, value: birth });
  }
  if (player.birthPlace) {
    items.push({
      icon: MapPin,
      value: player.birthCountry ? `${player.birthPlace} (${player.birthCountry})` : player.birthPlace,
    });
  }
  if (player.height) {
    items.push({ icon: Ruler, value: localizeNumber(player.height, lng) });
  }
  if (player.weight) {
    items.push({ icon: Weight, value: localizeNumber(player.weight, lng) });
  }

  if (!items.length) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-4 py-2.5">
          <span className="text-[13px] font-semibold text-gray-700">{t('PlayerInfo')}</span>
        </div>
        <div className="border-t border-gray-100">
          {items.map((item, index) => {
            const row = (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <item.icon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="text-[13px] text-gray-900">{item.value}</span>
              </div>
            );
            return (
              <div key={index}>
                {index > 0 && <div className="mx-4 border-t border-gray-50" />}
                {item.href ? (
                  <Link href={item.href} className="block transition-colors hover:bg-gray-50">{row}</Link>
                ) : (
                  row
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
