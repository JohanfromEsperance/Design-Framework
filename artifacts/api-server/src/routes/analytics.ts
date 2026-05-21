import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, tripsTable, legsTable, journalEntriesTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const [tripsResult, legsResult, journalResult, recentTrips] = await Promise.all([
    db.select().from(tripsTable),
    db.select().from(legsTable),
    db.select().from(journalEntriesTable),
    db.select().from(tripsTable).orderBy(desc(tripsTable.updatedAt)).limit(5),
  ]);

  const totalTrips = tripsResult.length;
  const totalKm = legsResult.reduce((s, l) => s + (l.actualKm || l.plannedKm || 0), 0);
  const totalFuelCost = legsResult.reduce((s, l) => {
    const litres = l.actualLitres || 0;
    const price = l.actualPricePerLitre || 0;
    return s + litres * price;
  }, 0);
  const totalJournalEntries = journalResult.length;

  res.json(
    GetDashboardResponse.parse(serialize({
      totalTrips,
      totalKm,
      totalFuelCost,
      totalJournalEntries,
      recentTrips,
    }))
  );
});

export default router;
