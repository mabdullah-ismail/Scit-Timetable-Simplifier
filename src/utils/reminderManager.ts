/**
 * ReminderManager — Handles scheduling, deduplication, and persistence
 * of class reminders using Service Worker notifications when available.
 */
import { type ParsedSlot, minutesUntil } from './timeUtils';

// ── Module-level state ──────────────────────────────────────────────
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const STORAGE_KEY = 'scheduled-reminders';

// ── Helpers ─────────────────────────────────────────────────────────

/** Unique key for a slot so we can deduplicate */
function slotKey(slot: ParsedSlot): string {
  return `${slot.day}-${slot.startHour}:${slot.startMin}-${slot.course.course_code}`;
}

/** Persist which reminders are currently scheduled (survives refresh) */
function persistScheduledKeys(keys: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch { /* quota exceeded — non-critical */ }
}

/** Load previously scheduled keys */
function loadScheduledKeys(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

// ── Notification delivery ───────────────────────────────────────────

/**
 * Show a notification using the Service Worker registration if available,
 * falling back to the basic Notification API.
 * SW notifications work even when the tab is in the background.
 */
async function showNotification(title: string, body: string): Promise<void> {
  if (Notification.permission !== 'granted') return;

  try {
    // Prefer Service Worker — works in background tabs
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `class-reminder-${Date.now()}`, // unique tag prevents stacking
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { url: '/' },
      });
      return;
    }
  } catch {
    // SW not available — fall through to basic API
  }

  // Fallback: basic Notification API (only works when tab is focused)
  new Notification(title, {
    body,
    icon: '/favicon.svg',
  });
}

// ── Public API ──────────────────────────────────────────────────────

export interface ReminderResult {
  scheduled: number;   // number of reminders successfully scheduled
  alreadyPast: number; // classes whose reminder window has already passed
  duplicates: number;  // skipped because already scheduled
}

/**
 * Schedule reminders for the given slots.
 * - Deduplicates against already-scheduled reminders
 * - Persists schedule to localStorage (survives page refresh)
 * - Uses Service Worker notifications when possible
 *
 * @param slots       Today's class slots
 * @param minutesBefore  How many minutes before class to fire the reminder
 * @returns Summary of what was scheduled
 */
export function scheduleReminders(
  slots: ParsedSlot[],
  minutesBefore = 10
): ReminderResult {
  const result: ReminderResult = { scheduled: 0, alreadyPast: 0, duplicates: 0 };
  const now = new Date();
  const existingKeys = new Set(loadScheduledKeys());
  const newKeys: string[] = [...existingKeys];

  for (const slot of slots) {
    const key = slotKey(slot);

    // Skip if already scheduled
    if (activeTimers.has(key)) {
      result.duplicates++;
      continue;
    }

    const minsUntilStart = minutesUntil(slot, now);
    const delayMs = (minsUntilStart - minutesBefore) * 60 * 1000;

    // Reminder window already passed
    if (delayMs <= 0) {
      result.alreadyPast++;
      continue;
    }

    // Schedule the timer
    const timerId = setTimeout(() => {
      showNotification(
        `📚 Class in ${minutesBefore} min`,
        `${slot.course.course_name} · ${slot.venue || 'TBA'} · ${slot.course.faculty || ''}`
      );
      // Cleanup after firing
      activeTimers.delete(key);
      const keys = loadScheduledKeys().filter(k => k !== key);
      persistScheduledKeys(keys);
    }, delayMs);

    activeTimers.set(key, timerId);
    if (!existingKeys.has(key)) {
      newKeys.push(key);
    }
    result.scheduled++;
  }

  persistScheduledKeys(newKeys);
  return result;
}

/**
 * Clear all scheduled reminders and reset persistence.
 */
export function clearAllReminders(): void {
  for (const [key, timerId] of activeTimers) {
    clearTimeout(timerId);
    activeTimers.delete(key);
  }
  persistScheduledKeys([]);
}

/**
 * Get count of currently active (pending) reminders.
 */
export function getActiveReminderCount(): number {
  return activeTimers.size;
}
