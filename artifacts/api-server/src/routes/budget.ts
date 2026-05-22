import { Router, type IRouter } from "express";
import { eq, isNull, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, budgetPlansTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import { assertTripOwner } from "../lib/assertTripOwner";
import {
  GetBudgetParams,
  SaveBudgetParams,
  SaveBudgetBody,
  GetBudgetSummaryParams,
  GetBudgetResponse,
  SaveBudgetResponse,
  GetBudgetSummaryResponse,
  GetGlobalBudgetResponse,
  SaveGlobalBudgetBody,
  SaveGlobalBudgetResponse,
  GetGlobalBudgetSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Global Budget (tripId = NULL) ─────────────────────────────────────────────

router.get("/budget", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const [plan] = await db
    .select()
    .from(budgetPlansTable)
    .where(and(isNull(budgetPlansTable.tripId), eq(budgetPlansTable.userId, userId!)));

  if (!plan) {
    res.json(GetGlobalBudgetResponse.parse({
      id: 0,
      tripId: null,
      year: new Date().getFullYear().toString(),
      months: {},
      rental: {},
      super: {},
      shares: {},
      powerConfig: {},
      updatedAt: new Date().toISOString(),
    }));
    return;
  }
  res.json(GetGlobalBudgetResponse.parse(serialize(plan)));
});

router.put("/budget", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const parsed = SaveGlobalBudgetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(budgetPlansTable)
    .where(and(isNull(budgetPlansTable.tripId), eq(budgetPlansTable.userId, userId!)));

  let plan;
  if (existing) {
    [plan] = await db
      .update(budgetPlansTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(isNull(budgetPlansTable.tripId), eq(budgetPlansTable.userId, userId!)))
      .returning();
  } else {
    [plan] = await db
      .insert(budgetPlansTable)
      .values({ ...parsed.data, userId: userId!, tripId: null, updatedAt: new Date() })
      .returning();
  }
  res.json(SaveGlobalBudgetResponse.parse(serialize(plan!)));
});

router.get("/budget/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const [plan] = await db
    .select()
    .from(budgetPlansTable)
    .where(and(isNull(budgetPlansTable.tripId), eq(budgetPlansTable.userId, userId!)));

  const months = (plan?.months as Record<string, Record<string, number>>) || {};
  const EXPENSE_KEYS = ["fuel", "accommodation", "food", "eatingOut", "entertainment",
    "passesPermits", "ferries", "vehicleService", "caravanService", "tyresVehicle", "tyresCaravan",
    "repairs", "starlink", "johanMobile", "zandraMobile", "medical", "prescriptions",
    "apartmentInsurance", "vehicleLicence", "caravanLicence", "vehicleInsurance",
    "caravanInsurance", "roadsideAssist", "superContribution", "savingsZandra", "savingsJohan"];
  const INCOME_KEYS = ["rentalNet", "salary", "businessIncome", "refunds", "otherIncome1", "otherIncome2"];

  const monthlyBreakdown = [];
  let prevClosing = months["0"]?.openingBalance ?? 0;
  for (let m = 0; m < 12; m++) {
    const mData = months[m.toString()] || {};
    const income = INCOME_KEYS.reduce((s, k) => s + (Number(mData[k]) || 0), 0);
    const expenses = EXPENSE_KEYS.reduce((s, k) => s + (Number(mData[k]) || 0), 0);
    const opening = m === 0 ? (Number(mData.openingBalance) || 0) : prevClosing;
    const closing = opening + income - expenses;
    prevClosing = closing;
    monthlyBreakdown.push({ month: m, income, expenses, closing });
  }
  const totalIncome = monthlyBreakdown.reduce((s, r) => s + r.income, 0);
  const totalExpenses = monthlyBreakdown.reduce((s, r) => s + r.expenses, 0);

  res.json(GetGlobalBudgetSummaryResponse.parse({
    totalExpenses,
    totalIncome,
    netCashflow: totalIncome - totalExpenses,
    monthlyBreakdown,
  }));
});

// ── Per-trip budget ───────────────────────────────────────────────────────────

function parseTripId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/trips/:tripId/budget", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const params = GetBudgetParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await assertTripOwner(params.data.tripId, userId!))) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const [plan] = await db
    .select()
    .from(budgetPlansTable)
    .where(eq(budgetPlansTable.tripId, params.data.tripId));

  if (!plan) {
    const defaultPlan = {
      id: 0,
      tripId: params.data.tripId,
      year: new Date().getFullYear().toString(),
      months: {},
      rental: {},
      updatedAt: new Date().toISOString(),
    };
    res.json(GetBudgetResponse.parse(defaultPlan));
    return;
  }
  res.json(GetBudgetResponse.parse(serialize(plan)));
});

router.put("/trips/:tripId/budget", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const params = SaveBudgetParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await assertTripOwner(params.data.tripId, userId!))) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const parsed = SaveBudgetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(budgetPlansTable)
    .where(eq(budgetPlansTable.tripId, params.data.tripId));

  let plan;
  if (existing) {
    [plan] = await db
      .update(budgetPlansTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(budgetPlansTable.tripId, params.data.tripId))
      .returning();
  } else {
    [plan] = await db
      .insert(budgetPlansTable)
      .values({ ...parsed.data, userId: userId!, tripId: params.data.tripId, updatedAt: new Date() })
      .returning();
  }
  res.json(SaveBudgetResponse.parse(serialize(plan)));
});

router.get("/trips/:tripId/budget/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const params = GetBudgetSummaryParams.safeParse({ tripId: parseTripId(req.params.tripId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await assertTripOwner(params.data.tripId, userId!))) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const [plan] = await db
    .select()
    .from(budgetPlansTable)
    .where(eq(budgetPlansTable.tripId, params.data.tripId));

  const months = (plan?.months as Record<string, Record<string, number>>) || {};

  const EXPENSE_KEYS = ["fuel", "accommodation", "groceries", "eatingOut", "entertainment",
    "passesPermits", "insurance", "phoneInternet", "medical", "repairs", "subscriptions", "otherExpenses"];
  const INCOME_KEYS = ["salary", "businessIncome", "refunds", "otherIncome1", "otherIncome2"];

  const monthlyBreakdown = [];
  let prevClosing = months["0"]?.openingBalance ?? 0;

  for (let m = 0; m < 12; m++) {
    const mData = months[m.toString()] || {};
    const income = INCOME_KEYS.reduce((s, k) => s + (Number(mData[k]) || 0), 0);
    const expenses = EXPENSE_KEYS.reduce((s, k) => s + (Number(mData[k]) || 0), 0);
    const opening = m === 0 ? (Number(mData.openingBalance) || 0) : prevClosing;
    const closing = opening + income - expenses;
    prevClosing = closing;
    monthlyBreakdown.push({ month: m, income, expenses, closing });
  }

  const totalIncome = monthlyBreakdown.reduce((s, r) => s + r.income, 0);
  const totalExpenses = monthlyBreakdown.reduce((s, r) => s + r.expenses, 0);

  res.json(GetBudgetSummaryResponse.parse({
    tripId: params.data.tripId,
    totalExpenses,
    totalIncome,
    netCashflow: totalIncome - totalExpenses,
    monthlyBreakdown,
  }));
});

export default router;
