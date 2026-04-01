'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useCreateStaff, useUpdateStaff } from '@/hooks/queries/use-staff';
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
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { StaffProfile } from '@/types/staff';

const staffFormSchema = z.object({
  // User fields
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name is too long'),
  phone: z
    .string()
    .length(10, 'Phone number must be 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional()
    .or(z.literal('')),
  role: z.enum(['branch_manager', 'receptionist', 'stylist', 'accountant'], {
    required_error: 'Please select a role',
  }),
  gender: z.enum(['male', 'female', 'other']).optional(),

  // Employment fields
  employeeCode: z.string().min(1, 'Employee code is required').max(20, 'Employee code is too long'),
  dateOfJoining: z.date({ required_error: 'Date of joining is required' }),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern'], {
    required_error: 'Please select employment type',
  }),
  designation: z.string().max(100, 'Designation is too long').optional().or(z.literal('')),
  department: z.string().max(100, 'Department is too long').optional().or(z.literal('')),
  skillLevel: z.enum(['junior', 'senior', 'expert']).optional(),

  // Personal fields
  dateOfBirth: z.date().nullish(),
  bloodGroup: z.string().optional().or(z.literal('')),
  emergencyContactName: z.string().max(255, 'Name is too long').optional().or(z.literal('')),
  emergencyContactPhone: z
    .string()
    .regex(/^$|^[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .optional()
    .or(z.literal('')),
  addressLine1: z.string().max(500, 'Address is too long').optional().or(z.literal('')),
  city: z.string().max(100, 'City name is too long').optional().or(z.literal('')),
  state: z.string().max(100, 'State name is too long').optional().or(z.literal('')),
  pincode: z
    .string()
    .regex(/^$|^\d{6}$/, 'PIN code must be 6 digits')
    .optional()
    .or(z.literal('')),

  // Salary fields
  salaryType: z.enum(['monthly', 'daily', 'hourly'], {
    required_error: 'Please select salary type',
  }),
  baseSalary: z.coerce
    .number({ required_error: 'Base salary is required' })
    .positive('Base salary must be greater than 0'),
  commissionEnabled: z.boolean().default(false),
  defaultCommissionType: z.enum(['percentage', 'flat']).optional(),
  defaultCommissionRate: z.coerce.number().min(0, 'Commission rate must be positive').optional(),

  // Bank details
  bankName: z.string().max(100, 'Bank name is too long').optional().or(z.literal('')),
  bankAccountNumber: z
    .string()
    .regex(/^$|^\d{9,18}$/, 'Account number must be 9-18 digits')
    .optional()
    .or(z.literal('')),
  bankIfsc: z
    .string()
    .regex(/^$|^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format')
    .optional()
    .or(z.literal('')),

  // ID documents
  aadharNumber: z
    .string()
    .regex(/^$|^\d{12}$/, 'Aadhar must be 12 digits')
    .optional()
    .or(z.literal('')),
  panNumber: z
    .string()
    .regex(/^$|^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN format (e.g., ABCDE1234F)')
    .optional()
    .or(z.literal('')),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffFormProps {
  staff?: StaffProfile;
  branchId: string;
  onSuccess?: () => void;
}

export function StaffForm({ staff, branchId, onSuccess }: StaffFormProps) {
  const router = useRouter();
  const t = useTranslations('staff.form');
  const tCommon = useTranslations('common');
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const { handleError } = useErrorHandler();

  const isEditing = !!staff;

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: staff?.user?.name || '',
      phone: staff?.user?.phone || '',
      email: staff?.user?.email || '',
      password: '',
      role: (['branch_manager', 'receptionist', 'stylist', 'accountant'].includes(
        staff?.user?.role || ''
      )
        ? staff?.user?.role
        : 'stylist') as StaffFormValues['role'],
      gender: (staff?.user?.gender as StaffFormValues['gender']) || undefined,
      employeeCode: staff?.employeeCode || '',
      dateOfJoining: staff?.dateOfJoining ? new Date(staff.dateOfJoining) : new Date(),
      employmentType: (staff?.employmentType as StaffFormValues['employmentType']) || 'full_time',
      designation: staff?.designation || '',
      department: staff?.department || '',
      skillLevel: (staff?.skillLevel as StaffFormValues['skillLevel']) || undefined,
      dateOfBirth: staff?.dateOfBirth ? new Date(staff.dateOfBirth) : undefined,
      bloodGroup: staff?.bloodGroup || '',
      emergencyContactName: staff?.emergencyContactName || '',
      emergencyContactPhone: staff?.emergencyContactPhone || '',
      addressLine1: staff?.addressLine1 || '',
      city: staff?.city || '',
      state: staff?.state || '',
      pincode: staff?.pincode || '',
      salaryType: (['monthly', 'daily', 'hourly'].includes(staff?.salaryType || '')
        ? staff?.salaryType
        : 'monthly') as StaffFormValues['salaryType'],
      baseSalary: staff?.baseSalary !== undefined ? staff.baseSalary : ('' as unknown as number),
      commissionEnabled: staff?.commissionEnabled || false,
      defaultCommissionType:
        (staff?.defaultCommissionType as StaffFormValues['defaultCommissionType']) || undefined,
      defaultCommissionRate: staff?.defaultCommissionRate || 0,
      bankName: staff?.bankName || '',
      bankAccountNumber: staff?.bankAccountNumber || '',
      bankIfsc: staff?.bankIfsc || '',
      aadharNumber: staff?.aadharNumber || '',
      panNumber: staff?.panNumber || '',
    },
  });

  const commissionEnabled = form.watch('commissionEnabled');

  const onSubmit = async (data: StaffFormValues) => {
    console.log('Form submitted with data:', data);
    try {
      const dateOfJoining = data.dateOfJoining.toISOString().split('T')[0];
      const dateOfBirth = data.dateOfBirth?.toISOString().split('T')[0];

      if (isEditing && staff) {
        await updateStaff.mutateAsync({
          id: staff.userId,
          name: data.name,
          role: data.role,
          email: data.email || undefined,
          gender: data.gender || undefined,
          employeeCode: data.employeeCode || undefined,
          dateOfJoining,
          employmentType: data.employmentType,
          designation: data.designation || undefined,
          department: data.department || undefined,
          skillLevel: data.skillLevel || undefined,
          dateOfBirth: dateOfBirth || undefined,
          bloodGroup: data.bloodGroup || undefined,
          emergencyContactName: data.emergencyContactName || undefined,
          emergencyContactPhone: data.emergencyContactPhone || undefined,
          addressLine1: data.addressLine1 || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          pincode: data.pincode || undefined,
          salaryType: data.salaryType,
          baseSalary: data.baseSalary,
          commissionEnabled: data.commissionEnabled,
          defaultCommissionType: data.commissionEnabled ? data.defaultCommissionType : undefined,
          defaultCommissionRate: data.commissionEnabled ? data.defaultCommissionRate : undefined,
          bankName: data.bankName || undefined,
          bankAccountNumber: data.bankAccountNumber || undefined,
          bankIfsc: data.bankIfsc || undefined,
          aadharNumber: data.aadharNumber || undefined,
          panNumber: data.panNumber || undefined,
        });
        toast.success('Staff member updated successfully');
      } else {
        if (!data.password) {
          form.setError('password', { message: 'Password is required for new staff' });
          return;
        }
        await createStaff.mutateAsync({
          ...data,
          password: data.password,
          dateOfJoining,
          dateOfBirth: dateOfBirth || undefined,
          email: data.email || undefined,
          gender: data.gender || undefined,
          employeeCode: data.employeeCode || undefined,
          designation: data.designation || undefined,
          department: data.department || undefined,
          skillLevel: data.skillLevel || undefined,
          bloodGroup: data.bloodGroup || undefined,
          emergencyContactName: data.emergencyContactName || undefined,
          emergencyContactPhone: data.emergencyContactPhone || undefined,
          addressLine1: data.addressLine1 || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          pincode: data.pincode || undefined,
          defaultCommissionType: data.commissionEnabled ? data.defaultCommissionType : undefined,
          defaultCommissionRate: data.commissionEnabled ? data.defaultCommissionRate : undefined,
          bankName: data.bankName || undefined,
          bankAccountNumber: data.bankAccountNumber || undefined,
          bankIfsc: data.bankIfsc || undefined,
          aadharNumber: data.aadharNumber || undefined,
          panNumber: data.panNumber || undefined,
          branchAssignments: [{ branchId, isPrimary: true }],
        });
        toast.success('Staff member created successfully');
      }
      onSuccess?.();
      router.push('/staff');
    } catch (error) {
      handleError(error, {
        customMessage: isEditing
          ? 'Failed to update staff member. Please try again.'
          : 'Failed to create staff member. Please try again.',
      });
    }
  };

  const isPending = createStaff.isPending || updateStaff.isPending;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error('Form validation errors:', errors);
          // Show first error as toast
          const firstError = Object.values(errors)[0];
          if (firstError?.message) {
            toast.error(firstError.message as string);
          }
        })}
        className="space-y-6"
      >
        {/* Card 1: Account & Employment */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Row 1: Name, Phone, Email, Gender */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('name')} *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phone')} *</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isEditing}
                        showCountryCode
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription className="text-xs">Cannot be changed</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
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
                    <FormLabel>{t('gender')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Password (new only), Role, Employment Type, Joining Date */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('password')} *</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Min 8 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('role')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="branch_manager">Branch Manager</SelectItem>
                        <SelectItem value="receptionist">Receptionist</SelectItem>
                        <SelectItem value="stylist">Stylist</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('employmentType')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfJoining"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dateOfJoining')} *</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select date"
                        format="dd/MM/yyyy"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('employeeCode')} *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Row 3: Employee Code (new only), Designation, Department, Skill Level */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('employeeCode')} *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('designation')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Senior Stylist" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('department')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Hair Care" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skillLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('skillLevel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Personal & Address */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Row 1: DOB, Blood Group, Emergency Contact */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dateOfBirth')}</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        placeholder="Select date"
                        format="dd/MM/yyyy"
                        captionLayout="dropdown"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bloodGroup')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('emergencyContactName')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('emergencyContactPhone')}</FormLabel>
                    <FormControl>
                      <PhoneInput value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Address */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>{t('address')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('city')}</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('state')}</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Compensation & Documents */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Row 1: Salary & Commission */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="salaryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('salaryType')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('baseSalary')} *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commissionEnabled"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2 pt-2">
                    <div className="flex flex-row items-center space-x-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Enable Default Commission</FormLabel>
                    </div>
                    <FormDescription className="text-xs ml-7">
                      Used when a service doesn&apos;t have its own commission rate defined
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* Commission fields (conditional) */}
            {commissionEnabled && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-muted/50 rounded-lg">
                <FormField
                  control={form.control}
                  name="defaultCommissionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Commission Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="flat">Flat Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultCommissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Commission Rate</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="10" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {form.watch('defaultCommissionType') === 'percentage'
                          ? '% of service price'
                          : '₹ per service'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="lg:col-span-2 flex items-center">
                  <p className="text-xs text-muted-foreground">
                    💡 Service-specific commission rates take priority over this default rate
                  </p>
                </div>
              </div>
            )}

            {/* Row 2: Bank & ID Documents */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bankName')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Bank name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bankAccountNumber')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Account number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankIfsc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bankIfsc')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SBIN0001234"
                        maxLength={11}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">11 character code</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pincode')}</FormLabel>
                    <FormControl>
                      <Input placeholder="400001" maxLength={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: ID Documents */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="aadharNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('aadharNumber')}</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789012" maxLength={12} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">12 digit number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('panNumber')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">10 character PAN</FormDescription>
                    <FormMessage />
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
                : t('createStaff')}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
