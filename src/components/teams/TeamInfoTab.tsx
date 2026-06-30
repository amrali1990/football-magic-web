'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Team } from '@/types';
import { useTranslation } from '@/i18n';
import { MapPin, Calendar, Users, Landmark, Flag, Building2, LandPlot } from 'lucide-react';
import { localizeNumber } from '@/lib/utils';

interface TeamInfoTabProps {
  team: Team;
  lng: string;
}

interface InfoItem {
  icon: typeof Landmark;
  value: string;
  href?: string;
}

function InfoCard({ title, items }: { title: string; items: InfoItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-semibold text-gray-700">{title}</span>
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
  );
}

export function TeamInfoTab({ team, lng }: TeamInfoTabProps) {
  const { t } = useTranslation(lng);

  // Team info card: country, founded
  const teamItems: InfoItem[] = [];
  if (team.country?.name) {
    teamItems.push({
      icon: Flag,
      value: team.country.name,
      href: team.country.code ? `/country/${team.country.code}` : undefined,
    });
  }
  if (team.founded) {
    teamItems.push({ icon: Calendar, value: String(localizeNumber(team.founded, lng)) });
  }

  // Venue card: name, city, address, capacity, surface (only when a real venue exists)
  const venueItems: InfoItem[] = [];
  const hasVenue = team.venue?.id != null;
  if (hasVenue) {
    if (team.venue?.name) {
      venueItems.push({ icon: Landmark, value: team.venue.name });
    }
    if (team.venue?.city) {
      venueItems.push({ icon: Building2, value: team.venue.city });
    }
    if (team.venue?.address) {
      venueItems.push({ icon: MapPin, value: team.venue.address });
    }
    if (team.venue?.capacity && team.venue.capacity > 0) {
      venueItems.push({ icon: Users, value: localizeNumber(team.venue.capacity.toLocaleString(), lng) });
    }
    if (team.venue?.surface) {
      venueItems.push({ icon: LandPlot, value: t(team.venue.surface) });
    }
  }

  return (
    <div className="space-y-3">
      <InfoCard title={t('TeamInfo')} items={teamItems} />

      <InfoCard title={t('Venue')} items={venueItems} />

      {hasVenue && team.venue?.image && (
        <div className="overflow-hidden rounded-xl">
          <div className="relative h-48 w-full">
            <Image src={team.venue.image} alt={team.venue.name || ''} fill className="object-cover" unoptimized />
          </div>
        </div>
      )}
    </div>
  );
}
