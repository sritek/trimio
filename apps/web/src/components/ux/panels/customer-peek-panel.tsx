'use client';

/**
 * Customer Peek Panel
 * Based on: .kiro/specs/ux-consolidation-slideover/design.md
 * Requirements: 6.2, 6.3, 6.4
 *
 * SlideOver panel for quick customer profile access.
 * Displays customer info, tabs for history, and quick actions.
 */

import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Gift,
  Wallet,
  MessageSquare,
  Plus,
  AlertCircle,
  Star,
  Tag,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useClosePanel, useOpenPanel } from '@/components/ux/slide-over';
import {
  useCustomer,
  useCustomerAppointments,
  useCustomerInvoices,
} from '@/hooks/queries/use-customers';
import { useAuthStore } from '@/stores/auth-store';
import { maskPhoneNumber, shouldMaskPhoneForRole } from '@/lib/phone-masking';

interface CustomerPeekPanelProps {
  customerId: string;
}

export function CustomerPeekPanel({ customerId }: CustomerPeekPanelProps) {
  const closePanel = useClosePanel();
  const { openNewAppointment } = useOpenPanel();
  const { user } = useAuthStore();
  const shouldMask = user?.role ? shouldMaskPhoneForRole(user.role) : false;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: customer, isLoading, error } = useCustomer(customerId);
  const { data: appointmentsData } = useCustomerAppointments(customerId);
  const { data: invoicesData } = useCustomerInvoices(customerId);

  // Handle book appointment
  const handleBookAppointment = useCallback(() => {
    openNewAppointment({ customerId });
  }, [customerId, openNewAppointment]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load customer</h3>
        <p className="text-muted-foreground mb-4">{error?.message || 'Customer not found'}</p>
        <Button variant="outline" onClick={() => closePanel()}>
          Close
        </Button>
      </div>
    );
  }

  const appointments = appointmentsData?.data || [];
  const invoices = invoicesData?.data || [];

  return (
    <div className="flex flex-col h-full">
      {/* Customer Header */}
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>

          {/* Name and Contact */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold">{customer.name}</h3>
            <div className="flex flex-col gap-1 mt-1">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{shouldMask ? maskPhoneNumber(customer.phone) : customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{customer.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {customer.tags && customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customer.tags.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
              <Star className="h-4 w-4" />
              <span className="font-semibold">{customer.loyaltyPoints || 0}</span>
            </div>
            <span className="text-xs text-muted-foreground">Points</span>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Wallet className="h-4 w-4" />
              <span className="font-semibold">
                ₹{(customer.walletBalance || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Wallet</span>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold">{customer.visitCount || 0}</span>
            </div>
            <span className="text-xs text-muted-foreground">Visits</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-6 space-y-4 m-0">
            {customer.dateOfBirth && (
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground">Birthday</span>
                  <p>{format(parseISO(customer.dateOfBirth), 'MMMM d')}</p>
                </div>
              </div>
            )}

            {customer.preferences && (
              <div>
                <h4 className="font-medium mb-2">Preferences</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {typeof customer.preferences === 'string'
                    ? customer.preferences
                    : JSON.stringify(customer.preferences)}
                </p>
              </div>
            )}

            {customer.allergies && customer.allergies.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-red-600">Allergies</h4>
                <div className="flex flex-wrap gap-2">
                  {customer.allergies.map((allergy: string, index: number) => (
                    <Badge key={index} variant="destructive">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {customer.lastVisitDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground">Last Visit</span>
                  <p>{format(parseISO(customer.lastVisitDate), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="p-6 space-y-3 m-0">
            {appointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No appointments yet</p>
            ) : (
              appointments.slice(0, 10).map((apt: any) => (
                <div
                  key={apt.id}
                  className="flex justify-between items-center p-3 bg-muted/50 rounded-md"
                >
                  <div>
                    <p className="font-medium">
                      {apt.services?.map((s: any) => s.name).join(', ') || 'Services'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(apt.scheduledDate), 'MMM d, yyyy')} at {apt.scheduledTime}
                    </p>
                  </div>
                  <Badge variant={apt.status === 'completed' ? 'secondary' : 'default'}>
                    {apt.status}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="p-6 space-y-3 m-0">
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No invoices yet</p>
            ) : (
              invoices.slice(0, 10).map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex justify-between items-center p-3 bg-muted/50 rounded-md"
                >
                  <div>
                    <p className="font-medium">#{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(invoice.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ₹{invoice.grandTotal?.toLocaleString('en-IN') || 0}
                    </p>
                    <Badge variant={invoice.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>
                      {invoice.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="p-6 m-0">
            {customer.notes ? (
              <p className="text-sm bg-muted/50 p-3 rounded-md">{customer.notes}</p>
            ) : (
              <p className="text-center text-muted-foreground py-8">No notes added</p>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Action Buttons */}
      <div className="border-t p-4 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleBookAppointment}>
          <Calendar className="h-4 w-4 mr-2" />
          Book Appointment
        </Button>
        <Button variant="outline" size="icon">
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
