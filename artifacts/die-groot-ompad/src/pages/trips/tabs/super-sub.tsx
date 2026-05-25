import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, CalendarDays, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SuperAccount {
  id: string;
  name: string;
  fund: string;
  dateOfBirth: string;          // "YYYY-MM-DD"
  currentBalance: number;
  employerRate: number;
  personalRate: number;
  grossSalary: number;
  returnRate: number;
  forecastYears: number;
  contributionsEndYear: string; // "YYYY" — employer contributions stop here
  lifeInsurancePremium: number; // Annual premium deducted from super balance
  lumpSumWithdrawal: number;
  lumpSumDate: string;          // "YYYY"
  preservationAge: number;
}

export interface SuperPortfolio {
  accounts: SuperAccount[];
  pension?: Record<string, any>;
}

const ACCOUNT_DEFAULTS: Omit<SuperAccount, "id" | "name"> = {
  fund: "AustralianSuper",
  dateOfBirth: "",
  currentBalance: 0,
  employerRate: 11.5,
  personalRate: 0,
  grossSalary: 0,
  returnRate: 7,
  forecastYears: 20,
  contributionsEndYear: "",
  lifeInsurancePremium: 0,
  lumpSumWithdrawal: 0,
  lumpSumDate: "",
  preservationAge: 60,
};

