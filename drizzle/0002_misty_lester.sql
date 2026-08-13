DROP INDEX `repos_github_id_uq`;--> statement-breakpoint
CREATE UNIQUE INDEX `repos_owner_github_uq` ON `repos` (`owner_id`,`github_id`);