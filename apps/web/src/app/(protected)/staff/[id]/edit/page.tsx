'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, User } from 'lucide-react';

import { PERMISSIONS } from '@trimio/shared';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  EmptyState,
} from '@/components/common';
import { useStaffDetail } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';

import { StaffForm } from '../../components/staff-form';

export default function EditStaffPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('staff.form');
  const { branchId } = useBranchContext();

  const staffId = params.id as string;
  const { data: staff, isLoading, error } = useStaffDetail(staffId);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !staff) {
    return (
      <PageContainer>
        <EmptyState
          icon={User}
          title="Staff not found"
          description="The staff member you're looking for doesn't exist."
          action={
            <Button onClick={() => router.push('/staff')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Staff
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PermissionGuard permission={PERMISSIONS.USERS_WRITE} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('editTitle')}
          description={`${t('editDescription')} - ${staff.user?.name}`}
          backHref="/staff"
        />
        <PageContent>
          <StaffForm staff={staff} branchId={branchId || ''} />
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
