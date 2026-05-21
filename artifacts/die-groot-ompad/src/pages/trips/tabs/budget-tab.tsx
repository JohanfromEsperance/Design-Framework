import {
  useGetBudget, useSaveBudget, getGetBudgetQueryKey, useGetTrip,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Save, Download, Upload, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ComposedChart, BarChart, Bar, Line, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BudgetTabProps {
  tripId: number;
}

// ── Category definitions ─────────────────────────────────────────────────────

const TRAVEL_EXPENSES = [
  { key: "fuel",          label: "Fuel" },
  { key: "accommodation", label: "Parks & Accommodation" },
  { key: "food",          label: "Food & Groceries" },
  { key: "eatingOut",     label: "Eating Out / Restaurants" },
  { key: "entertainment", label: "Entertainment & Activities" },
  { key: "passesPermits", label: "Passes & Permits" },
  { key: "ferries",       label: "Ferries & Transport" },
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

const INCOME_ITEMS = [
  { key: "rentalNet",      label: "Rental Net Income" },
  { key: "salary",         label: "Salary / Employment" },
  { key: "businessIncome", label: "Business Income" },
  { key: "refunds",        label: "Refunds / Reimbursements" },
  { key: "otherIncome1",   label: "Other Income 1" },
  { key: "otherIncome2",   label: "Other Income 2" },
];

const EXPENSE_SECTIONS = [
  { title: "Travel & Road",           items: TRAVEL_EXPENSES, color: "#1f6f5f" },
  { title: "Vehicle & Rig",           items: VEHICLE_COSTS,   color: "#d9b880" },
  { title: "Fixed Monthly Bills",     items: FIXED_BILLS,     color: "#60a5fa" },
  { title: "Annual — Rego & Insurance", items: ANNUAL_COSTS,  color: "#ef4444" },
  { title: "Super & Savings",         items: SUPER_SAVINGS,   color: "#a78bfa" },
];

const ALL_KEYS = [
  ...TRAVEL_EXPENSES, ...VEHICLE_COSTS, ...FIXED_BILLS,
  ...ANNUAL_COSTS, ...SUPER_SAVINGS, ...INCOME_ITEMS,
];

// ── Default data from TTR-JJS1 workbook ─────────────────────────────────────
// Months 0-11 = March (D) through February (D+11)
// Fuel: 20L/100km @$3/L; Accommodation & Food: $50/day; Super SPA: $1161/mo; Rental net: $1611/mo

const BASE_BILLS = {
  starlink: 80, johanMobile: 60, zandraMobile: 60,
  medical: 500, prescriptions: 250, apartmentInsurance: 112,
  superContribution: 1161, savingsZandra: 0, savingsJohan: 0,
  vehicleService: 0, caravanService: 0, tyresVehicle: 0, tyresCaravan: 0, repairs: 0,
  vehicleLicence: 0, caravanLicence: 0, vehicleInsurance: 0, caravanInsurance: 0, roadsideAssist: 0,
  rentalNet: 1611, salary: 0, businessIncome: 0, refunds: 0, otherIncome1: 0, otherIncome2: 0,
};

const DEFAULT_MONTHS: Record<string, any>[] = [
  // Month 0 — March (Perth–Northam, 31 days, 700km)
  { ...BASE_BILLS, openingBalance: 47607, fuel: 420, accommodation: 1550, food: 1550, eatingOut: 150, entertainment: 100, passesPermits: 0,   ferries: 0 },
  // Month 1 — April (Shark Bay, 30 days, 800km)
  { ...BASE_BILLS, fuel: 480,  accommodation: 1500, food: 1500, eatingOut: 150, entertainment: 100, passesPermits: 0,   ferries: 0 },
  // Month 2 — May (Exmouth, 31 days, 700km)
  { ...BASE_BILLS, fuel: 420,  accommodation: 1550, food: 1550, eatingOut: 150, entertainment: 100, passesPermits: 50,  ferries: 0 },
  // Month 3 — June (80 Mile Beach, 30 days, 700km)
  { ...BASE_BILLS, fuel: 420,  accommodation: 1500, food: 1500, eatingOut: 100, entertainment: 100, passesPermits: 0,   ferries: 0 },
  // Month 4 — July (Broome, 31 days, 600km)
  { ...BASE_BILLS, fuel: 360,  accommodation: 1550, food: 1550, eatingOut: 150, entertainment: 150, passesPermits: 0,   ferries: 0 },
  // Month 5 — August (Gibb River Road, 31 days, 700km)
  { ...BASE_BILLS, fuel: 420,  accommodation: 1550, food: 1550, eatingOut: 100, entertainment: 100, passesPermits: 0,   ferries: 0 },
  // Month 6 — September (Darwin, 30 days, 900km)
  { ...BASE_BILLS, fuel: 540,  accommodation: 1500, food: 1500, eatingOut: 200, entertainment: 200, passesPermits: 100, ferries: 0 },
  // Month 7 — October (Darwin → Alice → Adelaide, 31 days, 3000km + ferry)
  { ...BASE_BILLS, fuel: 1800, accommodation: 1550, food: 1550, eatingOut: 200, entertainment: 150, passesPermits: 0,   ferries: 4500 },
  // Month 8 — November (Tasmania, 30 days, 1000km) — ANNUAL COSTS MONTH
  { ...BASE_BILLS, fuel: 600,  accommodation: 1500, food: 1500, eatingOut: 200, entertainment: 200, passesPermits: 0,   ferries: 0,
    vehicleLicence: 1200, caravanLicence: 300, vehicleInsurance: 1850, caravanInsurance: 1350, roadsideAssist: 400 },
  // Month 9 — December (service month, 31 days, 300km)
  { ...BASE_BILLS, fuel: 180,  accommodation: 1550, food: 1550, eatingOut: 300, entertainment: 200, passesPermits: 0,   ferries: 0,
    vehicleService: 1500, tyresVehicle: 1800, tyresCaravan: 600 },
  // Month 10 — January (31 days, 300km)
  { ...BASE_BILLS, fuel: 180,  accommodation: 1550, food: 1550, eatingOut: 200, entertainment: 150, passesPermits: 0,   ferries: 0 },
  // Month 11 — February (29 days, 300km)
  { ...BASE_BILLS, fuel: 180,  accommodation: 1450, food: 1450, eatingOut: 150, entertainment: 100, passesPermits: 0,   ferries: 0 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildEmptyMonths(): Record<string, Record<string, any>> {
  const m: Record<string, Record<string, any>> = {};
  for (let i = 0; i < 12; i++) m[i] = { ...DEFAULT_MONTHS[i] };
  return m;
}

function sectionTotal(monthData: Record<string, any>, items: { key: string }[]): number {
  return items.reduce((s, i) => s + (Number(monthData?.[i.key]) || 0), 0);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BudgetTab({ tripId }: BudgetTabProps) {
  const { data: budget, isLoading } = useGetBudget(tripId);
  const { data: trip } = useGetTrip(tripId);
  const saveBudget = useSaveBudget();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [budgetData, setBudgetData] = useState<any>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (budget && budget.months && Object.keys(budget.months).length > 0) {
      setBudgetData(budget);
    } else if (!isLoading) {
      setBudgetData({ year: new Date().getFullYear().toString(), months: buildEmptyMonths() });
    }
  }, [budget, isLoading]);

  // Month label helpers
  const monthLabel = (i: number, short = false): string => {
    const base = trip?.startDate ? new Date(trip.startDate) : new Date(2026, 2, 1);
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    return short
      ? d.toLocaleDateString("en-AU", { month: "short" })
      : d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
  };

  const triggerSave = (data: any) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBudget.mutate(
        { tripId, data: { year: data.year, months: data.months } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBudgetQueryKey(tripId) }) }
      );
    }, 1200);
  };

  const handleCellChange = (monthIndex: number, category: string, value: number) => {
    setBudgetData((prev: any) => {
      const newData = { ...prev, months: { ...prev.months } };
      newData.months[monthIndex] = { ...newData.months[monthIndex], [category]: value };
      triggerSave(newData);
      return newData;
    });
  };

  const handleManualSave = () => {
    if (!budgetData) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveBudget.mutate(
      { tripId, data: { year: budgetData.year, months: budgetData.months } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBudgetQueryKey(tripId) });
          toast({ title: "Budget saved" });
        },
      }
    );
  };

  // ── Computed totals ────────────────────────────────────────────────────────

  const computedTotals = useMemo(() => {
    if (!budgetData) return [];
    let balance = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const m = budgetData.months[i] || {};
      const opening = i === 0 ? (Number(m.openingBalance) || 0) : balance;
      const travel  = sectionTotal(m, TRAVEL_EXPENSES);
      const vehicle = sectionTotal(m, VEHICLE_COSTS);
      const fixed   = sectionTotal(m, FIXED_BILLS);
      const annual  = sectionTotal(m, ANNUAL_COSTS);
      const super_  = sectionTotal(m, SUPER_SAVINGS);
      const totalExp = travel + vehicle + fixed + annual + super_;
      const totalInc = sectionTotal(m, INCOME_ITEMS);
      const closing = opening + totalInc - totalExp;
      balance = closing;
      return {
        name: monthLabel(i, true),
        label: monthLabel(i),
        month: i + 1,
        openingBalance: opening,
        travel, vehicle, fixed, annual, super: super_,
        totalExpenses: totalExp,
        totalIncome: totalInc,
        net: totalInc - totalExp,
        closingBalance: closing,
      };
    });
  }, [budgetData, trip]);

  // ── CSV Export ─────────────────────────────────────────────────────────────

  const handleDownloadCSV = () => {
    if (!budgetData) return;
    const headers = ["Category", "Section", ...Array.from({ length: 12 }, (_, i) => monthLabel(i))];
    const rows: string[][] = [headers];
    rows.push(["Opening Balance", "Balance",
      ...Array.from({ length: 12 }, (_, i) => i === 0
        ? String(budgetData.months[0]?.openingBalance || 0)
        : computedTotals[i]?.openingBalance.toFixed(2) || "0"
      )
    ]);
    for (const section of EXPENSE_SECTIONS) {
      for (const cat of section.items) {
        rows.push([cat.label, section.title,
          ...Array.from({ length: 12 }, (_, i) => String(budgetData.months[i]?.[cat.key] || 0))
        ]);
      }
    }
    for (const cat of INCOME_ITEMS) {
      rows.push([cat.label, "Income",
        ...Array.from({ length: 12 }, (_, i) => String(budgetData.months[i]?.[cat.key] || 0))
      ]);
    }
    rows.push(["Total Expenses", "Summary", ...computedTotals.map(t => t.totalExpenses.toFixed(2))]);
    rows.push(["Total Income", "Summary",  ...computedTotals.map(t => t.totalIncome.toFixed(2))]);
    rows.push(["Net Cashflow", "Summary",  ...computedTotals.map(t => t.net.toFixed(2))]);
    rows.push(["Closing Balance", "Summary", ...computedTotals.map(t => t.closingBalance.toFixed(2))]);

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `budget-${budgetData.year}-trip${tripId}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV downloaded" });
  };

  // ── CSV Import ─────────────────────────────────────────────────────────────

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.trim().split("\n").map(l =>
          l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"'))
        );
        const newMonths: Record<string, any> = {};
        for (let i = 0; i < 12; i++) newMonths[i] = { ...DEFAULT_MONTHS[i] };

        for (const row of lines.slice(1)) {
          const label = row[0];
          const cat = ALL_KEYS.find(c => c.label === label);
          if (cat) {
            for (let i = 0; i < 12; i++) {
              const val = parseFloat(row[i + 2]);
              if (!isNaN(val)) newMonths[i][cat.key] = val;
            }
          }
          if (label === "Opening Balance") {
            const val = parseFloat(row[2]);
            if (!isNaN(val)) newMonths[0].openingBalance = val;
          }
        }
        const newData = { ...budgetData, months: newMonths };
        setBudgetData(newData);
        triggerSave(newData);
        toast({ title: "Budget data imported", description: `Loaded ${file.name}` });
      } catch {
        toast({ title: "Import failed — check CSV format", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (isLoading || !budgetData) return <div className="p-8 text-muted-foreground">Loading budget...</div>;

  const totals12 = {
    totalExpenses: computedTotals.reduce((s, t) => s + t.totalExpenses, 0),
    totalIncome:   computedTotals.reduce((s, t) => s + t.totalIncome, 0),
    closingBalance: computedTotals[11]?.closingBalance || 0,
  };

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">12-Month Travel Budget Planner</h2>
        <div className="flex gap-2 flex-wrap">
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={handleManualSave} disabled={saveBudget.isPending}>
            <Save className="mr-1.5 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "12-Month Total Spend", value: `$${totals12.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: "text-destructive" },
          { label: "12-Month Total Income", value: `$${totals12.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-primary" },
          { label: "Projected End Balance", value: `$${totals12.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: totals12.closingBalance < 0 ? "text-destructive" : "text-foreground" },
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

        {/* Stacked expense breakdown */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computedTotals} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 10 }}
                  formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="travel"  name="Travel"   stackId="a" fill="#1f6f5f" />
                <Bar dataKey="vehicle" name="Vehicle"  stackId="a" fill="#d9b880" />
                <Bar dataKey="fixed"   name="Fixed"    stackId="a" fill="#60a5fa" />
                <Bar dataKey="annual"  name="Annual"   stackId="a" fill="#ef4444" />
                <Bar dataKey="super"   name="Super/Sav" stackId="a" fill="#a78bfa" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cashflow balance trend */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Running Balance</CardTitle>
          </CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={computedTotals} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 10 }}
                  formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 2" />
                <Area dataKey="openingBalance" name="Opening" fill="#1f6f5f" fillOpacity={0.08} stroke="#1f6f5f" strokeWidth={1.5} dot={false} />
                <Line dataKey="closingBalance" name="Closing Balance" stroke="#d9b880" strokeWidth={2.5} dot={{ r: 3, fill: "#d9b880" }} />
                <Bar dataKey="net" name="Net" fill="#1f6f5f"
                  radius={[2, 2, 0, 0]}
                  // Conditionally red when negative — recharts uses fixed fill, so we use a colour that works:
                  fillOpacity={0.6}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* ── Income vs Expenses ── */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Income vs Total Expenses</CardTitle>
        </CardHeader>
        <CardContent className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={computedTotals} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 10 }}
                formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Bar dataKey="totalIncome"   name="Income"   fill="#1f6f5f" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
              <Bar dataKey="totalExpenses" name="Expenses" fill="#ef4444" fillOpacity={0.70} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Spreadsheet grid ── */}
      <div className="border border-border rounded-xl bg-card overflow-x-auto">
        <div style={{ minWidth: "1100px" }}>

          {/* Header row */}
          <div className="grid bg-muted/60 border-b border-border font-semibold"
            style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
            <div className="p-3 border-r border-border sticky left-0 bg-muted/60 z-10 text-xs uppercase tracking-wide text-muted-foreground">Category</div>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="p-2 text-center border-r border-border last:border-r-0 text-xs font-bold">
                {monthLabel(i, true)}
                <div className="text-[9px] font-normal text-muted-foreground">
                  {new Date((trip?.startDate ? new Date(trip.startDate) : new Date(2026, 2, 1)).getFullYear(),
                    (trip?.startDate ? new Date(trip.startDate) : new Date(2026, 2, 1)).getMonth() + i, 1)
                    .toLocaleDateString("en-AU", { year: "2-digit" })}
                </div>
              </div>
            ))}
          </div>

          {/* Opening Balance */}
          <div className="grid bg-primary/5 border-b border-border"
            style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
            <div className="p-3 border-r border-border font-bold sticky left-0 bg-card z-10 text-sm">Opening Balance</div>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="p-2 border-r border-border last:border-r-0">
                {i === 0 ? (
                  <input
                    type="number"
                    className="w-full bg-transparent outline-none text-right font-bold text-sm"
                    value={budgetData.months[0]?.openingBalance || 0}
                    onChange={e => handleCellChange(0, "openingBalance", Number(e.target.value))}
                  />
                ) : (
                  <span className="block text-right text-sm font-semibold text-primary">
                    {computedTotals[i]?.openingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Expense sections */}
          {EXPENSE_SECTIONS.map(section => (
            <div key={section.title}>
              <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: section.color }} />
                <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{section.title}</span>
              </div>
              {section.items.map(item => (
                <div key={item.key} className="grid border-b border-border/50 hover:bg-muted/10 transition-colors"
                  style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
                  <div className="p-2.5 border-r border-border text-sm sticky left-0 bg-card z-10">{item.label}</div>
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="p-1.5 border-r border-border last:border-r-0">
                      <input
                        type="number"
                        className="w-full bg-transparent outline-none text-right text-sm"
                        value={budgetData.months[i]?.[item.key] || ""}
                        placeholder="0"
                        onChange={e => handleCellChange(i, item.key, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              ))}
              {/* Section subtotal */}
              <div className="grid bg-muted/20 border-b border-border"
                style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
                <div className="p-2 border-r border-border text-xs font-bold text-muted-foreground sticky left-0 bg-muted/20 z-10 italic">
                  {section.title} Total
                </div>
                {Array.from({ length: 12 }, (_, i) => {
                  const tot = sectionTotal(budgetData.months[i] || {}, section.items);
                  return (
                    <div key={i} className="p-2 border-r border-border last:border-r-0 text-right text-xs font-bold text-muted-foreground">
                      {tot > 0 ? `$${tot.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Total Expenses row */}
          <div className="grid bg-destructive/8 border-b-2 border-border"
            style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
            <div className="p-3 border-r border-border font-bold text-destructive sticky left-0 bg-card z-10">Total Expenses</div>
            {computedTotals.map((t, i) => (
              <div key={i} className="p-2 border-r border-border last:border-r-0 text-right font-bold text-destructive text-sm">
                ${t.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            ))}
          </div>

          {/* Income section */}
          <div>
            <div className="bg-primary/5 px-4 py-2 border-b border-border flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary shrink-0" />
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Income</span>
            </div>
            {INCOME_ITEMS.map(item => (
              <div key={item.key} className="grid border-b border-border/50 hover:bg-muted/10 transition-colors"
                style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
                <div className="p-2.5 border-r border-border text-sm sticky left-0 bg-card z-10">{item.label}</div>
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="p-1.5 border-r border-border last:border-r-0">
                    <input
                      type="number"
                      className="w-full bg-transparent outline-none text-right text-sm"
                      value={budgetData.months[i]?.[item.key] || ""}
                      placeholder="0"
                      onChange={e => handleCellChange(i, item.key, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Total Income */}
          <div className="grid bg-primary/5 border-b border-border"
            style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
            <div className="p-3 border-r border-border font-bold text-primary sticky left-0 bg-card z-10">Total Income</div>
            {computedTotals.map((t, i) => (
              <div key={i} className="p-2 border-r border-border last:border-r-0 text-right font-bold text-primary text-sm">
                ${t.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            ))}
          </div>

          {/* Net Cashflow */}
          <div className="grid border-b border-border bg-muted/20"
            style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
            <div className="p-3 border-r border-border font-bold sticky left-0 bg-muted/20 z-10">Net Cashflow</div>
            {computedTotals.map((t, i) => (
              <div key={i} className={cn("p-2 border-r border-border last:border-r-0 text-right font-bold text-sm",
                t.net < 0 ? "text-destructive" : "text-primary")}>
                {t.net < 0 ? "-" : "+"}${Math.abs(t.net).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            ))}
          </div>

          {/* Closing Balance */}
          <div className="grid border-b-2 border-border bg-muted font-bold"
            style={{ gridTemplateColumns: "220px repeat(12, minmax(80px, 1fr))" }}>
            <div className="p-3 border-r border-border sticky left-0 bg-muted z-10">Closing Balance</div>
            {computedTotals.map((t, i) => (
              <div key={i} className={cn("p-3 border-r border-border last:border-r-0 text-right text-sm",
                t.closingBalance < 0 ? "text-destructive" : "")}>
                ${t.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
