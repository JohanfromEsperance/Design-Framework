import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, assetRegisterTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/storage/register", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const [row] = await db
    .select()
    .from(assetRegisterTable)
    .where(eq(assetRegisterTable.userId, userId!));
  if (!row) {
    res.json({ locations: [], lastModified: new Date().toISOString() });
    return;
  }
  res.json(row.data);
});

router.put("/storage/register", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const data = req.body;
  const [row] = await db
    .insert(assetRegisterTable)
    .values({ userId: userId!, data })
    .onConflictDoUpdate({
      target: assetRegisterTable.userId,
      set: { data, updatedAt: new Date() },
    })
    .returning();
  res.json(row.data);
});

export default router;
