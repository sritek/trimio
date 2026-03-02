'use client';

/**
 * Notification Center Component
 * Displays all notifications in a panel with grouping and filtering
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Calendar, CreditCard, Package, Users, CheckCheck, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOpenPanel } from '@/components/ux/slide-over';
import { api } from '@/lib/api/client';

export type NotificationType = 'appointment' | 'billing' | 'inventory' | 'staff';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
}

interface NotificationCenterProps {
  className?: string;
}

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  appointment: <Calendar className="h-4 w-4" />,
  billing: <CreditCard className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />,
  staff: <Users className="h-4 w-4" />,
};

const TYPE_LABELS: Record<NotificationType, string> = {
  appointment: 'Appointments',
  billing: 'Billing',
  inventory: 'Inventory',
  staff: 'Staff',
};

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType[]>([]);
  const queryClient = useQueryClient();
  const { openAppointmentDetails, openCustomerPeek } = useOpenPanel();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get<{ data: Notification[] }>('/notifications?limit=50');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    if (typeFilter.length === 0) return notifications;
    return notifications.filter((n) => typeFilter.includes(n.type));
  }, [notifications, typeFilter]);

  // Group notifications by type
  const groupedNotifications = useMemo(() => {
    const groups: Record<NotificationType, Notification[]> = {
      appointment: [],
      billing: [],
      inventory: [],
      staff: [],
    };

    filteredNotifications.forEach((notification) => {
      groups[notification.type].push(notification);
    });

    return groups;
  }, [filteredNotifications]);

  // Count unread
  const unreadCount = useMemo(() => {
    return notifications?.filter((n) => !n.isRead).length || 0;
  }, [notifications]);

  // Handle notification click
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      // Mark as read
      if (!notification.isRead) {
        markReadMutation.mutate(notification.id);
      }

      // Open entity in slide-over if available
      if (notification.entityType && notification.entityId) {
        switch (notification.entityType) {
          case 'appointment':
            openAppointmentDetails(notification.entityId);
            break;
          case 'customer':
            openCustomerPeek(notification.entityId);
            break;
          // TODO: Add invoice details panel when implemented
        }
      }

      setOpen(false);
    },
    [markReadMutation, openAppointmentDetails, openCustomerPeek]
  );

  // Toggle type filter
  const toggleTypeFilter = useCallback((type: NotificationType) => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative', className)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(TYPE_LABELS) as NotificationType[]).map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={typeFilter.includes(type)}
                    onCheckedChange={() => toggleTypeFilter(type)}
                  >
                    {TYPE_ICONS[type]}
                    <span className="ml-2">{TYPE_LABELS[type]}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mark all as read */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {(Object.keys(groupedNotifications) as NotificationType[]).map((type) => {
                const items = groupedNotifications[type];
                if (items.length === 0) return null;

                return (
                  <div key={type}>
                    <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground flex items-center gap-2">
                      {TYPE_ICONS[type]}
                      {TYPE_LABELS[type]}
                    </div>
                    {items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Individual notification item
function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
        !notification.isRead && 'bg-blue-50 dark:bg-blue-950/20'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 h-2 w-2 rounded-full flex-shrink-0',
            notification.isRead ? 'bg-transparent' : 'bg-blue-500',
            notification.priority === 'high' && !notification.isRead && 'bg-red-500'
          )}
        />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm', !notification.isRead && 'font-medium')}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  );
}
