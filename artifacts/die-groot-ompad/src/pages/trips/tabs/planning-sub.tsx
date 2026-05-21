import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Tent, Fuel, Utensils, Map, TrendingUp,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanningMonth {
  freeNights: number;
  paidNights: number;
  paidRate: number;
  plannedKm: number;
  fuelConsumption: number;
  fuelPrice: number;
  totalDays: number;
  foodDailyRate: number;
  eatingOut: number;
  entertainment: number;
  passesPermits: number;
  ferries: number;
}

const PLANNING_DEFAULTS: PlanningMonth = {
  freeNights: 12,
  paidNights: 18,
  paidRate: 55,
  plannedKm: 1200,
  fuelConsumption: 18,
  fuelPrice: 2.20,
  totalDays: 30,
  foodDailyRate: 50,
  eatingOut: 150,
  entertainment: 120,
  passesPermits: 0,
  ferries: 0,
};

function getPlanning(m: Record<string, any>): PlanningMonth {
  return {
    freeNights:      Number(m.freeNights)      || PLANNING_DEFAULTS.freeNights,
    paidNights:      Number(m.paidNights)      || PLANNING_DEFAULTS.paidNights,
    paidRate:        Number(m.paidRate)        || PLANNING_DEFAULTS.paidRate,
    plannedKm:       Number(m.plannedKm)       || PLANNING_DEFAULTS.plannedKm,
    fuelConsumption: Number(m.fuelConsumption) || PLANNING_DEFAULTS.fuelConsumption,
    fuelPrice:       Number(m.fuelPrice)       || PLANNING_DEFAULTS.fuelPrice,
    totalDays:       Number(m.totalDays)       || PLANNING_DEFAULTS.totalDays,
    foodDailyRate:   Number(m.foodDailyRate)   || PLANNING_DEFAULTS.foodDailyRate,
    eatingOut:       Number(m.eatingOut)       || PLANNING_DEFAULTS.eatingOut,
    entertainment:   Number(m.entertainment)   || PLANNING_DEFAULTS.entertainment,
    passesPermits:   Number(m.passesPermits)   || 0,
    ferries:         Number(m.ferries)         || 0,
  };
}

function derivebudgetFields(p: PlanningMonth) {
  const accommodation = Math.round(p.paidNights * p.paidRate);
  const fuel          = Math.round(p.plannedKm * (p.fuelConsumption / 100) * p.fuelPrice);
  const food          = Math.round(p.totalDays * p.foodDailyRate);
  const grandTotal    = accommodation + fuel + food + p.eatingOut + p.entertainment + p.passesPermits + p.ferries;
  return { accommodation, fuel, food, grandTotal };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function monthLabel(startDate: string | undefined, i: number, fmt: "short" | "medium" | "long" = "medium") {
  const base = startDate ? new Date(startDate) : new Date(2026, 2, 1);
  const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
  if (fmt === "short")  return d.toLocaleDateString("en-AU", { month: "short" });
  if (fmt === "long")   return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
}

function $n(v: number, dp = 0) {
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp });
}

// ── Inline number cell ────────────────────────────────────────────────────────

function NumCell({
  value, onChange, step = 1, min = 0, dp = 0, width = "w-16",
}: {
  value: number; onChange: (v: number) => void;
  step?: number; min?: number; dp?: number; width?: string;
}) {
  return (
    <input
      type="number" min={min} step={step}
      value={dp > 0 ? value : Math.round(value)}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className={cn(
        width, "text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 tabular-nums text-xs"
      )}
    />
  );
}

function ComputedCell({ value, color }: { value: number; color?: string }) {
  return (
    <span className="tabular-nums text-xs font-semibold" style={{ color }}>
      {$n(value)}
    </span>
  );
}

// ── Subcomponent: Planning Row ────────────────────────────────────────────────

interface PlanRowProps {
  monthIdx: number;
  label: string;
  data: PlanningMonth;
  derived: ReturnType<typeof derivebudgetFields>;
  onChange: (idx: number, field: keyof PlanningMonth, val: number) => void;
}

