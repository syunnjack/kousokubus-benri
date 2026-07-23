CREATE TABLE `onward_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`arrival_stop` text NOT NULL,
	`final_destination` text NOT NULL,
	`preference` text NOT NULL,
	`duration_minutes` integer,
	`fare` integer,
	`transfer_count` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `onward_destination_idx` ON `onward_searches` (`arrival_stop`,`final_destination`);--> statement-breakpoint
CREATE TABLE `review_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_votes_once_idx` ON `review_votes` (`review_id`,`visitor_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`display_name` text NOT NULL,
	`rating` integer NOT NULL,
	`sleep_rating` integer,
	`punctuality_rating` integer,
	`comfort_rating` integer,
	`body` text NOT NULL,
	`ride_date` text,
	`verified_ride` integer DEFAULT false NOT NULL,
	`helpful_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reviews_service_status_idx` ON `reviews` (`service_id`,`status`);--> statement-breakpoint
CREATE INDEX `reviews_created_idx` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`origin_name` text NOT NULL,
	`destination_name` text NOT NULL,
	`origin_code` text,
	`destination_code` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routes_origin_destination_idx` ON `routes` (`origin_name`,`destination_name`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`route_id` text NOT NULL,
	`operator_name` text NOT NULL,
	`service_name` text NOT NULL,
	`departure_time` text NOT NULL,
	`arrival_time` text NOT NULL,
	`seat_type` text,
	`base_price` integer NOT NULL,
	`sleep_score` integer,
	`on_time_rate` real,
	`booking_url` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `services_route_idx` ON `services` (`route_id`);--> statement-breakpoint
CREATE INDEX `services_price_idx` ON `services` (`base_price`);