import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Zap, Battery, Sun, ArrowRight, Upload, FileText, Trash2, Plus,
  ChevronDown, ChevronUp, Settings, Cpu, Plug, CircuitBoard, Gauge,
  Cloud, CloudOff, Save, QrCode, ExternalLink, Camera, Key, User, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGetGlobalBudget, useSaveGlobalBudget, getGetGlobalBudgetQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSaveContext } from "@/lib/save-context";
import jsQR from "jsqr";

// ── Types ──────────────────────────────────────────────────────────────────────

type Chemistry = "LiFePO4" | "AGM" | "Gel" | "Lead-Acid";

interface BatteryConfig {
  label: string;
  chemistry: Chemistry;
  capacityAh: number;
  voltageNominal: number;
  maxChargeV: number;
  minDischargeV: number;
  maxDischargeDod: number;
  model: string;
  serialNumber: string;
  installDate: string;
  notes: string;
}

interface SolarPanel {
  label: string;
  wattPeak: number;
  voc: number;
  isc: number;
  vmp: number;
  imp: number;
  model: string;
  serialNumber: string;
  inputIndex: number;
}

interface SolarInput {
  label: string;
  mpptModel: string;
  mpptSerial: string;
  maxVoc: number;
  maxCurrentA: number;
  pdfName: string;
  pdfData: string;
  notes: string;
}

interface VictronDevice {
  id: string;
  deviceName: string;
  type: string;
  model: string;
  partNumber: string;
  serialNumber: string;
  firmwareVersion: string;
  location: string;
  bluetoothPin: string;
  bluetoothPuk: string;
  qrCodeUrl: string;
  devicePhotoData: string;
  devicePhotoName: string;
  absorptionV: string;
  floatV: string;
  maxCurrentA: string;
  pdfName: string;
  pdfData: string;
  notes: string;
}

interface JBProBMS {
  id: string;
  location: string;
  model: string;
  serialNumber: string;
  cellCount: number;
  capacityAh: number;
  balanceV: number;
  ovProtectionV: number;
  uvProtectionV: number;
  maxChargeA: number;
  maxDischargeA: number;
  pdfName: string;
  pdfData: string;
  notes: string;
}

interface UtilityDevice {
  label: string;
  powerW: number;
  estimatedHoursPerDay: number;
  notes: string;
}

interface DcDcConverter {
  model: string;
  serialNumber: string;
  inputVoltage: number;
  outputVoltage: number;
  maxCurrentA: number;
  pdfName: string;
  pdfData: string;
  notes: string;
}

interface JayoBMS {
  model: string;
  serialNumber: string;
  cellCount: number;
  capacityAh: number;
  maxChargeA: number;
  pdfName: string;
  pdfData: string;
  notes: string;
}

interface SubPowerBoard {
  model: string;
  serialNumber: string;
  maxAmps: number;
  circuits: number;
  notes: string;
}

interface ComputerController {
  model: string;
  serialNumber: string;
  powerW: number;
  notes: string;
}

interface SafetyDevice {
  model: string;
  serialNumber: string;
  notes: string;
}

