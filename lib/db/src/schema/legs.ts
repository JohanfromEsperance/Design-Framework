import { pgTable, serial, integer, text, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tripsTable } from "./trips";

export const legsTable = pgTable("legs", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  fromPlace: text("from_place").notNull(),
  toPlace: text("to_place").notNull(),
  plannedKm: real("planned_km").notNull().default(0),
  actualKm: real("actual_km"),
  actualLitres: real("actual_litres"),
  actualPricePerLitre: real("actual_price_per_litre"),
  fuelPrice: real("fuel_price"),
  serviceStation: text("service_station"),
  notes: text("notes"),
});

export const insertLegSchema = createInsertSchema(legsTable).omit({ id: true });
export type InsertLeg = z.infer<typeof insertLegSchema>;
export type Leg = typeof legsTable.$inferSelect;
