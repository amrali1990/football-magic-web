'use client';

import { Star } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToTeamIds, removeFromTeamIds, addToLeagueIds, removeFromLeagueIds } from '@/store/slices/authSlice';
import { api } from '@/lib/api';

interface FavoriteButtonProps {
  entityId: number;
  entityType: 'TEAM' | 'LEAGUE';
}

export function FavoriteButton({ entityId, entityType }: FavoriteButtonProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.Authentication.user);

  if (!user) return null;

  const isFavorited = entityType === 'TEAM'
    ? user.teamIds?.includes(entityId)
    : user.leagueIds?.includes(entityId);

  const toggle = async () => {
    try {
      if (isFavorited) {
        if (entityType === 'TEAM') {
          dispatch(removeFromTeamIds(entityId));
        } else {
          dispatch(removeFromLeagueIds(entityId));
        }
        await api.favorites.delete({ entityId, entityType }, user.accessToken);
      } else {
        if (entityType === 'TEAM') {
          dispatch(addToTeamIds(entityId));
        } else {
          dispatch(addToLeagueIds(entityId));
        }
        await api.favorites.save({ entityId, entityType }, user.accessToken);
      }
    } catch {
      if (isFavorited) {
        if (entityType === 'TEAM') dispatch(addToTeamIds(entityId));
        else dispatch(addToLeagueIds(entityId));
      } else {
        if (entityType === 'TEAM') dispatch(removeFromTeamIds(entityId));
        else dispatch(removeFromLeagueIds(entityId));
      }
    }
  };

  return (
    <button
      onClick={toggle}
      className="rounded-full p-1.5 transition-colors hover:bg-gray-100"
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`h-5 w-5 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
      />
    </button>
  );
}
