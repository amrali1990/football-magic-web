'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login } from '@/store/slices/authSlice';
import { api } from '@/lib/api';
import { useTranslation } from '@/i18n';
import { Country, User } from '@/types';

export function RegisterForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: 'Male',
    birthDate: '',
    countryId: '',
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await api.countries.getAll(lng) as Country[];
        setCountries(data || []);
      } catch {
        /* ignore */
      }
    };
    fetchCountries();
  }, [lng]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.register({
        username: form.username,
        email: form.email,
        password: form.password,
        gender: form.gender,
        birthDate: form.birthDate,
        countryId: form.countryId ? Number(form.countryId) : undefined,
      }) as User;
      dispatch(login(data));
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">{t('Registration')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <input
          type="text"
          value={form.username}
          onChange={(e) => updateField('username', e.target.value)}
          placeholder={t('Enter Username')}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          required
        />

        <input
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder={t('Enter Email')}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          required
        />

        <input
          type="password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          placeholder={t('Enter Password')}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          required
        />

        <input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          placeholder={t('Enter Confirm Password')}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          required
        />

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="gender"
              value="Male"
              checked={form.gender === 'Male'}
              onChange={(e) => updateField('gender', e.target.value)}
              className="text-orange-500"
            />
            <span className="text-sm text-gray-700">{t('Male')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="gender"
              value="Female"
              checked={form.gender === 'Female'}
              onChange={(e) => updateField('gender', e.target.value)}
              className="text-orange-500"
            />
            <span className="text-sm text-gray-700">{t('Female')}</span>
          </label>
        </div>

        <input
          type="date"
          value={form.birthDate}
          onChange={(e) => updateField('birthDate', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        />

        <select
          value={form.countryId}
          onChange={(e) => updateField('countryId', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">{t('Country')}</option>
          {countries.map((country) => (
            <option key={country.code} value={country.id}>{country.name}</option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? '...' : t('Sign up')}
        </button>
      </form>
    </div>
  );
}
