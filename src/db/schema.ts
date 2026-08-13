import { sql } from 'drizzle-orm';
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

/**
 * DevMetrics schema (Drizzle / libSQL).
 *
 * Timestamp columns are stored as integer epoch-millis (`mode: 'timestamp_ms'`)
 * so Drizzle hands us `Date` objects. Booleans are integer 0/1. `commit_activity.date`
 * is a plain `YYYY-MM-DD` text key (calendar day, not an instant).
 */

// ── users ────────────────────────────────────────────────────────────────
//
// One table holds both OAuth accounts and public-lookup profiles. This lets the
// entire sync pipeline + metrics aggregation (all keyed by `users.id`) be reused
// unchanged for public lookups — no parallel tables. Separation is enforced by:
//   • `is_public_lookup`      — public rows are flagged and can never log in.
//   • `access_token` nullable — public rows have no token (synced via GITHUB_PAT).
//   • `github_id` nullable    — public rows leave it NULL, so a public lookup of
//     someone who is *also* an OAuth user never collides on the unique index
//     (SQLite allows many NULLs) and never reuses their private-repo-inclusive
//     data. OAuth rows keep a unique, non-null github_id.
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // GitHub numeric databaseId. Unique for OAuth rows; NULL for public rows.
    githubId: integer('github_id'),
    username: text('username').notNull(),
    avatarUrl: text('avatar_url'),
    // AES-256-GCM ciphertext of the OAuth access token. NULL for public rows.
    // NEVER returned to clients.
    accessToken: text('access_token'),
    // True for public-lookup profiles. These can never hold a session.
    isPublicLookup: integer('is_public_lookup', { mode: 'boolean' })
      .notNull()
      .default(false),
    followers: integer('followers').notNull().default(0),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
    // Cached AI summary + the sync timestamp it was generated for (cache key).
    aiSummary: text('ai_summary'),
    aiSummaryAt: integer('ai_summary_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex('users_github_id_uq').on(t.githubId),
    index('users_username_idx').on(t.username),
  ],
);

// ── repos ────────────────────────────────────────────────────────────────
export const repos = sqliteTable(
  'repos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    githubId: integer('github_id').notNull(),
    ownerId: integer('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    primaryLanguage: text('primary_language'),
    stars: integer('stars').notNull().default(0),
    isPrivate: integer('is_private', { mode: 'boolean' })
      .notNull()
      .default(false),
    commitCount: integer('commit_count').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    uniqueIndex('repos_github_id_uq').on(t.githubId),
    index('repos_owner_idx').on(t.ownerId),
  ],
);

// ── repo_languages ───────────────────────────────────────────────────────
export const repoLanguages = sqliteTable(
  'repo_languages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    repoId: integer('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    bytes: integer('bytes').notNull().default(0),
    percentage: real('percentage').notNull().default(0),
  },
  (t) => [index('repo_languages_repo_idx').on(t.repoId)],
);

// ── commit_activity ──────────────────────────────────────────────────────
export const commitActivity = sqliteTable(
  'commit_activity',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ownerId: integer('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    count: integer('count').notNull().default(0),
    // JSON string: { "0": 3, "1": 0, ... "23": 5 } — commits per hour of day.
    hourDistribution: text('hour_distribution').notNull().default('{}'),
  },
  (t) => [
    uniqueIndex('commit_activity_owner_date_uq').on(t.ownerId, t.date),
    index('commit_activity_owner_idx').on(t.ownerId),
  ],
);

// ── pull_requests ────────────────────────────────────────────────────────
export const pullRequests = sqliteTable(
  'pull_requests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    githubId: integer('github_id').notNull(),
    repoId: integer('repo_id').references(() => repos.id, {
      onDelete: 'set null',
    }),
    ownerId: integer('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    openedAt: integer('opened_at', { mode: 'timestamp_ms' }),
    mergedAt: integer('merged_at', { mode: 'timestamp_ms' }),
    firstReviewAt: integer('first_review_at', { mode: 'timestamp_ms' }),
    wasMerged: integer('was_merged', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (t) => [
    uniqueIndex('pull_requests_github_id_uq').on(t.githubId),
    index('pull_requests_owner_idx').on(t.ownerId),
  ],
);

// ── sync_jobs ────────────────────────────────────────────────────────────
export type SyncStatus = 'pending' | 'processing' | 'done' | 'failed';

export const syncJobs = sqliteTable(
  'sync_jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().$type<SyncStatus>().default('pending'),
    progress: integer('progress').notNull().default(0), // 0–100
    error: text('error'),
    // Rate-limit reset instant reported by GitHub (exposed via /api/sync/status).
    rateLimitResetAt: integer('rate_limit_reset_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    index('sync_jobs_user_idx').on(t.userId),
    index('sync_jobs_status_idx').on(t.status),
  ],
);

// ── Inferred types ───────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Repo = typeof repos.$inferSelect;
export type NewRepo = typeof repos.$inferInsert;
export type RepoLanguage = typeof repoLanguages.$inferSelect;
export type CommitActivity = typeof commitActivity.$inferSelect;
export type PullRequest = typeof pullRequests.$inferSelect;
export type SyncJob = typeof syncJobs.$inferSelect;
export type NewSyncJob = typeof syncJobs.$inferInsert;
