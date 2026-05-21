import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tripsTable, legsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  CreateTripBody,
  UpdateTripBody,
  GetTripParams,
  UpdateTripParams,
  DeleteTripParams,
  GetTripSummaryParams,
  ListTripsResponse,
  GetTripResponse,
  UpdateTripResponse,
  GetTripSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/trips", async (req, res): Promise<void> => {
  const trips = await db
    .select()
    .from(tripsTable)
    .orderBy(desc(tripsTable.updatedAt));
  res.json(ListTripsResponse.parse(serialize(trips)));
});

router.post("/trips", async (req, res): Promise<void> => {
  const parsed = CreateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [trip] = await db
    .insert(tripsTable)
    .values({ ...parsed.data, updatedAt: new Date() })
    .returning();
  res.status(201).json(GetTripResponse.parse(serialize(trip)));
});

router.get("/trips/:tripId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.tripId) ? req.params.tripId[0] : req.params.tripId;
  const params = GetTripParams.safeParse({ tripId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.id, params.data.tripId));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(GetTripResponse.parse(serialize(trip)));
});

router.patch("/trips/:tripId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.tripId) ? req.params.tripId[0] : req.params.tripId;
  const params = UpdateTripParams.safeParse({ tripId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [trip] = await db
    .update(tripsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tripsTable.id, params.data.tripId))
    .returning();
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(UpdateTripResponse.parse(serialize(trip)));
});

router.delete("/trips/:tripId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.tripId) ? req.params.tripId[0] : req.params.tripId;
  const params = DeleteTripParams.safeParse({ tripId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [trip] = await db
    .delete(tripsTable)
    .where(eq(tripsTable.id, params.data.tripId))
    .returning();
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/trips/:tripId/summary", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.tripId) ? req.params.tripId[0] : req.params.tripId;
  const params = GetTripSummaryParams.safeParse({ tripId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tid = params.data.tripId;

  const legs = await db
    .select()
    .from(legsTable)
    .where(eq(legsTable.tripId, tid));

  const totalLegs = legs.length;
  const totalPlannedKm = legs.reduce((s, l) => s + (l.plannedKm || 0), 0);
  const totalActualKm = legs.reduce((s, l) => s + (l.actualKm || 0), 0);

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tid));
  const fuelPrice18 = trip?.fuelPrice18 ?? 3.8;

  const totalEstFuelCost18 = legs.reduce((s, l) => {
    const est18 = (l.plannedKm || 0) * 0.18;
    const fp = l.fuelPrice ?? fuelPrice18;
    return s + est18 * fp;
  }, 0);

  const totalActualFuelCost = legs.reduce((s, l) => {
    const litres = l.actualLitres || 0;
    const price = l.actualPricePerLitre || 0;
    return s + litres * price;
  }, 0);

  const totalActualLitres = legs.reduce((s, l) => s + (l.actualLitres || 0), 0);
  const avgConsumptionL100km =
    totalActualKm > 0 ? (totalActualLitres / totalActualKm) * 100 : 0;

  const summary = {
    tripId: tid,
    totalLegs,
    totalPlannedKm,
    totalActualKm,
    totalEstFuelCost18,
    totalActualFuelCost,
    avgConsumptionL100km,
    kmVariance: totalActualKm - totalPlannedKm,
    costVariance: totalActualFuelCost - totalEstFuelCost18,
  };

  res.json(GetTripSummaryResponse.parse(summary));
});

export default router;
