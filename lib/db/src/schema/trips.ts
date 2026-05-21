import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  notes: text("notes"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  fuelPrice15: real("fuel_price_15").notNull().default(3.8),
  fuelPrice18: real("fuel_price_18").notNull().default(3.8),
  fuelPrice20: real("fuel_price_20").notNull().default(3.8),
  revision: text("revision").notNull().default("1.0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;
