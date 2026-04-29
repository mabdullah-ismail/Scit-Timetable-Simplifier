/**
 * CancelledClasses — Tracks which class slots have been cancelled for a given date.
 * Cancellations are date-scoped so they don't affect future weeks.
 * Stored in localStorage with automatic cleanup of past dates.
 */

const STORAGE_KEY = 'cancelled-classes';

/** Generate a unique key for a specific slot on a specific date */
export function cancelKey(date: string, courseCode: string, startHour: number, startMin: number): string {
  return `${date}::${courseCode}::${startHour}:${startMin}`;
}

/** Get today's date as YYYY-MM-DD */
export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Load all cancelled keys from storage */
function loadCancelled(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: string[] = JSON.parse(raw);
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

/** Save cancelled keys to storage */
function saveCancelled(keys: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch { /* quota exceeded — non-critical */ }
}

/** Cancel a class slot for a specific date */
export function cancelClass(date: string, courseCode: string, startHour: number, startMin: number): void {
  const keys = loadCancelled();
  keys.add(cancelKey(date, courseCode, startHour, startMin));
  saveCancelled(keys);
}

/** Undo cancellation of a class slot */
export function uncancelClass(date: string, courseCode: string, startHour: number, startMin: number): void {
  const keys = loadCancelled();
  keys.delete(cancelKey(date, courseCode, startHour, startMin));
  saveCancelled(keys);
}

/** Check if a class slot is cancelled for a specific date */
export function isClassCancelled(date: string, courseCode: string, startHour: number, startMin: number): boolean {
  const keys = loadCancelled();
  return keys.has(cancelKey(date, courseCode, startHour, startMin));
}

/** Get all cancelled keys for a specific date (for filtering reminders) */
export function getCancelledForDate(date: string): Set<string> {
  const allKeys = loadCancelled();
  const dateKeys = new Set<string>();
  for (const key of allKeys) {
    if (key.startsWith(date + '::')) {
      dateKeys.add(key);
    }
  }
  return dateKeys;
}

/**
 * Cleanup old cancellations (older than 7 days) to prevent localStorage bloat.
 * Call this on app startup.
 */
export function cleanupOldCancellations(): void {
  const keys = loadCancelled();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

  const cleaned = new Set<string>();
  for (const key of keys) {
    const dateStr = key.split('::')[0];
    if (dateStr >= cutoffStr) {
      cleaned.add(key);
    }
  }

  if (cleaned.size !== keys.size) {
    saveCancelled(cleaned);
  }
}
