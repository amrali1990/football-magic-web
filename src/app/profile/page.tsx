'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { login, logout } from '@/store/slices/authSlice';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { LoginForm } from '@/components/auth/LoginForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Country, User } from '@/types';

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.Authentication.user);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [countryId, setCountryId] = useState(user?.countryId || 0);
  const [countries, setCountries] = useState<Country[]>([]);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.countries.getAll(lng)
      .then((data) => setCountries(data as Country[]))
      .catch(() => setCountries([]));
  }, [user, lng]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // The backend replaces countryId/gender/birthDate wholesale, so echo the
      // unchanged fields back to avoid wiping them.
      const data = await api.auth.updateProfile(
        { countryId, gender: user!.gender, birthDate: user!.birthDate },
        user!.accessToken
      ) as User;
      dispatch(login({ ...user!, ...data }));
      setSuccess('Profile updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.auth.updatePassword(passwordForm, user!.accessToken);
      setSuccess('Password updated');
      setPasswordForm({ oldPassword: '', newPassword: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="px-4 pt-3 pb-3">
          <h1 className="text-xl font-bold text-gray-900">{t('Profile')}</h1>
        </div>
      </PageHeader>

      {!user ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoginForm />
        </div>
      ) : (
        <div className="p-3">
          <div className="mx-auto max-w-md space-y-6">
            {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
            {success && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">{success}</div>}

            <form onSubmit={handleUpdateProfile} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
              <input
                type="text"
                value={user.username}
                placeholder={t('Username')}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none"
                disabled
              />
              <input
                type="email"
                value={user.email}
                placeholder={t('Email')}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none"
                disabled
              />
              <select
                value={countryId}
                onChange={(e) => setCountryId(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
              >
                <option value={0} disabled>{t('Country')}</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {t('Update')}
              </button>
            </form>

            <form onSubmit={handleUpdatePassword} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700">{t('Update Password')}</h2>
              <input
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                placeholder={t('Old Password')}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                required
              />
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder={t('New Password')}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gray-800 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
              >
                {t('Update Password')}
              </button>
            </form>

            <button
              onClick={handleLogout}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-red-500 shadow-sm hover:bg-red-50"
            >
              {t('Logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
