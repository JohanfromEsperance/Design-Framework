import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, AlertTriangle, Info, Receipt, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TaxProfile {
  id: string;
  name: string;
  grossSalary: number;
  superPension: number;
  centrelink: number;
  dividends: number;
  workDeductions: number;
  hecsDebt: boolean;
  privateMedicare: boolean;
}

export interface CgtEvent {
  id: string;
  assetName: string;
  purchaseDate: string;
  purchasePrice: number;
  saleDate: string;
  salePrice: number;
  qty: number;
}

export interface TaxWorksheet {
  profiles: TaxProfile[];
  cgtEvents: CgtEvent[];
  useProposedNegGearing: boolean;
  useProposedCGT: boolean;
}

export const DEFAULT_TAX: TaxWorksheet = {
  profiles: [
    { id: "johan",  name: "Johan",  grossSalary: 0, superPension: 0, centrelink: 0, dividends: 0, workDeductions: 0, hecsDebt: false, privateMedicare: true },
    { id: "zandra", name: "Zandra", grossSalary: 0, superPension: 0, centrelink: 0, dividends: 0, workDeductions: 0, hecsDebt: false, privateMedicare: true },
  ],
  cgtEvents: [],
  useProposedNegGearing: false,
  useProposedCGT: false,
};

// ── ATO 2024-25 Tax Engine ────────────────────────────────────────────────────

function incomeTax(income: number): number {
  if (income <= 0) return 0;
  if (income <= 18200)  return 0;
  if (income <= 45000)  return (income - 18200) * 0.19;
  if (income <= 120000) return 5092 + (income - 45000) * 0.325;
  if (income <= 180000) return 29467 + (income - 120000) * 0.37;
  return 51667 + (income - 180000) * 0.45;
}

function lito(income: number): number {
  if (income <= 37500) return 700;
  if (income <= 45000) return 700 - (income - 37500) * 0.05;
  if (income <= 66667) return Math.max(0, 325 - (income - 45000) * 0.015);
  return 0;
}

function medicareLevy(income: number): number {
  if (income <= 23365) return 0;
  if (income <= 29206) return (income - 23365) * 0.1;
  return income * 0.02;
}

function medicareLevySurcharge(income: number, hasPHI: boolean): number {
  if (hasPHI || income <= 93000) return 0;
  if (income <= 108000) return income * 0.01;
  if (income <= 144000) return income * 0.0125;
  return income * 0.015;
}

// HECS repayment (2024-25 rates)
function hecsRepayment(income: number): number {
  if (income < 54435)  return 0;
  if (income < 62739)  return income * 0.01;
  if (income < 66529)  return income * 0.02;
  if (income < 70640)  return income * 0.025;
  if (income < 74990)  return income * 0.03;
  if (income < 79490)  return income * 0.035;
  if (income < 84260)  return income * 0.04;
  if (income < 89320)  return income * 0.045;
  if (income < 94720)  return income * 0.05;
  if (income < 100450) return income * 0.055;
  if (income < 106510) return income * 0.06;
  if (income < 113000) return income * 0.065;
  if (income < 119780) return income * 0.07;
  if (income < 126970) return income * 0.075;
  if (income < 134590) return income * 0.08;
  if (income < 142680) return income * 0.085;
  if (income < 151320) return income * 0.09;
  if (income < 160400) return income * 0.095;
  return income * 0.10;
}

function bracketLabel(income: number): string {
  if (income <= 18200)  return "Nil (below tax-free threshold)";
  if (income <= 45000)  return "19% ($18,201–$45,000)";
  if (income <= 120000) return "32.5% ($45,001–$120,000)";
  if (income <= 180000) return "37% ($120,001–$180,000)";
  return "45% ($180,001+)";
}

interface TaxCalc {
  grossIncome: number;
  taxableIncome: number;
  incomeTax: number;
  litoOffset: number;
  medicare: number;
  medicareSurcharge: number;
  hecs: number;
  totalTax: number;
  effectiveRate: number;
  bracket: string;
  monthlyProvision: number;
  quarterlyPayg: number;
}

