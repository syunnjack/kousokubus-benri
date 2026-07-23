ALTER TABLE `services` ADD `external_key` text;--> statement-breakpoint
ALTER TABLE `services` ADD `source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `services_external_key_idx` ON `services` (`external_key`);