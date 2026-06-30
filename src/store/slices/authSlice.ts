import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';

interface AuthState {
  user: User | null;
}

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: 'Authentication',
  initialState,
  reducers: {
    login(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    logout(state) {
      state.user = null;
    },
    addToLeagueIds(state, action: PayloadAction<number>) {
      if (state.user && !state.user.leagueIds.includes(action.payload)) {
        state.user.leagueIds.push(action.payload);
      }
    },
    removeFromLeagueIds(state, action: PayloadAction<number>) {
      if (state.user) {
        state.user.leagueIds = state.user.leagueIds.filter((id) => id !== action.payload);
      }
    },
    addToTeamIds(state, action: PayloadAction<number>) {
      if (state.user && !state.user.teamIds.includes(action.payload)) {
        state.user.teamIds.push(action.payload);
      }
    },
    removeFromTeamIds(state, action: PayloadAction<number>) {
      if (state.user) {
        state.user.teamIds = state.user.teamIds.filter((id) => id !== action.payload);
      }
    },
  },
});

export const { login, logout, addToLeagueIds, removeFromLeagueIds, addToTeamIds, removeFromTeamIds } = authSlice.actions;
export default authSlice.reducer;
