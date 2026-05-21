import { useGetVehicleProfile, useSaveVehicleProfile, getGetVehicleProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Save, AlertTriangle, CheckCircle, AlertOctagon,
  Wrench, AlertCircle, Clock, DollarSign, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleTabProps {
  tripId: number;
}

// ── Maintenance Plan Types ──────────────────────────────────────────────────

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
  // Vehicle drivetrain
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
  // Caravan — CRITICAL
  { id: "van_bearings", component: "Caravan Wheel Bearings", category: "caravan", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 320, notes: "CRITICAL. Bearing failure = wheel separation at highway speed. Many blogs recommend 5,000 km on corrugated roads.", priority: "critical" },
  { id: "van_brakes", component: "Caravan Electric Brakes", category: "caravan", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 200, notes: "Adjust and inspect drums, shoes, and magnets every 10,000 km. Check controller gain settings.", priority: "critical" },
  { id: "van_hitch", component: "Hitch Coupling & Jockey Wheel", category: "caravan", intervalKm: 5000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 25, notes: "Grease coupling ball and jockey wheel spindle every 5,000 km. Check coupling wear.", priority: "high" },
  { id: "van_roof_seals", component: "Roof & Window Seals", category: "caravan", intervalKm: 0, intervalMonths: 12, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 150, notes: "Annual inspection before wet season. Water ingress destroys internal lining and structure.", priority: "high" },
  { id: "van_gas", component: "Gas Regulator & Lines", category: "caravan", intervalKm: 0, intervalMonths: 12, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 90, notes: "Annual inspection required by Australian standards (AS 5601). Leaks are fire and explosion risk.", priority: "critical" },
  { id: "van_water", component: "Water Pump & Hoses", category: "caravan", intervalKm: 0, intervalMonths: 12, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 80, notes: "Flush and sanitise annually. Inspect hoses for UV cracking and fittings for weeping.", priority: "medium" },
  // Tyres
  { id: "tyre_vehicle", component: "Tow Vehicle Tyres", category: "tyres", intervalKm: 50000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 1800, notes: "LT-rated (Light Truck) tyres required for towing loads. Check pressure cold every morning on outback roads.", priority: "critical" },
  { id: "tyre_caravan", component: "Caravan Tyres", category: "tyres", intervalKm: 0, intervalMonths: 60, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 900, notes: "Replace at 5 years regardless of tread — UV and ozone crack sidewalls. Never run tyres older than 7 years.", priority: "critical" },
  { id: "tyre_rotation", component: "Tyre Rotation & Balance", category: "tyres", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 80, notes: "Rotate every 10,000 km for even wear. Check wheel alignment after long corrugated road sections.", priority: "medium" },
  // Safety
  { id: "safety_chains", component: "Safety Chains & Breakaway", category: "safety", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 60, notes: "Inspect for corrosion, wear, and secure attachment. Test breakaway battery and brake activation.", priority: "critical" },
  { id: "electrical", component: "Electrical Connections", category: "safety", intervalKm: 10000, lastDoneKm: 0, lastDoneDate: "", estimatedCostAUD: 60, notes: "Check 7-pin plug, Anderson connectors, all earth straps. Vibration causes intermittent faults.", priority: "high" },
];

function loadMaintenance(): { odometer: number; items: MaintenanceItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge saved items with defaults (in case new items added)
      const savedMap = new Map((parsed.items || []).map((i: MaintenanceItem) => [i.id, i]));
      const merged = DEFAULT_ITEMS.map(def => savedMap.get(def.id) ? { ...def, ...(savedMap.get(def.id) as Partial<MaintenanceItem>) } : def);
      return { odometer: parsed.odometer || 0, items: merged };
    }
  } catch {}
  return { odometer: 0, items: DEFAULT_ITEMS };
}

function saveMaintenance(odometer: number, items: MaintenanceItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ odometer, items }));
}

