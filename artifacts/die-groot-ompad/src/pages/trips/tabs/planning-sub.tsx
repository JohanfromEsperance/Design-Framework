import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Tent, Fuel, Utensils, Map, TrendingUp, Home, Users,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Area,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanningMonth {
  atHome: boolean;
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
  grandkidsFlights: number;
  grandkidsHotels: number;
}

const PLANNING_DEFAULTS: PlanningMonth = {
  atHome: false,
  freeNights: 12,
  paidNights: 18,
  paidRate: 75,
  plannedKm: 1200,
  fuelConsumption: 18,
  fuelPrice: 2.80,
  totalDays: 30,
  foodDailyRate: 30,
  eatingOut: 150,
  entertainment: 120,
  passesPermits: 0,
  ferries: 0,
  grandkidsFlights: 0,
  grandkidsHotels: 0,
};

// ── Calendar helpers ──────────────────────────────────────────────────────────

function calendarDays(startDate: string | undefined, i: number): number {
  const base = startDate ? new Date(startDate) : new Date(2026, 2, 1);
  const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

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

// ── Data helpers ──────────────────────────────────────────────────────────────

function getPlanning(m: Record<string, any>): PlanningMonth {
  return {
    atHome:           Boolean(m.atHome),
    freeNights:       Number(m.freeNights)       || PLANNING_DEFAULTS.freeNights,
    paidNights:       Number(m.paidNights)       || PLANNING_DEFAULTS.paidNights,
    paidRate:         Number(m.paidRate)         || PLANNING_DEFAULTS.paidRate,
    plannedKm:        Number(m.plannedKm)        || PLANNING_DEFAULTS.plannedKm,
    fuelConsumption:  Number(m.fuelConsumption)  || PLANNING_DEFAULTS.fuelConsumption,
    fuelPrice:        Number(m.fuelPrice)        || PLANNING_DEFAULTS.fuelPrice,
    totalDays:        Number(m.totalDays)        || PLANNING_DEFAULTS.totalDays,
    foodDailyRate:    Number(m.foodDailyRate)    || PLANNING_DEFAULTS.foodDailyRate,
    eatingOut:        Number(m.eatingOut)        || PLANNING_DEFAULTS.eatingOut,
    entertainment:    Number(m.entertainment)    || PLANNING_DEFAULTS.entertainment,
    passesPermits:    Number(m.passesPermits)    || 0,
    ferries:          Number(m.ferries)          || 0,
    grandkidsFlights: Number(m.grandkidsFlights) || 0,
    grandkidsHotels:  Number(m.grandkidsHotels)  || 0,
  };
}

function deriveFields(p: PlanningMonth, days: number) {
  const grandkidsTotal = p.grandkidsFlights + p.grandkidsHotels;
  if (p.atHome) return { accommodation: 0, fuel: 0, food: 0, grandkidsTotal, grandTotal: grandkidsTotal };
  const accommodation = Math.round(p.paidNights * p.paidRate);
  const fuel          = Math.round(p.plannedKm * (p.fuelConsumption / 100) * p.fuelPrice);
  const food          = Math.round(days * p.foodDailyRate);
  const extras        = p.eatingOut + p.entertainment + p.passesPermits + p.ferries;
  const grandTotal    = accommodation + fuel + food + extras + grandkidsTotal;
  return { accommodation, fuel, food, grandkidsTotal, grandTotal };
}

// ── AI trend band (linear regression ± 1 std dev) ────────────────────────────

function computeAIBand(totals: number[]) {
  const n = totals.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const xm = xs.reduce((s, x) => s + x, 0) / n;
  const ym = totals.reduce((s, y) => s + y, 0) / n;
  const ss = xs.reduce((s, x) => s + (x - xm) ** 2, 0);
  const slope = ss === 0 ? 0 : xs.reduce((s, x, i) => s + (x - xm) * (totals[i] - ym), 0) / ss;
  const intercept = ym - slope * xm;
  const residuals = totals.map((y, i) => y - (intercept + slope * i));
  const stdDev = Math.sqrt(residuals.reduce((s, r) => s + r ** 2, 0) / n);
  return xs.map(i => ({
    aiBandLow:  Math.round(Math.max(0, intercept + slope * i - stdDev)),
    aiBandHigh: Math.round(intercept + slope * i + stdDev),
    aiTrend:    Math.round(intercept + slope * i),
  }));
}

// ── HelpTip component ─────────────────────────────────────────────────────────

function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle ml-0.5">
      <span
        className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-muted/70 text-muted-foreground text-[9px] font-bold cursor-help select-none hover:bg-primary/20 hover:text-primary transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >?</span>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-5 z-50 w-52 p-2 rounded-md shadow-xl bg-popover text-popover-foreground text-[11px] border border-border leading-relaxed pointer-events-none">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full h-0 w-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-popover" />
        </div>
      )}
    </span>
  );
}

