import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vehicleProfilesTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  GetVehicleProfileParams,
  SaveVehicleProfileParams,
  SaveVehicleProfileBody,
  GetVehicleProfileResponse,
  SaveVehicleProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseTripId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/trips/:tripId/vehicle", async (req, res): Promise<void> => {
  const params = GetVehicleProfileParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [profile] = await db
    .select()
    .from(vehicleProfilesTable)
    .where(eq(vehicleProfilesTable.tripId, params.data.tripId));

  if (!profile) {
    const defaults = {
      id: 0,
      tripId: params.data.tripId,
      vehicleModel: "Toyota LandCruiser 200",
      vehicleFuel: "Diesel",
      kerbWeight: 2740,
      gvm: 3350,
      gcm: 6850,
      towRating: 3500,
      frontAxleLimit: 1630,
      rearAxleLimit: 1950,
      caravanModel: "Off-road van",
      caravanType: "Dual axle",
      caravanTare: 2650,
      caravanAtm: 3500,
      caravanGtm: 3200,
      ballWeight: 300,
      waterLoad: 180,
      extrasLoad: 120,
      payloadPeople: 180,
      payloadFood: 85,
      payloadRecovery: 75,
      payloadTools: 90,
      payloadFuel: 120,
      payloadOther: 60,
      updatedAt: new Date().toISOString(),
    };
    res.json(GetVehicleProfileResponse.parse(defaults));
    return;
  }
  res.json(GetVehicleProfileResponse.parse(serialize(profile)));
});

router.put("/trips/:tripId/vehicle", async (req, res): Promise<void> => {
  const params = SaveVehicleProfileParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SaveVehicleProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(vehicleProfilesTable)
    .where(eq(vehicleProfilesTable.tripId, params.data.tripId));

  let profile;
  if (existing) {
    [profile] = await db
      .update(vehicleProfilesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(vehicleProfilesTable.tripId, params.data.tripId))
      .returning();
  } else {
    [profile] = await db
      .insert(vehicleProfilesTable)
      .values({ ...parsed.data, tripId: params.data.tripId, updatedAt: new Date() })
      .returning();
  }
  res.json(SaveVehicleProfileResponse.parse(serialize(profile)));
});

export default router;