function calcTax(profile: TaxProfile, rentalLoss: number, useProposedNG: boolean): TaxCalc {
  const gross = profile.grossSalary + profile.superPension + profile.centrelink + profile.dividends;

  // Negative gearing: current = deduct full rental loss; proposed = 15% tax offset on loss (not deduction)
  const negGearingDeductible = useProposedNG ? 0 : Math.max(0, -rentalLoss);
  const taxable = Math.max(0, gross - negGearingDeductible - profile.workDeductions);

  const itax = incomeTax(taxable);
  const litoOff = lito(taxable);
  const ml = medicareLevy(taxable);
  const mls = medicareLevySurcharge(taxable, profile.privateMedicare);
  const hecs = profile.hecsDebt ? hecsRepayment(taxable) : 0;

  // Proposed negative gearing: 15% non-refundable offset on the rental loss
  const ngOffset = useProposedNG ? Math.min(Math.max(0, -rentalLoss) * 0.15, Math.max(0, itax - litoOff)) : 0;
  const netTax = Math.max(0, itax - litoOff - ngOffset) + ml + mls + hecs;

  return {
    grossIncome: gross,
    taxableIncome: taxable,
    incomeTax: itax,
    litoOffset: litoOff,
    medicare: ml,
    medicareSurcharge: mls,
    hecs,
    totalTax: netTax,
    effectiveRate: gross > 0 ? (netTax / gross) * 100 : 0,
    bracket: bracketLabel(taxable),
    monthlyProvision: Math.ceil(netTax / 12),
    quarterlyPayg: Math.ceil(netTax / 4),
  };
}