// ── NumCell ───────────────────────────────────────────────────────────────────

function NumCell({
  value, onChange, step = 1, min = 0, max, dp = 0, width = "w-16", disabled = false,
}: {
  value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; dp?: number; width?: string; disabled?: boolean;
}) {
  return (
    <input
      type="number" min={min} max={max} step={step}
      value={dp > 0 ? value : Math.round(value)}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      disabled={disabled}
      className={cn(
        width, "text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 tabular-nums text-xs",
        disabled && "opacity-30 cursor-not-allowed pointer-events-none"
      )}
    />
  );
}

function ComputedCell({ value, color, dim }: { value: number; color?: string; dim?: boolean }) {
  return (
    <span className={cn("tabular-nums text-xs font-semibold", dim && "opacity-30")} style={{ color: dim ? undefined : color }}>
      {$n(value)}
    </span>
  );
}

// ── Planning Row ──────────────────────────────────────────────────────────────

interface PlanRowProps {
  monthIdx: number;
  label: string;
  data: PlanningMonth;
  derived: ReturnType<typeof deriveFields>;
  days: number;
  onChange: (idx: number, field: keyof PlanningMonth, val: number) => void;
  onAtHomeToggle: (idx: number) => void;
}

function PlanRow({ monthIdx, label, data, derived, days, onChange, onAtHomeToggle }: PlanRowProps) {
  const totalNights = data.freeNights + data.paidNights;
  const freePct     = totalNights > 0 ? Math.round((data.freeNights / totalNights) * 100) : 0;
  const dim         = data.atHome;

  return (
    <tr className={cn(
      "border-b border-border/20 transition-colors",
      dim ? "bg-muted/30 hover:bg-muted/40" : "hover:bg-muted/15"
    )}>
      {/* Month label + home/travel toggle */}
      <td className={cn(
        "p-1.5 pl-2 text-xs font-semibold whitespace-nowrap sticky left-0 z-10",
        dim ? "bg-muted/30 text-muted-foreground" : "bg-card text-foreground"
      )}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAtHomeToggle(monthIdx)}
            title={dim ? "Mark as travelling" : "Mark as home month (zeros travel costs)"}
            className={cn(
              "h-5 w-5 rounded flex items-center justify-center transition-colors shrink-0",
              dim
                ? "bg-[#d9b880]/30 text-[#b8943e] hover:bg-[#d9b880]/50"
                : "bg-muted/50 text-muted-foreground hover:bg-primary/20 hover:text-primary"
            )}
          >
            {dim ? <Home className="h-3 w-3" /> : <Tent className="h-3 w-3" />}
          </button>
          <span className={cn(dim && "text-muted-foreground")}>{label}</span>
          {dim && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#b8943e] bg-[#d9b880]/20 px-1 rounded">
              Home
            </span>
          )}
        </div>
      </td>

      {/* Camping — Accommodation (6 cols: Days, Free, Paid, %, Rate, Total) */}
      <td className="p-1 text-center border-l border-border/30">
        <span className={cn("tabular-nums text-xs font-semibold", dim ? "opacity-30 text-muted-foreground" : "text-foreground")}>
          {dim ? "—" : days}
        </span>
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.freeNights} max={days} onChange={v => onChange(monthIdx, "freeNights", v)} disabled={dim} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.paidNights} max={days} onChange={v => onChange(monthIdx, "paidNights", v)} disabled={dim} />
      </td>
      <td className="p-1 text-center">
        <span className={cn("text-xs font-semibold tabular-nums", dim ? "opacity-30" : freePct >= 50 ? "text-green-600" : "text-amber-600")}>
          {dim ? "—" : `${freePct}%`}
        </span>
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.paidRate} onChange={v => onChange(monthIdx, "paidRate", v)} step={5} disabled={dim} />
      </td>
      <td className="p-1 text-right pr-2">
        <ComputedCell value={derived.accommodation} color="#1f6f5f" dim={dim} />
      </td>

      {/* Fuel & Travel (4 cols) */}
      <td className="p-1 text-center border-l border-border/30">
        <NumCell value={data.plannedKm} onChange={v => onChange(monthIdx, "plannedKm", v)} step={50} width="w-20" disabled={dim} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.fuelConsumption} onChange={v => onChange(monthIdx, "fuelConsumption", v)} step={0.5} dp={1} disabled={dim} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.fuelPrice} onChange={v => onChange(monthIdx, "fuelPrice", v)} step={0.05} dp={2} disabled={dim} />
      </td>
      <td className="p-1 text-right pr-2">
        <ComputedCell value={derived.fuel} color="#d9b880" dim={dim} />
      </td>

      {/* Food & Groceries (2 cols — days from Camping, rate + total) */}
      <td className="p-1 text-center border-l border-border/30">
        <NumCell value={data.foodDailyRate} onChange={v => onChange(monthIdx, "foodDailyRate", v)} step={5} disabled={dim} />
      </td>
      <td className="p-1 text-right pr-2">
        <ComputedCell value={derived.food} color="#60a5fa" dim={dim} />
      </td>

      {/* Extras & Activities (4 cols) */}
      <td className="p-1 text-center border-l border-border/30">
        <NumCell value={data.eatingOut} onChange={v => onChange(monthIdx, "eatingOut", v)} step={25} disabled={dim} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.entertainment} onChange={v => onChange(monthIdx, "entertainment", v)} step={25} disabled={dim} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.passesPermits} onChange={v => onChange(monthIdx, "passesPermits", v)} step={10} disabled={dim} />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.ferries} onChange={v => onChange(monthIdx, "ferries", v)} step={50} disabled={dim} />
      </td>

      {/* Grandkids & Family (3 cols) */}
      <td className="p-1 text-center border-l border-border/30">
        <NumCell value={data.grandkidsFlights} onChange={v => onChange(monthIdx, "grandkidsFlights", v)} step={50} width="w-20" />
      </td>
      <td className="p-1 text-center">
        <NumCell value={data.grandkidsHotels} onChange={v => onChange(monthIdx, "grandkidsHotels", v)} step={50} width="w-20" />
      </td>
      <td className="p-1 text-right pr-2">
        <ComputedCell value={derived.grandkidsTotal} color="#ec4899" />
      </td>

      {/* Grand total */}
      <td className="p-1.5 pr-3 text-right border-l border-border/30">
        <span className="tabular-nums text-xs font-bold text-foreground">{$n(derived.grandTotal)}</span>
      </td>
    </tr>
  );
}

