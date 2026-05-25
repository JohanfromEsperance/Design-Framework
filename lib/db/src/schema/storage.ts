import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const assetRegisterTable = pgTable("asset_register", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AssetRegisterRow = typeof assetRegisterTable.$inferSelect;
