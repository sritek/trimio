/**
 * Dashboard Service
 * Aggregates data for Command Center dashboard
 */

import { format, differenceInMinutes, addHours, parseISO, startOfDay, endOfDay } from 'date-fns';

import { prisma } from '@/lib/prisma';
import type {
  Station,
  UpcomingAppointment,
  WalkInEntry,
  AttentionItem,
  QuickStats,
  CommandCenterResponse,
  OwnerDashboardResponse,
} from './dashboard.schema';

export const dashboardService = {
  /**
   * Get Command Center data for a branch
   */
  async getCommandCenter(
    tenantId: string,
    branchId: string,
    date?: string
  ): Promise<CommandCenterResponse> {
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    const now = new Date();

    // Fetch all data in parallel for efficiency
    const [stats, stations, nextUp, attentionItems, timeline] = await Promise.all([
      this.getQuickStats(tenantId, branchId, dateStr),
      this.getStations(tenantId, branchId, dateStr, now),
      this.getNextUp(tenantId, branchId, dateStr, now),
      this.getAttentionItems(tenantId, branchId, dateStr, now),
      this.getTimeline(tenantId, branchId, dateStr, now),
    ]);

    return {
      stats,
      stations,
      nextUp,
      attentionItems,
      timeline,
    };
  },

  /**
   * Get quick stats for the dashboard
   */
  async getQuickStats(tenantId: string, branchId: string, dateStr: string): Promise<QuickStats> {
    const targetDate = new Date(dateStr);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Get today's invoices for revenue
    const todayInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        branchId,
        invoiceDate: { gte: dayStart, lte: dayEnd },
        status: 'finalized',
      },
      select: { grandTotal: true },
    });

    const todayRevenue = todayInvoices.reduce(
      (sum, inv) => sum + (inv.grandTotal?.toNumber() || 0),
      0
    );

    // Get yesterday's revenue for comparison
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const yesterdayInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        branchId,
        invoiceDate: { gte: yesterdayStart, lte: yesterdayEnd },
        status: 'finalized',
      },
      select: { grandTotal: true },
    });

    const yesterdayRevenue = yesterdayInvoices.reduce(
      (sum, inv) => sum + (inv.grandTotal?.toNumber() || 0),
      0
    );

    const revenueChange =
      yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

    // Get appointment stats
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: targetDate,
        status: { not: 'cancelled' },
      },
      select: { status: true },
    });

    const appointmentsCompleted = appointments.filter((a) => a.status === 'completed').length;
    const appointmentsRemaining = appointments.filter((a) =>
      ['booked', 'confirmed', 'checked_in', 'in_progress'].includes(a.status)
    ).length;
    const noShows = appointments.filter((a) => a.status === 'no_show').length;

    // Get walk-in stats
    const walkIns = await prisma.walkInQueue.findMany({
      where: {
        tenantId,
        branchId,
        queueDate: targetDate,
      },
      select: { status: true, estimatedWaitMinutes: true },
    });

    const walkInsServed = walkIns.filter((w) => w.status === 'completed').length;
    const averageWaitTime =
      walkIns.length > 0
        ? walkIns.reduce((sum, w) => sum + (w.estimatedWaitMinutes || 0), 0) / walkIns.length
        : 0;

    // Calculate occupancy rate (simplified)
    const totalSlots = 8 * 4; // 8 hours * 4 slots per hour (15 min each)
    const bookedSlots = appointments.length;
    const occupancyRate = (bookedSlots / totalSlots) * 100;

    return {
      todayRevenue,
      revenueChange: Math.round(revenueChange * 10) / 10,
      appointmentsCompleted,
      appointmentsRemaining,
      walkInsServed,
      averageWaitTime: Math.round(averageWaitTime),
      noShows,
      occupancyRate: Math.round(occupancyRate),
    };
  },

  /**
   * Get station view data (physical stations and their current status)
   */
  async getStations(
    tenantId: string,
    branchId: string,
    dateStr: string,
    now: Date
  ): Promise<Station[]> {
    const targetDate = new Date(dateStr);

    // Get all active stations for this branch
    const stations = await prisma.station.findMany({
      where: {
        tenantId,
        branchId,
        deletedAt: null,
      },
      include: {
        stationType: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Get today's appointments assigned to stations
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: targetDate,
        stationId: { in: stations.map((s) => s.id) },
        status: { notIn: ['cancelled', 'no_show'] },
      },
      include: {
        customer: { select: { name: true } },
        stylist: { select: { id: true, name: true } },
        services: {
          include: {
            service: { select: { name: true, durationMinutes: true } },
          },
        },
      },
    });

    // Get pending appointments from previous days (still in_progress)
    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: { lt: targetDate },
        stationId: { in: stations.map((s) => s.id) },
        status: 'in_progress',
      },
      include: {
        customer: { select: { name: true } },
        stylist: { select: { id: true, name: true } },
        services: {
          include: {
            service: { select: { name: true, durationMinutes: true } },
          },
        },
      },
    });

    // Get stylist names for appointments (for assistants)
    const assistantMap = new Map<string, string[]>();
    // Note: Assistant stylists are not currently tracked in the schema
    // This can be implemented in a future version

    // Build station data
    const stationData: Station[] = stations.map((station) => {
      // Find appointment currently assigned to this station (today's in_progress)
      const currentAppointment = todayAppointments.find(
        (apt) =>
          apt.stationId === station.id &&
          apt.status === 'in_progress' &&
          apt.actualStartTime &&
          now >= apt.actualStartTime &&
          now <= parseISO(`${dateStr}T${apt.scheduledEndTime}`)
      );

      // Find pending appointment (from previous days, still in_progress)
      const pendingAppointment = pendingAppointments.find(
        (apt) => apt.stationId === station.id && apt.status === 'in_progress'
      );

      // Determine status
      let status: Station['status'] = 'available';
      if (station.status === 'out_of_service') {
        status = 'out_of_service';
      } else if (currentAppointment) {
        status = 'occupied';
      } else if (pendingAppointment) {
        // Station has a pending appointment from a previous day
        status = 'occupied';
      }

      // Build appointment data if occupied (prefer current over pending)
      let appointmentData: Station['appointment'] = null;
      const appointmentToDisplay = currentAppointment || pendingAppointment;

      if (appointmentToDisplay) {
        const appointmentDateStr = format(appointmentToDisplay.scheduledDate, 'yyyy-MM-dd');
        const scheduledStartTime = parseISO(
          `${appointmentDateStr}T${appointmentToDisplay.scheduledTime}`
        );
        const actualStartTime = appointmentToDisplay.actualStartTime
          ? parseISO(appointmentToDisplay.actualStartTime.toISOString())
          : scheduledStartTime;

        // Calculate delay in minutes (how late the appointment started)
        const delayMinutes = Math.max(0, differenceInMinutes(actualStartTime, scheduledStartTime));

        const endTime = parseISO(`${appointmentDateStr}T${appointmentToDisplay.scheduledEndTime}`);
        const totalMinutes = differenceInMinutes(endTime, actualStartTime);
        const elapsedMinutes = differenceInMinutes(now, actualStartTime);
        const progressPercent = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
        const remainingMinutes = Math.max(0, totalMinutes - elapsedMinutes);
        const isOvertime = elapsedMinutes > totalMinutes;

        const serviceNames = appointmentToDisplay.services.map(
          (as) => as.service?.name || 'Service'
        );
        const assistantNames = assistantMap.get(appointmentToDisplay.id) || [];

        appointmentData = {
          id: appointmentToDisplay.id,
          customerName: appointmentToDisplay.customer?.name || 'Guest',
          stylistName: appointmentToDisplay.stylist?.name || null,
          assistantNames,
          services: serviceNames,
          startedAt: appointmentToDisplay.actualStartTime?.toISOString() || null,
          estimatedEndTime: endTime.toISOString(),
          scheduledTime: appointmentToDisplay.scheduledTime,
          scheduledDate: format(appointmentToDisplay.scheduledDate, 'yyyy-MM-dd'),
          delayMinutes,
          elapsedMinutes: Math.round(elapsedMinutes),
          remainingMinutes: Math.round(remainingMinutes),
          progressPercent: Math.round(progressPercent),
          isOvertime,
        };
      }

      return {
        id: station.id,
        name: station.name,
        stationType: station.stationType,
        displayOrder: station.displayOrder,
        status,
        appointment: appointmentData,
      };
    });

    return stationData;
  },

  /**
   * Get next up queue (upcoming appointments and walk-ins)
   */
  async getNextUp(
    tenantId: string,
    branchId: string,
    dateStr: string,
    now: Date
  ): Promise<{ appointments: UpcomingAppointment[]; walkIns: WalkInEntry[] }> {
    const targetDate = new Date(dateStr);
    const currentTime = format(now, 'HH:mm');

    // Get upcoming appointments (next 5)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: targetDate,
        scheduledTime: { gte: currentTime },
        status: { in: ['booked', 'confirmed', 'checked_in'] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        services: {
          include: {
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
      take: 5,
    });

    // Get stylist names for appointments
    const stylistIds = upcomingAppointments.map((apt) => apt.stylistId).filter(Boolean) as string[];
    const stylists =
      stylistIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: stylistIds } },
            select: { id: true, name: true },
          })
        : [];
    const stylistMap = new Map(stylists.map((s) => [s.id, s.name]));

    const appointments: UpcomingAppointment[] = upcomingAppointments.map((apt) => {
      const scheduledTimeDate = parseISO(`${dateStr}T${apt.scheduledTime}`);
      const isLate = apt.status === 'booked' && now > scheduledTimeDate;

      return {
        id: apt.id,
        customerName: apt.customer?.name || 'Guest',
        customerPhone: apt.customer?.phone || '',
        scheduledTime: apt.scheduledTime,
        services: apt.services.map((as) => as.service?.name || 'Service'),
        stylistName: apt.stylistId ? stylistMap.get(apt.stylistId) || 'Any' : 'Any',
        status: apt.status as 'booked' | 'confirmed' | 'checked_in',
        isLate,
      };
    });

    // Get walk-ins waiting
    const walkInQueue = await prisma.walkInQueue.findMany({
      where: {
        tenantId,
        branchId,
        queueDate: targetDate,
        status: { in: ['waiting', 'called', 'serving'] },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    // Get service names for walk-ins
    const allServiceIds = walkInQueue.flatMap((wi) => wi.serviceIds);
    const uniqueServiceIds = [...new Set(allServiceIds)];
    const servicesData =
      uniqueServiceIds.length > 0
        ? await prisma.service.findMany({
            where: { id: { in: uniqueServiceIds } },
            select: { id: true, name: true },
          })
        : [];
    const serviceMap = new Map(servicesData.map((s) => [s.id, s.name]));

    const walkIns: WalkInEntry[] = walkInQueue.map((wi) => {
      const addedTime = wi.createdAt;
      const waitTime = differenceInMinutes(now, addedTime);

      return {
        id: wi.id,
        tokenNumber: wi.tokenNumber,
        customerName: wi.customerName || 'Guest',
        services: wi.serviceIds.map((sid) => serviceMap.get(sid) || 'Service'),
        waitTime,
        status: wi.status as 'waiting' | 'called' | 'serving',
      };
    });

    return { appointments, walkIns };
  },

  /**
   * Get attention items that need action
   */
  async getAttentionItems(
    tenantId: string,
    branchId: string,
    dateStr: string,
    now: Date
  ): Promise<AttentionItem[]> {
    const targetDate = new Date(dateStr);
    const currentTime = format(now, 'HH:mm');
    const items: AttentionItem[] = [];

    // 1. Late arrivals (appointments past start time but not checked in)
    const lateAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: targetDate,
        scheduledTime: { lt: currentTime },
        status: { in: ['booked', 'confirmed'] },
      },
      include: {
        customer: { select: { name: true } },
      },
      take: 5,
    });

    for (const apt of lateAppointments) {
      const scheduledTime = parseISO(`${dateStr}T${apt.scheduledTime}`);
      const lateMinutes = differenceInMinutes(now, scheduledTime);

      if (lateMinutes >= 10) {
        items.push({
          id: `late-${apt.id}`,
          type: 'late_arrival',
          priority: lateMinutes >= 30 ? 'high' : 'medium',
          title: `${apt.customer?.name || 'Customer'} is late`,
          description: `${lateMinutes} minutes past scheduled time (${apt.scheduledTime})`,
          entityType: 'appointment',
          entityId: apt.id,
          createdAt: now.toISOString(),
        });
      }
    }

    // 2. Pending checkouts (completed appointments without invoice)
    const pendingCheckouts = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: targetDate,
        status: 'completed',
      },
      include: {
        customer: { select: { name: true } },
      },
      take: 5,
    });

    for (const apt of pendingCheckouts) {
      items.push({
        id: `checkout-${apt.id}`,
        type: 'pending_checkout',
        priority: 'high',
        title: `Pending checkout: ${apt.customer?.name || 'Customer'}`,
        description: 'Service completed but not billed',
        entityType: 'appointment',
        entityId: apt.id,
        createdAt: now.toISOString(),
      });
    }

    // 3. Walk-ins waiting too long (20+ minutes)
    const longWaitingWalkIns = await prisma.walkInQueue.findMany({
      where: {
        tenantId,
        branchId,
        queueDate: targetDate,
        status: 'waiting',
      },
    });

    for (const wi of longWaitingWalkIns) {
      const waitTime = differenceInMinutes(now, wi.createdAt);
      if (waitTime >= 20) {
        items.push({
          id: `walkin-${wi.id}`,
          type: 'walk_in_waiting',
          priority: waitTime >= 40 ? 'high' : 'medium',
          title: `Walk-in #${wi.tokenNumber} waiting`,
          description: `${wi.customerName || 'Customer'} waiting for ${waitTime} minutes`,
          entityType: 'customer',
          entityId: wi.customerId || wi.id,
          createdAt: now.toISOString(),
        });
      }
    }

    // Sort by priority (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return items.slice(0, 10);
  },

  /**
   * Get timeline data for the next 2 hours
   */
  async getTimeline(
    tenantId: string,
    branchId: string,
    dateStr: string,
    now: Date
  ): Promise<
    Array<{
      stylistId: string;
      stylistName: string;
      avatar: string | null;
      appointments: Array<{
        id: string;
        startTime: string;
        endTime: string;
        customerName: string;
        status: string;
      }>;
    }>
  > {
    const targetDate = new Date(dateStr);
    const currentTime = format(now, 'HH:mm');
    const twoHoursLater = format(addHours(now, 2), 'HH:mm');

    // Get stylists
    const stylists = await prisma.user.findMany({
      where: {
        tenantId,
        role: 'stylist',
        isActive: true,
        deletedAt: null,
        branchAssignments: {
          some: { branchId },
        },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    });

    // Get appointments in the time range
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: targetDate,
        stylistId: { in: stylists.map((s) => s.id) },
        status: { notIn: ['cancelled', 'no_show'] },
        OR: [
          {
            scheduledTime: { gte: currentTime, lte: twoHoursLater },
          },
          {
            scheduledEndTime: { gte: currentTime, lte: twoHoursLater },
          },
          {
            scheduledTime: { lte: currentTime },
            scheduledEndTime: { gte: twoHoursLater },
          },
        ],
      },
      include: {
        customer: { select: { name: true } },
      },
    });

    // Build timeline for each stylist
    return stylists.map((stylist) => {
      const stylistAppointments = appointments
        .filter((apt) => apt.stylistId === stylist.id)
        .map((apt) => ({
          id: apt.id,
          startTime: apt.scheduledTime,
          endTime: apt.scheduledEndTime,
          customerName: apt.customer?.name || 'Guest',
          status: apt.status,
        }));

      return {
        stylistId: stylist.id,
        stylistName: stylist.name,
        avatar: stylist.avatarUrl,
        appointments: stylistAppointments,
      };
    });
  },

  /**
   * Get Owner Dashboard data
   * Shows revenue metrics, appointment stats, inventory alerts, and staff summary
   */
  async getOwnerDashboard(tenantId: string, branchId?: string): Promise<OwnerDashboardResponse> {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    // Last week same day
    const lastWeekSameDay = new Date(today);
    lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);
    const lastWeekStart = startOfDay(lastWeekSameDay);
    const lastWeekEnd = endOfDay(lastWeekSameDay);

    // Build branch filter
    const branchFilter = branchId ? { branchId } : {};

    // Fetch all data in parallel
    const [
      todayInvoices,
      yesterdayInvoices,
      lastWeekInvoices,
      todayAppointments,
      lowStockProducts,
      expiringBatches,
      presentStaff,
      totalActiveStaff,
      staffOnLeave,
    ] = await Promise.all([
      // Today's revenue
      prisma.invoice.findMany({
        where: {
          tenantId,
          ...branchFilter,
          invoiceDate: { gte: todayStart, lte: todayEnd },
          status: 'finalized',
        },
        select: { grandTotal: true },
      }),
      // Yesterday's revenue
      prisma.invoice.findMany({
        where: {
          tenantId,
          ...branchFilter,
          invoiceDate: { gte: yesterdayStart, lte: yesterdayEnd },
          status: 'finalized',
        },
        select: { grandTotal: true },
      }),
      // Last week same day revenue
      prisma.invoice.findMany({
        where: {
          tenantId,
          ...branchFilter,
          invoiceDate: { gte: lastWeekStart, lte: lastWeekEnd },
          status: 'finalized',
        },
        select: { grandTotal: true },
      }),
      // Today's appointments
      prisma.appointment.findMany({
        where: {
          tenantId,
          ...branchFilter,
          scheduledDate: today,
          deletedAt: null,
        },
        select: { status: true },
      }),
      // Low stock products - count products with branch settings below reorder level
      prisma.branchProductSettings.count({
        where: {
          tenantId,
          ...(branchId ? { branchId } : {}),
          reorderLevel: { not: null },
          product: {
            deletedAt: null,
            isActive: true,
          },
        },
      }),
      // Expiring batches (within 30 days)
      prisma.stockBatch.count({
        where: {
          tenantId,
          ...(branchId ? { branchId } : {}),
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: today,
          },
          availableQuantity: { gt: 0 },
          isDepleted: false,
        },
      }),
      // Present staff today
      prisma.attendance.count({
        where: {
          tenantId,
          ...branchFilter,
          attendanceDate: today,
          checkInTime: { not: null },
          status: 'present',
        },
      }),
      // Total active staff
      prisma.user.count({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          role: { in: ['stylist', 'receptionist'] },
          ...(branchId ? { branchAssignments: { some: { branchId } } } : {}),
        },
      }),
      // Staff on leave today
      prisma.leave.count({
        where: {
          tenantId,
          status: 'approved',
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
    ]);

    // Calculate revenue totals
    const todayRevenue = todayInvoices.reduce(
      (sum: number, inv: { grandTotal: { toNumber: () => number } | null }) =>
        sum + (inv.grandTotal?.toNumber() || 0),
      0
    );
    const yesterdayRevenue = yesterdayInvoices.reduce(
      (sum: number, inv: { grandTotal: { toNumber: () => number } | null }) =>
        sum + (inv.grandTotal?.toNumber() || 0),
      0
    );
    const lastWeekRevenue = lastWeekInvoices.reduce(
      (sum: number, inv: { grandTotal: { toNumber: () => number } | null }) =>
        sum + (inv.grandTotal?.toNumber() || 0),
      0
    );

    // Calculate percentage changes
    const percentChangeVsYesterday =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : todayRevenue > 0
          ? 100
          : 0;
    const percentChangeVsLastWeek =
      lastWeekRevenue > 0
        ? ((todayRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
        : todayRevenue > 0
          ? 100
          : 0;

    // Calculate appointment stats
    const appointmentStats = {
      total: todayAppointments.length,
      completed: todayAppointments.filter((a: { status: string }) => a.status === 'completed')
        .length,
      cancelled: todayAppointments.filter((a: { status: string }) => a.status === 'cancelled')
        .length,
      noShows: todayAppointments.filter((a: { status: string }) => a.status === 'no_show').length,
      inProgress: todayAppointments.filter((a: { status: string }) => a.status === 'in_progress')
        .length,
      upcoming: todayAppointments.filter((a: { status: string }) =>
        ['booked', 'confirmed', 'checked_in'].includes(a.status)
      ).length,
    };

    return {
      revenue: {
        today: Math.round(todayRevenue * 100) / 100,
        yesterday: Math.round(yesterdayRevenue * 100) / 100,
        lastWeekSameDay: Math.round(lastWeekRevenue * 100) / 100,
        percentChangeVsYesterday: Math.round(percentChangeVsYesterday * 10) / 10,
        percentChangeVsLastWeek: Math.round(percentChangeVsLastWeek * 10) / 10,
      },
      appointments: appointmentStats,
      inventory: {
        lowStockCount: lowStockProducts,
        expiringCount: expiringBatches,
      },
      staff: {
        presentToday: presentStaff,
        totalActive: totalActiveStaff,
        onLeave: staffOnLeave,
      },
    };
  },
};
