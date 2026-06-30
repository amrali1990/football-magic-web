'use client';

import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { PageHeader } from '@/components/layout/PageHeader';

export default function RegisterPage() {
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="px-4 pt-3 pb-3">
          <h1 className="text-xl font-bold text-gray-900">{t('Register')}</h1>
        </div>
      </PageHeader>
      <div className="flex min-h-[60vh] items-center justify-center py-8">
        <RegisterForm />
      </div>
    </div>
  );
}
