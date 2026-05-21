import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, DollarSign, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface IncomeMonth {
  forecast: number;
  actual: number;
}

export interface IncomeSource {
  id: string;
  label: string;
  months: Record<string, IncomeMonth>;
}

export interface IncomeWorksheet {
  sources: IncomeSource[];
}

export const DEFAULT_INCOME_SOURCES: IncomeSource[] = [
  { id: "salary",      label: "Salary / Employment",         months: {} },
  { id: "rental",      label: "Rental Net Income",           months: {} },
  { id: "business",    label: "Business Income",             months: {} },
  { id: "dividends",   label: "Share Dividends",             months: {} },
  { id: "cgt",         label: "Capital Gains (Crystallised)",months: {} },
  { id: "centrelink",  label: "Government / Centrelink",     months: {} },
  { id: "superPension",label: "Super Pension / Drawdown",    months: {} },
  { id: "side",        label: "Side Income / Consulting",    months: {} },
  { id: "other1",      label: "Other Income 1",              months: {} },
  { id: "other2",      label: "Other Income 2",              months: {} },
];

export const DEFAULT_INCOME: IncomeWorksheet = { sources: DEFAULT_INCOME_SOURCES };

// ── Helpers ───────────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => `inc${Date.now()}${_uid++}`;

const fmt = (n: number) =>
  n === 0 ? "" : new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", maximumFractionDigits: 0,
  }).format(n);

const fmtVar = (n: number) => {
  if (n === 0) return <span className="text-muted-foreground/40">—</span>;
  return <span className={n >= 0 ? "text-primary" : "text-destructive"}>{fmt(Math.abs(n))}{n < 0 ? " short" : " ahead"}</span>;
};

const BUDGET_BASE = new Date(2026, 2, 1);
const monthLabel = (i: number, style: "short" | "long" = "short"): string => {
  const d = new Date(BUDGET_BASE.getFullYear(), BUDGET_BASE.getMonth() + i, 1);
  return d.toLocaleDateString("en-AU", style === "short" ? { month: "short", year: "2-digit" } : { month: "long", year: "numeric" });
};

