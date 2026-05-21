import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tripsTable } from "./trips";

export const gpsPointsTable = pgTable("gps_points", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  accuracy: real("accuracy"),
  note: text("note"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
});

export const insertGpsPointSchema = createInsertSchema(gpsPointsTable).omit({ id: true });
export type InsertGpsPoint = z.infer<typeof insertGpsPointSchema>;
export type GpsPoint = typeof gpsPointsTable.$inferSelect;
