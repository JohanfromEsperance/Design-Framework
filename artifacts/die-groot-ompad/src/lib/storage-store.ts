// ── Asset Register / Storage Store ────────────────────────────────────────────
// Single master data source for all physical assets/equipment.
// Stored in localStorage under STORAGE_KEY.

export const STORAGE_KEY = "asset_register_v1";

export type ItemCondition = "Good" | "Fair" | "Poor" | "Unknown";
export type LocationCategory = "UTE" | "CARAVAN" | "OTHER";

export interface StorageItemUrl {
  id: string;
  label: string;
  url: string;
}

export interface StorageItem {
  id: string;
  name: string;
  description: string;
  usage: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  partNumber: string;
  condition: ItemCondition;
  quantity: number;
  urls: StorageItemUrl[];
  pdfName: string;
  pdfData: string;    // base64
  photoData: string;  // base64
  notes: string;
}

export interface StorageLocation {
  id: string;         // UUID — used as QR code payload
  name: string;       // e.g. "FRONT TUNNEL DOOR LEFT"
  locationDescription: string;  // verbose description of physical location
  category: LocationCategory;
  items: StorageItem[];
  photoData: string;
  notes: string;
  sortOrder: number;
}

export interface AssetRegister {
  locations: StorageLocation[];
  lastModified: string;
}

// ── QR payload format ─────────────────────────────────────────────────────────

export const QR_PREFIX = "DGOMPAD-STORAGE:";

export function makeQrPayload(locationId: string): string {
  return `${QR_PREFIX}${locationId}`;
}

export function parseQrPayload(payload: string): string | null {
  if (payload.startsWith(QR_PREFIX)) {
    return payload.slice(QR_PREFIX.length);
  }
  return null;
}

// ── localStorage CRUD ─────────────────────────────────────────────────────────

export function loadRegister(): AssetRegister {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AssetRegister;
  } catch {}
  return { locations: [], lastModified: new Date().toISOString() };
}

export function saveRegister(reg: AssetRegister): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...reg,
    lastModified: new Date().toISOString(),
  }));
}

// ── Seed data — power system equipment ───────────────────────────────────────

function uid() { return crypto.randomUUID(); }

function blankItem(overrides: Partial<StorageItem>): StorageItem {
  return {
    id: uid(),
    name: "",
    description: "",
    usage: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    partNumber: "",
    condition: "Good",
    quantity: 1,
    urls: [],
    pdfName: "",
    pdfData: "",
    photoData: "",
    notes: "",
    ...overrides,
  };
}

