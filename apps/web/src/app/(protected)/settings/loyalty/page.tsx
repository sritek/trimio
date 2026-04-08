'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star } from 'lucide-react';

import { PERMISSIONS } from '@trimio/shared';

import { useLoyaltyConfig, useUpdateLoyaltyConfig } from '@/hooks/queries/use-customers';
import { usePermissions } from '@/hooks/use-permissions';

import {
  AccessDenied,
  FormSection,
  LoadingSpinner,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const loyaltyConfigSchema = z.object({
  pointsPerUnit: z.coerce.number().min(0, 'Must be 0 or greater'),
  redemptionValuePerPoint: z.coerce.number().min(0, 'Must be 0 or greater'),
  expiryDays: z.coerce.number().min(0).nullable(),
  isEnabled: z.boolean(),
});

type LoyaltyConfigValues = z.infer<typeof loyaltyConfigSchema>;

export default function LoyaltySettingsPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.CUSTOMERS_MANAGE);

  const { data: config, isLoading } = useLoyaltyConfig();
  const updateConfig = useUpdateLoyaltyConfig();

  const form = useForm<LoyaltyConfigValues>({
    resolver: zodResolver(loyaltyConfigSchema),
    defaultValues: {
      pointsPerUnit: 1,
      redemptionValuePerPoint: 0.25,
      expiryDays: 365,
      isEnabled: true,
    },
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      form.reset({
        pointsPerUnit: config.pointsPerUnit,
        redemptionValuePerPoint: config.redemptionValuePerPoint,
        expiryDays: config.expiryDays,
        isEnabled: config.isEnabled,
      });
    }
  }, [config, form]);

  const onSubmit = async (data: LoyaltyConfigValues) => {
    await updateConfig.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  return (
    <PermissionGuard permission={PERMISSIONS.CUSTOMERS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title="Loyalty Program"
          description="Configure your customer loyalty program settings"
        />

        <PageContent>
          <div className="max-w-2xl">
            {/* Current Status Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Program Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{config?.isEnabled ? 'Active' : 'Inactive'}</p>
                    <p className="text-sm text-muted-foreground">
                      {config?.isEnabled
                        ? 'Customers are earning and redeeming points'
                        : 'Loyalty program is currently disabled'}
                    </p>
                  </div>
                  <div
                    className={`h-3 w-3 rounded-full ${
                      config?.isEnabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuration Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
                <CardDescription>Set how customers earn and redeem loyalty points</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="isEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Loyalty Program</FormLabel>
                            <FormDescription>
                              Turn the loyalty program on or off for all customers
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!canManage}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormSection title="Earning Rules" description="How customers earn points">
                      <FormField
                        control={form.control}
                        name="pointsPerUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points per ₹100 spent</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                {...field}
                                disabled={!canManage}
                              />
                            </FormControl>
                            <FormDescription>
                              Number of points earned for every ₹100 spent
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FormSection>

                    <FormSection title="Redemption Rules" description="How customers use points">
                      <FormField
                        control={form.control}
                        name="redemptionValuePerPoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Value per Point (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                {...field}
                                disabled={!canManage}
                              />
                            </FormControl>
                            <FormDescription>
                              Rupee value of each loyalty point when redeemed
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FormSection>

                    <FormSection title="Expiry Settings" description="When points expire">
                      <FormField
                        control={form.control}
                        name="expiryDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points Expiry (days)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="Leave empty for no expiry"
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value ? parseInt(e.target.value, 10) : null
                                  )
                                }
                                disabled={!canManage}
                              />
                            </FormControl>
                            <FormDescription>
                              Number of days after which unused points expire. Leave empty for no
                              expiry.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FormSection>

                    {canManage && (
                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateConfig.isPending}>
                          {updateConfig.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Example Calculation */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Example</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    With current settings, a customer spending{' '}
                    <span className="font-medium text-foreground">₹1,000</span> will earn{' '}
                    <span className="font-medium text-foreground">
                      {(form.watch('pointsPerUnit') || 0) * 10} points
                    </span>
                  </p>
                  <p>
                    Those points can be redeemed for{' '}
                    <span className="font-medium text-foreground">
                      ₹
                      {(
                        (form.watch('pointsPerUnit') || 0) *
                        10 *
                        (form.watch('redemptionValuePerPoint') || 0)
                      ).toFixed(2)}
                    </span>{' '}
                    off their next purchase
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
