# Station Status Architecture

## Overview

The station status system has two distinct layers:

1. **Persisted Database Status** (`StationStatus`) - Configuration/operational state
2. **Runtime Status** (`FloorViewStatus`) - Real-time computed state based on appointments

This document explains how these work together and how to track station availability in real-time.

---

## Key Principle

**Stations are physical locations. Appointments are assigned to stations, not stylists.**

- Stylists can work at multiple stations throughout the day
- A station can have different stylists throughout the day
- Appointments contain stylist details (primary stylist, assistants)
- Station status is determined by the appointment currently assigned to it

---

## Layer 1: Database Status (Persisted)

### Definition

The `StationStatus` enum defines the operational configuration of a physical station:

```typescript
type StationStatus = 'active' | 'out_of_service';
```

### Values

| Status           | Meaning                                               |
| ---------------- | ----------------------------------------------------- |
| `active`         | Station is operational and available for appointments |
| `out_of_service` | Station is disabled (maintenance, broken, etc.)       |

### Storage

Stored in the `Station` model in the database:

```prisma
model Station {
  id        String        @id @default(cuid())
  tenantId  String
  branchId  String
  name      String
  status    StationStatus @default(active)  // Persisted DB status
  // ... other fields
}

model Appointment {
  // ... existing fields
  stationId String?  // Which station is this appointment using?
  station   Station? @relation(fields: [stationId], references: [id])
}
```

### When to Change

- **Set to `out_of_service`**: When a station needs maintenance or is broken
- **Set to `active`**: When maintenance is complete and station is ready

### API Endpoint

```typescript
// Update station status
PATCH /stations/:id
{
  "status": "out_of_service"  // or "active"
}
```

---

## Layer 2: Runtime Status (Computed)

### Definition

The `FloorViewStatus` enum represents the real-time operational state of a station:

```typescript
type FloorViewStatus = 'available' | 'occupied' | 'out_of_service';
```

### Values

| Status           | Meaning                                           | Determined By                                                                     |
| ---------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `available`      | Station is active and ready for the next customer | DB status is `active` AND no appointment currently in progress                    |
| `occupied`       | Station is currently in use (service in progress) | Appointment status is `in_progress` AND current time is within appointment window |
| `out_of_service` | Station is disabled or under maintenance          | DB status is `out_of_service`                                                     |

### Computation Logic

The runtime status is computed in real-time by the dashboard service (`apps/api/src/modules/dashboard/dashboard.service.ts`):

```typescript
async getStations(tenantId, branchId, dateStr, now) {
  // 1. Get all active stations for this branch
  const stations = await prisma.station.findMany({
    where: { tenantId, branchId, deletedAt: null },
    include: { stationType: { select: { id, name, color } } }
  });

  // 2. Get today's appointments assigned to stations
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      branchId,
      scheduledDate: targetDate,
      stationId: { in: stations.map(s => s.id) },
      status: { notIn: ['cancelled', 'no_show'] }
    },
    include: { customer, stylist, services }
  });

  // 3. For each station, determine runtime status
  const stationData = stations.map(station => {
    // Find appointment currently in progress on this station
    const currentAppointment = appointments.find(apt =>
      apt.stationId === station.id &&
      apt.status === 'in_progress' &&
      apt.startedAt &&
      currentTime >= apt.startedAt &&
      currentTime <= apt.endTime
    );

    // Determine status
    let status = 'available';
    if (station.status === 'out_of_service') {
      status = 'out_of_service';
    } else if (currentAppointment) {
      status = 'occupied';
    }

    return { id, name, status, appointment: currentAppointment };
  });

  return stationData;
}
```

### Key Points

1. **Real-time Computation**: Status is computed on every request, not stored
2. **Time-based**: Uses current time to determine if appointment is `in_progress`
3. **Appointment-driven**: Status depends on appointment status and timing
4. **Station-based**: Tracks actual physical stations, not stylists

---

## Appointment Assignment Flow

### When Assigning a Station

Appointments can be assigned to stations in two ways:

#### Option 1: From Floor View Page

```typescript
// Assign appointment to station
PATCH /appointments/:id
{
  "stationId": "station-123"
}
// Updates appointment.stationId
// Station card automatically shows the appointment
```

#### Option 2: When Starting Service

```typescript
// In start-service-dialog
PATCH /appointments/:id
{
  "status": "in_progress",
  "stationId": "station-123",  // Assign station when starting
  "startedAt": "2024-01-15T10:00:00Z"
}
```

### Station Becomes Available Again

When an appointment completes, the station automatically becomes available:

```typescript
// When appointment completes
PATCH /appointments/:id
{
  "status": "completed",
  "completedAt": "2024-01-15T10:45:00Z"
}
// Station automatically becomes available (no appointment in progress)
```

