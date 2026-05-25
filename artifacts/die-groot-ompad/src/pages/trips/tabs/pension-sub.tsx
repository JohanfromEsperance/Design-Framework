import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, DollarSign, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SuperPortfolio } from "./super-sub";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PensionWorksheet {
  isHomeowner: boolean;
  // Assets (total assessable — exclude principal residence if homeowner)
  financialAssets: number;       // Cash, term deposits, managed funds (subject to deeming)
  sharesValue: number;           // Listed shares (subject to deeming)
  superBalancePension: number;   // Super in pension/drawdown phase (subject to deeming)
  investmentPropertyValue: number; // Investment properties (not principal residence)
  otherAssets: number;           // Vehicles, caravan, contents, etc.
  // Income (combined annual, for income test alongside deemed income)
  employmentIncomeAnnual: number;  // Employment income (work bonus applies: $7,800/yr exemption)
  rentalIncomeAnnual: number;      // Net rental income from investment properties
  otherIncomeAnnual: number;       // Business, royalties, overseas pension, etc.
}

export const DEFAULT_PENSION: PensionWorksheet = {
  isHomeowner: true,
  financialAssets: 0,
  sharesValue: 0,
  superBalancePension: 0,
  investmentPropertyValue: 0,
  otherAssets: 0,
  employmentIncomeAnnual: 0,
  rentalIncomeAnnual: 0,
  otherIncomeAnnual: 0,
};

// ── ATO 2024-25 Age Pension Rules ─────────────────────────────────────────────
// Source: Services Australia. Rates indexed biannually (March & September).
// These are approximate 2024-25 rates — confirm with Services Australia for exact current rates.

const MAX_PENSION_FN = 1682.80;       // Couple combined, fortnightly (approx. 2024-25)
const MAX_PENSION_ANNUAL = MAX_PENSION_FN * 26; // = $43,752.80/yr

// Assets test thresholds (couple)
const ASSETS_FULL_HOMEOWNER    = 470_000;
const ASSETS_CUTOUT_HOMEOWNER  = 1_012_500;
const ASSETS_FULL_NON_HOMEOWNER    = 720_000;
const ASSETS_CUTOUT_NON_HOMEOWNER  = 1_262_500;
const ASSETS_TAPER_PER_1K_FN = 3.00;  // $3/fn per $1,000 over threshold
const ASSETS_TAPER_ANNUAL    = ASSETS_TAPER_PER_1K_FN * 26; // = $78/yr per $1,000

// Income test (couple combined)
const INCOME_FREE_AREA_FN   = 360;    // Fortnightly free area (couple combined)
const INCOME_FREE_AREA_ANNUAL = INCOME_FREE_AREA_FN * 26;
const INCOME_TAPER = 0.50;            // 50 cents per $1 combined income over free area

// Deeming rates (couple, 2024-25 approx.)
const DEEMING_LOWER_THRESHOLD = 62_600; // First $62,600 deemed at lower rate
const DEEMING_LOWER_RATE = 0.0025;
const DEEMING_UPPER_RATE = 0.0225;

// Work bonus: $300/fn per person earned income exemption = $7,800/yr combined cap
const WORK_BONUS_ANNUAL = 7_800;

// Pension eligibility age
const PENSION_AGE = 67;

// ── Calculation engine ────────────────────────────────────────────────────────

function calcDeemedIncome(totalFinancial: number): number {
  const lower = Math.min(totalFinancial, DEEMING_LOWER_THRESHOLD) * DEEMING_LOWER_RATE;
  const upper = Math.max(0, totalFinancial - DEEMING_LOWER_THRESHOLD) * DEEMING_UPPER_RATE;
  return lower + upper;
}

function calcAssetsTestPension(totalAssets: number, isHomeowner: boolean): number {
  const fullThreshold = isHomeowner ? ASSETS_FULL_HOMEOWNER : ASSETS_FULL_NON_HOMEOWNER;
  const cutout        = isHomeowner ? ASSETS_CUTOUT_HOMEOWNER : ASSETS_CUTOUT_NON_HOMEOWNER;
  if (totalAssets >= cutout) return 0;
  if (totalAssets <= fullThreshold) return MAX_PENSION_ANNUAL;
  const reduction = ((totalAssets - fullThreshold) / 1000) * ASSETS_TAPER_ANNUAL;
  return Math.max(0, MAX_PENSION_ANNUAL - reduction);
}

