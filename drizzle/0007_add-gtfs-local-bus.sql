CREATE TABLE `bus_agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`timezone` text DEFAULT 'Asia/Tokyo' NOT NULL,
	`language` text DEFAULT 'ja' NOT NULL,
	`license_name` text,
	`license_url` text,
	`attribution` text,
	`feed_url` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bus_agencies_source_idx` ON `bus_agencies` (`source_key`);--> statement-breakpoint
CREATE TABLE `bus_calendar_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`date` text NOT NULL,
	`exception_type` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bus_calendar_dates_once_idx` ON `bus_calendar_dates` (`service_id`,`date`);--> statement-breakpoint
CREATE INDEX `bus_calendar_dates_date_idx` ON `bus_calendar_dates` (`date`);--> statement-breakpoint
CREATE TABLE `bus_calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`monday` integer DEFAULT 0 NOT NULL,
	`tuesday` integer DEFAULT 0 NOT NULL,
	`wednesday` integer DEFAULT 0 NOT NULL,
	`thursday` integer DEFAULT 0 NOT NULL,
	`friday` integer DEFAULT 0 NOT NULL,
	`saturday` integer DEFAULT 0 NOT NULL,
	`sunday` integer DEFAULT 0 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bus_calendars_dates_idx` ON `bus_calendars` (`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `bus_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`short_name` text,
	`long_name` text,
	`description` text,
	`route_type` integer DEFAULT 3 NOT NULL,
	`color` text,
	`text_color` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `bus_agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bus_lines_agency_idx` ON `bus_lines` (`agency_id`);--> statement-breakpoint
CREATE INDEX `bus_lines_name_idx` ON `bus_lines` (`short_name`,`long_name`);--> statement-breakpoint
CREATE TABLE `bus_stop_times` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`stop_id` text NOT NULL,
	`arrival_time` text NOT NULL,
	`departure_time` text NOT NULL,
	`stop_sequence` integer NOT NULL,
	`pickup_type` integer DEFAULT 0 NOT NULL,
	`drop_off_type` integer DEFAULT 0 NOT NULL,
	`timepoint` integer,
	FOREIGN KEY (`trip_id`) REFERENCES `bus_trips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stop_id`) REFERENCES `bus_stops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bus_stop_times_trip_sequence_idx` ON `bus_stop_times` (`trip_id`,`stop_sequence`);--> statement-breakpoint
CREATE INDEX `bus_stop_times_stop_departure_idx` ON `bus_stop_times` (`stop_id`,`departure_time`);--> statement-breakpoint
CREATE TABLE `bus_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`location_type` integer DEFAULT 0 NOT NULL,
	`parent_station` text,
	`wheelchair_boarding` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `bus_agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bus_stops_agency_idx` ON `bus_stops` (`agency_id`);--> statement-breakpoint
CREATE INDEX `bus_stops_name_idx` ON `bus_stops` (`name`);--> statement-breakpoint
CREATE INDEX `bus_stops_geo_idx` ON `bus_stops` (`latitude`,`longitude`);--> statement-breakpoint
CREATE TABLE `bus_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`line_id` text NOT NULL,
	`service_id` text NOT NULL,
	`headsign` text,
	`short_name` text,
	`direction_id` integer,
	`wheelchair_accessible` integer,
	`bikes_allowed` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`line_id`) REFERENCES `bus_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bus_trips_line_idx` ON `bus_trips` (`line_id`);--> statement-breakpoint
CREATE INDEX `bus_trips_service_idx` ON `bus_trips` (`service_id`);