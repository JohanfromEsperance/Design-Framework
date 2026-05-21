import { useGetDashboard, useGetGlobalBudget } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Map, Route, Fuel, BookOpen, ArrowRight,
  TrendingUp, TrendingDown, Minus, Award, Compass, AlertTriangle,
  BarChart2, ClipboardCheck, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { ALL_CHECKLISTS, CheckState, computeStats } from "@/data/checklists";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Area, Line, ReferenceLine,
} from "recharts";

// ── Brand palette ─────────────────────────────────────────────────────────────
const SLICE_COLORS = [
  "#1f6f5f", "#d9b880", "#2a8a76", "#c9a060",
  "#3aab92", "#b97e30", "#4a7f6f", "#e8d098",
  "#155040", "#a06020",
];

const AUS_CIRCUMFERENCE_KM = 14_500;

// Budget base: month 0 = March 2026
const BUDGET_BASE = new Date(2026, 2, 1);

function budgetMonthToDate(idx: number): Date {
  return new Date(BUDGET_BASE.getFullYear(), BUDGET_BASE.getMonth() + idx, 1);
}

function monthLabel(idx: number): string {
  const d = budgetMonthToDate(idx);
  return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
}

function currentMonthIndex(): number {
  const now = new Date();
  return (now.getFullYear() - BUDGET_BASE.getFullYear()) * 12 + (now.getMonth() - BUDGET_BASE.getMonth());
}

function dobTo67MonthIndex(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const at67 = new Date(d.getFullYear() + 67, d.getMonth(), 1);
  const idx = (at67.getFullYear() - BUDGET_BASE.getFullYear()) * 12 + (at67.getMonth() - BUDGET_BASE.getMonth());
  return idx;
}

// ── Budget category keys (must match budget-page.tsx definitions) ─────────────
const INCOME_KEYS = ["rentalNet", "salary", "businessIncome", "refunds", "otherIncome1", "otherIncome2"] as const;
const EXPENSE_KEYS = [
  // Travel & Road
  "fuel", "accommodation", "food", "eatingOut", "entertainment", "passesPermits", "ferries",
  // Vehicle & Rig
  "vehicleService", "caravanService", "tyresVehicle", "tyresCaravan", "repairs",
  // Fixed Monthly Bills
  "starlink", "johanMobile", "zandraMobile", "medical", "prescriptions", "apartmentInsurance",
  // Annual — Rego & Insurance
  "vehicleLicence", "caravanLicence", "vehicleInsurance", "caravanInsurance", "roadsideAssist",
  // Super & Savings
  "superContribution", "savingsZandra", "savingsJohan",
] as const;

const INCOME_LABELS: Record<string, string> = {
  rentalNet: "Rental Net", salary: "Salary", businessIncome: "Business",
  refunds: "Refunds", otherIncome1: "Other Income 1", otherIncome2: "Other Income 2",
};
const EXPENSE_LABELS: Record<string, string> = {
  // Travel
  fuel: "Fuel", accommodation: "Parks & Acc.", food: "Food & Groceries",
  eatingOut: "Eating Out", entertainment: "Entertainment", passesPermits: "Passes & Permits", ferries: "Ferries",
  // Vehicle
  vehicleService: "Vehicle Service", caravanService: "Caravan Service",
  tyresVehicle: "Tyres — Vehicle", tyresCaravan: "Tyres — Caravan", repairs: "Repairs",
  // Fixed
  starlink: "Starlink", johanMobile: "Johan Mobile", zandraMobile: "Zandra Mobile",
  medical: "BUPA Medical", prescriptions: "Prescriptions", apartmentInsurance: "Apt Insurance",
  // Annual
  vehicleLicence: "Vehicle Licence", caravanLicence: "Caravan Licence",
  vehicleInsurance: "Vehicle Insurance", caravanInsurance: "Caravan Insurance", roadsideAssist: "Roadside",
  // Super
  superContribution: "Super SPA", savingsZandra: "Savings Zandra", savingsJohan: "Savings Johan",
};