function srcMonth(src: IncomeSource, i: number): IncomeMonth {
  return src.months?.[i.toString()] ?? { forecast: 0, actual: 0 };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface IncomeCellProps {
  value: number;
  onChange: (v: number) => void;
  isActual?: boolean;
}
function IncomeCell({ value, onChange, isActual }: IncomeCellProps) {
  return (
    <input
      type="number" min={0} step={100}
      value={value || ""}
      placeholder="0"
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className={cn(
        "w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 tabular-nums text-xs",
        isActual
          ? (value > 0 ? "text-blue-600 font-medium" : "text-muted-foreground/30")
          : (value > 0 ? "text-primary font-medium" : "text-muted-foreground/30")
      )}
    />
  );
}

export default function IncomeSub({
  data,
  onChange,
  mainMonths,
}: {
  data: IncomeWorksheet;
  onChange: (updated: IncomeWorksheet) => void;
  mainMonths: Record<string, any>;
}) {
  const sources = data.sources?.length ? data.sources : DEFAULT_INCOME_SOURCES;

  const [viewYear, setViewYear] = useState(0);
  const viewStart = viewYear * 12;
  const viewEnd   = viewYear * 12 + 11;
  const visibleCount = 12;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const setCell = (srcIdx: number, monthIdx: number, field: "forecast" | "actual", value: number) => {
    const next = sources.map((s, si) => {
      if (si !== srcIdx) return s;
      const existing = srcMonth(s, monthIdx);
      return { ...s, months: { ...s.months, [monthIdx.toString()]: { ...existing, [field]: value } } };
    });
    onChange({ ...data, sources: next });
  };

  const setLabel = (srcIdx: number, label: string) => {
    const next = sources.map((s, si) => si === srcIdx ? { ...s, label } : s);
    onChange({ ...data, sources: next });
  };

  const addSource = () => {
    if (sources.length >= 10) return;
    onChange({ ...data, sources: [...sources, { id: uid(), label: `Income Source ${sources.length + 1}`, months: {} }] });
  };

  const removeSource = (srcIdx: number) => {
    onChange({ ...data, sources: sources.filter((_, i) => i !== srcIdx) });
  };

  // ── Computed ───────────────────────────────────────────────────────────────

  const monthTotals = Array.from({ length: 60 }, (_, i) => {
    const totalForecast = sources.reduce((s, src) => s + srcMonth(src, i).forecast, 0);
    const totalActual   = sources.reduce((s, src) => s + srcMonth(src, i).actual, 0);
    // main workbook income (sum of legacy income keys)
    const m = mainMonths?.[i.toString()] ?? mainMonths?.[i] ?? {};
    const mainIncome = (Number(m.rentalNet) || 0) + (Number(m.salary) || 0) +
      (Number(m.businessIncome) || 0) + (Number(m.refunds) || 0) +
      (Number(m.otherIncome1) || 0) + (Number(m.otherIncome2) || 0);
    return { totalForecast, totalActual, mainIncome, variance: totalActual - totalForecast };
  });

  const visibleMonths = Array.from({ length: visibleCount }, (_, i) => viewStart + i);

  const periodForecast = visibleMonths.reduce((s, i) => s + monthTotals[i].totalForecast, 0);
  const periodActual   = visibleMonths.reduce((s, i) => s + monthTotals[i].totalActual, 0);
  const annualForecast = Array.from({ length: 12 }, (_, i) => viewStart + i).reduce((s, i) => s + monthTotals[i].totalForecast, 0);

  return (
    <div className="space-y-4 p-0">

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: `Year ${viewYear + 1} Forecast`, value: fmt(annualForecast), color: "text-primary", icon: TrendingUp },
          { label: "Period Forecast", value: fmt(periodForecast), color: "text-primary", icon: DollarSign },
          { label: "Period Actual",   value: fmt(periodActual),   color: "text-blue-600", icon: DollarSign },
          { label: "Variance",        value: fmt(Math.abs(periodActual - periodForecast)),
            color: periodActual >= periodForecast ? "text-primary" : "text-destructive", icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <div className="flex items-center justify-between">
                <span className={cn("text-xl font-bold", color)}>{value || "$0"}</span>
                <Icon className={cn("h-4 w-4 opacity-40", color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Year nav */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">View Year:</span>
        {[0, 1, 2, 3, 4].map(yr => (
          <button key={yr} onClick={() => setViewYear(yr)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-semibold border transition-colors",
              viewYear === yr ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}>
            Year {yr + 1}
          </button>
        ))}
        <button onClick={() => setViewYear(v => Math.max(0, v - 1))} disabled={viewYear === 0}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 ml-auto"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={() => setViewYear(v => Math.min(4, v + 1))} disabled={viewYear === 4}
          className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        {sources.length < 10 && (
          <Button size="sm" variant="outline" onClick={addSource} className="ml-2">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Source
          </Button>
        )}
      </div>

      {/* Spreadsheet */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-2 pl-3 font-semibold text-foreground w-40 min-w-[140px]">Income Source</th>
                  <th className="text-left p-2 w-16 text-muted-foreground font-medium">Row</th>
                  {visibleMonths.map(mi => (
                    <th key={mi} className="text-center p-1.5 font-medium text-muted-foreground min-w-[70px]">
                      {monthLabel(mi)}
                    </th>
                  ))}
                  <th className="text-right p-2 pr-3 font-semibold text-foreground min-w-[80px]">Year Total</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((src, si) => {
                  const yearForecast = visibleMonths.reduce((s, mi) => s + srcMonth(src, mi).forecast, 0);
                  const yearActual   = visibleMonths.reduce((s, mi) => s + srcMonth(src, mi).actual, 0);
                  return (
                    <React.Fragment key={src.id}>
                      {/* Forecast row */}
                      <tr className="border-b border-border/20 hover:bg-muted/10">
                        <td className="p-1.5 pl-3" rowSpan={3}>
                          <div className="flex items-center gap-1">
                            <input
                              value={src.label}
                              onChange={e => setLabel(si, e.target.value)}
                              className="text-xs font-medium text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full"
                            />
                            <button onClick={() => removeSource(si)} className="text-muted-foreground/40 hover:text-destructive shrink-0">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Forecast</td>
                        {visibleMonths.map(mi => (
                          <td key={mi} className="p-1">
                            <IncomeCell value={srcMonth(src, mi).forecast} onChange={v => setCell(si, mi, "forecast", v)} />
                          </td>
                        ))}
                        <td className="p-2 pr-3 text-right font-semibold text-primary tabular-nums">{yearForecast > 0 ? fmt(yearForecast) : ""}</td>
                      </tr>
                      {/* Actual row */}
                      <tr className="border-b border-border/20 bg-blue-500/3 hover:bg-blue-500/5">
                        <td className="p-1.5 text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Actual</td>
                        {visibleMonths.map(mi => (
                          <td key={mi} className="p-1">
                            <IncomeCell value={srcMonth(src, mi).actual} onChange={v => setCell(si, mi, "actual", v)} isActual />
                          </td>
                        ))}
                        <td className="p-2 pr-3 text-right font-semibold text-blue-600 tabular-nums">{yearActual > 0 ? fmt(yearActual) : ""}</td>
                      </tr>
                      {/* Variance row */}
                      <tr className="border-b-2 border-border/40">
                        <td className="p-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Variance</td>
                        {visibleMonths.map(mi => {
                          const f = srcMonth(src, mi).forecast;
                          const a = srcMonth(src, mi).actual;
                          const v = a - f;
                          return (
                            <td key={mi} className="p-1 text-right tabular-nums">
                              {(f > 0 || a > 0) ? fmtVar(v) : <span className="text-muted-foreground/20">—</span>}
                            </td>
                          );
                        })}
                        <td className="p-2 pr-3 text-right tabular-nums">
                          {(yearForecast > 0 || yearActual > 0) ? fmtVar(yearActual - yearForecast) : ""}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}

                {/* Total rows */}
                <tr className="border-t-2 border-border bg-primary/5">
                  <td className="p-2 pl-3 font-bold text-xs uppercase tracking-wide text-primary" colSpan={2}>Total Forecast</td>
                  {visibleMonths.map(mi => (
                    <td key={mi} className="p-2 text-right font-bold text-primary tabular-nums">
                      {monthTotals[mi].totalForecast > 0 ? fmt(monthTotals[mi].totalForecast) : ""}
                    </td>
                  ))}
                  <td className="p-2 pr-3 text-right font-bold text-primary tabular-nums">{fmt(periodForecast)}</td>
                </tr>
                <tr className="border-t border-border bg-blue-500/5">
                  <td className="p-2 pl-3 font-bold text-xs uppercase tracking-wide text-blue-600" colSpan={2}>Total Actual</td>
                  {visibleMonths.map(mi => (
                    <td key={mi} className="p-2 text-right font-bold text-blue-600 tabular-nums">
                      {monthTotals[mi].totalActual > 0 ? fmt(monthTotals[mi].totalActual) : ""}
                    </td>
                  ))}
                  <td className="p-2 pr-3 text-right font-bold text-blue-600 tabular-nums">{fmt(periodActual)}</td>
                </tr>

                {/* Reconciliation vs main workbook */}
                <tr className="border-t-2 border-[#d9b880]/60 bg-[#d9b880]/8">
                  <td className="p-2 pl-3 font-bold text-xs uppercase tracking-wide text-[#b8943e]" colSpan={2}>Budget Workbook</td>
                  {visibleMonths.map(mi => (
                    <td key={mi} className="p-2 text-right font-semibold text-[#b8943e] tabular-nums text-xs">
                      {monthTotals[mi].mainIncome > 0 ? fmt(monthTotals[mi].mainIncome) : <span className="text-muted-foreground/20">—</span>}
                    </td>
                  ))}
                  <td className="p-2 pr-3 text-right font-bold text-[#b8943e] tabular-nums">
                    {fmt(visibleMonths.reduce((s, mi) => s + monthTotals[mi].mainIncome, 0))}
                  </td>
                </tr>
                <tr className="border-t border-[#d9b880]/40 bg-[#d9b880]/5">
                  <td className="p-2 pl-3 font-semibold text-xs text-muted-foreground" colSpan={2}>Reconciliation Gap</td>
                  {visibleMonths.map(mi => {
                    const gap = monthTotals[mi].totalForecast - monthTotals[mi].mainIncome;
                    return (
                      <td key={mi} className="p-2 text-right text-xs tabular-nums">
                        {Math.abs(gap) > 1 ? <span className={gap > 0 ? "text-primary" : "text-destructive"}>{fmt(Math.abs(gap))}</span> : <span className="text-muted-foreground/30">—</span>}
                      </td>
                    );
                  })}
                  <td className="p-2 pr-3 text-right text-xs font-semibold tabular-nums">
                    {(() => { const g = periodForecast - visibleMonths.reduce((s, mi) => s + monthTotals[mi].mainIncome, 0); return Math.abs(g) > 1 ? <span className={g > 0 ? "text-primary" : "text-destructive"}>{fmt(Math.abs(g))}</span> : <span className="text-muted-foreground/30">—</span>; })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex gap-6 text-[10px] text-muted-foreground">
        <span><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />Forecast — planned income</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Actual — received to date</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#d9b880] mr-1" />Budget Workbook — reconciliation reference from Overview tab</span>
      </div>
    </div>
  );
}