// ── 24-Month Summary Chart ────────────────────────────────────────────────────

const COST_COLORS = {
  accommodation: "#1f6f5f",
  fuel:          "#d9b880",
  food:          "#60a5fa",
  extras:        "#a78bfa",
  grandkids:     "#ec4899",
};

interface ChartDatum {
  month: string;
  mi: number;
  accommodation: number;
  fuel: number;
  food: number;
  extras: number;
  grandkids: number;
  total: number;
  freeNights: number;
  paidNights: number;
  km: number;
  aiBandLow: number;
  aiBandHigh: number;
  aiTrend: number;
}

function PlanningChart({ data, from, to }: { data: ChartDatum[]; from: number; to: number }) {
  const slice = data.slice(from, to + 1);
  const count = slice.length;

  const maxCost  = Math.max(...slice.map(d => d.aiBandHigh), 1);
  const maxNight = Math.max(...slice.map(d => d.freeNights + d.paidNights), 1);

  const fmtCost  = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
  const fmtNight = (v: number) => `${v}n`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = slice.find(r => r.month === label);
    if (!d) return null;
    return (
      <div className="bg-popover border border-border rounded-md p-3 shadow-xl text-xs space-y-1 min-w-[160px]">
        <div className="font-bold text-foreground mb-1">{label}</div>
        <div className="flex justify-between gap-4"><span style={{ color: COST_COLORS.accommodation }}>Accommodation</span><span>{$n(d.accommodation)}</span></div>
        <div className="flex justify-between gap-4"><span style={{ color: COST_COLORS.fuel }}>Fuel</span><span>{$n(d.fuel)}</span></div>
        <div className="flex justify-between gap-4"><span style={{ color: COST_COLORS.food }}>Food</span><span>{$n(d.food)}</span></div>
        <div className="flex justify-between gap-4"><span style={{ color: COST_COLORS.extras }}>Extras</span><span>{$n(d.extras)}</span></div>
        {d.grandkids > 0 && <div className="flex justify-between gap-4"><span style={{ color: COST_COLORS.grandkids }}>Grandkids</span><span>{$n(d.grandkids)}</span></div>}
        <div className="flex justify-between gap-4 font-bold border-t border-border/40 pt-1"><span>Total</span><span>{$n(d.total)}</span></div>
        <div className="border-t border-border/40 pt-1 text-muted-foreground space-y-0.5">
          <div className="flex justify-between gap-4"><span className="text-green-600">Free nights</span><span>{d.freeNights}</span></div>
          <div className="flex justify-between gap-4"><span className="text-amber-600">Paid nights</span><span>{d.paidNights}</span></div>
          <div className="flex justify-between gap-4"><span>Distance</span><span>{d.km.toLocaleString()} km</span></div>
          <div className="flex justify-between gap-4"><span>AI range</span><span>{$n(d.aiBandLow)} – {$n(d.aiBandHigh)}</span></div>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={slice} margin={{ top: 8, right: 48, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb30" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb40" }}
          interval={count <= 24 ? 1 : count <= 36 ? 2 : 4}
        />
        <YAxis
          yAxisId="cost"
          orientation="left"
          tickFormatter={fmtCost}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          domain={[0, Math.ceil(maxCost / 1000) * 1000]}
          label={{ value: "Cost ($)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#9ca3af" } }}
        />
        <YAxis
          yAxisId="nights"
          orientation="right"
          tickFormatter={fmtNight}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          domain={[0, Math.ceil(maxNight / 5) * 5 + 5]}
          label={{ value: "Nights / Km÷20", angle: 90, position: "insideRight", offset: 8, style: { fontSize: 10, fill: "#9ca3af" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconSize={8}
          wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
          formatter={(value) => {
            const labels: Record<string, string> = {
              accommodation: "Accommodation", fuel: "Fuel", food: "Food",
              extras: "Extras", grandkids: "Grandkids",
              aiBandLow: "AI Band", freeNights: "Free Nights", paidNights: "Paid Nights",
            };
            return labels[value] ?? value;
          }}
        />

        {/* AI confidence band */}
        <Area
          yAxisId="cost"
          dataKey="aiBandHigh"
          stroke="none"
          fill="#ef444420"
          legendType="none"
          name="aiBandHigh"
        />
        <Area
          yAxisId="cost"
          dataKey="aiBandLow"
          stroke="none"
          fill="#ffffff"
          legendType="none"
          name="aiBandLow"
        />

        {/* Stacked cost bars */}
        <Bar yAxisId="cost" dataKey="accommodation" stackId="cost" fill={COST_COLORS.accommodation} name="accommodation" maxBarSize={28} />
        <Bar yAxisId="cost" dataKey="fuel"          stackId="cost" fill={COST_COLORS.fuel}          name="fuel"          maxBarSize={28} />
        <Bar yAxisId="cost" dataKey="food"          stackId="cost" fill={COST_COLORS.food}          name="food"          maxBarSize={28} />
        <Bar yAxisId="cost" dataKey="extras"        stackId="cost" fill={COST_COLORS.extras}        name="extras"        maxBarSize={28} />
        <Bar yAxisId="cost" dataKey="grandkids"     stackId="cost" fill={COST_COLORS.grandkids}     name="grandkids"     maxBarSize={28} />

        {/* AI trend line */}
        <Line
          yAxisId="cost"
          dataKey="aiTrend"
          stroke="#ef4444"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="4 2"
          legendType="none"
          name="aiTrend"
        />

        {/* Nights split — right axis */}
        <Line
          yAxisId="nights"
          dataKey="freeNights"
          stroke="#16a34a"
          strokeWidth={1.5}
          dot={false}
          name="freeNights"
        />
        <Line
          yAxisId="nights"
          dataKey="paidNights"
          stroke="#f97316"
          strokeWidth={1.5}
          dot={false}
          name="paidNights"
        />

        {/* Avg km as trendline (÷20 to fit nights axis) */}
        <Line
          yAxisId="nights"
          dataKey={(d: ChartDatum) => Math.round(d.km / 20)}
          stroke="#d9b880"
          strokeWidth={1.5}
          dot={false}
          legendType="none"
          name="kmScaled"
        />
      </ComposedChart>
    </ResponsiveContainer>
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
  const [chartFrom, setChartFrom] = useState(0);
  const [chartTo,   setChartTo]   = useState(59);
  const start = viewYear * 12;

  // All 60 months for chart computation
  const allMonthData = useMemo(() =>
    Array.from({ length: 60 }, (_, mi) => {
      const raw   = months[mi.toString()] ?? months[mi] ?? {};
      const plan  = getPlanning(raw);
      const days  = calendarDays(tripStartDate, mi);
      const d     = deriveFields(plan, days);
      return {
        month:   monthLabel(tripStartDate, mi, "short"),
        mi,
        accommodation: d.accommodation,
        fuel:          d.fuel,
        food:          d.food,
        extras:        plan.atHome ? 0 : (plan.eatingOut + plan.entertainment + plan.passesPermits + plan.ferries),
        grandkids:     d.grandkidsTotal,
        total:         d.grandTotal,
        freeNights:    plan.atHome ? 0 : plan.freeNights,
        paidNights:    plan.atHome ? 0 : plan.paidNights,
        km:            plan.atHome ? 0 : plan.plannedKm,
      };
    }),
    [months, tripStartDate]
  );

  const chartData: ChartDatum[] = useMemo(() => {
    const band = computeAIBand(allMonthData.map(d => d.total));
    return allMonthData.map((d, i) => ({ ...d, ...band[i] }));
  }, [allMonthData]);

  // Current-view rows (12 months for the table)
  const rows = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const mi   = start + i;
      const raw  = months[mi.toString()] ?? months[mi] ?? {};
      const plan = getPlanning(raw);
      const days = calendarDays(tripStartDate, mi);
      return { mi, plan, derived: deriveFields(plan, days), days };
    }),
    [months, start, tripStartDate]
  );

  const summary = useMemo(() => {
    const travelling    = rows.filter(r => !r.plan.atHome);
    const totNights     = travelling.reduce((s, r) => s + r.plan.freeNights + r.plan.paidNights, 0);
    const totFreeNights = travelling.reduce((s, r) => s + r.plan.freeNights, 0);
    const totKm         = travelling.reduce((s, r) => s + r.plan.plannedKm, 0);
    const totAccomm     = rows.reduce((s, r) => s + r.derived.accommodation, 0);
    const totFuel       = rows.reduce((s, r) => s + r.derived.fuel, 0);
    const totFood       = rows.reduce((s, r) => s + r.derived.food, 0);
    const totEatingOut  = travelling.reduce((s, r) => s + r.plan.eatingOut, 0);
    const totActivities = travelling.reduce((s, r) => s + r.plan.entertainment, 0);
    const totFerries    = travelling.reduce((s, r) => s + r.plan.ferries, 0);
    const totPasses     = travelling.reduce((s, r) => s + r.plan.passesPermits, 0);
    const totGrandkids  = rows.reduce((s, r) => s + r.derived.grandkidsTotal, 0);
    const totTravel     = totAccomm + totFuel + totFood + totEatingOut + totActivities + totFerries + totPasses + totGrandkids;
    const freePct       = totNights > 0 ? Math.round((totFreeNights / totNights) * 100) : 0;
    const homeMonths    = rows.filter(r => r.plan.atHome).length;
    return { totNights, totFreeNights, totKm, totAccomm, totFuel, totFood, totEatingOut, totActivities, totFerries, totPasses, totGrandkids, totTravel, freePct, homeMonths, travelling: travelling.length };
  }, [rows]);

  const handleCellChange = (mi: number, field: keyof PlanningMonth, val: number) => {
    const raw   = months[mi.toString()] ?? months[mi] ?? {};
    const days  = calendarDays(tripStartDate, mi);
    let plan    = { ...getPlanning(raw), [field]: val };

    // Auto-adjust free ↔ paid so they always sum to calendar days
    if (field === "freeNights") {
      plan.freeNights = Math.min(Math.max(0, val), days);
      plan.paidNights = Math.max(0, days - plan.freeNights);
    } else if (field === "paidNights") {
      plan.paidNights = Math.min(Math.max(0, val), days);
      plan.freeNights = Math.max(0, days - plan.paidNights);
    }

    const derived = deriveFields(plan, days);
    onChange({
      ...months,
      [mi.toString()]: {
        ...raw, ...plan,
        totalDays:        days,
        accommodation:    derived.accommodation,
        fuel:             derived.fuel,
        food:             derived.food,
        eatingOut:        plan.atHome ? 0 : plan.eatingOut,
        entertainment:    plan.atHome ? 0 : plan.entertainment,
        passesPermits:    plan.atHome ? 0 : plan.passesPermits,
        ferries:          plan.atHome ? 0 : plan.ferries,
        grandkidsFlights: plan.grandkidsFlights,
        grandkidsHotels:  plan.grandkidsHotels,
      },
    });
  };

  const handleAtHomeToggle = (mi: number) => {
    const raw     = months[mi.toString()] ?? months[mi] ?? {};
    const days    = calendarDays(tripStartDate, mi);
    const plan    = getPlanning(raw);
    const newPlan = { ...plan, atHome: !plan.atHome };
    const derived = deriveFields(newPlan, days);
    onChange({
      ...months,
      [mi.toString()]: {
        ...raw, ...newPlan,
        totalDays:        days,
        accommodation:    derived.accommodation,
        fuel:             derived.fuel,
        food:             derived.food,
        eatingOut:        newPlan.atHome ? 0 : plan.eatingOut,
        entertainment:    newPlan.atHome ? 0 : plan.entertainment,
        passesPermits:    newPlan.atHome ? 0 : plan.passesPermits,
        ferries:          newPlan.atHome ? 0 : plan.ferries,
        grandkidsFlights: plan.grandkidsFlights,
        grandkidsHotels:  plan.grandkidsHotels,
      },
    });
  };

  const th = (label: string, tip?: string, right = false, borderLeft = false) => (
    <th className={cn(
      "p-1.5 text-xs font-semibold text-muted-foreground whitespace-nowrap",
      right ? "text-right" : "text-center",
      borderLeft && "border-l border-border/30"
    )}>
      <span className="inline-flex items-center gap-0.5">
        {label}
        {tip && <HelpTip text={tip} />}
      </span>
    </th>
  );

  return (
    <div className="space-y-5 pb-8">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Trip Planning — Travel Cost Workbook
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toggle the tent/home icon to mark a home-stay month — travel costs zero automatically.
            Days are auto-computed from the calendar; changing free nights auto-adjusts paid and vice versa.
          </p>
        </div>
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

      {/* ── Year KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
        {[
          { label: "Travelling",    value: `${summary.travelling} months`,                  icon: <Tent className="h-3.5 w-3.5" />,       color: "#1f6f5f" },
          { label: "At Home",       value: `${summary.homeMonths} months`,                  icon: <Home className="h-3.5 w-3.5" />,       color: "#b8943e" },
          { label: "Total Nights",  value: `${summary.totNights}`,                          icon: <Tent className="h-3.5 w-3.5" />,       color: "#1f6f5f" },
          { label: "Free Camping",  value: `${summary.freePct}%`,                           icon: <Tent className="h-3.5 w-3.5" />,       color: "#16a34a" },
          { label: "Total Km",      value: summary.totKm.toLocaleString() + " km",          icon: <Map className="h-3.5 w-3.5" />,        color: "#d9b880" },
          { label: "Accommodation", value: $n(summary.totAccomm),                           icon: <Tent className="h-3.5 w-3.5" />,       color: "#1f6f5f" },
          { label: "Fuel",          value: $n(summary.totFuel),                             icon: <Fuel className="h-3.5 w-3.5" />,       color: "#ef8c00" },
          { label: "Grandkids",     value: $n(summary.totGrandkids),                        icon: <Users className="h-3.5 w-3.5" />,      color: "#ec4899" },
          { label: "Year Total",    value: $n(summary.totTravel),                           icon: <TrendingUp className="h-3.5 w-3.5" />, color: "#ef4444" },
        ].map(k => (
          <div key={k.label} className="px-2.5 py-2 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-1 mb-0.5" style={{ color: k.color }}>
              {k.icon}
              <span className="text-[10px] uppercase tracking-wide font-semibold">{k.label}</span>
            </div>
            <div className="text-sm font-bold tabular-nums text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Travel Cost Summary Chart ── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm">
                Travel Cost Trend — {monthLabel(tripStartDate, chartFrom, "medium")} to {monthLabel(tripStartDate, chartTo, "medium")} ({chartTo - chartFrom + 1} months)
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Stacked bars = cost breakdown · Red band = AI projected range (±1 std dev) ·
                Right axis: free nights (green), paid nights (orange), km÷20 (sand)
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground">From</span>
              <select
                value={chartFrom}
                onChange={e => { const v = Number(e.target.value); setChartFrom(v); if (v > chartTo) setChartTo(v); }}
                className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{monthLabel(tripStartDate, i, "medium")}</option>
                ))}
              </select>
              <span className="text-[11px] text-muted-foreground">To</span>
              <select
                value={chartTo}
                onChange={e => setChartTo(Number(e.target.value))}
                className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i} disabled={i < chartFrom}>{monthLabel(tripStartDate, i, "medium")}</option>
                ))}
              </select>
              <div className="flex gap-1 ml-1">
                {[
                  { label: "12 mo", from: 0, to: 11 },
                  { label: "24 mo", from: 0, to: 23 },
                  { label: "All",   from: 0, to: 59 },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => { setChartFrom(p.from); setChartTo(p.to); }}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold border transition-colors",
                      chartFrom === p.from && chartTo === p.to
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <PlanningChart data={chartData} from={chartFrom} to={chartTo} />
        </CardContent>
      </Card>

      {/* ── Planning Table ── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">
            Month-by-Month Planning — {monthLabel(tripStartDate, start, "long")} to {monthLabel(tripStartDate, start + 11, "long")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/*
              Column layout — NO blank separator columns, border-l on first col of each group:
              Month | [Camping×6: Days FreeNts PaidNts Free% $/Nt Total] | [Fuel×4: Km L/100 $/L Total]
                    | [Food×2: $/Day Total] | [Extras×4: EatOut Activities Passes Ferries]
                    | [Grandkids×3: Flights Hotels Total] | GrandTotal
              Total: 1 + 6 + 4 + 2 + 4 + 3 + 1 = 21 columns
            */}
            <table className="w-full text-sm border-collapse min-w-[1100px]">
              <thead>
                {/* Group header row */}
                <tr className="border-b-2 border-border bg-muted/30">
                  <th className="p-1.5 pl-3 text-left text-xs font-bold text-muted-foreground sticky left-0 bg-muted/30 z-10 w-32">Month</th>
                  <th colSpan={6} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#1f6f5f", backgroundColor: "#1f6f5f10" }}>
                    Camping — Accommodation
                  </th>
                  <th colSpan={4} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#d9b880", backgroundColor: "#d9b88010" }}>
                    Fuel &amp; Travel
                  </th>
                  <th colSpan={2} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#60a5fa", backgroundColor: "#60a5fa10" }}>
                    Food &amp; Groceries
                  </th>
                  <th colSpan={4} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#a78bfa", backgroundColor: "#a78bfa10" }}>
                    Extras &amp; Activities
                  </th>
                  <th colSpan={3} className="p-1.5 text-center text-xs font-bold border-l border-border/40"
                    style={{ color: "#ec4899", backgroundColor: "#ec489910" }}>
                    Grandkids &amp; Family
                  </th>
                  <th className="p-1.5 text-right text-xs font-bold border-l border-border/40 pr-3">Total</th>
                </tr>
                {/* Sub-header row — columns aligned exactly to data cells */}
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="p-1 pl-3 sticky left-0 bg-muted/20 z-10" />
                  {th("Days",    "Calendar days in the month — auto-computed, used for food budget and as the max for camping nights.", false, true)}
                  {th("Free Nts","Free-camping nights (bush camps, rest areas, national parks with free sites). Changing this auto-adjusts paid nights to fill the month.")}
                  {th("Paid Nts","Paid-site nights (caravan parks, powered sites). Changing this auto-adjusts free nights to fill the month.")}
                  {th("Free %",  "Percentage of camping nights at free sites. Higher is better for the budget.")}
                  {th("$/Night", "Average nightly rate for paid sites.")}
                  {th("Total",   "Paid nights × nightly rate.", true)}
                  {th("Km",      "Planned driving distance for the month in kilometres.", false, true)}
                  {th("L/100",   "Fuel consumption in litres per 100 km (towing).")}
                  {th("$/L",     "Expected pump price per litre of diesel.", false, false)}
                  {th("Total",   "Km × (L/100 ÷ 100) × $/L", true)}
                  {th("$/Day",   "Daily food & grocery spend per person (total). Days comes from the Camping column.", false, true)}
                  {th("Total",   "Days × daily food rate.", true)}
                  {th("Eat Out", "Monthly restaurant / takeaway budget.", false, true)}
                  {th("Activities", "Entertainment, tours, experiences.")}
                  {th("Passes",  "National Park passes, station fees, permits.")}
                  {th("Ferries", "Ferry crossings (e.g. Kangaroo Island, Spirit of Tasmania).")}
                  {th("Flights", "Grandkids flights — cost regardless of home/travel status.", false, true)}
                  {th("Hotels",  "Grandkids accommodation costs.")}
                  {th("Total",   "Grandkids flights + hotels.", true)}
                  <th className="border-l border-border/40" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ mi, plan, derived, days }) => (
                  <PlanRow
                    key={mi}
                    monthIdx={mi}
                    label={monthLabel(tripStartDate, mi, "medium")}
                    data={plan}
                    derived={derived}
                    days={days}
                    onChange={handleCellChange}
                    onAtHomeToggle={handleAtHomeToggle}
                  />
                ))}

                {/* Year totals row */}
                <tr className="border-t-2 border-border bg-muted/30 font-bold">
                  <td className="p-1.5 pl-3 text-xs font-bold sticky left-0 bg-muted/30 z-10">Year {viewYear + 1} Total</td>
                  {/* Days: total calendar days in year */}
                  <td className="p-1 text-center text-xs tabular-nums border-l border-border/30">
                    {rows.reduce((s, r) => s + r.days, 0)}
                  </td>
                  <td className="p-1 text-center text-xs tabular-nums">{rows.reduce((s, r) => s + (r.plan.atHome ? 0 : r.plan.freeNights), 0)}</td>
                  <td className="p-1 text-center text-xs tabular-nums">{rows.reduce((s, r) => s + (r.plan.atHome ? 0 : r.plan.paidNights), 0)}</td>
                  <td className="p-1 text-center text-xs tabular-nums text-primary font-semibold">{summary.freePct}%</td>
                  <td className="p-1 text-center text-xs text-muted-foreground">
                    {(() => { const t = rows.filter(r => !r.plan.atHome); return t.length ? `avg ${$n(t.reduce((s, r) => s + r.plan.paidRate, 0) / t.length)}` : "—"; })()}
                  </td>
                  <td className="p-1 text-right pr-2 text-xs tabular-nums" style={{ color: "#1f6f5f" }}>{$n(summary.totAccomm)}</td>
                  <td className="p-1 text-center text-xs tabular-nums border-l border-border/30">{summary.totKm.toLocaleString()}</td>
                  <td className="p-1 text-center text-xs text-muted-foreground">
                    {(() => { const t = rows.filter(r => !r.plan.atHome); return t.length ? `avg ${(t.reduce((s, r) => s + r.plan.fuelConsumption, 0) / t.length).toFixed(1)}` : "—"; })()}
                  </td>
                  <td className="p-1 text-center text-xs text-muted-foreground">
                    {(() => { const t = rows.filter(r => !r.plan.atHome); return t.length ? `avg $${(t.reduce((s, r) => s + r.plan.fuelPrice, 0) / t.length).toFixed(2)}` : "—"; })()}
                  </td>
                  <td className="p-1 text-right pr-2 text-xs tabular-nums" style={{ color: "#d9b880" }}>{$n(summary.totFuel)}</td>
                  <td className="p-1 text-center text-xs text-muted-foreground border-l border-border/30">
                    {(() => { const t = rows.filter(r => !r.plan.atHome); return t.length ? `avg $${(t.reduce((s, r) => s + r.plan.foodDailyRate, 0) / t.length).toFixed(0)}` : "—"; })()}
                  </td>
                  <td className="p-1 text-right pr-2 text-xs tabular-nums" style={{ color: "#60a5fa" }}>{$n(summary.totFood)}</td>
                  <td className="p-1 text-center text-xs tabular-nums border-l border-border/30">{$n(summary.totEatingOut)}</td>
                  <td className="p-1 text-center text-xs tabular-nums">{$n(summary.totActivities)}</td>
                  <td className="p-1 text-center text-xs tabular-nums">{$n(summary.totPasses)}</td>
                  <td className="p-1 text-center text-xs tabular-nums">{$n(summary.totFerries)}</td>
                  <td className="p-1 text-center text-xs tabular-nums border-l border-border/30" style={{ color: "#ec4899" }}>{$n(rows.reduce((s, r) => s + r.plan.grandkidsFlights, 0))}</td>
                  <td className="p-1 text-center text-xs tabular-nums" style={{ color: "#ec4899" }}>{$n(rows.reduce((s, r) => s + r.plan.grandkidsHotels, 0))}</td>
                  <td className="p-1 text-right pr-2 text-xs tabular-nums" style={{ color: "#ec4899" }}>{$n(summary.totGrandkids)}</td>
                  <td className="p-1.5 pr-3 text-right text-sm font-bold text-foreground tabular-nums border-l border-border/30">{$n(summary.totTravel)}</td>
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
                { label: "Accommodation",    value: summary.totAccomm,     color: "#1f6f5f" },
                { label: "Fuel",             value: summary.totFuel,       color: "#d9b880" },
                { label: "Food & Groceries", value: summary.totFood,       color: "#60a5fa" },
                { label: "Eating Out",       value: summary.totEatingOut,  color: "#a78bfa" },
                { label: "Activities",       value: summary.totActivities, color: "#f97316" },
                { label: "Passes & Permits", value: summary.totPasses,     color: "#ef4444" },
                { label: "Ferries",          value: summary.totFerries,    color: "#6b7280" },
                { label: "Grandkids",        value: summary.totGrandkids,  color: "#ec4899" },
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
            <span>Travelling months: <strong className="text-foreground">{summary.travelling} / 12</strong></span>
            <span>Cost per km: <strong className="text-foreground">${summary.totKm > 0 ? (summary.totTravel / summary.totKm).toFixed(2) : "—"}</strong></span>
            <span>Food per day: <strong className="text-foreground">
              ${summary.totFood > 0 && rows.filter(r=>!r.plan.atHome).reduce((s,r)=>s+r.days,0) > 0
                ? (summary.totFood / rows.filter(r=>!r.plan.atHome).reduce((s,r)=>s+r.days,0)).toFixed(0) : "—"}
            </strong>/day avg</span>
            <span>Grandkids total: <strong style={{ color: "#ec4899" }}>{$n(summary.totGrandkids)}</strong></span>
          </div>
        </CardContent>
      </Card>

      <div className="p-3 rounded-lg border border-primary/30 bg-primary/8 text-xs text-muted-foreground">
        All values are automatically synced to the Budget tab. Home months zero all travel costs in the budget grid.
        Grandkids flights and hotels sync as dedicated budget line items regardless of home/travel status.
      </div>

    </div>
  );
}