// Colour palette for income/expense stacks — enough for 27 expense keys
const INCOME_PALETTE = ["#1f6f5f", "#2a8a76", "#3aab92", "#4abf8a", "#155040", "#0e3d2e"];
const EXPENSE_PALETTE = [
  // Travel (green-amber spectrum)
  "#d9b880", "#c9a060", "#b97e30", "#e8c870", "#f0a040", "#d89030", "#c07820",
  // Vehicle (warm brown)
  "#a06020", "#904810", "#803808", "#703010", "#602808",
  // Fixed (blue-grey)
  "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a",
  // Annual (red spectrum)
  "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d",
  // Super (purple)
  "#a78bfa", "#8b5cf6", "#7c3aed",
];

// ── Number formatters ─────────────────────────────────────────────────────────
function fmtKm(n: number) {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}
function fmtAud(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}
function fmtAudK(n: number) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return fmtAud(n);
}
function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ── Custom donut centre label ─────────────────────────────────────────────────
interface CentreProps { cx: number; cy: number; label: string; sub: string; }
function DonutCentre({ cx, cy, label, sub }: CentreProps) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 14, fontWeight: 700, fill: "#1f2937" }}>{label}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 10, fill: "#6b7280" }}>{sub}</text>
    </g>
  );
}

// ── Compact pie legend ────────────────────────────────────────────────────────
interface LegendRowProps { name: string; value: string; color: string; pctShare: number }
function LegendRow({ name, value, color, pctShare }: LegendRowProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="shrink-0 h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="flex-1 truncate text-foreground font-medium" title={name}>{name}</span>
      <span className="shrink-0 text-muted-foreground">{value}</span>
      <span className="shrink-0 w-9 text-right text-muted-foreground">{pctShare.toFixed(0)}%</span>
    </div>
  );
}

