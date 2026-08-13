/** Small UTC-based calendar-day helpers (avoids server-timezone drift). */

export function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

/** 0 = Monday … 6 = Sunday (chart-friendly ordering). */
export function mondayIndex(dayKey: string): number {
  const jsDay = parseDayKey(dayKey).getUTCDay(); // 0 = Sun … 6 = Sat
  return (jsDay + 6) % 7;
}

/** Inclusive list of YYYY-MM-DD keys from `start` to `end`. */
export function dayRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    keys.push(toDayKey(d));
  }
  return keys;
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