---

## Status Transitions

### Appointment Status → Station Runtime Status

```
Appointment Status Timeline:
  booked → confirmed → checked_in → in_progress → completed
                                        ↓
                                   (time-based)

Station Status Mapping:
  booked/confirmed/checked_in (before start) → available (no current appointment)
  in_progress (during time)                  → occupied (service in progress)
  completed/cancelled/no_show                → available (appointment done)
```

### Database Status → Station Runtime Status

```
Station DB Status:
  active         → Can be available/occupied (depends on appointments)
  out_of_service → Always out_of_service (regardless of appointments)
```

---

## UI Display

### Station Card Component

The `StationCard` component displays runtime status with appropriate UI:

```typescript
const statusConfig: Record<FloorViewStatus, { bg; border; text; label }> = {
  available: {
    bg: 'bg-green-50',
    label: 'Available',
    action: 'Assign', // Show assign button
  },
  occupied: {
    bg: 'bg-blue-50',
    label: 'Occupied',
    action: 'View/Done', // Show progress and complete button
  },
  out_of_service: {
    bg: 'bg-gray-50',
    label: 'Out of Service',
    action: 'None', // Show maintenance icon
  },
};
```

---

## API Endpoints

### Get Floor View (Stations with Runtime Status)

```typescript
GET /dashboard/floor-view?branchId=xxx&date=2024-01-15

Response:
{
  "success": true,
  "data": {
    "stations": [
      {
        "id": "station-1",
        "name": "Chair 1",
        "stationType": { "id", "name", "color" },
        "displayOrder": 1,
        "status": "occupied",  // Runtime status
        "appointment": {
          "id": "apt-123",
          "customerName": "John Doe",
          "stylistName": "Jane Smith",
          "assistantNames": ["Bob Johnson"],
          "services": ["Haircut", "Shampoo"],
          "startedAt": "2024-01-15T10:00:00Z",
          "estimatedEndTime": "2024-01-15T10:45:00Z",
          "scheduledTime": "10:00",
          "elapsedMinutes": 30,
          "remainingMinutes": 15,
          "progressPercent": 67,
          "isOvertime": false
        }
      }
    ],
    "summary": {
      "total": 5,
      "available": 2,
      "occupied": 2,
      "outOfService": 1
    }
  }
}
```

### Update Station Status (DB Status)

```typescript
PATCH /stations/:id

Request:
{
  "status": "out_of_service"  // or "active"
}

Response:
{
  "success": true,
  "data": {
    "id": "station-1",
    "name": "Chair 1",
    "status": "out_of_service"  // DB status
  }
}
```

### Assign Appointment to Station

```typescript
PATCH /appointments/:id

Request:
{
  "stationId": "station-123"
}

Response:
{
  "success": true,
  "data": {
    "id": "apt-123",
    "stationId": "station-123",
    // ... other appointment fields
  }
}
```

---

## Summary

| Aspect         | Database Status (`StationStatus`) | Runtime Status (`FloorViewStatus`)        |
| -------------- | --------------------------------- | ----------------------------------------- |
| **Storage**    | Persisted in DB                   | Computed on each request                  |
| **Values**     | `active`, `out_of_service`        | `available`, `occupied`, `out_of_service` |
| **Updated By** | Admin via API                     | Automatic (based on appointments)         |
| **Frequency**  | Rarely (maintenance)              | Constantly (every request)                |
| **Determines** | Can station be used?              | What is station doing right now?          |
| **Model**      | Station model in DB               | Computed from station appointments        |

---

## Implementation Checklist

- [x] Database status (`active`/`out_of_service`) stored in Station model
- [x] Appointments linked to stations via `stationId` field
- [x] Runtime status computed from appointment status and current time
- [x] Three runtime statuses: `available`, `occupied`, `out_of_service`
- [x] Station card displays runtime status with appropriate UI
- [x] Floor view summary shows count of each runtime status
- [x] Appointment assignment from floor view page
- [x] Appointment assignment when starting service
- [x] Station becomes available when appointment completes

---

## References

- **Station Types**: `apps/web/src/types/stations.ts`
- **Dashboard Types**: `apps/web/src/types/dashboard.ts`
- **Dashboard Service**: `apps/api/src/modules/dashboard/dashboard.service.ts`
- **Station Card Component**: `apps/web/src/app/(protected)/today/components/station-card.tsx`
- **Start Service Dialog**: `apps/web/src/components/ux/dialogs/start-service-dialog.tsx`
- **Prisma Schema**: `apps/api/prisma/schema.prisma` (Station and Appointment models)
