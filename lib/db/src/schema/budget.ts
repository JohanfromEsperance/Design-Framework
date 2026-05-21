import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tripsTable } from "./trips";

export const budgetPlansTable = pgTable("budget_plans", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }).unique(),
  year: text("year").notNull().default("2026"),
  months: jsonb("months").notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetPlanSchema = createInsertSchema(budgetPlansTable).omit({ id: true, updatedAt: true });
export type InsertBudgetPlan = z.infer<typeof insertBudgetPlanSchema>;
export type BudgetPlan = typeof budgetPlansTable.$inferSelect;
