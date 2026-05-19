'use client';

/**
 * Operational Dashboard Component
 * For receptionist and stylist roles
 * Shows timeline, queue, attention items, and floor view
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, LayoutGrid, Calendar } from 'lucide-react';
import { NextUpQueue, AttentionItems, LiveTimeline } from '@/components/ux/command-center';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOpenPanel } from '@/components/ux/slide-over';
import { useCompleteService, useSkipAllWaitingServices } from '@/hooks/queries/use-appointments';
import { ConfirmDialog } from '@/components/common';
import { FloorViewTab } from './floor-view-tab';
import { StartNextServiceDialog } from '@/components/ux/dialogs/start-next-service-dialog';
import type { AttentionItem, CommandCenterData } from '@/types/dashboard';
import type { UpNextService, StationCard as StationCardType } from '@/types/stations';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  mobileDefaultOpen?: boolean;
  className?: string;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  mobileDefaultOpen,
  className,
}: CollapsibleSectionProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only showing after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (isMobile && mobileDefaultOpen !== undefined) {
        setIsOpen(mobileDefaultOpen);
      } else {
        setIsOpen(defaultOpen);
      }
    }
  }, [mounted, isMobile, defaultOpen, mobileDefaultOpen]);

  // During SSR and initial hydration, show a simple non-collapsible version
  if (!mounted) {
    return (
      <div className={cn('', className)}>
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {/* Mobile: Collapsible button */}
      {isMobile ? (
        <button
          className="flex items-center justify-between w-full py-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-lg font-semibold">{title}</span>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      ) : (
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
      )}
      <div className={cn(isMobile && !isOpen && 'hidden')}>{children}</div>
    </div>
  );
}

interface OperationalDashboardProps {
  data: CommandCenterData | undefined;
  isLoading: boolean;
  currentTime: Date;
  branchId: string;
  onTimelineSlotClick: (stylistId: string, time: string) => void;
  onAppointmentClick: (id: string) => void;
  onCheckIn: (id: string) => void;
  onCallWalkIn: (id: string) => void;
  onAttentionItemClick: (item: AttentionItem) => void;
  onDismissAttention: (id: string) => void;
}