// ── KPI stat block ────────────────────────────────────────────────────────────
interface StatBlockProps { label: string; value: string | number; sub?: string; icon: React.ReactNode; accent?: string; }
function StatBlock({ label, value, sub, icon, accent = "#1f6f5f" }: StatBlockProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 pb-4 px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground leading-none">
              {value}
              {sub && <span className="ml-1 text-sm font-normal text-muted-foreground">{sub}</span>}
            </p>
          </div>
          <div className="shrink-0 h-9 w-9 rounded-md flex items-center justify-center" style={{ background: `${accent}18` }}>
            <span style={{ color: accent }}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Donut card ────────────────────────────────────────────────────────────────
interface DonutCardProps {
  title: string; sub: string; data: { name: string; value: number }[];
  centreLabel: string; centreSub: string; emptyMsg: string;
}
function DonutCard({ title, sub, data, centreLabel, centreSub, emptyMsg }: DonutCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const nonZero = data.filter((d) => d.value > 0);
  return (
    <Card className="bg-card border-border flex flex-col">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardHeader>
      <CardContent className="flex-1 px-5 pb-4 flex flex-col gap-3">
        {nonZero.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground italic">{emptyMsg}</div>
        ) : (
          <>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={nonZero} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {nonZero.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
                    <DonutCentre cx={0} cy={0} label={centreLabel} sub={centreSub} />
                  </Pie>
                  <Tooltip formatter={(v: number) => [fmtAud(v), ""]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {nonZero.map((d, i) => (
                <LegendRow key={d.name} name={d.name} value={fmtAud(d.value)}
                  color={SLICE_COLORS[i % SLICE_COLORS.length]}
                  pctShare={total > 0 ? (d.value / total) * 100 : 0} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Distance card ─────────────────────────────────────────────────────────────
interface DistCardProps { breakdown: Array<{ name: string; plannedKm: number; actualKm: number }>; totalKm: number; }
function DistanceCard({ breakdown, totalKm }: DistCardProps) {
  const lapPct = Math.min((totalKm / AUS_CIRCUMFERENCE_KM) * 100, 100);
  const nonZero = breakdown.filter((t) => (t.plannedKm || t.actualKm) > 0);
  return (
    <Card className="bg-card border-border flex flex-col">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground">Distance Coverage</CardTitle>
        <p className="text-xs text-muted-foreground">Progress toward the full Big Lap</p>
      </CardHeader>
      <CardContent className="flex-1 px-5 pb-4 flex flex-col gap-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Big Lap circumnavigation</span>
            <span className="font-semibold text-foreground">{lapPct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${lapPct}%`, background: "linear-gradient(90deg, #1f6f5f, #d9b880)" }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>{fmtKm(totalKm)} km logged</span>
            <span>{fmtKm(AUS_CIRCUMFERENCE_KM)} km total</span>
          </div>
        </div>
        <div className="space-y-2 flex-1 overflow-auto">
          {nonZero.length === 0 && <p className="text-xs text-muted-foreground italic">No distance recorded yet.</p>}
          {nonZero.map((t, i) => {
            const max = Math.max(t.plannedKm, t.actualKm, 1);
            return (
              <div key={t.name} className="text-xs">
                <div className="flex justify-between mb-0.5">
                  <span className="truncate text-foreground font-medium max-w-[60%]" title={t.name}>{t.name}</span>
                  <span className="text-muted-foreground shrink-0">{fmtKm(t.actualKm || t.plannedKm)} km</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-0.5">
                  <div className="h-full rounded-full" style={{ width: `${(t.plannedKm / max) * 100}%`, background: `${SLICE_COLORS[i % SLICE_COLORS.length]}60` }} />
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(t.actualKm / max) * 100}%`, background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Smart advice card ─────────────────────────────────────────────────────────
interface AdviceCardProps {
  totalKm: number; totalTrips: number; totalJournalEntries: number;
  breakdown: Array<{ name: string; plannedFuelCost: number; actualFuelCost: number; plannedKm: number; actualKm: number }>;
}
function AdviceCard({ totalKm, totalTrips, totalJournalEntries, breakdown }: AdviceCardProps) {
  const totalPlanned = breakdown.reduce((s, t) => s + t.plannedFuelCost, 0);
  const totalActual  = breakdown.reduce((s, t) => s + t.actualFuelCost, 0);
  const variance     = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0;
  const longestTrip  = [...breakdown].sort((a, b) => (b.actualKm || b.plannedKm) - (a.actualKm || a.plannedKm))[0];
  const avgKmPerTrip = totalTrips > 0 ? totalKm / totalTrips : 0;
  const lapPct       = (totalKm / AUS_CIRCUMFERENCE_KM) * 100;

  const insights: { icon: React.ReactNode; text: string; color: string }[] = [];
  if (totalPlanned > 0 && totalActual > 0) {
    const icon = variance > 5 ? <TrendingUp className="h-3.5 w-3.5" /> : variance < -5 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />;
    insights.push({ icon, color: variance > 5 ? "#dc2626" : variance < -5 ? "#1f6f5f" : "#d9b880",
      text: variance > 5 ? `Fuel spend is ${pct(variance)} over estimate — tow weight, headwinds, or terrain may be lifting consumption.`
        : variance < -5 ? `Fuel spend is ${pct(variance)} under estimate — excellent efficiency or shorter actual routes.`
        : `Fuel spend is tracking ${pct(variance)} to plan — solid budgeting accuracy.` });
  }
  if (longestTrip) {
    insights.push({ icon: <Award className="h-3.5 w-3.5" />, color: "#d9b880",
      text: `Longest expedition: "${longestTrip.name}" — ${fmtKm(longestTrip.actualKm || longestTrip.plannedKm)} km.` });
  }
  if (totalKm > 0) {
    insights.push({ icon: <Compass className="h-3.5 w-3.5" />, color: "#1f6f5f",
      text: lapPct >= 100 ? `Full circumnavigation complete — ${fmtKm(totalKm)} km. Legends do this.`
        : `${fmtKm(AUS_CIRCUMFERENCE_KM - totalKm)} km remaining to complete the full circumnavigation.` });
  }
  if (totalTrips > 0) {
    insights.push({ icon: <Route className="h-3.5 w-3.5" />, color: "#2a8a76",
      text: `Averaging ${fmtKm(avgKmPerTrip)} km across ${totalTrips} expedition${totalTrips !== 1 ? "s" : ""}.` });
  }
  if (totalJournalEntries === 0 && totalTrips > 0) {
    insights.push({ icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "#b97e30",
      text: "No journal entries yet — capture your first week on the road before the memories fade." });
  } else if (totalJournalEntries > 0 && totalTrips > 0) {
    insights.push({ icon: <BookOpen className="h-3.5 w-3.5" />, color: "#3aab92",
      text: `${totalJournalEntries} journal entr${totalJournalEntries !== 1 ? "ies" : "y"} logged — your road memoir is taking shape.` });
  }

  return (
    <Card className="bg-card border-border flex flex-col">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground">Trip Intelligence</CardTitle>
        <p className="text-xs text-muted-foreground">Analytical insights from your expedition data</p>
      </CardHeader>
      <CardContent className="flex-1 px-5 pb-4 flex flex-col gap-3">
        {insights.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Add trips and legs to unlock insights.</p>
        ) : (
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="shrink-0 mt-0.5 rounded-md h-6 w-6 flex items-center justify-center"
                  style={{ background: `${ins.color}18`, color: ins.color }}>{ins.icon}</div>
                <p className="text-xs text-foreground leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        )}
        {totalTrips > 0 && (
          <div className="mt-auto pt-2 border-t border-border grid grid-cols-3 gap-1 text-center">
            <div><p className="text-xs font-bold text-foreground">{fmtKm(totalKm)}</p><p className="text-[10px] text-muted-foreground">km total</p></div>
            <div><p className="text-xs font-bold text-foreground">{fmtAud(totalActual || 0)}</p><p className="text-[10px] text-muted-foreground">fuel spent</p></div>
            <div><p className="text-xs font-bold text-foreground">{lapPct.toFixed(1)}%</p><p className="text-[10px] text-muted-foreground">lap complete</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Financial Overview Chart — 2-year Commander's View ────────────────────────

interface BudgetMonth { [key: string]: number; }

function buildChartData(months: Record<string, BudgetMonth>) {
  return Array.from({ length: 24 }, (_, i) => {
    const m: BudgetMonth = (months[i.toString()] as BudgetMonth) ?? {};

    const incomes: Record<string, number> = {};
    let totalInc = 0;
    for (const k of INCOME_KEYS) {
      const v = Math.max(0, Number(m[k]) || 0);
      if (v > 0) { incomes[k] = v; totalInc += v; }
    }

    const expenses: Record<string, number> = {};
    let totalExp = 0;
    for (const k of EXPENSE_KEYS) {
      const v = Math.max(0, Number(m[k]) || 0);
      if (v > 0) { expenses[`exp_${k}`] = -v; totalExp += v; }
    }

    return {
      idx: i,
      label: monthLabel(i),
      totalInc,
      totalExp,
      net: totalInc - totalExp,
      ...incomes,
      ...expenses,
    };
  });
}

function addConfidenceBand(data: ReturnType<typeof buildChartData>): (ReturnType<typeof buildChartData>[0] & { bandUpper: number; bandLower: number; trend: number })[] {
  const nets = data.map(d => d.net);
  const mean = nets.reduce((a, b) => a + b, 0) / (nets.length || 1);
  const variance = nets.reduce((s, n) => s + (n - mean) ** 2, 0) / (nets.length || 1);
  const stdDev = Math.sqrt(variance);

  return data.map((d, i) => {
    // 3-month rolling average
    const window = nets.slice(Math.max(0, i - 1), Math.min(nets.length, i + 2));
    const trend = window.reduce((a, b) => a + b, 0) / (window.length || 1);
    return {
      ...d,
      trend,
      bandUpper: trend + stdDev * 0.65,
      bandLower: trend - stdDev * 0.65,
    };
  });
}

interface FinancialOverviewChartProps {
  months: Record<string, BudgetMonth>;
  superPortfolio?: { accounts?: Array<{ name: string; dateOfBirth?: string }> };
}

function FinancialOverviewChart({ months, superPortfolio }: FinancialOverviewChartProps) {
  const rawData   = buildChartData(months);
  const chartData = addConfidenceBand(rawData);

  const curIdx    = currentMonthIndex();
  const allHaveData = chartData.some(d => d.totalInc > 0 || d.totalExp > 0);

  // Milestone month indices
  const johanDob   = superPortfolio?.accounts?.[0]?.dateOfBirth;
  const zandraDob  = superPortfolio?.accounts?.[1]?.dateOfBirth;
  const johanName  = superPortfolio?.accounts?.[0]?.name ?? "Johan";
  const zandraName = superPortfolio?.accounts?.[1]?.name ?? "Zandra";
  const johanIdx   = johanDob  ? dobTo67MonthIndex(johanDob)  : null;
  const zandraIdx  = zandraDob ? dobTo67MonthIndex(zandraDob) : null;

  // 2-year totals for milestone summary
  const total2yrInc = rawData.reduce((s, d) => s + d.totalInc, 0);
  const total2yrExp = rawData.reduce((s, d) => s + d.totalExp, 0);
  const total2yrNet = total2yrInc - total2yrExp;

  // Identify active income / expense keys across 24 months
  const activeIncKeys = INCOME_KEYS.filter(k => rawData.some(d => (d as any)[k] > 0));
  const activeExpKeys = EXPENSE_KEYS.filter(k => rawData.some(d => (d as any)[`exp_${k}`] < 0));

  // Tax quarter months relative to budget base (Mar, Jun, Sep, Dec — months 0,3,6,9,12,15,18,21 offset by quarter pattern)
  // BAS/PAYG quarters: Mar, Jun, Sep, Dec — check which months in 0-23 are those
  const taxMonths: number[] = [];
  for (let i = 0; i < 24; i++) {
    const d = budgetMonthToDate(i);
    if ([2, 5, 8, 11].includes(d.getMonth())) taxMonths.push(i); // Mar/Jun/Sep/Dec
  }

  const yMax = Math.max(...chartData.map(d => Math.max(d.totalInc, d.bandUpper, 0))) * 1.12;
  const yMin = Math.min(...chartData.map(d => Math.min(-d.totalExp, d.bandLower, 0))) * 1.12;

  return (
    <Card className="border-border/60 col-span-full">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Commander's Financial Overview — 24-Month Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "#1f6f5f" }} /> Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "#d9b880" }} /> Expenses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-full" style={{ background: "#6366f1" }} /> Net Cashflow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-6 rounded-sm opacity-30" style={{ background: "#6366f1" }} /> AI Confidence Band
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Mar 2026 — Feb 2028 · Stacked income / expenses · Shaded band = cashflow forecast confidence interval
          {!allHaveData && " · Enter income and expenses in the Budget tab to populate this chart."}
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }} barGap={0} barCategoryGap="12%">
              <defs>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" opacity={0.10} />

              <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => fmtAudK(v)} width={52} axisLine={false} tickLine={false}
                domain={[yMin || -1, yMax || 1]} />

              <RechartsTooltip
                contentStyle={{ fontSize: 10, borderRadius: 6, border: "1px solid #e5e7eb", background: "#ffffff" }}
                formatter={(val: number, name: string) => {
                  const isExp = name.startsWith("exp_");
                  const label = isExp ? (EXPENSE_LABELS[name.replace("exp_", "")] ?? name) : (INCOME_LABELS[name] ?? name);
                  return [fmtAud(Math.abs(val)), label];
                }}
                labelFormatter={(l: string) => <strong>{l}</strong>}
              />

              {/* Tax quarter reference lines */}
              {taxMonths.map(m => (
                <ReferenceLine key={`tax-${m}`} x={monthLabel(m)} stroke="#ef4444" strokeOpacity={0.3} strokeWidth={1}
                  strokeDasharray="2 3"
                  label={m < 3 ? { value: "BAS", fontSize: 7, fill: "#ef4444", opacity: 0.6, position: "insideTopRight" } : undefined}
                />
              ))}

              {/* Current month */}
              {curIdx >= 0 && curIdx < 24 && (
                <ReferenceLine x={monthLabel(curIdx)} stroke="#1f6f5f" strokeWidth={1.5} strokeOpacity={0.8}
                  label={{ value: "Today", fontSize: 8, fill: "#1f6f5f", position: "insideTopLeft" }} />
              )}

              {/* D+2yr marker */}
              <ReferenceLine x={monthLabel(23)} stroke="#d9b880" strokeWidth={1.5} strokeDasharray="5 3"
                label={{ value: "D+2yr", fontSize: 8, fill: "#b8943e", position: "insideTopRight" }} />

              {/* Johan @67 — only if within 24 months */}
              {johanIdx !== null && johanIdx >= 0 && johanIdx < 24 && (
                <ReferenceLine x={monthLabel(johanIdx)} stroke="#2a8a76" strokeWidth={1.5} strokeDasharray="4 2"
                  label={{ value: `${johanName}@67`, fontSize: 8, fill: "#2a8a76", position: "insideTopLeft" }} />
              )}

              {/* Zandra @67 — only if within 24 months */}
              {zandraIdx !== null && zandraIdx >= 0 && zandraIdx < 24 && (
                <ReferenceLine x={monthLabel(zandraIdx)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2"
                  label={{ value: `${zandraName}@67`, fontSize: 8, fill: "#a78bfa", position: "insideTopLeft" }} />
              )}

              {/* AI Confidence band — upper and lower areas stacked to create band */}
              <Area type="monotone" dataKey="bandUpper" fill="url(#bandGrad)" stroke="#6366f1" strokeOpacity={0.2}
                strokeWidth={1} strokeDasharray="3 2" legendType="none" />
              <Area type="monotone" dataKey="bandLower" fill="#ffffff" fillOpacity={1} stroke="#6366f1"
                strokeOpacity={0.2} strokeWidth={1} strokeDasharray="3 2" legendType="none" />

              {/* Income stacked bars */}
              {activeIncKeys.map((k, i) => (
                <Bar key={k} dataKey={k} name={k} stackId="income"
                  fill={INCOME_PALETTE[i % INCOME_PALETTE.length]}
                  radius={i === activeIncKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]} />
              ))}

              {/* Expense stacked bars (negative) */}
              {activeExpKeys.map((k, i) => (
                <Bar key={`exp_${k}`} dataKey={`exp_${k}`} name={`exp_${k}`} stackId="expense"
                  fill={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]}
                  radius={i === activeExpKeys.length - 1 ? [0, 0, 2, 2] : [0, 0, 0, 0]} />
              ))}

              {/* Net cashflow line */}
              <Line type="monotone" dataKey="net" name="Net Cashflow" stroke="#6366f1"
                strokeWidth={2} dot={false} legendType="none" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Milestone summary strip */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 border-t border-border pt-3">
          <div className="rounded p-2 bg-primary/5 border border-primary/20 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">D+2yr Income</p>
            <p className="text-sm font-bold text-primary">{fmtAud(total2yrInc)}</p>
          </div>
          <div className="rounded p-2 bg-[#d9b880]/10 border border-[#d9b880]/30 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">D+2yr Expenses</p>
            <p className="text-sm font-bold text-[#b8943e]">{fmtAud(total2yrExp)}</p>
          </div>
          <div className={`rounded p-2 border text-center ${total2yrNet >= 0 ? "bg-primary/5 border-primary/20" : "bg-red-500/5 border-red-500/20"}`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">D+2yr Net</p>
            <p className={`text-sm font-bold ${total2yrNet >= 0 ? "text-primary" : "text-destructive"}`}>{fmtAud(total2yrNet)}</p>
          </div>

          {/* Age 67 milestones */}
          <div className="rounded p-2 bg-[#2a8a76]/8 border border-[#2a8a76]/30 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{johanName} @67</p>
            {johanIdx !== null ? (
              <p className="text-sm font-bold text-[#2a8a76]">
                {johanIdx < 24 ? "Within 2yr" : `${budgetMonthToDate(johanIdx).getFullYear()}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Set DOB in Super</p>
            )}
            {johanIdx !== null && <p className="text-[9px] text-muted-foreground mt-0.5">Pension eligible</p>}
          </div>

          <div className="rounded p-2 bg-[#a78bfa]/8 border border-[#a78bfa]/30 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{zandraName} @67</p>
            {zandraIdx !== null ? (
              <p className="text-sm font-bold text-[#a78bfa]">
                {zandraIdx < 24 ? "Within 2yr" : `${budgetMonthToDate(zandraIdx).getFullYear()}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Set DOB in Super</p>
            )}
            {zandraIdx !== null && <p className="text-[9px] text-muted-foreground mt-0.5">Pension eligible</p>}
          </div>
        </div>

        {/* Legend for BAS quarter marker */}
        <div className="mt-2 flex items-center gap-4 text-[9px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 border-l-2 border-dashed border-[#ef4444] opacity-60" style={{ borderColor: "#ef4444" }} />
            BAS / PAYG quarters (Mar, Jun, Sep, Dec)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 border-l-2 border-[#1f6f5f]" />
            Current month
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 border-l-2 border-dashed border-[#d9b880]" />
            D+2yr mark
          </span>
          <span className="text-muted-foreground">AI band = rolling mean ±0.65σ cashflow confidence</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Checklist summary card ────────────────────────────────────────────────────
type ChecklistStateMap = Record<string, Record<string, CheckState>>;

function ChecklistSummaryCard({ budget }: { budget: unknown }) {
  const allState = ((budget as Record<string, unknown>)?.checklists ?? {}) as ChecklistStateMap;

  const rows = ALL_CHECKLISTS.map((cl) => {
    const st = allState[cl.id] ?? {};
    const s = computeStats(cl, st);
    return { ...s, id: cl.id, navLabel: cl.navLabel, href: `/checklists/${cl.id}` };
  });

  const totalUnchecked = rows.reduce((s, r) => s + r.unchecked, 0);
  const totalNo = rows.reduce((s, r) => s + r.noCount, 0);
  const totalCritical = rows.reduce((s, r) => s + r.criticalUnchecked, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">Checklist Status</CardTitle>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {totalCritical > 0 && (
              <span className="flex items-center gap-1 font-semibold" style={{ color: "#dc2626" }}>
                <AlertTriangle className="h-3.5 w-3.5" />
                {totalCritical} critical unchecked
              </span>
            )}
            {totalNo > 0 && (
              <span className="flex items-center gap-1 font-semibold" style={{ color: "#b97e30" }}>
                <XCircle className="h-3.5 w-3.5" />
                {totalNo} marked NO
              </span>
            )}
            {totalUnchecked === 0 && totalNo === 0 && (
              <span className="flex items-center gap-1 font-semibold" style={{ color: "#1f6f5f" }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                All clear
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Pilot-style pre-departure checklists — click any row to open</p>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rows.map((row) => {
            const allDone = row.pct === 100;
            const hasNo = row.noCount > 0;
            const borderColor = hasNo ? "#dc2626" : allDone ? "#1f6f5f" : row.unchecked > 0 ? "#d9b880" : "#e5e7eb";
            return (
              <Link key={row.id} href={row.href}>
                <div
                  className="rounded-lg border p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  style={{ borderColor }}
                >
                  <div className="flex items-center justify-between mb-2 gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">{row.navLabel}</span>
                    <span
                      className="text-[10px] font-bold shrink-0"
                      style={{ color: allDone ? "#1f6f5f" : hasNo ? "#dc2626" : "#b97e30" }}
                    >
                      {row.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${row.pct}%`,
                        background: allDone ? "#1f6f5f" : hasNo ? "#dc2626" : "linear-gradient(90deg,#1f6f5f,#d9b880)",
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                    {row.unchecked > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {row.unchecked} pending
                      </span>
                    )}
                    {row.noCount > 0 && (
                      <span className="flex items-center gap-0.5" style={{ color: "#dc2626" }}>
                        <XCircle className="h-2.5 w-2.5" />
                        {row.noCount} NO
                      </span>
                    )}
                    {row.yesCount > 0 && (
                      <span className="flex items-center gap-0.5" style={{ color: "#1f6f5f" }}>
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {row.yesCount} YES
                      </span>
                    )}
                    {row.answered === 0 && (
                      <span className="italic">Not started</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboard();
  const { data: budget } = useGetGlobalBudget();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-56" /><Skeleton className="h-3.5 w-40 mt-2" /></div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  const breakdown = stats?.tripBreakdown ?? [];
  const plannedPieData = breakdown.map((t) => ({ name: t.name, value: Math.round(t.plannedFuelCost) }));
  const actualPieData  = breakdown.map((t) => ({ name: t.name, value: Math.round(t.actualFuelCost) }));
  const totalPlanned   = plannedPieData.reduce((s, d) => s + d.value, 0);
  const totalActual    = actualPieData.reduce((s, d) => s + d.value, 0);

  const budgetMonths     = (budget as any)?.months ?? {};
  const superPortfolio   = (budget as any)?.super;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Commander's Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Big Lap intelligence centre — all expeditions at a glance</p>
        </div>
        <Button onClick={() => setLocation("/trips")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-8 px-4">
          Manage Trips
        </Button>
      </div>

      {/* Row 1 — KPI blocks */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Total Expeditions" value={stats?.totalTrips ?? 0} icon={<Map className="h-4 w-4" />} />
        <StatBlock label="Distance Logged" value={fmtKm(stats?.totalKm ?? 0)} sub="km"
          icon={<Route className="h-4 w-4" />} accent="#2a8a76" />
        <StatBlock label="Actual Fuel Spend" value={fmtAud(stats?.totalFuelCost ?? 0)}
          icon={<Fuel className="h-4 w-4" />} accent="#d9b880" />
        <StatBlock label="Journal Entries" value={stats?.totalJournalEntries ?? 0}
          icon={<BookOpen className="h-4 w-4" />} accent="#3aab92" />
      </div>

      {/* Row 2 — 2-year financial overview (full width) */}
      <div className="grid grid-cols-1">
        <FinancialOverviewChart months={budgetMonths} superPortfolio={superPortfolio} />
      </div>

      {/* Row 3 — Analytics blocks */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <DonutCard title="Planned Fuel Cost" sub="Estimated spend by expedition" data={plannedPieData}
          centreLabel={fmtAud(totalPlanned)} centreSub="planned" emptyMsg="No planned distances yet." />
        <DonutCard title="Actual Fuel Spend" sub="Real fill-up costs by expedition" data={actualPieData}
          centreLabel={fmtAud(totalActual)} centreSub="actual" emptyMsg="No fuel fill-ups recorded yet." />
        <DistanceCard breakdown={breakdown} totalKm={stats?.totalKm ?? 0} />
        <AdviceCard totalKm={stats?.totalKm ?? 0} totalTrips={stats?.totalTrips ?? 0}
          totalJournalEntries={stats?.totalJournalEntries ?? 0} breakdown={breakdown} />
      </div>

      {/* Row 4 — Checklist status */}
      <ChecklistSummaryCard budget={budget} />

      {/* Row 5 — Recent expeditions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Recent Expeditions</h2>
        {stats?.recentTrips && stats.recentTrips.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {stats.recentTrips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card className="cursor-pointer hover:border-primary transition-colors bg-card h-full">
                  <CardContent className="pt-4 pb-4 px-4 flex flex-col gap-1 h-full">
                    <p className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{trip.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{trip.notes || "No description"}</p>
                    <div className="flex items-center justify-between pt-2 mt-auto">
                      <span className="text-xs text-muted-foreground">
                        {trip.startDate ? new Date(trip.startDate).toLocaleDateString("en-AU") : "Unscheduled"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-card rounded-lg border border-border">
            <Map className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-40" />
            <h3 className="text-sm font-medium text-foreground">No expeditions yet</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Start planning your first Big Lap adventure.</p>
            <Button onClick={() => setLocation("/trips")} size="sm">Create your first trip</Button>
          </div>
        )}
      </div>
    </div>
  );
}