interface PowerConfig {
  vehicleBatteries: BatteryConfig[];
  caravanBatteries: BatteryConfig[];
  solarInputs: SolarInput[];
  solarPanels: SolarPanel[];
  victronDevices: VictronDevice[];
  jbproBms: JBProBMS[];
  dcDcConverter: DcDcConverter;
  jayoBms: JayoBMS;
  subPowerBoard: SubPowerBoard;
  computerController: ComputerController;
  swayCommand: SafetyDevice;
  towSecure: SafetyDevice;
  brakeController: SafetyDevice;
  utilities12v: UtilityDevice[];
  peakSunHours: number;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_BATTERY: BatteryConfig = {
  label: "Battery", chemistry: "LiFePO4", capacityAh: 100, voltageNominal: 12.8,
  maxChargeV: 14.6, minDischargeV: 11.0, maxDischargeDod: 80,
  model: "", serialNumber: "", installDate: "", notes: "",
};

const DEFAULT_SOLAR_INPUT: SolarInput = {
  label: "Solar Input", mpptModel: "", mpptSerial: "", maxVoc: 0, maxCurrentA: 0,
  pdfName: "", pdfData: "", notes: "",
};

const DEFAULT_SOLAR_PANEL: SolarPanel = {
  label: "Panel", wattPeak: 0, voc: 0, isc: 0, vmp: 0, imp: 0,
  model: "", serialNumber: "", inputIndex: 0,
};

const DEFAULT_VICTRON: VictronDevice = {
  id: crypto.randomUUID(), deviceName: "", type: "MPPT", model: "",
  partNumber: "", serialNumber: "", firmwareVersion: "", location: "Caravan",
  bluetoothPin: "", bluetoothPuk: "", qrCodeUrl: "",
  devicePhotoData: "", devicePhotoName: "",
  absorptionV: "14.4", floatV: "13.8", maxCurrentA: "",
  pdfName: "", pdfData: "", notes: "",
};

const VICTRON_BMV712: VictronDevice = {
  id: crypto.randomUUID(), deviceName: "Maisha", type: "BMV Battery Monitor",
  model: "BMV-712 BLACK Smart", partNumber: "BAM030712200", serialNumber: "HQ2519NHK33",
  firmwareVersion: "", location: "Caravan", bluetoothPin: "066252", bluetoothPuk: "5CA54EFF3139",
  qrCodeUrl: "", devicePhotoData: "", devicePhotoName: "",
  absorptionV: "14.6", floatV: "13.8", maxCurrentA: "",
  pdfName: "", pdfData: "",
  notes: "Battery voltage, current and state-of-charge monitor. Bluetooth via VictronConnect app.",
};

const VICTRON_SMARTSOLAR: VictronDevice = {
  id: crypto.randomUUID(), deviceName: "External Input", type: "SmartSolar MPPT",
  model: "SmartSolar MPPT 100/50", partNumber: "SCC110050210", serialNumber: "HQ2547GJHCF",
  firmwareVersion: "", location: "Caravan", bluetoothPin: "558688", bluetoothPuk: "537680A71137",
  qrCodeUrl: "", devicePhotoData: "", devicePhotoName: "",
  absorptionV: "14.6", floatV: "13.8", maxCurrentA: "50",
  pdfName: "", pdfData: "",
  notes: "External MPPT input. Accepts portable panels: UTE 250W (car roof) and XTM 200W foldable blanket. Can charge car or caravan batteries.",
};

const VICTRON_SMARTSOLAR_ROOF: VictronDevice = {
  id: crypto.randomUUID(), deviceName: "Caravan Roof", type: "SmartSolar MPPT",
  model: "SmartSolar MPPT 100/50", partNumber: "SCC110050210", serialNumber: "",
  firmwareVersion: "", location: "Caravan", bluetoothPin: "", bluetoothPuk: "",
  qrCodeUrl: "", devicePhotoData: "", devicePhotoName: "",
  absorptionV: "14.6", floatV: "13.8", maxCurrentA: "50",
  pdfName: "", pdfData: "",
  notes: "MPPT controller for fixed caravan roof panels. Connected to Jayco Large 1 + Jayco Large 2 (400W total). Max PV input 100V, 50A output.",
};

const VICTRON_SMARTSHUNT_500: VictronDevice = {
  id: crypto.randomUUID(), deviceName: "Vehicle Monitor", type: "SmartShunt",
  model: "SmartShunt 500A/50mV", partNumber: "SHU050210050", serialNumber: "",
  firmwareVersion: "", location: "Tow Vehicle", bluetoothPin: "", bluetoothPuk: "",
  qrCodeUrl: "", devicePhotoData: "", devicePhotoName: "",
  absorptionV: "14.4", floatV: "13.8", maxCurrentA: "500",
  pdfName: "", pdfData: "",
  notes: "500A battery monitor shunt for tow vehicle dual battery bank. Measures SoC%, current, and voltage. Installs on battery negative terminal. Bluetooth via VictronConnect.",
};

const VICTRON_ORION_XS: VictronDevice = {
  id: crypto.randomUUID(), deviceName: "Car Input", type: "Orion-Tr DC-DC",
  model: "Orion XS 12/12-50A DC-DC Battery Charger", partNumber: "ORI121217050", serialNumber: "HQ2529MAN2K",
  firmwareVersion: "", location: "Caravan", bluetoothPin: "767024", bluetoothPuk: "41A455135811",
  qrCodeUrl: "", devicePhotoData: "", devicePhotoName: "",
  absorptionV: "14.6", floatV: "13.8", maxCurrentA: "50",
  pdfName: "", pdfData: "",
  notes: "50A DC-DC charger. Charges caravan battery from tow vehicle alternator. Smart alternator compatible.",
};

const VICTRON_ORION_TR: VictronDevice = {
  id: crypto.randomUUID(), deviceName: "Computer", type: "Orion-Tr DC-DC",
  model: "Orion-Tr 12/24-10A Isolated DC-DC Converter (240W)", partNumber: "ORI122424110", serialNumber: "HQ2447HUHUU",
  firmwareVersion: "", location: "Caravan", bluetoothPin: "", bluetoothPuk: "",
  qrCodeUrl: "", devicePhotoData: "", devicePhotoName: "",
  absorptionV: "28.8", floatV: "27.6", maxCurrentA: "10",
  pdfName: "", pdfData: "",
  notes: "Isolated 12V to 24V DC-DC converter, 240W. Powers 24V equipment from 12V caravan battery. Galvanic isolation.",
};

const DEFAULT_JBPRO: JBProBMS = {
  id: crypto.randomUUID(), location: "Caravan", model: "JBProBMS", serialNumber: "",
  cellCount: 4, capacityAh: 100, balanceV: 3.5, ovProtectionV: 3.65, uvProtectionV: 2.8,
  maxChargeA: 100, maxDischargeA: 200, pdfName: "", pdfData: "", notes: "",
};

const BMPRO_JD35D: JBProBMS = {
  id: crypto.randomUUID(), location: "Caravan",
  model: "BMPRO J35D",
  serialNumber: "",
  cellCount: 4, capacityAh: 100,
  balanceV: 3.50, ovProtectionV: 3.65, uvProtectionV: 2.80,
  maxChargeA: 35, maxDischargeA: 200,
  pdfName: "", pdfData: "",
  notes: "35A DC-DC charger + solar MPPT + BMS. Supports LiFePO4 (4S). Input: 9–32V DC. Pairs with ControlNODE, PX Gateway and JCONTROL display.",
};

const BMPRO_CONTROLNODE: JBProBMS = {
  id: crypto.randomUUID(), location: "Caravan",
  model: "BMPRO ControlNODE",
  serialNumber: "",
  cellCount: 0, capacityAh: 0,
  balanceV: 0, ovProtectionV: 0, uvProtectionV: 0,
  maxChargeA: 0, maxDischargeA: 0,
  pdfName: "", pdfData: "",
  notes: "Wireless remote control node for BMPRO power system. Connects to J35D via CAN bus. Enables remote monitoring and control.",
};

const BMPRO_PXSHUNT500: JBProBMS = {
  id: crypto.randomUUID(), location: "Caravan",
  model: "BMPRO PXShunt500",
  serialNumber: "",
  cellCount: 0, capacityAh: 0,
  balanceV: 0, ovProtectionV: 0, uvProtectionV: 0,
  maxChargeA: 0, maxDischargeA: 500,
  pdfName: "", pdfData: "",
  notes: "500A current shunt for precision battery monitoring. Measures charge/discharge current for accurate state-of-charge. Wired between battery negative and loads.",
};

const BMPRO_GATEWAY: JBProBMS = {
  id: crypto.randomUUID(), location: "Caravan",
  model: "BMPRO PX Gateway",
  serialNumber: "",
  cellCount: 0, capacityAh: 0,
  balanceV: 0, ovProtectionV: 0, uvProtectionV: 0,
  maxChargeA: 0, maxDischargeA: 0,
  pdfName: "", pdfData: "",
  notes: "Wi-Fi / Bluetooth gateway for BMPRO system. Connects BMPRO ecosystem to the Journey app for remote monitoring, alerts, and firmware updates.",
};

const BMPRO_JCONTROL: JBProBMS = {
  id: crypto.randomUUID(), location: "Caravan",
  model: "BMPRO JCONTROL",
  serialNumber: "",
  cellCount: 0, capacityAh: 0,
  balanceV: 0, ovProtectionV: 0, uvProtectionV: 0,
  maxChargeA: 0, maxDischargeA: 0,
  pdfName: "", pdfData: "",
  notes: "Touchscreen control panel and display for BMPRO J35D system. Shows battery voltage, SoC%, charge current, solar input, and system alerts.",
};

const DEFAULT_UTILITY: UtilityDevice = {
  label: "12V Appliance", powerW: 0, estimatedHoursPerDay: 0, notes: "",
};

const DEFAULT_CONFIG: PowerConfig = {
  vehicleBatteries: [
    { ...DEFAULT_BATTERY, label: "Vehicle Battery 1" },
    { ...DEFAULT_BATTERY, label: "Vehicle Battery 2" },
    { ...DEFAULT_BATTERY, label: "Vehicle Battery 3" },
  ],
  caravanBatteries: [
    { ...DEFAULT_BATTERY, label: "Caravan Battery 1", capacityAh: 200 },
    { ...DEFAULT_BATTERY, label: "Caravan Battery 2", capacityAh: 200 },
    { ...DEFAULT_BATTERY, label: "Caravan Battery 3", capacityAh: 200 },
  ],
  solarInputs: [
    { ...DEFAULT_SOLAR_INPUT, label: "Solar Input 1" },
    { ...DEFAULT_SOLAR_INPUT, label: "Solar Input 2" },
    { ...DEFAULT_SOLAR_INPUT, label: "Solar Input 3" },
  ],
  solarPanels: [
    { ...DEFAULT_SOLAR_PANEL, label: "Jayco Small 1",  wattPeak: 160, model: "Jayco 160W Fixed",   inputIndex: 0 },
    { ...DEFAULT_SOLAR_PANEL, label: "Jayco Small 2",  wattPeak: 160, model: "Jayco 160W Fixed",   inputIndex: 0 },
    { ...DEFAULT_SOLAR_PANEL, label: "Jayco Large 1",  wattPeak: 200, model: "Jayco 200W Fixed",   inputIndex: 0 },
    { ...DEFAULT_SOLAR_PANEL, label: "Jayco Large 2",  wattPeak: 200, model: "Jayco 200W Fixed",   inputIndex: 0 },
    { ...DEFAULT_SOLAR_PANEL, label: "UTE (Car Roof)", wattPeak: 250, model: "Flexible 250W",      inputIndex: 1 },
    { ...DEFAULT_SOLAR_PANEL, label: "XTM Blanket",    wattPeak: 200, model: "XTM 200W Foldable",  inputIndex: 1 },
  ],
  victronDevices: [
    { ...VICTRON_BMV712,         id: crypto.randomUUID() },
    { ...VICTRON_SMARTSHUNT_500, id: crypto.randomUUID() },
    { ...VICTRON_SMARTSOLAR_ROOF, id: crypto.randomUUID() }, // MPPT 0 — Caravan Roof (inputIndex 0)
    { ...VICTRON_SMARTSOLAR,     id: crypto.randomUUID() },  // MPPT 1 — External Input (inputIndex 1)
    { ...VICTRON_ORION_XS,       id: crypto.randomUUID() },
    { ...VICTRON_ORION_TR,       id: crypto.randomUUID() },
  ],
  jbproBms: [
    { ...BMPRO_JD35D,       id: crypto.randomUUID() },
    { ...BMPRO_CONTROLNODE, id: crypto.randomUUID() },
    { ...BMPRO_PXSHUNT500,  id: crypto.randomUUID() },
    { ...BMPRO_GATEWAY,     id: crypto.randomUUID() },
    { ...BMPRO_JCONTROL,    id: crypto.randomUUID() },
  ],
  dcDcConverter: {
    model: "BMPRO J35D (DC-DC channel)", serialNumber: "", inputVoltage: 12, outputVoltage: 12,
    maxCurrentA: 35, pdfName: "", pdfData: "",
    notes: "DC-DC charging channel of the integrated J35D unit. 35A, 9–32V input.",
  },
  jayoBms: {
    model: "BMPRO J35D", serialNumber: "", cellCount: 4, capacityAh: 100,
    maxChargeA: 35, pdfName: "", pdfData: "",
    notes: "Integrated Jayco/BMPRO BMS + 35A DC-DC + solar MPPT. LiFePO4 4S. OV: 3.65V, UV: 2.8V, balance: 3.50V.",
  },
  subPowerBoard: { model: "", serialNumber: "", maxAmps: 100, circuits: 8, notes: "" },
  computerController: { model: "BMPRO JCONTROL", serialNumber: "", powerW: 5, notes: "BMPRO touchscreen control panel. ~5W standby draw." },
  swayCommand: {
    model: "BMPRO SwayCommand",
    serialNumber: "",
    notes: "Integrated caravan sway detection and correction system. Works in conjunction with the electric brake controller to apply independent caravan brakes when sway is detected. Mounts inside the caravan.",
  },
  towSecure: {
    model: "TOW-SECURE Breakaway System",
    serialNumber: "",
    notes: "12V breakaway battery and activation system. Automatically applies caravan brakes if the caravan separates from the tow vehicle. Battery requires annual charge check. Lanyard connects to tow ball mount.",
  },
  brakeController: {
    model: "REDARC Tow-Pro Elite",
    serialNumber: "",
    notes: "Electric brake controller. Supports up to 4 axles with electric or electric-over-hydraulic brakes. Proportional (inertia) or user-controlled modes. Mounts in vehicle cabin. Part: EBRH-TPELITEV4.",
  },
  utilities12v: Array.from({ length: 6 }, (_, i) => ({ ...DEFAULT_UTILITY, label: `Utility ${i + 1}` })),
  peakSunHours: 5.5,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeCfg(raw: unknown): PowerConfig {
  try {
    const parsed = (raw ?? {}) as Partial<PowerConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      vehicleBatteries: parsed.vehicleBatteries?.length ? parsed.vehicleBatteries : DEFAULT_CONFIG.vehicleBatteries,
      caravanBatteries: parsed.caravanBatteries?.length ? parsed.caravanBatteries : DEFAULT_CONFIG.caravanBatteries,
      solarInputs: parsed.solarInputs?.length ? parsed.solarInputs : DEFAULT_CONFIG.solarInputs,
      solarPanels: parsed.solarPanels?.length ? parsed.solarPanels : DEFAULT_CONFIG.solarPanels,
      victronDevices: parsed.victronDevices?.length ? parsed.victronDevices : DEFAULT_CONFIG.victronDevices,
      jbproBms: parsed.jbproBms?.length ? parsed.jbproBms : DEFAULT_CONFIG.jbproBms,
      utilities12v: parsed.utilities12v?.length ? parsed.utilities12v : DEFAULT_CONFIG.utilities12v,
      swayCommand: parsed.swayCommand ?? DEFAULT_CONFIG.swayCommand,
      towSecure: parsed.towSecure ?? DEFAULT_CONFIG.towSecure,
      brakeController: parsed.brakeController ?? DEFAULT_CONFIG.brakeController,
    };
  } catch { return DEFAULT_CONFIG; }
}

type SaveState = "idle" | "saving" | "saved" | "error";

const fmt = (n: number, decimals = 0) =>
  n.toLocaleString("en-AU", { maximumFractionDigits: decimals });

const usableAh = (bat: BatteryConfig) =>
  bat.capacityAh * (bat.maxDischargeDod / 100);

const CHEMISTRY_COLORS: Record<Chemistry, string> = {
  "LiFePO4":   "text-primary border-primary/40 bg-primary/8",
  "AGM":       "text-[#b8943e] border-[#b8943e]/40 bg-[#b8943e]/8",
  "Gel":       "text-blue-600 border-blue-600/40 bg-blue-600/8",
  "Lead-Acid": "text-muted-foreground border-border bg-muted/30",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className="py-2.5 px-4 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>}
    </Card>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-[11px] text-muted-foreground w-36 shrink-0">{label}</Label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function TF({ value, onChange, placeholder, type = "text", unit }: {
  value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; unit?: string;
}) {
  const [local, setLocal] = useState(() => String(value ?? ""));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocal(String(value ?? "")); }, [value]);
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type={type} value={local} placeholder={placeholder}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; }}
        onChange={e => { setLocal(e.target.value); onChange(e.target.value); }}
        className="h-7 text-xs"
      />
      {unit && <span className="text-[10px] text-muted-foreground shrink-0">{unit}</span>}
    </div>
  );
}