export function OperationalDashboard({
  data,
  isLoading,
  currentTime,
  branchId,
  onTimelineSlotClick,
  onAppointmentClick,
  onCheckIn,
  onCallWalkIn,
  onAttentionItemClick,
  onDismissAttention,
}: OperationalDashboardProps) {
  const { openStationAssignment, openAppointmentDetails } = useOpenPanel();
  const [activeTab, setActiveTab] = useState('timeline');

  // State for start next service dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogData, setMoveDialogData] = useState<{
    appointmentId: string;
    currentStationId: string;
    nextService: UpNextService;
    allNextServices: UpNextService[];
  } | null>(null);

  // State for complete service confirmation dialog
  const [completeServiceDialogOpen, setCompleteServiceDialogOpen] = useState(false);
  const [completeServiceData, setCompleteServiceData] = useState<{
    appointmentId: string;
    serviceId: string;
    serviceName: string;
  } | null>(null);

  // State for complete & checkout confirmation dialog
  const [completeAndCheckoutDialogOpen, setCompleteAndCheckoutDialogOpen] = useState(false);
  const [completeAndCheckoutData, setCompleteAndCheckoutData] = useState<{
    appointmentId: string;
    serviceIds: string[];
    serviceName: string;
  } | null>(null);

  // State for incomplete services warning dialog
  const [incompleteServicesDialogOpen, setIncompleteServicesDialogOpen] = useState(false);
  const [pendingCheckoutData, setPendingCheckoutData] = useState<{
    appointmentId: string;
  } | null>(null);

  // Complete service mutation
  const completeServiceMutation = useCompleteService();

  // Skip all waiting services mutation
  const skipAllWaitingServicesMutation = useSkipAllWaitingServices();

  // Floor view action handlers
  const handleAssign = useCallback(
    (stationId: string) => {
      openStationAssignment(stationId);
    },
    [openStationAssignment]
  );

  const handleCheckout = useCallback(
    (
      appointmentId: string,
      _isPending: boolean,
      _scheduledDate?: string,
      _scheduledTime?: string,
      hasIncompleteServices?: boolean
    ) => {
      if (hasIncompleteServices) {
        // Show warning dialog before proceeding to checkout
        setPendingCheckoutData({ appointmentId });
        setIncompleteServicesDialogOpen(true);
      } else {
        // Proceed directly to checkout
        openAppointmentDetails(appointmentId, {
          isCheckoutMode: true,
        });
      }
    },
    [openAppointmentDetails]
  );

  // Confirm checkout with incomplete services - skip waiting services first, then open checkout
  const confirmCheckoutWithIncompleteServices = useCallback(async () => {
    if (pendingCheckoutData) {
      // Skip all waiting services first
      try {
        await skipAllWaitingServicesMutation.mutateAsync({
          appointmentId: pendingCheckoutData.appointmentId,
          reason: 'Early checkout',
        });
      } catch {
        // If skipping fails (e.g., in_progress services exist), the error toast is shown by the mutation
        // Don't proceed to checkout
        setIncompleteServicesDialogOpen(false);
        setPendingCheckoutData(null);
        return;
      }

      // Now open checkout panel
      openAppointmentDetails(pendingCheckoutData.appointmentId, {
        isCheckoutMode: true,
      });
      setIncompleteServicesDialogOpen(false);
      setPendingCheckoutData(null);
    }
  }, [pendingCheckoutData, skipAllWaitingServicesMutation, openAppointmentDetails]);

  // Handle starting next service - opens start next service dialog
  const handleStartNextService = useCallback(
    (
      appointmentId: string,
      currentStationId: string,
      _currentStationName: string,
      nextService: StationCardType['upNext'],
      allNextServices?: StationCardType['upNextServices']
    ) => {
      if (!nextService) return;

      setMoveDialogData({
        appointmentId,
        currentStationId,
        nextService,
        allNextServices: allNextServices || [nextService],
      });
      setMoveDialogOpen(true);
    },
    []
  );

  // Handle completing current service - shows confirmation dialog
  const handleCompleteService = useCallback(
    (appointmentId: string, serviceId: string, serviceName: string) => {
      setCompleteServiceData({ appointmentId, serviceId, serviceName });
      setCompleteServiceDialogOpen(true);
    },
    []
  );

  // Handle completing last service and proceeding to checkout
  const handleCompleteAndCheckout = useCallback(
    (appointmentId: string, serviceIds: string[], serviceName: string) => {
      setCompleteAndCheckoutData({ appointmentId, serviceIds, serviceName });
      setCompleteAndCheckoutDialogOpen(true);
    },
    []
  );

  // Confirm complete service
  const confirmCompleteService = useCallback(() => {
    if (completeServiceData) {
      completeServiceMutation.mutate({
        appointmentId: completeServiceData.appointmentId,
        serviceId: completeServiceData.serviceId,
      });
      setCompleteServiceDialogOpen(false);
      setCompleteServiceData(null);
    }
  }, [completeServiceData, completeServiceMutation]);

  // Confirm complete service and checkout
  const confirmCompleteAndCheckout = useCallback(async () => {
    if (completeAndCheckoutData) {
      try {
        // Complete all in-progress services (for parallel services)
        for (const serviceId of completeAndCheckoutData.serviceIds) {
          await completeServiceMutation.mutateAsync({
            appointmentId: completeAndCheckoutData.appointmentId,
            serviceId,
          });
        }
        // After completing all, open checkout
        openAppointmentDetails(completeAndCheckoutData.appointmentId, {
          isCheckoutMode: true,
        });
      } catch {
        // Error toast is shown by the mutation
      }
      setCompleteAndCheckoutDialogOpen(false);
      setCompleteAndCheckoutData(null);
    }
  }, [completeAndCheckoutData, completeServiceMutation, openAppointmentDetails]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="timeline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Timeline
        </TabsTrigger>
        <TabsTrigger value="floor" className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          Floor View
        </TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="mt-0">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Timeline (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <CollapsibleSection title="Timeline" defaultOpen={true} mobileDefaultOpen={false}>
              <LiveTimeline
                entries={data?.timeline || []}
                currentTime={currentTime}
                isLoading={isLoading}
                onSlotClick={onTimelineSlotClick}
                onAppointmentClick={onAppointmentClick}
              />
            </CollapsibleSection>
          </div>

          {/* Right Column - Queue and Attention (1/3 width on desktop) */}
          <div className="space-y-6">
            <CollapsibleSection title="Next Up" defaultOpen={true} mobileDefaultOpen={true}>
              <NextUpQueue
                appointments={data?.nextUp.appointments || []}
                walkIns={data?.nextUp.walkIns || []}
                isLoading={isLoading}
                onAppointmentClick={onAppointmentClick}
                onCheckIn={onCheckIn}
                onCallWalkIn={onCallWalkIn}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Needs Attention" defaultOpen={true} mobileDefaultOpen={true}>
              <AttentionItems
                items={data?.attentionItems || []}
                isLoading={isLoading}
                onItemClick={onAttentionItemClick}
                onDismiss={onDismissAttention}
              />
            </CollapsibleSection>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="floor" className="mt-0">
        <FloorViewTab
          branchId={branchId}
          onAssign={handleAssign}
          onCheckout={handleCheckout}
          onStartNextService={handleStartNextService}
          onCompleteService={handleCompleteService}
          onCompleteAndCheckout={handleCompleteAndCheckout}
        />
      </TabsContent>

      {/* Start Next Service Dialog */}
      {moveDialogData && (
        <StartNextServiceDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          appointmentId={moveDialogData.appointmentId}
          service={moveDialogData.nextService}
          allServices={moveDialogData.allNextServices}
          currentStationId={moveDialogData.currentStationId}
          onSuccess={() => {
            setMoveDialogData(null);
          }}
        />
      )}

      {/* Complete Service Confirmation Dialog */}
      <ConfirmDialog
        open={completeServiceDialogOpen}
        onOpenChange={setCompleteServiceDialogOpen}
        title="Complete Service"
        description={
          completeServiceData
            ? `Are you sure you want to mark "${completeServiceData.serviceName}" as completed?`
            : 'Are you sure you want to complete this service?'
        }
        confirmText="Complete"
        onConfirm={confirmCompleteService}
        isLoading={completeServiceMutation.isPending}
      />

      {/* Complete & Checkout Confirmation Dialog */}
      <ConfirmDialog
        open={completeAndCheckoutDialogOpen}
        onOpenChange={setCompleteAndCheckoutDialogOpen}
        title="Complete & Checkout"
        description={
          completeAndCheckoutData
            ? `Are you sure you want to mark "${completeAndCheckoutData.serviceName}" as completed and proceed to checkout?`
            : 'Are you sure you want to complete this service and proceed to checkout?'
        }
        confirmText="Complete & Checkout"
        onConfirm={confirmCompleteAndCheckout}
        isLoading={completeServiceMutation.isPending}
      />

      {/* Incomplete Services Warning Dialog */}
      <ConfirmDialog
        open={incompleteServicesDialogOpen}
        onOpenChange={setIncompleteServicesDialogOpen}
        title="Incomplete Services"
        description="This appointment has services that are not yet completed. Are you sure you want to proceed to checkout? The remaining services will be marked as skipped."
        confirmText="Proceed to Checkout"
        cancelText="Go Back"
        variant="destructive"
        onConfirm={confirmCheckoutWithIncompleteServices}
      />
    </Tabs>
  );
}
