import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Home, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Building2, Percent, Calculator,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RentalConfig {
  address: string;
  purchasePrice: number;
  currentValue: number;
  yearBuilt: number;
  constructionCost: number;
  weeklyRent: number;
  vacancyWeeks: number;
  councilRates: number;
  waterRates: number;
  landlordInsurance: number;
  strataLevies: number;
  landTax: number;
  managementFeeRate: number;
  lettingFeeWeeks: number;
  repairs: number;
  advertising: number;
  accountingFees: number;
  legalFees: number;
  bankCharges: number;
  loanBalance: number;
  interestRate: number;
  div43Annual: number;
  div40Annual: number;
  marginalTaxRate: number;
  otherIncome: number;
}

export const DEFAULT_RENTAL: RentalConfig = {
  address: "",
  purchasePrice: 850000,
  currentValue: 920000,
  yearBuilt: 2005,
  constructionCost: 320000,
  weeklyRent: 620,
  vacancyWeeks: 2,
  councilRates: 2800,
  waterRates: 1100,
  landlordInsurance: 1650,
  strataLevies: 0,
  landTax: 0,
  managementFeeRate: 8.5,
  lettingFeeWeeks: 1.5,
  repairs: 2400,
  advertising: 350,
  accountingFees: 550,
  legalFees: 0,
  bankCharges: 150,
  loanBalance: 480000,
  interestRate: 6.25,
  div43Annual: 8000,
  div40Annual: 3200,
  marginalTaxRate: 37,
  otherIncome: 0,
};

interface RentalSubProps {
  config: RentalConfig;
  onChange: (cfg: RentalConfig) => void;
}

// ── Australian income tax 2024-25 ─────────────────────────────────────────────

function incomeTax(income: number): number {
  if (income <= 0) return 0;
  if (income <= 18200) return 0;
  if (income <= 45000) return (income - 18200) * 0.19;
  if (income <= 120000) return 5092 + (income - 45000) * 0.325;
  if (income <= 180000) return 29467 + (income - 120000) * 0.37;
  return 51667 + (income - 180000) * 0.45;
}

function litoOffset(income: number): number {
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

function totalTaxPayable(income: number): number {
  if (income <= 0) return 0;
  return Math.max(0, incomeTax(income) - litoOffset(income) + medicareLevy(income));
}

function taxBracketLabel(income: number): string {
  if (income <= 18200) return "Nil (below tax-free threshold)";
  if (income <= 45000) return "19% ($18,201–$45,000)";
  if (income <= 120000) return "32.5% ($45,001–$120,000)";
  if (income <= 180000) return "37% ($120,001–$180,000)";
  return "45% ($180,001+)";
}

// ── Field components ──────────────────────────────────────────────────────────

function FieldRow({
  label, hint, value, onChange, prefix = "$", suffix = "",
  step = 100, min = 0, computed = false, highlight = false,
}: {
  label: string; hint?: string; value: number; onChange?: (v: number) => void;
  prefix?: string; suffix?: string; step?: number; min?: number;
  computed?: boolean; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-2 py-1.5 px-2 rounded",
      highlight ? "bg-primary/8 border border-primary/20" : "hover:bg-muted/20",
    )}>
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-foreground leading-tight">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        {computed ? (
          <span className={cn(
            "w-28 text-right tabular-nums font-semibold text-sm",
            highlight ? "text-primary" : "text-foreground"
          )}>
            {value < 0
              ? `(${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })})`
              : value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        ) : (
          <input
            type="number" min={min} step={step}
            value={value}
            onChange={e => onChange?.(parseFloat(e.target.value) || 0)}
            className="w-28 text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 tabular-nums text-sm"
          />
        )}
        {suffix && <span className="text-xs text-muted-foreground w-8">{suffix}</span>}
      </div>
    </div>
  );
}

function TextField({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/20">
      <span className="text-sm text-foreground w-36 shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 text-sm"
        placeholder="e.g. 14 Wanderer St, Fremantle WA 6160"
      />
    </div>
  );
}

function SectionHeader({ label, color = "#1f6f5f" }: { label: string; color?: string }) {
  return (
    <div className="px-2 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-border/40"
      style={{ color, borderLeftColor: color, borderLeftWidth: 3, paddingLeft: 10 }}>
      {label}
    </div>
  );
}