// CGT calculation
function calcCgt(event: CgtEvent, useProposed: boolean): { grossGain: number; discountedGain: number; discount: number; held12mo: boolean } {
  const grossGain = (event.salePrice - event.purchasePrice) * (event.qty || 1);
  const pDate = new Date(event.purchaseDate);
  const sDate = new Date(event.saleDate);
  const diffMs = sDate.getTime() - pDate.getTime();
  const held12mo = diffMs >= 365 * 24 * 3600 * 1000;
  const discountRate = held12mo ? (useProposed ? 0.33 : 0.5) : 0;
  const discount = grossGain > 0 ? grossGain * discountRate : 0;
  return { grossGain, discountedGain: Math.max(0, grossGain - discount), discount, held12mo };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

let _uid = 0;
const uid = () => `cgt${Date.now()}${_uid++}`;

// ── Field ─────────────────────────────────────────────────────────────────────

function FieldRow({ label, hint, value, onChange, prefix = "$", suffix = "", step = 1000, computed = false }: {
  label: string; hint?: string; value: number;
  onChange?: (v: number) => void;
  prefix?: string; suffix?: string; step?: number; computed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/20">
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        {computed ? (
          <span className="w-28 text-right tabular-nums font-semibold text-sm text-foreground">
            {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        ) : (
          <input type="number" step={step} min={0} value={value}
            onChange={e => onChange?.(parseFloat(e.target.value) || 0)}
            className="w-28 text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 tabular-nums text-sm" />
        )}
        {suffix && <span className="text-xs text-muted-foreground w-8">{suffix}</span>}
      </div>
    </div>
  );
}

function TaxRow({ label, value, indent = false, bold = false, highlight = false, negative = false }: {
  label: string; value: number; indent?: boolean; bold?: boolean; highlight?: boolean; negative?: boolean;
}) {
  const isNeg = negative || value < 0;
  return (
    <div className={cn("flex items-center justify-between px-2 py-1 rounded",
      highlight ? "bg-primary/8 border border-primary/20" : "hover:bg-muted/10",
      bold ? "font-bold" : "")}>
      <span className={cn("text-sm", indent ? "pl-4 text-muted-foreground" : "text-foreground")}>{label}</span>
      <span className={cn("tabular-nums text-sm font-medium",
        highlight ? "text-primary" : isNeg ? "text-destructive" : "text-foreground")}>
        {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
      </span>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-muted/20">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>}
      </div>
    </label>
  );
}

// ── Per-Person Tax Card ────────────────────────────────────────────────────────

function PersonCard({
  profile, onChange, rentalLoss, useProposedNG,
}: {
  profile: TaxProfile;
  onChange: (p: TaxProfile) => void;
  rentalLoss: number;
  useProposedNG: boolean;
}) {
  const c = calcTax(profile, rentalLoss, useProposedNG);
  const set = (f: keyof TaxProfile) => (v: number | boolean) => onChange({ ...profile, [f]: v });

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <input
            value={profile.name}
            onChange={e => onChange({ ...profile, name: e.target.value })}
            className="text-sm font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none"
          />
          <span className={cn("ml-auto text-xs px-2 py-0.5 rounded font-semibold",
            c.effectiveRate > 25 ? "bg-destructive/10 text-destructive" :
            c.effectiveRate > 15 ? "bg-[#d9b880]/20 text-[#b8943e]" :
            "bg-primary/10 text-primary")}>
            {pct(c.effectiveRate)} effective
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/40 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Taxable Income</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{fmt(c.taxableIncome)}</p>
          </div>
          <div className="bg-destructive/8 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Annual Tax</p>
            <p className="text-sm font-bold text-destructive mt-0.5">{fmt(c.totalTax)}</p>
          </div>
          <div className="bg-primary/8 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Monthly Provision</p>
            <p className="text-sm font-bold text-primary mt-0.5">{fmt(c.monthlyProvision)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Inputs */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Income Sources</p>
            <FieldRow label="Gross Salary / Wages" value={profile.grossSalary} onChange={v => set("grossSalary")(v)} />
            <FieldRow label="Super Pension / Drawdown" hint="Tax-free for age 60+ in taxed fund" value={profile.superPension} onChange={v => set("superPension")(v)} />
            <FieldRow label="Government / Centrelink" value={profile.centrelink} onChange={v => set("centrelink")(v)} />
            <FieldRow label="Share Dividends (grossed up)" hint="Include franking credits" value={profile.dividends} onChange={v => set("dividends")(v)} />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 mt-3">Deductions</p>
            <FieldRow label="Work-Related Expenses" value={profile.workDeductions} onChange={v => set("workDeductions")(v)} />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 mt-3">Options</p>
            <Toggle label="Private Health Insurance" hint="Avoids Medicare Levy Surcharge (>$93k income)" checked={profile.privateMedicare} onChange={v => set("privateMedicare")(v as boolean)} />
            <Toggle label="HECS / HELP Debt" hint="Compulsory repayment via ATO based on income" checked={profile.hecsDebt} onChange={v => set("hecsDebt")(v as boolean)} />
          </div>

          {/* Tax breakdown */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tax Calculation — ATO 2024-25</p>
            <div className="space-y-0.5">
              <TaxRow label="Gross Income"            value={c.grossIncome} />
              {rentalLoss < 0 && !useProposedNG && <TaxRow label="Neg. Gearing Deduction" value={rentalLoss} indent />}
              {profile.workDeductions > 0 && <TaxRow label="Work Deductions" value={-profile.workDeductions} indent />}
              <TaxRow label="Taxable Income" value={c.taxableIncome} bold />
              <div className="my-1 border-t border-border/30" />
              <TaxRow label={`Tax Bracket — ${c.bracket}`} value={c.incomeTax} indent negative />
              <TaxRow label="Low Income Tax Offset (LITO)" value={-c.litoOffset} indent />
              <TaxRow label="Medicare Levy (2%)" value={c.medicare} indent negative />
              {c.medicareSurcharge > 0 && <TaxRow label="Medicare Levy Surcharge" value={c.medicareSurcharge} indent negative />}
              {c.hecs > 0 && <TaxRow label="HECS/HELP Repayment" value={c.hecs} indent negative />}
              {rentalLoss < 0 && useProposedNG && <TaxRow label="Neg. Gearing Offset (15%)" value={-Math.min(Math.max(0, -rentalLoss) * 0.15, c.incomeTax)} indent />}
              <div className="my-1 border-t border-border/60" />
              <TaxRow label="Total Tax Payable" value={c.totalTax} bold highlight negative />
              <div className="my-1 border-t border-border/30" />
              <TaxRow label="Monthly Budget Provision"  value={c.monthlyProvision} indent />
              <TaxRow label="Quarterly PAYG Instalment" value={c.quarterlyPayg}    indent />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── CGT Panel ─────────────────────────────────────────────────────────────────

function CgtPanel({ events, onChange, useProposed }: {
  events: CgtEvent[];
  onChange: (e: CgtEvent[]) => void;
  useProposed: boolean;
}) {
  const addEvent = () => {
    if (events.length >= 10) return;
    onChange([...events, {
      id: uid(), assetName: "", purchaseDate: "", purchasePrice: 0,
      saleDate: "", salePrice: 0, qty: 1,
    }]);
  };
  const updateEvent = (idx: number, patch: Partial<CgtEvent>) => {
    onChange(events.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };
  const removeEvent = (idx: number) => onChange(events.filter((_, i) => i !== idx));

  const totalNetGain = events.reduce((s, ev) => {
    const r = calcCgt(ev, useProposed);
    return s + r.discountedGain;
  }, 0);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" /> Capital Gains Tax Events
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Net CGT Gain: <span className="font-semibold text-foreground">{fmt(totalNetGain)}</span>
            </span>
            <button onClick={addEvent} disabled={events.length >= 10}
              className="flex items-center gap-1 text-xs px-2 py-1 border border-border rounded hover:bg-muted disabled:opacity-40">
              <Plus className="h-3 w-3" /> Add Event
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No CGT events recorded. Click "Add Event" to enter an asset disposal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[780px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="text-left p-2 font-medium">Asset</th>
                  <th className="text-left p-2 font-medium">Purchase Date</th>
                  <th className="text-right p-2 font-medium">Purchase $</th>
                  <th className="text-left p-2 font-medium">Sale Date</th>
                  <th className="text-right p-2 font-medium">Sale $</th>
                  <th className="text-right p-2 font-medium">Qty / Units</th>
                  <th className="text-right p-2 font-medium">Gross Gain</th>
                  <th className="text-right p-2 font-medium">Discount</th>
                  <th className="text-right p-2 font-medium">Net Gain</th>
                  <th className="p-1 w-8" />
                </tr>
              </thead>
              <tbody>
                {events.map((ev, idx) => {
                  const r = calcCgt(ev, useProposed);
                  return (
                    <tr key={ev.id} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="p-1">
                        <input value={ev.assetName} onChange={e => updateEvent(idx, { assetName: e.target.value })}
                          placeholder="e.g. WBC shares"
                          className="w-full bg-transparent focus:outline-none border-b border-transparent focus:border-primary text-xs" />
                      </td>
                      <td className="p-1">
                        <input type="date" value={ev.purchaseDate} onChange={e => updateEvent(idx, { purchaseDate: e.target.value })}
                          className="w-full bg-transparent focus:outline-none text-xs border-b border-transparent focus:border-primary" />
                      </td>
                      <td className="p-1">
                        <input type="number" value={ev.purchasePrice} min={0} step={0.01}
                          onChange={e => updateEvent(idx, { purchasePrice: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right bg-transparent focus:outline-none border-b border-transparent focus:border-primary text-xs" />
                      </td>
                      <td className="p-1">
                        <input type="date" value={ev.saleDate} onChange={e => updateEvent(idx, { saleDate: e.target.value })}
                          className="w-full bg-transparent focus:outline-none text-xs border-b border-transparent focus:border-primary" />
                      </td>
                      <td className="p-1">
                        <input type="number" value={ev.salePrice} min={0} step={0.01}
                          onChange={e => updateEvent(idx, { salePrice: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right bg-transparent focus:outline-none border-b border-transparent focus:border-primary text-xs" />
                      </td>
                      <td className="p-1">
                        <input type="number" value={ev.qty} min={1} step={1}
                          onChange={e => updateEvent(idx, { qty: parseFloat(e.target.value) || 1 })}
                          className="w-16 text-right bg-transparent focus:outline-none border-b border-transparent focus:border-primary text-xs" />
                      </td>
                      <td className={cn("p-2 text-right font-medium tabular-nums", r.grossGain >= 0 ? "text-primary" : "text-destructive")}>
                        {fmt(r.grossGain)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground tabular-nums">
                        {r.held12mo ? `${useProposed ? 33 : 50}% disc.` : "No disc."}
                      </td>
                      <td className={cn("p-2 text-right font-bold tabular-nums", r.discountedGain >= 0 ? "text-primary" : "text-destructive")}>
                        {fmt(r.discountedGain)}
                      </td>
                      <td className="p-1 text-center">
                        <button onClick={() => removeEvent(idx)} className="text-muted-foreground/40 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-primary/5">
                  <td className="p-2 font-bold text-xs uppercase text-primary" colSpan={6}>Total Net CGT Gain</td>
                  <td className="p-2 text-right font-bold tabular-nums text-foreground">{fmt(events.reduce((s, ev) => s + calcCgt(ev, useProposed).grossGain, 0))}</td>
                  <td className="p-2 text-right font-bold tabular-nums text-muted-foreground">
                    {fmt(events.reduce((s, ev) => { const r = calcCgt(ev, useProposed); return s + r.discount; }, 0))}
                  </td>
                  <td className="p-2 text-right font-bold tabular-nums text-primary">{fmt(totalNetGain)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TaxSub({
  data,
  onChange,
  rentalConfig,
}: {
  data: TaxWorksheet;
  onChange: (updated: TaxWorksheet) => void;
  rentalConfig?: any;
}) {
  const profiles    = data.profiles ?? DEFAULT_TAX.profiles;
  const cgtEvents   = data.cgtEvents ?? [];
  const useProposedNG  = data.useProposedNegGearing ?? false;
  const useProposedCGT = data.useProposedCGT ?? false;

  // Calculate rental loss from config
  const rentalLoss = useMemo(() => {
    if (!rentalConfig?.weeklyRent) return 0;
    const cfg = rentalConfig;
    const grossRent     = cfg.weeklyRent * (52 - (cfg.vacancyWeeks || 0));
    const mgmtFees      = ((cfg.managementFeeRate || 0) / 100) * grossRent;
    const lettingFees   = (cfg.lettingFeeWeeks || 0) * cfg.weeklyRent;
    const interestExp   = ((cfg.loanBalance || 0) * (cfg.interestRate || 0)) / 100;
    const cashDed       = (cfg.councilRates||0) + (cfg.waterRates||0) + (cfg.landlordInsurance||0) +
                          (cfg.strataLevies||0) + (cfg.landTax||0) + mgmtFees + lettingFees +
                          (cfg.repairs||0) + (cfg.advertising||0) + (cfg.accountingFees||0) +
                          (cfg.legalFees||0) + (cfg.bankCharges||0) + interestExp;
    const div43 = cfg.div43Annual || 0;
    const div40 = cfg.div40Annual || 0;
    const netForTax = grossRent - cashDed - div43 - div40;
    return netForTax; // negative = loss (negative gearing)
  }, [rentalConfig]);

  const calcs = profiles.map(p => calcTax(p, rentalLoss, useProposedNG));
  const totalNetGainCgt = cgtEvents.reduce((s, ev) => s + calcCgt(ev, useProposedCGT).discountedGain, 0);

  const combinedAnnualTax = calcs.reduce((s, c) => s + c.totalTax, 0);
  const combinedMonthly   = calcs.reduce((s, c) => s + c.monthlyProvision, 0);

  const set = (patch: Partial<TaxWorksheet>) => onChange({ ...data, ...patch });

  const updateProfile = (idx: number, p: TaxProfile) => {
    const next = profiles.map((pr, i) => i === idx ? p : pr);
    set({ profiles: next });
  };

  // Chart data
  const chartData = calcs.map((c, i) => ({
    name: profiles[i]?.name ?? `Person ${i + 1}`,
    "Income Tax": Math.round(c.incomeTax),
    "Medicare": Math.round(c.medicare + c.medicareSurcharge),
    "HECS/HELP": Math.round(c.hecs),
    "LITO Credit": -Math.round(c.litoOffset),
  }));

  return (
    <div className="space-y-4">

      {/* Combined summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Combined Annual Tax",    value: fmt(combinedAnnualTax),  color: "text-destructive" },
          { label: "Monthly Provision",      value: fmt(combinedMonthly),    color: "text-foreground" },
          { label: "Quarterly PAYG",         value: fmt(Math.ceil(combinedAnnualTax / 4)), color: "text-foreground" },
          { label: "Net CGT Gain",           value: fmt(totalNetGainCgt),    color: totalNetGainCgt > 0 ? "text-primary" : "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <span className={cn("text-xl font-bold", color)}>{value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Law scenario toggles */}
      <Card className="border-[#d9b880]/40 bg-[#d9b880]/5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-[#b8943e]" /> Scenario Modelling — Tax Law Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Toggle
              label="Model Proposed Negative Gearing Limits"
              hint="Current law: rental losses fully deductible. Proposed (not enacted): 15% non-refundable tax offset capped to new properties. Toggle to model the impact if this were legislated."
              checked={useProposedNG}
              onChange={v => set({ useProposedNegGearing: v })}
            />
            <Toggle
              label="Model Proposed CGT Discount Reduction"
              hint="Current law: 50% CGT discount for assets held >12 months. Proposed (not enacted): 33% discount. Toggle to model impact on your capital gains events."
              checked={useProposedCGT}
              onChange={v => set({ useProposedCGT: v })}
            />
          </div>
          {(useProposedNG || useProposedCGT) && (
            <div className="mt-3 flex items-start gap-2 text-xs text-[#b8943e] bg-[#d9b880]/10 border border-[#d9b880]/40 rounded p-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Scenario mode active. These proposed changes are <strong>not current Australian law</strong>. Results shown are hypothetical planning estimates only.</span>
            </div>
          )}
          {rentalLoss < 0 && (
            <div className="mt-3 text-xs text-primary bg-primary/5 border border-primary/20 rounded p-2">
              Rental loss from Rental Property tab: <strong>{fmt(Math.abs(rentalLoss))}/yr</strong> ({useProposedNG ? "15% tax offset (proposed)" : "fully deductible — current law"})
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-person cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {profiles.map((p, i) => (
          <PersonCard key={p.id} profile={p} onChange={pr => updateProfile(i, pr)} rentalLoss={rentalLoss / profiles.length} useProposedNG={useProposedNG} />
        ))}
      </div>

      {/* CGT events */}
      <CgtPanel events={cgtEvents} onChange={e => set({ cgtEvents: e })} useProposed={useProposedCGT} />

      {/* Combined chart */}
      {calcs.some(c => c.totalTax > 0) && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Tax Composition — {useProposedNG || useProposedCGT ? "Proposed Scenario" : "Current Law 2024-25"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={52} />
                <RechartsTooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar dataKey="Income Tax" stackId="a" fill="#ef4444" />
                <Bar dataKey="Medicare"   stackId="a" fill="#f97316" />
                <Bar dataKey="HECS/HELP"  stackId="a" fill="#a78bfa" />
                <Bar dataKey="LITO Credit" stackId="a" fill="#1f6f5f" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Budget integration note */}
      <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded p-3">
        <strong className="text-foreground">Budget integration:</strong> Combined monthly tax provision of <strong className="text-foreground">{fmt(combinedMonthly)}/mo</strong> should be budgeted as a cash reserve. Add this to your Overview workbook under Fixed Bills or as a dedicated Tax Provision line if you are receiving gross income without PAYG withheld (e.g. business income, rent, or dividends).
      </div>
    </div>
  );
}
