DROP INDEX "commit_activity_owner_date_uq";--> statement-breakpoint
DROP INDEX "commit_activity_owner_idx";--> statement-breakpoint
DROP INDEX "pull_requests_github_id_uq";--> statement-breakpoint
DROP INDEX "pull_requests_owner_idx";--> statement-breakpoint
DROP INDEX "repo_languages_repo_idx";--> statement-breakpoint
DROP INDEX "repos_github_id_uq";--> statement-breakpoint
DROP INDEX "repos_owner_idx";--> statement-breakpoint
DROP INDEX "sync_jobs_user_idx";--> statement-breakpoint
DROP INDEX "sync_jobs_status_idx";--> statement-breakpoint
DROP INDEX "users_github_id_uq";--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "github_id" TO "github_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX `commit_activity_owner_date_uq` ON `commit_activity` (`owner_id`,`date`);--> statement-breakpoint
CREATE INDEX `commit_activity_owner_idx` ON `commit_activity` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pull_requests_github_id_uq` ON `pull_requests` (`github_id`);--> statement-breakpoint
CREATE INDEX `pull_requests_owner_idx` ON `pull_requests` (`owner_id`);--> statement-breakpoint
CREATE INDEX `repo_languages_repo_idx` ON `repo_languages` (`repo_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `repos_github_id_uq` ON `repos` (`github_id`);--> statement-breakpoint
CREATE INDEX `repos_owner_idx` ON `repos` (`owner_id`);--> statement-breakpoint
CREATE INDEX `sync_jobs_user_idx` ON `sync_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `sync_jobs_status_idx` ON `sync_jobs` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_uq` ON `users` (`github_id`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "access_token" TO "access_token" text;--> statement-breakpoint
ALTER TABLE `users` ADD `is_public_lookup` integer DEFAULT false NOT NULL;