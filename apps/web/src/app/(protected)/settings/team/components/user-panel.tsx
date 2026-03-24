'use client';

/**
 * User Panel
 * SlideOver panel for creating/editing users
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateUser, useUpdateUser, type User } from '@/hooks/queries/use-users';
import { useBranches } from '@/hooks/queries/use-branches';
import { useAuthStore } from '@/stores/auth-store';

const userFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['regional_manager', 'branch_manager', 'receptionist', 'stylist', 'accountant']),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  isActive: z.boolean().optional(),
  branchIds: z.array(z.string()).min(1, 'At least one branch is required'),
  primaryBranchId: z.string().min(1, 'Primary branch is required'),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserPanelProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

const roleOptions = [
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'stylist', label: 'Stylist' },
  { value: 'accountant', label: 'Accountant' },
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function UserPanel({ user, open, onClose }: UserPanelProps) {
  const authUser = useAuthStore((state) => state.user);
  const userBranchIds = authUser?.branchIds || [];
  const { data: branches } = useBranches(userBranchIds);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const isEditing = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      isEditing
        ? userFormSchema.omit({ password: true })
        : userFormSchema.extend({
            password: z.string().min(8, 'Password must be at least 8 characters'),
          })
    ),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'stylist',
      gender: null,
      isActive: true,
      branchIds: [],
      primaryBranchId: '',
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      const branchIds = user.branchAssignments.map((a) => a.branchId);
      const primaryBranch = user.branchAssignments.find((a) => a.isPrimary);
      form.reset({
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        role: user.role as any,
        gender: user.gender as any,
        isActive: user.isActive,
        branchIds,
        primaryBranchId: primaryBranch?.branchId || branchIds[0] || '',
      });
    } else {
      form.reset({
        name: '',
        phone: '',
        email: '',
        password: '',
        role: 'stylist',
        gender: null,
        isActive: true,
        branchIds: userBranchIds.length > 0 ? [userBranchIds[0]] : [],
        primaryBranchId: userBranchIds[0] || '',
      });
    }
  }, [user, form, userBranchIds]);

  const onSubmit = async (data: UserFormValues) => {
    try {
      const branchAssignments = data.branchIds.map((branchId) => ({
        branchId,
        isPrimary: branchId === data.primaryBranchId,
      }));

      if (isEditing && user) {
        await updateUser.mutateAsync({
          id: user.id,
          data: {
            name: data.name,
            email: data.email || null,
            role: data.role,
            gender: data.gender,
            isActive: data.isActive,
            branchAssignments,
          },
        });
        toast.success('User updated successfully');
      } else {
        await createUser.mutateAsync({
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          password: data.password!,
          role: data.role,
          gender: data.gender,
          branchAssignments,
        });
        toast.success('User created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} user`);
    }
  };

  const selectedBranchIds = form.watch('branchIds');

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit User' : 'Add User'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update user information' : 'Add a new team member'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
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
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} disabled={isEditing} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="Enter password" {...field} />
                    </FormControl>
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
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genderOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Branch Selection */}
            <FormField
              control={form.control}
              name="branchIds"
              render={() => (
                <FormItem>
                  <FormLabel>Branches *</FormLabel>
                  <FormDescription>Select branches this user can access</FormDescription>
                  <div className="space-y-2 mt-2">
                    {branches?.map((branch) => (
                      <FormField
                        key={branch.id}
                        control={form.control}
                        name="branchIds"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(branch.id)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...(field.value || []), branch.id]
                                    : field.value?.filter((id) => id !== branch.id) || [];
                                  field.onChange(newValue);
                                  // Update primary if removed
                                  if (!checked && form.getValues('primaryBranchId') === branch.id) {
                                    form.setValue('primaryBranchId', newValue[0] || '');
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {branch.name}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Primary Branch Selection */}
            {selectedBranchIds.length > 0 && (
              <FormField
                control={form.control}
                name="primaryBranchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Branch *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches
                          ?.filter((b) => selectedBranchIds.includes(b.id))
                          .map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isEditing && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Active</FormLabel>
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                {(createUser.isPending || updateUser.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Save Changes' : 'Create User'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
