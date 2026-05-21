import { useGetGlobalBudget, useSaveGlobalBudget, getGetGlobalBudgetQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSaveContext } from "@/lib/save-context";
import {
  AlertTriangle, CheckCircle, AlertOctagon,
  Wrench, AlertCircle, Clock, DollarSign, ChevronDown, ChevronUp,
  FileText, Shield, Cloud, CloudOff, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckState } from "@/data/checklists";

// ── Annual service checklist → maintenance item mapping ───────────────────────
// Maps maintenance item IDs to Annual Service checklist item IDs.
// If any mapped checklist item is not "yes", the maintenance item gets a flag.
const MAINT_TO_SERVICE: Record<string, string[]> = {
  van_bearings:   ["brg-inspect", "brg-repack", "brg-seals", "brg-wash", "brg-pins", "reg-bearings"],
  van_brakes:     ["brk-magnets", "brk-linings", "brk-adjust", "brk-handbrake", "brk-brakesafe"],
  van_gas:        ["gas-piping", "gas-seals", "gas-cooker", "gas-hws", "gas-anode"],
  van_water:      ["plumb-pump", "plumb-leaks", "plumb-mains", "plumb-underbody", "plumb-flush"],
  tyre_caravan:   ["whl-tread", "whl-torque", "whl-pressure", "whl-balance", "whl-vanwt", "whl-ballwt"],
  van_roof_seals: ["seal-doors", "seal-hatches", "seal-roof", "seal-moisture", "seal-silicone"],
  van_hitch:      ["chs-jockey", "chs-bolts", "chs-adjust", "chs-jacks", "chs-chassis"],
  safety_chains:  ["reg-breakaway", "brk-brakesafe", "brk-alko"],
  electrical:     ["int-rcd", "int-240v-points", "lgt-brakes", "lgt-indicators", "lgt-tail"],
  van_brakes_svc: ["brk-magnets", "brk-linings"],
};

// ── Maintenance Plan ─────────────────────────────────────────────────────────

interface MaintenanceItem {
  id: string;
  component: string;
  category: "vehicle" | "caravan" | "tyres" | "safety";
  intervalKm: number;
  intervalMonths?: number;
  lastDoneKm: number;
  lastDoneDate: string;
  estimatedCostAUD: number;
  notes: string;
  priority: "critical" | "high" | "medium";
}

const STORAGE_KEY = "maintenance_rig_v2";

const DEFAULT_ITEMS: MaintenanceItem[] = [
  { id: "engine_oil", component: "Engine Oil & Filter", category: "vehicle", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 180, notes: "Shorten to 5,000 km on corrugated outback roads. Use manufacturer-spec synthetic diesel oil.", priority: "critical" },
  { id: "air_filter", component: "Air Filter", category: "vehicle", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 45, notes: "Check every 5,000 km in dusty outback. Blocked filter kills fuel economy and power.", priority: "high" },
  { id: "fuel_filter", component: "Fuel Filter", category: "vehicle", intervalKm: 20000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 120, notes: "Poor fuel quality at remote stations. Critical for diesel injection systems.", priority: "high" },
  { id: "transmission", component: "Transmission Fluid", category: "vehicle", intervalKm: 40000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 350, notes: "Towing increases transmission heat — consider servicing earlier.", priority: "high" },
  { id: "diff_rear", component: "Rear Differential Oil", category: "vehicle", intervalKm: 30000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 80, notes: "Change immediately after any water crossing regardless of km.", priority: "high" },
  { id: "diff_front", component: "Front Differential Oil", category: "vehicle", intervalKm: 30000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 80, notes: "Change after water crossings. Includes transfer case if applicable.", priority: "medium" },
  { id: "coolant", component: "Coolant System Flush", category: "vehicle", intervalKm: 40000, intervalMonths: 24, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 120, notes: "Critical in extreme outback heat. Check level daily. Old coolant loses protection fast.", priority: "high" },
  { id: "brake_pads", component: "Brake Pads & Rotors", category: "vehicle", intervalKm: 35000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 650, notes: "Towing dramatically increases brake wear, especially on mountain descents.", priority: "critical" },
  { id: "brake_fluid", component: "Brake Fluid", category: "vehicle", intervalKm: 0, intervalMonths: 24, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 80, notes: "Moisture absorption reduces boiling point — critical when towing on ranges.", priority: "high" },
  { id: "suspension", component: "Suspension & Shock Absorbers", category: "vehicle", intervalKm: 40000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 1200, notes: "Corrugated roads and heavy tow load destroy stock suspension. Upgrade to HD.", priority: "high" },
  { id: "battery_12v", component: "12V Cranking Battery", category: "vehicle", intervalKm: 0, intervalMonths: 36, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 280, notes: "Extreme heat degrades batteries. Test with load tester before remote sections.", priority: "high" },
  { id: "van_bearings", component: "Caravan Wheel Bearings", category: "caravan", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 320, notes: "CRITICAL. Bearing failure = wheel separation at highway speed. Many blogs recommend 5,000 km on corrugated roads.", priority: "critical" },
  { id: "van_brakes", component: "Caravan Electric Brakes", category: "caravan", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 200, notes: "Adjust and inspect drums, shoes, and magnets every 10,000 km. Check controller gain settings.", priority: "critical" },
  { id: "van_hitch", component: "Hitch Coupling & Jockey Wheel", category: "caravan", intervalKm: 5000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 25, notes: "Grease coupling ball and jockey wheel spindle every 5,000 km. Check coupling wear.", priority: "high" },
  { id: "van_roof_seals", component: "Roof & Window Seals", category: "caravan", intervalKm: 0, intervalMonths: 12, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 150, notes: "Annual inspection before wet season. Water ingress destroys internal lining and structure.", priority: "high" },
  { id: "van_gas", component: "Gas Regulator & Lines", category: "caravan", intervalKm: 0, intervalMonths: 12, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 90, notes: "Annual inspection required by Australian standards (AS 5601). Leaks are fire and explosion risk.", priority: "critical" },
  { id: "van_water", component: "Water Pump & Hoses", category: "caravan", intervalKm: 0, intervalMonths: 12, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 80, notes: "Flush and sanitise annually. Inspect hoses for UV cracking and fittings for weeping.", priority: "medium" },
  { id: "tyre_vehicle", component: "Tow Vehicle Tyres", category: "tyres", intervalKm: 50000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 1800, notes: "LT-rated (Light Truck) tyres required for towing loads. Check pressure cold every morning on outback roads.", priority: "critical" },
  { id: "tyre_caravan", component: "Caravan Tyres", category: "tyres", intervalKm: 0, intervalMonths: 60, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 900, notes: "Replace at 5 years regardless of tread — UV and ozone crack sidewalls. Never run tyres older than 7 years.", priority: "critical" },
  { id: "tyre_rotation", component: "Tyre Rotation & Balance", category: "tyres", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 80, notes: "Rotate every 10,000 km for even wear. Check wheel alignment after long corrugated road sections.", priority: "medium" },
  { id: "safety_chains", component: "Safety Chains & Breakaway", category: "safety", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 60, notes: "Inspect for corrosion, wear, and secure attachment. Test breakaway battery and brake activation.", priority: "critical" },
  { id: "electrical", component: "Electrical Connections", category: "safety", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 60, notes: "Check 7-pin plug, Anderson connectors, all earth straps. Vibration causes intermittent faults.", priority: "high" },
];

