import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, legsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListLegsParams,
  CreateLegParams,
  CreateLegBody,
  UpdateLegParams,
  UpdateLegBody,
  DeleteLegParams,
  ReorderLegsParams,
  ReorderLegsBody,
  ListLegsResponse,
  UpdateLegResponse,
  ReorderLegsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseTripId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/trips/:tripId/legs", async (req, res): Promise<void> => {
  const params = ListLegsParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const legs = await db
    .select()
    .from(legsTable)
    .where(eq(legsTable.tripId, params.data.tripId))
    .orderBy(asc(legsTable.sortOrder));
  res.json(ListLegsResponse.parse(serialize(legs)));
});

router.post("/trips/:tripId/legs", async (req, res): Promise<void> => {
  const params = CreateLegParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateLegBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(legsTable)
    .where(eq(legsTable.tripId, params.data.tripId));
  const maxSort = existing.length > 0
    ? Math.max(...existing.map(l => l.sortOrder))
    : -1;

  const [leg] = await db
    .insert(legsTable)
    .values({
      ...parsed.data,
      tripId: params.data.tripId,
      sortOrder: parsed.data.sortOrder ?? maxSort + 1,
    })
    .returning();
  res.status(201).json(serialize(leg));
});

router.patch("/trips/:tripId/legs/:legId", async (req, res): Promise<void> => {
  const params = UpdateLegParams.safeParse({
    tripId: parseTripId(req.params.tripId),
    legId: parseInt(Array.isArray(req.params.legId) ? req.params.legId[0] : req.params.legId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLegBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [leg] = await db
    .update(legsTable)
    .set(parsed.data)
    .where(and(eq(legsTable.id, params.data.legId), eq(legsTable.tripId, params.data.tripId)))
    .returning();
  if (!leg) {
    res.status(404).json({ error: "Leg not found" });
    return;
  }
  res.json(UpdateLegResponse.parse(serialize(leg)));
});

router.delete("/trips/:tripId/legs/:legId", async (req, res): Promise<void> => {
  const params = DeleteLegParams.safeParse({
    tripId: parseTripId(req.params.tripId),
    legId: parseInt(Array.isArray(req.params.legId) ? req.params.legId[0] : req.params.legId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [leg] = await db
    .delete(legsTable)
    .where(and(eq(legsTable.id, params.data.legId), eq(legsTable.tripId, params.data.tripId)))
    .returning();
  if (!leg) {
    res.status(404).json({ error: "Leg not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/trips/:tripId/legs/reorder", async (req, res): Promise<void> => {
  const params = ReorderLegsParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ReorderLegsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates = await Promise.all(
    parsed.data.legIds.map((id, idx) =>
      db
        .update(legsTable)
        .set({ sortOrder: idx })
        .where(and(eq(legsTable.id, id), eq(legsTable.tripId, params.data.tripId)))
        .returning()
        .then(rows => rows[0])
    )
  );
  const results = updates.filter(Boolean);
  res.json(ReorderLegsResponse.parse(serialize(results)));
});

export default router;