function calcIncomeTestPension(combinedIncome: number): number {
  if (combinedIncome <= INCOME_FREE_AREA_ANNUAL) return MAX_PENSION_ANNUAL;
  const reduction = (combinedIncome - INCOME_FREE_AREA_ANNUAL) * INCOME_TAPER;
  return Math.max(0, MAX_PENSION_ANNUAL - reduction);
}

interface PensionCalcResult {
  eligible: boolean;
  totalAssessableAssets: number;
  totalFinancialAssets: number;
  deemedIncome: number;
  workBonusApplied: number;
  totalAssessableIncome: number;
  assetsTestPension: number;
  incomeTestPension: number;
  pension: number;
  limitingTest: "assets" | "income" | "both";
  assetsFullThreshold: number;
  assetsCutout: number;
  pctToAssetsCutout: number;
  monthlyPension: number;
  fortnightlyPension: number;
}

function calcPension(ws: PensionWorksheet, eligible: boolean): PensionCalcResult {
  const totalFinancial = ws.financialAssets + ws.sharesValue + ws.superBalancePension;
  const totalAssets = totalFinancial + ws.investmentPropertyValue + ws.otherAssets;

  const deemedIncome  = calcDeemedIncome(totalFinancial);
  const workBonus     = Math.min(ws.employmentIncomeAnnual, WORK_BONUS_ANNUAL);
  const assessableEmployment = Math.max(0, ws.employmentIncomeAnnual - workBonus);
  const combinedIncome = assessableEmployment + ws.rentalIncomeAnnual + ws.otherIncomeAnnual + deemedIncome;

  const assetsTestPension = eligible ? calcAssetsTestPension(totalAssets, ws.isHomeowner) : 0;
  const incomeTestPension = eligible ? calcIncomeTestPension(combinedIncome) : 0;
  const pension = eligible ? Math.min(assetsTestPension, incomeTestPension) : 0;

  const fullThreshold = ws.isHomeowner ? ASSETS_FULL_HOMEOWNER : ASSETS_FULL_NON_HOMEOWNER;
  const cutout        = ws.isHomeowner ? ASSETS_CUTOUT_HOMEOWNER : ASSETS_CUTOUT_NON_HOMEOWNER;
  const pctToAssetsCutout = Math.min(100, (totalAssets / cutout) * 100);

  return {
    eligible,
    totalAssessableAssets: totalAssets,
    totalFinancialAssets: totalFinancial,
    deemedIncome,
    workBonusApplied: workBonus,
    totalAssessableIncome: combinedIncome,
    assetsTestPension,
    incomeTestPension,
    pension,
    limitingTest: assetsTestPension < incomeTestPension ? "assets" : incomeTestPension < assetsTestPension ? "income" : "both",
    assetsFullThreshold: fullThreshold,
    assetsCutout: cutout,
    pctToAssetsCutout,
    monthlyPension: Math.round(pension / 12),
    fortnightlyPension: Math.round(pension / 26),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

// Fixed reference date — age and projection calculations are anchored to 26 May 2026.
const CURRENT_DATE = new Date(2026, 4, 26);

function ageAt(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const age = CURRENT_DATE.getFullYear() - d.getFullYear() -
    (CURRENT_DATE < new Date(CURRENT_DATE.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return age;
}

function yearAtAge(dob: string, targetAge: number): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear() + targetAge;
}

function FieldRow({ label, hint, value, onChange, prefix = "$", step = 1000, suffix = "" }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void;
  prefix?: string; step?: number; suffix?: string;
}) {
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
    <div className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-foreground">{label}</span>
        {hint && <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>}
      </div>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number" step={step} min={0}
          value={local}
          placeholder="0"
          onChange={e => setLocal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={e => { setFocused(false); commit(e.target.value); }}
          onKeyDown={e => {
            if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
          }}
          className="w-28 border border-border rounded px-2 py-1 text-xs text-right bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {suffix && <span className="text-xs text-muted-foreground w-5">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultRow({ label, value, indent = false, bold = false, highlight = false }: {
  label: string; value: string; indent?: boolean; bold?: boolean; highlight?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between px-2 py-1 rounded",
      highlight ? "bg-primary/8 border border-primary/20" : "hover:bg-muted/10")}>
      <span className={cn("text-xs", indent ? "pl-4 text-muted-foreground" : "text-foreground", bold ? "font-semibold" : "")}>{label}</span>
      <span className={cn("text-xs font-medium tabular-nums", highlight ? "text-primary font-bold" : "text-foreground")}>{value}</span>
    </div>
  );
}

