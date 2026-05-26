# Common Mistakes & Gotchas

This document logs recurring issues and their correct solutions to prevent repeating the same mistakes.

---

## 1. DateTime vs Time String Timezone Issues

### The Problem

When working with appointment times, there are two different storage formats:

1. **Time Strings** (e.g., `scheduledTime`, `scheduledEndTime` on `Appointment`)
   - Stored as `VARCHAR(5)` in the database (e.g., `"12:30"`, `"13:15"`)
   - Represents **local time** (IST for this application)
   - No timezone conversion needed

2. **DateTime Fields** (e.g., `scheduledStartTime`, `scheduledEndTime` on `AppointmentService`)
   - Stored as `TIMESTAMP` in the database
   - Stored in **UTC** (e.g., `2026-05-14T07:00:00.000Z` for 12:30 IST)
   - Requires timezone conversion when extracting time

### The Mistake

```typescript
// ❌ WRONG: Extracting UTC hours from a DateTime stored in UTC
const aptStartTime = `${earliestStart.getUTCHours().toString().padStart(2, '0')}:${earliestStart.getUTCMinutes().toString().padStart(2, '0')}`;
// Result: "07:00" (UTC) instead of "12:30" (IST)
```

This causes time comparisons to fail because:

- Request time: `"12:35"` (local time string)
- Appointment time: `"07:00"` (incorrectly extracted UTC time)
- Overlap check: `12:35 < 07:45` = false (WRONG!)

### The Correct Approach

**Option 1: Use the appointment's time strings (RECOMMENDED)**

```typescript
// ✅ CORRECT: Use appointment's scheduledTime/scheduledEndTime (local time strings)
const aptStartTime = apt.scheduledTime; // "12:30"
const aptEndTime = apt.scheduledEndTime; // "13:15"
```

**Option 2: Convert DateTime to local time (if per-service times are needed)**

```typescript
// ✅ CORRECT: Convert UTC DateTime to local time
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const timezone = 'Asia/Kolkata';
const localTime = toZonedTime(earliestStart, timezone);
const aptStartTime = format(localTime, 'HH:mm'); // "12:30"
```

### Where This Applies

- `availability.service.ts` - `checkStylistAvailability()`, `isStylistAvailable()`, `getStylistBusySlots()`
- Any code comparing time strings with DateTime fields
- Calendar/scheduling conflict detection

### Key Rule

> **When comparing times for overlap/conflict detection, ensure both times are in the same format (either both local time strings OR both properly converted from UTC).**

---

## 2. Prisma Date Comparison

### The Problem

Prisma's `DateTime` type with `@db.Date` stores dates at UTC midnight. When querying, you must pass a UTC midnight Date object.

### The Correct Approach

```typescript
// ✅ CORRECT: Parse date string to UTC midnight
function parseToUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// Usage in Prisma query
const dateObj = parseToUTCDate('2026-05-14'); // 2026-05-14T00:00:00.000Z
const appointments = await prisma.appointment.findMany({
  where: { scheduledDate: dateObj },
});
```

```typescript
// ❌ WRONG: Using local Date constructor
const dateObj = new Date('2026-05-14'); // May be 2026-05-13T18:30:00.000Z in IST!
```

---

## 3. Staff ID vs User ID

### The Problem

The `StaffProfile` model has both:

- `id` - The staff profile ID
- `userId` - The user ID (references `User.id`)

Appointments use `userId` as `stylistId`, not the staff profile ID.

### The Correct Approach

```typescript
// ✅ CORRECT: Use userId for appointment stylist assignment
const stylistId = staffProfile.userId;

// ❌ WRONG: Using staff profile ID
const stylistId = staffProfile.id;
```

### Where This Applies

- Staff dropdown selections
- Appointment creation/update
- Stylist availability checks

---

## 4. React Query Stale Closures with useState

### The Problem

Using `useState` to track values that are then passed to React Query hooks can cause stale closure issues where the hook receives old values.

### The Mistake

```typescript
// ❌ WRONG: Intermediate state causes stale values
const [checkedParams, setCheckedParams] = useState(null);

useEffect(() => {
  setCheckedParams({ date, time, duration });
}, [date, time, duration]);

// Hook may receive old checkedParams due to async state update
const { data } = useQuery({
  queryKey: ['availability', checkedParams],
  queryFn: () => checkAvailability(checkedParams),
  enabled: !!checkedParams,
});
```