function loadMaintenance(): { odometer: number; items: MaintenanceItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const savedMap = new Map((parsed.items || []).map((i: MaintenanceItem) => [i.id, i]));
      const merged = DEFAULT_ITEMS.map(def => savedMap.has(def.id) ? { ...def, ...(savedMap.get(def.id) as Partial<MaintenanceItem>) } : def);
      return { odometer: parsed.odometer || 0, items: merged };
    }
  } catch {}
  return { odometer: 0, items: DEFAULT_ITEMS };
}

function saveMaintenance(odometer: number, items: MaintenanceItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ odometer, items }));
}

const CATEGORY_LABELS: Record<string, string> = {
  vehicle: "Tow Vehicle", caravan: "Caravan", tyres: "Tyres", safety: "Safety Systems",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "border-destructive/40 text-destructive bg-destructive/10",
  high: "border-[#d9b880]/40 text-[#b8943e] bg-[#d9b880]/10",
  medium: "border-border text-muted-foreground bg-muted",
};

// ── Docs ─────────────────────────────────────────────────────────────────────

interface VehicleDocs {
  regoNumber: string;
  regoExpiry: string;
  regoRenewalCost: string;
  caravanRegoNumber: string;
  caravanRegoExpiry: string;
  // Driver 1 licence
  licenceName: string;
  licenceNumber: string;
  licenceExpiry: string;
  licenceState: string;
  licenceReplacementCost: string;
  // Driver 2 licence
  licence2Name: string;
  licence2Number: string;
  licence2Expiry: string;
  licence2State: string;
  licence2ReplacementCost: string;
  replacementVehicle: string;
  replacementCaravan: string;
  // Tow vehicle insurance
  insuranceProvider: string;
  insurancePolicy: string;
  insuranceExpiry: string;
  insuranceCost: string;
  // Caravan insurance (separate policy)
  caravanInsuranceProvider: string;
  caravanInsurancePolicy: string;
  caravanInsuranceExpiry: string;
  caravanInsuranceCost: string;
  // Roadside assistance
  roadsideProvider: string;
  roadsidePolicy: string;
  roadsideExpiry: string;
  roadsideCost: string;
  // Payment frequencies
  insuranceFrequency: "monthly" | "yearly";
  caravanInsuranceFrequency: "monthly" | "yearly";
  roadsideFrequency: "monthly" | "yearly";
}

const DOCS_DEFAULTS: VehicleDocs = {
  regoNumber: "", regoExpiry: "", regoRenewalCost: "",
  caravanRegoNumber: "", caravanRegoExpiry: "",
  licenceName: "", licenceNumber: "", licenceExpiry: "", licenceState: "", licenceReplacementCost: "",
  licence2Name: "", licence2Number: "", licence2Expiry: "", licence2State: "", licence2ReplacementCost: "",
  replacementVehicle: "", replacementCaravan: "",
  insuranceProvider: "", insurancePolicy: "", insuranceExpiry: "", insuranceCost: "",
  caravanInsuranceProvider: "", caravanInsurancePolicy: "", caravanInsuranceExpiry: "", caravanInsuranceCost: "",
  roadsideProvider: "", roadsidePolicy: "", roadsideExpiry: "", roadsideCost: "",
  insuranceFrequency: "yearly", caravanInsuranceFrequency: "yearly", roadsideFrequency: "yearly",
};

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function dateAlarm(dateStr: string) {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  if (days < 0) return { label: "EXPIRED", color: "text-destructive", badgeCls: "text-destructive bg-destructive/10 border-destructive/30" };
  if (days <= 30) return { label: `${days}d`, color: "text-destructive", badgeCls: "text-destructive bg-destructive/10 border-destructive/30" };
  if (days <= 60) return { label: `${days}d`, color: "text-[#b8943e]", badgeCls: "text-[#b8943e] bg-[#d9b880]/10 border-[#d9b880]/30" };
  return { label: new Date(dateStr).toLocaleDateString("en-AU", { month: "short", year: "numeric" }), color: "text-primary", badgeCls: "text-primary bg-primary/10 border-primary/20" };
}

