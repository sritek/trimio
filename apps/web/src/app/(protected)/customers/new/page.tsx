'use client';

import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@trimio/shared';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';

import { CustomerForm } from '../components/customer-form';

export default function NewCustomerPage() {
  const t = useTranslations('customers.form');

  return (
    <PermissionGuard permission={PERMISSIONS.CUSTOMERS_WRITE} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader title={t('addTitle')} description={t('addDescription')} backHref="/customers" />
        <PageContent>
          <CustomerForm />
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
