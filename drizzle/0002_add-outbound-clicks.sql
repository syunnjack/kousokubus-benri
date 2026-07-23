CREATE TABLE `outbound_clicks` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`visitor_email` text,
	`source` text DEFAULT 'search' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `outbound_clicks_service_idx` ON `outbound_clicks` (`service_id`,`created_at`);