// ── Payment frequency toggle ─────────────────────────────────────────────────

function FreqToggle({
  value,
  onChange,
}: {
  value: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
}) {
  return (
    <div className="flex rounded border border-border overflow-hidden text-[11px] font-semibold h-7 shrink-0">
      {(["monthly", "yearly"] as const).map(f => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={cn(
            "px-2.5 capitalize transition-colors",
            value === f
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          )}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

// ── Save indicator ────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
      <Cloud className="h-3.5 w-3.5" /> Saving...
    </div>
  );
  if (state === "saved") return (
    <div className="flex items-center gap-1.5 text-xs text-primary">
      <CheckCircle className="h-3.5 w-3.5" /> Saved
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs text-destructive">
      <CloudOff className="h-3.5 w-3.5" /> Save failed
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VehiclePage() {
  const { data: globalBudget, isLoading } = useGetGlobalBudget();
  const saveBudget = useSaveGlobalBudget();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Record<string, string | number>>({});
  const [docs, setDocs] = useState<VehicleDocs>(DOCS_DEFAULTS);
  const [odometer, setOdometer] = useState(0);
  const [maintItems, setMaintItems] = useState<MaintenanceItem[]>(DEFAULT_ITEMS);
  const [maintOpen, setMaintOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const budgetRef = useRef<any>(null);

  // Refs to track latest state (for force-save without stale closures)
  const profileRef = useRef<Record<string, string | number>>({});
  const docsRef = useRef<VehicleDocs>(DOCS_DEFAULTS);
  const isDirtyRef = useRef(false);

  // Force-save impl (no debounce) — reads from refs so always fresh
  const forceSaveImpl = useRef<() => void>(() => {});

  useEffect(() => {
    forceSaveImpl.current = () => {
      if (!isDirtyRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const base = budgetRef.current ?? {};
      setSaveState("saving");
      saveBudget.mutate(
        {
          data: {
            year: base.year ?? new Date().getFullYear().toString(),
            months: base.months ?? {},
            rental: base.rental,
            super: base.super,
            shares: base.shares,
            income: base.income,
            tax: base.tax,
            vehicleProfile: profileRef.current as Record<string, unknown>,
            vehicleDocs: docsRef.current as unknown as Record<string, unknown>,
          },
        },
        {
          onSuccess: (saved) => {
            budgetRef.current = { ...base, ...saved };
            queryClient.invalidateQueries({ queryKey: getGetGlobalBudgetQueryKey() });
            isDirtyRef.current = false;
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 2500);
          },
          onError: () => setSaveState("error"),
        }
      );
    };
  }, [saveBudget, queryClient]);

  // Register force-save with global SaveContext; flush on page unmount
  const { register, unregister } = useSaveContext();
  const stableSave = useCallback(() => forceSaveImpl.current(), []);
  useEffect(() => {
    register(stableSave);
    return () => {
      // Flush any unsaved changes when navigating away
      if (isDirtyRef.current) forceSaveImpl.current();
      unregister();
    };
  }, [register, unregister, stableSave]);

  useEffect(() => {
    if (globalBudget) {
      budgetRef.current = globalBudget;
      if (globalBudget.vehicleProfile && typeof globalBudget.vehicleProfile === "object") {
        const p = globalBudget.vehicleProfile as Record<string, string | number>;
        setProfile(p);
        profileRef.current = p;
      }
      if (globalBudget.vehicleDocs && typeof globalBudget.vehicleDocs === "object") {
        const d = { ...DOCS_DEFAULTS, ...(globalBudget.vehicleDocs as Partial<VehicleDocs>) };
        setDocs(d);
        docsRef.current = d;
      }
    }
  }, [globalBudget]);

  useEffect(() => {
    const { odometer: od, items } = loadMaintenance();
    setOdometer(od);
    setMaintItems(items);
  }, []);

  const triggerSave = (newProfile: Record<string, string | number>, newDocs: VehicleDocs) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(() => {
      const base = budgetRef.current ?? {};
      saveBudget.mutate(
        {
          data: {
            year: base.year ?? new Date().getFullYear().toString(),
            months: base.months ?? {},
            rental: base.rental,
            super: base.super,
            shares: base.shares,
            income: base.income,
            tax: base.tax,
            vehicleProfile: newProfile as Record<string, unknown>,
            vehicleDocs: newDocs as unknown as Record<string, unknown>,
          },
        },
        {
          onSuccess: (saved) => {
            budgetRef.current = { ...base, ...saved };
            queryClient.invalidateQueries({ queryKey: getGetGlobalBudgetQueryKey() });
            isDirtyRef.current = false;
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 2500);
          },
          onError: () => {
            setSaveState("error");
          },
        }
      );
    }, 800);
  };

  const handleProfileChange = (field: string, value: string | number) => {
    setProfile(prev => {
      const next = { ...prev, [field]: value };
      profileRef.current = next;
      isDirtyRef.current = true;
      triggerSave(next, docsRef.current);
      return next;
    });
  };

  const handleDocsChange = (patch: Partial<VehicleDocs>) => {
    setDocs(prev => {
      const next = { ...prev, ...patch };
      docsRef.current = next;
      isDirtyRef.current = true;
      triggerSave(profileRef.current, next);
      return next;
    });
  };

  const handleMaintSave = () => {
    saveMaintenance(odometer, maintItems);
    toast({ title: "Maintenance plan saved" });
  };

  const updateItem = (id: string, field: keyof MaintenanceItem, value: string | number) => {
    setMaintItems(items => items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const markDone = (id: string) => {
    setMaintItems(items => items.map(i => i.id === id
      ? { ...i, lastDoneKm: odometer, lastDoneDate: new Date().toISOString().split("T")[0] }
      : i
    ));
    toast({ title: "Marked done at current odometer" });
  };

  const getItemStatus = (item: MaintenanceItem): { status: string; color: string; bg: string } => {
    if (item.intervalKm > 0) {
      const nextDue = item.lastDoneKm + item.intervalKm;
      const remaining = nextDue - odometer;
      if (remaining < 0) return { status: "OVERDUE", color: "text-destructive", bg: "bg-destructive/5" };
      if (remaining < 1000) return { status: "DUE SOON", color: "text-[#b8943e]", bg: "bg-[#d9b880]/5" };
    }
    return { status: "OK", color: "text-primary", bg: "" };
  };

  const urgentItems = maintItems.filter(item => {
    const s = getItemStatus(item);
    return s.status === "OVERDUE" || s.status === "DUE SOON";
  });

  const costProjection = useMemo(() => {
    return maintItems
      .filter(i => i.intervalKm > 0)
      .map(i => ({
        component: i.component,
        times: Math.floor(50000 / i.intervalKm),
        total: Math.floor(50000 / i.intervalKm) * i.estimatedCostAUD,
      }))
      .sort((a, b) => b.total - a.total);
  }, [maintItems]);

  const totalProjectedCost = costProjection.reduce((s, i) => s + i.total, 0);

  const gvm = Number(profile.gvm || 0);
  const gcm = Number(profile.gcm || 0);
  const towRating = Number(profile.towRating || 0);
  const kerbWeight = Number(profile.kerbWeight || 0);
  const payloadTotal = ["payloadPeople", "payloadFood", "payloadRecovery", "payloadTools", "payloadFuel", "payloadOther"]
    .reduce((s, k) => s + Number(profile[k] || 0), 0);
  const totalVehicleMass = kerbWeight + payloadTotal;
  const caravanAtm = Number(profile.caravanAtm || 0);
  const combinedMass = totalVehicleMass + caravanAtm;

  const getStatus = (value: number, limit: number) => {
    if (!limit) return { status: "—", icon: null, color: "text-muted-foreground" };
    const ratio = value / limit;
    if (ratio > 1) return { status: "DANGER", icon: <AlertOctagon className="h-4 w-4" />, color: "text-destructive" };
    if (ratio > 0.9) return { status: "WARN", icon: <AlertTriangle className="h-4 w-4" />, color: "text-yellow-500" };
    return { status: "OK", icon: <CheckCircle className="h-4 w-4" />, color: "text-primary" };
  };

  const gvmStatus = getStatus(totalVehicleMass, gvm);
  const gcmStatus = getStatus(combinedMass, gcm);
  const towStatus = getStatus(caravanAtm, towRating);

  // ── Service checklist flags ──────────────────────────────────────────────
  const serviceCheckState = ((globalBudget?.checklists as any)?.service ?? {}) as Record<string, CheckState>;

  function getServiceFlag(maintId: string): "ok" | "pending" | "no" | null {
    const items = MAINT_TO_SERVICE[maintId];
    if (!items?.length) return null;
    const states = items.map(id => serviceCheckState[id]);
    if (states.some(s => s === "no")) return "no";
    if (states.some(s => !s)) return "pending";
    return "ok";
  }

  // ── Insurance → Budget sync ──────────────────────────────────────────────
  function syncInsuranceToBudget(
    budgetKey: "vehicleInsurance" | "caravanInsurance" | "roadsideAssistance",
    cost: string,
    frequency: "monthly" | "yearly",
    targetMonth = 8,
  ) {
    const base = budgetRef.current ?? {};
    const months = { ...((base.months ?? {}) as Record<string, any>) };
    const amount = Number(cost) || 0;

    if (frequency === "monthly") {
      // Spread the monthly amount across all 60 budget months
      for (let i = 0; i < 60; i++) {
        months[i.toString()] = {
          ...(months[i.toString()] ?? {}),
          [budgetKey]: amount,
        };
      }
    } else {
      // Lump-sum into the single target month
      months[targetMonth.toString()] = {
        ...(months[targetMonth.toString()] ?? {}),
        [budgetKey]: amount,
      };
    }

    saveBudget.mutate(
      {
        data: {
          year: base.year ?? new Date().getFullYear().toString(),
          months: months as any,
          rental: base.rental,
          super: base.super,
          shares: base.shares,
          income: base.income,
          tax: base.tax,
          vehicleProfile: base.vehicleProfile as Record<string, unknown>,
          vehicleDocs: base.vehicleDocs as Record<string, unknown>,
        },
      },
      {
        onSuccess: (saved) => {
          budgetRef.current = { ...base, ...saved };
          queryClient.invalidateQueries({ queryKey: getGetGlobalBudgetQueryKey() });
          const msg = frequency === "monthly"
            ? `$${amount.toLocaleString()}/mo synced to all 60 budget months`
            : `$${amount.toLocaleString()} synced to Budget Month ${targetMonth + 1}`;
          toast({ title: msg });
        },
        onError: () => toast({ title: "Sync failed", variant: "destructive" }),
      }
    );
  }

  const groupedItems = Object.entries(
    maintItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MaintenanceItem[]>)
  );

  const docAlarms = [
    { label: "Vehicle Rego", date: docs.regoExpiry },
    { label: "Caravan Rego", date: docs.caravanRegoExpiry },
    { label: "Driver 1 Licence", date: docs.licenceExpiry },
    { label: "Driver 2 Licence", date: docs.licence2Expiry },
    { label: "Vehicle Insurance", date: docs.insuranceExpiry },
    { label: "Caravan Insurance", date: docs.caravanInsuranceExpiry },
    { label: "Roadside Assistance", date: docs.roadsideExpiry },
  ].filter(a => a.date && daysUntil(a.date) <= 60);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading rig profile...</div>;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rig &amp; Vehicle</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Permanent rig profile — tow vehicle, caravan, weight compliance, maintenance schedule
          </p>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader><CardTitle>Tow Vehicle</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Vehicle Model</Label>
                <Input value={String(profile.vehicleModel || "")} onChange={e => handleProfileChange("vehicleModel", e.target.value)} placeholder="e.g. Toyota LandCruiser 300 Series" />
              </div>
              <div className="space-y-2">
                <Label>Kerb Weight (kg)</Label>
                <Input type="number" value={profile.kerbWeight || ""} onChange={e => handleProfileChange("kerbWeight", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>GVM (kg)</Label>
                <Input type="number" value={profile.gvm || ""} onChange={e => handleProfileChange("gvm", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>GCM (kg)</Label>
                <Input type="number" value={profile.gcm || ""} onChange={e => handleProfileChange("gcm", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Tow Rating (kg)</Label>
                <Input type="number" value={profile.towRating || ""} onChange={e => handleProfileChange("towRating", Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader><CardTitle>Payload Items (Vehicle)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {[
                { label: "People (kg)", field: "payloadPeople" },
                { label: "Food/Water (kg)", field: "payloadFood" },
                { label: "Recovery Gear (kg)", field: "payloadRecovery" },
                { label: "Tools (kg)", field: "payloadTools" },
                { label: "Fuel (kg)", field: "payloadFuel" },
                { label: "Other (kg)", field: "payloadOther" },
              ].map(({ label, field }) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input type="number" value={profile[field] || ""} onChange={e => handleProfileChange(field, Number(e.target.value))} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader><CardTitle>Caravan</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Caravan Model</Label>
                <Input value={String(profile.caravanModel || "")} onChange={e => handleProfileChange("caravanModel", e.target.value)} placeholder="e.g. Jayco Silverline 21.65-4" />
              </div>
              {[
                { label: "Tare (kg)", field: "caravanTare" },
                { label: "ATM (kg)", field: "caravanAtm" },
                { label: "Ball Weight (kg)", field: "ballWeight" },
                { label: "Water Load (kg)", field: "waterLoad" },
              ].map(({ label, field }) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input type="number" value={profile[field] || ""} onChange={e => handleProfileChange(field, Number(e.target.value))} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary">Weight Compliance Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "GVM", sub: "Total Vehicle Mass", value: totalVehicleMass, limit: gvm, st: gvmStatus },
                { label: "GCM", sub: "Combined Mass", value: combinedMass, limit: gcm, st: gcmStatus },
                { label: "Tow Rating", sub: "Caravan ATM", value: caravanAtm, limit: towRating, st: towStatus },
              ].map(({ label, sub, value, limit, st }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-card rounded-md border border-border">
                  <div>
                    <span className="font-semibold text-foreground">{label}</span>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{value} / {limit} kg</span>
                    <div className={cn("flex items-center gap-1 font-bold text-sm w-20 justify-end", st.color)}>
                      {st.icon} {st.status}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Registration, Licensing & Insurance ─────────────────────────────── */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-muted/30 px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Registration, Licensing &amp; Insurance</h3>
            {docAlarms.length > 0 && (
              <p className="text-xs text-destructive font-medium mt-0.5">
                {docAlarms.length} document{docAlarms.length > 1 ? "s" : ""} expiring within 60 days
              </p>
            )}
          </div>
          <SaveIndicator state={saveState} />
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Vehicle + Licence */}
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Tow Vehicle Registration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Rego Plate</Label>
                  <Input value={docs.regoNumber} onChange={e => handleDocsChange({ regoNumber: e.target.value })} placeholder="1ABC234" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Rego Expiry
                    {dateAlarm(docs.regoExpiry) && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", dateAlarm(docs.regoExpiry)!.badgeCls)}>
                        {dateAlarm(docs.regoExpiry)!.label}
                      </span>
                    )}
                  </Label>
                  <Input type="date" value={docs.regoExpiry} onChange={e => handleDocsChange({ regoExpiry: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Replacement Value ($)</Label>
                  <Input value={docs.replacementVehicle} onChange={e => handleDocsChange({ replacementVehicle: e.target.value })} placeholder="85000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Rego Renewal Cost ($)</Label>
                  <Input value={docs.regoRenewalCost} onChange={e => handleDocsChange({ regoRenewalCost: e.target.value })} placeholder="850" />
                </div>
              </div>
            </div>

            {/* Driver 1 Licence */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Driver 1 Licence</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={docs.licenceName} onChange={e => handleDocsChange({ licenceName: e.target.value })} placeholder="Driver 1 name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Licence Number</Label>
                  <Input value={docs.licenceNumber} onChange={e => handleDocsChange({ licenceNumber: e.target.value })} placeholder="Licence #" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Expiry
                    {dateAlarm(docs.licenceExpiry) && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", dateAlarm(docs.licenceExpiry)!.badgeCls)}>
                        {dateAlarm(docs.licenceExpiry)!.label}
                      </span>
                    )}
                  </Label>
                  <Input type="date" value={docs.licenceExpiry} onChange={e => handleDocsChange({ licenceExpiry: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Issuing State</Label>
                  <Input value={docs.licenceState} onChange={e => handleDocsChange({ licenceState: e.target.value })} placeholder="WA, NSW, QLD..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Replacement Cost ($)</Label>
                  <Input value={docs.licenceReplacementCost} onChange={e => handleDocsChange({ licenceReplacementCost: e.target.value })} placeholder="35" />
                </div>
              </div>
            </div>

            {/* Driver 2 Licence */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Driver 2 Licence</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={docs.licence2Name} onChange={e => handleDocsChange({ licence2Name: e.target.value })} placeholder="Driver 2 name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Licence Number</Label>
                  <Input value={docs.licence2Number} onChange={e => handleDocsChange({ licence2Number: e.target.value })} placeholder="Licence #" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Expiry
                    {dateAlarm(docs.licence2Expiry) && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", dateAlarm(docs.licence2Expiry)!.badgeCls)}>
                        {dateAlarm(docs.licence2Expiry)!.label}
                      </span>
                    )}
                  </Label>
                  <Input type="date" value={docs.licence2Expiry} onChange={e => handleDocsChange({ licence2Expiry: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Issuing State</Label>
                  <Input value={docs.licence2State} onChange={e => handleDocsChange({ licence2State: e.target.value })} placeholder="WA, NSW, QLD..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Replacement Cost ($)</Label>
                  <Input value={docs.licence2ReplacementCost} onChange={e => handleDocsChange({ licence2ReplacementCost: e.target.value })} placeholder="35" />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Caravan + Insurance */}
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Caravan Registration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Caravan Rego Plate</Label>
                  <Input value={docs.caravanRegoNumber} onChange={e => handleDocsChange({ caravanRegoNumber: e.target.value })} placeholder="5XYZ789" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Caravan Rego Expiry
                    {dateAlarm(docs.caravanRegoExpiry) && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", dateAlarm(docs.caravanRegoExpiry)!.badgeCls)}>
                        {dateAlarm(docs.caravanRegoExpiry)!.label}
                      </span>
                    )}
                  </Label>
                  <Input type="date" value={docs.caravanRegoExpiry} onChange={e => handleDocsChange({ caravanRegoExpiry: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Caravan Replacement Value ($)</Label>
                  <Input value={docs.replacementCaravan} onChange={e => handleDocsChange({ replacementCaravan: e.target.value })} placeholder="95000" />
                </div>
              </div>
            </div>

            {/* Tow Vehicle Insurance */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Tow Vehicle Insurance
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Provider</Label>
                  <Input value={docs.insuranceProvider} onChange={e => handleDocsChange({ insuranceProvider: e.target.value })} placeholder="NRMA, Shannons, Allianz…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Policy Number / Name</Label>
                  <Input value={docs.insurancePolicy} onChange={e => handleDocsChange({ insurancePolicy: e.target.value })} placeholder="Policy #" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Expiry
                    {dateAlarm(docs.insuranceExpiry) && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", dateAlarm(docs.insuranceExpiry)!.badgeCls)}>
                        {dateAlarm(docs.insuranceExpiry)!.label}
                      </span>
                    )}
                  </Label>
                  <Input type="date" value={docs.insuranceExpiry} onChange={e => handleDocsChange({ insuranceExpiry: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center justify-between">
                    <span>{docs.insuranceFrequency === "monthly" ? "Monthly Premium ($)" : "Annual Premium ($)"}</span>
                    <FreqToggle value={docs.insuranceFrequency ?? "yearly"} onChange={v => handleDocsChange({ insuranceFrequency: v })} />
                  </Label>
                  <Input value={docs.insuranceCost} onChange={e => handleDocsChange({ insuranceCost: e.target.value })} placeholder={docs.insuranceFrequency === "monthly" ? "200" : "2400"} />
                </div>
              </div>
              {docs.insuranceCost && Number(docs.insuranceCost) > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => syncInsuranceToBudget("vehicleInsurance", docs.insuranceCost, docs.insuranceFrequency ?? "yearly")}>
                    <ArrowRight className="h-3 w-3" />
                    {docs.insuranceFrequency === "monthly"
                      ? `Sync $${Number(docs.insuranceCost).toLocaleString()}/mo to all months`
                      : `Sync $${Number(docs.insuranceCost).toLocaleString()} to Budget Month 9`}
                  </Button>
                  {docs.insuranceProvider && (
                    <span className="text-[10px] text-muted-foreground">{docs.insuranceProvider}{docs.insurancePolicy ? ` · ${docs.insurancePolicy}` : ""}</span>
                  )}
                </div>
              )}
            </div>

            {/* Caravan Insurance */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Caravan Insurance
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Provider</Label>
                  <Input value={docs.caravanInsuranceProvider} onChange={e => handleDocsChange({ caravanInsuranceProvider: e.target.value })} placeholder="Caravan Cover, NRMA…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Policy Number / Name</Label>
                  <Input value={docs.caravanInsurancePolicy} onChange={e => handleDocsChange({ caravanInsurancePolicy: e.target.value })} placeholder="Policy #" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Expiry
                    {dateAlarm(docs.caravanInsuranceExpiry) && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", dateAlarm(docs.caravanInsuranceExpiry)!.badgeCls)}>
                        {dateAlarm(docs.caravanInsuranceExpiry)!.label}
                      </span>
                    )}
                  </Label>
                  <Input type="date" value={docs.caravanInsuranceExpiry} onChange={e => handleDocsChange({ caravanInsuranceExpiry: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center justify-between">
                    <span>{docs.caravanInsuranceFrequency === "monthly" ? "Monthly Premium ($)" : "Annual Premium ($)"}</span>
                    <FreqToggle value={docs.caravanInsuranceFrequency ?? "yearly"} onChange={v => handleDocsChange({ caravanInsuranceFrequency: v })} />
                  </Label>
                  <Input value={docs.caravanInsuranceCost} onChange={e => handleDocsChange({ caravanInsuranceCost: e.target.value })} placeholder={docs.caravanInsuranceFrequency === "monthly" ? "150" : "1800"} />
                </div>
              </div>
              {docs.caravanInsuranceCost && Number(docs.caravanInsuranceCost) > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => syncInsuranceToBudget("caravanInsurance", docs.caravanInsuranceCost, docs.caravanInsuranceFrequency ?? "yearly")}>
                    <ArrowRight className="h-3 w-3" />
                    {docs.caravanInsuranceFrequency === "monthly"
                      ? `Sync $${Number(docs.caravanInsuranceCost).toLocaleString()}/mo to all months`
                      : `Sync $${Number(docs.caravanInsuranceCost).toLocaleString()} to Budget Month 9`}
                  </Button>
                  {docs.caravanInsuranceProvider && (
                    <span className="text-[10px] text-muted-foreground">{docs.caravanInsuranceProvider}{docs.caravanInsurancePolicy ? ` · ${docs.caravanInsurancePolicy}` : ""}</span>
                  )}
                </div>
              )}
            </div>
            {/* Roadside Assistance */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Roadside Assistance
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Provider</Label>
                  <Input value={docs.roadsideProvider} onChange={e => handleDocsChange({ roadsideProvider: e.target.value })} placeholder="NRMA, RACQ, RAA, RACV…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Membership / Policy Number</Label>
                  <Input value={docs.roadsidePolicy} onChange={e => handleDocsChange({ roadsidePolicy: e.target.value })} placeholder="Membership #" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    Renewal Date
                    {dateAlarm(docs.roadsideExpiry) && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", dateAlarm(docs.roadsideExpiry)!.badgeCls)}>
                        {dateAlarm(docs.roadsideExpiry)!.label}
                      </span>
                    )}
                  </Label>
                  <Input type="date" value={docs.roadsideExpiry} onChange={e => handleDocsChange({ roadsideExpiry: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center justify-between">
                    <span>{docs.roadsideFrequency === "monthly" ? "Monthly Cost ($)" : "Annual Cost ($)"}</span>
                    <FreqToggle value={docs.roadsideFrequency ?? "yearly"} onChange={v => handleDocsChange({ roadsideFrequency: v })} />
                  </Label>
                  <Input value={docs.roadsideCost} onChange={e => handleDocsChange({ roadsideCost: e.target.value })} placeholder={docs.roadsideFrequency === "monthly" ? "21" : "250"} />
                </div>
              </div>
              {docs.roadsideCost && Number(docs.roadsideCost) > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => syncInsuranceToBudget("roadsideAssistance", docs.roadsideCost, docs.roadsideFrequency ?? "yearly")}>
                    <ArrowRight className="h-3 w-3" />
                    {docs.roadsideFrequency === "monthly"
                      ? `Sync $${Number(docs.roadsideCost).toLocaleString()}/mo to all months`
                      : `Sync $${Number(docs.roadsideCost).toLocaleString()} to Budget Month 9`}
                  </Button>
                  {docs.roadsideProvider && (
                    <span className="text-[10px] text-muted-foreground">{docs.roadsideProvider}{docs.roadsidePolicy ? ` · ${docs.roadsidePolicy}` : ""}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document alarm banner */}
        {docAlarms.length > 0 && (
          <div className="mx-6 mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-destructive flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-3.5 w-3.5" /> Documents Expiring Soon
            </p>
            <div className="space-y-1">
              {docAlarms.map(a => {
                const alarm = dateAlarm(a.date)!;
                return (
                  <div key={a.label} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{a.label}</span>
                    <span className={cn("text-xs font-bold", alarm.color)}>{alarm.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Maintenance Planner ── */}
      <div className="border-2 border-[#d9b880]/40 rounded-xl overflow-hidden">
        <button
          onClick={() => setMaintOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-card to-[#d9b880]/10 hover:bg-[#d9b880]/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#d9b880]/20">
              <Wrench className="h-5 w-5 text-[#b8943e]" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-foreground">Preventative Maintenance Planner</h3>
              <p className="text-xs text-muted-foreground">
                Australian outback-informed service schedule ·{" "}
                {urgentItems.length > 0
                  ? <span className="text-destructive font-semibold">{urgentItems.length} action{urgentItems.length > 1 ? "s" : ""} required</span>
                  : "All items current"}
              </p>
            </div>
          </div>
          {maintOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>

        {maintOpen && (
          <div className="p-6 space-y-6 bg-background">

            {/* Odometer */}
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide">Current Odometer (km)</Label>
                <Input
                  type="number"
                  value={odometer}
                  onChange={e => setOdometer(Number(e.target.value))}
                  className="w-44"
                  placeholder="e.g. 142500"
                />
              </div>
              <Button size="sm" onClick={handleMaintSave} className="mb-0.5">
                Save Plan
              </Button>
              <p className="text-xs text-muted-foreground mb-0.5">Maintenance data is stored locally on this device</p>
            </div>

            {/* Urgent alerts */}
            {urgentItems.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Action Required
                </p>
                {urgentItems.map(item => {
                  const s = getItemStatus(item);
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className={cn("font-medium", s.color)}>{item.component}</span>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-bold", s.color)}>{s.status}</span>
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => markDone(item.id)}>
                          Mark Done
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Per-category */}
            <div className="space-y-6">
              {groupedItems.map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    {CATEGORY_LABELS[category] || category}
                    <span className="h-px flex-1 bg-border" />
                  </h4>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {items.map(item => {
                      const s = getItemStatus(item);
                      const nextDueKm = item.intervalKm > 0 ? item.lastDoneKm + item.intervalKm : null;
                      const kmRemaining = nextDueKm ? nextDueKm - odometer : null;
                      const isEditing = editingId === item.id;
                      return (
                        <div key={item.id} className={cn("rounded-lg border p-3 transition-colors", s.bg, "border-border/50")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-foreground">{item.component}</span>
                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", PRIORITY_COLOR[item.priority])}>
                                  {item.priority.toUpperCase()}
                                </span>
                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", s.color, s.bg, "border-current/20")}>
                                  {s.status}
                                </span>
                                {/* Annual service checklist flag */}
                                {(() => {
                                  const flag = getServiceFlag(item.id);
                                  if (!flag || flag === "ok") return null;
                                  if (flag === "no") return (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-destructive/40 text-destructive bg-destructive/10">
                                      SERVICE: NO
                                    </span>
                                  );
                                  return (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#d9b880]/50 text-[#b8943e] bg-[#d9b880]/10">
                                      SERVICE DUE
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                {item.intervalKm > 0 && <span>Every {item.intervalKm.toLocaleString()} km</span>}
                                {item.intervalMonths && <span>/ {item.intervalMonths} mo</span>}
                                {item.lastDoneKm > 0 && <span>Last: {item.lastDoneKm.toLocaleString()} km</span>}
                                {nextDueKm && <span className="font-medium">Next: {nextDueKm.toLocaleString()} km</span>}
                                {kmRemaining !== null && (
                                  <span className={cn("font-semibold", kmRemaining < 0 ? "text-destructive" : kmRemaining < 1000 ? "text-[#b8943e]" : "text-muted-foreground")}>
                                    {kmRemaining < 0 ? `${Math.abs(kmRemaining).toLocaleString()} km overdue` : `${kmRemaining.toLocaleString()} km left`}
                                  </span>
                                )}
                                <span className="flex items-center gap-0.5">
                                  <DollarSign className="h-3 w-3" />{item.estimatedCostAUD}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                                onClick={() => setEditingId(isEditing ? null : item.id)}>
                                {isEditing ? "Close" : "Edit"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() => markDone(item.id)}>
                                Done
                              </Button>
                            </div>
                          </div>

                          {item.notes && !isEditing && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 border-t border-border/50 pt-1.5 leading-relaxed">{item.notes}</p>
                          )}

                          {isEditing && (
                            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px]">Last Done (km)</Label>
                                <Input type="number" className="h-7 text-xs"
                                  value={item.lastDoneKm}
                                  onChange={e => updateItem(item.id, "lastDoneKm", Number(e.target.value))} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Last Done Date</Label>
                                <Input type="date" className="h-7 text-xs"
                                  value={item.lastDoneDate}
                                  onChange={e => updateItem(item.id, "lastDoneDate", e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Interval (km)</Label>
                                <Input type="number" className="h-7 text-xs"
                                  value={item.intervalKm}
                                  onChange={e => updateItem(item.id, "intervalKm", Number(e.target.value))} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Est. Cost ($)</Label>
                                <Input type="number" className="h-7 text-xs"
                                  value={item.estimatedCostAUD}
                                  onChange={e => updateItem(item.id, "estimatedCostAUD", Number(e.target.value))} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Cost projection */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">50,000 km Cost Projection</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  Total: ${totalProjectedCost.toLocaleString()} AUD
                </span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 divide-border/50">
                {costProjection.slice(0, 14).map(item => (
                  <div key={item.component} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/20 border-b border-border/30">
                    <span className="text-foreground">{item.component}</span>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{item.times}× services</span>
                      <span className="font-semibold text-foreground w-20 text-right">${item.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
