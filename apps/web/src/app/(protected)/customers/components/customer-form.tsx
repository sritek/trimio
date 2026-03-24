'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useCreateCustomer, useUpdateCustomer } from '@/hooks/queries/use-customers';
import { useErrorHandler } from '@/hooks/use-error-handler';

import { DatePicker, FormActions, PhoneInput } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Customer } from '@/types/customers';

const customerFormSchema = z.object({
  phone: z
    .string()
    .length(10, 'Phone number must be 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name is too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.date().nullish(),
  anniversaryDate: z.date().nullish(),
  address: z.string().max(500, 'Address is too long').optional().or(z.literal('')),
  allergies: z.string().max(500, 'Allergies text is too long').optional(),
  marketingConsent: z.boolean().default(true),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: () => void;
}

export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const router = useRouter();
  const t = useTranslations('customers.form');
  const tCommon = useTranslations('common');
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { handleError } = useErrorHandler();

  const isEditing = !!customer;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      phone: customer?.phone || '',
      name: customer?.name || '',
      email: customer?.email || '',
      gender: customer?.gender || undefined,
      dateOfBirth: customer?.dateOfBirth ? new Date(customer.dateOfBirth) : undefined,
      anniversaryDate: customer?.anniversaryDate ? new Date(customer.anniversaryDate) : undefined,
      address: customer?.address || '',
      allergies: customer?.allergies?.join(', ') || '',
      marketingConsent: customer?.marketingConsent ?? true,
    },
  });

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      const payload = {
        ...data,
        email: data.email || null,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.toISOString().split('T')[0] : null,
        anniversaryDate: data.anniversaryDate
          ? data.anniversaryDate.toISOString().split('T')[0]
          : null,
        address: data.address || null,
        allergies: data.allergies
          ? data.allergies
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean)
          : [],
      };

      if (isEditing && customer) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { phone, ...updatePayload } = payload;
        await updateCustomer.mutateAsync({ id: customer.id, data: updatePayload });
        toast.success('Customer updated successfully');
      } else {
        await createCustomer.mutateAsync(payload);
        toast.success('Customer created successfully');
      }
      onSuccess?.();
      router.push('/customers');
    } catch (error) {
      handleError(error, {
        customMessage: isEditing
          ? 'Failed to update customer. Please try again.'
          : 'Failed to create customer. Please try again.',
      });
    }
  };

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Row 1: Phone, Name, Email, Gender */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phone.label')} *</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isEditing}
                        showCountryCode
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {isEditing ? t('phone.cannotChange') : t('phone.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('name.label')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('name.placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email.label')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('email.placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('gender.label')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('gender.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">{t('gender.male')}</SelectItem>
                        <SelectItem value="female">{t('gender.female')}</SelectItem>
                        <SelectItem value="other">{t('gender.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: DOB, Anniversary, Address */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dateOfBirth.label')}</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        placeholder={t('dateOfBirth.placeholder')}
                        format="dd/MM/yyyy"
                        captionLayout="dropdown"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t('dateOfBirth.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anniversaryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('anniversary.label')}</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        placeholder={t('anniversary.placeholder')}
                        format="dd/MM/yyyy"
                        captionLayout="dropdown"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t('anniversary.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>{t('address.label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('address.placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Allergies and Marketing Consent */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('allergies.label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('allergies.placeholder')} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t('allergies.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketingConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">{t('marketingConsent.label')}</FormLabel>
                      <FormDescription className="text-xs">
                        {t('marketingConsent.description')}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <FormActions>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tCommon('actions.cancel')}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? tCommon('status.saving')
                : tCommon('status.creating')
              : isEditing
                ? t('saveChanges')
                : t('createCustomer')}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
