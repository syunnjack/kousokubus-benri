import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const routes = sqliteTable("routes", {
  id: text("id").primaryKey(),
  originName: text("origin_name").notNull(),
  destinationName: text("destination_name").notNull(),
  originCode: text("origin_code"),
  destinationCode: text("destination_code"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("routes_origin_destination_idx").on(table.originName, table.destinationName),
]);

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  externalKey: text("external_key"),
  source: text("source").notNull().default("manual"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  routeId: text("route_id").notNull().references(() => routes.id),
  operatorName: text("operator_name").notNull(),
  serviceName: text("service_name").notNull(),
  departureTime: text("departure_time").notNull(),
  arrivalTime: text("arrival_time").notNull(),
  seatType: text("seat_type"),
  basePrice: integer("base_price").notNull(),
  sleepScore: integer("sleep_score"),
  onTimeRate: real("on_time_rate"),
  bookingUrl: text("booking_url"),
  salesStatus: text("sales_status", { enum: ["on_sale", "sold_out", "ended", "unknown"] }).notNull().default("unknown"),
  availableSeats: integer("available_seats"),
  fareUpdatedAt: integer("fare_updated_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("services_external_key_idx").on(table.externalKey),
  index("services_route_idx").on(table.routeId),
  index("services_price_idx").on(table.basePrice),
]);

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull().references(() => services.id),
  visitorId: text("visitor_id").notNull(),
  displayName: text("display_name").notNull(),
  rating: integer("rating").notNull(),
  sleepRating: integer("sleep_rating"),
  punctualityRating: integer("punctuality_rating"),
  comfortRating: integer("comfort_rating"),
  body: text("body").notNull(),
  rideDate: text("ride_date"),
  verifiedRide: integer("verified_ride", { mode: "boolean" }).notNull().default(false),
  helpfulCount: integer("helpful_count").notNull().default(0),
  status: text("status", { enum: ["pending", "published", "rejected"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("reviews_service_status_idx").on(table.serviceId, table.status),
  index("reviews_created_idx").on(table.createdAt),
]);

export const reviewVotes = sqliteTable("review_votes", {
  id: text("id").primaryKey(),
  reviewId: text("review_id").notNull().references(() => reviews.id),
  visitorId: text("visitor_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("review_votes_once_idx").on(table.reviewId, table.visitorId),
]);

export const onwardSearches = sqliteTable("onward_searches", {
  id: text("id").primaryKey(),
  arrivalStop: text("arrival_stop").notNull(),
  finalDestination: text("final_destination").notNull(),
  preference: text("preference", { enum: ["fast", "cheap", "low_walk"] }).notNull(),
  durationMinutes: integer("duration_minutes"),
  fare: integer("fare"),
  transferCount: integer("transfer_count"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("onward_destination_idx").on(table.arrivalStop, table.finalDestination),
]);

export const outboundClicks = sqliteTable("outbound_clicks", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull().references(() => services.id),
  visitorEmail: text("visitor_email"),
  source: text("source").notNull().default("search"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("outbound_clicks_service_idx").on(table.serviceId, table.createdAt),
]);

export const feedSources = sqliteTable("feed_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sourceKey: text("source_key").notNull(),
  feedType: text("feed_type", { enum: ["csv", "api", "sftp"] }).notNull().default("csv"),
  endpointUrl: text("endpoint_url"),
  schedule: text("schedule").notNull().default("manual"),
  secretEnvName: text("secret_env_name"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastImportedAt: integer("last_imported_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("feed_sources_source_key_idx").on(table.sourceKey),
]);

export const importRuns = sqliteTable("import_runs", {
  id: text("id").primaryKey(),
  sourceKey: text("source_key").notNull(),
  fileName: text("file_name"),
  status: text("status", { enum: ["success", "partial", "failed"] }).notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  insertedRows: integer("inserted_rows").notNull().default(0),
  updatedRows: integer("updated_rows").notNull().default(0),
  errorRows: integer("error_rows").notNull().default(0),
  errorSummary: text("error_summary"),
  importedBy: text("imported_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("import_runs_created_idx").on(table.createdAt),
  index("import_runs_source_idx").on(table.sourceKey, table.createdAt),
]);

export const serviceSnapshots = sqliteTable("service_snapshots", {
  id: text("id").primaryKey(),
  externalKey: text("external_key").notNull(),
  routeId: text("route_id").notNull(),
  source: text("source").notNull(),
  basePrice: integer("base_price").notNull(),
  salesStatus: text("sales_status").notNull().default("unknown"),
  availableSeats: integer("available_seats"),
  capturedAt: integer("captured_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("service_snapshots_route_idx").on(table.routeId, table.capturedAt),
  index("service_snapshots_service_idx").on(table.externalKey, table.capturedAt),
]);

export const busAgencies = sqliteTable("bus_agencies", {
  id: text("id").primaryKey(),
  sourceKey: text("source_key").notNull(),
  name: text("name").notNull(),
  url: text("url"),
  timezone: text("timezone").notNull().default("Asia/Tokyo"),
  language: text("language").notNull().default("ja"),
  licenseName: text("license_name"),
  licenseUrl: text("license_url"),
  attribution: text("attribution"),
  feedUrl: text("feed_url"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("bus_agencies_source_idx").on(table.sourceKey),
]);

export const busStops = sqliteTable("bus_stops", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id").notNull().references(() => busAgencies.id),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  locationType: integer("location_type").notNull().default(0),
  parentStation: text("parent_station"),
  wheelchairBoarding: integer("wheelchair_boarding"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("bus_stops_agency_idx").on(table.agencyId),
  index("bus_stops_name_idx").on(table.name),
  index("bus_stops_geo_idx").on(table.latitude, table.longitude),
]);

export const busLines = sqliteTable("bus_lines", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id").notNull().references(() => busAgencies.id),
  shortName: text("short_name"),
  longName: text("long_name"),
  description: text("description"),
  routeType: integer("route_type").notNull().default(3),
  color: text("color"),
  textColor: text("text_color"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("bus_lines_agency_idx").on(table.agencyId),
  index("bus_lines_name_idx").on(table.shortName, table.longName),
]);

export const busTrips = sqliteTable("bus_trips", {
  id: text("id").primaryKey(),
  lineId: text("line_id").notNull().references(() => busLines.id),
  serviceId: text("service_id").notNull(),
  headsign: text("headsign"),
  shortName: text("short_name"),
  directionId: integer("direction_id"),
  wheelchairAccessible: integer("wheelchair_accessible"),
  bikesAllowed: integer("bikes_allowed"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("bus_trips_line_idx").on(table.lineId),
  index("bus_trips_service_idx").on(table.serviceId),
]);

export const busStopTimes = sqliteTable("bus_stop_times", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull().references(() => busTrips.id),
  stopId: text("stop_id").notNull().references(() => busStops.id),
  arrivalTime: text("arrival_time").notNull(),
  departureTime: text("departure_time").notNull(),
  stopSequence: integer("stop_sequence").notNull(),
  pickupType: integer("pickup_type").notNull().default(0),
  dropOffType: integer("drop_off_type").notNull().default(0),
  timepoint: integer("timepoint"),
}, (table) => [
  uniqueIndex("bus_stop_times_trip_sequence_idx").on(table.tripId, table.stopSequence),
  index("bus_stop_times_stop_departure_idx").on(table.stopId, table.departureTime),
]);

export const busCalendars = sqliteTable("bus_calendars", {
  id: text("id").primaryKey(),
  monday: integer("monday").notNull().default(0),
  tuesday: integer("tuesday").notNull().default(0),
  wednesday: integer("wednesday").notNull().default(0),
  thursday: integer("thursday").notNull().default(0),
  friday: integer("friday").notNull().default(0),
  saturday: integer("saturday").notNull().default(0),
  sunday: integer("sunday").notNull().default(0),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
}, (table) => [
  index("bus_calendars_dates_idx").on(table.startDate, table.endDate),
]);

export const busCalendarDates = sqliteTable("bus_calendar_dates", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  date: text("date").notNull(),
  exceptionType: integer("exception_type").notNull(),
}, (table) => [
  uniqueIndex("bus_calendar_dates_once_idx").on(table.serviceId, table.date),
  index("bus_calendar_dates_date_idx").on(table.date),
]);
