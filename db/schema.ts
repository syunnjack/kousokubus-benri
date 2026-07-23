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
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
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
