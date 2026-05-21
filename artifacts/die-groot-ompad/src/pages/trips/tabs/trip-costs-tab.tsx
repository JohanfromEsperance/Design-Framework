import { useGetTrip, useListLegs, useGetGlobalBudget } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  TrendingDown, TrendingUp, DollarSign, ExternalLink,
  AlertTriangle, CheckCircle2, Fuel, MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

interface TripCostsTabProps { tripId: number; }

// Budget reference start — must match budget-page.tsx
const BUDGET_BASE = new Date(2026, 2, 1); // March 2026

function budgetMonthIndex(date: Date): number {
  return (
    (date.getFullYear() - BUDGET_BASE.getFullYear()) * 12 +
    (date.getMonth() - BUDGET_BASE.getMonth())
  );
}

const TRAVEL_KEYS = ["fuel", "accommodation", "food", "eatingOut", "entertainment", "passesPermits", "ferries"];
const ALL_EXPENSE_KEYS = [
  "fuel", "accommodation", "food", "eatingOut", "entertainment", "passesPermits", "ferries",
  "vehicleService", "caravanService", "tyresVehicle", "tyresCaravan", "repairs",
  "starlink", "johanMobile", "zandraMobile", "medical", "prescriptions", "apartmentInsurance",
  "vehicleLicence", "caravanLicence", "vehicleInsurance", "caravanInsurance", "roadsideAssist",
  "superContribution", "savingsZandra", "savingsJohan",
];

const FUEL_RATE = 3.80; // $/L default

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function monthName(monthIdx: number): string {
  const d = new Date(BUDGET_BASE.getFullYear(), BUDGET_BASE.getMonth() + monthIdx, 1);
  return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
}

