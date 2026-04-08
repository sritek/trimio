'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, Phone, Plus, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PERMISSIONS } from '@trimio/shared';

import {
  useWalkInQueue,
  useAddToQueue,
  useCallCustomer,
  useStartServing,
  useCompleteQueueEntry,
  useMarkLeft,
} from '@/hooks/queries/use-appointments';
import { useServices } from '@/hooks/queries/use-services';
import { usePermissions } from '@/hooks/use-permissions';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useAuthStore } from '@/stores/auth-store';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  StatusBadge,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { WalkInQueueEntry } from '@/types/appointments';

const addToQueueSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerPhone: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, 'Select at least one service'),
  genderPreference: z.enum(['male', 'female', 'any']).optional(),
});

type AddToQueueFormData = z.infer<typeof addToQueueSchema>;

export default function WalkInQueuePage() {
  const t = useTranslations('walkIn');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const { user } = useAuthStore();
  const { branchId } = useBranchContext();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: queueData } = useWalkInQueue({
    branchId: branchId || '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: servicesResult } = useServices({ isActive: true });
  const services = servicesResult?.data || [];

  const addToQueue = useAddToQueue();
  const callCustomer = useCallCustomer();
  const startServing = useStartServing();
  const completeQueueEntry = useCompleteQueueEntry();
  const markLeft = useMarkLeft();

  const form = useForm<AddToQueueFormData>({
    resolver: zodResolver(addToQueueSchema),
    defaultValues: {
      serviceIds: [],
      genderPreference: 'any',
    },
  });

  const onSubmit = async (data: AddToQueueFormData) => {
    if (!branchId) return;
    try {
      await addToQueue.mutateAsync({
        branchId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        serviceIds: data.serviceIds,
        genderPreference: data.genderPreference,
      });
      form.reset();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  };

  const handleCall = async (id: string) => {
    await callCustomer.mutateAsync(id);
  };

  const handleServe = async (id: string) => {
    // For simplicity, using first available stylist
    // In production, show a stylist selection dialog
    const stylistId = user?.id || '';
    await startServing.mutateAsync({ id, stylistId });
  };

  const handleComplete = async (id: string) => {
    await completeQueueEntry.mutateAsync(id);
  };

  const handleLeft = async (id: string) => {
    await markLeft.mutateAsync(id);
  };

  const waitingQueue = queueData?.queue.filter((e) => e.status === 'waiting') || [];
  const calledQueue = queueData?.queue.filter((e) => e.status === 'called') || [];
  const servingQueue = queueData?.queue.filter((e) => e.status === 'serving') || [];

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            canWrite && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addToQueue')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('addToQueue')}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.name')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.phone')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="serviceIds"
                        render={() => (
                          <FormItem>
                            <FormLabel>{t('form.services')}</FormLabel>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {services.map((service: any) => (
                                <FormField
                                  key={service.id}
                                  control={form.control}
                                  name="serviceIds"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(service.id)}
                                          onCheckedChange={(checked) => {
                                            const newValue = checked
                                              ? [...field.value, service.id]
                                              : field.value.filter((id) => id !== service.id);
                                            field.onChange(newValue);
                                          }}
                                        />
                                      </FormControl>
                                      <span className="text-sm">{service.name}</span>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="genderPreference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.stylistPreference')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="any">{t('form.any')}</SelectItem>
                                <SelectItem value="male">{t('form.male')}</SelectItem>
                                <SelectItem value="female">{t('form.female')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={addToQueue.isPending}>
                        {addToQueue.isPending ? t('form.adding') : t('form.add')}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )
          }
        />

        <PageContent>
          {/* Stats */}
          {queueData?.stats && (
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="text-2xl font-bold">{queueData.stats.waiting}</div>
                      <div className="text-sm text-muted-foreground">{t('stats.waiting')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{queueData.stats.serving}</div>
                      <div className="text-sm text-muted-foreground">{t('stats.serving')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">
                        {queueData.stats.averageWaitTime} min
                      </div>
                      <div className="text-sm text-muted-foreground">{t('stats.avgWait')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-2xl font-bold">{queueData.stats.completed}</div>
                      <div className="text-sm text-muted-foreground">{t('stats.completed')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Currently Serving */}
          {servingQueue.length > 0 && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">{t('currentlyServing')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {servingQueue.map((entry) => (
                    <QueueEntryCard
                      key={entry.id}
                      entry={entry}
                      canWrite={canWrite}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Called */}
          {calledQueue.length > 0 && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">{t('called')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {calledQueue.map((entry) => (
                    <QueueEntryCard
                      key={entry.id}
                      entry={entry}
                      canWrite={canWrite}
                      onServe={handleServe}
                      onLeft={handleLeft}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Waiting Queue */}
          <Card>
            <CardHeader>
              <CardTitle>{t('waitingQueue')}</CardTitle>
            </CardHeader>
            <CardContent>
              {waitingQueue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('noWaiting')}</div>
              ) : (
                <div className="space-y-2">
                  {waitingQueue.map((entry) => (
                    <QueueEntryCard
                      key={entry.id}
                      entry={entry}
                      canWrite={canWrite}
                      onCall={handleCall}
                      onLeft={handleLeft}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}

interface QueueEntryCardProps {
  entry: WalkInQueueEntry;
  canWrite: boolean;
  onCall?: (id: string) => void;
  onServe?: (id: string) => void;
  onComplete?: (id: string) => void;
  onLeft?: (id: string) => void;
}

function QueueEntryCard({
  entry,
  canWrite,
  onCall,
  onServe,
  onComplete,
  onLeft,
}: QueueEntryCardProps) {
  const t = useTranslations('walkIn');

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-4">
        <div className="text-3xl font-bold text-primary">#{entry.tokenNumber}</div>
        <div>
          <div className="font-medium">{entry.customerName}</div>
          {entry.customerPhone && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {entry.customerPhone}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {t('waitTime')}: {entry.estimatedWaitMinutes} min
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={entry.status} label={entry.status} />
        {canWrite && (
          <div className="flex gap-1">
            {entry.status === 'waiting' && onCall && (
              <Button size="sm" onClick={() => onCall(entry.id)}>
                {t('actions.call')}
              </Button>
            )}
            {entry.status === 'called' && onServe && (
              <Button size="sm" onClick={() => onServe(entry.id)}>
                {t('actions.serve')}
              </Button>
            )}
            {entry.status === 'serving' && onComplete && (
              <Button size="sm" onClick={() => onComplete(entry.id)}>
                {t('actions.complete')}
              </Button>
            )}
            {(entry.status === 'waiting' || entry.status === 'called') && onLeft && (
              <Button size="sm" variant="outline" onClick={() => onLeft(entry.id)}>
                {t('actions.left')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