function SummaryRow({ label, value, sub, bold, negative, indent }: {
  label: string; value: number; sub?: string; bold?: boolean; negative?: boolean; indent?: boolean;
}) {
  return (
    <div className={cn("flex justify-between items-baseline py-1 px-2", indent && "pl-6", bold && "border-t border-border/40 mt-1 pt-2")}>
      <span className={cn("text-sm", bold ? "font-bold" : "text-muted-foreground", indent && "text-xs")}>
        {label}
        {sub && <span className="text-xs text-muted-foreground ml-1">({sub})</span>}
      </span>
      <span className={cn(
        "tabular-nums font-semibold text-sm",
        bold ? "text-foreground" : "",
        negative || value < 0 ? "text-red-500" : "text-foreground"
      )}>
        {value < 0
          ? `($${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })})`
          : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        }
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RentalSub({ config, onChange }: RentalSubProps) {
  const set = <K extends keyof RentalConfig>(key: K, val: RentalConfig[K]) =>
    onChange({ ...config, [key]: val });

  const calc = useMemo(() => {
    const grossAnnualRent = config.weeklyRent * (52 - config.vacancyWeeks);
    const vacancyLoss     = config.weeklyRent * config.vacancyWeeks;
    const managementFees  = (config.managementFeeRate / 100) * grossAnnualRent;
    const lettingFees     = config.lettingFeeWeeks * config.weeklyRent;
    const interestExpense = (config.loanBalance * config.interestRate) / 100;
    const div43           = config.div43Annual;
    const div40           = config.div40Annual;

    // Cash deductions (no depreciation)
    const cashDeductions =
      config.councilRates + config.waterRates + config.landlordInsurance +
      config.strataLevies + config.landTax + managementFees + lettingFees +
      config.repairs + config.advertising + config.accountingFees +
      config.legalFees + config.bankCharges + interestExpense;

    // Total deductions including depreciation
    const totalDeductions = cashDeductions + div43 + div40;

    const netRentalResult = grossAnnualRent - totalDeductions;
    const netRentalCash   = grossAnnualRent - cashDeductions; // true cash position
    const monthlyNetCash  = netRentalCash / 12;

    // Yield
    const grossYield = config.purchasePrice > 0 ? (grossAnnualRent / config.purchasePrice) * 100 : 0;
    const netYield   = config.purchasePrice > 0 ? (netRentalCash / config.purchasePrice) * 100 : 0;

    // Capital growth
    const capitalGrowth = config.currentValue - config.purchasePrice;

    // ATO tax calculation
    const taxableWithRental   = config.otherIncome + netRentalResult;
    const taxableWithoutRental = config.otherIncome;
    const taxWith    = totalTaxPayable(taxableWithRental);
    const taxWithout = totalTaxPayable(taxableWithoutRental);
    const taxImpact  = taxWith - taxWithout; // positive = extra tax, negative = tax saving
    const effectiveAfterTaxReturn = netRentalCash + (taxImpact < 0 ? Math.abs(taxImpact) : -taxImpact);

    return {
      grossAnnualRent, vacancyLoss, managementFees, lettingFees,
      interestExpense, div43, div40,
      cashDeductions, totalDeductions,
      netRentalResult, netRentalCash, monthlyNetCash,
      grossYield, netYield, capitalGrowth,
      taxableWithRental, taxableWithoutRental,
      taxWith, taxWithout, taxImpact, effectiveAfterTaxReturn,
    };
  }, [config]);

  const negGeared = calc.netRentalResult < 0;

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Rental Property — Income & Tax Analysis
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Australian ATO 2024-25 rules · Net cash flows back to Budget as Rental Net Income
          </p>
        </div>
        {/* Quick KPIs */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Gross Yield", value: `${calc.grossYield.toFixed(2)}%`, color: "#1f6f5f" },
            { label: "Net Cash Yield", value: `${calc.netYield.toFixed(2)}%`, color: "#d9b880" },
            { label: "Monthly Net Cash", value: `$${Math.round(calc.monthlyNetCash).toLocaleString()}`, color: calc.monthlyNetCash >= 0 ? "#1f6f5f" : "#ef4444" },
            { label: "Tax Impact (pa)", value: `${calc.taxImpact > 0 ? "+" : ""}$${Math.round(calc.taxImpact).toLocaleString()}`, color: calc.taxImpact > 0 ? "#ef4444" : "#1f6f5f" },
          ].map(k => (
            <div key={k.label} className="px-3 py-2 rounded-lg border border-border bg-card text-center min-w-[110px]">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</div>
              <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column: inputs ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Property Details */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0.5">
              <TextField label="Address" value={config.address} onChange={v => set("address", v)} />
              <div className="grid grid-cols-2 gap-1 mt-1">
                <FieldRow label="Purchase price" value={config.purchasePrice} onChange={v => set("purchasePrice", v)} step={5000} />
                <FieldRow label="Current market value" value={config.currentValue} onChange={v => set("currentValue", v)} step={5000} />
                <FieldRow label="Construction cost (Div 43)" hint="for depreciation" value={config.constructionCost} onChange={v => set("constructionCost", v)} step={1000} />
                <FieldRow label="Year built" value={config.yearBuilt} onChange={v => set("yearBuilt", v)} prefix="" step={1} min={1900} />
              </div>
              <div className="mt-2 px-2 py-1.5 text-xs text-muted-foreground border border-border/40 rounded bg-muted/20">
                Capital growth: {calc.capitalGrowth >= 0 ? "+" : ""}${calc.capitalGrowth.toLocaleString()} since purchase
                &nbsp;·&nbsp; Div 43 suggestion: ${Math.round(config.constructionCost * 0.025).toLocaleString()}/yr (2.5% of construction cost)
              </div>
            </CardContent>
          </Card>

          {/* Income */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Rental Income
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0.5">
              <FieldRow label="Weekly rent" value={config.weeklyRent} onChange={v => set("weeklyRent", v)} step={10} suffix="/wk" />
              <FieldRow label="Vacancy allowance" value={config.vacancyWeeks} onChange={v => set("vacancyWeeks", v)} prefix="" suffix="wks" step={0.5} />
              <FieldRow label="Gross annual rent" value={calc.grossAnnualRent} computed highlight
                hint={`${52 - config.vacancyWeeks} weeks × $${config.weeklyRent}/wk`} />
              <FieldRow label="Vacancy loss" value={-calc.vacancyLoss} computed prefix="$" />
            </CardContent>
          </Card>

          {/* Fixed Expenses */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Fixed Annual Expenses</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0.5">
              <SectionHeader label="Government & Statutory" />
              <FieldRow label="Council rates" value={config.councilRates} onChange={v => set("councilRates", v)} step={50} />
              <FieldRow label="Water rates" value={config.waterRates} onChange={v => set("waterRates", v)} step={50} />
              <FieldRow label="Land tax" value={config.landTax} onChange={v => set("landTax", v)} step={100} />
              <FieldRow label="Strata / body corporate levies" value={config.strataLevies} onChange={v => set("strataLevies", v)} step={100} />
              <SectionHeader label="Insurance" />
              <FieldRow label="Landlord insurance" value={config.landlordInsurance} onChange={v => set("landlordInsurance", v)} step={50} />
            </CardContent>
          </Card>

          {/* Agent & Variable Expenses */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Agent & Variable Expenses</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0.5">
              <SectionHeader label="Property Management" />
              <FieldRow label="Management fee rate" value={config.managementFeeRate} onChange={v => set("managementFeeRate", v)}
                prefix="" suffix="%" step={0.5} />
              <FieldRow label="Management fees (computed)" value={calc.managementFees} computed
                hint={`${config.managementFeeRate}% × $${calc.grossAnnualRent.toLocaleString()}`} />
              <FieldRow label="Letting fee" value={config.lettingFeeWeeks} onChange={v => set("lettingFeeWeeks", v)}
                prefix="" suffix="wks" step={0.5} />
              <FieldRow label="Letting fee (computed)" value={calc.lettingFees} computed
                hint={`${config.lettingFeeWeeks} wks × $${config.weeklyRent}/wk`} />
              <SectionHeader label="Other Variable" color="#d9b880" />
              <FieldRow label="Repairs & maintenance" value={config.repairs} onChange={v => set("repairs", v)} step={100} />
              <FieldRow label="Advertising / reletting" value={config.advertising} onChange={v => set("advertising", v)} step={50} />
              <FieldRow label="Accounting fees" value={config.accountingFees} onChange={v => set("accountingFees", v)} step={50} />
              <FieldRow label="Legal fees" value={config.legalFees} onChange={v => set("legalFees", v)} step={50} />
              <FieldRow label="Bank charges" value={config.bankCharges} onChange={v => set("bankCharges", v)} step={10} />
            </CardContent>
          </Card>

          {/* Financing */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Financing — Interest Expense</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0.5">
              <FieldRow label="Investment loan balance" value={config.loanBalance} onChange={v => set("loanBalance", v)} step={5000} />
              <FieldRow label="Interest rate" value={config.interestRate} onChange={v => set("interestRate", v)}
                prefix="" suffix="% pa" step={0.05} />
              <FieldRow label="Annual interest expense" value={calc.interestExpense} computed highlight
                hint={`$${config.loanBalance.toLocaleString()} × ${config.interestRate}%`} />
            </CardContent>
          </Card>

          {/* Depreciation */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" /> Depreciation (Non-Cash Deductions)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0.5">
              <FieldRow label="Div 43 — Building (2.5% pa)" hint="Reduces taxable income, not cash" value={config.div43Annual} onChange={v => set("div43Annual", v)} step={100} />
              <FieldRow label="Div 40 — Plant & Equipment" hint="From depreciation schedule" value={config.div40Annual} onChange={v => set("div40Annual", v)} step={100} />
              <div className="px-2 py-1.5 text-xs text-muted-foreground border border-border/40 rounded bg-muted/20 mt-1">
                Total depreciation ${(config.div43Annual + config.div40Annual).toLocaleString()}/yr · Tax saving at {config.marginalTaxRate}% = ${Math.round((config.div43Annual + config.div40Annual) * config.marginalTaxRate / 100).toLocaleString()}/yr
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Right column: summaries ── */}
        <div className="space-y-4">

          {/* P&L Summary */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" /> Annual P&L Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 space-y-0">
              <div className="text-xs font-bold uppercase tracking-wide text-primary px-2 py-1">Income</div>
              <SummaryRow label="Gross rent received" value={calc.grossAnnualRent} />
              <SummaryRow label="Less vacancy" value={-calc.vacancyLoss} />

              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-2 py-1 mt-2">Cash Deductions</div>
              <SummaryRow label="Council & water rates" value={-(config.councilRates + config.waterRates)} indent />
              <SummaryRow label="Insurance & strata" value={-(config.landlordInsurance + config.strataLevies)} indent />
              <SummaryRow label="Land tax" value={-config.landTax} indent />
              <SummaryRow label="Management & letting" value={-(calc.managementFees + calc.lettingFees)} indent />
              <SummaryRow label="Repairs & other" value={-(config.repairs + config.advertising + config.accountingFees + config.legalFees + config.bankCharges)} indent />
              <SummaryRow label="Loan interest" value={-calc.interestExpense} indent />
              <SummaryRow label="Net cash income" value={calc.netRentalCash} bold />

              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-2 py-1 mt-2">Tax Deductions Only</div>
              <SummaryRow label="Depreciation (Div 43 + 40)" value={-(config.div43Annual + config.div40Annual)} indent />
              <SummaryRow label="Net rental for tax" value={calc.netRentalResult} bold />

              <div className="mt-3 px-2 py-2 rounded border text-xs"
                style={{ borderColor: negGeared ? "#ef4444" : "#1f6f5f", backgroundColor: negGeared ? "#ef444412" : "#1f6f5f12" }}>
                {negGeared ? (
                  <span style={{ color: "#ef4444" }}>Negatively geared — ATO loss ${Math.abs(calc.netRentalResult).toLocaleString()}/yr reduces taxable income</span>
                ) : (
                  <span style={{ color: "#1f6f5f" }}>Positively geared — ATO profit ${calc.netRentalResult.toLocaleString()}/yr added to taxable income</span>
                )}
              </div>

              {/* Monthly sync */}
              <div className="mt-3 px-3 py-2 rounded-lg border border-primary/30 bg-primary/8">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Synced to Budget</div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Monthly Rental Net Income</span>
                  <span className="text-base font-bold tabular-nums" style={{ color: calc.monthlyNetCash >= 0 ? "#1f6f5f" : "#ef4444" }}>
                    ${Math.round(calc.monthlyNetCash).toLocaleString()}/mo
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cash basis only (depreciation excluded). Applied to all 60 months when you save.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tax Liability */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-amber-600" /> Estimated Tax Liability — ATO 2024-25
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-0.5">
              <FieldRow label="Other income (salary etc.)" value={config.otherIncome} onChange={v => set("otherIncome", v)} step={1000} />
              <FieldRow label="Marginal tax rate" value={config.marginalTaxRate} onChange={v => set("marginalTaxRate", v)}
                prefix="" suffix="%" step={1} />

              <div className="mt-3 space-y-0 border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 bg-muted/30 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Without Rental Property
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Taxable income</span>
                  <span className="tabular-nums font-semibold">${config.otherIncome.toLocaleString()}</span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Tax bracket</span>
                  <span className="tabular-nums">{taxBracketLabel(config.otherIncome)}</span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between border-t border-border/40">
                  <span className="text-muted-foreground">Income tax</span>
                  <span className="tabular-nums">${Math.round(incomeTax(config.otherIncome)).toLocaleString()}</span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Less LITO</span>
                  <span className="tabular-nums">-${Math.round(litoOffset(config.otherIncome)).toLocaleString()}</span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Medicare levy (2%)</span>
                  <span className="tabular-nums">${Math.round(medicareLevy(config.otherIncome)).toLocaleString()}</span>
                </div>
                <div className="px-3 py-2 text-sm flex justify-between font-bold border-t border-border/40 bg-muted/20">
                  <span>Total tax payable</span>
                  <span className="tabular-nums">${Math.round(calc.taxWithout).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-3 space-y-0 border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
                  style={{ backgroundColor: negGeared ? "#ef444418" : "#1f6f5f18", color: negGeared ? "#ef4444" : "#1f6f5f" }}>
                  With Rental Property {negGeared ? "(Negatively Geared)" : "(Positively Geared)"}
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Other income</span>
                  <span className="tabular-nums">${config.otherIncome.toLocaleString()}</span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Net rental for tax</span>
                  <span className={cn("tabular-nums", calc.netRentalResult < 0 ? "text-red-500" : "text-foreground")}>
                    {calc.netRentalResult < 0
                      ? `($${Math.abs(calc.netRentalResult).toLocaleString()})`
                      : `$${calc.netRentalResult.toLocaleString()}`
                    }
                  </span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between border-t border-border/40">
                  <span className="text-muted-foreground">Combined taxable income</span>
                  <span className="tabular-nums font-semibold">${Math.max(0, calc.taxableWithRental).toLocaleString()}</span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Income tax</span>
                  <span className="tabular-nums">${Math.round(incomeTax(Math.max(0, calc.taxableWithRental))).toLocaleString()}</span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Less LITO</span>
                  <span className="tabular-nums">-${Math.round(litoOffset(Math.max(0, calc.taxableWithRental))).toLocaleString()}</span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between">
                  <span className="text-muted-foreground">Medicare levy (2%)</span>
                  <span className="tabular-nums">${Math.round(medicareLevy(Math.max(0, calc.taxableWithRental))).toLocaleString()}</span>
                </div>
                <div className="px-3 py-2 text-sm flex justify-between font-bold border-t border-border/40"
                  style={{ backgroundColor: negGeared ? "#ef444418" : "#1f6f5f18" }}>
                  <span>Total tax payable</span>
                  <span className="tabular-nums">${Math.round(calc.taxWith).toLocaleString()}</span>
                </div>
              </div>

              {/* Net tax impact */}
              <div className="mt-3 p-3 rounded-lg border-2"
                style={{ borderColor: calc.taxImpact <= 0 ? "#1f6f5f" : "#ef4444" }}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold">
                    {calc.taxImpact <= 0 ? "Tax saving from negative gearing" : "Additional tax from rental profit"}
                  </span>
                  <span className="text-lg font-bold tabular-nums"
                    style={{ color: calc.taxImpact <= 0 ? "#1f6f5f" : "#ef4444" }}>
                    {calc.taxImpact <= 0
                      ? `$${Math.abs(Math.round(calc.taxImpact)).toLocaleString()}/yr`
                      : `$${Math.round(calc.taxImpact).toLocaleString()}/yr`
                    }
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {negGeared
                    ? `Negative gearing reduces your tax by $${Math.abs(Math.round(calc.taxImpact)).toLocaleString()} per year ($${Math.abs(Math.round(calc.taxImpact / 12)).toLocaleString()}/mo). True after-tax cash position: $${Math.round(calc.effectiveAfterTaxReturn).toLocaleString()}/yr.`
                    : `Rental profit adds $${Math.round(calc.taxImpact).toLocaleString()} to your annual tax bill ($${Math.round(calc.taxImpact / 12).toLocaleString()}/mo additional). Quarterly PAYG instalments may apply.`
                  }
                </p>
                {negGeared && (
                  <div className="mt-2 text-xs text-muted-foreground border-t border-border/40 pt-2">
                    Note: ATO may reclaim tax benefits upon property sale (CGT on 50% of gain if held 12+ months).
                  </div>
                )}
              </div>

              {/* ATO notice */}
              <div className="mt-3 px-3 py-2 rounded border border-amber-300/50 bg-amber-50/50 text-xs text-amber-800">
                Indicative only — based on ATO 2024-25 resident tax rates. Does not account for HECS/HELP,
                private health insurance rebate offsets, or other deductions. Consult a registered tax agent.
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
