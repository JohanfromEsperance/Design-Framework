export type CheckState = "yes" | "no" | "na" | null;

export interface CheckItem {
  id: string;
  label: string;
  critical?: boolean;
}

export interface CheckSection {
  id: string;
  title: string;
  items: CheckItem[];
}

export interface ChecklistDef {
  id: string;
  title: string;
  subtitle: string;
  navLabel: string;
  sections: CheckSection[];
}

// ── D-2 SYSTEMS ───────────────────────────────────────────────────────────────

export const CHECKLIST_D2: ChecklistDef = {
  id: "d2",
  title: "D-2 Systems Check",
  subtitle: "Two days before departure — test all caravan and bakkie systems",
  navLabel: "D-2 Systems",
  sections: [
    {
      id: "caravan-service",
      title: "Service Confirmation",
      items: [
        { id: "svc-van-booked", label: "Caravan service booked / confirmed if due", critical: true },
        { id: "svc-ute-booked", label: "Tow vehicle service booked / confirmed if due", critical: true },
        { id: "svc-weights", label: "Tow vehicle and caravan weights confirmed within legal limits", critical: true },
      ],
    },
    {
      id: "mains-power",
      title: "Caravan — Mains Power",
      items: [
        { id: "mp-outlets", label: "240V outlets working", critical: true },
        { id: "mp-earth", label: "Earth leakage / RCD functioning", critical: true },
        { id: "mp-bms", label: "BMS switchover tested" },
      ],
    },
    {
      id: "gas",
      title: "Caravan — Gas System",
      items: [
        { id: "gas-on", label: "Gas bottle turned on", critical: true },
        { id: "gas-level", label: "Gas levels adequate", critical: true },
        { id: "gas-flow", label: "Gas flow tested at stove / cooker", critical: true },
        { id: "gas-bbq", label: "BBQ gas tested" },
        { id: "gas-hws", label: "Gas hot water system tested" },
      ],
    },
    {
      id: "fridge",
      title: "Caravan — Fridge",
      items: [
        { id: "fridge-gas", label: "Gas mode tested and operating" },
        { id: "fridge-12v", label: "12V / battery mode tested and operating" },
        { id: "fridge-240", label: "240V mains mode tested and operating" },
        { id: "fridge-set", label: "Set to maximum cooling on mains power for pre-trip chill" },
      ],
    },
    {
      id: "water",
      title: "Caravan — Water System",
      items: [
        { id: "water-hose", label: "External hose connected and tested", critical: true },
        { id: "water-pump", label: "Water pump operating correctly", critical: true },
        { id: "water-shower-iso", label: "Shower taps isolated", critical: true },
        { id: "water-taps", label: "All taps run and checked" },
        { id: "water-pressure", label: "Pressure regulator working correctly" },
        { id: "water-tanks", label: "Tanks closed and valve caps secured", critical: true },
        { id: "water-sterilise", label: "Water tank sterilising tablets added" },
        { id: "water-filter", label: "Inline filters checked" },
        { id: "water-leaks", label: "No leaks or unusual odours detected" },
      ],
    },
    {
      id: "van-battery",
      title: "Caravan — Battery & Electrical",
      items: [
        { id: "bat-mains", label: "Mains charging readings checked" },
        { id: "bat-12v-in", label: "External 12V input tested" },
        { id: "bat-solar", label: "Solar inputs tested (internal and external)" },
        { id: "bat-dcdc", label: "DC/DC charger tested" },
        { id: "bat-table12v", label: "Table 12V outlets tested" },
        { id: "bat-tv", label: "TV outlets tested" },
        { id: "bat-fans", label: "Extractor fans tested" },
        { id: "bat-ext12v", label: "External 12V points tested" },
        { id: "bat-breakaway", label: "Breakaway / ESC battery tested and functioning", critical: true },
      ],
    },
    {
      id: "bakkie-bat1",
      title: "Bakkie — Battery 1 (Main)",
      items: [
        { id: "bb1-mains", label: "Mains readings checked" },
        { id: "bb1-12v", label: "External 12V input tested" },
        { id: "bb1-solar", label: "Solar inputs tested (internal and external)" },
        { id: "bb1-dcdc", label: "DC/DC charger tested" },
      ],
    },
    {
      id: "bakkie-bat2",
      title: "Bakkie — Battery 2",
      items: [
        { id: "bb2-shunt", label: "Shunt readings checked" },
        { id: "bb2-12v", label: "External 12V input tested" },
        { id: "bb2-solar", label: "Solar inputs tested" },
      ],
    },
    {
      id: "bakkie-bat3",
      title: "Bakkie — Battery 3",
      items: [
        { id: "bb3-shunt", label: "Shunt readings checked" },
        { id: "bb3-12v", label: "External 12V input tested" },
        { id: "bb3-solar", label: "Solar inputs tested" },
      ],
    },
    {
      id: "bakkie-lithium",
      title: "Bakkie — Lithium Mobile Battery",
      items: [
        { id: "blit-shunt", label: "Shunt readings checked" },
        { id: "blit-charger", label: "Charger packed" },
        { id: "blit-solar", label: "Solar inputs tested" },
      ],
    },
    {
      id: "bakkie-solar-roof",
      title: "Bakkie — Solar Roof",
      items: [
        { id: "bsr-shunt", label: "Shunt readings checked" },
        { id: "bsr-output", label: "Solar output confirmed" },
        { id: "bsr-clean", label: "Solar panels cleaned and cables checked" },
      ],
    },
    {
      id: "bakkie-solar-blanket",
      title: "Bakkie — Solar Blanket",
      items: [
        { id: "bsb-shunt", label: "Shunt readings checked" },
        { id: "bsb-output", label: "Solar output confirmed" },
      ],
    },
    {
      id: "bakkie-12v",
      title: "Bakkie — 12V Equipment",
      items: [
        { id: "b12-kettle", label: "12V kettle tested and working" },
        { id: "b12-airfryer", label: "12V air fryer tested and working" },
        { id: "b12-toaster", label: "12V toaster tested and working" },
        { id: "b12-coffee", label: "12V coffee machine tested and working" },
        { id: "b12-pod", label: "12V Zandra coffee pod machine tested and working" },
        { id: "b12-starter", label: "12V starter battery checked" },
        { id: "b12-tyre", label: "12V tyre pump (wielpomp) tested and working", critical: true },
        { id: "b12-kayak", label: "12V kayak pump tested and working" },
        { id: "b12-indicators", label: "12V indicators tested" },
        { id: "b12-panel", label: "12V power panel checked" },
        { id: "b12-fridge", label: "12V fridge tested and operating", critical: true },
        { id: "b18-blower", label: "18V blower/vacuum + charger working" },
        { id: "b18-drill", label: "18V drill/rattle gun + chargers working" },
        { id: "b18-ryobi", label: "18V-12V Ryobi converter tested" },
      ],
    },
  ],
};

