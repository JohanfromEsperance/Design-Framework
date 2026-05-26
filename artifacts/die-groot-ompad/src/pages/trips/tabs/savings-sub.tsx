import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SavingsMonth {
  deposit: number;
  withdrawal: number;
}

export interface SavingsWorksheet {
  bucketName: string;
  openingBalance: number;
  months: Record<string, SavingsMonth>;
}

export const DEFAULT_SAVINGS: SavingsWorksheet = {
  bucketName: "Savings Bucket",
  openingBalance: 0,
  months: {},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BUDGET_BASE = new Date(2026, 2, 1);

const monthLabel = (i: number, style: "short" | "long" = "short"): string => {
  const d = new Date(BUDGET_BASE.getFullYear(), BUDGET_BASE.getMonth() + i, 1);
  return d.toLocaleDateString("en-AU", style === "short"
    ? { month: "short", year: "2-digit" }
    : { month: "long", year: "numeric" });
};

// Current month index relative to budget base (March 2026 = 0)
const todayMonthIdx = (() => {
  const now = new Date();
  return Math.max(0, Math.min(59,
    (now.getFullYear() - 2026) * 12 + (now.getMonth() - 2)
  ));
})();

const fmt = (n: number) => new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD", maximumFractionDigits: 0,
}).format(n);

function getMonth(ws: SavingsWorksheet, i: number): SavingsMonth {
  return ws.months?.[i.toString()] ?? { deposit: 0, withdrawal: 0 };
}

// ── Cell component ────────────────────────────────────────────────────────────

function SavingsCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(value === 0 ? "" : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(value === 0 ? "" : String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    onChange(isNaN(n) ? 0 : n);
  };

  return (
    <input
      type="number" min={0} step={100}
      value={local}
      placeholder="0"
      onChange={e => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={e => { setFocused(false); commit(e.target.value); }}
      onKeyDown={e => {
        if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
      }}
      className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 tabular-nums text-xs text-primary font-medium"
    />
  );
}

function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setLocal(value); }, [value, focused]);
  return (
    <input
      type="text"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={e => { setFocused(false); onChange(e.target.value); }}
      onKeyDown={e => { if (e.key === "Enter") { onChange((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
      className="bg-transparent border-b border-border/40 focus:border-primary focus:outline-none text-lg font-bold text-foreground px-0 w-56"
    />
  );
}

function BalanceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(value === 0 ? "" : String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setLocal(value === 0 ? "" : String(value)); }, [value, focused]);
  const commit = (raw: string) => { const n = parseFloat(raw); onChange(isNaN(n) ? 0 : n); };
  return (
    <input
      type="number" min={0} step={1000}
      value={local} placeholder="0"
      onChange={e => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={e => { setFocused(false); commit(e.target.value); }}
      onKeyDown={e => { if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
      className="w-32 text-right bg-transparent border-b border-border/40 focus:border-primary focus:outline-none tabular-nums text-sm font-semibold text-foreground px-1"
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SavingsSubProps {
  data: SavingsWorksheet;
  onChange: (updated: SavingsWorksheet) => void;
  drawdown?: number[];
  contributions?: number[];
}

export default function SavingsSub({ data, onChange, drawdown, contributions }: SavingsSubProps) {
  const ws = { ...DEFAULT_SAVINGS, ...data, months: data.months ?? {} };
  const [viewYear, setViewYear] = useState(0);

  const viewStart = viewYear * 12;
  const visibleMonths = Array.from({ length: 12 }, (_, i) => viewStart + i);

  // Compute running balance across all 60 months.
  // contributions = savingsZandra + savingsJohan from the budget grid (internal budget-to-savings transfers).
  // drawdown = budget shortfall that must be funded from savings (already excludes contributions).
  const runningBalance = (() => {
    let bal = ws.openingBalance;
    return Array.from({ length: 60 }, (_, i) => {
      const m      = getMonth(ws, i);
      const draw   = drawdown?.[i] ?? 0;
      const contrib = contributions?.[i] ?? 0;
      const opening = bal;
      bal = bal + m.deposit + contrib - m.withdrawal - draw;
      return { opening, deposit: m.deposit, contrib, withdrawal: m.withdrawal, drawdown: draw, closing: bal };
    });
  })();

  const setField = (monthIdx: number, field: "deposit" | "withdrawal", v: number) => {
    const existing = getMonth(ws, monthIdx);
    onChange({
      ...ws,
      months: { ...ws.months, [monthIdx.toString()]: { ...existing, [field]: v } },
    });
  };

  const periodDeposits    = visibleMonths.reduce((s, i) => s + runningBalance[i].deposit, 0);
  const periodContribs    = visibleMonths.reduce((s, i) => s + runningBalance[i].contrib, 0);
  const periodWithdrawals = visibleMonths.reduce((s, i) => s + runningBalance[i].withdrawal, 0);
  const periodDrawdown    = visibleMonths.reduce((s, i) => s + Math.max(0, runningBalance[i].drawdown), 0);
  const periodNet         = periodDeposits + periodContribs - periodWithdrawals - periodDrawdown;
  const closingBalance    = runningBalance[viewStart + 11]?.closing ?? ws.openingBalance;
  const openingThisYear   = runningBalance[viewStart]?.opening ?? ws.openingBalance;

  const minBalance = Math.min(...runningBalance.slice(0, 60).map(b => b.closing));
  const maxBalance = Math.max(...runningBalance.slice(0, 60).map(b => b.closing));

  // 60-month chart data
  const chartData = runningBalance.map((b, i) => ({
    name: i === todayMonthIdx ? "Now" : (i % 6 === 0 ? monthLabel(i, "short") : ""),
    mi: i,
    balance: b.closing,
    drawdownVal: Math.max(0, b.drawdown),
  }));

  const total5yrDeposits    = runningBalance.reduce((s, b) => s + b.deposit, 0);
  const total5yrContribs    = runningBalance.reduce((s, b) => s + b.contrib, 0);
  const total5yrWithdrawals = runningBalance.reduce((s, b) => s + b.withdrawal, 0);
  const total5yrDrawdown    = runningBalance.reduce((s, b) => s + Math.max(0, b.drawdown), 0);
  const finalBalance        = runningBalance[59]?.closing ?? ws.openingBalance;

  return (
    <div className="space-y-4 p-0">

      {/* Header — bucket name + opening balance */}
      <div className="flex flex-wrap items-center gap-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Bucket Name</span>
          <NameInput value={ws.bucketName} onChange={v => onChange({ ...ws, bucketName: v })} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Opening Balance (Month 0)</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">$</span>
            <BalanceInput value={ws.openingBalance} onChange={v => onChange({ ...ws, openingBalance: v })} />
          </div>
        </div>
        <div className="flex flex-col gap-1 ml-auto text-right">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">5-Year Min / Max</span>
          <span className="text-sm tabular-nums">
            <span className="text-destructive font-semibold">{fmt(minBalance)}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-primary font-semibold">{fmt(maxBalance)}</span>
          </span>
        </div>
      </div>

      {/* ── 60-Month Pool Balance Chart ── */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm">60-Month Savings Pool Balance</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Opening balance minus budget drawdown, plus your manual deposits and withdrawals.
            Amber dashed line = today ({monthLabel(todayMonthIdx, "short")}).
          </p>
        </CardHeader>
        <CardContent className="h-48 px-2 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: "#e5e7eb40" }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 10 }}
                formatter={(v: number) => [fmt(v), "Pool Balance"]}
                labelFormatter={(_: any, payload: any[]) => payload?.[0] ? monthLabel(payload[0].payload.mi, "long") : ""}
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
              <ReferenceLine
                x="Now"
                stroke="#d9b880" strokeWidth={2} strokeDasharray="5 3"
                label={{ value: "Today", position: "insideTopLeft", fontSize: 9, fill: "#d9b880", fontWeight: "bold" }}
              />
              <Area dataKey="balance" name="Pool Balance" type="monotone"
                fill="#1f6f5f" fillOpacity={0.18} stroke="#1f6f5f" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: `Year ${viewYear + 1} Opening`, value: fmt(openingThisYear), icon: Wallet, color: "text-foreground" },
          { label: `Year ${viewYear + 1} Deposits`, value: fmt(periodDeposits), icon: ArrowDownCircle, color: "text-primary" },
          { label: `Year ${viewYear + 1} Drawdown`, value: fmt(periodDrawdown), icon: TrendingDown, color: "text-destructive" },
          {
            label: `Year ${viewYear + 1} Closing`,
            value: fmt(closingBalance),
            icon: periodNet >= 0 ? TrendingUp : PiggyBank,
            color: periodNet >= 0 ? "text-primary" : "text-destructive",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <div className="flex items-center justify-between">
                <span className={cn("text-xl font-bold tabular-nums", color)}>{value}</span>
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
              viewYear === yr
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}>
            Year {yr + 1}
          </button>
        ))}
      </div>

      {/* Spreadsheet */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-2 pl-3 font-semibold text-foreground w-32">Row</th>
                  {visibleMonths.map(mi => (
                    <th key={mi} className="text-center p-1.5 font-medium text-muted-foreground min-w-[72px]">
                      {monthLabel(mi)}
                    </th>
                  ))}
                  <th className="text-right p-2 pr-3 font-semibold text-foreground min-w-[80px]">Year Total</th>
                </tr>
              </thead>
              <tbody>

                {/* Opening balance row */}
                <tr className="border-b border-border/30 bg-muted/10">
                  <td className="p-2 pl-3 font-semibold text-xs text-foreground">Opening Balance</td>
                  {visibleMonths.map(mi => (
                    <td key={mi} className="p-2 text-right tabular-nums font-medium text-foreground">
                      {fmt(runningBalance[mi].opening)}
                    </td>
                  ))}
                  <td className="p-2 pr-3 text-right tabular-nums text-muted-foreground">—</td>
                </tr>

                {/* Deposit row */}
                <tr className="border-b border-border/20 hover:bg-primary/3">
                  <td className="p-2 pl-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <ArrowDownCircle className="h-3 w-3 text-primary shrink-0" />
                        <span className="font-semibold text-primary">Deposit</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground leading-tight">One-off cash injections (super lump sum, etc.)</span>
                    </div>
                  </td>
                  {visibleMonths.map(mi => (
                    <td key={mi} className="p-1">
                      <SavingsCell value={getMonth(ws, mi).deposit} onChange={v => setField(mi, "deposit", v)} />
                    </td>
                  ))}
                  <td className="p-2 pr-3 text-right tabular-nums font-semibold text-primary">
                    {periodDeposits > 0 ? fmt(periodDeposits) : ""}
                  </td>
                </tr>

                {/* Budget Allocation row — read-only, from savingsZandra + savingsJohan in budget grid */}
                <tr className="border-b border-border/20 bg-primary/2">
                  <td className="p-2 pl-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <ArrowDownCircle className="h-3 w-3 text-primary/60 shrink-0" />
                        <span className="font-semibold text-primary/70">Budget Allocation</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground leading-tight">Savings Zandra + Savings Johan from budget grid</span>
                    </div>
                  </td>
                  {visibleMonths.map(mi => {
                    const c = runningBalance[mi].contrib;
                    return (
                      <td key={mi} className="p-2 text-right tabular-nums font-medium text-primary/70">
                        {c > 0 ? fmt(c) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    );
                  })}
                  <td className="p-2 pr-3 text-right tabular-nums font-semibold text-primary/70">
                    {periodContribs > 0 ? fmt(periodContribs) : "—"}
                  </td>
                </tr>

                {/* Withdrawal row */}
                <tr className="border-b border-border/20 hover:bg-[#b8943e]/3">
                  <td className="p-2 pl-3">
                    <div className="flex items-center gap-1.5">
                      <ArrowUpCircle className="h-3 w-3 text-[#b8943e] shrink-0" />
                      <span className="font-semibold text-[#b8943e]">Withdrawal</span>
                    </div>
                  </td>
                  {visibleMonths.map(mi => (
                    <td key={mi} className="p-1">
                      <SavingsCell value={getMonth(ws, mi).withdrawal} onChange={v => setField(mi, "withdrawal", v)} />
                    </td>
                  ))}
                  <td className="p-2 pr-3 text-right tabular-nums font-semibold text-[#b8943e]">
                    {periodWithdrawals > 0 ? fmt(periodWithdrawals) : ""}
                  </td>
                </tr>

                {/* Drawdown row — read-only, from budget calculation */}
                <tr className="border-b border-border/20 bg-destructive/3">
                  <td className="p-2 pl-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="h-3 w-3 text-destructive shrink-0" />
                        <span className="font-semibold text-destructive">Drawdown</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground leading-tight">Monthly budget deficit pulled from savings</span>
                    </div>
                  </td>
                  {visibleMonths.map(mi => {
                    const draw = Math.max(0, runningBalance[mi].drawdown);
                    return (
                      <td key={mi} className="p-2 text-right tabular-nums font-medium text-destructive">
                        {draw > 0 ? fmt(draw) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    );
                  })}
                  <td className="p-2 pr-3 text-right tabular-nums font-semibold text-destructive">
                    {periodDrawdown > 0 ? fmt(periodDrawdown) : "—"}
                  </td>
                </tr>

                {/* Closing balance row */}
                <tr className="border-t-2 border-border bg-primary/5">
                  <td className="p-2 pl-3 font-bold text-xs uppercase tracking-wide text-primary">Closing Balance</td>
                  {visibleMonths.map(mi => {
                    const bal = runningBalance[mi].closing;
                    return (
                      <td key={mi} className={cn(
                        "p-2 text-right tabular-nums font-bold",
                        bal < 0 ? "text-destructive" : "text-primary"
                      )}>
                        {fmt(bal)}
                      </td>
                    );
                  })}
                  <td className="p-2 pr-3 text-right tabular-nums">
                    <span className={cn("font-bold text-sm", periodNet >= 0 ? "text-primary" : "text-destructive")}>
                      {periodNet >= 0 ? "+" : ""}{fmt(periodNet)}
                    </span>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 5-Year Total Savings Calculation ── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">5-Year Total Savings Calculation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/30">
            {[
              { label: "Opening Balance (Month 0)",             value: ws.openingBalance,    color: "text-foreground",    sign: "" },
              { label: "Total Deposits (60 months)",            value: total5yrDeposits,     color: "text-primary",       sign: "+" },
              { label: "Total Budget Allocations (60 months)",  value: total5yrContribs,     color: "text-primary/70",    sign: "+" },
              { label: "Total Withdrawals (60 months)",         value: total5yrWithdrawals,  color: "text-[#b8943e]",     sign: "−" },
              { label: "Total Drawdown (60 months)",            value: total5yrDrawdown,     color: "text-destructive",   sign: "−" },
            ].map(({ label, value, color, sign }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={cn("text-sm font-semibold tabular-nums", color)}>
                  {sign} {fmt(value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">Closing Pool Balance (Month 60)</span>
              <span className={cn("text-lg font-bold tabular-nums", finalBalance >= 0 ? "text-primary" : "text-destructive")}>
                {fmt(finalBalance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-muted-foreground">
        <span><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />Deposit — one-off cash injections (super lump sum, inheritance, etc.)</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-primary/50 mr-1" />Budget Allocation — Savings Zandra + Savings Johan from budget grid (auto)</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#d9b880] mr-1" />Withdrawal — money taken from this bucket</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-destructive mr-1" />Drawdown — monthly budget deficit funded from savings (auto)</span>
      </div>
    </div>
  );
}
