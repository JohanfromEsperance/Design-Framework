import { useListLegs, useGetTripSummary, useGetTrip } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp, TrendingDown, Fuel, MapPin, DollarSign,
  Wind, Thermometer, Gauge, Activity, Target, Zap, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisTabProps { tripId: number; }

function KpiCard({
  label, value, unit, sub, color = "primary", icon: Icon,
}: {
  label: string; value: string; unit?: string; sub?: string;
  color?: "primary" | "amber" | "destructive" | "muted"; icon: React.ElementType;
}) {
  return (
    <Card className="bg-card overflow-hidden relative">
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full",
        color === "primary" ? "bg-primary"
          : color === "amber" ? "bg-[#d9b880]"
          : color === "destructive" ? "bg-destructive"
          : "bg-muted-foreground"
      )} />
      <CardContent className="pt-4 pb-3 pl-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{value}</span>
              {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
            </div>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn(
            "p-2 rounded-lg ml-2 shrink-0",
            color === "primary" ? "bg-primary/10 text-primary"
              : color === "amber" ? "bg-[#d9b880]/20 text-[#b8943e]"
              : color === "destructive" ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScenarioCard({
  label, totalCost, remainingCost, colorClass, badge, current,
}: {
  label: string; totalCost: number; remainingCost: number;
  colorClass: string; badge: string; current?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border-2 p-4 space-y-2",
      current ? "border-[#d9b880] bg-[#d9b880]/8" : "border-border bg-card"
    )}>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap", colorClass)}>{badge}</span>
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">${totalCost.toFixed(0)}</p>
        <p className="text-[10px] text-muted-foreground">total trip</p>
      </div>
      <div className="pt-1 border-t border-border/50">
        <p className="text-sm font-semibold text-foreground">${remainingCost.toFixed(0)}</p>
        <p className="text-[10px] text-muted-foreground">remaining forecast</p>
      </div>
    </div>
  );
}

