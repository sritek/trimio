/**
 * Overlap Layout Algorithm (Enterprise Calendar Style)
 *
 * Implements the same layout strategy used by Google Calendar / Outlook:
 * 1. Group overlapping appointments into connected clusters
 * 2. Assign each appointment a column via greedy packing
 * 3. Let each appointment expand rightward into empty adjacent columns
 *
 * This means an appointment only shares width with events it actually
 * overlaps — not with every event in the cluster.
 */

import type { CalendarAppointment } from '@/hooks/queries/use-resource-calendar';

export interface LayoutInfo {
  /** Column index within the overlap group (0-based) */
  column: number;
  /** How many columns this appointment spans */
  span: number;
  /** Total columns in this overlap group */
  totalColumns: number;
}

/** Convert "HH:mm" to total minutes */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Check if two appointments overlap in time */
function overlaps(a: CalendarAppointment, b: CalendarAppointment): boolean {
  return toMinutes(a.startTime) < toMinutes(b.endTime) &&
         toMinutes(b.startTime) < toMinutes(a.endTime);
}

/**
 * Compute layout for all appointments belonging to a single stylist.
 */
function computeStylistLayout(appointments: CalendarAppointment[]): Map<string, LayoutInfo> {
  const result = new Map<string, LayoutInfo>();
  if (appointments.length === 0) return result;

  // Sort by start time, then by duration descending (longer events first)
  const sorted = [...appointments].sort((a, b) => {
    const diff = toMinutes(a.startTime) - toMinutes(b.startTime);
    if (diff !== 0) return diff;
    return toMinutes(b.endTime) - toMinutes(a.endTime);
  });

  // Step 1: Build clusters of transitively overlapping appointments
  const clusters: CalendarAppointment[][] = [];
  let currentCluster: CalendarAppointment[] = [];
  let clusterEnd = 0;

  for (const apt of sorted) {
    const start = toMinutes(apt.startTime);
    const end = toMinutes(apt.endTime);

    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(apt);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [apt];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Step 2: For each cluster, assign columns and compute spans
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      result.set(cluster[0].id, { column: 0, span: 1, totalColumns: 1 });
      continue;
    }

    // Greedy column assignment — track end time per column
    const columnEnds: number[] = [];
    const colMap = new Map<string, number>();

    for (const apt of cluster) {
      const start = toMinutes(apt.startTime);
      let placed = false;

      for (let col = 0; col < columnEnds.length; col++) {
        if (columnEnds[col] <= start) {
          columnEnds[col] = toMinutes(apt.endTime);
          colMap.set(apt.id, col);
          placed = true;
          break;
        }
      }

      if (!placed) {
        colMap.set(apt.id, columnEnds.length);
        columnEnds.push(toMinutes(apt.endTime));
      }
    }

    const totalColumns = columnEnds.length;

    // Step 3: Compute span — how far right each appointment can expand
    // An appointment in column C can expand into column C+1 if no appointment
    // in column C+1 overlaps with it, and so on.
    for (const apt of cluster) {
      const col = colMap.get(apt.id)!;
      let span = 1;

      for (let nextCol = col + 1; nextCol < totalColumns; nextCol++) {
        // Check if any appointment in nextCol overlaps with this one
        const blocked = cluster.some(
          (other) => colMap.get(other.id) === nextCol && overlaps(apt, other)
        );
        if (blocked) break;
        span++;
      }

      result.set(apt.id, { column: col, span, totalColumns });
    }
  }

  return result;
}

/**
 * Compute layout for all appointments across all stylists.
 */
export function computeOverlapLayout(
  appointments: CalendarAppointment[]
): Map<string, LayoutInfo> {
  const byStylist = new Map<string, CalendarAppointment[]>();
  for (const apt of appointments) {
    const key = apt.stylistId || '__unassigned__';
    const list = byStylist.get(key) || [];
    list.push(apt);
    byStylist.set(key, list);
  }

  const result = new Map<string, LayoutInfo>();
  for (const [, stylistApts] of byStylist) {
    const layout = computeStylistLayout(stylistApts);
    for (const [id, info] of layout) {
      result.set(id, info);
    }
  }

  return result;
}
