import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Map, Route, Fuel, BookOpen, ArrowRight,
  TrendingUp, TrendingDown, Minus, Award, Compass, AlertTriangle,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Brand palette for chart slices ─────────────────────────────────────────────
const SLICE_COLORS = [
  "#1f6f5f", "#d9b880", "#2a8a76", "#c9a060",
  "#3aab92", "#b97e30", "#4a7f6f", "#e8d098",
  "#155040", "#a06020",
];

const AUS_CIRCUMFERENCE_KM = 14_500;

// ── Number formatters ──────────────────────────────────────────────────────────
function fmtKm(n: number) {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}
function fmtAud(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}
function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ── Custom donut centre label ──────────────────────────────────────────────────
interface CentreProps {
  cx: number; cy: number; label: string; sub: string;
}
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

// ── Compact pie legend ─────────────────────────────────────────────────────────
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

// ── KPI stat block ─────────────────────────────────────────────────────────────
interface StatBlockProps {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent?: string;
}
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
          <div className="shrink-0 h-9 w-9 rounded-md flex items-center justify-center"
            style={{ background: `${accent}18` }}>
            <span style={{ color: accent }}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Donut chart card ───────────────────────────────────────────────────────────
interface DonutCardProps {
  title: string;
  sub: string;
  data: { name: string; value: number }[];
  centreLabel: string;
  centreSub: string;
  emptyMsg: string;
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
                  <Pie
                    data={nonZero}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {nonZero.map((_, i) => (
                      <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                    ))}
                    <DonutCentre cx={0} cy={0} label={centreLabel} sub={centreSub} />
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmtAud(v), ""]}
                    contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {nonZero.map((d, i) => (
                <LegendRow
                  key={d.name}
                  name={d.name}
                  value={fmtAud(d.value)}
                  color={SLICE_COLORS[i % SLICE_COLORS.length]}
                  pctShare={total > 0 ? (d.value / total) * 100 : 0}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Distance coverage card ─────────────────────────────────────────────────────
interface DistCardProps {
  breakdown: Array<{ name: string; plannedKm: number; actualKm: number }>;
  totalKm: number;
}
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
        {/* Circumnavigation progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Big Lap circumnavigation</span>
            <span className="font-semibold text-foreground">{lapPct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${lapPct}%`, background: "linear-gradient(90deg, #1f6f5f, #d9b880)" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>{fmtKm(totalKm)} km logged</span>
            <span>{fmtKm(AUS_CIRCUMFERENCE_KM)} km total</span>
          </div>
        </div>

        {/* Per-trip bars */}
        <div className="space-y-2 flex-1 overflow-auto">
          {nonZero.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No distance recorded yet.</p>
          )}
          {nonZero.map((t, i) => {
            const max = Math.max(t.plannedKm, t.actualKm, 1);
            const planPct = (t.plannedKm / max) * 100;
            const actPct = (t.actualKm / max) * 100;
            return (
              <div key={t.name} className="text-xs">
                <div className="flex justify-between mb-0.5">
                  <span className="truncate text-foreground font-medium max-w-[60%]" title={t.name}>{t.name}</span>
                  <span className="text-muted-foreground shrink-0">{fmtKm(t.actualKm || t.plannedKm)} km</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-0.5">
                  <div className="h-full rounded-full" style={{ width: `${planPct}%`, background: `${SLICE_COLORS[i % SLICE_COLORS.length]}60` }} />
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${actPct}%`, background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                </div>
              </div>
            );
          })}
          {nonZero.length > 0 && (
            <div className="flex gap-3 text-[10px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-muted" style={{ opacity: 0.4 }} /> Planned</span>
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full" style={{ background: SLICE_COLORS[0] }} /> Actual</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Smart advice card ──────────────────────────────────────────────────────────
interface AdviceCardProps {
  totalKm: number;
  totalTrips: number;
  totalJournalEntries: number;
  breakdown: Array<{ name: string; plannedFuelCost: number; actualFuelCost: number; plannedKm: number; actualKm: number }>;
}
function AdviceCard({ totalKm, totalTrips, totalJournalEntries, breakdown }: AdviceCardProps) {
  const totalPlanned = breakdown.reduce((s, t) => s + t.plannedFuelCost, 0);
  const totalActual = breakdown.reduce((s, t) => s + t.actualFuelCost, 0);
  const variance = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0;
  const longestTrip = [...breakdown].sort((a, b) => (b.actualKm || b.plannedKm) - (a.actualKm || a.plannedKm))[0];
  const avgKmPerTrip = totalTrips > 0 ? totalKm / totalTrips : 0;
  const lapPct = (totalKm / AUS_CIRCUMFERENCE_KM) * 100;

  const insights: { icon: React.ReactNode; text: string; color: string }[] = [];

  if (totalPlanned > 0 && totalActual > 0) {
    const icon = variance > 5 ? <TrendingUp className="h-3.5 w-3.5" /> :
      variance < -5 ? <TrendingDown className="h-3.5 w-3.5" /> :
        <Minus className="h-3.5 w-3.5" />;
    const color = variance > 5 ? "#dc2626" : variance < -5 ? "#1f6f5f" : "#d9b880";
    insights.push({
      icon, color,
      text: variance > 5
        ? `Fuel spend is ${pct(variance)} over estimate — tow weight, headwinds, or terrain may be lifting consumption.`
        : variance < -5
          ? `Fuel spend is ${pct(variance)} under estimate — excellent efficiency or shorter actual routes.`
          : `Fuel spend is tracking ${pct(variance)} to plan — solid budgeting accuracy.`,
    });
  }

  if (longestTrip) {
    insights.push({
      icon: <Award className="h-3.5 w-3.5" />, color: "#d9b880",
      text: `Longest expedition: "${longestTrip.name}" — ${fmtKm(longestTrip.actualKm || longestTrip.plannedKm)} km.`,
    });
  }

  if (totalKm > 0) {
    insights.push({
      icon: <Compass className="h-3.5 w-3.5" />, color: "#1f6f5f",
      text: lapPct >= 100
        ? `Full circumnavigation complete — ${fmtKm(totalKm)} km. Legends do this.`
        : `${fmtKm(AUS_CIRCUMFERENCE_KM - totalKm)} km remaining to complete the full circumnavigation.`,
    });
  }

  if (totalTrips > 0) {
    insights.push({
      icon: <Route className="h-3.5 w-3.5" />, color: "#2a8a76",
      text: `Averaging ${fmtKm(avgKmPerTrip)} km across ${totalTrips} expedition${totalTrips !== 1 ? "s" : ""}.`,
    });
  }

  if (totalJournalEntries === 0 && totalTrips > 0) {
    insights.push({
      icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "#b97e30",
      text: "No journal entries yet — capture your first week on the road before the memories fade.",
    });
  } else if (totalJournalEntries > 0 && totalTrips > 0) {
    insights.push({
      icon: <BookOpen className="h-3.5 w-3.5" />, color: "#3aab92",
      text: `${totalJournalEntries} journal entr${totalJournalEntries !== 1 ? "ies" : "y"} logged — your road memoir is taking shape.`,
    });
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
                  style={{ background: `${ins.color}18`, color: ins.color }}>
                  {ins.icon}
                </div>
                <p className="text-xs text-foreground leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        )}
        {/* Summary footer */}
        {totalTrips > 0 && (
          <div className="mt-auto pt-2 border-t border-border grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-xs font-bold text-foreground">{fmtKm(totalKm)}</p>
              <p className="text-[10px] text-muted-foreground">km total</p>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{fmtAud(totalActual || 0)}</p>
              <p className="text-[10px] text-muted-foreground">fuel spent</p>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{lapPct.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">lap complete</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboard();
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
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  const breakdown = stats?.tripBreakdown ?? [];

  const plannedPieData = breakdown.map((t) => ({ name: t.name, value: Math.round(t.plannedFuelCost) }));
  const actualPieData = breakdown.map((t) => ({ name: t.name, value: Math.round(t.actualFuelCost) }));
  const totalPlanned = plannedPieData.reduce((s, d) => s + d.value, 0);
  const totalActual = actualPieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Commander's Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Big Lap intelligence centre — all expeditions at a glance</p>
        </div>
        <Button
          onClick={() => setLocation("/trips")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-8 px-4"
        >
          Manage Trips
        </Button>
      </div>

      {/* Row 1 — KPI blocks */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Total Expeditions" value={stats?.totalTrips ?? 0} icon={<Map className="h-4 w-4" />} />
        <StatBlock
          label="Distance Logged"
          value={fmtKm(stats?.totalKm ?? 0)}
          sub="km"
          icon={<Route className="h-4 w-4" />}
          accent="#2a8a76"
        />
        <StatBlock
          label="Actual Fuel Spend"
          value={fmtAud(stats?.totalFuelCost ?? 0)}
          icon={<Fuel className="h-4 w-4" />}
          accent="#d9b880"
        />
        <StatBlock
          label="Journal Entries"
          value={stats?.totalJournalEntries ?? 0}
          icon={<BookOpen className="h-4 w-4" />}
          accent="#3aab92"
        />
      </div>

      {/* Row 2 — Analytics blocks */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <DonutCard
          title="Planned Fuel Cost"
          sub="Estimated spend by expedition"
          data={plannedPieData}
          centreLabel={fmtAud(totalPlanned)}
          centreSub="planned"
          emptyMsg="No planned distances yet."
        />
        <DonutCard
          title="Actual Fuel Spend"
          sub="Real fill-up costs by expedition"
          data={actualPieData}
          centreLabel={fmtAud(totalActual)}
          centreSub="actual"
          emptyMsg="No fuel fill-ups recorded yet."
        />
        <DistanceCard breakdown={breakdown} totalKm={stats?.totalKm ?? 0} />
        <AdviceCard
          totalKm={stats?.totalKm ?? 0}
          totalTrips={stats?.totalTrips ?? 0}
          totalJournalEntries={stats?.totalJournalEntries ?? 0}
          breakdown={breakdown}
        />
      </div>

      {/* Row 3 — Recent expeditions */}
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