export default function AnalysisTab({ tripId }: AnalysisTabProps) {
  const { data: legs } = useListLegs(tripId);
  const { data: summary, isLoading } = useGetTripSummary(tripId);

  const [windFactor, setWindFactor] = useState(0);   // -20 to +30 %
  const [speedFactor, setSpeedFactor] = useState(0);  // -10 to +20 %
  const [tempFactor, setTempFactor] = useState(0);    // 0 to +20 %

  const sortedLegs = useMemo(
    () => (legs ? [...legs].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [legs]
  );

  const legsWithData = sortedLegs.filter(l => (l.actualKm ?? 0) > 0 && (l.actualLitres ?? 0) > 0);
  const remainingLegs = sortedLegs.filter(l => !l.actualKm || l.actualKm === 0);

  const learnedL100 = legsWithData.length > 0
    ? legsWithData.reduce((s, l) => s + ((l.actualLitres! / l.actualKm!) * 100), 0) / legsWithData.length
    : 18;

  const avgPricePerL = legsWithData.length > 0
    ? legsWithData.reduce((s, l) => s + (l.actualPricePerLitre || 0), 0) / legsWithData.length
    : 1.85;

  const totalPlanned = sortedLegs.reduce((s, l) => s + (l.plannedKm || 0), 0);
  const totalActual = sortedLegs.reduce((s, l) => s + (l.actualKm || 0), 0);
  const totalFuelCost = legsWithData.reduce((s, l) => s + ((l.actualLitres || 0) * (l.actualPricePerLitre || 0)), 0);
  const remainingKm = remainingLegs.reduce((s, l) => s + (l.plannedKm || 0), 0);
  const baselineEstimate = totalPlanned * (learnedL100 / 100) * avgPricePerL;

  // Scenario adjustments
  const baseAdj = 1 + (windFactor + speedFactor + tempFactor) / 100;
  const adverseAdj = Math.max(baseAdj, 1) + 0.35;
  const optimalAdj = Math.max(baseAdj * 0.82, 0.65);

  const baseRemain = (remainingKm * learnedL100 / 100) * baseAdj * avgPricePerL;
  const advRemain = (remainingKm * learnedL100 / 100) * adverseAdj * avgPricePerL;
  const optRemain = (remainingKm * learnedL100 / 100) * optimalAdj * avgPricePerL;

  // Per-leg chart data
  const legChartData = sortedLegs.map((leg, i) => ({
    name: `L${i + 1}`,
    label: `${leg.fromPlace} → ${leg.toPlace}`,
    planned: leg.plannedKm || 0,
    actual: (leg.actualKm ?? 0) > 0 ? leg.actualKm : null,
    l100: leg.actualKm && leg.actualLitres
      ? Math.round((leg.actualLitres / leg.actualKm) * 1000) / 10
      : null,
    cost: (leg.actualLitres || 0) * (leg.actualPricePerLitre || 0),
  }));

  // Forecast cone — cumulative, starts at today's spend
  let cBase = totalFuelCost, cAdv = totalFuelCost, cOpt = totalFuelCost;
  const forecastData: { name: string; baseline: number; adverse: number; optimal: number }[] = [
    { name: "Now", baseline: Math.round(cBase), adverse: Math.round(cAdv), optimal: Math.round(cOpt) },
  ];
  for (const leg of remainingLegs) {
    const km = leg.plannedKm || 0;
    cBase += (km * learnedL100 / 100) * baseAdj * avgPricePerL;
    cAdv += (km * learnedL100 / 100) * adverseAdj * avgPricePerL;
    cOpt += (km * learnedL100 / 100) * optimalAdj * avgPricePerL;
    forecastData.push({
      name: (leg.toPlace ?? "").split(" ")[0],
      baseline: Math.round(cBase),
      adverse: Math.round(cAdv),
      optimal: Math.round(cOpt),
    });
  }

  // ── 24-month cost forecast ─────────────────────────────────────────────────
  const { data: trip } = useGetTrip(tripId);

  const forecast24 = useMemo(() => {
    const startDate = trip?.startDate ? new Date(trip.startDate) : new Date();
    const endDate = trip?.endDate ? new Date(trip.endDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const tripMs = endDate.getTime() - startDate.getTime();
    const tripMonths = Math.max(1, tripMs / (30.44 * 24 * 60 * 60 * 1000));
    const monthlyKm = totalPlanned / tripMonths;

    // Load maintenance data for monthly cost estimate
    let monthlyMaint = 200;
    try {
      const raw = localStorage.getItem("maintenance_rig_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        const items = parsed.items || [];
        const per50k = items.reduce((s: number, it: { intervalKm: number; estimatedCostAUD: number }) => {
          if (it.intervalKm > 0) return s + Math.floor(50000 / it.intervalKm) * (it.estimatedCostAUD || 0);
          return s;
        }, 0);
        monthlyMaint = Math.round((monthlyKm * 12 / 50000) * per50k / 12);
      }
    } catch { /* use default */ }

    const months: Array<{
      month: string; fuel: number; maintenance: number; total: number;
      cumOpt: number; cumBase: number; cumAdv: number; inTrip: boolean;
    }> = [];
    let cumOpt = 0, cumBase = 0, cumAdv = 0;

    for (let i = 0; i < 24; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const inTrip = d <= endDate && dEnd >= startDate;
      const km = inTrip ? monthlyKm : 0;

      const baseFuel = (km * learnedL100 / 100) * avgPricePerL;
      const optFuel = baseFuel * 0.8;
      const advFuel = baseFuel * 1.35;

      cumOpt += optFuel + monthlyMaint;
      cumBase += baseFuel + monthlyMaint;
      cumAdv += advFuel + monthlyMaint;

      months.push({
        month: d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }),
        fuel: Math.round(baseFuel),
        maintenance: monthlyMaint,
        total: Math.round(baseFuel + monthlyMaint),
        cumOpt: Math.round(cumOpt),
        cumBase: Math.round(cumBase),
        cumAdv: Math.round(cumAdv),
        inTrip,
      });
    }
    return months;
  }, [trip, totalPlanned, learnedL100, avgPricePerL]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading analysis...</div>;

  const completionPct = totalPlanned > 0 ? Math.min((totalActual / totalPlanned) * 100, 100) : 0;

  return (
    <div className="space-y-8 pb-8">

      {/* ── KPI Strip ── */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Trip Intelligence — Die Groot Ompad</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Distance Covered"
            value={totalActual.toLocaleString()}
            unit="km"
            sub={`of ${totalPlanned.toLocaleString()} planned`}
            icon={MapPin}
            color="primary"
          />
          <KpiCard
            label="Legs Complete"
            value={`${legsWithData.length}`}
            unit={`/ ${sortedLegs.length}`}
            sub={`${remainingLegs.length} legs remaining`}
            icon={Target}
            color="primary"
          />
          <KpiCard
            label="Fuel Spend"
            value={`$${totalFuelCost.toFixed(0)}`}
            sub={`vs $${baselineEstimate.toFixed(0)} est`}
            icon={DollarSign}
            color={totalFuelCost > baselineEstimate * 1.05 ? "destructive" : "primary"}
          />
          <KpiCard
            label="Avg Consumption"
            value={learnedL100.toFixed(1)}
            unit="L/100km"
            sub={learnedL100 > 18 ? "Above 18L baseline" : "Below 18L baseline"}
            icon={Fuel}
            color={learnedL100 > 20 ? "destructive" : learnedL100 > 18 ? "amber" : "primary"}
          />
          <KpiCard
            label="Remaining KM"
            value={remainingKm.toLocaleString()}
            unit="km"
            sub={`~$${baseRemain.toFixed(0)} est. fuel`}
            icon={Activity}
            color="amber"
          />
        </div>

        {/* Progress rail */}
        <div className="mt-4 bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium text-foreground">Nullarbor Crossing — Esperance to Ceduna</span>
            <span className="font-bold text-foreground">{completionPct.toFixed(0)}% complete</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${completionPct}%`, background: "linear-gradient(90deg, #1f6f5f, #d9b880)" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            <span>Esperance</span>
            <span>Ceduna</span>
          </div>
        </div>
      </div>

      {/* ── Performance Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" /> Planned vs Actual Distance per Leg
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={legChartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 11 }}
                  formatter={(v: number, name: string) => [`${v} km`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="planned" name="Planned" fill="#d9b880" radius={[2, 2, 0, 0]} opacity={0.7} />
                <Bar dataKey="actual" name="Actual" fill="#1f6f5f" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Fuel className="h-4 w-4 text-primary" /> Fuel Efficiency per Leg (L/100km)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={legChartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} domain={[10, 28]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 11 }}
                  formatter={(v: number) => [`${v} L/100km`]}
                />
                <ReferenceLine y={18} stroke="#d9b880" strokeDasharray="4 3"
                  label={{ value: "18L base", fontSize: 9, fill: "#b8943e", position: "right" }} />
                {legsWithData.length > 0 && (
                  <ReferenceLine y={learnedL100} stroke="#1f6f5f" strokeDasharray="4 3"
                    label={{ value: "Your avg", fontSize: 9, fill: "#1f6f5f", position: "left" }} />
                )}
                <Line
                  dataKey="l100" name="L/100km" stroke="#1f6f5f" strokeWidth={2}
                  dot={{ r: 3, fill: "#1f6f5f" }} connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── AI Forecast Engine ── */}
      <div className="rounded-xl border-2 border-[#d9b880]/40 bg-gradient-to-br from-card to-[#d9b880]/5 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#d9b880]/20">
            <Zap className="h-5 w-5 text-[#b8943e]" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">AI Cost Forecaster</h3>
            <p className="text-xs text-muted-foreground">
              Learned from {legsWithData.length > 0 ? `${legsWithData.length} logged legs` : "no actuals yet"} ·
              Rate: <span className="font-semibold text-foreground">{learnedL100.toFixed(1)} L/100km</span> ·
              Avg price: <span className="font-semibold text-foreground">${avgPricePerL.toFixed(2)}/L</span> ·
              <span className="text-foreground font-semibold"> {remainingKm.toLocaleString()} km</span> remaining
            </p>
          </div>
        </div>

        {/* Condition sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-muted/30 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Wind className="h-3.5 w-3.5 text-primary" /> Wind
              </label>
              <span className={cn(
                "text-xs font-bold tabular-nums",
                windFactor > 10 ? "text-destructive" : windFactor < -5 ? "text-primary" : "text-muted-foreground"
              )}>
                {windFactor > 0 ? `+${windFactor}% head` : windFactor < 0 ? `${Math.abs(windFactor)}% tail` : "Neutral"}
              </span>
            </div>
            <input type="range" min={-20} max={30} value={windFactor}
              onChange={e => setWindFactor(Number(e.target.value))}
              className="w-full accent-primary h-1.5 cursor-pointer" />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>Tailwind</span><span>Headwind</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Gauge className="h-3.5 w-3.5 text-primary" /> Speed
              </label>
              <span className={cn(
                "text-xs font-bold tabular-nums",
                speedFactor > 10 ? "text-destructive" : speedFactor < 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {speedFactor > 0 ? `+${speedFactor}%` : speedFactor < 0 ? `${speedFactor}%` : "100 km/h"}
              </span>
            </div>
            <input type="range" min={-10} max={20} value={speedFactor}
              onChange={e => setSpeedFactor(Number(e.target.value))}
              className="w-full accent-primary h-1.5 cursor-pointer" />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>Eco cruise</span><span>Fast highway</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Thermometer className="h-3.5 w-3.5 text-primary" /> Heat / AC
              </label>
              <span className={cn(
                "text-xs font-bold tabular-nums",
                tempFactor > 10 ? "text-destructive" : tempFactor === 0 ? "text-muted-foreground" : "text-[#b8943e]"
              )}>
                {tempFactor === 0 ? "Off / mild" : `+${tempFactor}% AC load`}
              </span>
            </div>
            <input type="range" min={0} max={20} value={tempFactor}
              onChange={e => setTempFactor(Number(e.target.value))}
              className="w-full accent-primary h-1.5 cursor-pointer" />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>Mild</span><span>Extreme heat</span>
            </div>
          </div>
        </div>

        {/* 3 scenario cards */}
        <div className="grid grid-cols-3 gap-4">
          <ScenarioCard
            label="Optimal"
            totalCost={totalFuelCost + optRemain}
            remainingCost={optRemain}
            colorClass="bg-primary/10 text-primary"
            badge="Tailwind / Eco"
          />
          <ScenarioCard
            label="Baseline"
            totalCost={totalFuelCost + baseRemain}
            remainingCost={baseRemain}
            colorClass="bg-[#d9b880]/30 text-[#b8943e]"
            badge="Your conditions"
            current
          />
          <ScenarioCard
            label="Adverse"
            totalCost={totalFuelCost + advRemain}
            remainingCost={advRemain}
            colorClass="bg-destructive/10 text-destructive"
            badge="Headwind + Heat"
          />
        </div>

        {/* Forecast cone */}
        {forecastData.length > 1 && (
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Cumulative Fuel Cost Projection — Cone of Uncertainty
              </CardTitle>
            </CardHeader>
            <CardContent className="h-52 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 11 }}
                    formatter={(v: number, name: string) => [`$${v}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area dataKey="adverse" name="Adverse" type="monotone"
                    fill="#fca5a5" fillOpacity={0.2} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" />
                  <Area dataKey="baseline" name="Baseline" type="monotone"
                    fill="#d9b880" fillOpacity={0.3} stroke="#b8943e" strokeWidth={2} />
                  <Area dataKey="optimal" name="Optimal" type="monotone"
                    fill="#1f6f5f" fillOpacity={0.15} stroke="#1f6f5f" strokeWidth={1.5} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Leg Breakdown Table ── */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Leg-by-Leg Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["#", "Route", "Planned", "Actual", "Litres", "L/100km", "Cost", "Status"].map(h => (
                    <th key={h} className={cn(
                      "p-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground",
                      h === "#" || h === "Status" ? "text-center" : h === "Route" ? "text-left" : "text-right"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedLegs.map((leg, i) => {
                  const hasActual = (leg.actualKm ?? 0) > 0;
                  const l100 = hasActual && leg.actualLitres
                    ? (leg.actualLitres / leg.actualKm!) * 100 : null;
                  const cost = (leg.actualLitres || 0) * (leg.actualPricePerLitre || 0);
                  const eff = l100 ? (l100 < 16 ? "text-primary" : l100 < 20 ? "text-[#b8943e]" : "text-destructive") : "";
                  return (
                    <tr key={leg.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-center text-muted-foreground text-xs font-mono">{i + 1}</td>
                      <td className="p-3 font-medium text-foreground text-xs max-w-[180px]">
                        <span className="truncate block">{leg.fromPlace} → {leg.toPlace}</span>
                      </td>
                      <td className="p-3 text-right text-muted-foreground text-xs">{leg.plannedKm ?? 0} km</td>
                      <td className="p-3 text-right font-medium text-xs">
                        {hasActual ? `${leg.actualKm} km` : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="p-3 text-right text-xs">
                        {leg.actualLitres ? `${leg.actualLitres}L` : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className={cn("p-3 text-right text-xs font-semibold", eff)}>
                        {l100 ? l100.toFixed(1) : <span className="text-muted-foreground/30 font-normal">—</span>}
                      </td>
                      <td className="p-3 text-right text-xs font-medium">
                        {cost > 0 ? `$${cost.toFixed(2)}` : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="p-3 text-center">
                        {hasActual ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            <CheckCircle2 className="h-2.5 w-2.5" /> DONE
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#d9b880]/20 text-[#b8943e]">
                            PLANNED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold border-t-2 border-border text-xs">
                  <td colSpan={2} className="p-3">TOTALS</td>
                  <td className="p-3 text-right">{totalPlanned.toLocaleString()} km</td>
                  <td className="p-3 text-right">{totalActual > 0 ? `${totalActual.toLocaleString()} km` : "—"}</td>
                  <td colSpan={2} className="p-3 text-right text-muted-foreground">
                    {legsWithData.length > 0 ? `${learnedL100.toFixed(1)} L avg` : "—"}
                  </td>
                  <td className="p-3 text-right">${totalFuelCost.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 24-Month Cost Forecast ── */}
      <div className="rounded-xl border-2 border-primary/20 bg-card overflow-hidden">
        <div className="bg-muted/30 px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">24-Month Cost Forecast</h3>
            <p className="text-xs text-muted-foreground">
              Monthly fuel + maintenance estimate · {forecast24.filter(m => m.inTrip).length} trip months highlighted ·
              Based on {learnedL100.toFixed(1)} L/100km @ ${avgPricePerL.toFixed(2)}/L
            </p>
          </div>
          <div className="ml-auto text-right shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">24-mo baseline total</p>
            <p className="text-lg font-bold text-foreground">
              ${forecast24.reduce((s, m) => s + m.total, 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Monthly stacked bar */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Monthly Spend — Fuel + Maintenance</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast24} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 11 }}
                    formatter={(v: number, name: string) => [`$${v}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="fuel" name="Fuel" stackId="a" fill="#1f6f5f" fillOpacity={0.85} />
                  <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill="#d9b880" fillOpacity={0.75} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative 3-scenario line */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cumulative Spend — Optimal / Baseline / Adverse</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast24} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 11 }}
                    formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line dataKey="cumOpt" name="Optimal" stroke="#1f6f5f" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                  <Line dataKey="cumBase" name="Baseline" stroke="#b8943e" strokeWidth={2.5} dot={false} />
                  <Line dataKey="cumAdv" name="Adverse" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 grid grid-cols-6 text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-4 py-2.5">
              <span>Month</span>
              <span className="text-right">Km Est.</span>
              <span className="text-right">Fuel</span>
              <span className="text-right">Maint.</span>
              <span className="text-right">Total</span>
              <span className="text-right">Cumulative</span>
            </div>
            <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
              {forecast24.map((m, i) => {
                const tripMonthCount = forecast24.filter(x => x.inTrip).length;
                const monthlyKmEst = tripMonthCount > 0 ? Math.round(totalPlanned / tripMonthCount) : 0;
                return (
                  <div key={i} className={cn(
                    "grid grid-cols-6 px-4 py-2 text-xs transition-colors",
                    m.inTrip ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"
                  )}>
                    <span className={cn("font-medium", m.inTrip ? "text-primary" : "text-foreground")}>
                      {m.month}
                      {m.inTrip && <span className="ml-1 text-[9px] text-primary/60">TRIP</span>}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {m.inTrip ? `${monthlyKmEst.toLocaleString()} km` : "—"}
                    </span>
                    <span className="text-right text-foreground">{m.fuel > 0 ? `$${m.fuel}` : "—"}</span>
                    <span className="text-right text-[#b8943e]">${m.maintenance}</span>
                    <span className="text-right font-semibold text-foreground">${m.total}</span>
                    <span className="text-right text-muted-foreground">${m.cumBase.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
