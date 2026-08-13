CREATE TABLE `commit_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`date` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`hour_distribution` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commit_activity_owner_date_uq` ON `commit_activity` (`owner_id`,`date`);--> statement-breakpoint
CREATE INDEX `commit_activity_owner_idx` ON `commit_activity` (`owner_id`);--> statement-breakpoint
CREATE TABLE `pull_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` integer NOT NULL,
	`repo_id` integer,
	`owner_id` integer NOT NULL,
	`opened_at` integer,
	`merged_at` integer,
	`first_review_at` integer,
	`was_merged` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pull_requests_github_id_uq` ON `pull_requests` (`github_id`);--> statement-breakpoint
CREATE INDEX `pull_requests_owner_idx` ON `pull_requests` (`owner_id`);--> statement-breakpoint
CREATE TABLE `repo_languages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`language` text NOT NULL,
	`bytes` integer DEFAULT 0 NOT NULL,
	`percentage` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `repo_languages_repo_idx` ON `repo_languages` (`repo_id`);--> statement-breakpoint
CREATE TABLE `repos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` integer NOT NULL,
	`owner_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`primary_language` text,
	`stars` integer DEFAULT 0 NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`commit_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repos_github_id_uq` ON `repos` (`github_id`);--> statement-breakpoint
CREATE INDEX `repos_owner_idx` ON `repos` (`owner_id`);--> statement-breakpoint
CREATE TABLE `sync_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`error` text,
	`rate_limit_reset_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_jobs_user_idx` ON `sync_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `sync_jobs_status_idx` ON `sync_jobs` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` integer NOT NULL,
	`username` text NOT NULL,
	`avatar_url` text,
	`access_token` text NOT NULL,
	`followers` integer DEFAULT 0 NOT NULL,
	`last_synced_at` integer,
	`ai_summary` text,
	`ai_summary_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_uq` ON `users` (`github_id`);