import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, tripsTable, legsTable, vehicleProfilesTable, journalEntriesTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/seed-demo", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const existing = await db.select({ id: tripsTable.id }).from(tripsTable).where(eq(tripsTable.userId, userId)).limit(1);
  if (existing.length > 0) {
    res.json({ seeded: false, message: "Demo data already exists for this account." });
    return;
  }

  // ── Insert trips ────────────────────────────────────────────────────────────
  const [t1] = await db.insert(tripsTable).values({
    userId,
    name: "Die Groot Ompad — Nullarbor Crossing",
    notes: "The great lap across the Nullarbor Plain — from Esperance WA to Ceduna SA and back. One of the most iconic stretches of Australian outback travel.",
    startDate: "2026-03-01",
    endDate: "2026-05-30",
    fuelPrice15: 3.8, fuelPrice18: 3.8, fuelPrice20: 3.8,
  }).returning({ id: tripsTable.id });

  const [t2] = await db.insert(tripsTable).values({
    userId,
    name: "Dirk Hartog Island",
    notes: "TESTER Main APPLICATION",
    startDate: "2027-02-01",
    fuelPrice15: 1.5, fuelPrice18: 1.5, fuelPrice20: 1.5,
  }).returning({ id: tripsTable.id });

  const [t3] = await db.insert(tripsTable).values({
    userId,
    name: "The Great Northern Run",
    startDate: "2025-09-01",
    endDate: "2025-12-31",
    fuelPrice15: 3.8, fuelPrice18: 3.8, fuelPrice20: 3.8,
  }).returning({ id: tripsTable.id });

  // ── Legs — Trip 1 (Nullarbor Crossing) ─────────────────────────────────────
  await db.insert(legsTable).values([
    { tripId: t1.id, sortOrder: 1,  fromPlace: "Esperance (and town)", toPlace: "Salmon Gums",                          plannedKm: 157, actualKm: 157,   actualLitres: 24.98, notes: "Salmon Gums RH | Windy" },
    { tripId: t1.id, sortOrder: 2,  fromPlace: "Salmon Gums",          toPlace: "Norseman",                             plannedKm: 99,  actualKm: 99,    actualLitres: 19.53, notes: "BP Norseman | Headwind" },
    { tripId: t1.id, sortOrder: 3,  fromPlace: "Norseman",             toPlace: "Balladonia",                           plannedKm: 194, actualKm: 194,   actualLitres: 35.28, notes: "BP Balladonia | Headwind" },
    { tripId: t1.id, sortOrder: 4,  fromPlace: "Balladonia",           toPlace: "Caiguna",                              plannedKm: 177, actualKm: 177,   actualLitres: 34.98, notes: "Golden Outback | Headwind" },
    { tripId: t1.id, sortOrder: 5,  fromPlace: "Caiguna",              toPlace: "Cocklebiddy",                          plannedKm: 60,  actualKm: 60,    actualLitres: 12.53, notes: "Golden Outback | Headwind" },
    { tripId: t1.id, sortOrder: 6,  fromPlace: "Cocklebiddy",          toPlace: "Madura",                               plannedKm: 92,  actualKm: 92,    actualLitres: 19.17, notes: "Golden Outback | Headwind" },
    { tripId: t1.id, sortOrder: 7,  fromPlace: "Madura",               toPlace: "Mundrabilla",                          plannedKm: 120, actualKm: 120,   actualLitres: 23.48, notes: "Mundrabilla RH | No Wind" },
    { tripId: t1.id, sortOrder: 8,  fromPlace: "Mundrabilla",          toPlace: "Eucla",                                plannedKm: 64,  actualKm: 64,    actualLitres: 13.93, notes: "Motel PAYG | Sidewind" },
    { tripId: t1.id, sortOrder: 9,  fromPlace: "Eucla",                toPlace: "Nullarbor Roadhouse",                  plannedKm: 203, actualKm: 203,   actualLitres: 37.59, notes: "Nullarbor RH | No Wind" },
    { tripId: t1.id, sortOrder: 10, fromPlace: "Nullarbor Roadhouse",  toPlace: "Yalata",                               plannedKm: 114, actualKm: 114,   actualLitres: 20.35, notes: "Yalata PAYG | No Wind" },
    { tripId: t1.id, sortOrder: 11, fromPlace: "Yalata",               toPlace: "Nundroo",                              plannedKm: 52,  actualKm: 52,    actualLitres: 9.39,  notes: "Nundroo RH | No Wind" },
    { tripId: t1.id, sortOrder: 12, fromPlace: "Nundroo",              toPlace: "Penong",                               plannedKm: 80,  actualKm: 80,    actualLitres: 16.21, notes: "Ampol | Storm Headwinds" },
    { tripId: t1.id, sortOrder: 13, fromPlace: "Penong",               toPlace: "Ceduna",                               plannedKm: 72,  actualKm: 72,    actualLitres: 9.97,  notes: "OTR Ceduna | Wet / Slow" },
    { tripId: t1.id, sortOrder: 14, fromPlace: "Ceduna",               toPlace: "Streaky Bay Return",                   plannedKm: 116, actualKm: 116,   actualLitres: 18.16, notes: "Caltex Ceduna | No towing" },
    { tripId: t1.id, sortOrder: 15, fromPlace: "Ceduna",               toPlace: "Denial Bay Return",                   plannedKm: 203, actualKm: 203,   actualLitres: 29.79, notes: "Caltex Ceduna | No towing" },
    { tripId: t1.id, sortOrder: 16, fromPlace: "Ceduna",               toPlace: "Penong",                               plannedKm: 113, actualKm: 112.5, actualLitres: 18.14, notes: "Ampol | Tailwind" },
    { tripId: t1.id, sortOrder: 17, fromPlace: "Penong",               toPlace: "Nundroo",                              plannedKm: 187, actualKm: 186.8, actualLitres: 26.38, notes: "Nundroo RH | No Wind" },
    { tripId: t1.id, sortOrder: 18, fromPlace: "Nundroo",              toPlace: "Nullarbor Roadhouse",                  plannedKm: 145, actualKm: 144.6, actualLitres: 27.69, notes: "Nullarbor RH | No Wind" },
    { tripId: t1.id, sortOrder: 19, fromPlace: "Nullarbor Roadhouse",  toPlace: "Border Village",                       plannedKm: 185, actualKm: 185.3, actualLitres: 37.5,  notes: "Border Village Roadhouse | No Wind" },
    { tripId: t1.id, sortOrder: 20, fromPlace: "Border Village",       toPlace: "Mundrabilla",                          plannedKm: 77,  actualKm: 77,    actualLitres: 12,    notes: "No Wind" },
    { tripId: t1.id, sortOrder: 21, fromPlace: "Mundrabilla",          toPlace: "Madura * MADURA PASS*-",               plannedKm: 120, actualKm: 120,   actualLitres: 40,    notes: "Jerry Cans | No Wind" },
    { tripId: t1.id, sortOrder: 22, fromPlace: "Madura * MADURA PASS*",toPlace: "Cocklebiddy-Refilled Jerry Cans",      plannedKm: 91,  actualKm: 91,    actualLitres: 13,    notes: "Golden Outback | No Wind" },
    { tripId: t1.id, sortOrder: 23, fromPlace: "Cocklebiddy",          toPlace: "Balladonia",                           plannedKm: 204, actualKm: 204,   actualLitres: 40.21, notes: "BP Balladonia | No Wind" },
    { tripId: t1.id, sortOrder: 24, fromPlace: "Balladonia",           toPlace: "Norseman",                             plannedKm: 194, actualKm: 194,   actualLitres: 35,    notes: "BP Norseman | No Wind" },
    { tripId: t1.id, sortOrder: 25, fromPlace: "Norseman",             toPlace: "Esperance",                            plannedKm: 204, actualKm: 204,   actualLitres: 37.41, notes: "Caltex Castletown | Heavy Rain and Headwind" },
  ]);

  // ── Legs — Trip 2 (Dirk Hartog Island) ─────────────────────────────────────
  await db.insert(legsTable).values([
    { tripId: t2.id, sortOrder: 1, fromPlace: "Esperance",      toPlace: "Esperance",        plannedKm: 0,   actualKm: 0, actualLitres: 0, actualPricePerLitre: 0 },
    { tripId: t2.id, sortOrder: 2, fromPlace: "Salmon Gums",    toPlace: "Norseman",         plannedKm: 97,  actualKm: 0, actualLitres: 0, actualPricePerLitre: 0 },
    { tripId: t2.id, sortOrder: 3, fromPlace: "Norseman",       toPlace: "Coolgardie",       plannedKm: 168, actualKm: 0, actualLitres: 0, actualPricePerLitre: 0 },
    { tripId: t2.id, sortOrder: 4, fromPlace: "Coolgardie",     toPlace: "Merredin",         plannedKm: 299, actualKm: 0, actualLitres: 0, actualPricePerLitre: 0 },
    { tripId: t2.id, sortOrder: 5, fromPlace: "Merredin",       toPlace: "Nungarin",         plannedKm: 39,  actualKm: 0, actualLitres: 0, actualPricePerLitre: 0 },
    { tripId: t2.id, sortOrder: 6, fromPlace: "Nungarin",       toPlace: "Goomalling",       plannedKm: 50,  actualKm: 0, actualLitres: 0, actualPricePerLitre: 0 },
    { tripId: t2.id, sortOrder: 7, fromPlace: "Goomalling",     toPlace: "Esperance",        plannedKm: 0,   actualKm: 0, actualLitres: 0, actualPricePerLitre: 0 },
    { tripId: t2.id, sortOrder: 8, fromPlace: "Esperance",      toPlace: "Western Australia", plannedKm: 0,  actualKm: null, actualLitres: null },
  ]);

  // ── Legs — Trip 3 (The Great Northern Run) ──────────────────────────────────
  await db.insert(legsTable).values([
    { tripId: t3.id, sortOrder: 1,  fromPlace: "Esperance",           toPlace: "Norseman",           plannedKm: 211, actualKm: 211.1, actualLitres: 41.52 },
    { tripId: t3.id, sortOrder: 2,  fromPlace: "Norseman",            toPlace: "Kalgoorlie-Boulder",  plannedKm: 175, actualKm: 174.9, actualLitres: 30.71 },
    { tripId: t3.id, sortOrder: 3,  fromPlace: "Kalgoorlie-Boulder",  toPlace: "Leonora",             plannedKm: 238, actualKm: 237.6, actualLitres: 41.43 },
    { tripId: t3.id, sortOrder: 4,  fromPlace: "Leonora",             toPlace: "Wiluna",              plannedKm: 323, actualKm: 323.4, actualLitres: 54.19 },
    { tripId: t3.id, sortOrder: 5,  fromPlace: "Wiluna",              toPlace: "Meekatharra",         plannedKm: 292, actualKm: 291.9, actualLitres: 45.56 },
    { tripId: t3.id, sortOrder: 6,  fromPlace: "Meekatharra",         toPlace: "Kumarina",            plannedKm: 253, actualKm: 253,   actualLitres: 52.59 },
    { tripId: t3.id, sortOrder: 7,  fromPlace: "Kumarina",            toPlace: "Capricorn",           plannedKm: 146, actualKm: 146,   actualLitres: 27.39 },
    { tripId: t3.id, sortOrder: 8,  fromPlace: "Capricorn",           toPlace: "AUSKI",               plannedKm: 206, actualKm: 206,   actualLitres: 35.67 },
    { tripId: t3.id, sortOrder: 9,  fromPlace: "AUSKI",               toPlace: "Port Hedland",        plannedKm: 270, actualKm: 269.8, actualLitres: 45.11 },
    { tripId: t3.id, sortOrder: 10, fromPlace: "Port Hedland",        toPlace: "Pardoo Roadhouse",    plannedKm: 196, actualKm: 196.4, actualLitres: 42.9 },
    { tripId: t3.id, sortOrder: 11, fromPlace: "Pardoo Roadhouse",    toPlace: "Cape K?",             plannedKm: 103, actualKm: 102.9, actualLitres: 20 },
    { tripId: t3.id, sortOrder: 12, fromPlace: "Pardoo Roadhouse",    toPlace: "80mile beach",        plannedKm: 296, actualKm: 295.8, actualLitres: 65.84 },
    { tripId: t3.id, sortOrder: 13, fromPlace: "Pardoo Roadhouse",    toPlace: "Marble Bar",          plannedKm: 357, actualKm: 356.6, actualLitres: 49.51 },
    { tripId: t3.id, sortOrder: 14, fromPlace: "Marble Bar",          toPlace: "Marble Bar",          plannedKm: 425, actualKm: 424.6, actualLitres: 62.96 },
    { tripId: t3.id, sortOrder: 15, fromPlace: "Marble Bar",          toPlace: "Marble Bar",          plannedKm: 184, actualKm: 184,   actualLitres: 25.17 },
    { tripId: t3.id, sortOrder: 16, fromPlace: "Marble Bar",          toPlace: "Port hedland",        plannedKm: 226, actualKm: 226,   actualLitres: 39.24 },
    { tripId: t3.id, sortOrder: 19, fromPlace: "Tom Price",           toPlace: "Tom Price",           plannedKm: 120, actualKm: 120,   actualLitres: 17.8 },
    { tripId: t3.id, sortOrder: 20, fromPlace: "Tom Price",           toPlace: "Capricorn",           plannedKm: 346, actualKm: 346.1, actualLitres: 54.77 },
    { tripId: t3.id, sortOrder: 21, fromPlace: "Capricorn",           toPlace: "Kumarina",            plannedKm: 148, actualKm: 148,   actualLitres: 26.85 },
    { tripId: t3.id, sortOrder: 22, fromPlace: "Kumarina",            toPlace: "Meekatharra",         plannedKm: 246, actualKm: 246,   actualLitres: 49.57 },
    { tripId: t3.id, sortOrder: 23, fromPlace: "Meekatharra",         toPlace: "Wiluna",              plannedKm: 180, actualKm: 180,   actualLitres: 30.04 },
    { tripId: t3.id, sortOrder: 24, fromPlace: "Wiluna",              toPlace: "Leonora",             plannedKm: 316, actualKm: 316.1, actualLitres: 60.6 },
    { tripId: t3.id, sortOrder: 25, fromPlace: "Leonora",             toPlace: "Kalgoorlie-Boulder",  plannedKm: 230, actualKm: 230,   actualLitres: 42.7 },
    { tripId: t3.id, sortOrder: 26, fromPlace: "Kalgoorlie-Boulder",  toPlace: "Norseman",            plannedKm: 186, actualKm: 186,   actualLitres: 30 },
  ]);

  // ── Vehicle profiles ─────────────────────────────────────────────────────────
  await db.insert(vehicleProfilesTable).values([
    {
      tripId: t1.id,
      vehicleModel: "Toyota LandCruiser 200", vehicleFuel: "Diesel",
      kerbWeight: 2740, gvm: 3350, gcm: 6850, towRating: 3500,
      frontAxleLimit: 1630, rearAxleLimit: 1950,
      caravanModel: "Off-road van", caravanType: "Dual axle",
      caravanTare: 2650, caravanAtm: 3500, caravanGtm: 3200,
      ballWeight: 300, waterLoad: 180, extrasLoad: 120,
      payloadPeople: 180, payloadFood: 85, payloadRecovery: 75,
      payloadTools: 90, payloadFuel: 120, payloadOther: 60,
    },
    {
      tripId: t3.id,
      vehicleModel: "Toyota Hilux 4X4 DSL/DC 6AT, SR", vehicleFuel: "Diesel",
      kerbWeight: 2085, gvm: 3465, gcm: 5850, towRating: 3500,
      frontAxleLimit: 1630, rearAxleLimit: 1950,
      caravanModel: "JAYCO 17ft - Off-road van", caravanType: "Dual axle",
      caravanTare: 1967, caravanAtm: 2330, caravanGtm: 3200,
      ballWeight: 300, waterLoad: 160, extrasLoad: 120,
      payloadPeople: 180, payloadFood: 85, payloadRecovery: 0,
      payloadTools: 0, payloadFuel: 0, payloadOther: 0,
    },
  ]);

  // ── Journal entries ──────────────────────────────────────────────────────────
  await db.insert(journalEntriesTable).values([
    {
      tripId: t1.id,
      weekDate: "2026-03-07",
      whereWere: "Esperance, WA",
      destinations: "Norseman, Balladonia",
      weather: "Sunny, 28°C, light easterly breeze",
      weekSummary: "Our first week on the road was everything we hoped for. Left Esperance early, with the LandCruiser packed to the brim and the van sitting perfectly level. The drive to Norseman was easy — wide open road, barely another car in sight. Balladonia felt like the edge of the world.",
      loved: "The silence at Balladonia roadhouse. Standing outside at night with a million stars and not a single light on the horizon — just us and the Milky Way. Fuel was expensive but the campfire conversation was priceless.",
      learned: "Always refuel when you can. Passed two rigs broken down on the roadside — both had gambled on making it further. The Nullarbor does not forgive overconfidence.",
    },
    {
      tripId: t1.id,
      weekDate: "2026-05-21",
      whereWere: "On the road",
      weekSummary: "A great week of traveling.",
    },
    {
      tripId: t2.id,
      weekDate: "2026-05-21",
      whereWere: "we are now in Esperance",
      weekSummary: "we are having some struggles here trying to figure out budget",
    },
  ]);

  res.json({
    seeded: true,
    message: "Demo data loaded: 3 expeditions with legs, vehicle profiles, and journal entries.",
    trips: [
      { id: t1.id, name: "Die Groot Ompad — Nullarbor Crossing" },
      { id: t2.id, name: "Dirk Hartog Island" },
      { id: t3.id, name: "The Great Northern Run" },
    ],
  });
});

export default router;
