import { eq, and } from "drizzle-orm";
import { db, tripsTable } from "@workspace/db";

export async function assertTripOwner(tripId: number, userId: string): Promise<boolean> {
  const [trip] = await db
    .select({ id: tripsTable.id })
    .from(tripsTable)
    .where(and(eq(tripsTable.id, tripId), eq(tripsTable.userId, userId)));
  return trip !== undefined;
}