### The Correct Approach

```typescript
// ✅ CORRECT: Pass props directly to the hook
const { data } = useQuery({
  queryKey: ['availability', stylistId, date, time, duration],
  queryFn: () => checkAvailability({ stylistId, date, time, duration }),
  enabled: !!stylistId && !!date && !!time && duration > 0,
});
```

React Query handles caching based on the query key, so intermediate state is unnecessary.

---

## 5. Multi-Service Appointment Busy Slots Calculation

### The Problem

When calculating busy slots for a stylist in a multi-service appointment, the code was returning the **entire appointment duration** instead of just the **time slots for that stylist's assigned services**.

Example:

- Appointment: 13:45 - 14:25 (40 min total)
- Service 1: Threading (10 min), assigned to Stylist 1 → 13:45 - 13:55
- Service 2: Cleanup (30 min), assigned to Stylist 3 → 13:55 - 14:25

The old code returned 13:45 - 14:25 for Stylist 1, but they're only busy 13:45 - 13:55.

### The Mistake

```typescript
// ❌ WRONG: Using appointment's overall times for all stylists
const aptStartTime = apt.scheduledTime; // "13:45"
const aptEndTime = apt.scheduledEndTime; // "14:25"
busySlots.push({ startTime: aptStartTime, endTime: aptEndTime });
```

### The Correct Approach

```typescript
// ✅ CORRECT: Calculate per-service times based on sequence and runParallel
function calculateServiceSchedules(appointmentStartTime: string, services: Service[]) {
  const sortedServices = [...services].sort((a, b) => a.sequence - b.sequence);
  const schedules = [];
  let currentTime = appointmentStartTime;
  let previousServiceStartTime = appointmentStartTime;

  for (let i = 0; i < sortedServices.length; i++) {
    const service = sortedServices[i];
    let serviceStartTime: string;

    if (i === 0) {
      serviceStartTime = appointmentStartTime;
    } else if (service.runParallel) {
      serviceStartTime = previousServiceStartTime;
    } else {
      serviceStartTime = currentTime;
    }

    const serviceEndTime = addMinutes(serviceStartTime, service.durationMinutes);
    schedules.push({ id: service.id, startTime: serviceStartTime, endTime: serviceEndTime });

    previousServiceStartTime = serviceStartTime;
    if (serviceEndTime > currentTime) currentTime = serviceEndTime;
  }
  return schedules;
}

// Then filter to only the stylist's assigned services
const stylistSchedules = serviceSchedules.filter((s) => stylistServiceIds.includes(s.id));
const earliestStart = Math.min(...stylistSchedules.map((s) => s.startTime));
const latestEnd = Math.max(...stylistSchedules.map((s) => s.endTime));
```

### Where This Applies

- `availability.service.ts` - `getStylistBusySlots()`, `isStylistAvailable()`, `checkStylistAvailability()`
- Any conflict detection for multi-service appointments
- Calendar display of stylist availability

### Key Rule

> **For multi-service appointments, always calculate per-service time slots based on sequence and runParallel flags, then filter to only the services assigned to the target stylist.**

---

## 6. [Template for New Entries]

### The Problem

[Describe the issue]

### The Mistake

```typescript
// ❌ WRONG: [Show the incorrect code]
```

### The Correct Approach

```typescript
// ✅ CORRECT: [Show the correct code]
```

### Where This Applies

[List affected areas]

---

## Quick Reference

| Issue                     | Wrong                         | Correct                                                 |
| ------------------------- | ----------------------------- | ------------------------------------------------------- |
| DateTime to time string   | `getUTCHours()`               | Use appointment's time strings or convert with timezone |
| Date comparison in Prisma | `new Date('2026-05-14')`      | `new Date(Date.UTC(2026, 4, 14))`                       |
| Staff ID for appointments | `staffProfile.id`             | `staffProfile.userId`                                   |
| React Query with state    | `useState` + `useEffect`      | Pass props directly to hook                             |
| Multi-service busy slots  | Use full appointment duration | Calculate per-service times based on sequence           |
