'use client';

/**
 * Customer Profile Panel Component
 * Enhanced customer profile with tabs and quick actions
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MessageSquare, Tag, Gift, Phone, Mail, User, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOpenPanel } from '@/components/ux/slide-over';
import { api } from '@/lib/api/client';

interface CustomerProfilePanelProps {
  customerId: string;
}

interface CustomerDetails {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  loyaltyPoints: number;
  walletBalance: number;
  tags: string[];
  notes?: string;
  noShowCount: number;
  bookingStatus: string;
  createdAt: string;
}

interface CustomerAppointment {
  id: string;
  startTime: string;
  status: string;
  services: Array<{ name: string; price: number }>;
  stylist?: { name: string };
}

interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface CustomerMembership {
  id: string;
  plan: { name: string };
  status: string;
  startDate: string;
  endDate: string;
  usageStats?: { used: number; total: number };
}

export function CustomerProfilePanel({ customerId }: CustomerProfilePanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const { openNewAppointment } = useOpenPanel();

  // Fetch customer details
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await api.get<{ data: CustomerDetails }>(`/customers/${customerId}`);
      return response.data;
    },
  });

  // Fetch customer appointments
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['customer-appointments', customerId],
    queryFn: async () => {
      const response = await api.get<{ data: CustomerAppointment[] }>(
        `/customers/${customerId}/appointments?limit=10`
      );
      return response.data;
    },
    enabled: activeTab === 'appointments',
  });

  // Fetch customer invoices
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['customer-invoices', customerId],
    queryFn: async () => {
      const response = await api.get<{ data: CustomerInvoice[] }>(
        `/customers/${customerId}/invoices?limit=10`
      );
      return response.data;
    },
    enabled: activeTab === 'invoices',
  });

  // Fetch customer memberships
  const { data: memberships, isLoading: isLoadingMemberships } = useQuery({
    queryKey: ['customer-memberships', customerId],
    queryFn: async () => {
      const response = await api.get<{ data: CustomerMembership[] }>(
        `/customers/${customerId}/memberships`
      );
      return response.data;
    },
    enabled: activeTab === 'memberships',
  });

  // Quick action: Book appointment
  const handleBookAppointment = useCallback(() => {
    openNewAppointment({ customerId });
  }, [customerId, openNewAppointment]);

  // Quick action: Top up wallet
  const handleTopUpWallet = useCallback(() => {
    // TODO: Implement wallet top-up panel
    console.log('Top up wallet for customer:', customerId);
  }, [customerId]);

  // Quick action: Redeem points
  const handleRedeemPoints = useCallback(() => {
    // TODO: Implement redeem points panel
    console.log('Redeem points for customer:', customerId);
  }, [customerId]);

  // Quick action: Send message
  const handleSendMessage = useCallback(() => {
    // TODO: Implement send message panel
    console.log('Send message to customer:', customerId);
  }, [customerId]);

  if (isLoadingCustomer) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Customer header */}
      <div className="p-4 border-b">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{customer.name}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </span>
              )}
            </div>
            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Loyalty Points</p>
                <p className="text-lg font-semibold">{customer.loyaltyPoints.toLocaleString()}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRedeemPoints}>
                <Gift className="h-4 w-4" />
              </Button>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Wallet Balance</p>
                <p className="text-lg font-semibold">₹{customer.walletBalance.toLocaleString()}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleTopUpWallet}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-4">
          <Button className="flex-1" onClick={handleBookAppointment}>
            <Calendar className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
          <Button variant="outline" onClick={handleSendMessage}>
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-4 pt-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          {/* Details tab */}
          <TabsContent value="details" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender</span>
                  <span>{customer.gender || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span>
                    {customer.dateOfBirth
                      ? new Date(customer.dateOfBirth).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Since</span>
                  <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No-Show Count</span>
                  <span className={customer.noShowCount > 0 ? 'text-red-500' : ''}>
                    {customer.noShowCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Status</span>
                  <Badge
                    variant={customer.bookingStatus === 'normal' ? 'secondary' : 'destructive'}
                  >
                    {customer.bookingStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Tags</CardTitle>
                <Button variant="ghost" size="sm">
                  <Tag className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {customer.tags.length > 0 ? (
                    customer.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments tab */}
          <TabsContent value="appointments" className="p-4">
            {isLoadingAppointments ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-2">
                {appointments.map((apt) => (
                  <Card key={apt.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{apt.services.map((s) => s.name).join(', ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(apt.startTime).toLocaleString()} • {apt.stylist?.name || 'Any'}
                        </p>
                      </div>
                      <Badge variant="secondary">{apt.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No appointments found</p>
            )}
          </TabsContent>

          {/* Invoices tab */}
          <TabsContent value="invoices" className="p-4">
            {isLoadingInvoices ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <Card key={inv.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{inv.totalAmount.toLocaleString()}</p>
                        <Badge variant="secondary">{inv.status}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No invoices found</p>
            )}
          </TabsContent>

          {/* Memberships tab */}
          <TabsContent value="memberships" className="p-4">
            {isLoadingMemberships ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
              </div>
            ) : memberships && memberships.length > 0 ? (
              <div className="space-y-2">
                {memberships.map((mem) => (
                  <Card key={mem.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{mem.plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(mem.startDate).toLocaleDateString()} -{' '}
                          {new Date(mem.endDate).toLocaleDateString()}
                        </p>
                        {mem.usageStats && (
                          <p className="text-xs text-muted-foreground">
                            Used: {mem.usageStats.used}/{mem.usageStats.total}
                          </p>
                        )}
                      </div>
                      <Badge variant={mem.status === 'active' ? 'default' : 'secondary'}>
                        {mem.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No memberships found</p>
            )}
          </TabsContent>

          {/* Notes tab */}
          <TabsContent value="notes" className="p-4">
            <Card>
              <CardContent className="pt-4">
                {customer.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
