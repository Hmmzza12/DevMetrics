import { eq } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { commitActivity, users, type User } from '../db/schema.ts';
import { DAY_LABELS, mondayIndex, parseDayKey } from '../lib/dates.ts';
import {
  generateSummary,
  type SummaryStats,
} from './anthropic.ts';
import {
  getCommitPatterns,
  getLanguages,
  getOverview,
  getPRMetrics,
} from './metrics.ts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Human-readable busiest month + weekday from the user's commit activity. */
async function computeBusiestPeriods(
  userId: number,
): Promise<{ busiestMonth: string | null; busiestDay: string | null }> {
  const activity = await db.query.commitActivity.findMany({
    where: eq(commitActivity.ownerId, userId),
  });

  const byMonth = new Map<string, number>();
  const byWeekday = new Array(7).fill(0);

  for (const a of activity) {
    const d = parseDayKey(a.date);
    const monthKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + a.count);
    byWeekday[mondayIndex(a.date)] += a.count;
  }

  let busiestMonth: string | null = null;
  let maxMonth = 0;
  for (const [key, count] of byMonth) {
    if (count > maxMonth) {
      maxMonth = count;
      const [year, month] = key.split('-').map(Number);
      busiestMonth = `${MONTH_NAMES[month]} ${year}`;
    }
  }

  let busiestDay: string | null = null;
  let maxDay = 0;
  byWeekday.forEach((count, i) => {
    if (count > maxDay) {
      maxDay = count;
      busiestDay = DAY_LABELS[i];
    }
  });

  return { busiestMonth, busiestDay };
}

/**
 * Return the cached AI summary if it's newer than the last sync, otherwise
 * generate a fresh one and cache it on the user row.
 *
 * The cache key is `aiSummaryAt >= lastSyncedAt` — a new sync invalidates the
 * summary so it regenerates on the next request (spec: regenerate after sync).
 */
export async function getOrGenerateSummary(user: User): Promise<{
  summary: string;
  cached: boolean;
  generated_at: string;
}> {
  const fresh =
    user.aiSummary &&
    user.aiSummaryAt &&
    user.lastSyncedAt &&
    user.aiSummaryAt.getTime() >= user.lastSyncedAt.getTime();

  if (fresh) {
    return {
      summary: user.aiSummary!,
      cached: true,
      generated_at: user.aiSummaryAt!.toISOString(),
    };
  }

  const [overview, langs, prs, , periods] = await Promise.all([
    getOverview(user.id, user.followers),
    getLanguages(user.id),
    getPRMetrics(user.id),
    getCommitPatterns(user.id),
    computeBusiestPeriods(user.id),
  ]);

  const stats: SummaryStats = {
    username: user.username,
    totalCommits: overview.total_commits,
    repoCount: overview.repo_count,
    totalStars: overview.total_stars,
    currentStreak: overview.current_streak,
    longestStreak: overview.longest_streak,
    primaryLanguage: langs.languages[0]?.language ?? null,
    topLanguages: langs.languages.map((l) => ({
      language: l.language,
      percentage: l.percentage,
    })),
    busiestMonth: periods.busiestMonth,
    busiestDay: periods.busiestDay,
    prs: {
      total: prs.total_prs,
      mergeRate: prs.merge_rate,
      avgOpenToMergeHours: prs.avg_open_to_merge_hours,
      avgFirstReviewHours: prs.avg_first_review_hours,
    },
  };

  const summary = await generateSummary(stats);
  const generatedAt = new Date();

  await db
    .update(users)
    .set({ aiSummary: summary, aiSummaryAt: generatedAt })
    .where(eq(users.id, user.id));

  return {
    summary,
    cached: false,
    generated_at: generatedAt.toISOString(),
  };
}