// ── DEPARTURE DAY ─────────────────────────────────────────────────────────────

export const CHECKLIST_DEPARTURE: ChecklistDef = {
  id: "departure",
  title: "Departure Day",
  subtitle: "Day of travel — hitching, internal, tyres, brakes and final safety checks",
  navLabel: "Departure Day",
  sections: [
    {
      id: "pre-hitch",
      title: "Pre-Hitching — External",
      items: [
        { id: "ph-gas-off", label: "Gas bottles turned off", critical: true },
        { id: "ph-power-disc", label: "240V power cord disconnected and stored", critical: true },
        { id: "ph-water-disc", label: "Water supply hose disconnected and stored" },
        { id: "ph-grey-drained", label: "Grey water hose emptied, washed and stored" },
        { id: "ph-tap-fitting", label: "Tap fitting removed and stored" },
        { id: "ph-ext-doors", label: "All external storage doors locked", critical: true },
        { id: "ph-ext-items", label: "All power cords, hoses and external items packed away" },
        { id: "ph-awning", label: "Awning locked and secured", critical: true },
        { id: "ph-step", label: "Entrance step retracted" },
        { id: "ph-stab-legs", label: "All four stabiliser legs raised and locked", critical: true },
        { id: "ph-chocks", label: "Wheel chocks removed" },
        { id: "ph-coupling", label: "Coupling lowered onto tow bar and locked", critical: true },
        { id: "ph-hitch-pin", label: "Safety locking pin engaged on coupling", critical: true },
        { id: "ph-chains", label: "Safety chains (Bow D-shackles) secured", critical: true },
        { id: "ph-breakaway", label: "Breakaway / Brake Safe cable secured to tow vehicle", critical: true },
        { id: "ph-plug", label: "12-pin / 7-pin trailer plug connected", critical: true },
        { id: "ph-anderson", label: "Anderson plug connected" },
        { id: "ph-roof-clamps", label: "Roof clamps locked down", critical: true },
        { id: "ph-hatches", label: "All roof hatches closed and locked" },
        { id: "ph-windows", label: "All windows closed and locked" },
        { id: "ph-windshield", label: "Window shield secured" },
        { id: "ph-tv-ant", label: "TV antenna retracted / down" },
        { id: "ph-skylights", label: "Skylights retracted and closed" },
        { id: "ph-boot", label: "Boot and access doors shut and locked" },
        { id: "ph-handbrake-ute", label: "Tow vehicle handbrake ON" },
        { id: "ph-handbrake-van", label: "Caravan handbrake OFF", critical: true },
      ],
    },
    {
      id: "lights-check",
      title: "Lights & Electrical Check",
      items: [
        { id: "lt-brakes", label: "Brake lights working", critical: true },
        { id: "lt-ind-l", label: "Left indicator working", critical: true },
        { id: "lt-ind-r", label: "Right indicator working", critical: true },
        { id: "lt-tail", label: "Tail lights working", critical: true },
        { id: "lt-running", label: "Running / clearance lights working" },
        { id: "lt-brk-ctrl", label: "Electric brake controller tested and functioning", critical: true },
      ],
    },
    {
      id: "internal",
      title: "Internal Checks",
      items: [
        { id: "int-pump", label: "Water pump isolator switched OFF", critical: true },
        { id: "int-taps", label: "All taps off" },
        { id: "int-cupboards", label: "All cupboards and drawers closed and latched securely" },
        { id: "int-windows", label: "All windows and curtains closed and locked" },
        { id: "int-hatches", label: "All roof hatches closed and locked" },
        { id: "int-fridge-lock", label: "Fridge and freezer doors locked", critical: true },
        { id: "int-fridge-12v", label: "Fridge set to 12V for travel" },
        { id: "int-fridge-pack", label: "Fridge repacked securely for travel — no items in door" },
        { id: "int-tv-arm", label: "TV removed from arm and stored" },
        { id: "int-tv-ant", label: "TV antenna retracted and secured" },
        { id: "int-shower-door", label: "Shower door locked" },
        { id: "int-shower-hatch", label: "Shower hatch closed" },
        { id: "int-toilet-flap", label: "Toilet flap closed and lid down" },
        { id: "int-toilet-paper", label: "Toilet paper removed from holder" },
        { id: "int-sliding-door", label: "Sliding door open and locked for travel" },
        { id: "int-table", label: "Table folded and strapped down" },
        { id: "int-stove", label: "Stove covers on" },
        { id: "int-lights", label: "All lights off" },
        { id: "int-hws", label: "Hot water system off" },
        { id: "int-shades", label: "Window shades open (for road visibility)" },
        { id: "int-loose", label: "No loose items on shelves or benches — all secured" },
        { id: "int-heavy", label: "No heavy items in high positions" },
        { id: "int-weight", label: "Weight distribution checked — shower, floor, toilet, bed" },
        { id: "int-extinguisher", label: "Fire extinguisher intact and accessible", critical: true },
      ],
    },
    {
      id: "tyres",
      title: "Tyres — Pressure, Tread & Torque",
      items: [
        { id: "tyre-l", label: "Left caravan tyre pressure checked and correct", critical: true },
        { id: "tyre-r", label: "Right caravan tyre pressure checked and correct", critical: true },
        { id: "tyre-spare", label: "Spare tyre pressure checked", critical: true },
        { id: "tyre-ute-front", label: "Tow vehicle front tyres checked" },
        { id: "tyre-ute-rear", label: "Tow vehicle rear tyres checked" },
        { id: "tyre-tpms", label: "TPMS nuts locked and pressures verified" },
        { id: "tyre-visual", label: "Tyres inspected — no cracks, bulges or ageing" },
        { id: "tyre-tread", label: "Tread depth confirmed adequate (minimum 1.6mm)" },
        { id: "tyre-wear", label: "No uneven wear patterns observed" },
        { id: "tyre-valves", label: "All valve caps intact" },
        { id: "tyre-studs", label: "Stud markers aligned" },
        { id: "tyre-torque", label: "Wheel nuts torqued to 130–150 Nm (star pattern)", critical: true },
        { id: "tyre-retorque", label: "PLAN: re-torque wheel nuts after first 50 km", critical: true },
      ],
    },
    {
      id: "brakes-bearings",
      title: "Brakes & Bearings",
      items: [
        { id: "brk-pads", label: "Brake pads and drums inspected for wear" },
        { id: "brk-grind", label: "No grinding or squeaking when rolling" },
        { id: "brk-bearings", label: "Bearings checked for lubrication and play", critical: true },
        { id: "brk-breakaway", label: "Breakaway cable attached and functional", critical: true },
      ],
    },
    {
      id: "departure-final",
      title: "Departure — Final Safety",
      items: [
        { id: "dep-hitch-lock", label: "Hitch properly engaged and locked — double-checked", critical: true },
        { id: "dep-chains-conf", label: "Safety chains confirmed secured" },
        { id: "dep-trailer-brk", label: "Trailer brakes confirmed working", critical: true },
        { id: "dep-camera", label: "Reversing camera set up (if using)" },
        { id: "dep-listen", label: "Van sounds OK — listened with windows down for 2 km" },
        { id: "dep-offroad", label: "Tyre pressure adjusted for off-road conditions (if applicable)" },
      ],
    },
  ],
};

