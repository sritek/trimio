'use client';

import { AlertTriangle, Calendar, Clock, Mail, MapPin, Phone, User, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { getTagVariant } from '../../components/customer-columns';

import type { Customer, CustomerStats, CustomTag } from '@/types/customers';

// ============================================
// Helper
// ============================================

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const SYSTEM_TAGS = ['New', 'Regular', 'VIP', 'Inactive'];

// ============================================
// Types
// ============================================

interface OverviewTabProps {
  customer: Customer;
  stats?: CustomerStats;
  customTags?: CustomTag[];
  canWrite: boolean;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}

// ============================================
// Component
// ============================================

export function OverviewTab({
  customer,
  stats,
  customTags = [],
  canWrite,
  onAddTag,
  onRemoveTag,
}: OverviewTabProps) {
  const availableTags = [
    ...SYSTEM_TAGS.filter((t) => !customer.tags.includes(t)),
    ...customTags.map((t) => t.name).filter((t) => !customer.tags.includes(t)),
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={User} label="Name" value={customer.name} />
            <InfoRow icon={Phone} label="Phone" value={customer.phone} mono />
            {customer.email && <InfoRow icon={Mail} label="Email" value={customer.email} />}
            {customer.gender && (
              <InfoRow icon={User} label="Gender" value={customer.gender} capitalize />
            )}
            {customer.address && <InfoRow icon={MapPin} label="Address" value={customer.address} />}
          </CardContent>
        </Card>

        {/* Personal Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={Calendar}
              label="Date of Birth"
              value={formatDate(customer.dateOfBirth)}
            />
            <InfoRow
              icon={Calendar}
              label="Anniversary"
              value={formatDate(customer.anniversaryDate)}
            />
            <InfoRow icon={Clock} label="Customer Since" value={formatDate(customer.createdAt)} />
            <Separator />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Marketing Consent:</span>
              <Badge variant={customer.marketingConsent ? 'default' : 'secondary'}>
                {customer.marketingConsent ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Tags Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Tags</CardTitle>
              <CardDescription>Customer tags and segments</CardDescription>
            </div>
            {canWrite && availableTags.length > 0 && (
              <Button variant="outline" size="sm" onClick={onAddTag}>
                Add Tag
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {customer.tags.map((tag) => (
                <Badge key={tag} variant={getTagVariant(tag)} className="gap-1">
                  {tag}
                  {canWrite && !SYSTEM_TAGS.includes(tag) && (
                    <button
                      onClick={() => onRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {customer.tags.length === 0 && (
                <span className="text-sm text-muted-foreground">No tags assigned</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Allergies Card */}
        {customer.allergies && customer.allergies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Allergies & Sensitivities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {customer.allergies.map((allergy) => (
                  <Badge
                    key={allergy}
                    variant="outline"
                    className="border-amber-500 bg-destructive text-white"
                  >
                    {allergy}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Spend" value={formatCurrency(stats.totalSpend)} />
          <StatCard label="Total Visits" value={stats.visitCount.toString()} />
          <StatCard label="Avg. Ticket" value={formatCurrency(stats.avgTicketSize)} />
          <StatCard label="No-Shows" value={customer.noShowCount.toString()} />
        </div>
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}

function InfoRow({ icon: Icon, label, value, mono, capitalize }: InfoRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className={`${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