function PlanRow({ monthIdx, label, data, derived, onChange }: PlanRowProps) {
  const totalNights = data.freeNights + data.paidNights;
  const freePct     = totalNights > 0 ? Math.round((data.freeNights / totalNights) * 100) : 0;

  return (
    <tr className="border-b border-border/20 hover:bg-muted/15 transition-colors">
      {/* Month */}
      <td className="p-1.5 pl-3 text-xs font-semibold text-foreground whitespace-nowrap sticky left-0 bg-card z-10">
        {label}
      </td>

      {/* Camping */}
      <td className="p-1 text-center">
        <NumCell value={data.freeNights} onChange={v => onChange(monthIdx, "freeNights", v)} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.paidNights} onChange={v => onChange(monthIdx, "paidNights", v)} />
      </td>
      <td className="p-1 text-center">
        <span className={cn("text-xs font-semibold tabular-nums", freePct >= 50 ? "text-green-600" : "text-amber-600")}>
          {freePct}%
        </span>
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.paidRate} onChange={v => onChange(monthIdx, "paidRate", v)} step={5} />
      </td>
      <td className="p-1 text-right pr-2">
        <ComputedCell value={derived.accommodation} color="#1f6f5f" />
      </td>

      {/* Fuel */}
      <td className="p-1 text-center">
        <NumCell value={data.plannedKm} onChange={v => onChange(monthIdx, "plannedKm", v)} step={50} width="w-20" />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.fuelConsumption} onChange={v => onChange(monthIdx, "fuelConsumption", v)} step={0.5} dp={1} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.fuelPrice} onChange={v => onChange(monthIdx, "fuelPrice", v)} step={0.05} dp={2} />
      </td>
      <td className="p-1 text-right pr-2">
        <ComputedCell value={derived.fuel} color="#d9b880" />
      </td>

      {/* Food */}
      <td className="p-1 text-center">
        <NumCell value={data.totalDays} onChange={v => onChange(monthIdx, "totalDays", v)} step={1} min={1} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.foodDailyRate} onChange={v => onChange(monthIdx, "foodDailyRate", v)} step={5} />
      </td>
      <td className="p-1 text-right pr-2">
        <ComputedCell value={derived.food} />
      </td>

      {/* Extras */}
      <td className="p-1 text-center">
        <NumCell value={data.eatingOut} onChange={v => onChange(monthIdx, "eatingOut", v)} step={25} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.entertainment} onChange={v => onChange(monthIdx, "entertainment", v)} step={25} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.passesPermits} onChange={v => onChange(monthIdx, "passesPermits", v)} step={10} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.ferries} onChange={v => onChange(monthIdx, "ferries", v)} step={50} />
      </td>

      {/* Grand total */}
      <td className="p-1.5 pr-3 text-right">
        <span className="tabular-nums text-xs font-bold text-foreground">{$n(derived.grandTotal)}</span>
      </td>
    </tr>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface PlanningSubProps {
  months: Record<string, any>;
  tripStartDate: string | undefined;
  onChange: (months: Record<string, any>) => void;
}