export default function TripCostsTab({ tripId }: TripCostsTabProps) {
  const { data: trip } = useGetTrip(tripId);
  const { data: legsData } = useListLegs(tripId);
  const { data: globalBudget, isLoading: budgetLoading } = useGetGlobalBudget();

  const legs = useMemo(() => legsData ?? [], [legsData]);

  // ── Trip leg summary ───────────────────────────────────────────────────────

  const tripStats = useMemo(() => {
    const totalPlannedKm = legs.reduce((s: number, l) => s + (Number(l.plannedKm) || 0), 0);
    const totalActualKm  = legs.reduce((s: number, l) => s + (Number(l.actualKm)  || 0), 0);
    const legCount = legs.length;
    return { totalPlannedKm, totalActualKm, legCount };
  }, [legs]);

  const fuelScenarios = useMemo(() => [
    { rate: 15, label: "15 L/100km (Efficient)", color: "#1f6f5f" },
    { rate: 18, label: "18 L/100km (Typical)",   color: "#d9b880" },
    { rate: 20, label: "20 L/100km (Towing heavy)", color: "#ef4444" },
  ].map(s => ({
    ...s,
    litres: Math.round(tripStats.totalPlannedKm * s.rate / 100),
    cost: Math.round(tripStats.totalPlannedKm * s.rate / 100 * FUEL_RATE),
  })), [tripStats.totalPlannedKm]);

  // ── Month range the trip spans in the global budget ────────────────────────

  const tripMonthRange = useMemo(() => {
    if (!trip?.startDate) return null;
    const start = budgetMonthIndex(new Date(trip.startDate));
    const end   = trip?.endDate
      ? budgetMonthIndex(new Date(trip.endDate))
      : start + 1;
    return {
      start: Math.max(0, start),
      end:   Math.min(59, end),
    };
  }, [trip]);

  // ── Budget months that overlap this trip ──────────────────────────────────

  const tripBudgetMonths = useMemo(() => {
    if (!globalBudget?.months || !tripMonthRange) return [];
    const months = globalBudget.months as Record<string, any>;
    const result = [];
    for (let i = tripMonthRange.start; i <= tripMonthRange.end; i++) {
      const m = months[i.toString()] ?? months[i] ?? {};
      const travelExp  = TRAVEL_KEYS.reduce((s, k) => s + (Number(m[k]) || 0), 0);
      const totalExp   = ALL_EXPENSE_KEYS.reduce((s, k) => s + (Number(m[k]) || 0), 0);
      const totalInc   = ["rentalNet", "salary", "businessIncome", "refunds", "otherIncome1", "otherIncome2"]
        .reduce((s, k) => s + (Number(m[k]) || 0), 0);
      result.push({
        monthIdx: i,
        label: monthName(i),
        budgetedTravel: travelExp,
        budgetedTotal:  totalExp,
        budgetedIncome: totalInc,
        net: totalInc - totalExp,
        fuel:          Number(m.fuel || 0),
        accommodation: Number(m.accommodation || 0),
        food:          Number(m.food || 0),
        eatingOut:     Number(m.eatingOut || 0),
        entertainment: Number(m.entertainment || 0),
        passesPermits: Number(m.passesPermits || 0),
        ferries:       Number(m.ferries || 0),
      });
    }
    return result;
  }, [globalBudget, tripMonthRange]);

  // ── Aggregate budget totals for trip period ────────────────────────────────

  const budgetTotals = useMemo(() => ({
    travel:  tripBudgetMonths.reduce((s, m) => s + m.budgetedTravel, 0),
    total:   tripBudgetMonths.reduce((s, m) => s + m.budgetedTotal, 0),
    income:  tripBudgetMonths.reduce((s, m) => s + m.budgetedIncome, 0),
    months:  tripBudgetMonths.length,
  }), [tripBudgetMonths]);

  // ── Estimated trip travel cost (18 L/100km scenario) ──────────────────────

  const estimatedTripCost = fuelScenarios[1].cost; // 18 L/100km

  // ── Variance ──────────────────────────────────────────────────────────────

  const fuelVariance  = budgetTotals.travel > 0 ? estimatedTripCost - budgetTotals.travel : 0;
  const withinBudget  = fuelVariance <= 0;

  if (budgetLoading) {
    return <div className="p-8 text-muted-foreground text-sm">Loading budget data...</div>;
  }

  const hasBudget = tripBudgetMonths.length > 0;
  const hasBudgetData = hasBudget && budgetTotals.travel > 0;

  return (
    <div className="space-y-6">

      {/* ── Header + link ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Trip Costs vs Budget</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            How this trip's estimated costs map against your global 5-year budget
          </p>
        </div>
        <Link href="/budget">
          <a className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Open Budget
          </a>
        </Link>
      </div>

      {!hasBudget && tripMonthRange === null && (
        <div className="rounded-lg border border-[#d9b880]/40 bg-[#d9b880]/8 p-4 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-[#b8943e] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#b8943e]">No trip dates set</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set a start date on this trip to map it against the global budget months.
            </p>
          </div>
        </div>
      )}

      {/* ── Leg / Distance summary ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Planned Distance",
            value: `${tripStats.totalPlannedKm.toLocaleString()} km`,
            icon: MapPin,
            color: "text-foreground",
          },
          {
            label: "Actual Distance",
            value: tripStats.totalActualKm > 0 ? `${tripStats.totalActualKm.toLocaleString()} km` : "—",
            icon: MapPin,
            color: "text-primary",
          },
          {
            label: "Legs",
            value: String(tripStats.legCount),
            icon: TrendingUp,
            color: "text-foreground",
          },
          {
            label: "Budget Period",
            value: hasBudget ? `${budgetTotals.months} months` : "—",
            icon: DollarSign,
            color: hasBudget ? "text-primary" : "text-muted-foreground",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card">
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <div className="flex items-center justify-between">
                <span className={cn("text-2xl font-bold", color)}>{value}</span>
                <Icon className={cn("h-5 w-5 opacity-40", color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Fuel scenarios ── */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            Fuel Cost Scenarios — {tripStats.totalPlannedKm.toLocaleString()} km planned @ ${FUEL_RATE}/L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fuelScenarios.map(s => (
              <div key={s.rate} className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{fmtMoney(s.cost)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.litres.toLocaleString()} litres</p>
                {hasBudgetData && (
                  <p className={cn(
                    "text-xs font-semibold mt-1",
                    s.cost <= budgetTotals.travel ? "text-primary" : "text-destructive"
                  )}>
                    {s.cost <= budgetTotals.travel
                      ? `${fmtMoney(budgetTotals.travel - s.cost)} under budget`
                      : `${fmtMoney(s.cost - budgetTotals.travel)} over travel budget`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Budget vs trip period analysis ── */}
      {hasBudget && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Travel Budget (Period)",
                value: fmtMoney(budgetTotals.travel),
                icon: TrendingDown,
                color: "text-destructive",
              },
              {
                label: "Total Budget (Period)",
                value: fmtMoney(budgetTotals.total),
                icon: DollarSign,
                color: "text-foreground",
              },
              {
                label: "Income Budget (Period)",
                value: fmtMoney(budgetTotals.income),
                icon: TrendingUp,
                color: "text-primary",
              },
              {
                label: hasBudgetData
                  ? (withinBudget ? "Under Travel Budget" : "Over Travel Budget")
                  : "Trip Fuel Est. (18L)",
                value: hasBudgetData
                  ? `${withinBudget ? "-" : "+"}${fmtMoney(Math.abs(fuelVariance))}`
                  : fmtMoney(estimatedTripCost),
                icon: hasBudgetData ? (withinBudget ? CheckCircle2 : AlertTriangle) : Fuel,
                color: hasBudgetData
                  ? (withinBudget ? "text-primary" : "text-destructive")
                  : "text-[#d9b880]",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="bg-card">
                <CardContent className="pt-4 pb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-2xl font-bold", color)}>{value}</span>
                    <Icon className={cn("h-5 w-5 opacity-40", color)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Month-by-month chart */}
          {tripBudgetMonths.length > 1 && (
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Month-by-Month Budget Breakdown — Trip Period</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tripBudgetMonths} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 10 }}
                      formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n]}
                    />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="fuel"          name="Fuel"          stackId="a" fill="#1f6f5f" />
                    <Bar dataKey="accommodation" name="Accommodation" stackId="a" fill="#2a8a76" />
                    <Bar dataKey="food"          name="Food"          stackId="a" fill="#d9b880" />
                    <Bar dataKey="eatingOut"     name="Eating Out"    stackId="a" fill="#e8c98a" />
                    <Bar dataKey="entertainment" name="Activities"    stackId="a" fill="#60a5fa" />
                    <Bar dataKey="passesPermits" name="Passes"        stackId="a" fill="#a78bfa" />
                    <Bar dataKey="ferries"       name="Ferries"       stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Month-by-month table */}
          <Card className="bg-card overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-sm">
                Budget Detail — {tripBudgetMonths.length} Month{tripBudgetMonths.length !== 1 ? "s" : ""} of Trip Period
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-2 pl-3 font-semibold text-muted-foreground whitespace-nowrap">Month</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Fuel</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Accom</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Food</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Eating Out</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Activities</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Passes</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Ferries</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Travel Total</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">All Expenses</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap">Income</th>
                    <th className="text-right p-2 pr-3 font-semibold text-muted-foreground whitespace-nowrap">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {tripBudgetMonths.map(m => (
                    <tr key={m.monthIdx} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="p-2 pl-3 font-semibold text-foreground whitespace-nowrap">{m.label}</td>
                      {[m.fuel, m.accommodation, m.food, m.eatingOut, m.entertainment, m.passesPermits, m.ferries].map((v, i) => (
                        <td key={i} className={cn("text-right p-2 tabular-nums", v > 0 ? "text-foreground" : "text-muted-foreground/30")}>
                          {v > 0 ? `$${v.toLocaleString()}` : "—"}
                        </td>
                      ))}
                      <td className="text-right p-2 font-semibold text-foreground tabular-nums">${m.budgetedTravel.toLocaleString()}</td>
                      <td className="text-right p-2 tabular-nums text-muted-foreground">${m.budgetedTotal.toLocaleString()}</td>
                      <td className="text-right p-2 font-semibold text-primary tabular-nums">${m.budgetedIncome.toLocaleString()}</td>
                      <td className={cn("text-right p-2 pr-3 font-bold tabular-nums", m.net >= 0 ? "text-primary" : "text-destructive")}>
                        {m.net >= 0 ? "+" : ""}${m.net.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border/60 bg-muted/30">
                    <td className="p-2 pl-3 font-bold uppercase tracking-wide text-foreground">Total</td>
                    {[
                      tripBudgetMonths.reduce((s, m) => s + m.fuel, 0),
                      tripBudgetMonths.reduce((s, m) => s + m.accommodation, 0),
                      tripBudgetMonths.reduce((s, m) => s + m.food, 0),
                      tripBudgetMonths.reduce((s, m) => s + m.eatingOut, 0),
                      tripBudgetMonths.reduce((s, m) => s + m.entertainment, 0),
                      tripBudgetMonths.reduce((s, m) => s + m.passesPermits, 0),
                      tripBudgetMonths.reduce((s, m) => s + m.ferries, 0),
                    ].map((v, i) => (
                      <td key={i} className={cn("text-right p-2 font-bold tabular-nums", v > 0 ? "text-foreground" : "text-muted-foreground/30")}>
                        {v > 0 ? `$${v.toLocaleString()}` : "—"}
                      </td>
                    ))}
                    <td className="text-right p-2 font-bold text-foreground tabular-nums">${budgetTotals.travel.toLocaleString()}</td>
                    <td className="text-right p-2 font-bold text-muted-foreground tabular-nums">${budgetTotals.total.toLocaleString()}</td>
                    <td className="text-right p-2 font-bold text-primary tabular-nums">${budgetTotals.income.toLocaleString()}</td>
                    <td className={cn("text-right p-2 pr-3 font-bold tabular-nums",
                      (budgetTotals.income - budgetTotals.total) >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {(budgetTotals.income - budgetTotals.total) >= 0 ? "+" : ""}
                      ${(budgetTotals.income - budgetTotals.total).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Adjustment tip */}
          {!withinBudget && hasBudgetData && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-destructive">Trip fuel estimate exceeds travel budget by {fmtMoney(Math.abs(fuelVariance))}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Consider increasing the fuel budget in the{" "}
                  <Link href="/budget">
                    <a className="text-primary underline">global budget</a>
                  </Link>
                  , reducing planned km, or targeting a lower consumption rate (cruise control, 90 km/h).
                </p>
              </div>
            </div>
          )}
          {withinBudget && hasBudgetData && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-primary">Trip fuel estimate is within travel budget — {fmtMoney(Math.abs(fuelVariance))} headroom</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  At 18 L/100km and ${FUEL_RATE}/L over {tripStats.totalPlannedKm.toLocaleString()} km,
                  you have {fmtMoney(Math.abs(fuelVariance))} remaining from the travel budget allocation.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {!hasBudget && trip?.startDate && (
        <div className="rounded-lg border border-[#d9b880]/40 bg-[#d9b880]/8 p-4 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-[#b8943e] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#b8943e]">Trip falls outside the 60-month budget window</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The global budget covers March 2026 – February 2031. Adjust the trip dates or{" "}
              <Link href="/budget">
                <a className="text-primary underline">open the budget</a>
              </Link>{" "}
              to review the allocation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
