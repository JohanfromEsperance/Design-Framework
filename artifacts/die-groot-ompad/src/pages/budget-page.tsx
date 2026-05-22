import {
  useGetGlobalBudget, useSaveGlobalBudget, getGetGlobalBudgetQueryKey,
} from "@workspace/api-client-react";
import { useSaveContext } from "@/lib/save-context";
import RentalSub, { DEFAULT_RENTAL, type RentalConfig } from "./trips/tabs/rental-sub";
import PlanningSub from "./trips/tabs/planning-sub";
import MembershipsTab from "./trips/tabs/memberships-tab";
import SuperSub, { DEFAULT_SUPER, type SuperPortfolio } from "./trips/tabs/super-sub";
import PensionSub, { DEFAULT_PENSION, type PensionWorksheet } from "./trips/tabs/pension-sub";
import SharesSub, { DEFAULT_SHARES, type SharesPortfolio } from "./trips/tabs/shares-sub";
import IncomeSub, { DEFAULT_INCOME, type IncomeWorksheet } from "./trips/tabs/income-sub";
import SavingsSub, { DEFAULT_SAVINGS, type SavingsWorksheet } from "./trips/tabs/savings-sub";
import TaxSub, { DEFAULT_TAX, type TaxWorksheet } from "./trips/tabs/tax-sub";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Download, Upload, TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, CheckCircle2, Lightbulb, TrendingUp as CpiIcon,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart, Bar, AreaChart, Area, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HelpButton, type HelpContent } from "@/components/help-panel";
import {
  HELP_BUDGET_OVERVIEW, HELP_BUDGET_INCOME, HELP_BUDGET_SAVINGS,
  HELP_BUDGET_TAX, HELP_BUDGET_RENTAL, HELP_BUDGET_PLANNING,
  HELP_BUDGET_SUPER, HELP_BUDGET_PENSION, HELP_BUDGET_SHARES,
  HELP_BUDGET_MEMBERSHIPS,
  HELP_SECTION_TRAVEL, HELP_SECTION_VEHICLE, HELP_SECTION_FIXED,
  HELP_SECTION_ANNUAL, HELP_SECTION_SUPER, HELP_SECTION_FAMILY,
  HELP_INCOME_SECTION,
} from "@/lib/help-content";

// ── Category definitions ──────────────────────────────────────────────────────

const TRAVEL_EXPENSES = [
  { key: "fuel",          label: "Fuel" },
  { key: "accommodation", label: "Parks & Accommodation" },
  { key: "food",          label: "Food & Groceries" },
  { key: "eatingOut",     label: "Eating Out / Restaurants" },
  { key: "entertainment", label: "Entertainment & Activities" },
  { key: "passesPermits", label: "Passes & Permits" },
  { key: "ferries",       label: "Ferries & Transport" },
  { key: "gasBottles",    label: "Gas Bottle Filling" },
];

const VEHICLE_COSTS = [
  { key: "vehicleService",  label: "Vehicle Service (UTE)" },
  { key: "caravanService",  label: "Caravan Service" },
  { key: "tyresVehicle",   label: "Tyres — Vehicle" },
  { key: "tyresCaravan",   label: "Tyres — Caravan" },
  { key: "repairs",        label: "Repairs & Parts" },
];

const FIXED_BILLS = [
  { key: "starlink",           label: "Starlink Internet" },
  { key: "johanMobile",        label: "Johan Mobile (Telstra)" },
  { key: "zandraMobile",       label: "Zandra Mobile (Optus)" },
  { key: "medical",            label: "BUPA Medical" },
  { key: "prescriptions",      label: "Prescriptions" },
  { key: "apartmentInsurance", label: "Apt Insurance (Allianz)" },
];

const ANNUAL_COSTS = [
  { key: "vehicleLicence",   label: "Vehicle Licence" },
  { key: "caravanLicence",   label: "Caravan Licence" },
  { key: "vehicleInsurance", label: "Vehicle Insurance" },
  { key: "caravanInsurance", label: "Caravan Insurance" },
  { key: "roadsideAssist",   label: "Roadside Assistance" },
];

const SUPER_SAVINGS = [
  { key: "superContribution", label: "Super SPA Contribution" },
  { key: "savingsZandra",     label: "Savings — Zandra (ANZ)" },
  { key: "savingsJohan",      label: "Savings — Johan (CommBank)" },
];

const FAMILY_COSTS = [
  { key: "grandkidsFlights", label: "Grandkids — Flights" },
  { key: "grandkidsHotels",  label: "Grandkids — Hotels" },
];

const RENTAL_EXPENSES = [
  { key: "rentalInterest",     label: "Rental — Mortgage Interest" },
  { key: "rentalRatesLevies",  label: "Rental — Rates, Council & Levies" },
  { key: "rentalWater",        label: "Rental — Water Charges" },
  { key: "rentalElectricity",  label: "Rental — Electricity" },
  { key: "rentalMgmtFees",     label: "Rental — Mgmt & Letting" },
  { key: "rentalOtherCosts",   label: "Rental — Ins, Repairs & Other" },
];

const INCOME_ITEMS = [
  { key: "rentalNet",          label: "Rental — Gross Rent" },
  { key: "salary",             label: "Salary / Employment" },
  { key: "businessIncome",     label: "Business Income" },
  { key: "dividends",          label: "Share Dividends" },
  { key: "cgt",                label: "Capital Gains" },
  { key: "centrelink",         label: "Centrelink / Govt" },
  { key: "superPensionIncome", label: "Super Pension" },
  { key: "sideIncome",         label: "Side Income" },
  { key: "refunds",            label: "Refunds / Reimbursements" },
  { key: "otherIncome1",       label: "Other Income 1" },
  { key: "otherIncome2",       label: "Other Income 2" },
  { key: "customIncome",       label: "Other (Income tab)" },
];

// Maps income sub-page source id → months key for dashboard sync
// NOTE: "rental" is intentionally excluded — the Rental sub-page owns rentalNet
const INCOME_SYNC_MAP: Record<string, string> = {
  salary:       "salary",
  business:     "businessIncome",
  dividends:    "dividends",
  cgt:          "cgt",
  centrelink:   "centrelink",
  superPension: "superPensionIncome",
  side:         "sideIncome",
  other1:       "otherIncome1",
  other2:       "otherIncome2",
};

// Compute monthly net cash from a rental config (mirrors the calc in rental-sub.tsx)
// ── Buffered grid cell — commits on blur/Enter, never resets while typing ──────

