CREATE TABLE `service_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`external_key` text NOT NULL,
	`route_id` text NOT NULL,
	`source` text NOT NULL,
	`base_price` integer NOT NULL,
	`sales_status` text DEFAULT 'unknown' NOT NULL,
	`available_seats` integer,
	`captured_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_snapshots_route_idx` ON `service_snapshots` (`route_id`,`captured_at`);--> statement-breakpoint
CREATE INDEX `service_snapshots_service_idx` ON `service_snapshots` (`external_key`,`captured_at`);