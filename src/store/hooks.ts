import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

/**
 * True once redux-persist has restored the persisted state (auth, language).
 * Data fetches that depend on the user's language should wait for this,
 * otherwise the first request goes out with the default 'en' before the
 * persisted language is applied.
 */
export const useRehydrated = () =>
  useAppSelector((state) => (state as RootState & { _persist?: { rehydrated?: boolean } })._persist?.rehydrated === true);
