/**
 * Staff List Page
 *
 * Displays all staff members with filtering and search capabilities.
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader, PageContent, PageContainer, SearchInput } from '@/components/common';
import { useStaffList } from '@/hooks/queries/use-staff';

import { StaffTable } from './components/staff-table';

const ROLES = ['branch_manager', 'receptionist', 'stylist', 'accountant'] as const;
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern'] as const;

export default function StaffPage() {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, error } = useStaffList({
    page,
    limit,
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    employmentType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const staff = data?.data ?? [];
  const meta = data?.meta;

  const hasFilters =
    !!search || roleFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all';

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild>
            <Link href="/staff/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('addStaff')}
            </Link>
          </Button>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center flex-shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('searchPlaceholder')}
            className="flex-1"
          />

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('filters.allRoles')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allRoles')}</SelectItem>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('filters.allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
              {EMPLOYMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`employmentTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('filters.allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
              <SelectItem value="active">{tCommon('status.active')}</SelectItem>
              <SelectItem value="inactive">{tCommon('status.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <StaffTable
          data={staff}
          meta={meta}
          isLoading={isLoading}
          error={error}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          hasFilters={hasFilters}
        />
      </PageContent>
    </PageContainer>
  );
}
