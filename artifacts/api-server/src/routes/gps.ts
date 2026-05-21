import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, gpsPointsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListGpsPointsParams,
  LogGpsPointParams,
  LogGpsPointBody,
  ClearGpsTrackParams,
  ListGpsPointsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseTripId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/trips/:tripId/gps", async (req, res): Promise<void> => {
  const params = ListGpsPointsParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const points = await db
    .select()
    .from(gpsPointsTable)
    .where(eq(gpsPointsTable.tripId, params.data.tripId))
    .orderBy(asc(gpsPointsTable.capturedAt));
  res.json(ListGpsPointsResponse.parse(serialize(points)));
});

router.post("/trips/:tripId/gps", async (req, res): Promise<void> => {
  const params = LogGpsPointParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = LogGpsPointBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [point] = await db
    .insert(gpsPointsTable)
    .values({
      ...parsed.data,
      tripId: params.data.tripId,
      capturedAt: parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date(),
    })
    .returning();
  res.status(201).json(serialize(point));
});

router.delete("/trips/:tripId/gps", async (req, res): Promise<void> => {
  const params = ClearGpsTrackParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(gpsPointsTable)
    .where(eq(gpsPointsTable.tripId, params.data.tripId));
  res.sendStatus(204);
});

export default router;
