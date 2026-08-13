import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.ts';
import {
  commitActivity,
  pullRequests,
  repoLanguages,
  repos,
} from '../db/schema.ts';
import {
  addDays,
  DAY_LABELS,
  dayRange,
  mondayIndex,
  parseDayKey,
  toDayKey,
} from '../lib/dates.ts';

const MS_PER_HOUR = 1000 * 60 * 60;
const HORIZON_DAYS = 364; // ~12 months, inclusive of today → 365 days

// ── Streaks ──────────────────────────────────────────────────────────────
function computeStreaks(activeDays: Set<string>): {
  current: number;
  longest: number;
} {
  if (activeDays.size === 0) return { current: 0, longest: 0 };

  const sorted = [...activeDays].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseDayKey(sorted[i - 1]);
    const cur = parseDayKey(sorted[i]);
    const gapDays = Math.round(
      (cur.getTime() - prev.getTime()) / (24 * MS_PER_HOUR),
    );
    if (gapDays === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak: count back from today; allow "today not yet committed".
  const today = new Date();
  let cursor = toDayKey(today);
  if (!activeDays.has(cursor)) {
    cursor = toDayKey(addDays(today, -1)); // grace for today
  }
  let current = 0;
  while (activeDays.has(cursor)) {
    current += 1;
    cursor = toDayKey(addDays(parseDayKey(cursor), -1));
  }

  return { current, longest };
}

// ── /api/overview ──────────────────────────────────────────────────────────
export async function getOverview(userId: number, followers: number) {
  const [activity, repoRows] = await Promise.all([
    db.query.commitActivity.findMany({
      where: eq(commitActivity.ownerId, userId),
    }),
    db.query.repos.findMany({ where: eq(repos.ownerId, userId) }),
  ]);

  const totalCommits = activity.reduce((s, a) => s + a.count, 0);
  const totalStars = repoRows.reduce((s, r) => s + r.stars, 0);
  const activeDays = new Set(activity.filter((a) => a.count > 0).map((a) => a.date));
  const { current, longest } = computeStreaks(activeDays);

  return {
    total_commits: totalCommits,
    repo_count: repoRows.length,
    total_stars: totalStars,
    followers,
    current_streak: current,
    longest_streak: longest,
  };
}

// ── /api/heatmap ─────────────────────────────────────────────────────────────
export async function getHeatmap(userId: number) {
  const activity = await db.query.commitActivity.findMany({
    where: eq(commitActivity.ownerId, userId),
  });
  const counts = new Map(activity.map((a) => [a.date, a.count]));

  const end = new Date();
  const start = addDays(end, -HORIZON_DAYS);
  const days = dayRange(parseDayKey(toDayKey(start)), parseDayKey(toDayKey(end)));

  return {
    days: days.map((date) => ({ date, count: counts.get(date) ?? 0 })),
  };
}

// ── /api/languages ───────────────────────────────────────────────────────────
export async function getLanguages(userId: number) {
  const rows = await db
    .select({
      language: repoLanguages.language,
      bytes: repoLanguages.bytes,
      repoId: repoLanguages.repoId,
    })
    .from(repoLanguages)
    .innerJoin(repos, eq(repoLanguages.repoId, repos.id))
    .where(eq(repos.ownerId, userId));

  const byLang = new Map<string, number>();
  for (const r of rows) {
    byLang.set(r.language, (byLang.get(r.language) ?? 0) + r.bytes);
  }
  const total = [...byLang.values()].reduce((s, b) => s + b, 0);

  const languages = [...byLang.entries()]
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: total > 0 ? (bytes / total) * 100 : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  return { total_bytes: total, languages };
}

/** Repos that use a given language — backs the "click a slice" interaction. */
export async function getReposByLanguage(userId: number, language: string) {
  const rows = await db
    .select({
      id: repos.id,
      name: repos.name,
      stars: repos.stars,
      language: repoLanguages.language,
      bytes: repoLanguages.bytes,
    })
    .from(repoLanguages)
    .innerJoin(repos, eq(repoLanguages.repoId, repos.id))
    .where(eq(repos.ownerId, userId));

  const target = language.toLowerCase();
  return rows
    .filter((r) => r.language.toLowerCase() === target)
    .sort((a, b) => b.bytes - a.bytes)
    .map((r) => ({ id: r.id, name: r.name, stars: r.stars, bytes: r.bytes }));
}

// ── /api/commit-patterns ─────────────────────────────────────────────────────
export async function getCommitPatterns(userId: number) {
  const activity = await db.query.commitActivity.findMany({
    where: eq(commitActivity.ownerId, userId),
  });

  const byDayOfWeek = Array.from({ length: 7 }, (_, i) => ({
    day: DAY_LABELS[i],
    count: 0,
  }));
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  // grid[dayOfWeek][hour] — Mon..Sun × 0..23
  const grid: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0),
  );

  for (const a of activity) {
    const dow = mondayIndex(a.date);
    byDayOfWeek[dow].count += a.count;

    let hours: Record<string, number> = {};
    try {
      hours = JSON.parse(a.hourDistribution) as Record<string, number>;
    } catch {
      hours = {};
    }
    for (let h = 0; h < 24; h++) {
      const c = hours[String(h)] ?? 0;
      byHour[h].count += c;
      grid[dow][h] += c;
    }
  }

  return { by_day_of_week: byDayOfWeek, by_hour: byHour, grid };
}

// ── /api/prs ─────────────────────────────────────────────────────────────────
export async function getPRMetrics(userId: number) {
  const prs = await db.query.pullRequests.findMany({
    where: eq(pullRequests.ownerId, userId),
  });

  const merged = prs.filter((p) => p.wasMerged && p.mergedAt && p.openedAt);
  const mergeTimes = merged.map(
    (p) => (p.mergedAt!.getTime() - p.openedAt!.getTime()) / MS_PER_HOUR,
  );
  const reviewed = prs.filter((p) => p.firstReviewAt && p.openedAt);
  const reviewTimes = reviewed.map(
    (p) => (p.firstReviewAt!.getTime() - p.openedAt!.getTime()) / MS_PER_HOUR,
  );

  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;

  // Monthly PR counts for the last 12 months (YYYY-MM buckets).
  const now = new Date();
  const months: { month: string; count: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    idx.set(key, months.length);
    months.push({ month: key, count: 0 });
  }
  for (const p of prs) {
    if (!p.openedAt) continue;
    const key = `${p.openedAt.getUTCFullYear()}-${String(p.openedAt.getUTCMonth() + 1).padStart(2, '0')}`;
    const i = idx.get(key);
    if (i !== undefined) months[i].count += 1;
  }

  return {
    total_prs: prs.length,
    merged_count: merged.length,
    merge_rate: prs.length ? (merged.length / prs.length) * 100 : 0,
    avg_open_to_merge_hours: avg(mergeTimes),
    avg_first_review_hours: avg(reviewTimes),
    monthly: months,
  };
}

// ── /api/repos ───────────────────────────────────────────────────────────────
export async function getRepos(userId: number) {
  const rows = await db.query.repos.findMany({
    where: eq(repos.ownerId, userId),
    orderBy: desc(repos.stars),
  });

  return {
    repos: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      language: r.primaryLanguage,
      stars: r.stars,
      is_private: r.isPrivate,
      commit_count: r.commitCount,
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : null,
    })),
  };
}
