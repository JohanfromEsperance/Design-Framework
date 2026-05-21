import React, { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SuperAccount {
  id: string;
  name: string;
  fund: string;
  currentBalance: number;
  employerRate: number;
  personalRate: number;
  grossSalary: number;
  returnRate: number;
  forecastYears: number;
}

export interface SuperPortfolio {
  accounts: SuperAccount[];
}

export const DEFAULT_SUPER: SuperPortfolio = {
  accounts: [
    {
      id: "johan",
      name: "Johan",
      fund: "AustralianSuper",
      currentBalance: 0,
      employerRate: 11.5,
      personalRate: 0,
      grossSalary: 0,
      returnRate: 7,
      forecastYears: 20,
    },
    {
      id: "zandra",
      name: "Zandra",
      fund: "AustralianSuper",
      currentBalance: 0,
      employerRate: 11.5,
      personalRate: 0,
      grossSalary: 0,
      returnRate: 7,
      forecastYears: 20,
    },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", maximumFractionDigits: 0,
  }).format(n);

function projectBalance(acc: SuperAccount): { year: number; balance: number; contributions: number; growth: number }[] {
  const { currentBalance, employerRate, personalRate, grossSalary, returnRate, forecastYears } = acc;
  const annualContrib = ((employerRate + personalRate) / 100) * grossSalary;
  const r = returnRate / 100;
  const rows = [];
  let balance = currentBalance;
  let totalContrib = 0;
  for (let y = 0; y <= forecastYears; y++) {
    rows.push({ year: y, balance: Math.round(balance), contributions: Math.round(totalContrib), growth: Math.round(balance - currentBalance - totalContrib) });
    const interest = balance * r;
    balance += annualContrib + interest;
    totalContrib += annualContrib;
  }
  return rows;
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({
  label, value, onChange, suffix = "", prefix = "",
  step = 0.1, min = 0, max,
}: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; prefix?: string; step?: number; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground flex-1 min-w-0">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-28 border border-border rounded px-2 py-1 text-xs text-right bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {suffix && <span className="text-xs text-muted-foreground w-4">{suffix}</span>}
      </div>
    </div>
  );
}

// ── Per-account card ──────────────────────────────────────────────────────────

function AccountCard({
  account, onChange,
}: {
  account: SuperAccount;
  onChange: (updated: SuperAccount) => void;
}) {
  const projection = projectBalance(account);
  const finalBalance = projection[projection.length - 1]?.balance ?? 0;
  const finalGrowth = projection[projection.length - 1]?.growth ?? 0;
  const annualContrib = ((account.employerRate + account.personalRate) / 100) * account.grossSalary;

  const set = (field: keyof SuperAccount) => (v: number | string) =>
    onChange({ ...account, [field]: v });

  const COLORS = account.id === "johan"
    ? { stroke: "#1f6f5f", fill: "#1f6f5f22", contrib: "#d9b880" }
    : { stroke: "#60a5fa", fill: "#60a5fa22", contrib: "#a78bfa" };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{account.name}</CardTitle>
          <input
            value={account.fund}
            onChange={e => onChange({ ...account, fund: e.target.value })}
            placeholder="Fund name"
            className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/40 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Balance</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{fmt(account.currentBalance)}</p>
          </div>
          <div className="bg-muted/40 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Annual Contribution</p>
            <p className="text-sm font-bold text-primary mt-0.5">{fmt(annualContrib)}</p>
          </div>
          <div className="bg-muted/40 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Projected in {account.forecastYears}yr</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{fmt(finalBalance)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Inputs */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Account Settings</p>
            <FieldRow label="Current Balance" value={account.currentBalance} onChange={set("currentBalance")} prefix="$" step={1000} />
            <FieldRow label="Annual Gross Salary" value={account.grossSalary} onChange={set("grossSalary")} prefix="$" step={1000} />
            <FieldRow label="Employer SG Rate" value={account.employerRate} onChange={set("employerRate")} suffix="%" max={30} />
            <FieldRow label="Personal Contribution" value={account.personalRate} onChange={set("personalRate")} suffix="%" max={30} />
            <FieldRow label="Expected Return" value={account.returnRate} onChange={set("returnRate")} suffix="%" max={20} />
            <FieldRow label="Forecast Horizon" value={account.forecastYears} onChange={v => set("forecastYears")(Math.round(v))} suffix="yr" step={1} min={1} max={40} />
          </div>

          {/* Chart */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Balance Projection — {account.forecastYears} Years @ {account.returnRate}% pa
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={projection} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb44" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `Y${v}`} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={52} />
                <RechartsTooltip
                  formatter={(val: number, name: string) => [fmt(val), name]}
                  labelFormatter={v => `Year ${v}`}
                  contentStyle={{ fontSize: 11 }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone" dataKey="balance" name="Total Balance"
                  stroke={COLORS.stroke} fill={COLORS.fill} strokeWidth={2}
                />
                <Area
                  type="monotone" dataKey="contributions" name="Contributions"
                  stroke={COLORS.contrib} fill={`${COLORS.contrib}22`} strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth summary */}
        <div className="bg-primary/5 border border-primary/20 rounded p-2 flex gap-6 text-xs">
          <span className="text-muted-foreground">Investment growth over {account.forecastYears} years:</span>
          <span className="font-semibold text-primary">{fmt(finalGrowth)}</span>
          <span className="text-muted-foreground ml-auto">
            Total contributions: <span className="font-semibold text-foreground">{fmt(projection[projection.length - 1]?.contributions ?? 0)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Combined projection chart ─────────────────────────────────────────────────

function CombinedChart({ accounts }: { accounts: SuperAccount[] }) {
  const maxYears = Math.max(...accounts.map(a => a.forecastYears), 10);
  const data = Array.from({ length: maxYears + 1 }, (_, y) => {
    const row: Record<string, number> = { year: y };
    let combined = 0;
    for (const acc of accounts) {
      const proj = projectBalance(acc);
      const pt = proj[y] ?? proj[proj.length - 1];
      row[acc.name] = pt?.balance ?? 0;
      combined += pt?.balance ?? 0;
    }
    row["Combined"] = combined;
    return row;
  });

  const PALETTE = ["#1f6f5f", "#60a5fa", "#d9b880"];

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Combined Super Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb44" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `Y${v}`} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={58} />
            <RechartsTooltip
              formatter={(val: number, name: string) => [fmt(val), name]}
              labelFormatter={v => `Year ${v}`}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            {accounts.map((acc, idx) => (
              <Area
                key={acc.id} type="monotone" dataKey={acc.name}
                stroke={PALETTE[idx % PALETTE.length]}
                fill={`${PALETTE[idx % PALETTE.length]}22`}
                strokeWidth={2}
              />
            ))}
            <Area
              type="monotone" dataKey="Combined" name="Combined Total"
              stroke="#a78bfa" fill="#a78bfa22" strokeWidth={2} strokeDasharray="5 3"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
          {accounts.map(acc => {
            const proj = projectBalance(acc);
            const end = proj[proj.length - 1];
            return (
              <div key={acc.id} className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground">{acc.name}</span>
                <span>Balance in {acc.forecastYears}yr: <span className="font-semibold text-primary">{fmt(end?.balance ?? 0)}</span></span>
              </div>
            );
          })}
          <div className="flex flex-col gap-0.5 ml-auto">
            <span className="font-semibold text-foreground">Combined</span>
            <span>
              Total:{" "}
              <span className="font-semibold text-primary">
                {fmt(accounts.reduce((s, acc) => {
                  const proj = projectBalance(acc);
                  return s + (proj[proj.length - 1]?.balance ?? 0);
                }, 0))}
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SuperSub({
  data,
  onChange,
}: {
  data: SuperPortfolio;
  onChange: (updated: SuperPortfolio) => void;
}) {
  const accounts = data.accounts ?? DEFAULT_SUPER.accounts;

  const handleAccountChange = (idx: number, updated: SuperAccount) => {
    const next = [...accounts];
    next[idx] = updated;
    onChange({ ...data, accounts: next });
  };

  return (
    <div className="space-y-4 p-4">
      <CombinedChart accounts={accounts} />
      {accounts.map((acc, idx) => (
        <AccountCard
          key={acc.id}
          account={acc}
          onChange={updated => handleAccountChange(idx, updated)}
        />
      ))}
    </div>
  );
}
