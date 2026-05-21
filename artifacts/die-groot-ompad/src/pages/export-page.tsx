import { useGetGlobalBudget, useListTrips } from "@workspace/api-client-react";
import { ALL_CHECKLISTS, type CheckState } from "@/data/checklists";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Table2, Truck, ClipboardCheck, Home, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Budget categories (mirrors budget-page.tsx) ───────────────────────────────

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

const ALL_BUDGET_KEYS = [
  { key: "openingBalance", label: "Opening Balance", section: "Balance" },
  ...TRAVEL_EXPENSES.map(i => ({ ...i, section: "Travel & Road" })),
  ...VEHICLE_COSTS.map(i => ({ ...i, section: "Vehicle & Rig" })),
  ...FIXED_BILLS.map(i => ({ ...i, section: "Fixed Bills" })),
  ...ANNUAL_COSTS.map(i => ({ ...i, section: "Annual — Rego & Insurance" })),
  ...SUPER_SAVINGS.map(i => ({ ...i, section: "Super & Savings" })),
  ...INCOME_ITEMS.map(i => ({ ...i, section: "Income" })),
];

const BUDGET_BASE = new Date(2026, 2, 1);

function monthLabel(i: number): string {
  const d = new Date(BUDGET_BASE.getFullYear(), BUDGET_BASE.getMonth() + i, 1);
  return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map(row => row.map(csvEscape).join(",")).join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content, ""], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ts(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Export functions ──────────────────────────────────────────────────────────

function exportBudgetCSV(budget: any) {
  if (!budget?.months) return;
  const headers = ["Month", "Period", "Section", "Category", "Amount"];
  const rows: (string | number)[][] = [headers];
  const months = budget.months as Record<string, Record<string, unknown>>;
  for (let i = 0; i < 60; i++) {
    const m = months[i.toString()] ?? months[i] ?? {};
    for (const { key, label, section } of ALL_BUDGET_KEYS) {
      const val = Number(m[key] ?? 0);
      if (val !== 0) {
        rows.push([`Month ${i + 1}`, monthLabel(i), section, label, val]);
      }
    }
  }
  downloadCSV(`dgo-budget-${ts()}.csv`, toCSV(rows));
}

function exportVehicleCSV(budget: any) {
  const profile = (budget?.vehicleProfile ?? {}) as Record<string, unknown>;
  const docs = (budget?.vehicleDocs ?? {}) as Record<string, unknown>;

  const rows: (string | number | boolean | null | undefined)[][] = [
    ["Section", "Field", "Value"],
    ["Tow Vehicle", "Model", profile.vehicleModel as string],
    ["Tow Vehicle", "Kerb Weight (kg)", profile.kerbWeight as number],
    ["Tow Vehicle", "GVM (kg)", profile.gvm as number],
    ["Tow Vehicle", "GCM (kg)", profile.gcm as number],
    ["Tow Vehicle", "Tow Rating (kg)", profile.towRating as number],
    ["Payload", "People (kg)", profile.payloadPeople as number],
    ["Payload", "Food/Water (kg)", profile.payloadFood as number],
    ["Payload", "Recovery Gear (kg)", profile.payloadRecovery as number],
    ["Payload", "Tools (kg)", profile.payloadTools as number],
    ["Payload", "Fuel (kg)", profile.payloadFuel as number],
    ["Payload", "Other (kg)", profile.payloadOther as number],
    ["Caravan", "Model", profile.caravanModel as string],
    ["Caravan", "Tare (kg)", profile.caravanTare as number],
    ["Caravan", "ATM (kg)", profile.caravanAtm as number],
    ["Caravan", "Ball Weight (kg)", profile.ballWeight as number],
    ["Caravan", "Water Load (kg)", profile.waterLoad as number],
    ["Rego — Vehicle", "Plate", docs.regoNumber as string],
    ["Rego — Vehicle", "Expiry", docs.regoExpiry as string],
    ["Rego — Vehicle", "Renewal Cost ($)", docs.regoRenewalCost as string],
    ["Rego — Vehicle", "Replacement Value ($)", docs.replacementVehicle as string],
    ["Rego — Caravan", "Plate", docs.caravanRegoNumber as string],
    ["Rego — Caravan", "Expiry", docs.caravanRegoExpiry as string],
    ["Rego — Caravan", "Replacement Value ($)", docs.replacementCaravan as string],
    ["Driver's Licence", "Number", docs.licenceNumber as string],
    ["Driver's Licence", "Expiry", docs.licenceExpiry as string],
    ["Driver's Licence", "State", docs.licenceState as string],
    ["Insurance — Tow Vehicle", "Provider", docs.insuranceProvider as string],
    ["Insurance — Tow Vehicle", "Policy #", docs.insurancePolicy as string],
    ["Insurance — Tow Vehicle", "Expiry", docs.insuranceExpiry as string],
    ["Insurance — Tow Vehicle", "Annual Premium ($)", docs.insuranceCost as string],
    ["Insurance — Caravan", "Provider", docs.caravanInsuranceProvider as string],
    ["Insurance — Caravan", "Policy #", docs.caravanInsurancePolicy as string],
    ["Insurance — Caravan", "Expiry", docs.caravanInsuranceExpiry as string],
    ["Insurance — Caravan", "Annual Premium ($)", docs.caravanInsuranceCost as string],
  ];
  downloadCSV(`dgo-vehicle-${ts()}.csv`, toCSV(rows));
}

function exportChecklistsCSV(budget: any) {
  const allState = ((budget?.checklists ?? {}) as Record<string, Record<string, CheckState>>);
  const rows: (string | number | null | undefined)[][] = [
    ["Checklist", "Section", "Item ID", "Item Label", "Critical", "State"],
  ];
  for (const cl of ALL_CHECKLISTS) {
    const state = allState[cl.id] ?? {};
    for (const section of cl.sections) {
      for (const item of section.items) {
        rows.push([
          cl.title,
          section.title,
          item.id,
          item.label,
          item.critical ? "YES" : "",
          state[item.id] ?? "unchecked",
        ]);
      }
    }
  }
  downloadCSV(`dgo-checklists-${ts()}.csv`, toCSV(rows));
}

function exportRentalCSV(budget: any) {
  const r = (budget?.rental ?? {}) as Record<string, unknown>;
  const rows: (string | number | null | undefined)[][] = [
    ["Field", "Value"],
    ["Address", r.address as string],
    ["Purchase Price ($)", r.purchasePrice as number],
    ["Current Market Value ($)", r.currentValue as number],
    ["Year Built", r.yearBuilt as number],
    ["Construction Cost ($)", r.constructionCost as number],
    ["Property Structure", "Main dwelling rented to tenants; granny flat is owner's residence"],
    ["Lease Signing Date (SISNING)", r.leaseSigningDate as string],
    ["Weekly Rent ($)", r.weeklyRent as number],
    ["Vacancy Weeks", r.vacancyWeeks as number],
    ["Council Rates ($)", r.councilRates as number],
    ["Water Rates ($)", r.waterRates as number],
    ["Landlord Insurance ($) — Main Dwelling", r.landlordInsurance as number],
    ["Landlord Insurance Policy", r.landlordInsurancePolicy as string],
    ["Owner's Insurance ($) — Granny Flat", r.ownersInsurance as number],
    ["Owner's Insurance Policy", r.ownersInsurancePolicy as string],
    ["Strata Levies ($)", r.strataLevies as number],
    ["Land Tax ($)", r.landTax as number],
    ["Management Fee Rate (%)", r.managementFeeRate as number],
    ["Letting Fee (weeks)", r.lettingFeeWeeks as number],
    ["Repairs ($)", r.repairs as number],
    ["Advertising ($)", r.advertising as number],
    ["Accounting Fees ($)", r.accountingFees as number],
    ["Legal Fees ($)", r.legalFees as number],
    ["Bank Charges ($)", r.bankCharges as number],
    ["Loan Balance ($)", r.loanBalance as number],
    ["Interest Rate (%)", r.interestRate as number],
    ["Div 43 Annual ($)", r.div43Annual as number],
    ["Div 40 Annual ($)", r.div40Annual as number],
    ["Marginal Tax Rate (%)", r.marginalTaxRate as number],
  ];
  downloadCSV(`dgo-rental-${ts()}.csv`, toCSV(rows));
}

function exportTripsCSV(trips: any[]) {
  if (!trips?.length) return;
  const rows: (string | number | null | undefined)[][] = [
    ["Trip ID", "Name", "Description", "Start Date", "End Date", "Total Distance (km)", "Status", "Created At"],
    ...trips.map((t: any) => [
      t.id, t.name, t.description, t.startDate, t.endDate,
      t.totalDistanceKm, t.status, t.createdAt,
    ]),
  ];
  downloadCSV(`dgo-trips-${ts()}.csv`, toCSV(rows));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExportPage() {
  const { data: budget, isLoading: budgetLoading } = useGetGlobalBudget();
  const { data: trips, isLoading: tripsLoading } = useListTrips();
  const { toast } = useToast();

  const isLoading = budgetLoading || tripsLoading;

  function run(label: string, fn: () => void) {
    fn();
    toast({ title: `${label} downloaded` });
  }

  function exportAll() {
    exportBudgetCSV(budget);
    setTimeout(() => exportVehicleCSV(budget), 200);
    setTimeout(() => exportChecklistsCSV(budget), 400);
    setTimeout(() => exportRentalCSV(budget), 600);
    if (trips?.length) setTimeout(() => exportTripsCSV(trips as any[]), 800);
    toast({ title: "All exports downloading…", description: "Check your Downloads folder for 4–5 CSV files" });
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading data for export…</div>;

  const EXPORTS = [
    {
      label: "Budget — 60 Month Grid",
      description: "All 60 months, every expense and income category. Opens in Excel or Numbers.",
      icon: Table2,
      color: "#1f6f5f",
      fn: () => exportBudgetCSV(budget),
      detail: `${Object.keys(budget?.months ?? {}).length} months · ${ALL_BUDGET_KEYS.length} categories`,
    },
    {
      label: "Vehicle & Rig Profile",
      description: "Tow vehicle weights, caravan specs, insurance policies, registration, licence details.",
      icon: Truck,
      color: "#d9b880",
      fn: () => exportVehicleCSV(budget),
      detail: "Vehicle profile + all documents",
    },
    {
      label: "Checklists — All 4",
      description: "Every checklist item across D-2 Systems, Departure Day, Packing, and Annual Service with YES/NO/N/A state.",
      icon: ClipboardCheck,
      color: "#7c3aed",
      fn: () => exportChecklistsCSV(budget),
      detail: `${ALL_CHECKLISTS.reduce((s, cl) => s + cl.sections.reduce((ss, sec) => ss + sec.items.length, 0), 0)} items across ${ALL_CHECKLISTS.length} checklists`,
    },
    {
      label: "Rental Property Analysis",
      description: "Property details, income, all expense categories, insurance policies, depreciation, lease signing date.",
      icon: Home,
      color: "#ef4444",
      fn: () => exportRentalCSV(budget),
      detail: "Full rental P&L + owner details",
    },
    {
      label: "Trips Summary",
      description: "All trip records — name, dates, distance, status.",
      icon: Map,
      color: "#0ea5e9",
      fn: () => exportTripsCSV(trips as any[] ?? []),
      detail: `${(trips as any[])?.length ?? 0} trip${(trips as any[])?.length !== 1 ? "s" : ""}`,
      disabled: !(trips as any[])?.length,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Export</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Download your Die Groot Ompad data as CSV files — open in Excel, Numbers, or Google Sheets
          </p>
        </div>
        <Button onClick={exportAll} size="lg" className="gap-2">
          <Download className="h-4 w-4" />
          Export All ({EXPORTS.filter(e => !e.disabled).length} files)
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          About CSV exports
        </p>
        <p>
          All files include a UTF-8 BOM for correct character encoding when opened in Excel.
          Dates are in ISO format (YYYY-MM-DD). Monetary values are unformatted numbers (no dollar signs) for easy calculation.
          Your data is downloaded directly from your account — nothing is sent to any third party.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORTS.map((exp) => {
          const Icon = exp.icon;
          return (
            <Card key={exp.label} className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md" style={{ background: exp.color + "20" }}>
                    <Icon className="h-4 w-4" style={{ color: exp.color }} />
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground">{exp.label}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">{exp.description}</p>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{exp.detail}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    style={{ borderColor: exp.color + "60", color: exp.color }}
                    disabled={exp.disabled}
                    onClick={() => run(exp.label, exp.fn)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-foreground">What each file contains</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-1">Budget Grid CSV</p>
              <p>One row per non-zero entry: Month number, period label, expense section, category name, and dollar amount. Covers all 60 months of travel, vehicle, fixed bills, annual costs, super/savings, and income.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Vehicle & Rig CSV</p>
              <p>Three-column format (Section, Field, Value) covering tow vehicle specs, payload items, caravan specs, registration plates and expiry dates, driver's licence, and both vehicle and caravan insurance policies.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Checklists CSV</p>
              <p>One row per checklist item across all four checklists. Columns: checklist name, section, item ID, item label, critical flag, and your current YES/NO/N/A state. Import into any spreadsheet to track progress over time.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Rental Property CSV</p>
              <p>All rental property configuration: address, property structure (granny flat vs main dwelling), lease signing date, income, all expense categories, landlord and owner's insurance policies, financing, and depreciation parameters.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
