'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { User } from '@/types';

export default function DeleteAccountPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.Authentication.user);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const errorMessage = (err: unknown) => {
    if (err instanceof AxiosError) {
      const message = (err.response?.data as { message?: string } | undefined)?.message;
      if (message) return message;
    }
    return t('Something went wrong.');
  };

  // Signed-in visitors delete with their existing session token.
  const handleDeleteSignedIn = async () => {
    setError('');
    setLoading(true);
    try {
      await api.auth.deleteAccount(user!.accessToken);
      dispatch(logout());
      setDeleted(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Anonymous visitors (e.g. arriving from the mobile app or Play Store
  // listing) confirm ownership with their credentials, then delete.
  const handleDeleteWithCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.auth.signIn(username, password) as User;
      await api.auth.deleteAccount(data.accessToken);
      setDeleted(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="px-4 pt-3 pb-3">
          <h1 className="text-xl font-bold text-gray-900">{t('DeleteAccount')}</h1>
        </div>
      </PageHeader>

      <div className="p-3">
        <div className="mx-auto max-w-md space-y-6">
          {deleted ? (
            <div className="rounded-xl bg-white p-6 text-center shadow-sm">
              <h2 className="mb-2 text-lg font-bold text-gray-900">{t('AccountDeleted')}</h2>
              <p className="text-sm text-gray-500">{t('AccountDeletedMessage')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {t('DeleteAccountIntro')}
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>
              )}

              {user ? (
                <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-700">
                    {t('SignedInAs')} <span className="font-semibold">{user.username}</span>
                  </p>
                  <p className="text-sm text-gray-500">{t('Are you sure you want to delete your account?')}</p>
                  <button
                    onClick={handleDeleteSignedIn}
                    disabled={loading}
                    className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? '...' : t('DeleteAccount')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDeleteWithCredentials} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700">{t('Confirm Account Deletion')}</h2>
                  <p className="text-sm text-gray-500">{t('DeleteAccountCredentials')}</p>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('Enter Username')}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    required
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('Enter Password')}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? '...' : t('DeleteAccount')}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