export function buildPowerSeedLocations(): StorageLocation[] {
  return [
    {
      id: uid(),
      name: "CARAVAN — ELECTRICAL CABINET",
      locationDescription: "Main electrical bay inside caravan — contains all Victron and BMPRO power management equipment",
      category: "CARAVAN",
      sortOrder: 10,
      photoData: "",
      notes: "Victron ecosystem + BMPRO J35D system. Connect via VictronConnect (Bluetooth) app.",
      items: [
        blankItem({
          name: "BMV-712 Battery Monitor",
          description: "Victron BMV-712 BLACK Smart — battery voltage, current and SoC% monitor",
          usage: "Monitors caravan LiFePO4 battery bank. Connects via Bluetooth to VictronConnect app.",
          manufacturer: "Victron Energy",
          model: "BMV-712 BLACK Smart",
          partNumber: "BAM030712200",
          serialNumber: "HQ2519NHK33",
          notes: "Bluetooth PIN: 066252 — PUK: 5CA54EFF3139. Named 'Maisha' in VictronConnect.",
          urls: [{ id: uid(), label: "VictronConnect Manual", url: "https://www.victronenergy.com/battery-monitors/bmv-712-smart" }],
        }),
        blankItem({
          name: "SmartSolar MPPT 100/50 (Caravan Roof)",
          description: "Victron SmartSolar MPPT 100/50 — roof panel charge controller",
          usage: "Manages charging from 2x fixed Jayco roof panels (400W total). Max PV 100V, 50A output.",
          manufacturer: "Victron Energy",
          model: "SmartSolar MPPT 100/50",
          partNumber: "SCC110050210",
          serialNumber: "",
          notes: "Connected to Jayco Large 1 + Jayco Large 2 roof panels.",
          urls: [{ id: uid(), label: "Product Page", url: "https://www.victronenergy.com/solar-charge-controllers/smartsolar-mppt-100-50" }],
        }),
        blankItem({
          name: "SmartSolar MPPT 100/50 (External Input)",
          description: "Victron SmartSolar MPPT 100/50 — external portable panel input",
          usage: "Accepts portable panels (UTE 250W roof, XTM 200W blanket). Can charge car or caravan batteries.",
          manufacturer: "Victron Energy",
          model: "SmartSolar MPPT 100/50",
          partNumber: "SCC110050210",
          serialNumber: "HQ2547GJHCF",
          notes: "Bluetooth PIN: 558688 — PUK: 537680A71137. Named 'External Input' in VictronConnect.",
          urls: [],
        }),
        blankItem({
          name: "Orion XS 12/12-50A DC-DC Charger",
          description: "Victron Orion XS — charges caravan battery from tow vehicle alternator",
          usage: "50A DC-DC charger. Smart alternator compatible. Activates when vehicle is running.",
          manufacturer: "Victron Energy",
          model: "Orion XS 12/12-50A",
          partNumber: "ORI121217050",
          serialNumber: "HQ2529MAN2K",
          notes: "Bluetooth PIN: 767024 — PUK: 41A455135811. Named 'Car Input' in VictronConnect.",
          urls: [],
        }),
        blankItem({
          name: "Orion-Tr 12/24-10A DC-DC Converter",
          description: "Victron Orion-Tr isolated 12V→24V converter (240W) for computer/24V loads",
          usage: "Powers 24V equipment (computer) from 12V caravan battery. Galvanic isolation.",
          manufacturer: "Victron Energy",
          model: "Orion-Tr 12/24-10A Isolated",
          partNumber: "ORI122424110",
          serialNumber: "HQ2447HUHUU",
          notes: "Named 'Computer' in VictronConnect.",
          urls: [],
        }),
        blankItem({
          name: "BMPRO J35D BMS / Charger",
          description: "BMPRO J35D — 35A DC-DC charger + solar MPPT + BMS for LiFePO4",
          usage: "All-in-one BMS, DC-DC charger and solar MPPT. LiFePO4 (4S). Input: 9–32V DC.",
          manufacturer: "BMPRO",
          model: "J35D",
          serialNumber: "",
          notes: "Pairs with ControlNODE, PX Gateway and JCONTROL display via CAN bus.",
          urls: [{ id: uid(), label: "BMPRO J35D Datasheet", url: "https://bmpro.com.au/j35d" }],
        }),
        blankItem({
          name: "BMPRO ControlNODE",
          description: "Wireless remote control node for BMPRO power system",
          usage: "Connects to J35D via CAN bus. Enables remote monitoring and control.",
          manufacturer: "BMPRO",
          model: "ControlNODE",
          serialNumber: "",
          notes: "",
          urls: [],
        }),
        blankItem({
          name: "BMPRO PXShunt500",
          description: "500A current shunt for precision battery monitoring",
          usage: "Measures charge/discharge current for accurate SoC%. Wired on battery negative.",
          manufacturer: "BMPRO",
          model: "PXShunt500",
          serialNumber: "",
          notes: "500A rated shunt.",
          urls: [],
        }),
        blankItem({
          name: "BMPRO JCONTROL Display",
          description: "Touchscreen control panel and display for BMPRO J35D system",
          usage: "Shows battery voltage, SoC%, charge current, solar input and system alerts.",
          manufacturer: "BMPRO",
          model: "JCONTROL",
          serialNumber: "",
          notes: "Mounted on caravan control panel.",
          urls: [],
        }),
      ],
    },
    {
      id: uid(),
      name: "CARAVAN — BATTERY BAY",
      locationDescription: "Battery storage compartment in caravan — LiFePO4 battery bank",
      category: "CARAVAN",
      sortOrder: 11,
      photoData: "",
      notes: "",
      items: [
        blankItem({
          name: "Caravan LiFePO4 Battery Bank",
          description: "LiFePO4 12V battery bank for caravan off-grid power",
          usage: "Primary caravan power storage. Charged via solar, DC-DC and mains inverter/charger.",
          manufacturer: "",
          model: "",
          serialNumber: "",
          notes: "Record actual battery model, serial and capacity here.",
          urls: [],
        }),
      ],
    },
    {
      id: uid(),
      name: "UTE — ELECTRICAL / DUAL BATTERY",
      locationDescription: "Tow vehicle electrical system — dual battery setup under bonnet or in tray",
      category: "UTE",
      sortOrder: 1,
      photoData: "",
      notes: "",
      items: [
        blankItem({
          name: "SmartShunt 500A Vehicle Monitor",
          description: "Victron SmartShunt 500A/50mV — dual battery SoC monitor for tow vehicle",
          usage: "Monitors tow vehicle battery bank. SoC%, current, voltage. Bluetooth via VictronConnect.",
          manufacturer: "Victron Energy",
          model: "SmartShunt 500A/50mV",
          partNumber: "SHU050210050",
          serialNumber: "",
          notes: "Named 'Vehicle Monitor' in VictronConnect. Installs on battery negative terminal.",
          urls: [],
        }),
        blankItem({
          name: "Vehicle Battery Bank",
          description: "Tow vehicle dual battery bank",
          usage: "Starts vehicle and powers accessories. Charges caravan via Orion XS DC-DC.",
          manufacturer: "",
          model: "",
          serialNumber: "",
          notes: "Record battery model, serial and capacity here.",
          urls: [],
        }),
      ],
    },
    {
      id: uid(),
      name: "CARAVAN — SAFETY SYSTEMS",
      locationDescription: "Towing and safety equipment — sway control, breakaway, brake controller",
      category: "CARAVAN",
      sortOrder: 20,
      photoData: "",
      notes: "",
      items: [
        blankItem({
          name: "SwayCommand Sway Control",
          description: "Electronic caravan sway control device",
          usage: "Detects and corrects caravan sway. Automatically applies brakes to stabilise.",
          manufacturer: "",
          model: "",
          serialNumber: "",
          notes: "",
          urls: [],
        }),
        blankItem({
          name: "Tow-Secure Breakaway System",
          description: "Breakaway braking system — applies brakes if van separates from vehicle",
          usage: "Safety requirement. Automatically activates caravan brakes if coupling fails.",
          manufacturer: "",
          model: "",
          serialNumber: "",
          notes: "Check breakaway cable condition before every trip.",
          urls: [],
        }),
        blankItem({
          name: "Brake Controller",
          description: "REDARC electric brake controller",
          usage: "Controls proportional electric braking from tow vehicle. Mounted in ute cabin.",
          manufacturer: "REDARC",
          model: "",
          serialNumber: "",
          notes: "",
          urls: [],
        }),
      ],
    },
  ];
}