const CATEGORY_LABELS: Record<string, string> = {
  vehicle: "Tow Vehicle",
  caravan: "Caravan",
  tyres: "Tyres",
  safety: "Safety",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-[#d9b880]/15 text-[#b8943e] border-[#d9b880]/30",
  medium: "bg-muted text-muted-foreground border-border",
};

export default function VehicleTab({ tripId }: VehicleTabProps) {
  const { data: profile, isLoading } = useGetVehicleProfile(tripId);
  const saveProfile = useSaveVehicleProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<any>({});
  const [maintOpen, setMaintOpen] = useState(true);
  const [odometer, setOdometer] = useState(0);
  const [maintItems, setMaintItems] = useState<MaintenanceItem[]>(DEFAULT_ITEMS);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  useEffect(() => {
    const saved = loadMaintenance();
    setOdometer(saved.odometer);
    setMaintItems(saved.items);
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveProfile.mutate({ tripId, data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVehicleProfileQueryKey(tripId) });
        toast({ title: "Vehicle profile saved" });
      }
    });
  };

  const handleMaintSave = () => {
    saveMaintenance(odometer, maintItems);
    setEditingId(null);
    toast({ title: "Maintenance plan saved" });
  };

  const updateItem = (id: string, field: keyof MaintenanceItem, value: any) => {
    setMaintItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const markDone = (id: string) => {
    setMaintItems(prev => prev.map(item => item.id === id
      ? { ...item, lastDoneKm: odometer, lastDoneDate: new Date().toISOString().split("T")[0] }
      : item
    ));
    saveMaintenance(odometer, maintItems);
    toast({ title: "Marked as done", description: `at ${odometer.toLocaleString()} km` });
  };

  // Status logic
  const getItemStatus = (item: MaintenanceItem) => {
    if (item.intervalKm > 0) {
      const nextDue = item.lastDoneKm + item.intervalKm;
      const remaining = nextDue - odometer;
      if (remaining <= 0) return { status: "OVERDUE", color: "text-destructive", bg: "bg-destructive/10" };
      if (remaining <= item.intervalKm * 0.1) return { status: "DUE SOON", color: "text-[#b8943e]", bg: "bg-[#d9b880]/15" };
      return { status: "OK", color: "text-primary", bg: "bg-primary/5", nextDueKm: nextDue };
    }
    return { status: "CHECK DATE", color: "text-muted-foreground", bg: "bg-muted" };
  };

  // Cost projection over next 50,000 km
  const costProjection = useMemo(() => {
    const horizon = 50000;
    return maintItems
      .filter(i => i.intervalKm > 0)
      .map(item => {
        const timesIn50k = Math.floor(horizon / item.intervalKm);
        return { component: item.component, times: timesIn50k, total: timesIn50k * item.estimatedCostAUD };
      })
      .filter(i => i.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [maintItems]);

  const totalProjectedCost = costProjection.reduce((s, i) => s + i.total, 0);

  // Due/overdue items for summary
  const urgentItems = maintItems.filter(item => {
    const s = getItemStatus(item);
    return s.status === "OVERDUE" || s.status === "DUE SOON";
  });

  // Weight compliance
  if (isLoading) return <div className="p-8 text-muted-foreground">Loading vehicle data...</div>;

  const kerbWeight = Number(formData.kerbWeight) || 0;
  const payloadPeople = Number(formData.payloadPeople) || 0;
  const payloadFood = Number(formData.payloadFood) || 0;
  const payloadRecovery = Number(formData.payloadRecovery) || 0;
  const payloadTools = Number(formData.payloadTools) || 0;
  const payloadFuel = Number(formData.payloadFuel) || 0;
  const payloadOther = Number(formData.payloadOther) || 0;
  const ballWeight = Number(formData.ballWeight) || 0;
  const gvm = Number(formData.gvm) || 0;
  const gcm = Number(formData.gcm) || 0;
  const towRating = Number(formData.towRating) || 0;
  const caravanAtm = Number(formData.caravanAtm) || 0;
  const totalVehicleMass = kerbWeight + payloadPeople + payloadFood + payloadRecovery + payloadTools + payloadFuel + payloadOther + ballWeight;
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

  const groupedItems = Object.entries(
    maintItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MaintenanceItem[]>)
  );

  return (
    <div className="space-y-6 pb-8">

      {/* ── Rig Specs header ── */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Rig Specifications</h2>
        <Button onClick={handleSave} disabled={saveProfile.isPending}>
          <Save className="mr-2 h-4 w-4" /> Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader><CardTitle>Tow Vehicle</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Vehicle Model</Label>
                <Input value={formData.vehicleModel || ""} onChange={e => handleChange("vehicleModel", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kerb Weight (kg)</Label>
                <Input type="number" value={formData.kerbWeight || ""} onChange={e => handleChange("kerbWeight", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>GVM (kg)</Label>
                <Input type="number" value={formData.gvm || ""} onChange={e => handleChange("gvm", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>GCM (kg)</Label>
                <Input type="number" value={formData.gcm || ""} onChange={e => handleChange("gcm", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Tow Rating (kg)</Label>
                <Input type="number" value={formData.towRating || ""} onChange={e => handleChange("towRating", Number(e.target.value))} />
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
                  <Input type="number" value={formData[field] || ""} onChange={e => handleChange(field, Number(e.target.value))} />
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
                <Input value={formData.caravanModel || ""} onChange={e => handleChange("caravanModel", e.target.value)} />
              </div>
              {[
                { label: "Tare (kg)", field: "caravanTare" },
                { label: "ATM (kg)", field: "caravanAtm" },
                { label: "Ball Weight (kg)", field: "ballWeight" },
                { label: "Water Load (kg)", field: "waterLoad" },
              ].map(({ label, field }) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input type="number" value={formData[field] || ""} onChange={e => handleChange(field, Number(e.target.value))} />
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
                Australian outback-informed service schedule · {urgentItems.length > 0
                  ? <span className="text-destructive font-semibold">{urgentItems.length} action{urgentItems.length > 1 ? "s" : ""} required</span>
                  : "All items current"}
              </p>
            </div>
          </div>
          {maintOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>

        {maintOpen && (
          <div className="p-6 space-y-6 bg-background">

            {/* Odometer + save */}
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
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save Plan
              </Button>
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
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                          onClick={() => markDone(item.id)}>
                          Mark Done
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Per-category item tables */}
            <div className="space-y-6">
              {groupedItems.map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    {CATEGORY_LABELS[category] || category}
                    <span className="h-px flex-1 bg-border" />
                  </h4>
                  <div className="space-y-2">
                    {items.map(item => {
                      const s = getItemStatus(item);
                      const nextDueKm = item.intervalKm > 0 ? item.lastDoneKm + item.intervalKm : null;
                      const kmRemaining = nextDueKm ? nextDueKm - odometer : null;
                      const isEditing = editingId === item.id;
                      return (
                        <div key={item.id} className={cn(
                          "rounded-lg border p-3 transition-colors",
                          s.bg, "border-border/50"
                        )}>
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
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                                {item.intervalKm > 0 && <span>Every {item.intervalKm.toLocaleString()} km</span>}
                                {item.intervalMonths && <span>/ {item.intervalMonths} months</span>}
                                {item.lastDoneKm > 0 && <span>Last: {item.lastDoneKm.toLocaleString()} km</span>}
                                {nextDueKm && <span className="font-medium">Next: {nextDueKm.toLocaleString()} km</span>}
                                {kmRemaining !== null && (
                                  <span className={cn("font-semibold", kmRemaining < 0 ? "text-destructive" : kmRemaining < 1000 ? "text-[#b8943e]" : "text-muted-foreground")}>
                                    {kmRemaining < 0 ? `${Math.abs(kmRemaining).toLocaleString()} km overdue` : `${kmRemaining.toLocaleString()} km remaining`}
                                  </span>
                                )}
                                <span className="flex items-center gap-0.5">
                                  <DollarSign className="h-3 w-3" />{item.estimatedCostAUD}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
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

                          {/* Notes row */}
                          {item.notes && !isEditing && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 border-t border-border/50 pt-1.5">{item.notes}</p>
                          )}

                          {/* Edit panel */}
                          {isEditing && (
                            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-3">
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
                                <Label className="text-[10px]">Est. Cost ($AUD)</Label>
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

            {/* Cost projection table */}
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
              <div className="divide-y divide-border/50">
                {costProjection.slice(0, 10).map(item => (
                  <div key={item.component} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/20">
                    <span className="text-foreground">{item.component}</span>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
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
