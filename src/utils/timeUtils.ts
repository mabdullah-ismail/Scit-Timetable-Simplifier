import { type Course } from './dataParser';

export interface ParsedSlot {
  day: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  venue: string;
  course: Course;
  startLabel: string;
  endLabel: string;
}

const DAY_MAP: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
};

function parseTime(timeStr: string): { h: number; m: number } | null {
  // Matches patterns like "09:30 AM", "2:00 PM", "12:30", "11:0 AM" (single-digit minutes)
  const match = timeStr.match(/(\d{1,2}):(\d{1,2})\s*(AM|PM|am|pm)?/);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return { h, m };
}

export function parseSlot(timeStr: string, venue: string, course: Course): ParsedSlot | null {
  // Handle multiple formats:
  // "Monday: 09:30 AM – 11:00 AM"   (colon, en-dash)
  // "Monday 02:00 PM-03:30 PM"       (no colon, hyphen)
  // "Wednesday 11:00 AM- 12:30 PM"   (no colon, hyphen with space)
  // "Friday 11:00 AM to 12:30 PM"    (no colon, 'to')
  // "Tuesday  11:00 AM-12:30 PM"     (double space)

  // Bail out early for slots with no schedule data
  if (!timeStr || /no timetable/i.test(timeStr) || /tba/i.test(timeStr)) return null;

  // Extract day — word at start, optionally followed by colon
  const dayMatch = timeStr.match(/^([A-Za-z]+)\s*:?\s*/);
  if (!dayMatch) return null;

  const day = dayMatch[1].toLowerCase();
  const dayIndex = DAY_MAP[day];
  if (dayIndex === undefined) return null;

  // Everything after day (and optional colon)
  const rest = timeStr.slice(dayMatch[0].length).trim();

  // Split on en-dash, hyphen (with optional surrounding spaces), or ' to '
  const parts = rest.split(/\s*(?:–|-|to)\s*/i);
  if (parts.length < 2) return null;

  let startStr = parts[0].trim();
  let endStr = parts[1].trim();

  // If start has no AM/PM but end does, borrow it
  const endPeriodMatch = endStr.match(/(AM|PM)$/i);
  const startHasPeriod = /AM|PM/i.test(startStr);
  if (!startHasPeriod && endPeriodMatch) {
    startStr = startStr + ' ' + endPeriodMatch[1];
  }

  const start = parseTime(startStr);
  const end = parseTime(endStr);
  if (!start || !end) return null;

  const fmt = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${period}`;
  };

  return {
    day: dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase(),
    startHour: start.h,
    startMin: start.m,
    endHour: end.h,
    endMin: end.m,
    venue,
    course,
    startLabel: fmt(start.h, start.m),
    endLabel: fmt(end.h, end.m),
  };
}

export function getAllSlotsForDay(courses: Course[], dayName: string): ParsedSlot[] {
  const slots: ParsedSlot[] = [];
  for (const course of courses) {
    for (const slot of course.timetable) {
      const parsed = parseSlot(slot.time, slot.venue, course);
      if (parsed && parsed.day.toLowerCase() === dayName.toLowerCase()) {
        slots.push(parsed);
      }
    }
  }
  return slots.sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin));
}

export function getTodayDayName(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export function classifySlot(slot: ParsedSlot, now: Date): 'past' | 'live' | 'upcoming' {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = slot.startHour * 60 + slot.startMin;
  const endMins = slot.endHour * 60 + slot.endMin;
  if (nowMins >= endMins) return 'past';
  if (nowMins >= startMins) return 'live';
  return 'upcoming';
}

export function minutesUntil(slot: ParsedSlot, now: Date): number {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = slot.startHour * 60 + slot.startMin;
  return startMins - nowMins;
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return Promise.resolve('denied');
  return Notification.requestPermission();
}

export function scheduleClassReminder(slot: ParsedSlot, minutesBefore = 10): void {
  const now = new Date();
  const minsUntilStart = minutesUntil(slot, now);
  const delay = (minsUntilStart - minutesBefore) * 60 * 1000;
  if (delay <= 0) return;

  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(`📚 Class starting in ${minutesBefore} min`, {
        body: `${slot.course.course_name} at ${slot.venue}`,
        icon: '/favicon.svg',
      });
    }
  }, delay);
}