// ── PACKING ───────────────────────────────────────────────────────────────────

export const CHECKLIST_PACKING: ChecklistDef = {
  id: "packing",
  title: "Packing",
  subtitle: "Everything loaded and accounted for before departure",
  navLabel: "Packing",
  sections: [
    {
      id: "pk-docs",
      title: "Travel Documents & Administration",
      items: [
        { id: "doc-licence", label: "Driver's licence", critical: true },
        { id: "doc-keys", label: "Caravan and vehicle keys (including spares)", critical: true },
        { id: "doc-reg", label: "Vehicle registration papers" },
        { id: "doc-ins", label: "Vehicle insurance documents" },
        { id: "doc-van-reg", label: "Caravan registration confirmed current and paperwork on hand" },
        { id: "doc-van-ins", label: "Caravan insurance coverage current" },
        { id: "doc-roadside", label: "Roadside assistance membership details" },
        { id: "doc-permits", label: "Permits for national parks / Aboriginal reserves (if applicable)" },
        { id: "doc-money", label: "Money, credit cards and bank access" },
        { id: "doc-cash", label: "Cash stored and sealed in safe" },
        { id: "doc-maps", label: "Physical maps (backup) for area being visited" },
        { id: "doc-gps", label: "GPS / Compass" },
        { id: "doc-radio-lic", label: "Radio licence (VKS 737) if applicable" },
        { id: "doc-notebook", label: "Notebook and pen / stationery" },
      ],
    },
    {
      id: "pk-cook-van",
      title: "Cooking — Caravan",
      items: [
        { id: "cv-induction", label: "Induction plate" },
        { id: "cv-cutlery", label: "Cutlery — knife, fork and spoon for each person" },
        { id: "cv-plates", label: "Plates, bowls, cups — unbreakable" },
        { id: "cv-kettle", label: "Gas / induction kettle" },
        { id: "cv-saucepan", label: "Saucepan" },
        { id: "cv-potjie", label: "Potjie pots (x2)" },
        { id: "cv-lifter", label: "Egg lifter" },
        { id: "cv-knife", label: "Preparation knife" },
        { id: "cv-teatowels", label: "Tea towels" },
        { id: "cv-opener", label: "Can / bottle opener (x2)" },
        { id: "cv-dishcloths", label: "Dishcloths, steel wool and soap" },
        { id: "cv-rubbish", label: "Rubbish bags" },
        { id: "cv-scissors", label: "Scissors" },
        { id: "cv-paper", label: "Paper towel rolls" },
        { id: "cv-tongs", label: "Long tongs" },
      ],
    },
    {
      id: "pk-cook-bakkie",
      title: "Cooking — Bakkie / Outdoor",
      items: [
        { id: "cb-billy", label: "Billy and lid" },
        { id: "cb-weber", label: "Weber pot" },
        { id: "cb-frypan", label: "Fry pan / griller" },
        { id: "cb-lifter", label: "Egg lifter" },
        { id: "cb-knife", label: "Preparation knife" },
        { id: "cb-teatowels", label: "Tea towels" },
        { id: "cb-opener", label: "Can / bottle opener (x2)" },
        { id: "cb-dishcloths", label: "Dishcloths, steel wool and soap" },
        { id: "cb-rubbish", label: "Rubbish bags" },
        { id: "cb-weber-plates", label: "Weber BBQ plates and pizza plate" },
        { id: "cb-windscreen", label: "Windscreen (aluminium)" },
        { id: "cb-bbq-arm", label: "BBQ arm (rail mount)" },
        { id: "cb-fire-grill", label: "Grill for open fire cooking" },
        { id: "cb-firepit", label: "Fire pit and pot stand" },
        { id: "cb-paper", label: "Paper towel rolls" },
        { id: "cb-tongs", label: "Long tongs" },
      ],
    },
    {
      id: "pk-food",
      title: "Food & Groceries",
      items: [
        { id: "fd-bread", label: "Bread" },
        { id: "fd-milk", label: "Milk (long-life, powdered or canned)" },
        { id: "fd-potatoes", label: "Potatoes (whole or powdered)" },
        { id: "fd-veg", label: "Fresh and frozen vegetables (mushrooms, carrots, etc.)" },
        { id: "fd-fruit", label: "Fruit" },
        { id: "fd-cheese", label: "Cheese and margarine" },
        { id: "fd-canned", label: "Canned / dehydrated fruit, vegetables, meat and mixed meals" },
        { id: "fd-eggs", label: "Eggs (in carton, elastic band secured)" },
        { id: "fd-bacon", label: "Bacon" },
        { id: "fd-mince", label: "Mince" },
        { id: "fd-fish", label: "Fish" },
        { id: "fd-rice", label: "Fried / 2-minute rice" },
        { id: "fd-oil", label: "Cooking oil" },
        { id: "fd-condiments", label: "Jam, peanut butter, Vegemite, honey, sauces, salt and pepper" },
        { id: "fd-hot", label: "Tea, coffee, sugar, coffee pods" },
        { id: "fd-water", label: "Drinking water supply / fizzy water" },
        { id: "fd-pap", label: "Breakfast pap (Johan)" },
        { id: "fd-nibbles", label: "Nibbles and snacks" },
      ],
    },
    {
      id: "pk-chemicals",
      title: "Chemicals & Consumables",
      items: [
        { id: "ch-toilet-bags", label: "Toilet lavender blue bags" },
        { id: "ch-toilet-daily", label: "Toilet daily treatment" },
        { id: "ch-grey-tabs", label: "Grey water cleaner / refresher tablets" },
        { id: "ch-grey-bags", label: "Grey tank bags" },
        { id: "ch-waste-shovel", label: "Waste shovel, bags and spade (bakkie)" },
        { id: "ch-toilet-paper", label: "Biodegradable toilet paper" },
        { id: "ch-sterilise", label: "Water tank sterilising tablets" },
        { id: "ch-washing", label: "Washing powder (Cold Power)" },
        { id: "ch-liquid", label: "Washing up liquid and bowl" },
      ],
    },
    {
      id: "pk-bedding",
      title: "Bedding",
      items: [
        { id: "bd-pillows", label: "Pillows" },
        { id: "bd-blankets", label: "Blankets and sheets" },
        { id: "bd-ground", label: "Ground sheet" },
        { id: "bd-stretchers", label: "Outside stretchers and blow-up mattresses" },
      ],
    },
    {
      id: "pk-clothing",
      title: "Clothing & Footwear",
      items: [
        { id: "cl-trousers", label: "Trousers" },
        { id: "cl-shirts", label: "Shirts" },
        { id: "cl-underwear", label: "Underwear" },
        { id: "cl-socks", label: "Socks" },
        { id: "cl-handkerchiefs", label: "Handkerchiefs" },
        { id: "cl-pyjamas", label: "Pyjamas" },
        { id: "cl-shorts", label: "Shorts" },
        { id: "cl-light-jacket", label: "Light jumper / jacket" },
        { id: "cl-heavy-jacket", label: "Heavy jacket" },
        { id: "cl-towels", label: "Towels (large and small)" },
        { id: "cl-raincoat", label: "Raincoat / wet weather gear" },
        { id: "cl-hat", label: "Hat (wool / fur / cotton)" },
        { id: "cl-fly-net", label: "Fly net" },
        { id: "cl-boots", label: "Walking shoes / work boots" },
        { id: "cl-sandshoes", label: "Sandshoes (for wading / creek crossings)" },
        { id: "cl-overalls", label: "Overalls / work pants" },
        { id: "cl-sunglasses", label: "Sunglasses — driving and spare pair" },
        { id: "cl-sunscreen", label: "Sunscreen" },
        { id: "cl-repellent", label: "Insect repellent" },
      ],
    },
    {
      id: "pk-toiletries",
      title: "Toiletries",
      items: [
        { id: "tl-soap", label: "Soap (toilet and hand cleaner)" },
        { id: "tl-toothbrush", label: "Toothbrush and toothpaste (Sensodyne)" },
        { id: "tl-shaver", label: "12V electric shaver" },
        { id: "tl-hair", label: "Hair comb, brush and mirror" },
        { id: "tl-wipes", label: "Face washer / baby wipes" },
        { id: "tl-shampoo", label: "Shampoo and conditioner" },
        { id: "tl-towels", label: "Hand towels" },
        { id: "tl-deodorant", label: "Deodorant" },
      ],
    },
    {
      id: "pk-firstaid",
      title: "First Aid & Medical",
      items: [
        { id: "fa-medication", label: "Personal medication — sufficient for full trip duration", critical: true },
        { id: "fa-kit", label: "Comprehensive first aid kit and instruction book", critical: true },
        { id: "fa-snake", label: "Snake bite kit", critical: true },
        { id: "fa-skin", label: "Skin cream (for bites and rashes)" },
        { id: "fa-burn", label: "Burn cream" },
        { id: "fa-sunburn", label: "Sunburn cream" },
        { id: "fa-bandaids", label: "Band-aids" },
        { id: "fa-headache", label: "Headache tablets / powders" },
        { id: "fa-cough", label: "Cough medicine and throat lozenges" },
        { id: "fa-eyeear", label: "Eye and ear drops" },
        { id: "fa-moisturiser", label: "Lip and hand moisturising cream" },
        { id: "fa-coldpack", label: "Cold packs" },
        { id: "fa-panadol", label: "Osteo Panadol" },
        { id: "fa-fly", label: "Fly repellent spray (vliegspit)" },
        { id: "fa-mosquito", label: "Mosquito tablets" },
        { id: "fa-bushman", label: "Bushman roll-on insect repellent" },
        { id: "fa-flynet", label: "Fly net / head net" },
      ],
    },
    {
      id: "pk-tech",
      title: "Technology & Communications",
      items: [
        { id: "tc-johan-laptop", label: "Johan laptop and power supply" },
        { id: "tc-zandra-laptop", label: "Zandra laptop and power supply" },
        { id: "tc-starlink", label: "Starlink unit, cables and battery" },
        { id: "tc-johan-cam", label: "Johan camera and charger" },
        { id: "tc-zandra-cam", label: "Zandra camera and charger" },
        { id: "tc-memory", label: "Memory cards" },
        { id: "tc-ssd", label: "Hard drives (SSD)" },
        { id: "tc-usb", label: "USB cables (variety)" },
        { id: "tc-johan-phone", label: "Johan mobile phone and charger" },
        { id: "tc-zandra-phone", label: "Zandra mobile phone and charger" },
        { id: "tc-torches", label: "Torches / headlamps and chargers" },
        { id: "tc-sat-phone", label: "Satellite phone", critical: true },
        { id: "tc-uhf", label: "UHF CB radio (vehicle-to-vehicle)" },
        { id: "tc-epirb", label: "SPOT tracker or EPIRB emergency beacon", critical: true },
        { id: "tc-powerbank", label: "Power bank" },
        { id: "tc-safe", label: "Safe and keys" },
      ],
    },
    {
      id: "pk-camping",
      title: "Camping & Outdoor Setup",
      items: [
        { id: "camp-awn-van", label: "Caravan awning sidewalls, pegs, poles and ropes" },
        { id: "camp-awn-bak", label: "Bakkie awning sidewalls, pegs, poles and ropes" },
        { id: "camp-table", label: "Tables (x2)" },
        { id: "camp-chairs", label: "Fold-up chairs (x4 total)" },
        { id: "camp-lpg", label: "3x LPG cylinders (filled)", critical: true },
        { id: "camp-matches", label: "Matches and firelighters" },
        { id: "camp-bucket", label: "Plastic bucket and funnel" },
        { id: "camp-rope", label: "Extra rope (various lengths)" },
        { id: "camp-clothesline", label: "Clothesline and pegs" },
        { id: "camp-tarp", label: "Tarpaulin / groundsheet" },
        { id: "camp-power", label: "Power leads (bakkie and caravan)" },
        { id: "camp-12vcables", label: "12V cables" },
        { id: "camp-washing", label: "Washing powder and washing up liquid" },
        { id: "camp-doormat", label: "Doormat" },
      ],
    },
    {
      id: "pk-fishing",
      title: "Fishing Equipment",
      items: [
        { id: "fish-long", label: "2x long beach rods" },
        { id: "fish-short", label: "2x short rods" },
        { id: "fish-fly", label: "Fly fishing rod" },
        { id: "fish-box", label: "Fishing box (caravan side panel storage)" },
        { id: "fish-bag", label: "Fishing bag (bakkie)" },
        { id: "fish-vest", label: "Fishing vest (bakkie)" },
        { id: "fish-net", label: "Fishing net, hook and pouch (bakkie)" },
        { id: "fish-holders", label: "Beach rod holders" },
      ],
    },
    {
      id: "pk-diving",
      title: "Diving & Snorkelling",
      items: [
        { id: "div-j-suit", label: "Johan wetsuit" },
        { id: "div-j-booties", label: "Johan booties" },
        { id: "div-j-fins", label: "Johan flippers" },
        { id: "div-j-mask", label: "Johan mask (brille)" },
        { id: "div-j-gloves", label: "Johan gloves (handskoene)" },
        { id: "div-z-suit", label: "Zandra wetsuit" },
        { id: "div-z-booties", label: "Zandra booties" },
        { id: "div-z-fins", label: "Zandra flippers" },
        { id: "div-z-mask", label: "Zandra mask" },
        { id: "div-z-gloves", label: "Zandra gloves" },
        { id: "div-speargun", label: "Speargun, buoy and rope (with spare parts)" },
        { id: "div-weightbelt", label: "Weight belt" },
        { id: "div-shark", label: "Shark shield and charger", critical: true },
      ],
    },
    {
      id: "pk-walking",
      title: "Walking & Navigation",
      items: [
        { id: "wk-whistle", label: "Whistle" },
        { id: "wk-pocketknife", label: "Pocket knife" },
        { id: "wk-matches", label: "Waterproof matches" },
        { id: "wk-mirror", label: "Small signalling mirror" },
        { id: "wk-waterbottle", label: "Full water bottle (belt-compatible)" },
        { id: "wk-raincoat", label: "Rain jacket in backpack" },
        { id: "wk-backpack", label: "Small backpack" },
        { id: "wk-binoculars", label: "Binoculars" },
      ],
    },
    {
      id: "pk-tools",
      title: "Vehicle Tools & Repair",
      items: [
        { id: "tl-spanners", label: "Ring / open-end spanners (1 set)" },
        { id: "tl-sockets", label: "Sockets and drives (1 set)" },
        { id: "tl-screwdrivers", label: "Screwdrivers (various sizes)" },
        { id: "tl-pliers-mg", label: "Multigrip pliers" },
        { id: "tl-pliers-eng", label: "Engineers pliers (8\") and side-cutting pliers" },
        { id: "tl-spanners-adj", label: "Adjustable spanners (6\", 8\", 10\", 12\")" },
        { id: "tl-hammer", label: "Engineers hammer" },
        { id: "tl-chisel", label: "Cold chisel (medium)" },
        { id: "tl-solder", label: "Soldering iron, solder and flux" },
        { id: "tl-hacksaw", label: "Hacksaw and spare blades (16 and 32 TPI)" },
        { id: "tl-drill", label: "Cordless hand drill and drill bits" },
        { id: "tl-punch", label: "Centre punch" },
        { id: "tl-light", label: "Lead light / torch and spare batteries" },
        { id: "tl-clamps", label: "G-clamps (4\" and 6\")" },
        { id: "tl-manual", label: "Workshop manual or handbook" },
        { id: "tl-rags", label: "Cleaning rags" },
        { id: "tl-tape", label: "Electrical tape and duct / gaffer tape" },
      ],
    },
    {
      id: "pk-elec-spares",
      title: "Electrical Spares",
      items: [
        { id: "es-headlights", label: "Spare headlight globes" },
        { id: "es-tail", label: "Spare taillight and indicator globes" },
        { id: "es-tape", label: "Roll of plastic insulation tape" },
        { id: "es-jumper", label: "Heavy duty battery jumper leads (surge protected)" },
        { id: "es-wire", label: "Insulated wire (3mm and 4mm, assorted lengths)" },
        { id: "es-terminals", label: "Male and female terminals and wire joiners" },
        { id: "es-fuses", label: "Spare fuses (fridge, radio, ancillaries)" },
        { id: "es-multimeter", label: "Multi-meter or fault-finding test light" },
      ],
    },
    {
      id: "pk-tyre-repair",
      title: "Tyre Repair & Recovery",
      items: [
        { id: "tr-spare-ute", label: "Spare tyre on wheel rim (tow vehicle)", critical: true },
        { id: "tr-spare-van", label: "Spare tyre on wheel rim (caravan)", critical: true },
        { id: "tr-kit", label: "Tyre repair kit" },
        { id: "tr-compressor", label: "12V electric tyre compressor", critical: true },
        { id: "tr-gauge", label: "Tyre pressure gauge (dial type, 0–60 psi)" },
        { id: "tr-valves", label: "Spare valve caps" },
        { id: "tr-jack", label: "Hi-lift jack (2.5 tonne minimum)", critical: true },
        { id: "tr-bead", label: "Tyre bead patches and adhesive" },
        { id: "tr-jacking-plate", label: "Jacking plate (300mm × 20mm marine ply)" },
        { id: "tr-wheelbrace", label: "Wheel brace" },
        { id: "tr-chocks", label: "Wheel chocks and levelling ramps" },
      ],
    },
    {
      id: "pk-fluids",
      title: "Fluids & Lubricants",
      items: [
        { id: "fl-jerrycans", label: "Fuel jerry cans (Australian Standards approved)" },
        { id: "fl-water-containers", label: "Water containers — extra (at least 2)" },
        { id: "fl-water-bladder", label: "Water bladder (bakkie)" },
        { id: "fl-engine-oil", label: "Engine oil 5L (for remote trips)" },
        { id: "fl-gearbox-oil", label: "Gearbox oil 5L" },
        { id: "fl-brake-fluid", label: "Brake fluid (~1 litre)" },
        { id: "fl-funnel", label: "Fuel funnel with gauze filter" },
        { id: "fl-fill-hose", label: "Fill hose for gearbox / diffs" },
        { id: "fl-grease", label: "Multi-purpose grease (small tin)" },
        { id: "fl-coolant", label: "Engine coolant / antifreeze" },
        { id: "fl-wd40", label: "WD-40 / lubricant spray" },
      ],
    },
    {
      id: "pk-vehicle-spares",
      title: "Vehicle Spares",
      items: [
        { id: "vs-belts", label: "Engine belt(s) — including A/C and power steering" },
        { id: "vs-rad-hoses", label: "Radiator hoses (complete set)" },
        { id: "vs-heater-hose", label: "Spare heater hose" },
        { id: "vs-fuel-line", label: "Reinforced plastic fuel line (spare length)" },
        { id: "vs-hose-clips", label: "Worm drive hose clips (assorted)" },
        { id: "vs-brake-hose", label: "Spare brake hose(s)" },
        { id: "vs-nuts", label: "Assorted nuts, bolts and washers" },
        { id: "vs-ubolts", label: "Spring U-bolts and nuts (if leaf-spring vehicle)" },
        { id: "vs-adhesives", label: "Adhesives (Araldite, gasket cement, rubber cement, silicone)" },
        { id: "vs-gaskets", label: "Seals and gaskets (assorted)" },
        { id: "vs-wash-fluid", label: "Windscreen washing fluid" },
        { id: "vs-extinguisher", label: "Fire extinguisher (x2)", critical: true },
        { id: "vs-wire", label: "Wire and cable ties" },
      ],
    },
    {
      id: "pk-caravan-spares",
      title: "Caravan Spares",
      items: [
        { id: "cs-pipe", label: "Water pipe fittings" },
        { id: "cs-fuses", label: "Fuses (battery, inverter and general)" },
        { id: "cs-hose", label: "Spare hose" },
        { id: "cs-bearings", label: "Bearing set and oil seal" },
        { id: "cs-grease", label: "High temperature grease" },
        { id: "cs-bulbs", label: "Bulbs and lights (assorted)" },
        { id: "cs-plugs", label: "Flat pin plugs (male and female)" },
        { id: "cs-lpg-reg", label: "LPG regulator (spare)" },
        { id: "cs-anderson", label: "50 amp Anderson plug (spare)" },
      ],
    },
    {
      id: "pk-outback",
      title: "Outback & Recovery Equipment",
      items: [
        { id: "ob-sandtracks", label: "Sand tracks (2 pairs ideal)", critical: true },
        { id: "ob-tow-strap", label: "Towing sling / strap" },
        { id: "ob-snatch", label: "Snatch strap", critical: true },
        { id: "ob-shackles", label: "D-shackles (assorted, rated 2.5t SWL)", critical: true },
        { id: "ob-winch", label: "Winch (electric or hand) with cable and spare shear pins" },
        { id: "ob-snatch-block", label: "Snatch block (30cwt SWL)" },
        { id: "ob-recovery-pts", label: "Tow / recovery points confirmed front and rear of vehicle", critical: true },
        { id: "ob-shovel", label: "Shovel (for recovery and sanitation)", critical: true },
        { id: "ob-axe", label: "Axe (4–4.5 lb, sharp, with blade guard)" },
        { id: "ob-gloves", label: "Leather work gloves" },
        { id: "ob-generator", label: "Generator (12V or 240V)" },
      ],
    },
  ],
};

