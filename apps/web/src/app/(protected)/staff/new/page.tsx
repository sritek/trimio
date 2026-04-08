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
import { useBranchContext } from '@/hooks/use-branch-context';

import { StaffForm } from '../components/staff-form';

export default function NewStaffPage() {
  const t = useTranslations('staff.form');
  const { branchId } = useBranchContext();

  return (
    <PermissionGuard permission={PERMISSIONS.USERS_WRITE} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader title={t('addTitle')} description={t('addDescription')} backHref="/staff" />
        <PageContent>
          <StaffForm branchId={branchId || ''} />
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
