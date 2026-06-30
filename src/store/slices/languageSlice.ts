import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LanguageState {
  language: {
    name: string;
    code: string;
    direction: 'LTR' | 'RTL';
  };
}

const initialState: LanguageState = {
  language: { name: 'English', code: 'en', direction: 'LTR' },
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<LanguageState['language']>) {
      state.language = action.payload;
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;
