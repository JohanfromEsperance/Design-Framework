import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tripsTable } from "./trips";

export const vehicleProfilesTable = pgTable("vehicle_profiles", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }).unique(),
  vehicleModel: text("vehicle_model").notNull().default(""),
  vehicleFuel: text("vehicle_fuel").notNull().default("Diesel"),
  kerbWeight: real("kerb_weight").notNull().default(0),
  gvm: real("gvm").notNull().default(0),
  gcm: real("gcm").notNull().default(0),
  towRating: real("tow_rating").notNull().default(0),
  frontAxleLimit: real("front_axle_limit").notNull().default(0),
  rearAxleLimit: real("rear_axle_limit").notNull().default(0),
  caravanModel: text("caravan_model").notNull().default(""),
  caravanType: text("caravan_type").notNull().default(""),
  caravanTare: real("caravan_tare").notNull().default(0),
  caravanAtm: real("caravan_atm").notNull().default(0),
  caravanGtm: real("caravan_gtm").notNull().default(0),
  ballWeight: real("ball_weight").notNull().default(0),
  waterLoad: real("water_load").notNull().default(0),
  extrasLoad: real("extras_load").notNull().default(0),
  payloadPeople: real("payload_people").notNull().default(0),
  payloadFood: real("payload_food").notNull().default(0),
  payloadRecovery: real("payload_recovery").notNull().default(0),
  payloadTools: real("payload_tools").notNull().default(0),
  payloadFuel: real("payload_fuel").notNull().default(0),
  payloadOther: real("payload_other").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVehicleProfileSchema = createInsertSchema(vehicleProfilesTable).omit({ id: true, updatedAt: true });
export type InsertVehicleProfile = z.infer<typeof insertVehicleProfileSchema>;
export type VehicleProfile = typeof vehicleProfilesTable.$inferSelect;
