import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, tripsTable, legsTable, journalEntriesTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_FUEL_PRICE = 2.20;
const CONSUMPTION_L_PER_100KM = 18;

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const [tripsResult, allLegs, journalResult, recentTrips] = await Promise.all([
    db.select().from(tripsTable),
    db.select().from(legsTable),
    db.select().from(journalEntriesTable),
    db.select().from(tripsTable).orderBy(desc(tripsTable.updatedAt)).limit(5),
  ]);

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