export default function PlanningSub({ months, tripStartDate, onChange }: PlanningSubProps) {
  const [viewYear, setViewYear] = useState(0);
  const start = viewYear * 12;

  const rows = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const mi  = start + i;
      const raw = months[mi.toString()] ?? months[mi] ?? {};
      const plan = getPlanning(raw);
      const derived = derivebudgetFields(plan);
      return { mi, plan, derived };
    }),
    [months, start]
  );

  const summary = useMemo(() => {
    const totNights      = rows.reduce((s, r) => s + r.plan.freeNights + r.plan.paidNights, 0);
    const totFreeNights  = rows.reduce((s, r) => s + r.plan.freeNights, 0);
    const totKm          = rows.reduce((s, r) => s + r.plan.plannedKm, 0);
    const totAccomm      = rows.reduce((s, r) => s + r.derived.accommodation, 0);
    const totFuel        = rows.reduce((s, r) => s + r.derived.fuel, 0);
    const totFood        = rows.reduce((s, r) => s + r.derived.food, 0);
    const totEatingOut   = rows.reduce((s, r) => s + r.plan.eatingOut, 0);
    const totActivities  = rows.reduce((s, r) => s + r.plan.entertainment, 0);
    const totFerries     = rows.reduce((s, r) => s + r.plan.ferries, 0);
    const totPasses      = rows.reduce((s, r) => s + r.plan.passesPermits, 0);
    const totTravel      = totAccomm + totFuel + totFood + totEatingOut + totActivities + totFerries + totPasses;
    const avgKm          = rows.length > 0 ? totKm / rows.length : 0;
    const freePct        = totNights > 0 ? Math.round((totFreeNights / totNights) * 100) : 0;
    return { totNights, totFreeNights, totKm, totAccomm, totFuel, totFood, totEatingOut, totActivities, totFerries, totPasses, totTravel, avgKm, freePct };
  }, [rows]);

  const handleCellChange = (mi: number, field: keyof PlanningMonth, val: number) => {
    const raw    = months[mi.toString()] ?? months[mi] ?? {};
    const plan   = { ...getPlanning(raw), [field]: val };
    const derived = derivebudgetFields(plan);
    const updated = {
      ...months,
      [mi.toString()]: {
        ...raw,
        ...plan,
        accommodation: derived.accommodation,
        fuel:          derived.fuel,
        food:          derived.food,
        eatingOut:     plan.eatingOut,
        entertainment: plan.entertainment,
        passesPermits: plan.passesPermits,
        ferries:       plan.ferries,
      },
    };
    onChange(updated);
  };

  const th = (label: string, hint?: string, right = false) => (
    <th className={cn(
      "p-1.5 text-xs font-semibold text-muted-foreground whitespace-nowrap",
      right ? "text-right" : "text-center"
    )}>
      {label}
      {hint && <div className="font-normal text-[10px] opacity-70">{hint}</div>}
    </th>
  );

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Trip Planning — Travel Cost Workbook
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set camping mix, km, fuel, food and activities per month — values sync back to Budget automatically
          </p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-1">
          <button onClick={() => setViewYear(v => Math.max(0, v - 1))}
            className="p-1.5 rounded hover:bg-muted border border-border" disabled={viewYear === 0}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          {[0, 1, 2, 3, 4].map(yr => (
            <button key={yr} onClick={() => setViewYear(yr)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-semibold transition-colors border",
                viewYear === yr
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
              Year {yr + 1}
            </button>
          ))}
          <button onClick={() => setViewYear(v => Math.min(4, v + 1))}
            className="p-1.5 rounded hover:bg-muted border border-border" disabled={viewYear === 4}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Year KPI Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: "Total Nights",     value: `${summary.totNights}`,                       icon: <Tent className="h-3.5 w-3.5" />,    color: "#1f6f5f" },
          { label: "Free Camping",     value: `${summary.freePct}%`,                         icon: <Tent className="h-3.5 w-3.5" />,    color: "#16a34a" },
          { label: "Total Km",         value: summary.totKm.toLocaleString() + " km",        icon: <Map className="h-3.5 w-3.5" />,     color: "#d9b880" },
          { label: "Avg Km/Month",     value: Math.round(summary.avgKm).toLocaleString() + " km", icon: <TrendingUp className="h-3.5 w-3.5" />, color: "#d9b880" },
          { label: "Accommodation",    value: $n(summary.totAccomm),                         icon: <Tent className="h-3.5 w-3.5" />,    color: "#1f6f5f" },
          { label: "Fuel",             value: $n(summary.totFuel),                           icon: <Fuel className="h-3.5 w-3.5" />,    color: "#ef8c00" },
          { label: "Food & Groceries", value: $n(summary.totFood),                           icon: <Utensils className="h-3.5 w-3.5" />, color: "#60a5fa" },
          { label: "Year Total",       value: $n(summary.totTravel),                         icon: <TrendingUp className="h-3.5 w-3.5" />, color: "#ef4444" },
        ].map(k => (
          <div key={k.label} className="px-2.5 py-2 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5" style={{ color: k.color }}>
              {k.icon}
              <span className="text-[10px] uppercase tracking-wide font-semibold">{k.label}</span>
            </div>
            <div className="text-sm font-bold tabular-nums text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Planning Table ── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">
            Month-by-Month Planning — {monthLabel(tripStartDate, start, "long")} to {monthLabel(tripStartDate, start + 11, "long")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b-2 border-border bg-muted/30">
                  <th className="p-1.5 pl-3 text-left text-xs font-bold text-muted-foreground sticky left-0 bg-muted/30 z-10 w-24">Month</th>

                  {/* Camping group */}
                  <th colSpan={6} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#1f6f5f", backgroundColor: "#1f6f5f10" }}>
                    Camping — Accommodation
                  </th>

                  {/* Fuel group */}
                  <th colSpan={4} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#d9b880", backgroundColor: "#d9b88010" }}>
                    Fuel &amp; Travel
                  </th>

                  {/* Food group */}
                  <th colSpan={3} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#60a5fa", backgroundColor: "#60a5fa10" }}>
                    Food &amp; Groceries
                  </th>

                  {/* Extras */}
                  <th colSpan={4} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#a78bfa", backgroundColor: "#a78bfa10" }}>
                    Extras &amp; Activities
                  </th>

                  <th className="p-1.5 text-right text-xs font-bold border-l border-border/40 pr-3">Total</th>
                </tr>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="p-1 pl-3 sticky left-0 bg-muted/20 z-10" />
                  {/* Camping sub-headers */}
                  {th("Free Nts")}
                  {th("Paid Nts")}
                  {th("Free %")}
                  {th("$/Night")}
                  {th("Total", undefined, true)}
                  <th className="border-l border-border/40" />
                  {/* Fuel sub-headers */}
                  {th("Km")}
                  {th("L/100")}
                  {th("$/L")}
                  {th("Total", undefined, true)}
                  <th className="border-l border-border/40" />
                  {/* Food sub-headers */}
                  {th("Days")}
                  {th("$/Day")}
                  {th("Total", undefined, true)}
                  <th className="border-l border-border/40" />
                  {/* Extras sub-headers */}
                  {th("Eat Out")}
                  {th("Activities")}
                  {th("Passes")}
                  {th("Ferries")}
                  <th className="border-l border-border/40" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ mi, plan, derived }) => (
                  <PlanRow
                    key={mi}
                    monthIdx={mi}
                    label={monthLabel(tripStartDate, mi, "medium")}
                    data={plan}
                    derived={derived}
                    onChange={handleCellChange}
                  />
                ))}

                {/* Year totals row */}
                <tr className="border-t-2 border-border bg-muted/30 font-bold">
                  <td className="p-1.5 pl-3 text-xs font-bold sticky left-0 bg-muted/30 z-10">Year {viewYear + 1} Total</td>
                  <td className="p-1 text-center text-xs tabular-nums">{rows.reduce((s, r) => s + r.plan.freeNights, 0)}</td>
                  <td className="p-1 text-center text-xs tabular-nums">{rows.reduce((s, r) => s + r.plan.paidNights, 0)}</td>
                  <td className="p-1 text-center text-xs tabular-nums text-primary font-semibold">{summary.freePct}%</td>
                  <td className="p-1 text-center text-xs text-muted-foreground">avg {$n(rows.reduce((s, r) => s + r.plan.paidRate, 0) / 12)}</td>
                  <td className="p-1 text-right pr-2 text-xs tabular-nums" style={{ color: "#1f6f5f" }}>{$n(summary.totAccomm)}</td>
                  <td />
                  <td className="p-1 text-center text-xs tabular-nums">{summary.totKm.toLocaleString()}</td>
                  <td className="p-1 text-center text-xs text-muted-foreground">avg {(rows.reduce((s, r) => s + r.plan.fuelConsumption, 0) / 12).toFixed(1)}</td>
                  <td className="p-1 text-center text-xs text-muted-foreground">avg ${(rows.reduce((s, r) => s + r.plan.fuelPrice, 0) / 12).toFixed(2)}</td>
                  <td className="p-1 text-right pr-2 text-xs tabular-nums" style={{ color: "#d9b880" }}>{$n(summary.totFuel)}</td>
                  <td />
                  <td className="p-1 text-center text-xs tabular-nums">{rows.reduce((s, r) => s + r.plan.totalDays, 0)}</td>
                  <td className="p-1 text-center text-xs text-muted-foreground">avg ${(rows.reduce((s, r) => s + r.plan.foodDailyRate, 0) / 12).toFixed(0)}</td>
                  <td className="p-1 text-right pr-2 text-xs tabular-nums">{$n(summary.totFood)}</td>
                  <td />
                  <td className="p-1 text-center text-xs tabular-nums">{$n(summary.totEatingOut)}</td>
                  <td className="p-1 text-center text-xs tabular-nums">{$n(summary.totActivities)}</td>
                  <td className="p-1 text-center text-xs tabular-nums">{$n(summary.totPasses)}</td>
                  <td className="p-1 text-center text-xs tabular-nums">{$n(summary.totFerries)}</td>
                  <td />
                  <td className="p-1.5 pr-3 text-right text-sm font-bold text-foreground tabular-nums">{$n(summary.totTravel)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Cost breakdown bar ── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Year {viewYear + 1} — Travel Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {summary.totTravel > 0 && (
            <div className="space-y-2">
              {[
                { label: "Accommodation",    value: summary.totAccomm,    color: "#1f6f5f" },
                { label: "Fuel",             value: summary.totFuel,      color: "#d9b880" },
                { label: "Food & Groceries", value: summary.totFood,      color: "#60a5fa" },
                { label: "Eating Out",       value: summary.totEatingOut, color: "#a78bfa" },
                { label: "Activities",       value: summary.totActivities, color: "#f97316" },
                { label: "Passes & Permits", value: summary.totPasses,    color: "#ef4444" },
                { label: "Ferries",          value: summary.totFerries,   color: "#6b7280" },
              ].filter(r => r.value > 0).map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="w-36 text-xs text-muted-foreground shrink-0">{r.label}</div>
                  <div className="flex-1 bg-muted/40 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (r.value / summary.totTravel) * 100).toFixed(1)}%`, backgroundColor: r.color }} />
                  </div>
                  <div className="w-20 text-right text-xs font-semibold tabular-nums">{$n(r.value)}</div>
                  <div className="w-10 text-right text-xs text-muted-foreground">
                    {((r.value / summary.totTravel) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap gap-6 text-xs text-muted-foreground">
            <span>Cost per km: <strong className="text-foreground">${summary.totKm > 0 ? (summary.totTravel / summary.totKm).toFixed(2) : "—"}</strong></span>
            <span>Cost per night: <strong className="text-foreground">${summary.totNights > 0 ? (summary.totAccomm / (summary.totNights > 0 ? rows.reduce((s, r) => s + r.plan.paidNights, 0) : 1)).toFixed(0) : "—"}</strong>/paid night</span>
            <span>Food per day: <strong className="text-foreground">${summary.totFood > 0 && rows.reduce((s,r)=>s+r.plan.totalDays,0) > 0 ? (summary.totFood / rows.reduce((s,r)=>s+r.plan.totalDays,0)).toFixed(0) : "—"}</strong>/day avg</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Sync notice ── */}
      <div className="p-3 rounded-lg border border-primary/30 bg-primary/8 text-xs text-muted-foreground">
        All values above are automatically synced to the Budget tab — Accommodation, Fuel, Food, Eating Out, Entertainment, Passes and Ferries columns update as you type.
        Changes are auto-saved with a short debounce.
      </div>

    </div>
  );
}