function NumF({ value, onChange, unit, min, step = 1 }: {
  value: number; onChange: (v: number) => void; unit?: string; min?: number; step?: number;
}) {
  const [local, setLocal] = useState(() => value === 0 ? "" : String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocal(value === 0 ? "" : String(value)); }, [value]);
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number" value={local} min={min} step={step} placeholder="0"
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; }}
        onChange={e => { setLocal(e.target.value); onChange(parseFloat(e.target.value) || 0); }}
        className="h-7 text-xs"
      />
      {unit && <span className="text-[10px] text-muted-foreground shrink-0">{unit}</span>}
    </div>
  );
}

function SelectF({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="h-7 w-full rounded-md border border-input bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function PdfAttachment({ pdfName, pdfData, onUpload, onClear }: {
  pdfName: string; pdfData: string;
  onUpload: (name: string, data: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      onUpload(file.name, data);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const openPdf = () => {
    if (!pdfData) return;
    const win = window.open();
    win?.document.write(`<iframe width="100%" height="100%" src="${pdfData}"></iframe>`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {pdfName ? (
        <>
          <button onClick={openPdf}
            className="flex items-center gap-1.5 text-[11px] text-primary hover:underline font-medium">
            <FileText className="h-3.5 w-3.5" />{pdfName}
          </button>
          <button onClick={onClear} className="text-destructive hover:opacity-70">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <input ref={ref} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2"
            onClick={() => ref.current?.click()}>
            <Upload className="h-3 w-3" /> Attach Manual PDF
          </Button>
        </>
      )}
    </div>
  );
}

// ── Battery card ──────────────────────────────────────────────────────────────

function BatteryCard({ bat, onChange, index }: {
  bat: BatteryConfig; onChange: (b: BatteryConfig) => void; index: number;
}) {
  const [open, setOpen] = useState(false);
  const u = usableAh(bat);

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-3",
      CHEMISTRY_COLORS[bat.chemistry] || CHEMISTRY_COLORS["Lead-Acid"]
    )}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Battery className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{bat.label || `Battery ${index + 1}`}</span>
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", CHEMISTRY_COLORS[bat.chemistry])}>
            {bat.chemistry}
          </span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Capacity / Usable</p>
            <p className="text-xs font-bold tabular-nums">{fmt(bat.capacityAh)} / {fmt(u)} Ah</p>
          </div>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 border-t border-current/20 pt-3">
          <FieldRow label="Label">
            <TF value={bat.label} onChange={v => onChange({ ...bat, label: v })} placeholder="Battery 1" />
          </FieldRow>
          <FieldRow label="Chemistry">
            <SelectF value={bat.chemistry} onChange={v => onChange({ ...bat, chemistry: v as Chemistry })}
              options={["LiFePO4", "AGM", "Gel", "Lead-Acid"]} />
          </FieldRow>
          <FieldRow label="Capacity">
            <NumF value={bat.capacityAh} onChange={v => onChange({ ...bat, capacityAh: v })} unit="Ah" step={10} />
          </FieldRow>
          <FieldRow label="Nominal Voltage">
            <NumF value={bat.voltageNominal} onChange={v => onChange({ ...bat, voltageNominal: v })} unit="V" step={0.1} />
          </FieldRow>
          <FieldRow label="Max Charge V">
            <NumF value={bat.maxChargeV} onChange={v => onChange({ ...bat, maxChargeV: v })} unit="V" step={0.1} />
          </FieldRow>
          <FieldRow label="Min Discharge V">
            <NumF value={bat.minDischargeV} onChange={v => onChange({ ...bat, minDischargeV: v })} unit="V" step={0.1} />
          </FieldRow>
          <FieldRow label="Max DoD">
            <NumF value={bat.maxDischargeDod} onChange={v => onChange({ ...bat, maxDischargeDod: Math.min(100, v) })} unit="%" />
          </FieldRow>
          <FieldRow label="Install Date">
            <TF value={bat.installDate} onChange={v => onChange({ ...bat, installDate: v })} type="date" />
          </FieldRow>
          <FieldRow label="Model">
            <TF value={bat.model} onChange={v => onChange({ ...bat, model: v })} placeholder="e.g. SOK 100Ah" />
          </FieldRow>
          <FieldRow label="Serial Number">
            <TF value={bat.serialNumber} onChange={v => onChange({ ...bat, serialNumber: v })} />
          </FieldRow>
          <div className="sm:col-span-2">
            <FieldRow label="Notes">
              <TF value={bat.notes} onChange={v => onChange({ ...bat, notes: v })} />
            </FieldRow>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Topology Diagram ──────────────────────────────────────────────────────────

function TopoBlock({ title, titleColor, borderColor, bgColor, children }: {
  title: string; titleColor: string; borderColor: string; bgColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border p-3 space-y-1.5 h-full", borderColor, bgColor)}>
      <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", titleColor)}>{title}</p>
      {children}
    </div>
  );
}

function TopoRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-start text-[11px] gap-2">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="font-semibold tabular-nums text-right shrink-0">{value}{sub && <span className="text-[9px] text-muted-foreground font-normal ml-1">{sub}</span>}</span>
    </div>
  );
}

function TopoDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <div className="flex-1 h-px bg-border/60" />
      {label && <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider shrink-0">{label}</span>}
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function TopologyDiagram({ cfg }: { cfg: PowerConfig }) {
  const mpptDevices = cfg.victronDevices.filter(d =>
    d.type === "SmartSolar MPPT" || d.type === "BlueSolar MPPT"
  );
  const dcDcDevices = cfg.victronDevices.filter(d =>
    d.type === "Orion-Tr DC-DC" || d.type === "Orion-Tr Smart DC-DC"
  );
  const shuntDevices = cfg.victronDevices.filter(d =>
    (d.type === "SmartShunt" || d.type === "BMV Battery Monitor") &&
    d.location.toLowerCase().includes("tow")
  );
  const bmvDevices = cfg.victronDevices.filter(d =>
    d.type === "BMV Battery Monitor" && !d.location.toLowerCase().includes("tow")
  );

  // Group panels by MPPT index (inputIndex → position in mpptDevices)
  const panelsByMppt: Record<number, typeof cfg.solarPanels> = {};
  cfg.solarPanels.forEach(p => {
    const idx = p.inputIndex ?? 0;
    if (!panelsByMppt[idx]) panelsByMppt[idx] = [];
    panelsByMppt[idx].push(p);
  });

  // External panels = panels on the last MPPT if ≥2 MPPTs exist, keyed by the highest inputIndex
  const maxMpptIdx = mpptDevices.length > 1 ? mpptDevices.length - 1 : -1;
  const externalPanels = maxMpptIdx >= 0 ? (panelsByMppt[maxMpptIdx] ?? []) : [];
  const roofPanelGroups = mpptDevices.length > 0
    ? Object.entries(panelsByMppt)
        .filter(([idx]) => Number(idx) < maxMpptIdx || maxMpptIdx < 0)
        .sort(([a], [b]) => Number(a) - Number(b))
    : [];

  const primaryDcDc = dcDcDevices[0];
  const bmsDevice = cfg.jbproBms.find(b => b.capacityAh > 0 || b.maxChargeA > 0 || b.model);

  return (
    <div className="space-y-3 text-xs">
      {/* Row: TOW VEHICLE | POWER MGMT | CARAVAN */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr] gap-3 items-stretch">

        {/* ── TOW VEHICLE ── */}
        <TopoBlock title="Tow Vehicle" titleColor="text-[#b8943e]" borderColor="border-[#b8943e]/35" bgColor="bg-[#b8943e]/5">
          {cfg.vehicleBatteries.map((b, i) => (
            <TopoRow key={i}
              label={b.label || `Battery ${i + 1}`}
              value={`${b.capacityAh} Ah`}
              sub={b.chemistry}
            />
          ))}
          {shuntDevices.length > 0 && (
            <>
              <TopoDivider label="Monitor" />
              {shuntDevices.map(d => (
                <div key={d.id} className="flex items-center gap-1.5 text-[11px]">
                  <div className="h-2 w-2 rounded-full bg-[#b8943e] shrink-0" />
                  <span className="text-[#b8943e] font-medium">{d.deviceName || d.model}</span>
                  <span className="text-muted-foreground text-[10px] ml-auto">{d.model.split(" ").slice(-1)[0]}</span>
                </div>
              ))}
            </>
          )}
        </TopoBlock>

        {/* ── POWER MANAGEMENT (middle column) ── */}
        <div className="flex flex-col gap-2 justify-center">
          {/* DC-DC converter */}
          {primaryDcDc ? (
            <div className="rounded border border-primary/35 bg-primary/5 px-2.5 py-2 text-center">
              <p className="text-[10px] font-bold text-primary">{primaryDcDc.deviceName || "DC-DC"}</p>
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                {primaryDcDc.model.split(" ").slice(0, 3).join(" ")}
              </p>
              {primaryDcDc.maxCurrentA && (
                <p className="text-[9px] font-semibold text-primary/80 mt-0.5">{primaryDcDc.maxCurrentA}A</p>
              )}
            </div>
          ) : (
            <div className="rounded border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">DC-DC Converter</p>
            </div>
          )}

          {/* Horizontal wire between panels */}
          <div className="flex items-center gap-1 justify-center">
            <div className="flex-1 h-px bg-primary/25" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
            <div className="flex-1 h-px bg-primary/25" />
          </div>

          {/* MPPT controllers */}
          {mpptDevices.map((mppt, i) => {
            const isExternal = i === maxMpptIdx && maxMpptIdx >= 0;
            const panels = panelsByMppt[i] ?? [];
            return (
              <div key={mppt.id} className={cn(
                "rounded border px-2.5 py-2",
                isExternal
                  ? "border-dashed border-[#d9b880]/50 bg-[#d9b880]/5"
                  : "border-[#d9b880]/40 bg-[#d9b880]/5"
              )}>
                <p className={cn("text-[10px] font-bold", isExternal ? "text-[#b8943e]/80" : "text-[#b8943e]")}>
                  {mppt.deviceName || `MPPT ${i + 1}`}
                </p>
                <p className="text-[9px] text-muted-foreground leading-tight">
                  {mppt.model.split(" ").slice(-2).join(" ")}
                </p>
                {panels.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-[#d9b880]/25 space-y-0.5">
                    {panels.map((p, j) => (
                      <div key={j} className="flex justify-between text-[9px] gap-1">
                        <span className="text-muted-foreground truncate">{p.label}</span>
                        <span className="font-medium shrink-0">{p.wattPeak}W</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {mpptDevices.length === 0 && (
            <div className="rounded border border-[#d9b880]/20 bg-muted/10 px-2.5 py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">No MPPT configured</p>
            </div>
          )}

          {/* BMS */}
          {bmsDevice && (
            <div className="rounded border border-border/60 bg-muted/15 px-2.5 py-2 text-center">
              <p className="text-[9px] font-semibold text-muted-foreground">{bmsDevice.model}</p>
              <p className="text-[9px] text-muted-foreground/60">BMS</p>
            </div>
          )}
        </div>

        {/* ── CARAVAN ── */}
        <TopoBlock title="Caravan" titleColor="text-primary" borderColor="border-primary/35" bgColor="bg-primary/5">
          {cfg.caravanBatteries.map((b, i) => (
            <TopoRow key={i}
              label={b.label || `Battery ${i + 1}`}
              value={`${b.capacityAh} Ah`}
              sub={b.chemistry}
            />
          ))}
          {bmvDevices.length > 0 && (
            <>
              <TopoDivider label="Monitor" />
              {bmvDevices.map(d => (
                <div key={d.id} className="flex items-center gap-1.5 text-[11px]">
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span className="text-primary font-medium">{d.deviceName || d.model}</span>
                </div>
              ))}
            </>
          )}
          {roofPanelGroups.length > 0 && (
            <>
              <TopoDivider label="Roof Panels" />
              {roofPanelGroups.map(([, panels]) =>
                panels.map((p, j) => (
                  <div key={j} className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Sun className="h-2.5 w-2.5 text-[#d9b880]" />{p.label}
                    </span>
                    <span className="tabular-nums font-medium">{p.wattPeak}W</span>
                  </div>
                ))
              )}
            </>
          )}
        </TopoBlock>
      </div>

      {/* External / Portable Panels */}
      {externalPanels.length > 0 && (
        <div className="rounded-lg border border-dashed border-[#d9b880]/45 bg-[#d9b880]/4 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="h-3 w-3 text-[#b8943e]" />
            <p className="text-[10px] font-bold text-[#b8943e] uppercase tracking-widest">
              External / Portable Panels
              {mpptDevices[maxMpptIdx] && (
                <span className="font-normal normal-case tracking-normal text-muted-foreground ml-1.5">
                  via {mpptDevices[maxMpptIdx].deviceName || `MPPT ${maxMpptIdx + 1}`}
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {externalPanels.map((p, i) => (
              <div key={i} className="rounded border border-[#d9b880]/30 bg-card px-2.5 py-2">
                <p className="text-[11px] font-semibold">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">{p.wattPeak}W</p>
                {p.model && <p className="text-[9px] text-muted-foreground/70 truncate">{p.model}</p>}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground/60 italic mt-2">
            Portable panels — can connect to tow vehicle or caravan depending on campsite setup
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-pages ────────────────────────────────────────────────────────────────

function OverviewTab({ cfg }: { cfg: PowerConfig }) {
  const allBats = [...cfg.vehicleBatteries, ...cfg.caravanBatteries];
  const totalCapacity = allBats.reduce((s, b) => s + b.capacityAh, 0);
  const totalUsable   = allBats.reduce((s, b) => s + usableAh(b), 0);
  const vehicleCap    = cfg.vehicleBatteries.reduce((s, b) => s + b.capacityAh, 0);
  const caravanCap    = cfg.caravanBatteries.reduce((s, b) => s + b.capacityAh, 0);
  const vehicleUsable = cfg.vehicleBatteries.reduce((s, b) => s + usableAh(b), 0);
  const caravanUsable = cfg.caravanBatteries.reduce((s, b) => s + usableAh(b), 0);

  const totalSolarW   = cfg.solarPanels.reduce((s, p) => s + p.wattPeak, 0);
  const peakSolarI    = cfg.solarPanels.reduce((s, p) => s + p.imp, 0);
  const dailyYieldAh  = totalSolarW > 0 ? (totalSolarW * cfg.peakSunHours) / 12 : 0;
  const dailyYieldWh  = totalSolarW * cfg.peakSunHours;

  const utilityDrawW  = cfg.utilities12v.reduce((s, u) => s + u.powerW, 0);
  const utilityDrawAh = cfg.utilities12v.reduce((s, u) => s + (u.powerW * u.estimatedHoursPerDay) / 12, 0);

  const minBatV = allBats.length > 0 ? Math.min(...allBats.map(b => b.minDischargeV)) : 0;
  const maxBatV = allBats.length > 0 ? Math.max(...allBats.map(b => b.maxChargeV)) : 0;

  const autonomyDays = utilityDrawAh > 0 ? totalUsable / utilityDrawAh : 0;

  const kpis = [
    { label: "Total Battery Capacity", value: `${fmt(totalCapacity)} Ah`, sub: `${fmt(totalUsable)} Ah usable`, icon: Battery, color: "text-primary" },
    { label: "Tow Vehicle Bank", value: `${fmt(vehicleCap)} Ah`, sub: `${fmt(vehicleUsable)} Ah usable`, icon: Battery, color: "text-[#b8943e]" },
    { label: "Caravan Bank", value: `${fmt(caravanCap)} Ah`, sub: `${fmt(caravanUsable)} Ah usable`, icon: Battery, color: "text-primary" },
    { label: "Peak Solar", value: `${fmt(totalSolarW)} W`, sub: `${cfg.solarPanels.length} panels — ${fmt(peakSolarI, 1)} A Imp`, icon: Sun, color: "text-[#d9b880]" },
    { label: "Daily Solar Yield (theo.)", value: `${fmt(dailyYieldWh)} Wh`, sub: `${fmt(dailyYieldAh, 1)} Ah @ ${cfg.peakSunHours}h PSH`, icon: Sun, color: "text-[#d9b880]" },
    { label: "12V Utility Draw", value: `${fmt(utilityDrawW)} W`, sub: `~${fmt(utilityDrawAh, 1)} Ah/day`, icon: Plug, color: "text-muted-foreground" },
    { label: "Theoretical Autonomy", value: utilityDrawAh > 0 ? `${fmt(autonomyDays, 1)} days` : "—", sub: "no solar, util load only", icon: Zap, color: autonomyDays > 2 ? "text-primary" : "text-destructive" },
    { label: "Voltage Range", value: `${minBatV}V – ${maxBatV}V`, sub: "min discharge → max charge", icon: Settings, color: "text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <div className="flex items-start justify-between gap-1">
                <div>
                  <p className={cn("text-xl font-bold tabular-nums leading-tight", color)}>{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <Icon className={cn("h-4 w-4 shrink-0 mt-0.5 opacity-40", color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-sm">System Topology</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <TopologyDiagram cfg={cfg} />
        </CardContent>
      </Card>
    </div>
  );
}

function BatteriesTab({ cfg, update }: { cfg: PowerConfig; update: (c: PowerConfig) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Tow Vehicle Battery Bank (3 batteries)" icon={Battery}>
        <div className="space-y-3">
          {cfg.vehicleBatteries.map((b, i) => (
            <BatteryCard key={i} bat={b} index={i} onChange={nb => {
              const arr = [...cfg.vehicleBatteries]; arr[i] = nb;
              update({ ...cfg, vehicleBatteries: arr });
            }} />
          ))}
        </div>
      </Section>
      <Section title="Caravan Battery Bank (3 batteries)" icon={Battery}>
        <div className="space-y-3">
          {cfg.caravanBatteries.map((b, i) => (
            <BatteryCard key={i} bat={b} index={i} onChange={nb => {
              const arr = [...cfg.caravanBatteries]; arr[i] = nb;
              update({ ...cfg, caravanBatteries: arr });
            }} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function SolarTab({ cfg, update }: { cfg: PowerConfig; update: (c: PowerConfig) => void }) {
  const addPanel = () => {
    if (cfg.solarPanels.length >= 8) return;
    update({ ...cfg, solarPanels: [...cfg.solarPanels, { ...DEFAULT_SOLAR_PANEL, label: `Panel ${cfg.solarPanels.length + 1}` }] });
  };
  const removePanel = (i: number) => {
    update({ ...cfg, solarPanels: cfg.solarPanels.filter((_, j) => j !== i) });
  };

  const mpptDevices = cfg.victronDevices.filter(d =>
    d.type === "SmartSolar MPPT" || d.type === "BlueSolar MPPT"
  );
  const totalWp = cfg.solarPanels.reduce((s, p) => s + p.wattPeak, 0);
  const dailyWh = totalWp * cfg.peakSunHours * 0.8; // 80% derate for real-world losses

  return (
    <div className="space-y-5">
      <Section title="Peak Sun Hours" icon={Sun}>
        <div className="flex items-center gap-4">
          <div className="w-48">
            <FieldRow label="Daily PSH (avg)">
              <NumF value={cfg.peakSunHours} step={0.5} min={0} unit="h/day"
                onChange={v => update({ ...cfg, peakSunHours: v })} />
            </FieldRow>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Australian average 5–6 h. Use 4 h in cloudy seasons, 6.5 h in peak summer outback.
          </p>
        </div>
      </Section>

      <Section title="MPPT Controllers" icon={Sun}>
        <p className="text-[11px] text-muted-foreground mb-3">
          Derived from devices registered on the Victron tab. Add or edit MPPT controllers there.
        </p>
        {mpptDevices.length === 0 ? (
          <p className="text-[11px] text-amber-600">No MPPT controllers found. Add a SmartSolar MPPT or BlueSolar MPPT device on the Victron tab.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mpptDevices.map(d => (
              <div key={d.id} className="rounded-lg border border-[#d9b880]/30 bg-[#d9b880]/5 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold text-[#b8943e]">{d.deviceName || d.model}</p>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{d.type}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <span className="text-muted-foreground">Model</span><span className="font-medium">{d.model || "—"}</span>
                  <span className="text-muted-foreground">Part No.</span><span className="font-medium">{d.partNumber || "—"}</span>
                  <span className="text-muted-foreground">Serial No.</span><span className="font-medium">{d.serialNumber || "—"}</span>
                  <span className="text-muted-foreground">Max Output</span><span className="font-medium">{d.maxCurrentA ? `${d.maxCurrentA} A` : "—"}</span>
                  <span className="text-muted-foreground">Absorption</span><span className="font-medium">{d.absorptionV ? `${d.absorptionV} V` : "—"}</span>
                  <span className="text-muted-foreground">Float</span><span className="font-medium">{d.floatV ? `${d.floatV} V` : "—"}</span>
                  {d.bluetoothPin && <><span className="text-muted-foreground">BT PIN</span><span className="font-medium">{d.bluetoothPin}</span></>}
                </div>
                {d.notes && <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/20">{d.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Solar Panels (${cfg.solarPanels.length} / 8 configured)`} icon={Sun}>
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Label", "Wp", "Voc", "Vmp", "Isc", "Imp", "MPPT Controller", "Model", "Serial", ""].map(h => (
                    <th key={h} className="text-left p-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cfg.solarPanels.map((p, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="p-1"><Input className="h-6 text-xs w-24" value={p.label} onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,label:e.target.value}; update({...cfg,solarPanels:a}); }} /></td>
                    <td className="p-1"><Input type="number" className="h-6 text-xs w-16" value={p.wattPeak||""} placeholder="0" onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,wattPeak:+e.target.value||0}; update({...cfg,solarPanels:a}); }} /></td>
                    <td className="p-1"><Input type="number" className="h-6 text-xs w-14" value={p.voc||""} placeholder="V" onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,voc:+e.target.value||0}; update({...cfg,solarPanels:a}); }} /></td>
                    <td className="p-1"><Input type="number" className="h-6 text-xs w-14" value={p.vmp||""} placeholder="V" onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,vmp:+e.target.value||0}; update({...cfg,solarPanels:a}); }} /></td>
                    <td className="p-1"><Input type="number" className="h-6 text-xs w-14" value={p.isc||""} placeholder="A" onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,isc:+e.target.value||0}; update({...cfg,solarPanels:a}); }} /></td>
                    <td className="p-1"><Input type="number" className="h-6 text-xs w-14" value={p.imp||""} placeholder="A" onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,imp:+e.target.value||0}; update({...cfg,solarPanels:a}); }} /></td>
                    <td className="p-1">
                      <select value={p.inputIndex} onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,inputIndex:+e.target.value}; update({...cfg,solarPanels:a}); }}
                        className="h-6 rounded border border-input bg-card px-1 text-xs">
                        {mpptDevices.length > 0
                          ? mpptDevices.map((d, n) => <option key={d.id} value={n}>{d.deviceName || d.model || `MPPT ${n+1}`}</option>)
                          : [0,1,2].map(n => <option key={n} value={n}>Input {n+1}</option>)
                        }
                      </select>
                    </td>
                    <td className="p-1"><Input className="h-6 text-xs w-28" value={p.model} placeholder="Model" onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,model:e.target.value}; update({...cfg,solarPanels:a}); }} /></td>
                    <td className="p-1"><Input className="h-6 text-xs w-24" value={p.serialNumber} placeholder="S/N" onChange={e => { const a=[...cfg.solarPanels]; a[i]={...p,serialNumber:e.target.value}; update({...cfg,solarPanels:a}); }} /></td>
                    <td className="p-1">
                      <button onClick={() => removePanel(i)} className="text-destructive hover:opacity-70 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cfg.solarPanels.length < 8 && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={addPanel}>
              <Plus className="h-3.5 w-3.5" /> Add Panel ({cfg.solarPanels.length}/8)
            </Button>
          )}
          {cfg.solarPanels.length > 0 && (
            <div className="flex gap-6 text-[10px] text-muted-foreground pt-1 flex-wrap">
              <span>Total Wp: <strong className="text-foreground">{fmt(totalWp)} W</strong></span>
              <span>Total Imp: <strong className="text-foreground">{fmt(cfg.solarPanels.reduce((s,p)=>s+p.imp,0), 1)} A</strong></span>
              <span>Total Isc: <strong className="text-foreground">{fmt(cfg.solarPanels.reduce((s,p)=>s+p.isc,0), 1)} A</strong></span>
              {cfg.peakSunHours > 0 && totalWp > 0 && (
                <span>Est. daily yield @ {cfg.peakSunHours}h PSH: <strong className="text-foreground">{fmt(dailyWh)} Wh</strong></span>
              )}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function ChargingTab({ cfg }: { cfg: PowerConfig }) {
  const dcDcDevices = cfg.victronDevices.filter(d => d.type === "Orion-Tr DC-DC");
  const monitorDevices = cfg.victronDevices.filter(d =>
    d.type === "BMV Battery Monitor" || d.type === "SmartShunt"
  );
  const bmsDevices = cfg.jbproBms.filter(d => d.maxChargeA > 0 || d.capacityAh > 0);

  const ReadOnlyCard = ({ d }: { d: typeof cfg.victronDevices[0] }) => (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold text-foreground">{d.deviceName || d.model}</p>
        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{d.type}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
        <span className="text-muted-foreground">Model</span><span className="font-medium">{d.model || "—"}</span>
        <span className="text-muted-foreground">Part No.</span><span className="font-medium">{d.partNumber || "—"}</span>
        <span className="text-muted-foreground">Serial No.</span><span className="font-medium">{d.serialNumber || "—"}</span>
        <span className="text-muted-foreground">Max Current</span><span className="font-medium">{d.maxCurrentA ? `${d.maxCurrentA} A` : "—"}</span>
        <span className="text-muted-foreground">Absorption</span><span className="font-medium">{d.absorptionV ? `${d.absorptionV} V` : "—"}</span>
        <span className="text-muted-foreground">Float</span><span className="font-medium">{d.floatV ? `${d.floatV} V` : "—"}</span>
        {d.bluetoothPin && <><span className="text-muted-foreground">BT PIN</span><span className="font-medium">{d.bluetoothPin}</span></>}
        {d.bluetoothPuk && <><span className="text-muted-foreground">BT PUK</span><span className="font-medium font-mono">{d.bluetoothPuk}</span></>}
      </div>
      {d.notes && <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/20">{d.notes}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-[#d9b880]/30 bg-[#d9b880]/5 px-3 py-2 text-[11px] text-muted-foreground">
        This tab displays charging data derived from devices registered on the <strong>Victron</strong> and <strong>JBPRO BMS</strong> tabs. Edit devices there.
      </div>

      <Section title="DC-DC Converters (Vehicle → Caravan)" icon={ArrowRight}>
        {dcDcDevices.length === 0 ? (
          <p className="text-[11px] text-amber-600">No DC-DC converters found. Add an Orion-Tr DC-DC device on the Victron tab.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dcDcDevices.map(d => <ReadOnlyCard key={d.id} d={d} />)}
          </div>
        )}
      </Section>

      <Section title="Battery Monitors" icon={Gauge}>
        {monitorDevices.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No battery monitors registered. Add a BMV Battery Monitor or SmartShunt on the Victron tab.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitorDevices.map(d => <ReadOnlyCard key={d.id} d={d} />)}
          </div>
        )}
      </Section>

      <Section title="BMS Charging Parameters" icon={CircuitBoard}>
        <p className="text-[11px] text-muted-foreground mb-3">
          Derived from JBPRO BMS devices with active charge ratings. Edit on the JBPRO BMS tab.
        </p>
        {bmsDevices.length === 0 ? (
          <p className="text-[11px] text-amber-600">No BMS devices found. Configure BMS on the JBPRO BMS tab.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bmsDevices.map(d => (
              <div key={d.id} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold text-foreground">{d.model}</p>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{d.location}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  {d.capacityAh > 0 && <><span className="text-muted-foreground">Capacity</span><span className="font-medium">{d.capacityAh} Ah</span></>}
                  {d.maxChargeA > 0 && <><span className="text-muted-foreground">Max Charge</span><span className="font-medium">{d.maxChargeA} A</span></>}
                  {d.maxDischargeA > 0 && <><span className="text-muted-foreground">Max Discharge</span><span className="font-medium">{d.maxDischargeA} A</span></>}
                  {d.cellCount > 0 && <><span className="text-muted-foreground">Cell Count</span><span className="font-medium">{d.cellCount}S LiFePO4</span></>}
                  {d.ovProtectionV > 0 && <><span className="text-muted-foreground">OV Protection</span><span className="font-medium">{d.ovProtectionV} V/cell</span></>}
                  {d.uvProtectionV > 0 && <><span className="text-muted-foreground">UV Protection</span><span className="font-medium">{d.uvProtectionV} V/cell</span></>}
                  {d.balanceV > 0 && <><span className="text-muted-foreground">Balance V</span><span className="font-medium">{d.balanceV} V/cell</span></>}
                </div>
                {d.notes && <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/20">{d.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

const VICTRON_TYPES = [
  "SmartSolar MPPT", "BlueSolar MPPT", "MultiPlus", "Quattro",
  "Phoenix Inverter", "Orion-Tr DC-DC", "BMV Battery Monitor",
  "SmartShunt", "Cerbo GX", "VE.Bus BMS", "Other",
];

// ── Victron QR scanner ─────────────────────────────────────────────────────────
interface VictronQrResult {
  url: string;
  photoData: string;
  photoName: string;
}

type BarcodeDetectorType = { detect(img: HTMLVideoElement | ImageBitmap): Promise<{ rawValue: string }[]> };
declare const BarcodeDetector: new(o: object) => BarcodeDetectorType;
const hasBarcodeDetector = () => "BarcodeDetector" in window;

function LiveQrScanModal({ onResult, onClose }: {
  onResult: (r: VictronQrResult) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number>(0);
  const [status, setStatus] = useState<"starting" | "scanning" | "found" | "error">("starting");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => { if (active) setStatus("scanning"); });
        }
      })
      .catch(err => { if (active) { setStatus("error"); setErrMsg(String(err.message || err)); } });
    return () => {
      active = false;
      cancelAnimationFrame(loopRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (status !== "scanning") return;
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const loop = async () => {
      const vid = videoRef.current;
      if (!vid || vid.readyState < 2) { loopRef.current = requestAnimationFrame(loop); return; }
      try {
        const codes = await detector.detect(vid);
        if (codes.length > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = vid.videoWidth; canvas.height = vid.videoHeight;
          canvas.getContext("2d")!.drawImage(vid, 0, 0);
          const photoData = canvas.toDataURL("image/jpeg", 0.85);
          streamRef.current?.getTracks().forEach(t => t.stop());
          setStatus("found");
          onResult({ url: codes[0].rawValue, photoData, photoName: "qr-scan.jpg" });
          return;
        }
      } catch { /* keep looping */ }
      loopRef.current = requestAnimationFrame(loop);
    };
    loopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(loopRef.current);
  }, [status, onResult]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm font-semibold">Scan Victron QR Code</span>
        <button onClick={onClose} className="text-white/70 hover:text-white text-3xl leading-none">×</button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-60 h-60 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#d9b880] rounded-tl-md" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#d9b880] rounded-tr-md" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#d9b880] rounded-bl-md" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#d9b880] rounded-br-md" />
          </div>
        </div>
      </div>
      <div className="p-5 text-center">
        {status === "starting" && <p className="text-white/70 text-sm">Starting camera...</p>}
        {status === "scanning" && <p className="text-white/80 text-sm">Point the QR code inside the box</p>}
        {status === "found"    && <p className="text-[#d9b880] text-sm font-semibold">QR code found</p>}
        {status === "error"    && (
          <div>
            <p className="text-amber-400 text-sm mb-3">{errMsg || "Camera not available"}</p>
            <button onClick={onClose} className="text-white/70 underline text-xs">Close — use Take Photo instead</button>
          </div>
        )}
      </div>
    </div>
  );
}

function VictronQrScanner({ onResult }: { onResult: (r: VictronQrResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setError(null);

    const dataUrl: string = await new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res(ev.target?.result as string);
      reader.readAsDataURL(file);
    });

    let qrUrl = "";

    // Try native BarcodeDetector with ImageBitmap (most reliable on Android/iOS 17+)
    if (hasBarcodeDetector()) {
      try {
        const bitmap = await createImageBitmap(file);
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        const results = await detector.detect(bitmap);
        if (results.length > 0) qrUrl = results[0].rawValue;
        bitmap.close();
      } catch { /* fall through */ }
    }

    // Fall back to jsQR with resized canvas
    if (!qrUrl) {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
      });
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
        if (code?.data) qrUrl = code.data;
      }
    }

    setScanning(false);
    if (qrUrl) {
      onResult({ url: qrUrl, photoData: dataUrl, photoName: file.name });
    } else {
      setError("Photo saved — no QR found. Enter URL manually or use Live Scan.");
      onResult({ url: "", photoData: dataUrl, photoName: file.name });
    }
    if (inputRef.current) inputRef.current.value = "";
  }, [onResult]);

  return (
    <div>
      {showLive && (
        <LiveQrScanModal
          onResult={r => { setShowLive(false); onResult(r); }}
          onClose={() => setShowLive(false)}
        />
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="flex items-center gap-2 flex-wrap">
        {hasBarcodeDetector() && (
          <Button type="button" size="sm" variant="default"
            className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground"
            onClick={() => setShowLive(true)}>
            <Camera className="h-3.5 w-3.5" /> Live Scan
          </Button>
        )}
        <Button type="button" size="sm" variant="outline"
          className="h-7 text-xs gap-1.5 border-primary/40 text-primary"
          disabled={scanning}
          onClick={() => inputRef.current?.click()}>
          <Camera className="h-3.5 w-3.5" />
          {scanning ? "Reading..." : "Take Photo"}
        </Button>
      </div>
      {error && <p className="text-[10px] text-amber-600 mt-1">{error}</p>}
    </div>
  );
}

// ── VictronTab ─────────────────────────────────────────────────────────────────
function VictronTab({ cfg, update }: { cfg: PowerConfig; update: (c: PowerConfig) => void }) {
  const add = () => update({
    ...cfg, victronDevices: [...cfg.victronDevices, { ...DEFAULT_VICTRON, id: crypto.randomUUID() }],
  });
  const remove = (id: string) => update({
    ...cfg, victronDevices: cfg.victronDevices.filter(d => d.id !== id),
  });
  const setDevice = (id: string, patch: Partial<VictronDevice>) => update({
    ...cfg, victronDevices: cfg.victronDevices.map(d => d.id === id ? { ...d, ...patch } : d),
  });

  // Detect which DEFAULT_CONFIG devices are missing from the current list (match by model)
  const existingModels = new Set(cfg.victronDevices.map(d => d.model.trim().toLowerCase()));
  const missingDefaults = DEFAULT_CONFIG.victronDevices.filter(
    d => d.model && !existingModels.has(d.model.trim().toLowerCase())
  );
  const mergeDefaults = () => {
    const toAdd = missingDefaults.map(d => ({ ...d, id: crypto.randomUUID() }));
    update({ ...cfg, victronDevices: [...cfg.victronDevices, ...toAdd] });
  };

  return (
    <div className="space-y-4">
      {missingDefaults.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-[#d9b880]/40 bg-[#d9b880]/8 px-3 py-2.5">
          <Sun className="h-4 w-4 text-[#b8943e] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[#b8943e]">New default devices available</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {missingDefaults.map(d => d.deviceName || d.model).join(", ")}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 shrink-0 border-[#b8943e]/40 text-[#b8943e] hover:bg-[#b8943e]/10"
            onClick={mergeDefaults}>
            <Plus className="h-3.5 w-3.5" /> Add Missing
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Scan each device's QR code label to capture the Victron product link and a photo of the sticker.
          Add Bluetooth PIN / PUK for activation. Attach the product manual PDF for each device.
        </p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 shrink-0" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add Device
        </Button>
      </div>

      {cfg.victronDevices.map(d => (
        <Card key={d.id} className="border-primary/20">
          <CardHeader className="py-2.5 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  {d.deviceName || d.model || d.type || "New Victron Device"}
                </span>
                <span className="text-[10px] border border-primary/30 text-primary rounded px-1.5 py-0.5">{d.type}</span>
              </div>
              <button onClick={() => remove(d.id)} className="text-destructive hover:opacity-70 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">

            {/* ── QR photo strip ── */}
            <div className="flex gap-3 items-start">
              {d.devicePhotoData ? (
                <div className="relative shrink-0">
                  <img
                    src={d.devicePhotoData}
                    alt="Device label"
                    className="h-28 w-28 object-cover rounded border border-border cursor-pointer"
                    onClick={() => window.open(d.devicePhotoData, "_blank")}
                    title="Click to view full size"
                  />
                  <button
                    onClick={() => setDevice(d.id, { devicePhotoData: "", devicePhotoName: "" })}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] leading-none"
                    title="Remove photo"
                  >×</button>
                </div>
              ) : (
                <div className="h-28 w-28 shrink-0 border border-dashed border-border rounded flex items-center justify-center bg-muted/30">
                  <QrCode className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <VictronQrScanner onResult={r => setDevice(d.id, {
                  qrCodeUrl: r.url || d.qrCodeUrl,
                  devicePhotoData: r.photoData || d.devicePhotoData,
                  devicePhotoName: r.photoName || d.devicePhotoName,
                })} />
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Point your camera at the QR code on the device sticker.
                  The Victron product link and a photo of the label are saved automatically.
                </p>
                {d.qrCodeUrl && (
                  <a
                    href={d.qrCodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Victron product page
                  </a>
                )}
                {d.qrCodeUrl && (
                  <p className="text-[10px] text-muted-foreground font-mono break-all leading-snug">{d.qrCodeUrl}</p>
                )}
              </div>
            </div>

            {/* ── Identity & location ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1 border-t border-border/50">
              <FieldRow label="Device Name">
                <TF value={d.deviceName} onChange={v => setDevice(d.id,{deviceName:v})} placeholder="e.g. Solar Input, Car Input, Computer" />
              </FieldRow>
              <FieldRow label="Location">
                <TF value={d.location} onChange={v => setDevice(d.id,{location:v})} placeholder="Caravan / Vehicle" />
              </FieldRow>
              <FieldRow label="Device Type">
                <SelectF value={d.type} options={VICTRON_TYPES} onChange={v => setDevice(d.id, {type:v})} />
              </FieldRow>
              <FieldRow label="Model">
                <TF value={d.model} onChange={v => setDevice(d.id,{model:v})} placeholder="e.g. SmartSolar MPPT 100/50" />
              </FieldRow>
              <FieldRow label="Part Number">
                <TF value={d.partNumber} onChange={v => setDevice(d.id,{partNumber:v})} placeholder="e.g. SCC110050210" />
              </FieldRow>
              <FieldRow label="Serial Number">
                <TF value={d.serialNumber} onChange={v => setDevice(d.id,{serialNumber:v})} placeholder="e.g. HQ2547GJHCF" />
              </FieldRow>
              <FieldRow label="Firmware Version">
                <TF value={d.firmwareVersion} onChange={v => setDevice(d.id,{firmwareVersion:v})} placeholder="e.g. v3.12" />
              </FieldRow>
            </div>

            {/* ── Bluetooth credentials ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1 border-t border-border/50">
              <div className="sm:col-span-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Key className="h-3 w-3" /> Bluetooth / Communication
                </p>
              </div>
              <FieldRow label="Bluetooth PIN">
                <TF value={d.bluetoothPin} onChange={v => setDevice(d.id,{bluetoothPin:v})} placeholder="e.g. 558688" />
              </FieldRow>
              <FieldRow label="Bluetooth PUK">
                <TF value={d.bluetoothPuk} onChange={v => setDevice(d.id,{bluetoothPuk:v})} placeholder="e.g. 537680A71137" />
              </FieldRow>
            </div>

            {/* ── Charging parameters ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1 border-t border-border/50">
              <div className="sm:col-span-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Charging Parameters</p>
              </div>
              <FieldRow label="Absorption V"><NumF value={+d.absorptionV} step={0.1} unit="V" onChange={v => setDevice(d.id,{absorptionV:String(v)})} /></FieldRow>
              <FieldRow label="Float V"><NumF value={+d.floatV} step={0.1} unit="V" onChange={v => setDevice(d.id,{floatV:String(v)})} /></FieldRow>
              <FieldRow label="Max Charge A"><NumF value={+d.maxCurrentA||0} unit="A" onChange={v => setDevice(d.id,{maxCurrentA:String(v)})} /></FieldRow>
            </div>

            {/* ── Notes + PDF ── */}
            <div className="pt-1 border-t border-border/50 space-y-2">
              <FieldRow label="Notes"><TF value={d.notes} onChange={v => setDevice(d.id,{notes:v})} /></FieldRow>
              <PdfAttachment pdfName={d.pdfName} pdfData={d.pdfData}
                onUpload={(name,data) => setDevice(d.id,{pdfName:name,pdfData:data})}
                onClear={() => setDevice(d.id,{pdfName:"",pdfData:""})}
              />
            </div>

          </CardContent>
        </Card>
      ))}

      {cfg.victronDevices.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No Victron devices added yet. Click "Add Device" to begin.
        </div>
      )}
    </div>
  );
}

function BmsTab({ cfg, update }: { cfg: PowerConfig; update: (c: PowerConfig) => void }) {
  const add = () => update({
    ...cfg, jbproBms: [...cfg.jbproBms, { ...DEFAULT_JBPRO, id: crypto.randomUUID() }],
  });
  const remove = (id: string) => update({
    ...cfg, jbproBms: cfg.jbproBms.filter(d => d.id !== id),
  });
  const set = (id: string, patch: Partial<JBProBMS>) => update({
    ...cfg, jbproBms: cfg.jbproBms.map(d => d.id === id ? { ...d, ...patch } : d),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          JBPRO Battery Management Systems — configure protection thresholds, cell count, and capacity per unit.
        </p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 shrink-0" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add BMS
        </Button>
      </div>

      {cfg.jbproBms.map(d => (
        <Card key={d.id} className="border-primary/20">
          <CardHeader className="py-2.5 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircuitBoard className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  {d.model || "JBProBMS"} — {d.location}
                </span>
                <span className="text-[10px] border border-primary/30 text-primary rounded px-1.5 py-0.5">
                  {d.cellCount}S / {d.capacityAh}Ah
                </span>
              </div>
              <button onClick={() => remove(d.id)} className="text-destructive hover:opacity-70 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <FieldRow label="Model"><TF value={d.model} onChange={v => set(d.id,{model:v})} placeholder="JBProBMS-100" /></FieldRow>
            <FieldRow label="Serial Number"><TF value={d.serialNumber} onChange={v => set(d.id,{serialNumber:v})} /></FieldRow>
            <FieldRow label="Location"><TF value={d.location} onChange={v => set(d.id,{location:v})} placeholder="Caravan / Vehicle" /></FieldRow>
            <FieldRow label="Cell Count (S)"><NumF value={d.cellCount} onChange={v => set(d.id,{cellCount:v})} /></FieldRow>
            <FieldRow label="Capacity"><NumF value={d.capacityAh} unit="Ah" step={10} onChange={v => set(d.id,{capacityAh:v})} /></FieldRow>
            <FieldRow label="Balance Voltage"><NumF value={d.balanceV} unit="V/cell" step={0.01} onChange={v => set(d.id,{balanceV:v})} /></FieldRow>
            <FieldRow label="Over-Voltage Prot."><NumF value={d.ovProtectionV} unit="V/cell" step={0.01} onChange={v => set(d.id,{ovProtectionV:v})} /></FieldRow>
            <FieldRow label="Under-Voltage Prot."><NumF value={d.uvProtectionV} unit="V/cell" step={0.01} onChange={v => set(d.id,{uvProtectionV:v})} /></FieldRow>
            <FieldRow label="Max Charge A"><NumF value={d.maxChargeA} unit="A" onChange={v => set(d.id,{maxChargeA:v})} /></FieldRow>
            <FieldRow label="Max Discharge A"><NumF value={d.maxDischargeA} unit="A" onChange={v => set(d.id,{maxDischargeA:v})} /></FieldRow>
            <div className="sm:col-span-2">
              <FieldRow label="Notes"><TF value={d.notes} onChange={v => set(d.id,{notes:v})} /></FieldRow>
            </div>
            <div className="sm:col-span-2 pt-1">
              <PdfAttachment pdfName={d.pdfName} pdfData={d.pdfData}
                onUpload={(name,data) => set(d.id,{pdfName:name,pdfData:data})}
                onClear={() => set(d.id,{pdfName:"",pdfData:""})}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AccessoriesTab({ cfg, update }: { cfg: PowerConfig; update: (c: PowerConfig) => void }) {
  const sb = cfg.subPowerBoard;
  const cc = cfg.computerController;

  return (
    <div className="space-y-5">
      <Section title="SUB Power Board" icon={CircuitBoard}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <FieldRow label="Model"><TF value={sb.model} onChange={v => update({...cfg,subPowerBoard:{...sb,model:v}})} placeholder="e.g. Redarc RSPD12" /></FieldRow>
          <FieldRow label="Serial Number"><TF value={sb.serialNumber} onChange={v => update({...cfg,subPowerBoard:{...sb,serialNumber:v}})} /></FieldRow>
          <FieldRow label="Max Amps"><NumF value={sb.maxAmps} unit="A" onChange={v => update({...cfg,subPowerBoard:{...sb,maxAmps:v}})} /></FieldRow>
          <FieldRow label="Circuits"><NumF value={sb.circuits} onChange={v => update({...cfg,subPowerBoard:{...sb,circuits:v}})} /></FieldRow>
          <div className="sm:col-span-2">
            <FieldRow label="Notes"><TF value={sb.notes} onChange={v => update({...cfg,subPowerBoard:{...sb,notes:v}})} /></FieldRow>
          </div>
        </div>
      </Section>

      <Section title="Computer Controller" icon={Cpu}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <FieldRow label="Model"><TF value={cc.model} onChange={v => update({...cfg,computerController:{...cc,model:v}})} placeholder="e.g. Raspberry Pi, NUC" /></FieldRow>
          <FieldRow label="Serial Number"><TF value={cc.serialNumber} onChange={v => update({...cfg,computerController:{...cc,serialNumber:v}})} /></FieldRow>
          <FieldRow label="Power Draw"><NumF value={cc.powerW} unit="W" onChange={v => update({...cfg,computerController:{...cc,powerW:v}})} /></FieldRow>
          <div className="sm:col-span-2">
            <FieldRow label="Notes"><TF value={cc.notes} onChange={v => update({...cfg,computerController:{...cc,notes:v}})} /></FieldRow>
          </div>
        </div>
      </Section>

      <Section title="Caravan Sway Control" icon={Settings}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {(() => { const sw = cfg.swayCommand; return (<>
            <FieldRow label="Model"><TF value={sw.model} onChange={v => update({...cfg,swayCommand:{...sw,model:v}})} placeholder="BMPRO SwayCommand" /></FieldRow>
            <FieldRow label="Serial Number"><TF value={sw.serialNumber} onChange={v => update({...cfg,swayCommand:{...sw,serialNumber:v}})} /></FieldRow>
            <div className="sm:col-span-2"><FieldRow label="Notes"><TF value={sw.notes} onChange={v => update({...cfg,swayCommand:{...sw,notes:v}})} /></FieldRow></div>
          </>); })()}
        </div>
      </Section>

      <Section title="Breakaway System" icon={Settings}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {(() => { const ts = cfg.towSecure; return (<>
            <FieldRow label="Model"><TF value={ts.model} onChange={v => update({...cfg,towSecure:{...ts,model:v}})} placeholder="TOW-SECURE" /></FieldRow>
            <FieldRow label="Serial Number"><TF value={ts.serialNumber} onChange={v => update({...cfg,towSecure:{...ts,serialNumber:v}})} /></FieldRow>
            <div className="sm:col-span-2"><FieldRow label="Notes"><TF value={ts.notes} onChange={v => update({...cfg,towSecure:{...ts,notes:v}})} /></FieldRow></div>
          </>); })()}
        </div>
      </Section>

      <Section title="Electric Brake Controller" icon={Settings}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {(() => { const bc = cfg.brakeController; return (<>
            <FieldRow label="Model"><TF value={bc.model} onChange={v => update({...cfg,brakeController:{...bc,model:v}})} placeholder="REDARC Tow-Pro Elite" /></FieldRow>
            <FieldRow label="Serial Number"><TF value={bc.serialNumber} onChange={v => update({...cfg,brakeController:{...bc,serialNumber:v}})} /></FieldRow>
            <div className="sm:col-span-2"><FieldRow label="Notes"><TF value={bc.notes} onChange={v => update({...cfg,brakeController:{...bc,notes:v}})} /></FieldRow></div>
          </>); })()}
        </div>
      </Section>

      <Section title="12V Utilities (6 slots)" icon={Plug}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Appliance Label", "Power Draw", "Hrs/Day (est.)", "Daily Ah", "Notes"].map(h => (
                  <th key={h} className="text-left p-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.utilities12v.map((u, i) => {
                const dailyAh = (u.powerW * u.estimatedHoursPerDay) / 12;
                return (
                  <tr key={i} className="border-b border-border/20">
                    <td className="p-1"><Input className="h-7 text-xs" value={u.label} onChange={e => { const a=[...cfg.utilities12v]; a[i]={...u,label:e.target.value}; update({...cfg,utilities12v:a}); }} /></td>
                    <td className="p-1">
                      <div className="flex items-center gap-1">
                        <Input type="number" className="h-7 text-xs w-16" value={u.powerW||""} placeholder="0" onChange={e => { const a=[...cfg.utilities12v]; a[i]={...u,powerW:+e.target.value||0}; update({...cfg,utilities12v:a}); }} />
                        <span className="text-[10px] text-muted-foreground">W</span>
                      </div>
                    </td>
                    <td className="p-1">
                      <div className="flex items-center gap-1">
                        <Input type="number" className="h-7 text-xs w-16" value={u.estimatedHoursPerDay||""} placeholder="0" step="0.5" onChange={e => { const a=[...cfg.utilities12v]; a[i]={...u,estimatedHoursPerDay:+e.target.value||0}; update({...cfg,utilities12v:a}); }} />
                        <span className="text-[10px] text-muted-foreground">h</span>
                      </div>
                    </td>
                    <td className="p-2 tabular-nums font-medium">
                      {dailyAh > 0 ? <span className="text-destructive">{dailyAh.toFixed(1)} Ah</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-1"><Input className="h-7 text-xs" value={u.notes} onChange={e => { const a=[...cfg.utilities12v]; a[i]={...u,notes:e.target.value}; update({...cfg,utilities12v:a}); }} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-primary/5">
                <td className="p-2 font-bold text-xs uppercase tracking-wide text-primary">Totals</td>
                <td className="p-2 font-bold tabular-nums text-primary">{fmt(cfg.utilities12v.reduce((s,u)=>s+u.powerW,0))} W</td>
                <td className="p-2 text-muted-foreground">—</td>
                <td className="p-2 font-bold tabular-nums text-destructive">
                  {fmt(cfg.utilities12v.reduce((s,u)=>s+(u.powerW*u.estimatedHoursPerDay)/12,0), 1)} Ah/day
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "batteries" | "solar" | "charging" | "victron" | "bms" | "accessories";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",     label: "Overview",     icon: Zap },
  { id: "batteries",   label: "Batteries",    icon: Battery },
  { id: "solar",       label: "Solar",        icon: Sun },
  { id: "charging",    label: "Charging",     icon: ArrowRight },
  { id: "victron",     label: "Victron",      icon: Settings },
  { id: "bms",         label: "JBPRO BMS",    icon: CircuitBoard },
  { id: "accessories", label: "Accessories",  icon: Plug },
];

export default function PowerConfigPage() {
  const { data: globalBudget, isLoading } = useGetGlobalBudget();
  const saveBudget = useSaveGlobalBudget();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [cfg, setCfg] = useState<PowerConfig>(DEFAULT_CONFIG);
  const [tab, setTab] = useState<Tab>("overview");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const budgetRef   = useRef<any>(null);
  const cfgRef      = useRef<PowerConfig>(DEFAULT_CONFIG);
  const isDirtyRef  = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load powerConfig from DB when global budget arrives
  useEffect(() => {
    if (!globalBudget) return;
    budgetRef.current = globalBudget;
    if (globalBudget.powerConfig && typeof globalBudget.powerConfig === "object") {
      const merged = mergeCfg(globalBudget.powerConfig);
      setCfg(merged);
      cfgRef.current = merged;
    }
  }, [globalBudget]);

  // Force-save impl — reads from refs, no stale closures
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
            year:           base.year ?? new Date().getFullYear().toString(),
            months:         base.months ?? {},
            rental:         base.rental,
            super:          base.super,
            shares:         base.shares,
            income:         base.income,
            tax:            base.tax,
            vehicleProfile: base.vehicleProfile,
            vehicleDocs:    base.vehicleDocs,
            checklists:     base.checklists,
            savings:        base.savings,
            powerConfig:    cfgRef.current as unknown as Record<string, unknown>,
          },
        },
        {
          onSuccess: (saved) => {
            budgetRef.current = { ...base, ...saved };
            // Update cache directly — do NOT invalidate (refetch would overwrite cfg mid-typing)
            queryClient.setQueryData(getGetGlobalBudgetQueryKey(), (old: unknown) => ({
              ...(old as object ?? {}),
              ...(saved as object),
            }));
            isDirtyRef.current = false;
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 2500);
          },
          onError: () => setSaveState("error"),
        }
      );
    };
  }, [saveBudget, queryClient]);

  // Register with global SaveContext (flush on tab-nav or page unload)
  const { register, unregister } = useSaveContext();
  const stableSave = useCallback(() => forceSaveImpl.current(), []);
  useEffect(() => {
    register(stableSave);
    return () => {
      if (isDirtyRef.current) forceSaveImpl.current();
      unregister();
    };
  }, [register, unregister, stableSave]);

  // Debounced auto-save on every change
  const update = useCallback((next: PowerConfig) => {
    setCfg(next);
    cfgRef.current = next;
    isDirtyRef.current = true;
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => forceSaveImpl.current(), 1200);
  }, []);

  const saveIndicator = {
    idle:   null,
    saving: <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Save className="h-3.5 w-3.5 animate-pulse" /> Saving…</span>,
    saved:  <span className="flex items-center gap-1.5 text-xs text-primary"><Cloud className="h-3.5 w-3.5" /> Saved to cloud</span>,
    error:  <span className="flex items-center gap-1.5 text-xs text-destructive"><CloudOff className="h-3.5 w-3.5" /> Save failed</span>,
  }[saveState];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading configuration…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Configuration Parameters
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Battery management, solar system, Victron energy equipment, JBPRO BMS, and 12V accessories
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveIndicator}
          <Button size="sm" variant="outline" onClick={() => forceSaveImpl.current()} className="gap-2 h-8">
            <Save className="h-3.5 w-3.5" /> Save Now
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b border-border pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview"     && <OverviewTab cfg={cfg} />}
      {tab === "batteries"    && <BatteriesTab cfg={cfg} update={update} />}
      {tab === "solar"        && <SolarTab cfg={cfg} update={update} />}
      {tab === "charging"     && <ChargingTab cfg={cfg} />}
      {tab === "victron"      && <VictronTab cfg={cfg} update={update} />}
      {tab === "bms"          && <BmsTab cfg={cfg} update={update} />}
      {tab === "accessories"  && <AccessoriesTab cfg={cfg} update={update} />}
    </div>
  );
}
