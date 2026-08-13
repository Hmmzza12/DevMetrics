import type { CommitPatterns, HeatmapDay, LanguageBreakdown } from '@/api/types';

/**
 * Shaping helpers for the comparison page. Kept out of the components so the
 * paired charts stay presentational, and so the shared-scale rules (one
 * intensity denominator across both users) live in one place.
 */

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export interface MonthlyRow {
  month: string;
  a: number | null;
  b: number | null;
}

function monthKey(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

function bucketByMonth(days: HeatmapDay[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const d of days) {
    const key = monthKey(d.date);
    out.set(key, (out.get(key) ?? 0) + d.count);
  }
  return out;
}

function labelFor(key: string): string {
  const month = Number(key.slice(5, 7));
  return MONTH_LABELS[month - 1] ?? key;
}

/**
 * Monthly commit totals for both users over the window covered by their
 * heatmaps. A side with no data yet yields `null` so Recharts draws no line for
 * it rather than a misleading run of zeroes.
 */
export function monthlySeries(
  daysA: HeatmapDay[] | null,
  daysB: HeatmapDay[] | null,
): MonthlyRow[] {
  const a = daysA ? bucketByMonth(daysA) : null;
  const b = daysB ? bucketByMonth(daysB) : null;

  const keys = [...new Set([...(a?.keys() ?? []), ...(b?.keys() ?? [])])].sort();

  return keys.map((key) => ({
    month: labelFor(key),
    a: a ? (a.get(key) ?? 0) : null,
    b: b ? (b.get(key) ?? 0) : null,
  }));
}

/** Busiest single day across every supplied heatmap — the shared scale. */
export function sharedDailyMax(...dayLists: (HeatmapDay[] | null | undefined)[]): number {
  let max = 0;
  for (const days of dayLists) {
    if (!days) continue;
    for (const d of days) if (d.count > max) max = d.count;
  }
  return Math.max(1, max);
}

/** Busiest single hour cell across every supplied grid — the shared scale. */
export function sharedGridMax(...grids: (number[][] | null | undefined)[]): number {
  let max = 0;
  for (const grid of grids) {
    if (!grid) continue;
    for (const row of grid) for (const v of row) if (v > max) max = v;
  }
  return Math.max(1, max);
}

export interface DayOfWeekRow {
  day: string;
  a: number | null;
  b: number | null;
  [key: string]: string | number | null;
}

/** Day-of-week counts merged into one row per day for a grouped bar chart. */
export function dayOfWeekRows(
  patternsA: CommitPatterns | null,
  patternsB: CommitPatterns | null,
): DayOfWeekRow[] {
  const source = patternsA?.by_day_of_week ?? patternsB?.by_day_of_week ?? [];
  const byDayA = new Map(patternsA?.by_day_of_week.map((d) => [d.day, d.count]) ?? []);
  const byDayB = new Map(patternsB?.by_day_of_week.map((d) => [d.day, d.count]) ?? []);

  return source.map(({ day }) => ({
    day,
    a: patternsA ? (byDayA.get(day) ?? 0) : null,
    b: patternsB ? (byDayB.get(day) ?? 0) : null,
  }));
}

export interface LanguageRow {
  language: string;
  /** Percentage, or null when this user doesn't use the language at all. */
  a: number | null;
  b: number | null;
}

/**
 * Every language either user has, ordered by combined share. A language unique
 * to one user gets `null` for the other, which the legend renders as "—".
 */
export function mergedLanguageRows(
  langsA: LanguageBreakdown[] | null,
  langsB: LanguageBreakdown[] | null,
): LanguageRow[] {
  const a = new Map(langsA?.map((l) => [l.language, l.percentage]) ?? []);
  const b = new Map(langsB?.map((l) => [l.language, l.percentage]) ?? []);
  const names = [...new Set([...a.keys(), ...b.keys()])];

  return names
    .map((language) => ({
      language,
      a: a.get(language) ?? null,
      b: b.get(language) ?? null,
    }))
    .sort(
      (x, y) =>
        (y.a ?? 0) + (y.b ?? 0) - ((x.a ?? 0) + (x.b ?? 0)) ||
        x.language.localeCompare(y.language),
    );
}
