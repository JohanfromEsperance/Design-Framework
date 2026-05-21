import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, tripsTable, legsTable, journalEntriesTable } from "@workspace/db";
import type { Leg, JournalEntry } from "@workspace/db";
import { serialize } from "../lib/serialize";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_FUEL_PRICE = 2.20;
const CONSUMPTION_L_PER_100KM = 18;

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);

  const tripsResult = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.userId, userId!));

  const tripIds = tripsResult.map(t => t.id);

  let allLegs: Leg[] = [];
  let journalResult: JournalEntry[] = [];

  if (tripIds.length > 0) {
    [allLegs, journalResult] = await Promise.all([
      db.select().from(legsTable).where(inArray(legsTable.tripId, tripIds)),
      db.select().from(journalEntriesTable).where(inArray(journalEntriesTable.tripId, tripIds)),
    ]);
  }

  const recentTrips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.userId, userId!))
    .orderBy(desc(tripsTable.updatedAt))
    .limit(5);

  const totalKm = allLegs.reduce((s, l) => s + (l.actualKm ?? l.plannedKm ?? 0), 0);
  const totalFuelCost = allLegs.reduce((s, l) => {
    return s + (l.actualLitres ?? 0) * (l.actualPricePerLitre ?? 0);
  }, 0);

  const tripBreakdown = tripsResult.map((trip) => {
    const legs = allLegs.filter((l) => l.tripId === trip.id);
    const plannedKm = legs.reduce((s, l) => s + (l.plannedKm ?? 0), 0);
    const actualKm = legs.reduce((s, l) => s + (l.actualKm ?? 0), 0);
    const plannedFuelCost = legs.reduce((s, l) => {
      const km = l.plannedKm ?? 0;
      const price = l.fuelPrice ?? DEFAULT_FUEL_PRICE;
      return s + (km * CONSUMPTION_L_PER_100KM / 100) * price;
    }, 0);
    const actualFuelCost = legs.reduce((s, l) => {
      return s + (l.actualLitres ?? 0) * (l.actualPricePerLitre ?? 0);
    }, 0);
    return { id: trip.id, name: trip.name, plannedFuelCost, actualFuelCost, plannedKm, actualKm };
  });

  res.json(
    GetDashboardResponse.parse(serialize({
      totalTrips: tripsResult.length,
      totalKm,
      totalFuelCost,
      totalJournalEntries: journalResult.length,
      recentTrips,
      tripBreakdown,
    }))
  );
});

export default router;