export const DEFAULT_SUPER: SuperPortfolio = {
  accounts: [
    { id: "johan",  name: "Johan",  ...ACCOUNT_DEFAULTS },
    { id: "zandra", name: "Zandra", ...ACCOUNT_DEFAULTS },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

// Fixed reference date — "current balance" inputs are always as of this date.
// All projections start from here regardless of when the app is opened.
const REFERENCE_DATE = new Date(2026, 4, 26); // 26 May 2026
const CURRENT_YEAR = REFERENCE_DATE.getFullYear();
const CURRENT_DATE = REFERENCE_DATE;

function ageAt(dob: string, onDate?: Date): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const ref = onDate ?? CURRENT_DATE;
  const age = ref.getFullYear() - d.getFullYear() -
    (ref < new Date(ref.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return age;
}

function yearAtAge(dob: string, targetAge: number): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear() + targetAge;
}

interface ProjectRow {
  year: number;
  calYear: number;
  balance: number;
  contributions: number;
  growth: number;
  lifeInsTotal: number;
  withdrawal: boolean;
  inContribPhase: boolean;
  age: number | null;
}

function projectBalance(acc: SuperAccount): ProjectRow[] {
  const { currentBalance, employerRate, personalRate, grossSalary, returnRate, forecastYears,
    contributionsEndYear, lifeInsurancePremium, lumpSumDate, lumpSumWithdrawal } = acc;

  const annualContribBase = ((employerRate + personalRate) / 100) * grossSalary;
  const r = returnRate / 100;
  const contribEndYr = contributionsEndYear ? parseInt(contributionsEndYear, 10) : null;
  const wYear = lumpSumDate ? parseInt(lumpSumDate, 10) : null;
  const lifeIns = lifeInsurancePremium || 0;
  const currentAge = ageAt(acc.dateOfBirth);

  let balance = currentBalance;
  let totalContrib = 0;
  let totalLifeIns = 0;
  let wapplied = false;
  const rows: ProjectRow[] = [];

  for (let y = 0; y <= forecastYears; y++) {
    const calYear = CURRENT_YEAR + y;
    const inContribPhase = contribEndYr === null || calYear <= contribEndYr;

    // Lump sum withdrawal
    const isWithdrawalYear = wYear !== null && calYear === wYear && !wapplied;
    if (isWithdrawalYear) {
      balance = Math.max(0, balance - lumpSumWithdrawal);
      wapplied = true;
    }

    // Life insurance deduction (from balance)
    balance = Math.max(0, balance - lifeIns);
    totalLifeIns += lifeIns;

    rows.push({
      year: y, calYear,
      balance: Math.round(balance),
      contributions: Math.round(totalContrib),
      growth: Math.round(balance - currentBalance - totalContrib + totalLifeIns),
      lifeInsTotal: Math.round(totalLifeIns),
      withdrawal: isWithdrawalYear,
      inContribPhase,
      age: currentAge !== null ? currentAge + y : null,
    });

    const annualContrib = inContribPhase ? annualContribBase : 0;
    balance += annualContrib + balance * r;
    totalContrib += annualContrib;
  }
  return rows;
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function FieldRow({
  label, value, onChange, suffix = "", prefix = "",
  step = 0.1, min = 0, max, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; prefix?: string; step?: number; min?: number; max?: number; hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-foreground">{label}</span>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number" step={step} min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-28 border border-border rounded px-2 py-1 text-xs text-right bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {suffix && <span className="text-xs text-muted-foreground w-5">{suffix}</span>}
      </div>
    </div>
  );
}

// ── Age milestone badge ────────────────────────────────────────────────────────

function AgeBadge({ label, year, color }: { label: string; year: number | null; color: string }) {
  if (!year) return null;
  const yearsFrom = year - CURRENT_YEAR;
  return (
    <div className={cn("rounded px-2 py-1.5 text-center border", color)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm font-bold">{year}</p>
      <p className="text-[10px] opacity-60">{yearsFrom > 0 ? `in ${yearsFrom}yr` : yearsFrom === 0 ? "this year" : `${Math.abs(yearsFrom)}yr ago`}</p>
    </div>
  );
}

// ── Per-account card ──────────────────────────────────────────────────────────

function AccountCard({ account, onChange }: { account: SuperAccount; onChange: (u: SuperAccount) => void }) {
  const projection = projectBalance(account);
  const finalBalance = projection[projection.length - 1]?.balance ?? 0;
  const annualContrib = ((account.employerRate + account.personalRate) / 100) * account.grossSalary;

  const wYear = account.lumpSumDate ? parseInt(account.lumpSumDate, 10) : null;
  const wPoint = wYear !== null ? projection.find(p => p.calYear === wYear) : null;
  const yearsToWithdrawal = wYear !== null ? Math.max(0, wYear - CURRENT_YEAR) : null;
  const currentAge = ageAt(account.dateOfBirth);

  const preservYear  = yearAtAge(account.dateOfBirth, account.preservationAge || 60);
  const pension67Year = yearAtAge(account.dateOfBirth, 67);
  const contribEndYr = account.contributionsEndYear ? parseInt(account.contributionsEndYear, 10) : null;

  const set = (field: keyof SuperAccount) => (v: number | string) => onChange({ ...account, [field]: v });

  const COLORS = account.id === "johan"
    ? { stroke: "#1f6f5f", fill: "#1f6f5f22", contrib: "#d9b880" }
    : { stroke: "#60a5fa", fill: "#60a5fa22", contrib: "#a78bfa" };

  const yearOptions = Array.from({ length: 41 }, (_, i) => CURRENT_YEAR + i);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <input value={account.name} onChange={e => onChange({ ...account, name: e.target.value })}
              className="text-sm font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-32" />
            <input value={account.fund} onChange={e => onChange({ ...account, fund: e.target.value })}
              placeholder="Fund name"
              className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground w-44 focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
          {currentAge !== null && (
            <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/8 text-primary border border-primary/20">
              Age {currentAge}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">

        {/* Age milestone badges */}
        {account.dateOfBirth && (
          <div className="grid grid-cols-4 gap-2">
            <AgeBadge label={`Age ${account.preservationAge || 60} (Preservation)`} year={preservYear}
              color="bg-primary/5 border-primary/20 text-primary" />
            <AgeBadge label="Age 67 (Pension)" year={pension67Year}
              color="bg-[#d9b880]/15 border-[#d9b880]/40 text-[#b8943e]" />
            <AgeBadge label="Contribs End" year={contribEndYr}
              color="bg-orange-500/8 border-orange-500/20 text-orange-600" />
            <AgeBadge label="Lump Sum" year={wYear}
              color="bg-destructive/8 border-destructive/20 text-destructive" />
          </div>
        )}

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
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Identity &amp; Balance</p>
              <div className="flex items-center gap-3 py-1.5 border-b border-border/40">
                <span className="text-xs text-foreground flex-1">Date of Birth</span>
                <input type="date" value={account.dateOfBirth}
                  onChange={e => onChange({ ...account, dateOfBirth: e.target.value })}
                  className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              <FieldRow label="Current Balance"       value={account.currentBalance} onChange={set("currentBalance")} prefix="$" step={1000} />
              <FieldRow label="Annual Gross Salary"   value={account.grossSalary}    onChange={set("grossSalary")}    prefix="$" step={1000} />
              <FieldRow label="Employer SG Rate"      value={account.employerRate}   onChange={set("employerRate")}   suffix="%" max={30} />
              <FieldRow label="Personal Contribution" value={account.personalRate}   onChange={set("personalRate")}   suffix="%" max={30} />
              <FieldRow label="Expected Return"       value={account.returnRate}     onChange={set("returnRate")}     suffix="%" max={20} />
              <FieldRow label="Forecast Horizon"      value={account.forecastYears}  onChange={v => set("forecastYears")(Math.round(v))} suffix="yr" step={1} min={1} max={40} />
            </div>

            <div className="border-t border-border/40 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Employment &amp; Insurance</p>

              <div className="flex items-center gap-3 py-1.5 border-b border-border/40">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground">Contributions End Year</span>
                  <p className="text-[10px] text-muted-foreground">Employer SG stops contributing after this year</p>
                </div>
                <select value={account.contributionsEndYear}
                  onChange={e => onChange({ ...account, contributionsEndYear: e.target.value })}
                  className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="">— ongoing —</option>
                  {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>

              <FieldRow label="Life Insurance Premium"
                hint="Annual premium deducted from balance each year"
                value={account.lifeInsurancePremium || 0}
                onChange={v => onChange({ ...account, lifeInsurancePremium: v })}
                prefix="$" step={100} />
            </div>

            <div className="border-t border-border/40 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lump Sum Withdrawal</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-muted-foreground flex-1">Withdrawal Amount</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input type="number" step={10000} min={0} value={account.lumpSumWithdrawal}
                      onChange={e => onChange({ ...account, lumpSumWithdrawal: Number(e.target.value) })}
                      className="w-28 border border-border rounded px-2 py-1 text-xs text-right bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  </div>
                </div>
                <div className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-muted-foreground flex-1">Withdrawal Year</span>
                  <select value={account.lumpSumDate} onChange={e => onChange({ ...account, lumpSumDate: e.target.value })}
                    className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                    <option value="">— not planned —</option>
                    {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-muted-foreground flex-1">Preservation Age</span>
                  <div className="flex items-center gap-1">
                    <input type="number" step={1} min={55} max={70} value={account.preservationAge || 60}
                      onChange={e => onChange({ ...account, preservationAge: Number(e.target.value) })}
                      className="w-28 border border-border rounded px-2 py-1 text-xs text-right bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    <span className="text-xs text-muted-foreground w-4">yr</span>
                  </div>
                </div>
              </div>
              {account.lumpSumWithdrawal > 0 && wYear !== null && (
                <div className={cn("mt-2 text-xs rounded p-2 border",
                  yearsToWithdrawal === 0 ? "bg-destructive/8 border-destructive/30 text-destructive" : "bg-primary/5 border-primary/20 text-muted-foreground")}>
                  {yearsToWithdrawal === 0 ? (
                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Withdrawal in current year</span>
                  ) : (
                    <>Withdrawal of <strong className="text-foreground">{fmt(account.lumpSumWithdrawal)}</strong> in <strong className="text-foreground">{wYear}</strong>{" "}
                    ({yearsToWithdrawal}yr from now).{" "}
                    {wPoint ? <>Balance at withdrawal: <strong className="text-foreground">{fmt(wPoint.balance)}</strong></> : null}</>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Balance Projection — {account.forecastYears} Years @ {account.returnRate}% pa
              {account.lifeInsurancePremium > 0 ? ` — life ins. ${fmt(account.lifeInsurancePremium)}/yr` : ""}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={projection} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb44" />
                <XAxis dataKey="calYear" tick={{ fontSize: 10 }}
                  tickFormatter={v => `${v}`} interval={Math.ceil(account.forecastYears / 6)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={52} />
                <RechartsTooltip
                  formatter={(val: number, name: string) => [fmt(val), name]}
                  labelFormatter={v => `${v}`}
                  contentStyle={{ fontSize: 11 }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />

                {/* Milestone reference lines */}
                {preservYear !== null && preservYear >= CURRENT_YEAR && (
                  <ReferenceLine x={preservYear} stroke="#1f6f5f" strokeDasharray="5 3"
                    label={{ value: `Age ${account.preservationAge || 60} — Super`, fontSize: 8, fill: "#1f6f5f",
                      position: preservYear === CURRENT_YEAR ? "insideTopRight" : "insideTopLeft" }} />
                )}
                {pension67Year !== null && pension67Year >= CURRENT_YEAR && (
                  <ReferenceLine x={pension67Year} stroke="#d9b880" strokeDasharray="5 3"
                    label={{ value: "Age 67 — Pension", fontSize: 8, fill: "#b8943e",
                      position: pension67Year === CURRENT_YEAR ? "insideTopLeft" : "insideTopRight" }} />
                )}
                {contribEndYr !== null && contribEndYr >= CURRENT_YEAR && (
                  <ReferenceLine x={contribEndYr} stroke="#f97316" strokeDasharray="3 2"
                    label={{ value: "Contribs End", fontSize: 8, fill: "#f97316",
                      position: contribEndYr === CURRENT_YEAR ? "insideTopRight" : "insideTopLeft" }} />
                )}
                {wYear !== null && account.lumpSumWithdrawal > 0 && (
                  <ReferenceLine x={wYear} stroke="#ef4444" strokeDasharray="4 2"
                    label={{ value: "Withdrawal", fontSize: 8, fill: "#ef4444", position: "insideTopRight" }} />
                )}

                <Area type="monotone" dataKey="balance" name="Total Balance"
                  stroke={COLORS.stroke} fill={COLORS.fill} strokeWidth={2} />
                <Area type="monotone" dataKey="contributions" name="Contributions"
                  stroke={COLORS.contrib} fill={`${COLORS.contrib}22`} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>

            {/* Life insurance impact note */}
            {account.lifeInsurancePremium > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-[10px] text-orange-600 bg-orange-500/8 border border-orange-500/20 rounded p-1.5">
                <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Life insurance premium of {fmt(account.lifeInsurancePremium)}/yr deducted from balance. Total deducted over {account.forecastYears}yr: {fmt((account.lifeInsurancePremium || 0) * account.forecastYears)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Growth summary */}
        <div className="bg-primary/5 border border-primary/20 rounded p-2 flex gap-6 text-xs flex-wrap">
          <span className="text-muted-foreground">Investment growth:</span>
          <span className="font-semibold text-primary">{fmt(projection[projection.length - 1]?.growth ?? 0)}</span>
          <span className="text-muted-foreground">Contributions:</span>
          <span className="font-semibold text-foreground">{fmt(projection[projection.length - 1]?.contributions ?? 0)}</span>
          {account.lifeInsurancePremium > 0 && (
            <>
              <span className="text-muted-foreground">Life ins. cost:</span>
              <span className="font-semibold text-orange-600">{fmt(projection[projection.length - 1]?.lifeInsTotal ?? 0)}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Combined projection chart ─────────────────────────────────────────────────

function CombinedChart({ accounts }: { accounts: SuperAccount[] }) {
  const maxYears = Math.max(...accounts.map(a => a.forecastYears), 10);
  const data = Array.from({ length: maxYears + 1 }, (_, y) => {
    const calYear = CURRENT_YEAR + y;
    const row: Record<string, number> = { year: y, calYear };
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

  // Collect milestone reference lines across all accounts
  interface MilestoneLine {
    year: number;
    label: string;
    stroke: string;
    dash: string;
    labelPos: "insideTopLeft" | "insideTopRight";
  }
  const milestones: MilestoneLine[] = [];
  const seen = new Set<number>();
  for (const acc of accounts) {
    const preservYear = yearAtAge(acc.dateOfBirth, acc.preservationAge || 60);
    const pension67Year = yearAtAge(acc.dateOfBirth, 67);
    if (preservYear !== null && preservYear >= CURRENT_YEAR && !seen.has(preservYear)) {
      milestones.push({
        year: preservYear,
        label: `${acc.name} age ${acc.preservationAge || 60}`,
        stroke: "#1f6f5f",
        dash: "5 3",
        labelPos: preservYear === CURRENT_YEAR ? "insideTopRight" : "insideTopLeft",
      });
      seen.add(preservYear);
    }
    if (pension67Year !== null && pension67Year >= CURRENT_YEAR && !seen.has(pension67Year)) {
      milestones.push({
        year: pension67Year,
        label: `${acc.name} age 67`,
        stroke: "#d9b880",
        dash: "5 3",
        labelPos: pension67Year === CURRENT_YEAR ? "insideTopLeft" : "insideTopRight",
      });
      seen.add(pension67Year);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Combined Super Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb44" />
            <XAxis dataKey="calYear" tick={{ fontSize: 10 }} interval={Math.ceil(maxYears / 8)} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={58} />
            <RechartsTooltip formatter={(val: number, name: string) => [fmt(val), name]}
              labelFormatter={v => `${v}`} contentStyle={{ fontSize: 11 }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            {milestones.map(m => (
              <ReferenceLine key={`${m.label}-${m.year}`} x={m.year}
                stroke={m.stroke} strokeDasharray={m.dash}
                label={{ value: m.label, fontSize: 8, fill: m.stroke, position: m.labelPos }} />
            ))}
            {accounts.map((acc, idx) => (
              <Area key={acc.id} type="monotone" dataKey={acc.name}
                stroke={PALETTE[idx % PALETTE.length]} fill={`${PALETTE[idx % PALETTE.length]}22`} strokeWidth={2} />
            ))}
            <Area type="monotone" dataKey="Combined" name="Combined Total"
              stroke="#a78bfa" fill="#a78bfa22" strokeWidth={2} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-3 flex gap-6 text-xs text-muted-foreground flex-wrap">
          {accounts.map(acc => {
            const proj = projectBalance(acc);
            const end = proj[proj.length - 1];
            const age = ageAt(acc.dateOfBirth);
            return (
              <div key={acc.id} className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground">{acc.name}{age !== null ? ` (age ${age})` : ""}</span>
                <span>Balance in {acc.forecastYears}yr: <span className="font-semibold text-primary">{fmt(end?.balance ?? 0)}</span></span>
                {acc.lumpSumWithdrawal > 0 && acc.lumpSumDate && (
                  <span className="text-[10px]">Lump sum {acc.lumpSumDate}: {fmt(acc.lumpSumWithdrawal)}</span>
                )}
                {acc.lifeInsurancePremium > 0 && (
                  <span className="text-[10px] text-orange-600">Life ins. {fmt(acc.lifeInsurancePremium)}/yr</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SuperSub({ data, onChange }: { data: SuperPortfolio; onChange: (u: SuperPortfolio) => void }) {
  const accounts = (data.accounts ?? DEFAULT_SUPER.accounts).map(a => ({
    ...ACCOUNT_DEFAULTS,
    ...a,
  }));

  const handleAccountChange = (idx: number, updated: SuperAccount) => {
    const next = [...accounts];
    next[idx] = updated;
    onChange({ ...data, accounts: next });
  };

  return (
    <div className="space-y-4 p-4">
      <CombinedChart accounts={accounts} />
      {accounts.map((acc, idx) => (
        <AccountCard key={acc.id} account={acc} onChange={u => handleAccountChange(idx, u)} />
      ))}
    </div>
  );
}
