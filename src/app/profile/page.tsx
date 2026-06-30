'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { login, logout } from '@/store/slices/authSlice';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { LoginForm } from '@/components/auth/LoginForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { User } from '@/types';

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.Authentication.user);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await api.auth.updateProfile(form, user!.accessToken) as User;
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
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={t('Username')}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t('Email')}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
              />
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
