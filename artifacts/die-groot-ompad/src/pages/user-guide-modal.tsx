import React, { useRef } from "react";
import { X, Printer, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Mini layout helpers ───────────────────────────────────────────────────────

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-foreground mt-6 mb-2 border-b border-border pb-1">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mt-4 mb-1">{children}</h3>;
}
function H3sm({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-foreground mt-3 mb-1">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground leading-relaxed mb-2">{children}</p>;
}
function UL({ items }: { items: string[] }) {
  return (
    <ul className="text-xs text-muted-foreground leading-relaxed space-y-0.5 mb-2 pl-4">
      {items.map((item, i) => <li key={i} className="list-disc">{item}</li>)}
    </ul>
  );
}
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-[#b8943e] bg-[#d9b880]/10 border border-[#d9b880]/30 rounded px-2.5 py-1.5 mb-2">
      <span className="font-semibold">Tip: </span>{children}
    </div>
  );
}
function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded px-2.5 py-1.5 mb-2">
      <span className="font-semibold">Important: </span>{children}
    </div>
  );
}

// ── Print template ────────────────────────────────────────────────────────────

const PRINT_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 24px 32px; }
h1 { font-size: 22pt; font-weight: bold; color: #1f6f5f; margin-bottom: 4px; }
.subtitle { font-size: 10pt; color: #666; margin-bottom: 24px; border-bottom: 2px solid #d9b880; padding-bottom: 12px; }
h2 { font-size: 13pt; font-weight: bold; color: #1f6f5f; margin-top: 24px; margin-bottom: 6px; border-bottom: 1px solid #d9b880; padding-bottom: 4px; page-break-after: avoid; }
h3 { font-size: 10.5pt; font-weight: bold; color: #1a1a1a; margin-top: 14px; margin-bottom: 4px; page-break-after: avoid; }
p { font-size: 10pt; color: #333; margin-bottom: 8px; }
ul { font-size: 10pt; color: #333; padding-left: 20px; margin-bottom: 8px; }
li { margin-bottom: 3px; }
.tip { font-size: 9.5pt; color: #8a6020; background: #fdf6e3; border-left: 3px solid #d9b880; padding: 6px 10px; margin: 8px 0; border-radius: 2px; }
.warn { font-size: 9.5pt; color: #b00020; background: #fff5f5; border-left: 3px solid #e00; padding: 6px 10px; margin: 8px 0; border-radius: 2px; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9.5pt; }
th { background: #1f6f5f; color: #f6f1e7; padding: 4px 8px; text-align: left; }
td { border: 1px solid #ddd; padding: 4px 8px; vertical-align: top; }
tr:nth-child(even) td { background: #f9f9f9; }
@media print { body { padding: 0; } }
`;

// ── Main component ────────────────────────────────────────────────────────────

interface UserGuideModalProps {
  onClose: () => void;
}

export default function UserGuideModal({ onClose }: UserGuideModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>Die Groot Ompad — User Guide</title><style>${PRINT_STYLES}</style></head><body><h1>Die Groot Ompad</h1><div class="subtitle">Australia's Big Lap — Travel Command Centre · User Guide</div>${content}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  const navItems = [
    "Dashboard — overview of your trips, cashflow health, and upcoming bookings.",
    "My Trips — create and manage individual trip legs. Each trip has 7 tabs: Planner, Map, Vehicle, Costs, Journal, Analysis, Bookings.",
    "Advance Bookings — manage park and accommodation reservations across the entire lap.",
    "Budget — your 5-year financial command centre with 10 sub-pages.",
    "Rig & Vehicle — global vehicle profile, service history, and weight calculations.",
    "Export Data — download your full dataset as CSV or JSON.",
    "Checklists — pre-departure system checks, packing lists, and annual service reminders.",
  ];

  const subPageItems = [
    "Overview — main 60-month grid with charts, KPI strip, and insights.",
    "Income — enter all income sources (salary, dividends, Centrelink, side income) with forecast and actual columns.",
    "Savings — track your savings pool: opening balance, monthly deposits, and withdrawals.",
    "Tax — estimate your annual Australian income tax liability across all sources.",
    "Rental Property — configure your investment property. Net monthly cashflow is auto-injected into the Rental Net Income row of the main grid.",
    "Trip Planning — allocate monthly travel budgets per trip and track actual spend.",
    "Superannuation — project super balances and model SPA contributions. Monthly SPA amount syncs to the Super SPA Contribution row.",
    "Age Pension — model your Centrelink eligibility using assets and income tests.",
    "Shares — track your share portfolio and project dividend income.",
    "Memberships — catalogue recurring memberships and subscriptions.",
  ];

  const annualItems = [
    "Vehicle Licence (rego): $300–950 depending on state and vehicle mass.",
    "Caravan Licence: $150–350 per year.",
    "Vehicle Insurance: $1,100–2,200 comprehensive. Advise your insurer of the extended drive.",
    "Caravan Insurance: $900–1,800. Ensure on-road collision and accidental damage are included.",
    "Roadside Assistance: $350–500. Ensure unlimited towing distance coverage.",
  ];

  const fuelItems = [
    "15 L/100km — light load, sealed highway (optimistic).",
    "18 L/100km — typical towing on sealed roads.",
    "20 L/100km — heavy load, corrugated tracks, mountain passes (conservative).",
  ];

  const vehicleItems = [
    "GVM — Gross Vehicle Mass: maximum legal weight of the tow vehicle fully loaded.",
    "GCM — Gross Combined Mass: maximum combined weight of tow vehicle + caravan.",
    "Tow Rating: manufacturer's maximum towing capacity. Hard limit — exceeding it voids insurance.",
    "Tow Ball Mass: should be 10% of caravan ATM. Too high causes rear sag; too low causes sway.",
  ];

  const checklistItems = [
    "D-2 Systems — 2 days before departure: check tow vehicle, caravan systems, water, gas, electrics.",
    "Departure Day — morning-of checks: hitching, weight distribution, tyre pressures, emergency kit.",
    "Packing — clothing, kitchen, tools, safety gear, first aid, entertainment.",
    "Annual Service — yearly maintenance tasks for vehicle and caravan.",
  ];

  const dataItems = [
    "Auto-save: every change saves within 600ms.",
    "Hard Save: forces immediate database write — use before closing in low-connectivity areas.",
    "Export Data: download a full JSON or CSV backup from the Export Data page at any time.",
    "Rollback: the platform maintains checkpoints — contact support to restore a previous version if needed.",
  ];

  const bigLapTips = [
    "Go slow — 200–250 km/day is the sweet spot. Fast driving means less time to explore.",
    "Book ahead for school holidays, Easter, and long weekends in popular spots (Margaret River, Airlie Beach, Uluru, Kakadu). Most parks go fully booked 3–6 months out.",
    "Join Wikicamps, CamperMate, or Camp Snapper for free camp locations. Free camping saves $600–1,200/month.",
    "Telstra has the best outback coverage — get a Telstra SIM even if your main plan is on another network.",
    "Starlink Regional: $139–199/month, works throughout most of Australia. Essential for remote work and staying connected.",
    "WA fuel prices are typically 20–40c/litre cheaper than SA and NT outback stations.",
    "Carry 20–30 litres of emergency water in the outback — breakdowns in remote areas without water can be life-threatening.",
    "Travel into the outback outside of the October–March heat window. The Top End and Kimberley are best visited May–September (dry season).",
    "Budget 30% more than you think you'll spend for the first 3 months — the learning curve costs money.",
  ];

  const travelExpenses = [
    ["Fuel", "$600–1,200 (varies with km and road type)"],
    ["Parks & Accommodation", "$675–1,350 (mix of paid + free camps)"],
    ["Food & Groceries", "$700–900 for two adults"],
    ["Eating Out", "$200–400 per month"],
    ["Entertainment & Activities", "$200–500 per month"],
    ["Passes & Permits", "$600–900 total for the full lap"],
    ["Ferries & Transport", "$1,500 total (Tassie + island ferries)"],
  ];

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-border">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-foreground">User Guide — Die Groot Ompad</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="text-xs h-7">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Save as PDF
            </Button>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div ref={printRef} className="space-y-1">

            <H2>Getting Started</H2>
            <P>Die Groot Ompad is your complete Australian Big Lap travel operating system. It manages five interconnected modules: multi-leg trip planning, GPS route logging, vehicle and caravan weight compliance, a 5-year budget covering 60 months, and a weekly travel journal.</P>
            <P>All data is saved to a secure cloud database — your plan survives device changes, browser updates, and connection drops. Use Hard Save before closing the browser if you are in a low-connectivity area.</P>

            <H3>Navigation</H3>
            <UL items={navItems} />

            <H2>Budget Module</H2>
            <P>The Budget module covers 60 months starting March 2026. Every field in the grid can be edited — click any cell and type. Changes auto-save every 600ms. The opening balance for Month 1 is the only value you need to enter manually at the start; all subsequent opening balances are computed from the previous month's closing balance.</P>

            <H3>Sub-pages</H3>
            <P>The Budget has 10 sub-pages accessed from the tab bar. Sub-pages feed data directly into the main 60-month grid:</P>
            <UL items={subPageItems} />

            <H3>Budget Grid Sections</H3>

            <H3sm>Travel Expenses</H3sm>
            <P>Day-to-day costs of life on the road. Budget $3,000–5,000/month for a couple.</P>
            <table className="w-full text-xs border-collapse mb-2">
              <thead>
                <tr>
                  <th className="text-left p-1.5 bg-primary/10 font-semibold text-foreground border border-border">Category</th>
                  <th className="text-left p-1.5 bg-primary/10 font-semibold text-foreground border border-border">Typical Monthly Budget</th>
                </tr>
              </thead>
              <tbody>
                {travelExpenses.map(([cat, budget]) => (
                  <tr key={cat} className="even:bg-muted/20">
                    <td className="p-1.5 border border-border text-muted-foreground">{cat}</td>
                    <td className="p-1.5 border border-border text-muted-foreground">{budget}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <H3sm>Annual — Rego & Insurance</H3sm>
            <P>Enter the cost in the month it falls due. All other months stay $0. These appear as spikes in the monthly expense chart — this is expected.</P>
            <UL items={annualItems} />

            <H3sm>Super & Savings</H3sm>
            <P>Super SPA Contribution is auto-populated from the Superannuation sub-page. Do not enter it manually — update your personal rate in the Superannuation sub-page instead. The Savings rows are manual monthly transfers to named savings accounts.</P>

            <H3>CPI Indexing</H3>
            <P>The CPI Index button applies compound inflation to all expense categories from a chosen start month. Default rate is 2.5% per annum — consistent with the RBA's target band. Set up Year 1 with realistic amounts, then apply CPI to auto-inflate Years 2–5.</P>
            <Tip>Run CPI indexing once, after Year 1 is complete. Re-running it compounds inflation on top of inflation.</Tip>

            <H3>Export and Import</H3>
            <P>Export downloads all 60 months as a CSV file. Open in Excel or Google Sheets to review or edit. Import reads the CSV back — only rows matching known category labels are updated; all other data is preserved.</P>
            <Warn>CSV import overwrites grid values for matching rows. Make a Hard Save before importing as a safety checkpoint.</Warn>

            <H2>Trip Module (My Trips)</H2>
            <P>Each trip is a sequence of legs across Australia. Create a trip from the My Trips page, then use the 7 tabs to plan, track, and document it.</P>

            <H3>Planner Tab</H3>
            <P>Add legs between stops. Each leg has a departure and arrival location, planned km, and optional notes. The Planner calculates fuel estimates across three scenarios:</P>
            <UL items={fuelItems} />
            <Tip>Most dual-cabs towing a 2.5-tonne van on outback corrugated roads consume 22–24 L/100km. Use the 20 L/100km column as your budget figure and treat anything under that as a bonus.</Tip>

            <H3>Map Tab</H3>
            <P>Shows your planned route as stop markers connected by a polyline. GPS tracking can be started from this tab — your actual position is recorded to the database at regular intervals. After completing a leg, review the track before clearing it.</P>
            <Warn>GPS tracking drains battery faster. Connect to a power source (USB or 12V) while actively tracking.</Warn>

            <H3>Vehicle Tab</H3>
            <P>Weight compliance calculator. Enter your tow vehicle's GVM, GCM, tow rating, and current weights (fuel, passengers, gear). The calculator shows whether you are within legal limits.</P>
            <UL items={vehicleItems} />
            <Warn>Exceeding GVM or GCM is a criminal offence in all Australian states. Weigh your loaded rig at a public weighbridge before your first remote leg.</Warn>

            <H3>Costs Tab</H3>
            <P>Record actual spending per leg by category. Compare against your forecast from the Budget grid. Large variances (&gt;20%) signal that your budget needs updating.</P>

            <H3>Journal Tab</H3>
            <P>One entry per week. Capture destinations, weather, highlights, and lessons learned. Entries are timestamped and stored permanently. Write entries on Sunday evening while the week is fresh.</P>

            <H3>Analysis Tab</H3>
            <P>KPI summary: km variance, fuel cost vs estimate, average consumption, and daily burn rate. Use these figures to update the Budget grid's actual columns and calibrate future months.</P>

            <H2>Rig &amp; Vehicle</H2>
            <P>A global profile for your tow vehicle and caravan — separate from any individual trip. Stores specifications, service history, maintenance schedule, and insurance details. The vehicle specs (GVM, GCM, tow rating) feed into the Vehicle tab of each trip for weight compliance calculations.</P>

            <H2>Checklists</H2>
            <UL items={checklistItems} />
            <Tip>Run the D-2 Systems checklist every time you move camp — not just at the start of the trip. A systematic pre-departure check prevents the most common roadside incidents.</Tip>

            <H2>Data Security &amp; Persistence</H2>
            <P>All data is stored in a PostgreSQL database. Access requires Clerk authentication — your data is private and only accessible to your account. Data is persisted across sessions, devices, and browser restarts.</P>
            <UL items={dataItems} />
            <Warn>Your session may expire after extended inactivity. If you see a Sign In prompt, log back in — all data is preserved in the database and will reload automatically.</Warn>

            <H2>Big Lap Planning Tips</H2>
            <UL items={bigLapTips} />

          </div>
        </div>
      </div>
    </div>
  );
}
