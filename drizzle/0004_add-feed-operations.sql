CREATE TABLE `feed_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source_key` text NOT NULL,
	`feed_type` text DEFAULT 'csv' NOT NULL,
	`endpoint_url` text,
	`schedule` text DEFAULT 'manual' NOT NULL,
	`secret_env_name` text,
	`enabled` integer DEFAULT true NOT NULL,
	`last_imported_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feed_sources_source_key_idx` ON `feed_sources` (`source_key`);--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`file_name` text,
	`status` text NOT NULL,
	`total_rows` integer DEFAULT 0 NOT NULL,
	`inserted_rows` integer DEFAULT 0 NOT NULL,
	`updated_rows` integer DEFAULT 0 NOT NULL,
	`error_rows` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	`imported_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `import_runs_created_idx` ON `import_runs` (`created_at`);--> statement-breakpoint
CREATE INDEX `import_runs_source_idx` ON `import_runs` (`source_key`,`created_at`);