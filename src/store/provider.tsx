'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { makeStore, AppStore } from './store';
import { Persistor } from 'redux-persist';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<{ store: AppStore; persistor: Persistor } | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current.store}>
      {/* Render children as the PersistGate fallback too: with loading={null}
          the whole app was omitted from the server-rendered HTML (the gate only
          opens client-side after rehydration), which left every page empty for
          search engines. Rendering the tree with the initial Redux state keeps
          SSR output intact; persisted state (auth, language) still applies
          right after rehydration. */}
      <PersistGate loading={children} persistor={storeRef.current.persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
