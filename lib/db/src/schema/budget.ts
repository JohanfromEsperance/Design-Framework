import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tripsTable } from "./trips";

export const budgetPlansTable = pgTable("budget_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  tripId: integer("trip_id").references(() => tripsTable.id, { onDelete: "cascade" }),
  year: text("year").notNull().default("2026"),
  months: jsonb("months").notNull().default({}),
  rental: jsonb("rental").default({}),
  super: jsonb("super").default({}),
  shares: jsonb("shares").default({}),
  income: jsonb("income").default({}),
  tax: jsonb("tax").default({}),
  vehicleProfile: jsonb("vehicle_profile").default({}),
  vehicleDocs: jsonb("vehicle_docs").default({}),
  checklists: jsonb("checklists").default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetPlanSchema = createInsertSchema(budgetPlansTable).omit({ id: true, updatedAt: true });
export type InsertBudgetPlan = z.infer<typeof insertBudgetPlanSchema>;
export type BudgetPlan = typeof budgetPlansTable.$inferSelect;