// ── ANNUAL SERVICE ────────────────────────────────────────────────────────────

export const CHECKLIST_SERVICE: ChecklistDef = {
  id: "service",
  title: "Annual Service",
  subtitle: "Jayco-approved annual caravan service sheet — every 12 months or 10,000 km",
  navLabel: "Annual Service",
  sections: [
    {
      id: "svc-registration",
      title: "Registration, Insurance & Administration",
      items: [
        { id: "reg-van", label: "Caravan registration confirmed current", critical: true },
        { id: "reg-ins", label: "Insurance coverage reviewed and updated", critical: true },
        { id: "reg-service", label: "Full service booked (annually or every 10,000 km)", critical: true },
        { id: "reg-logbook", label: "Logbook stamp requested (for resale value)" },
        { id: "reg-bearings", label: "Bearings checked, re-packed and oil seal torques confirmed", critical: true },
        { id: "reg-hws", label: "HWS anode changed and cleanout completed" },
        { id: "reg-breakaway", label: "Breakaway system tested and battery checked", critical: true },
        { id: "reg-esc", label: "Electronic stabilizer control tested and checked" },
      ],
    },
    {
      id: "svc-interior",
      title: "Interior & Electrical",
      items: [
        { id: "int-appliances", label: "Security of all appliances checked" },
        { id: "int-catches", label: "Cupboard catches and latches adjusted" },
        { id: "int-240v-lights", label: "240V interior lighting tested" },
        { id: "int-12v-fridge", label: "12V fridge operation tested" },
        { id: "int-rcd", label: "RCD / safety switch tested", critical: true },
        { id: "int-240v-points", label: "240V power lead and power points tested", critical: true },
      ],
    },
    {
      id: "svc-gas",
      title: "Gas System",
      items: [
        { id: "gas-cooker", label: "Cooker operation tested", critical: true },
        { id: "gas-fridge", label: "Gas refrigerator operation tested" },
        { id: "gas-hws", label: "Gas hot water system tested" },
        { id: "gas-piping", label: "Gas piping (underbody) inspected for leaks", critical: true },
        { id: "gas-anode", label: "Anode replaced if required" },
        { id: "gas-seals", label: "Gas bottle seals and regulators inspected" },
      ],
    },
    {
      id: "svc-plumbing",
      title: "Plumbing System",
      items: [
        { id: "plumb-mains", label: "Plumbing tested on mains pressure" },
        { id: "plumb-pump", label: "12V pump tested" },
        { id: "plumb-leaks", label: "Internal leaks inspected and confirmed none" },
        { id: "plumb-underbody", label: "Underbody hoses and waste pipes inspected" },
        { id: "plumb-flush", label: "Water tanks flushed and refilled" },
      ],
    },
    {
      id: "svc-bearings",
      title: "Wheel Bearings",
      items: [
        { id: "brg-inspect", label: "Bearings inspected for uneven wear", critical: true },
        { id: "brg-wash", label: "Bearings washed" },
        { id: "brg-repack", label: "Bearings re-packed with new grease", critical: true },
        { id: "brg-seals", label: "Bearing seals replaced" },
        { id: "brg-pins", label: "Split pins replaced" },
      ],
    },
    {
      id: "svc-brakes",
      title: "Brakes & Safety Systems",
      items: [
        { id: "brk-handbrake", label: "Handbrake travel adjusted" },
        { id: "brk-adjust", label: "Brakes adjusted" },
        { id: "brk-magnets", label: "Electric brake magnets inspected", critical: true },
        { id: "brk-linings", label: "Brake linings inspected and adjusted", critical: true },
        { id: "brk-brakesafe", label: "BrakeSafe system tested (if fitted)" },
        { id: "brk-alko", label: "AL-KO ESC / Stability Control tested (if fitted)" },
      ],
    },
    {
      id: "svc-wheels",
      title: "Wheels & Tyres",
      items: [
        { id: "whl-tread", label: "Tyre tread wear inspected — including spare" },
        { id: "whl-rims", label: "Rims inspected for dents or damage" },
        { id: "whl-pressure", label: "Tyre pressures adjusted and recorded (PSI)" },
        { id: "whl-torque", label: "Wheel nuts tightened to specification" },
        { id: "whl-balance", label: "Wheels balanced (if required)" },
        { id: "whl-nitrogen", label: "Nitrogen refill (if applicable)" },
        { id: "whl-ballwt", label: "Caravan ball weight recorded" },
        { id: "whl-vanwt", label: "Caravan weight at service recorded" },
      ],
    },
    {
      id: "svc-suspension",
      title: "Suspension",
      items: [
        { id: "sus-mounts", label: "Suspension mounts and chassis inspected" },
        { id: "sus-nipples", label: "Suspension nipples re-greased" },
        { id: "sus-ubolts", label: "U-bolts / pivot bolts tensioned to specification" },
        { id: "sus-shocks", label: "Shock absorbers, bushes and straps inspected" },
        { id: "sus-control-arms", label: "Control arms and Aeon spring aids inspected" },
        { id: "sus-wear", label: "Tyres checked for abnormal wear patterns" },
        { id: "sus-alignment", label: "Wheel alignment / toe adjusted (if required)" },
      ],
    },
    {
      id: "svc-chassis",
      title: "Chassis & Coupling",
      items: [
        { id: "chs-bolts", label: "Coupling bolts checked and tightened" },
        { id: "chs-adjust", label: "Coupling adjusted if required" },
        { id: "chs-paint", label: "Coupling re-painted if required" },
        { id: "chs-jacks", label: "Corner jacks lubricated" },
        { id: "chs-jockey", label: "Jockey wheel clamp and bearing greased" },
        { id: "chs-chassis", label: "Chassis inspected for rust or cracks" },
        { id: "chs-rust", label: "Towbar inspected for rust, cracks and tightness", critical: true },
      ],
    },
    {
      id: "svc-lights",
      title: "External Lighting",
      items: [
        { id: "lgt-indicators", label: "Indicators tested (left and right)" },
        { id: "lgt-brakes", label: "Brake lights tested" },
        { id: "lgt-tail", label: "Tail lights tested" },
        { id: "lgt-running", label: "Running / clearance lights tested" },
      ],
    },
    {
      id: "svc-seals",
      title: "Seals, Ventilation & Exterior",
      items: [
        { id: "seal-doors", label: "Door and window seals inspected for cracks or lifting" },
        { id: "seal-hatches", label: "Roof hatches and vents inspected for mould or water damage" },
        { id: "seal-silicone", label: "Silicone or rubber sealant reapplied where needed" },
        { id: "seal-fans", label: "Fans and aircon filters cleaned" },
        { id: "seal-exterior", label: "Windows, screens and vents cleaned and checked" },
        { id: "seal-roof", label: "Roof and seals inspected for wear or gaps" },
        { id: "seal-awning", label: "Awning extension and locks tested" },
        { id: "seal-moisture", label: "Moisture test completed and recorded", critical: true },
      ],
    },
    {
      id: "svc-final",
      title: "Finalisation",
      items: [
        { id: "fin-stamp", label: "Service book stamped", critical: true },
        { id: "fin-advised", label: "All additional repairs identified and actioned" },
        { id: "fin-hitch-lube", label: "Jockey wheel and stabilisers lubricated" },
      ],
    },
  ],
};

export const ALL_CHECKLISTS: ChecklistDef[] = [
  CHECKLIST_D2,
  CHECKLIST_DEPARTURE,
  CHECKLIST_PACKING,
  CHECKLIST_SERVICE,
];

export function computeStats(
  checklist: ChecklistDef,
  state: Record<string, CheckState>
) {
  let total = 0;
  let answered = 0;
  let yesCount = 0;
  let noCount = 0;
  let naCount = 0;
  let criticalUnchecked = 0;

  for (const section of checklist.sections) {
    for (const item of section.items) {
      total++;
      const s = state[item.id] ?? null;
      if (s === "yes") { answered++; yesCount++; }
      else if (s === "no") { answered++; noCount++; }
      else if (s === "na") { answered++; naCount++; }
      else if (item.critical) { criticalUnchecked++; }
    }
  }

  const unchecked = total - answered;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return { total, answered, unchecked, yesCount, noCount, naCount, criticalUnchecked, pct };
}
