CREATE TABLE `highway_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`external_key` text NOT NULL,
	`operator_name` text NOT NULL,
	`service_name` text NOT NULL,
	`origin_name` text NOT NULL,
	`destination_name` text NOT NULL,
	`departure_time` text,
	`arrival_time` text,
	`official_url` text NOT NULL,
	`license_name` text,
	`license_url` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `highway_catalog_external_idx` ON `highway_catalog` (`external_key`);--> statement-breakpoint
CREATE INDEX `highway_catalog_od_idx` ON `highway_catalog` (`origin_name`,`destination_name`);--> statement-breakpoint
CREATE INDEX `highway_catalog_source_idx` ON `highway_catalog` (`source_key`);