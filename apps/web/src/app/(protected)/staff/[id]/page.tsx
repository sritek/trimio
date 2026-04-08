'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Clock,
  CreditCard,
  Edit,
  Mail,
  MapPin,
  Phone,
  User,
  Wallet,
} from 'lucide-react';

import { PERMISSIONS } from '@trimio/shared';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  EmptyState,
} from '@/components/common';
import {
  useStaffDetail,
  useCommissionSummary,
  useAttendanceSummary,
  useStylistBreaks,
  useCreateStylistBreak,
  useDeleteStylistBreak,
} from '@/hooks/queries/use-staff';
import { formatCurrency, formatDate } from '@/lib/format';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { StylistBreaksEditor, type StylistBreak } from '@/components/common';
import { toast } from 'sonner';

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');

  const staffId = params.id as string;
  const { data: staff, isLoading, error } = useStaffDetail(staffId);

  // Get current month date range for summaries
  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: commissionSummary } = useCommissionSummary(staffId, startDate, endDate);
  const { data: attendanceSummary } = useAttendanceSummary(staffId, startDate, endDate);

  // Get staff's primary branch ID for creating breaks
  const staffPrimaryBranchId = staff?.user?.branchAssignments?.find(
    (b: { isPrimary: boolean }) => b.isPrimary
  )?.branchId;

  // Breaks data for stylists (not branch-specific for listing)
  const { data: breaksData } = useStylistBreaks(staffId);
  const createBreak = useCreateStylistBreak();
  const deleteBreak = useDeleteStylistBreak();

  // Convert API breaks to editor format
  const breaks: StylistBreak[] = (breaksData || []).map((b) => ({
    id: b.id,
    name: b.name,
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
  }));

  const handleAddBreak = async (breakData: Omit<StylistBreak, 'id'>) => {
    if (!staffPrimaryBranchId) {
      toast.error('Staff member has no branch assigned');
      return;
    }

    try {
      await createBreak.mutateAsync({
        userId: staffId,
        branchId: staffPrimaryBranchId,
        name: breakData.name,
        dayOfWeek: breakData.dayOfWeek,
        startTime: breakData.startTime,
        endTime: breakData.endTime,
      });
      toast.success('Break added successfully');
    } catch {
      toast.error('Failed to add break');
      throw new Error('Failed to add break');
    }
  };

  const handleRemoveBreak = async (breakId: string) => {
    try {
      await deleteBreak.mutateAsync({ userId: staffId, breakId });
      toast.success('Break removed successfully');
    } catch {
      toast.error('Failed to remove break');
      throw new Error('Failed to remove break');
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
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
          title={t('notFound')}
          description={t('notFoundDesc')}
          action={
            <Button onClick={() => router.push('/staff')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToList')}
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const staffUser = staff.user;
  const primaryBranchAssignment = staffUser?.branchAssignments?.find(
    (b: { isPrimary: boolean }) => b.isPrimary
  );
  const primaryBranch = primaryBranchAssignment?.branch;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'branch_manager':
        return 'default';
      case 'stylist':
        return 'secondary';
      case 'receptionist':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <PermissionGuard permission={PERMISSIONS.USERS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={staffUser?.name || 'Staff Member'}
          description={staff.designation || staff.employeeCode || 'Staff Profile'}
          backHref="/staff"
          actions={
            <Button asChild>
              <Link href={`/staff/${staffId}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                {tCommon('actions.edit')}
              </Link>
            </Button>
          }
        />

        <PageContent>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.attendance')}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {attendanceSummary?.presentDays || 0}/{attendanceSummary?.totalDays || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t('stats.daysThisMonth')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.commissions')}</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(commissionSummary?.totalEarned || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{t('stats.thisMonth')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.baseSalary')}</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(staff.baseSalary)}</div>
                <p className="text-xs text-muted-foreground capitalize">{staff.salaryType}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">{t('tabs.profile')}</TabsTrigger>
              <TabsTrigger value="employment">{t('tabs.employment')}</TabsTrigger>
              {staffUser?.role === 'stylist' && (
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              )}
              <TabsTrigger value="salary">{t('tabs.salary')}</TabsTrigger>
              <TabsTrigger value="documents">{t('tabs.documents')}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('sections.basicInfo')}</CardTitle>
                  <CardDescription>{t('sections.basicInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('fields.name')}</p>
                        <p className="font-medium">{staffUser?.name || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('fields.phone')}</p>
                        <p className="font-medium">{staffUser?.phone || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('fields.email')}</p>
                        <p className="font-medium">{staffUser?.email || '-'}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.role')}</p>
                      <Badge variant={getRoleBadgeVariant(staffUser?.role || '')} className="mt-1">
                        {t(`roles.${staffUser?.role}` as any)}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.gender')}</p>
                      <p className="font-medium capitalize">{staffUser?.gender || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.status')}</p>
                      <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                        {staff.isActive ? tCommon('status.active') : tCommon('status.inactive')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('sections.personalDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.dateOfBirth')}</p>
                      <p className="font-medium">
                        {staff.dateOfBirth ? formatDate(staff.dateOfBirth) : '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.bloodGroup')}</p>
                      <p className="font-medium">{staff.bloodGroup || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('fields.emergencyContact')}
                      </p>
                      <p className="font-medium">
                        {staff.emergencyContactName
                          ? `${staff.emergencyContactName} (${staff.emergencyContactPhone})`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.address')}</p>
                      <p className="font-medium">
                        {[staff.addressLine1, staff.city, staff.state, staff.pincode]
                          .filter(Boolean)
                          .join(', ') || '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('sections.employmentDetails')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.employeeCode')}</p>
                      <p className="font-medium">{staff.employeeCode || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.designation')}</p>
                      <p className="font-medium">{staff.designation || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.department')}</p>
                      <p className="font-medium">{staff.department || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.employmentType')}</p>
                      <p className="font-medium capitalize">
                        {staff.employmentType?.replace('_', ' ') || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.dateOfJoining')}</p>
                      <p className="font-medium">{formatDate(staff.dateOfJoining)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.skillLevel')}</p>
                      <p className="font-medium capitalize">{staff.skillLevel || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.primaryBranch')}</p>
                      <p className="font-medium">{primaryBranch?.name || '-'}</p>
                    </div>

                    {staff.specializations && staff.specializations.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          {t('fields.specializations')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {staff.specializations.map((spec) => (
                            <Badge key={spec} variant="outline">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedule Tab - Only for stylists */}
            {staffUser?.role === 'stylist' && (
              <TabsContent value="schedule" className="space-y-4">
                <StylistBreaksEditor
                  breaks={breaks}
                  onAdd={handleAddBreak}
                  onRemove={handleRemoveBreak}
                  isAdding={createBreak.isPending}
                  isRemoving={deleteBreak.isPending}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Working Hours</CardTitle>
                    <CardDescription>
                      Working hours are inherited from the branch settings. Contact your manager to
                      update branch working hours.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="salary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('sections.salaryDetails')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.salaryType')}</p>
                      <p className="font-medium capitalize">{staff.salaryType}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.baseSalary')}</p>
                      <p className="font-medium">{formatCurrency(staff.baseSalary)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('fields.commissionEnabled')}
                      </p>
                      <Badge variant={staff.commissionEnabled ? 'default' : 'secondary'}>
                        {staff.commissionEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>

                    {staff.commissionEnabled && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('fields.commissionType')}
                          </p>
                          <p className="font-medium capitalize">
                            {staff.defaultCommissionType || '-'}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('fields.commissionRate')}
                          </p>
                          <p className="font-medium">
                            {staff.defaultCommissionRate
                              ? staff.defaultCommissionType === 'percentage'
                                ? `${staff.defaultCommissionRate}%`
                                : formatCurrency(staff.defaultCommissionRate)
                              : '-'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('sections.bankDetails')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.bankName')}</p>
                      <p className="font-medium">{staff.bankName || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.accountNumber')}</p>
                      <p className="font-medium">{staff.bankAccountNumber || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.ifscCode')}</p>
                      <p className="font-medium">{staff.bankIfsc || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('sections.idDocuments')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.aadharNumber')}</p>
                      <p className="font-medium">{staff.aadharNumber || '-'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">{t('fields.panNumber')}</p>
                      <p className="font-medium">{staff.panNumber || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
