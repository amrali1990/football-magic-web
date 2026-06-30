import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Season } from '@/types';

interface LeagueSeasonState {
  season: Season | null;
}

const initialState: LeagueSeasonState = {
  season: null,
};

const leagueSeasonSlice = createSlice({
  name: 'leagueSeason',
  initialState,
  reducers: {
    setSeason(state, action: PayloadAction<Season>) {
      state.season = action.payload;
    },
  },
});

export const { setSeason } = leagueSeasonSlice.actions;
export default leagueSeasonSlice.reducer;
