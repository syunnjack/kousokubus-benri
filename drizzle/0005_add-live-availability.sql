ALTER TABLE `services` ADD `sales_status` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `available_seats` integer;--> statement-breakpoint
ALTER TABLE `services` ADD `fare_updated_at` integer;