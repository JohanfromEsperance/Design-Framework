import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, journalEntriesTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import { assertTripOwner } from "../lib/assertTripOwner";
import {
  ListJournalEntriesParams,
  CreateJournalEntryParams,
  CreateJournalEntryBody,
  UpdateJournalEntryParams,
  UpdateJournalEntryBody,
  DeleteJournalEntryParams,
  ListJournalEntriesResponse,
  UpdateJournalEntryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseTripId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/trips/:tripId/journal", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const params = ListJournalEntriesParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await assertTripOwner(params.data.tripId, userId!))) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const entries = await db
    .select()
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.tripId, params.data.tripId))
    .orderBy(desc(journalEntriesTable.weekDate));
  res.json(ListJournalEntriesResponse.parse(serialize(entries)));
});

router.post("/trips/:tripId/journal", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const params = CreateJournalEntryParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await assertTripOwner(params.data.tripId, userId!))) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const parsed = CreateJournalEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .insert(journalEntriesTable)
    .values({
      ...parsed.data,
      tripId: params.data.tripId,
      updatedAt: new Date(),
    })
    .returning();
  res.status(201).json(serialize(entry));
});

router.patch("/trips/:tripId/journal/:entryId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const params = UpdateJournalEntryParams.safeParse({
    tripId: parseTripId(req.params.tripId),
    entryId: parseInt(Array.isArray(req.params.entryId) ? req.params.entryId[0] : req.params.entryId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await assertTripOwner(params.data.tripId, userId!))) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const parsed = UpdateJournalEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .update(journalEntriesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(
      eq(journalEntriesTable.id, params.data.entryId),
      eq(journalEntriesTable.tripId, params.data.tripId),
    ))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }
  res.json(UpdateJournalEntryResponse.parse(serialize(entry)));
});

router.delete("/trips/:tripId/journal/:entryId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const params = DeleteJournalEntryParams.safeParse({
    tripId: parseTripId(req.params.tripId),
    entryId: parseInt(Array.isArray(req.params.entryId) ? req.params.entryId[0] : req.params.entryId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await assertTripOwner(params.data.tripId, userId!))) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const [entry] = await db
    .delete(journalEntriesTable)
    .where(and(
      eq(journalEntriesTable.id, params.data.entryId),
      eq(journalEntriesTable.tripId, params.data.tripId),
    ))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
