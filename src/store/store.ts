import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './slices/authSlice';
import leagueSeasonReducer from './slices/leagueSeasonSlice';
import languageReducer from './slices/languageSlice';
import loadingReducer from './slices/loadingSlice';
import { registerSessionStore } from '@/lib/session';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['Authentication', 'leagueSeason', 'language'],
};

const rootReducer = combineReducers({
  Authentication: authReducer,
  leagueSeason: leagueSeasonReducer,
  language: languageReducer,
  loading: loadingReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });
  const persistor = persistStore(store);
  // Let the API layer read the logged-in user's tokens without a store import.
  registerSessionStore(store);
  return { store, persistor };
};

export type AppStore = ReturnType<typeof makeStore>['store'];
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