// ── Sensitivity chart ─────────────────────────────────────────────────────────

function SensitivityChart({ worksheet }: { worksheet: PensionWorksheet }) {
  const baseTotal = worksheet.financialAssets + worksheet.sharesValue + worksheet.superBalancePension +
    worksheet.investmentPropertyValue + worksheet.otherAssets;
  const data = Array.from({ length: 11 }, (_, i) => {
    const assets = Math.round(baseTotal * (0.5 + i * 0.1));
    const ws2 = { ...worksheet, financialAssets: Math.max(0, worksheet.financialAssets + (assets - baseTotal)) };
    // Adjust financialAssets to hit target total for this scenario
    const totalFin = Math.max(0, assets - worksheet.investmentPropertyValue - worksheet.otherAssets);
    const ws3 = { ...worksheet, financialAssets: totalFin, sharesValue: 0, superBalancePension: 0 };
    const r = calcPension(ws3, true);
    return {
      assets: `$${Math.round(assets / 1000)}k`,
      "Annual Pension": Math.round(r.pension),
    };
  });

  const fullT = worksheet.isHomeowner ? ASSETS_FULL_HOMEOWNER : ASSETS_FULL_NON_HOMEOWNER;
  const cutT  = worksheet.isHomeowner ? ASSETS_CUTOUT_HOMEOWNER : ASSETS_CUTOUT_NON_HOMEOWNER;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
        <XAxis dataKey="assets" tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={44} />
        <RechartsTooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 10 }} />
        <ReferenceLine y={MAX_PENSION_ANNUAL} stroke="#1f6f5f" strokeDasharray="4 2"
          label={{ value: "Max pension", fontSize: 8, fill: "#1f6f5f", position: "insideTopLeft" }} />
        <Bar dataKey="Annual Pension" fill="#d9b880" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PensionSub({
  data,
  onChange,
  superPortfolio,
}: {
  data: PensionWorksheet;
  onChange: (updated: PensionWorksheet) => void;
  superPortfolio?: SuperPortfolio;
}) {
  const ws = { ...DEFAULT_PENSION, ...data };
  const set = (f: keyof PensionWorksheet) => (v: number | boolean) => onChange({ ...ws, [f]: v });

  // Eligibility: check ages from super accounts
  const accounts = superPortfolio?.accounts ?? [];
  const personAges = accounts.map(a => ({ name: a.name, age: ageAt(a.dateOfBirth), dob: a.dateOfBirth }));
  const bothEligible = personAges.length >= 2
    ? personAges.every(p => p.age !== null && p.age >= PENSION_AGE)
    : false;
  const anyEligible = personAges.some(p => p.age !== null && p.age >= PENSION_AGE);

  const result = useMemo(() => calcPension(ws, true), [ws]);

  const eligibilityYears = personAges.map(p => ({
    name: p.name,
    eligYear: yearAtAge(p.dob, PENSION_AGE),
    age: p.age,
  }));

  const limitLabel = result.limitingTest === "assets" ? "Assets Test is limiting"
    : result.limitingTest === "income" ? "Income Test is limiting"
    : "Both tests give same result";

  return (
    <div className="space-y-4">

      {/* Header info */}
      <Card className="border-[#d9b880]/40 bg-[#d9b880]/5">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-[#b8943e] shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Australian Age Pension — Married Couple Calculator</strong><br />
              Based on 2024-25 Services Australia rates (approx.). Pension is indexed biannually. Rates subject to change — confirm with Services Australia or a financial adviser.
              Maximum couple pension: <strong className="text-foreground">{fmt(MAX_PENSION_ANNUAL)}/yr</strong> ({fmt(MAX_PENSION_FN)}/fortnight combined).
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {eligibilityYears.map(({ name, eligYear, age }) => (
          <Card key={name} className={cn("border-border/60",
            age !== null && age >= PENSION_AGE ? "border-primary/30 bg-primary/5" : "")}>
            <CardContent className="pt-3 pb-3 px-4 flex items-center gap-3">
              {age !== null && age >= PENSION_AGE
                ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                : <Clock className="h-5 w-5 text-muted-foreground shrink-0" />}
              <div>
                <p className="text-sm font-semibold text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {age !== null ? `Age ${age}` : "DOB not set"}{" "}
                  {age !== null && age >= PENSION_AGE
                    ? "— eligible"
                    : eligYear !== null ? `— eligible from ${eligYear}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Homeowner toggle */}
        <Card className="border-border/60">
          <CardContent className="pt-3 pb-3 px-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer w-full">
              <input type="checkbox" checked={ws.isHomeowner} onChange={e => set("isHomeowner")(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Home Owner</p>
                <p className="text-xs text-muted-foreground">Lower assets test thresholds apply</p>
              </div>
            </label>
          </CardContent>
        </Card>
      </div>

      {!bothEligible && (
        <div className="flex items-start gap-2 text-xs text-[#b8943e] bg-[#d9b880]/10 border border-[#d9b880]/40 rounded p-3">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {personAges.length < 2
              ? "Enter dates of birth in the Superannuation tab to see eligibility status."
              : anyEligible
                ? "One person meets the age requirement. Both must be age 67+ for a couple pension. Calculator shows scenario if both were eligible."
                : `Neither person has reached age 67. Calculator shows projected pension scenario. Earliest eligibility: ${Math.min(...eligibilityYears.filter(e => e.eligYear).map(e => e.eligYear!))}.`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Inputs */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Assessable Assets &amp; Income</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Financial Assets (subject to deeming)</p>
              <FieldRow label="Cash &amp; Term Deposits" hint="Include all bank accounts and TDs" value={ws.financialAssets} onChange={set("financialAssets")} />
              <FieldRow label="Listed Shares / ETFs" hint="Market value of share portfolio" value={ws.sharesValue} onChange={set("sharesValue")} />
              <FieldRow label="Super in Drawdown / Pension Phase" hint="Account-based pension balances for both people" value={ws.superBalancePension} onChange={set("superBalancePension")} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 mt-2">Non-Financial Assets</p>
              <FieldRow label="Investment Properties" hint="Market value, not principal residence" value={ws.investmentPropertyValue} onChange={set("investmentPropertyValue")} />
              <FieldRow label="Other Assets" hint="Vehicles, caravan, contents, business assets" value={ws.otherAssets} onChange={set("otherAssets")} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 mt-2">Other Assessable Income</p>
              <FieldRow label="Employment Income (combined annual)"
                hint={`Work Bonus exemption up to $${WORK_BONUS_ANNUAL.toLocaleString()}/yr for couple`}
                value={ws.employmentIncomeAnnual} onChange={set("employmentIncomeAnnual")} />
              <FieldRow label="Net Rental Income (annual)" value={ws.rentalIncomeAnnual} onChange={set("rentalIncomeAnnual")} />
              <FieldRow label="Other Income (business, overseas pension, etc.)" value={ws.otherIncomeAnnual} onChange={set("otherIncomeAnnual")} />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Pension Calculation — ATO 2024-25
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className={cn("rounded p-2 text-center border",
                  result.pension > 0 ? "bg-primary/8 border-primary/20" : "bg-muted/40 border-border/40")}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Annual Pension</p>
                  <p className={cn("text-lg font-bold mt-0.5", result.pension > 0 ? "text-primary" : "text-muted-foreground")}>
                    {fmt(result.pension)}
                  </p>
                </div>
                <div className="bg-muted/40 rounded p-2 text-center border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fortnightly</p>
                  <p className="text-lg font-bold mt-0.5 text-foreground">{fmt(result.fortnightlyPension)}</p>
                </div>
                <div className="bg-muted/40 rounded p-2 text-center border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Monthly</p>
                  <p className="text-lg font-bold mt-0.5 text-foreground">{fmt(result.monthlyPension)}</p>
                </div>
              </div>

              <div className={cn("text-xs px-2 py-1.5 rounded border font-medium",
                result.limitingTest === "assets" ? "bg-orange-500/8 border-orange-500/20 text-orange-600"
                : result.limitingTest === "income" ? "bg-blue-500/8 border-blue-500/20 text-blue-600"
                : "bg-muted border-border text-muted-foreground")}>
                {limitLabel}
              </div>

              {/* Detailed breakdown */}
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Assets Test</p>
                <ResultRow label="Total Assessable Assets"  value={fmt(result.totalAssessableAssets)} />
                <ResultRow label={`Full pension threshold (${ws.isHomeowner ? "homeowner" : "non-homeowner"} couple)`}
                  value={fmt(result.assetsFullThreshold)} indent />
                <ResultRow label="Assets test pension" value={fmt(result.assetsTestPension)} bold />

                <div className="my-2 border-t border-border/30" />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Income Test (with deeming)</p>
                <ResultRow label="Total financial assets (deemed)" value={fmt(result.totalFinancialAssets)} indent />
                <ResultRow label={`Deemed income (0.25% on first $${(DEEMING_LOWER_THRESHOLD / 1000).toFixed(0)}k, 2.25% above)`}
                  value={fmt(result.deemedIncome)} indent />
                {result.workBonusApplied > 0 && <ResultRow label="Work Bonus applied" value={`−${fmt(result.workBonusApplied)}`} indent />}
                <ResultRow label="Total assessable income" value={fmt(result.totalAssessableIncome)} />
                <ResultRow label="Income free area (couple)" value={fmt(INCOME_FREE_AREA_ANNUAL)} indent />
                <ResultRow label="Income test pension" value={fmt(result.incomeTestPension)} bold />

                <div className="my-2 border-t border-border/60" />
                <ResultRow label="Pension payable (lower of both tests)"
                  value={fmt(result.pension)} bold highlight />
                <ResultRow label="Maximum possible pension" value={fmt(MAX_PENSION_ANNUAL)} indent />
              </div>

              {/* Assets cutout proximity bar */}
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Assets vs cutout threshold</span>
                  <span className="font-semibold">{result.pctToAssetsCutout.toFixed(1)}% of {fmt(result.assetsCutout)} cutout</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, result.pctToAssetsCutout)}%`,
                      background: result.pctToAssetsCutout > 85 ? "linear-gradient(90deg, #f97316, #ef4444)"
                        : result.pctToAssetsCutout > 60 ? "linear-gradient(90deg, #d9b880, #f97316)"
                        : "linear-gradient(90deg, #1f6f5f, #d9b880)",
                    }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>{fmt(result.assetsFullThreshold)} full pension</span>
                  <span>{fmt(result.assetsCutout)} cutout</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sensitivity chart */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Pension Sensitivity — Asset Level</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-[10px] text-muted-foreground mb-2">
                Showing pension at varying total asset levels (income held constant). Current: {fmt(result.totalAssessableAssets)}.
              </p>
              <SensitivityChart worksheet={ws} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary note */}
      <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded p-3 leading-relaxed">
        <strong className="text-foreground">Budget integration:</strong>{" "}
        Add the fortnightly pension of <strong className="text-foreground">{fmt(result.fortnightlyPension)}</strong>{" "}
        (monthly: <strong className="text-foreground">{fmt(result.monthlyPension)}</strong>) to your income worksheet as "Government / Centrelink" income once eligible.
        Means testing applies at all times — report changes in assets and income to Services Australia within 14 days.
        {result.pension === 0 && result.totalAssessableAssets > 0 && " At current asset levels, no Age Pension would be payable."}
        {result.pension < MAX_PENSION_ANNUAL * 0.5 && result.pension > 0 && " Partial pension only — consider asset drawdown strategies with your adviser."}
      </div>
    </div>
  );
}