function BudgetCell({ value, onChange, step = 10, className }: {
  value: number; onChange: (v: number) => void; step?: number; className?: string;
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
    <input
      type="number" min={0} step={step}
      value={local}
      placeholder="0"
      onChange={e => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={e => { setFocused(false); commit(e.target.value); }}
      onKeyDown={e => {
        if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
      }}
      className={className}
    />
  );
}

function computeMonthlyRentalNet(rental: any): number {
  if (!rental) return 0;
  const cfg = { ...DEFAULT_RENTAL, ...rental } as RentalConfig;
  const grossRent     = cfg.weeklyRent * (52 - cfg.vacancyWeeks);
  const mgmtFees      = (cfg.managementFeeRate / 100) * grossRent;
  const lettingFees   = cfg.lettingFeeWeeks * cfg.weeklyRent;
  const interestExp   = (cfg.loanBalance * cfg.interestRate) / 100;
  const cashDeductions =
    cfg.councilRates + cfg.waterRates + (cfg.electricity ?? 0) + cfg.landlordInsurance +
    cfg.strataLevies + cfg.landTax + mgmtFees + lettingFees +
    cfg.repairs + cfg.advertising + cfg.accountingFees +
    cfg.legalFees + cfg.bankCharges + interestExp;
  return Math.round((grossRent - cashDeductions) / 12);
}

const EXPENSE_SECTIONS = [
  { title: "Travel & Road",             items: TRAVEL_EXPENSES,  color: "#1f6f5f" },
  { title: "Vehicle & Rig",             items: VEHICLE_COSTS,    color: "#d9b880" },
  { title: "Fixed Monthly Bills",       items: FIXED_BILLS,      color: "#60a5fa" },
  { title: "Annual — Rego & Insurance", items: ANNUAL_COSTS,     color: "#ef4444" },
  { title: "Super & Savings",           items: SUPER_SAVINGS,    color: "#a78bfa" },
  { title: "Grandkids & Family",        items: FAMILY_COSTS,     color: "#ec4899" },
  { title: "Rental Property Costs",     items: RENTAL_EXPENSES,  color: "#f97316" },
];

const ALL_EXPENSE_KEYS = [
  ...TRAVEL_EXPENSES, ...VEHICLE_COSTS, ...FIXED_BILLS, ...ANNUAL_COSTS,
  ...SUPER_SAVINGS, ...FAMILY_COSTS, ...RENTAL_EXPENSES,
].map(i => i.key);

const ALL_KEYS = [
  ...TRAVEL_EXPENSES, ...VEHICLE_COSTS, ...FIXED_BILLS,
  ...ANNUAL_COSTS, ...SUPER_SAVINGS, ...FAMILY_COSTS, ...RENTAL_EXPENSES, ...INCOME_ITEMS,
];

// ── Default 12-month pattern (Year 1) ────────────────────────────────────────

const BASE_BILLS = {
  starlink: 80, johanMobile: 60, zandraMobile: 60,
  medical: 500, prescriptions: 250, apartmentInsurance: 112,
  superContribution: 1161, savingsZandra: 0, savingsJohan: 0,
  rentalWater: 0, rentalElectricity: 0, gasBottles: 0,
  vehicleService: 0, caravanService: 0, tyresVehicle: 0, tyresCaravan: 0, repairs: 0,
  vehicleLicence: 0, caravanLicence: 0, vehicleInsurance: 0, caravanInsurance: 0, roadsideAssist: 0,
  rentalNet: 1611, salary: 0, businessIncome: 0, refunds: 0, otherIncome1: 0, otherIncome2: 0,
};

const Y1_MONTHS: Record<string, any>[] = [
  { ...BASE_BILLS, openingBalance: 47607, fuel: 420, accommodation: 1550, food: 1550, eatingOut: 150, entertainment: 100, passesPermits: 0,   ferries: 0 },
  { ...BASE_BILLS, fuel: 480,  accommodation: 1500, food: 1500, eatingOut: 150, entertainment: 100, passesPermits: 0,   ferries: 0 },
  { ...BASE_BILLS, fuel: 420,  accommodation: 1550, food: 1550, eatingOut: 150, entertainment: 100, passesPermits: 50,  ferries: 0 },
  { ...BASE_BILLS, fuel: 420,  accommodation: 1500, food: 1500, eatingOut: 100, entertainment: 100, passesPermits: 0,   ferries: 0 },
  { ...BASE_BILLS, fuel: 360,  accommodation: 1550, food: 1550, eatingOut: 150, entertainment: 150, passesPermits: 0,   ferries: 0 },
  { ...BASE_BILLS, fuel: 420,  accommodation: 1550, food: 1550, eatingOut: 100, entertainment: 100, passesPermits: 0,   ferries: 0 },
  { ...BASE_BILLS, fuel: 540,  accommodation: 1500, food: 1500, eatingOut: 200, entertainment: 200, passesPermits: 100, ferries: 0 },
  { ...BASE_BILLS, fuel: 1800, accommodation: 1550, food: 1550, eatingOut: 200, entertainment: 150, passesPermits: 0,   ferries: 4500 },
  { ...BASE_BILLS, fuel: 600,  accommodation: 1500, food: 1500, eatingOut: 200, entertainment: 200, passesPermits: 0,   ferries: 0,
    vehicleLicence: 1200, caravanLicence: 300, vehicleInsurance: 1850, caravanInsurance: 1350, roadsideAssist: 400 },
  { ...BASE_BILLS, fuel: 180,  accommodation: 1550, food: 1550, eatingOut: 300, entertainment: 200, passesPermits: 0,   ferries: 0,
    vehicleService: 1500, tyresVehicle: 1800, tyresCaravan: 600 },
  { ...BASE_BILLS, fuel: 180,  accommodation: 1550, food: 1550, eatingOut: 200, entertainment: 150, passesPermits: 0,   ferries: 0 },
  { ...BASE_BILLS, fuel: 180,  accommodation: 1450, food: 1450, eatingOut: 150, entertainment: 100, passesPermits: 0,   ferries: 0 },
];

// ── Build 60-month defaults (5 years, 2.5% CPI applied year-over-year) ───────

function build60MonthDefaults(): Record<string, Record<string, any>> {
  const m: Record<string, Record<string, any>> = {};
  for (let i = 0; i < 60; i++) {
    const year = Math.floor(i / 12);
    const monthInYear = i % 12;
    const cpi = Math.pow(1.025, year);
    const base = Y1_MONTHS[monthInYear];
    const month: Record<string, any> = {};
    for (const key of Object.keys(base)) {
      if (key === "openingBalance") {
        month[key] = i === 0 ? (base[key] || 0) : 0;
      } else if (typeof base[key] === "number" && base[key] > 0) {
        month[key] = Math.round(Number(base[key]) * cpi);
      } else {
        month[key] = base[key];
      }
    }
    m[i.toString()] = month;
  }
  return m;
}

function sectionTotal(monthData: Record<string, any>, items: { key: string }[]): number {
  return items.reduce((s, i) => s + (Number(monthData?.[i.key]) || 0), 0);
}

// ── Budget start date (fixed reference point for month labels) ────────────────
const BUDGET_BASE = new Date(2026, 2, 1); // March 2026

// ── Component ─────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const { data: budget, isLoading } = useGetGlobalBudget();
  const saveGlobalBudget = useSaveGlobalBudget();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { register, unregister } = useSaveContext();

  // Read insurance policy names from vehicleDocs for grid hints
  const vehicleDocs = (budget?.vehicleDocs ?? {}) as Record<string, string>;
  const getRowHint = (key: string): string | null => {
    if (key === "vehicleInsurance") {
      const p = vehicleDocs.insuranceProvider;
      const n = vehicleDocs.insurancePolicy;
      return p ? `${p}${n ? ` · ${n}` : ""}` : null;
    }
    if (key === "caravanInsurance") {
      const p = vehicleDocs.caravanInsuranceProvider;
      const n = vehicleDocs.caravanInsurancePolicy;
      return p ? `${p}${n ? ` · ${n}` : ""}` : null;
    }
    if (key === "landlordInsurance") {
      const r = (budget?.rental ?? {}) as Record<string, string>;
      return r.landlordInsurancePolicy ? `Policy: ${r.landlordInsurancePolicy}` : null;
    }
    return null;
  };

  const [budgetData, setBudgetData] = useState<any>(null);
  const budgetSynced = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const importRef = useRef<HTMLInputElement>(null);

  const [viewYear, setViewYear] = useState(0);
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState(0);
  const [customTo, setCustomTo] = useState(11);

  const [subPage, setSubPage] = useState<"overview" | "rental" | "planning" | "super" | "pension" | "shares" | "income" | "savings" | "tax" | "memberships">("overview");

  const [cpiDialogOpen, setCpiDialogOpen] = useState(false);
  const [cpiRate, setCpiRate] = useState(2.5);
  const [cpiFromMonth, setCpiFromMonth] = useState(0);

  const viewStart = customMode ? customFrom : viewYear * 12;
  const viewEnd   = customMode ? Math.max(customFrom, customTo) : viewYear * 12 + 11;
  const visibleCount = viewEnd - viewStart + 1;

  // ── Init / expand DB months to 60 ────────────────────────────────────────

  useEffect(() => {
    if (isLoading) return;
    // Once real server data has been loaded once, never overwrite local state
    // from a background refetch — local edits and imports must not be clobbered.
    if (budgetSynced.current) return;

    // ── Sub-page injection helpers ───────────────────────────────────────────

    // Rental sub-page is authoritative for rentalNet and all rental expense rows.
    // Mirrors the calculation in handleRentalChange so on-load values match user-entered values.
    const withRentalNet = (months: Record<string, any>, rental: any): Record<string, any> => {
      if (!rental || Object.keys(rental).length === 0) return months;
      const cfg = { ...DEFAULT_RENTAL, ...rental } as RentalConfig;
      const grossRent   = cfg.weeklyRent * (52 - cfg.vacancyWeeks);
      const mgmtFees    = (cfg.managementFeeRate / 100) * grossRent;
      const lettingFees = cfg.lettingFeeWeeks * cfg.weeklyRent;
      const interestExp = (cfg.loanBalance * cfg.interestRate) / 100;
      const monthlyGrossRent   = Math.round(grossRent / 12);
      if (monthlyGrossRent === 0) return months;
      const monthlyInterest    = Math.round(interestExp / 12);
      const monthlyRates       = Math.round((cfg.councilRates + cfg.strataLevies + cfg.landTax) / 12);
      const monthlyWater       = Math.round(cfg.waterRates / 12);
      const monthlyElectricity = Math.round((cfg.electricity ?? 0) / 12);
      const monthlyMgmt        = Math.round((mgmtFees + lettingFees) / 12);
      const monthlyOther       = Math.round((cfg.landlordInsurance + cfg.repairs + cfg.advertising + cfg.accountingFees + cfg.legalFees + cfg.bankCharges) / 12);
      const out: Record<string, any> = {};
      for (let i = 0; i < 60; i++) {
        out[i.toString()] = {
          ...(months[i.toString()] ?? {}),
          rentalNet:         monthlyGrossRent,
          rentalInterest:    monthlyInterest,
          rentalRatesLevies: monthlyRates,
          rentalWater:       monthlyWater,
          rentalElectricity: monthlyElectricity,
          rentalMgmtFees:    monthlyMgmt,
          rentalOtherCosts:  monthlyOther,
        };
      }
      return out;
    };

    // Super sub-page is authoritative for superContribution.
    // Sum personalRate * grossSalary / 12 across all accounts.
    const withSuperContribution = (months: Record<string, any>, superData: any): Record<string, any> => {
      const accounts = (superData?.accounts ?? []) as { personalRate: number; grossSalary: number }[];
      const monthly = accounts.reduce((sum, acc) => {
        if (!acc.personalRate || !acc.grossSalary) return sum;
        return sum + Math.round((acc.personalRate / 100) * acc.grossSalary / 12);
      }, 0);
      if (monthly === 0) return months;
      const out: Record<string, any> = {};
      for (let i = 0; i < 60; i++) {
        out[i.toString()] = { ...(months[i.toString()] ?? {}), superContribution: monthly };
      }
      return out;
    };

    // Income sub-page is authoritative for salary/dividends/etc.
    // Re-sync on load so the grid always reflects saved income worksheet data.
    const withIncomeSync = (months: Record<string, any>, incomeData: any): Record<string, any> => {
      const sources = (incomeData?.sources ?? []) as { id: string; months?: Record<string, { forecast: number; actual: number }> }[];
      if (sources.length === 0) return months;
      const out = { ...months };
      for (let i = 0; i < 60; i++) {
        const m = { ...(out[i.toString()] ?? {}) };
        let customIncome = 0;
        for (const src of sources) {
          const entry = src.months?.[i.toString()] ?? { forecast: 0, actual: 0 };
          const v = entry.actual > 0 ? entry.actual : entry.forecast;
          const key = INCOME_SYNC_MAP[src.id as keyof typeof INCOME_SYNC_MAP];
          if (key) {
            m[key] = v;
          } else if (src.id !== "rental") {
            customIncome += v;
          }
        }
        if (customIncome > 0) m.customIncome = customIncome;
        out[i.toString()] = m;
      }
      return out;
    };

    // ── Merge DB data with defaults ───────────────────────────────────────────
    // Always start from build60MonthDefaults() so every key has a sensible
    // baseline, then overlay saved DB values on top. This means:
    //   - New fields added to the template automatically appear with their default.
    //   - User-set values (including explicit 0s) always win.

    // Savings sub-page is authoritative for openingBalance; monthly deposits are
    // entered directly in the grid (savingsZandra / savingsJohan). On first load,
    // if those grid cells are still at their default 0 but the savings sub-page
    // has deposit values, sync them into savingsZandra so they become visible.
    const withSavingsSync = (months: Record<string, any>, savingsData: any): Record<string, any> => {
      if (!savingsData?.months) return months;
      const out: Record<string, any> = {};
      for (let i = 0; i < 60; i++) {
        const existing = months[i.toString()] ?? {};
        const deposit = Number(savingsData.months?.[i.toString()]?.deposit ?? 0);
        // Only back-fill if the grid cell is still at its default zero
        if (deposit > 0 && !existing.savingsZandra) {
          out[i.toString()] = { ...existing, savingsZandra: deposit };
        } else {
          out[i.toString()] = existing;
        }
      }
      return out;
    };

    const applySubPageSyncs = (months: Record<string, any>): Record<string, any> => {
      let m = months;
      m = withRentalNet(m, budget?.rental);
      m = withSuperContribution(m, budget?.super);
      m = withIncomeSync(m, budget?.income);
      m = withSavingsSync(m, budget?.savings);
      return m;
    };

    if (budget && budget.months && Object.keys(budget.months).length > 0) {
      const existing = budget.months as Record<string, any>;
      const defaults = build60MonthDefaults();
      const months: Record<string, any> = {};
      for (let i = 0; i < 60; i++) {
        const dbMonth = existing[i.toString()] ?? existing[i] ?? {};
        // Defaults supply the base; DB values take precedence including explicit 0s.
        months[i.toString()] = { ...defaults[i.toString()], ...dbMonth };
      }
      setBudgetData({ ...budget, months: applySubPageSyncs(months) });
      budgetSynced.current = true;
    } else {
      // No server data yet (new user / auth pending) — show defaults.
      // Don't mark synced so we pick up real data when auth resolves.
      setBudgetData({
        year: new Date().getFullYear().toString(),
        months: applySubPageSyncs(build60MonthDefaults()),
      });
    }
  }, [budget, isLoading]);

  // ── Month label ─────────────────────────────────────────────────────────

  const monthLabel = (i: number, fmt: "short" | "medium" | "long" = "medium"): string => {
    const d = new Date(BUDGET_BASE.getFullYear(), BUDGET_BASE.getMonth() + i, 1);
    if (fmt === "short") return d.toLocaleDateString("en-AU", { month: "short" });
    if (fmt === "long")  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
    return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
  };

  // ── Auto-save ────────────────────────────────────────────────────────────

  // Always carry ALL budget fields so no column clobbers another
  const buildPayload = (data: any) => ({
    year: data.year,
    months: data.months,
    rental: data.rental,
    super: data.super,
    shares: data.shares,
    income: data.income,
    tax: data.tax,
    vehicleProfile: data.vehicleProfile,
    vehicleDocs: data.vehicleDocs,
    checklists: data.checklists,
    savings: data.savings,
  });

  const triggerSave = (data: any) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveGlobalBudget.mutate(
        { data: buildPayload(data) },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetGlobalBudgetQueryKey() }) }
      );
      saveTimerRef.current = undefined;
    }, 600);
  };

  const handleCellChange = (monthIndex: number, category: string, value: number) => {
    setBudgetData((prev: any) => {
      const newData = { ...prev, months: { ...prev.months } };
      newData.months[monthIndex] = { ...newData.months[monthIndex], [category]: value };
      triggerSave(newData);
      return newData;
    });
  };

  const handleManualSaveRef = useRef<() => void>(() => {});

  const handleManualSave = () => {
    if (!budgetData) return;
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = undefined; }
    saveGlobalBudget.mutate(
      { data: buildPayload(budgetData) },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGlobalBudgetQueryKey() });
          toast({ title: "Budget saved" });
        },
      }
    );
  };

  // Keep ref fresh so the registered save function always calls latest handleManualSave
  handleManualSaveRef.current = handleManualSave;

  // Register with global SaveContext (Hard Save button) — flush on unmount too
  useEffect(() => {
    register(() => handleManualSaveRef.current());
    return () => {
      // Flush any pending debounced save before unmount
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
        handleManualSaveRef.current();
      }
      unregister();
    };
  }, [register, unregister]);

  // ── Super change — syncs SPA contribution to months grid ─────────────────

  const handleSuperChange = (superData: SuperPortfolio) => {
    setBudgetData((prev: any) => {
      // Compute total monthly SPA contribution across all accounts.
      const monthly = (superData.accounts ?? []).reduce((sum, acc: any) => {
        if (!acc.personalRate || !acc.grossSalary) return sum;
        return sum + Math.round((acc.personalRate / 100) * acc.grossSalary / 12);
      }, 0);
      const newMonths: Record<string, any> = { ...prev.months };
      if (monthly > 0) {
        for (let i = 0; i < 60; i++) {
          newMonths[i.toString()] = { ...(newMonths[i.toString()] ?? {}), superContribution: monthly };
        }
      }
      const newData = { ...prev, super: superData, months: newMonths };
      triggerSave(newData);
      return newData;
    });
  };

  // ── Shares change ────────────────────────────────────────────────────────

  // ── Pension worksheet change ──────────────────────────────────────────────

  const handlePensionChange = (pensionData: PensionWorksheet) => {
    setBudgetData((prev: any) => {
      const newSuper = { ...(prev.super ?? {}), pension: pensionData };
      const newData = { ...prev, super: newSuper };
      triggerSave(newData);
      return newData;
    });
  };

  // ── Shares change ────────────────────────────────────────────────────────

  const handleSharesChange = (sharesData: SharesPortfolio) => {
    setBudgetData((prev: any) => {
      const newData = { ...prev, shares: sharesData };
      triggerSave(newData);
      return newData;
    });
  };

  // ── Income worksheet change — syncs to months so dashboard reflects it ───

  const handleIncomeChange = (incomeData: IncomeWorksheet) => {
    setBudgetData((prev: any) => {
      const newMonths: Record<string, any> = { ...prev.months };
      const sources = incomeData.sources ?? [];
      for (let i = 0; i < 60; i++) {
        const m = { ...(newMonths[i.toString()] ?? {}) };
        let customIncome = 0;
        for (const src of sources) {
          const entry = src.months?.[i.toString()] ?? { forecast: 0, actual: 0 };
          const v = (entry.actual > 0) ? entry.actual : entry.forecast;
          const key = INCOME_SYNC_MAP[src.id];
          if (key) {
            m[key] = v;
          } else if (src.id !== "rental") {
            // "rental" is authoritative from the Rental sub-page — exclude it
            // here to prevent double-counting rentalNet in customIncome.
            customIncome += v;
          }
        }
        if (customIncome > 0) m.customIncome = customIncome;
        newMonths[i.toString()] = m;
      }
      // Rental sub-page is authoritative for rentalNet — always re-assert after income sync
      const rentalNet = computeMonthlyRentalNet(prev.rental);
      if (rentalNet !== 0) {
        for (let i = 0; i < 60; i++) {
          newMonths[i.toString()] = { ...newMonths[i.toString()], rentalNet };
        }
      }
      const newData = { ...prev, income: incomeData, months: newMonths };
      triggerSave(newData);
      return newData;
    });
  };

  // ── Savings worksheet change ──────────────────────────────────────────────

  const handleSavingsChange = (savingsData: SavingsWorksheet) => {
    setBudgetData((prev: any) => {
      const newData = { ...prev, savings: savingsData };
      triggerSave(newData);
      return newData;
    });
  };

  // ── Tax worksheet change ──────────────────────────────────────────────────

  const handleTaxChange = (taxData: TaxWorksheet) => {
    setBudgetData((prev: any) => {
      const newData = { ...prev, tax: taxData };
      triggerSave(newData);
      return newData;
    });
  };

  // ── Rental config change ─────────────────────────────────────────────────

  const handleRentalChange = (cfg: RentalConfig) => {
    setBudgetData((prev: any) => {
      const grossRent      = cfg.weeklyRent * (52 - cfg.vacancyWeeks);
      const mgmtFees       = (cfg.managementFeeRate / 100) * grossRent;
      const lettingFees    = cfg.lettingFeeWeeks * cfg.weeklyRent;
      const interestExp    = (cfg.loanBalance * cfg.interestRate) / 100;

      // Income: gross rent received (before expenses) → rentalNet stores gross
      const monthlyGrossRent    = Math.round(grossRent / 12);
      // Expense breakdown (populated into separate grid rows)
      const monthlyInterest     = Math.round(interestExp / 12);
      // Rates = council + strata + land tax only (water and electricity tracked separately)
      const monthlyRates        = Math.round((cfg.councilRates + cfg.strataLevies + cfg.landTax) / 12);
      const monthlyWater        = Math.round(cfg.waterRates / 12);
      const monthlyElectricity  = Math.round((cfg.electricity ?? 0) / 12);
      const monthlyMgmt         = Math.round((mgmtFees + lettingFees) / 12);
      const monthlyOther        = Math.round((cfg.landlordInsurance + cfg.repairs + cfg.advertising + cfg.accountingFees + cfg.legalFees + cfg.bankCharges) / 12);

      const newMonths: Record<string, any> = { ...prev.months };
      for (let i = 0; i < 60; i++) {
        newMonths[i.toString()] = {
          ...newMonths[i.toString()],
          rentalNet:          monthlyGrossRent,
          rentalInterest:     monthlyInterest,
          rentalRatesLevies:  monthlyRates,
          rentalWater:        monthlyWater,
          rentalElectricity:  monthlyElectricity,
          rentalMgmtFees:     monthlyMgmt,
          rentalOtherCosts:   monthlyOther,
        };
      }
      const newData = { ...prev, rental: cfg, months: newMonths };
      triggerSave(newData);
      return newData;
    });
  };

  // ── Planning change ──────────────────────────────────────────────────────

  const handlePlanningChange = (updatedMonths: Record<string, any>) => {
    setBudgetData((prev: any) => {
      const newData = { ...prev, months: updatedMonths };
      triggerSave(newData);
      return newData;
    });
  };

  // ── CPI Apply ────────────────────────────────────────────────────────────

  const handleApplyCPI = () => {
    if (!budgetData) return;
    setBudgetData((prev: any) => {
      const newMonths = { ...prev.months };
      for (let i = cpiFromMonth; i < 60; i++) {
        const yearsAhead = Math.floor((i - cpiFromMonth) / 12);
        const multiplier = Math.pow(1 + cpiRate / 100, yearsAhead);
        const baseMonthIdx = cpiFromMonth + ((i - cpiFromMonth) % 12);
        const base = newMonths[baseMonthIdx.toString()] || newMonths[baseMonthIdx] || {};
        const current = { ...(newMonths[i.toString()] || newMonths[i] || {}) };
        for (const key of ALL_EXPENSE_KEYS) {
          const bv = Number(base[key]);
          if (bv > 0) current[key] = Math.round(bv * multiplier);
        }
        for (const inc of INCOME_ITEMS) {
          const bv = Number(base[inc.key]);
          if (bv > 0) current[inc.key] = Math.round(bv * multiplier);
        }
        newMonths[i.toString()] = current;
      }
      const newData = { ...prev, months: newMonths };
      triggerSave(newData);
      return newData;
    });
    setCpiDialogOpen(false);
    toast({ title: "CPI indexing applied", description: `${cpiRate}% pa compounded from ${monthLabel(cpiFromMonth, "long")}` });
  };

  // ── Computed totals — all 60 months ──────────────────────────────────────

  const computedTotals = useMemo(() => {
    if (!budgetData) return [];
    let balance = 0;
    return Array.from({ length: 60 }, (_, i) => {
      const m = budgetData.months[i.toString()] ?? budgetData.months[i] ?? {};
      const opening = i === 0 ? (Number(m.openingBalance) || 0) : balance;
      const travel      = sectionTotal(m, TRAVEL_EXPENSES);
      const vehicle     = sectionTotal(m, VEHICLE_COSTS);
      const fixed       = sectionTotal(m, FIXED_BILLS);
      const annual      = sectionTotal(m, ANNUAL_COSTS);
      const super_      = sectionTotal(m, SUPER_SAVINGS);
      const family      = sectionTotal(m, FAMILY_COSTS);
      const rentalCosts = sectionTotal(m, RENTAL_EXPENSES);
      const totalExp = travel + vehicle + fixed + annual + super_ + family + rentalCosts;
      const totalInc = sectionTotal(m, INCOME_ITEMS);
      const closing  = opening + totalInc - totalExp;
      balance = closing;
      return {
        name: monthLabel(i, "short"),
        label: monthLabel(i, "long"),
        month: i,
        openingBalance: opening,
        travel, vehicle, fixed, annual, super: super_, family, rentalCosts,
        totalExpenses: totalExp,
        totalIncome: totalInc,
        net: totalInc - totalExp,
        closingBalance: closing,
      };
    });
  }, [budgetData]);

  const visibleTotals = useMemo(
    () => computedTotals.slice(viewStart, viewEnd + 1),
    [computedTotals, viewStart, viewEnd]
  );

  // Index of the current month relative to budget base (March 2026 = 0)
  const todayMonthIdx = useMemo(() => {
    const now = new Date();
    return Math.max(0, Math.min(59,
      (now.getFullYear() - 2026) * 12 + (now.getMonth() - 2)
    ));
  }, []);

  const balanceOverview = useMemo(() =>
    computedTotals.map((t, i) => ({
      name: i === todayMonthIdx
        ? (i % 12 === 0 ? `Y${Math.floor(i / 12) + 1}/Now` : "Now")
        : (i % 12 === 0 ? `Y${Math.floor(i / 12) + 1}` : ""),
      balance: t.closingBalance,
      year: Math.floor(i / 12),
    })),
    [computedTotals, todayMonthIdx]
  );

  // Monthly drawdown = net budget outflow (positive = drawing from savings, negative = surplus)
  const monthlyDrawdown = useMemo(() =>
    computedTotals.map(t => t.totalExpenses - t.totalIncome),
    [computedTotals]
  );

  // ── Insights ─────────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    if (!computedTotals.length || !budgetData) return [];
    const items: { type: "red" | "amber" | "green" | "tip"; title: string; body: string }[] = [];

    const negMonths = computedTotals.filter(t => t.closingBalance < 0);
    if (negMonths.length > 0) {
      const first = negMonths[0];
      items.push({
        type: "red",
        title: `Balance turns negative — ${first.label}`,
        body: `Shortfall of $${Math.abs(first.closingBalance).toLocaleString()} in Month ${first.month + 1}. ${negMonths.length} months total in deficit. Inject savings or reduce spending before this point.`,
      });
    }

    let maxStreak = 0, streak = 0, streakStart = -1, maxStreakStart = -1;
    for (const t of computedTotals) {
      if (t.net < 0) {
        if (streak === 0) streakStart = t.month;
        streak++;
        if (streak > maxStreak) { maxStreak = streak; maxStreakStart = streakStart; }
      } else { streak = 0; }
    }
    if (maxStreak >= 3) {
      items.push({
        type: "amber",
        title: `${maxStreak}-month cashflow burn starting ${monthLabel(maxStreakStart, "long")}`,
        body: `Expenses exceed income for ${maxStreak} consecutive months. Build a dedicated buffer of $${Math.round(
          computedTotals.slice(maxStreakStart, maxStreakStart + maxStreak).reduce((s, t) => s + Math.abs(t.net), 0)
        ).toLocaleString()} before this period.`,
      });
    }

    const peakExp = computedTotals.reduce((a, b) => a.totalExpenses > b.totalExpenses ? a : b);
    items.push({
      type: "amber",
      title: `Peak spend month — ${peakExp.label}: $${peakExp.totalExpenses.toLocaleString()}`,
      body: `Annual rego, insurance and/or vehicle service spike. Ensure $${Math.round(peakExp.totalExpenses * 1.1).toLocaleString()} available in that month (10% buffer).`,
    });

    const totalInc5 = computedTotals.reduce((s, t) => s + t.totalIncome, 0);
    const totalExp5 = computedTotals.reduce((s, t) => s + t.totalExpenses, 0);
    const finalBal  = computedTotals[59]?.closingBalance ?? 0;
    items.push({
      type: finalBal >= 0 ? "green" : "red",
      title: `5-year closing balance: ${finalBal >= 0 ? "+" : ""}$${finalBal.toLocaleString()}`,
      body: `Total income $${totalInc5.toLocaleString()} vs total outgoings $${totalExp5.toLocaleString()} across 60 months.`,
    });

    const avgExp = computedTotals.reduce((s, t) => s + t.totalExpenses, 0) / 60;
    const rental  = Number(budgetData.months["0"]?.rentalNet || budgetData.months[0]?.rentalNet || 0);
    if (rental > 0) {
      const pct = ((rental / avgExp) * 100).toFixed(0);
      items.push({
        type: "green",
        title: `Rental income covers ${pct}% of average monthly costs`,
        body: `Net rental $${rental.toLocaleString()}/mo vs avg monthly spend $${Math.round(avgExp).toLocaleString()}. Strong passive income base.`,
      });
    }

    const m0 = budgetData.months["0"] || budgetData.months[0] || {};
    const fuelM0  = Number(m0.fuel || 0);
    const accomM0 = Number(m0.accommodation || 0);
    if (fuelM0 > 300) {
      const saving5yr = fuelM0 * 0.10 * 12 * 5;
      items.push({
        type: "tip",
        title: "Fuel — drop from 20 to 18 L/100km (10% saving)",
        body: `Use cruise control, 90–95 km/h, shade tyres. Saves ~$${Math.round(saving5yr).toLocaleString()} over 5 years at current fuel spend.`,
      });
    }
    if (accomM0 > 1000) {
      const saving5yr = accomM0 * 0.15 * 12 * 5;
      items.push({
        type: "tip",
        title: "Accommodation — add 1–2 free camp nights per week",
        body: `WikiCamps, Camplify, and National Parks free zones. ~15% reduction saves ~$${Math.round(saving5yr).toLocaleString()} over 5 years.`,
      });
    }
    items.push({
      type: "tip",
      title: "Lock in annual insurance before the November spike",
      body: "Paying annual rego and insurance in one hit avoids instalment fees ($100–200 per policy). Budget the lump sum in October.",
    });
    items.push({
      type: "tip",
      title: "Use the CPI button each year to stay ahead of inflation",
      body: "RBA target is 2–3%. Apply 2.5% at the start of each year to auto-scale all expense categories forward.",
    });
    return items;
  }, [computedTotals, budgetData]);

  // ── CSV Export / Import — Master Data (month-first, key-based) ──────────
  //
  // Format:
  //   Row 0  "#section" row  — section labels for each column (skipped on import)
  //   Row 1  "#label"   row  — human-readable labels        (skipped on import)
  //   Row 2  key header row  — "Month","idx",<key1>,<key2>,…
  //   Row 3+ data rows       — one row per month (60 total)
  //
  // Import matches columns by key name and months by "idx" value, so the
  // user can reorder / remove columns and it still imports correctly.

  const CSV_COL_DEFS = (() => {
    const sectionOf = (key: string) =>
      EXPENSE_SECTIONS.find(s => s.items.some(i => i.key === key))?.title ?? "Income";
    return [
      { key: "openingBalance", label: "Opening Balance", section: "Balance" },
      ...ALL_KEYS.map(item => ({ key: item.key, label: item.label, section: sectionOf(item.key) })),
    ];
  })();

  const handleDownloadCSV = () => {
    if (!budgetData) return;

    const sectionRow = ["#section", "", ...CSV_COL_DEFS.map(c => c.section)];
    const labelRow   = ["#label",   "", ...CSV_COL_DEFS.map(c => c.label)];
    const keyRow     = ["Month",  "idx", ...CSV_COL_DEFS.map(c => c.key)];

    const dataRows = Array.from({ length: 60 }, (_, i) => {
      const m = budgetData.months[i.toString()] ?? budgetData.months[i] ?? {};
      return [
        monthLabel(i),
        String(i),
        ...CSV_COL_DEFS.map(c => {
          if (c.key === "openingBalance") {
            return i === 0
              ? String(Number(m.openingBalance) || 0)
              : String(Math.round(computedTotals[i]?.openingBalance ?? 0));
          }
          return String(Number(m[c.key]) || 0);
        }),
      ];
    });

    const rows = [sectionRow, labelRow, keyRow, ...dataRows];
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "die-groot-ompad-budget-master.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Master CSV exported", description: "60 months · all fields · ready to edit and re-import" });
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parseRow = (line: string) =>
          line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
              .map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"'));

        const lines = (ev.target?.result as string)
          .trim().split("\n")
          .map(parseRow)
          .filter(r => !r[0].startsWith("#")); // skip #section / #label info rows

        if (lines.length < 2) throw new Error("No data rows");

        // First non-comment row = key header
        const header = lines[0];
        const colMap: Record<string, number> = {};
        header.forEach((h, c) => { colMap[h] = c; });

        // Seed from current data so any column absent from the CSV is preserved
        const newMonths: Record<string, any> = {};
        for (let i = 0; i < 60; i++) {
          newMonths[i.toString()] = { ...(budgetData?.months?.[i.toString()] ?? {}) };
        }

        for (const row of lines.slice(1)) {
          const idxRaw = colMap["idx"] !== undefined ? parseInt(row[colMap["idx"]]) : NaN;
          if (isNaN(idxRaw) || idxRaw < 0 || idxRaw >= 60) continue;
          const target = newMonths[idxRaw.toString()];

          for (const [key, colIdx] of Object.entries(colMap)) {
            if (key === "Month" || key === "idx") continue;
            const val = parseFloat(row[colIdx]);
            if (!isNaN(val)) target[key] = val;
          }
        }

        const newData = { ...budgetData, months: newMonths };
        setBudgetData(newData); triggerSave(newData);
        toast({ title: "Budget imported", description: `${file.name} — ${lines.length - 1} months loaded` });
      } catch {
        toast({ title: "Import failed", description: "Ensure the file is in the master CSV format exported from this app", variant: "destructive" });
      }
    };
    reader.readAsText(file); e.target.value = "";
  };

  if (isLoading || !budgetData) {
    return (
      <div className="p-8 text-muted-foreground">Loading budget...</div>
    );
  }

  const SUBTAB_HELP: Record<string, HelpContent> = {
    overview:    HELP_BUDGET_OVERVIEW,
    income:      HELP_BUDGET_INCOME,
    savings:     HELP_BUDGET_SAVINGS,
    tax:         HELP_BUDGET_TAX,
    rental:      HELP_BUDGET_RENTAL,
    planning:    HELP_BUDGET_PLANNING,
    super:       HELP_BUDGET_SUPER,
    pension:     HELP_BUDGET_PENSION,
    shares:      HELP_BUDGET_SHARES,
    memberships: HELP_BUDGET_MEMBERSHIPS,
  };

  const SECTION_HELP_MAP: Record<string, HelpContent> = {
    "Travel Expenses":           HELP_SECTION_TRAVEL,
    "Vehicle Costs":             HELP_SECTION_VEHICLE,
    "Fixed Bills":               HELP_SECTION_FIXED,
    "Annual — Rego & Insurance": HELP_SECTION_ANNUAL,
    "Super & Savings":           HELP_SECTION_SUPER,
    "Grandkids & Family":        HELP_SECTION_FAMILY,
  };

  const totalVisible = {
    totalExpenses:  visibleTotals.reduce((s, t) => s + t.totalExpenses, 0),
    totalIncome:    visibleTotals.reduce((s, t) => s + t.totalIncome, 0),
    closingBalance: computedTotals[viewEnd]?.closingBalance ?? 0,
  };
  const total60 = {
    totalExpenses:  computedTotals.reduce((s, t) => s + t.totalExpenses, 0),
    totalIncome:    computedTotals.reduce((s, t) => s + t.totalIncome, 0),
    closingBalance: computedTotals[59]?.closingBalance ?? 0,
  };

  return (
    <div className="space-y-6 pb-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget</h1>
          <p className="text-sm text-muted-foreground mt-0.5">5-year travel financial plan — shared across all trips</p>
        </div>

        {/* ── Sub-page nav ── */}
        <div className="flex gap-0.5 border-b border-border pb-0 flex-wrap">
          {([
            { key: "overview",     label: "Overview" },
            { key: "income",       label: "Income" },
            { key: "savings",      label: "Savings" },
            { key: "tax",          label: "Tax" },
            { key: "rental",       label: "Rental Property" },
            { key: "planning",     label: "Trip Planning" },
            { key: "super",        label: "Superannuation" },
            { key: "pension",      label: "Age Pension" },
            { key: "shares",       label: "Shares" },
            { key: "memberships",  label: "Memberships" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="relative flex items-center">
              <button onClick={() => setSubPage(key)}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-t-md transition-colors border-b-2 -mb-px",
                  subPage === key
                    ? "border-primary text-primary bg-primary/8"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}>
                {label}
              </button>
              <div className="mb-0.5 pr-1">
                <HelpButton content={SUBTAB_HELP[key]} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Income worksheet sub-page ── */}
        {subPage === "income" && (
          <IncomeSub
            data={{ ...DEFAULT_INCOME, ...(budgetData.income as IncomeWorksheet ?? {}) }}
            onChange={handleIncomeChange}
            mainMonths={budgetData.months as Record<string, any>}
          />
        )}

        {/* ── Savings sub-page ── */}
        {subPage === "savings" && (
          <SavingsSub
            data={{ ...DEFAULT_SAVINGS, ...(budgetData.savings as SavingsWorksheet ?? {}) }}
            onChange={handleSavingsChange}
            drawdown={monthlyDrawdown}
          />
        )}

        {/* ── Tax worksheet sub-page ── */}
        {subPage === "tax" && (
          <TaxSub
            data={{ ...DEFAULT_TAX, ...(budgetData.tax as TaxWorksheet ?? {}) }}
            onChange={handleTaxChange}
            rentalConfig={budgetData.rental}
          />
        )}

        {/* ── Rental sub-page ── */}
        {subPage === "rental" && (
          <RentalSub
            config={{ ...DEFAULT_RENTAL, ...(budgetData.rental ?? {}) } as any}
            onChange={handleRentalChange}
          />
        )}

        {/* ── Planning sub-page ── */}
        {subPage === "planning" && (
          <PlanningSub
            months={budgetData.months as Record<string, any>}
            tripStartDate={undefined}
            onChange={handlePlanningChange}
          />
        )}

        {/* ── Memberships sub-page ── */}
        {subPage === "memberships" && <MembershipsTab />}

        {/* ── Superannuation sub-page ── */}
        {subPage === "super" && (
          <SuperSub
            data={{ ...DEFAULT_SUPER, ...(budgetData.super as SuperPortfolio ?? {}) }}
            onChange={handleSuperChange}
          />
        )}

        {/* ── Age Pension sub-page ── */}
        {subPage === "pension" && (
          <div className="p-4">
            <PensionSub
              data={{ ...DEFAULT_PENSION, ...((budgetData.super as SuperPortfolio)?.pension as PensionWorksheet ?? {}) }}
              onChange={handlePensionChange}
              superPortfolio={{ ...DEFAULT_SUPER, ...(budgetData.super as SuperPortfolio ?? {}) }}
            />
          </div>
        )}

        {/* ── Shares sub-page ── */}
        {subPage === "shares" && (
          <SharesSub
            data={{ ...DEFAULT_SHARES, ...(budgetData.shares as SharesPortfolio ?? {}) }}
            onChange={handleSharesChange}
          />
        )}

        {/* ── Overview ── */}
        {subPage === "overview" && <React.Fragment>

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">5-Year Travel Budget — 60 Months</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Viewing {visibleCount} months · {monthLabel(viewStart, "long")} – {monthLabel(viewEnd, "long")}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setCpiFromMonth(viewStart); setCpiDialogOpen(true); }}
              className="border-[#d9b880] text-[#b8943e] hover:bg-[#d9b880]/10">
              <CpiIcon className="mr-1.5 h-4 w-4" /> CPI Index
            </Button>
            <Button size="sm" onClick={handleManualSave} disabled={saveGlobalBudget.isPending}>
              <Save className="mr-1.5 h-4 w-4" /> Save
            </Button>
          </div>
        </div>

        {/* ── Date range filter ── */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">View Period:</span>
          {[0, 1, 2, 3, 4].map(yr => (
            <button key={yr}
              onClick={() => { setViewYear(yr); setCustomMode(false); }}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-semibold transition-colors border",
                !customMode && viewYear === yr
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
              Year {yr + 1}
            </button>
          ))}
          <button
            onClick={() => setCustomMode(true)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-semibold transition-colors border",
              customMode
                ? "bg-[#d9b880] text-[#5a3a00] border-[#d9b880]"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
            Custom
          </button>
          {customMode && (
            <div className="flex items-center gap-2 flex-wrap">
              <select value={customFrom} onChange={e => setCustomFrom(Number(e.target.value))}
                className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground">
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>M{i + 1} — {monthLabel(i, "long")}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">to</span>
              <select value={customTo} onChange={e => setCustomTo(Number(e.target.value))}
                className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground">
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i} disabled={i < customFrom}>M{i + 1} — {monthLabel(i, "long")}</option>
                ))}
              </select>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button onClick={() => { if (!customMode && viewYear > 0) setViewYear(v => v - 1); }}
              disabled={customMode || viewYear === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => { if (!customMode && viewYear < 4) setViewYear(v => v + 1); }}
              disabled={customMode || viewYear === 4}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: `${visibleCount}-Month Spend`, value: `$${totalVisible.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: "text-destructive" },
            { label: `${visibleCount}-Month Income`, value: `$${totalVisible.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-primary" },
            { label: "Balance at Period End", value: `$${totalVisible.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: totalVisible.closingBalance < 0 ? "text-destructive" : "text-foreground" },
            { label: "5-Year End Balance", value: `$${total60.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: total60.closingBalance < 0 ? "text-destructive" : "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                <div className="flex items-center justify-between">
                  <span className={cn("text-2xl font-bold", color)}>{value}</span>
                  <Icon className={cn("h-5 w-5 opacity-40", color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Expense Breakdown — Selected Period</CardTitle>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleTotals} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 10 }}
                    formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n]} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="travel"  name="Travel"    stackId="a" fill="#1f6f5f" />
                  <Bar dataKey="vehicle" name="Vehicle"   stackId="a" fill="#d9b880" />
                  <Bar dataKey="fixed"   name="Fixed"     stackId="a" fill="#60a5fa" />
                  <Bar dataKey="annual"  name="Annual"    stackId="a" fill="#ef4444" />
                  <Bar dataKey="super"   name="Super/Sav" stackId="a" fill="#a78bfa" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">60-Month Running Balance Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceOverview} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={11} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 10 }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Balance"]} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                  <ReferenceLine x="Now" stroke="#d9b880" strokeWidth={2} strokeDasharray="5 3"
                    label={{ value: "Today", position: "insideTopLeft", fontSize: 9, fill: "#d9b880", fontWeight: "bold" }} />
                  <Area dataKey="balance" name="Balance" type="monotone"
                    fill="#1f6f5f" fillOpacity={0.18} stroke="#1f6f5f" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Income vs Expenses — Selected Period</CardTitle>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={visibleTotals} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 10 }}
                    formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n]} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="totalExpenses" name="Expenses" fill="#ef4444" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="totalIncome"   name="Income"   fill="#1f6f5f" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                  <Line dataKey="closingBalance" name="Balance" stroke="#d9b880" strokeWidth={2} dot={false} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── Spreadsheet grid ── */}
        <Card className="bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-sm">
              Budget Grid — {visibleCount} Months ({monthLabel(viewStart, "long")} – {monthLabel(viewEnd, "long")})
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 sticky top-0 z-10">
                  <th className="text-left p-2 pl-3 font-semibold text-muted-foreground whitespace-nowrap min-w-[180px]">Category</th>
                  {Array.from({ length: visibleCount }, (_, i) => viewStart + i).map(mi => (
                    <th key={mi} className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap min-w-[72px]">
                      {monthLabel(mi)}
                      {mi % 12 === 8 && <div className="text-[8px] text-destructive/70 font-normal">Annual</div>}
                    </th>
                  ))}
                  <th className="text-right p-2 font-semibold text-muted-foreground whitespace-nowrap min-w-[72px]">Total</th>
                </tr>

                <tr className="bg-[#d9b880]/10 border-b border-border/40">
                  <td className="p-2 pl-3 font-semibold text-foreground">Opening Balance</td>
                  {Array.from({ length: visibleCount }, (_, i) => viewStart + i).map(mi => {
                    const val = mi === 0
                      ? Number((budgetData.months["0"] ?? budgetData.months[0])?.openingBalance || 0)
                      : computedTotals[mi]?.openingBalance ?? 0;
                    return (
                      <td key={mi} className="text-right p-2 tabular-nums">
                        {mi === 0 ? (
                          <BudgetCell step={100} value={val}
                            onChange={v => handleCellChange(0, "openingBalance", v)}
                            className="w-full text-right bg-transparent border-b border-[#d9b880]/50 focus:outline-none focus:border-[#d9b880] font-medium text-[#b8943e]"
                          />
                        ) : (
                          <span className="text-muted-foreground">${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-right p-2 text-muted-foreground">—</td>
                </tr>
              </thead>

              <tbody>
                {EXPENSE_SECTIONS.map(section => (
                  <React.Fragment key={section.title}>
                    <tr className="border-t border-b border-border/40" style={{ backgroundColor: section.color + "18" }}>
                      <td colSpan={visibleCount + 2} className="p-2 pl-3 font-bold text-xs uppercase tracking-wide"
                        style={{ color: section.color }}>
                        <div className="flex items-center gap-2">
                          {section.title}
                          {SECTION_HELP_MAP[section.title] && (
                            <HelpButton content={SECTION_HELP_MAP[section.title]} />
                          )}
                        </div>
                      </td>
                    </tr>
                    {section.items.map(cat => {
                      const rowTotal = Array.from({ length: visibleCount }, (_, i) => viewStart + i)
                        .reduce((s, mi) => s + (Number((budgetData.months[mi.toString()] ?? budgetData.months[mi])?.[cat.key]) || 0), 0);
                      const rowHint = getRowHint(cat.key);
                      return (
                        <tr key={cat.key} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="p-1.5 pl-3 text-foreground whitespace-nowrap">
                            <div>{cat.label}</div>
                            {rowHint && <div className="text-[10px] text-muted-foreground leading-tight">{rowHint}</div>}
                          </td>
                          {Array.from({ length: visibleCount }, (_, i) => viewStart + i).map(mi => {
                            const m = budgetData.months[mi.toString()] ?? budgetData.months[mi] ?? {};
                            const val = Number(m[cat.key]) || 0;
                            return (
                              <td key={mi} className="p-1 text-right">
                                <BudgetCell step={10} value={val}
                                  onChange={v => handleCellChange(mi, cat.key, v)}
                                  className={cn(
                                    "w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 tabular-nums",
                                    val > 0 ? "text-foreground" : "text-muted-foreground/30"
                                  )}
                                />
                              </td>
                            );
                          })}
                          <td className="text-right p-2 font-semibold text-foreground tabular-nums">
                            ${rowTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-b border-border/40" style={{ backgroundColor: section.color + "10" }}>
                      <td className="p-1.5 pl-3 font-semibold text-xs" style={{ color: section.color }}>Subtotal — {section.title}</td>
                      {Array.from({ length: visibleCount }, (_, i) => viewStart + i).map(mi => (
                        <td key={mi} className="text-right p-1.5 font-semibold tabular-nums text-xs" style={{ color: section.color }}>
                          ${sectionTotal(budgetData.months[mi.toString()] ?? budgetData.months[mi] ?? {}, section.items).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      ))}
                      <td className="text-right p-1.5 font-bold tabular-nums text-xs" style={{ color: section.color }}>
                        ${Array.from({ length: visibleCount }, (_, i) => viewStart + i)
                          .reduce((s, mi) => s + sectionTotal(budgetData.months[mi.toString()] ?? budgetData.months[mi] ?? {}, section.items), 0)
                          .toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}

                <tr className="border-t border-b border-border/40 bg-primary/8">
                  <td colSpan={visibleCount + 2} className="p-2 pl-3 font-bold text-xs uppercase tracking-wide text-primary">
                    <div className="flex items-center gap-2">
                      Income
                      <HelpButton content={HELP_INCOME_SECTION} />
                    </div>
                  </td>
                </tr>
                {INCOME_ITEMS.map(cat => {
                  const rowTotal = Array.from({ length: visibleCount }, (_, i) => viewStart + i)
                    .reduce((s, mi) => s + (Number((budgetData.months[mi.toString()] ?? budgetData.months[mi])?.[cat.key]) || 0), 0);
                  return (
                    <tr key={cat.key} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="p-1.5 pl-3 text-foreground whitespace-nowrap">{cat.label}</td>
                      {Array.from({ length: visibleCount }, (_, i) => viewStart + i).map(mi => {
                        const m = budgetData.months[mi.toString()] ?? budgetData.months[mi] ?? {};
                        const val = Number(m[cat.key]) || 0;
                        return (
                          <td key={mi} className="p-1 text-right">
                            <BudgetCell step={10} value={val}
                              onChange={v => handleCellChange(mi, cat.key, v)}
                              className={cn(
                                "w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 tabular-nums",
                                val > 0 ? "text-primary font-medium" : "text-muted-foreground/30"
                              )}
                            />
                          </td>
                        );
                      })}
                      <td className="text-right p-2 font-semibold text-primary tabular-nums">
                        ${rowTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}

                {[
                  { label: "Total Expenses", key: "totalExpenses", color: "text-destructive", bold: true },
                  { label: "Total Income",   key: "totalIncome",   color: "text-primary",     bold: true },
                  { label: "Net Cashflow",   key: "net",           color: "",                 bold: true },
                  { label: "Closing Balance",key: "closingBalance",color: "",                 bold: true },
                ].map(row => (
                  <tr key={row.label} className="border-t-2 border-border/60 bg-muted/30">
                    <td className={cn("p-2 pl-3 font-bold text-xs uppercase tracking-wide", row.color)}>{row.label}</td>
                    {Array.from({ length: visibleCount }, (_, i) => viewStart + i).map(mi => {
                      const t = computedTotals[mi];
                      const val = t ? (t as any)[row.key] : 0;
                      const isNeg = val < 0;
                      return (
                        <td key={mi} className={cn(
                          "text-right p-2 font-bold tabular-nums text-xs",
                          row.key === "closingBalance" ? (isNeg ? "text-destructive" : "text-primary")
                            : row.key === "net" ? (isNeg ? "text-destructive" : "text-primary")
                            : row.color || "text-foreground"
                        )}>
                          ${val?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      );
                    })}
                    <td className={cn("text-right p-2 font-bold tabular-nums text-xs",
                      row.key === "closingBalance" || row.key === "net"
                        ? (visibleTotals.reduce((s, t) => s + (t as any)[row.key], 0) < 0 ? "text-destructive" : "text-primary")
                        : row.color || "text-foreground"
                    )}>
                      ${row.key === "closingBalance"
                        ? computedTotals[viewEnd]?.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : visibleTotals.reduce((s, t) => s + (t as any)[row.key], 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Insights & Red Flags ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Budget Insights & Recommendations</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {insights.map((item, idx) => {
              const isRed   = item.type === "red";
              const isAmber = item.type === "amber";
              const isGreen = item.type === "green";
              const isTip   = item.type === "tip";
              return (
                <div key={idx} className={cn(
                  "rounded-lg border p-4 flex gap-3",
                  isRed   ? "border-destructive/40 bg-destructive/5"
                    : isAmber ? "border-[#d9b880]/50 bg-[#d9b880]/8"
                    : isGreen ? "border-primary/30 bg-primary/5"
                    : "border-blue-400/30 bg-blue-500/5"
                )}>
                  <div className={cn(
                    "shrink-0 mt-0.5",
                    isRed   ? "text-destructive"
                      : isAmber ? "text-[#b8943e]"
                      : isGreen ? "text-primary"
                      : "text-blue-500"
                  )}>
                    {isRed || isAmber ? <AlertTriangle className="h-4 w-4" />
                      : isGreen ? <CheckCircle2 className="h-4 w-4" />
                      : <Lightbulb className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-xs font-bold mb-0.5",
                      isRed   ? "text-destructive"
                        : isAmber ? "text-[#b8943e]"
                        : isGreen ? "text-primary"
                        : "text-blue-600"
                    )}>{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CPI Dialog ── */}
        <Dialog open={cpiDialogOpen} onOpenChange={setCpiDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Apply CPI Indexing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                  Annual CPI Rate (%)
                </label>
                <input type="number" step="0.1" min="0" max="20" value={cpiRate}
                  onChange={e => setCpiRate(Number(e.target.value))}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground mt-1">RBA target 2–3%. Current trimmed mean: ~3.2%.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                  Apply From Month
                </label>
                <select value={cpiFromMonth} onChange={e => setCpiFromMonth(Number(e.target.value))}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>Month {i + 1} — {monthLabel(i, "long")}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  All expense and income values from this month onwards will be scaled by (1 + rate)^years compounded annually.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCpiDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleApplyCPI}>Apply CPI</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        </React.Fragment>}
    </div>
  );
}
