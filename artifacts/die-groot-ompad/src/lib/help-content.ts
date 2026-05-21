import type { HelpContent } from "@/components/help-panel";

// ── Budget sub-page help ──────────────────────────────────────────────────────

export const HELP_BUDGET_OVERVIEW: HelpContent = {
  title: "Budget Overview",
  intro: "Your 5-year (60-month) financial command centre. Every dollar in and out of your Big Lap life is tracked here. The grid starts in March 2026 and runs 60 months forward.",
  items: [
    { label: "Opening Balance", desc: "The total cash you have on Day 1 — savings, bank accounts, term deposits. Enter once in Month 1. All subsequent opening balances are auto-calculated as the previous month's closing balance." },
    { label: "Year 1–5 buttons", desc: "Shows 12 months at a time. Use Custom to select any start/end month for detailed review or printing." },
    { label: "CPI Index", desc: "Applies compound inflation to all expense categories from the selected month. Default 2.5% pa — realistic for Australian costs. Run this once after you've set up Year 1 to inflate Years 2–5 automatically." },
    { label: "Export / Import", desc: "Export downloads the full 60-month grid as CSV. Open in Excel, edit values, save, then Import to reload. All sub-page data (rental, income, super) is preserved through the cycle." },
    { label: "Save / Hard Save", desc: "Changes auto-save every 600ms. Hard Save commits immediately to the database — use it before closing the tab." },
  ],
  tips: [
    "Set up Year 1 first with realistic monthly amounts, then use CPI Index to project Years 2–5.",
    "Income rows (rental, salary) are populated automatically from sub-pages — avoid overriding them manually.",
    "The 60-Month Running Balance chart is the key health check — it must never dip below zero.",
  ],
};

export const HELP_BUDGET_INCOME: HelpContent = {
  title: "Income Worksheet",
  intro: "Track all income sources across 60 months with both Forecast and Actual columns. The worksheet feeds into the main budget grid — Actual overrides Forecast when both are entered.",
  items: [
    { label: "Salary / Employment", desc: "Include any paid work during the lap. Salary income reduces after super contributions are deducted at source by your employer." },
    { label: "Rental Net", desc: "For reference only — the authoritative rental cashflow comes from the Rental Property sub-page. Changes here do not override that calculation." },
    { label: "Share Dividends", desc: "Enter dividend income as received (franked dividends require adjustment for the tax offset in the Tax sub-page)." },
    { label: "Centrelink / Govt", desc: "Age Pension, Carer Payment, or other government income. Model your eligibility in the Age Pension sub-page first." },
    { label: "Super Pension", desc: "Account-based pension withdrawals — typically tax-free after age 60. Set a minimum drawdown in the Superannuation sub-page." },
  ],
  tips: [
    "Click any month cell and type the amount — Tab moves to the next column.",
    "Forecast gives you the 'plan', Actual tracks reality. The variance column shows the gap.",
  ],
};

export const HELP_BUDGET_SAVINGS: HelpContent = {
  title: "Savings Worksheet",
  intro: "Track a dedicated savings pool — your financial buffer for the Big Lap. Enter monthly deposits (money flowing in) and withdrawals (money drawn down). The running balance shows how long your savings will last.",
  items: [
    { label: "Opening Balance", desc: "The total in this savings account at the start of Month 1." },
    { label: "Monthly Deposit", desc: "Regular transfers into the savings pool, e.g. proceeds from asset sales, inheritance, lump sums." },
    { label: "Monthly Withdrawal", desc: "Drawdowns from the pool to top up your spending account when expenses exceed income." },
    { label: "Closing Balance", desc: "Auto-calculated. If it reaches zero before the 60 months end, you need either more income, lower expenses, or a larger opening balance." },
  ],
  tips: [
    "A zero closing balance is a hard stop — plan to keep at least 3 months of expenses as a buffer.",
    "Large one-off deposits (e.g. property sale settlement) can be entered in the specific month they are received.",
  ],
};

export const HELP_BUDGET_TAX: HelpContent = {
  title: "Tax Worksheet",
  intro: "Estimates your combined Australian income tax liability across the 5 years, based on income from all sources. Uses ATO 2025–26 tax brackets and the Low Income Tax Offset (LITO).",
  items: [
    { label: "Taxable Income", desc: "Salary + unfranked dividends + capital gains (discounted 50% if held >12 months) + rental income, minus deductions and super contributions." },
    { label: "Franking Credits", desc: "Add the gross-up value of fully-franked dividends. Australian-resident shareholders receive a credit equal to 30/70 of the dividend." },
    { label: "Rental Deductions", desc: "Interest expense, depreciation, management fees and other costs are deductible against rental income. Negative gearing creates a net deduction." },
    { label: "LITO", desc: "Low Income Tax Offset — reduces to zero at $66,667 taxable income. Automatically applied." },
    { label: "Medicare Levy", desc: "2% of taxable income (reduced for low incomes, zero below ~$26,000 for singles)." },
  ],
  tips: [
    "This is an estimate only. Consult your accountant for an accurate assessment.",
    "Super contributions (SPA and employer) reduce taxable income — ensure they are entered in the Superannuation sub-page.",
  ],
  warning: "Capital gains from property sales or share parcels can push taxable income into a higher bracket in a single year. Model each year independently.",
};

export const HELP_BUDGET_RENTAL: HelpContent = {
  title: "Rental Property",
  intro: "Configure your investment property to compute the net monthly cashflow. This figure is automatically injected into the Rental Net Income row of the main budget grid for all 60 months.",
  items: [
    { label: "Weekly Rent", desc: "Gross rent your tenant pays. Perth metro median is $650–750/week (2025). Regional properties typically $350–500/week." },
    { label: "Vacancy Weeks", desc: "Allow 2–4 weeks per year for tenant changeovers, maintenance access, and void periods." },
    { label: "Management Fee", desc: "Agent commission — typically 7–10% of gross annual rent in WA. Some agents charge 8.5% + GST." },
    { label: "Letting Fee", desc: "Charged when the agent finds a new tenant — typically 1–2 weeks rent." },
    { label: "Interest Expense", desc: "Annual interest on your mortgage (loan balance × interest rate). Principal repayments are NOT included — they are a balance sheet event, not a cashflow expense." },
    { label: "Council & Water Rates", desc: "Owner-paid in WA. Typically $1,200–1,800 council + $1,100–1,400 water per year." },
    { label: "Net Monthly Cashflow", desc: "Gross rent minus all cash expenses, divided by 12. A negative figure means the property costs more per month than it earns — this reduces your income total in the main grid." },
  ],
  tips: [
    "A negatively-geared property still has tax benefits — the net loss reduces your taxable income (shown in the Tax sub-page).",
    "Land tax applies if your unimproved land value exceeds the WA threshold (~$300k for individuals). Check with your local OSR.",
  ],
};

export const HELP_BUDGET_PLANNING: HelpContent = {
  title: "Trip Planning Budget",
  intro: "Allocate monthly travel spending budgets at a trip level. Useful for cross-referencing your planned legs with the main budget grid to ensure month-by-month cashflow stays healthy.",
  items: [
    { label: "Monthly Allocation", desc: "How much you plan to spend on this trip in each calendar month. Cross-reference with the Travel Expenses section of the main grid." },
    { label: "Actual vs Forecast", desc: "Enter actual spending as you go. The variance highlights months where you overspent or underspent." },
  ],
  tips: [
    "Use the Planner tab's 3-scenario fuel estimate to build realistic monthly fuel budgets.",
    "Free camps can dramatically reduce the Parks & Accommodation line — budget for 30–40% free camping.",
  ],
};

export const HELP_BUDGET_SUPER: HelpContent = {
  title: "Superannuation",
  intro: "Projects the balance of each super account over time, accounting for employer contributions, personal SPA contributions, investment returns, insurance premiums, and lump-sum withdrawals. The monthly SPA contribution is auto-synced to the Super SPA Contribution row in the main budget grid.",
  items: [
    { label: "Employer Rate", desc: "Superannuation Guarantee — 11.5% for 2025–26, rising to 12% from 1 July 2025. Employer contributions stop when you cease employment." },
    { label: "Personal Rate (SPA)", desc: "Salary Sacrifice or after-tax contribution rate. E.g. 3% on a $160,000 salary = $400/month SPA. This is written automatically to the budget grid's Super SPA Contribution row." },
    { label: "Return Rate", desc: "Long-term average return assumption. AustralianSuper Balanced (MySuper) has returned ~8.5% pa over 10 years. Use 7% for conservative modelling." },
    { label: "Contributions End Year", desc: "The year you stop making contributions (typically when employment ends). After this, the balance compounds on returns only." },
    { label: "Life Insurance Premium", desc: "Annual premium deducted from the super balance — common in default super insurance. Check your last statement." },
    { label: "Lump-Sum Withdrawal", desc: "A single planned withdrawal from super (e.g. to pay down mortgage). The balance drops in that year's calculation." },
    { label: "Preservation Age", desc: "The age at which you can access your super. Born 1964 or later = age 60. Access before preservation age is restricted to compassionate grounds." },
  ],
  tips: [
    "Super balances below $500k are eligible for the carry-forward concessional contributions rule — consult your financial adviser.",
    "Account-based pension drawdowns are tax-free after age 60 — model this in the Income sub-page.",
  ],
  warning: "Super projections are estimates only. Actual returns will vary. This is not financial advice.",
};

export const HELP_BUDGET_PENSION: HelpContent = {
  title: "Age Pension",
  intro: "Models your Centrelink Age Pension entitlement using both the Assets Test and the Income Test. Centrelink pays the lower result of the two tests. The result feeds into the Centrelink / Govt income row of the main budget grid.",
  items: [
    { label: "Assets Test", desc: "Full pension (couple, homeowners) below $470,000 in assessable assets. Pension reduces by $3/fortnight per $1,000 above this threshold. Cut-off ~$1,003,000 (Sept 2025). Super is assessable after preservation age." },
    { label: "Income Test", desc: "Full pension below $10,000 combined annual income (couple). Reduces by $0.50 per $1 earned above this. Deeming rules apply to financial assets — deemed income is calculated at 0.25% on the first $62,600 (single) and 2.25% above." },
    { label: "Homeowner Status", desc: "Your principal place of residence is exempt from the assets test — this significantly increases your pension entitlement compared to non-homeowners." },
    { label: "Qualifying Age", desc: "Age 67 for anyone born on or after 1 January 1957." },
  ],
  tips: [
    "Spending down super before pension age can increase your pension entitlement — seek professional advice before doing this.",
    "The Rent Assistance supplement applies if you are renting on the road and not classified as a homeowner.",
  ],
  warning: "Centrelink rules change regularly. Always verify current thresholds at servicesaustralia.gov.au before making financial decisions.",
};

export const HELP_BUDGET_SHARES: HelpContent = {
  title: "Share Portfolio",
  intro: "Track your Australian and international share holdings, model dividend income, and project portfolio value over the 5-year period.",
  items: [
    { label: "Purchase Price / Units", desc: "Your cost base per share — used to calculate capital gains when you sell. Accurate cost base records are essential for tax purposes." },
    { label: "Dividend Yield", desc: "Annual dividend as a percentage of current market value. ASX200 average yield is ~4.1% fully franked. Enter the yield, and the worksheet projects annual dividend income." },
    { label: "Franking Level", desc: "100% = fully franked dividend. The franking credit offsets your income tax. A $700 fully franked dividend carries a $300 credit = $1,000 gross income." },
    { label: "Projected Value", desc: "Market price growth is modelled at the rate you enter. Share prices are volatile — use 5–7% real growth for long-term projections." },
  ],
  tips: [
    "Sell shares held >12 months to access the 50% CGT discount.",
    "Keep your cost base spreadsheet current — every buy-sell transaction affects it.",
  ],
};

export const HELP_BUDGET_MEMBERSHIPS: HelpContent = {
  title: "Memberships & Subscriptions",
  intro: "Track recurring memberships relevant to the Big Lap — club memberships, roadside assist, park passes, streaming services, and more. Helps ensure these are accounted for in the Annual or Fixed Bills sections of the main budget grid.",
  items: [
    { label: "Annual vs Monthly", desc: "Annual memberships (RAC, BCF, Camping memberships) should be entered in the ANNUAL — REGO & INSURANCE section of the main grid in the renewal month." },
    { label: "Park Passes", desc: "State-based national park passes: SA $119/year, WA free, NT $65/year, QLD $60/year. Budget ~$350 for a full Big Lap covering all states." },
  ],
  tips: [
    "Wikicamps, Camp Snapper, or Campermate subscriptions ($40–75/year) save far more than they cost in free camp access.",
  ],
};

// ── Budget grid section help ───────────────────────────────────────────────────

export const HELP_SECTION_TRAVEL: HelpContent = {
  title: "Travel Expenses",
  intro: "Day-to-day costs of life on the road. These are your highest and most variable expenses — expect $3,000–5,000/month for a couple doing the Big Lap.",
  items: [
    { label: "Fuel", desc: "The single biggest variable expense. Budget $600–1,200/month depending on km driven. Rule of thumb: 18L/100km towing × diesel price × monthly km ÷ 100. Enter the same month's Planner estimate here." },
    { label: "Parks & Accommodation", desc: "Caravan parks: $35–65/night. Budget $45/night average if you mix paid parks with free camps. 100% paid parks = ~$1,350/month. 50% free = ~$675/month." },
    { label: "Food & Groceries", desc: "Two adults: $700–900/month. Remote areas add 20–30% due to limited competition and transport costs." },
    { label: "Eating Out", desc: "Budget $200–400/month for the occasional pub meal, fish and chips, coffee stops." },
    { label: "Entertainment & Activities", desc: "Tour experiences, equipment hire, wildlife parks, guided tours. $200–500/month depending on your style." },
    { label: "Passes & Permits", desc: "National park passes, fishing licences, 4WD track fees. Budget ~$600–900 total for the lap." },
    { label: "Ferries & Transport", desc: "Spirit of Tasmania return: ~$900–1,400 including vehicle. Allow $1,500 if you include Kangaroo Island and other island ferries." },
  ],
  tips: [
    "Track fuel receipts in the Costs tab — actual vs estimate tells you if your budget is realistic.",
    "Slow travel (fewer km per week) dramatically reduces fuel and accommodation costs.",
    "GovCamps, rest areas and national park campgrounds are free or low-cost — plan routes to include them.",
  ],
};

export const HELP_SECTION_VEHICLE: HelpContent = {
  title: "Vehicle Costs",
  intro: "Preventive maintenance and repair costs for your tow vehicle and caravan. Off-road touring accelerates wear significantly compared to highway driving.",
  items: [
    { label: "Vehicle Service", desc: "Budget $400–700 per service at 10,000km intervals. Diesel engines and auto transmissions may need transmission fluid changes every 40,000km ($400–600). Remote area surcharges apply." },
    { label: "Caravan Service", desc: "Annual or 15,000km service — wheel bearings, brakes, coupling, chassis, electrical. Budget $350–600. More frequent if you travel rough corrugated roads." },
    { label: "Tyres — Vehicle", desc: "Dual-cab 4WD: a full set of AT tyres costs $1,600–2,800 depending on brand/size. Plan a set change at ~80,000km. Budget monthly accrual across the 5 years." },
    { label: "Tyres — Caravan", desc: "Replace at 5 years regardless of tread depth — UV and heat degrade the compounds. Full set $700–1,200. Carry a spare." },
    { label: "Repairs & Parts", desc: "Allow $200–500/month for unexpected repairs: suspension bushes, ball joints, leaf springs, caravan fittings, solar/electrical issues. Remote breakdowns cost 3–5× more." },
  ],
  tips: [
    "Join a 4WD club and do a vehicle recovery course before heading remote.",
    "Carry engine oil, coolant, and brake fluid — remote stations rarely stock the right grade.",
    "Service your vehicle before the lap AND before any major remote leg (Gibb River Rd, Canning Stock Route, etc.).",
  ],
};

export const HELP_SECTION_FIXED: HelpContent = {
  title: "Fixed Bills",
  intro: "Recurring monthly costs that don't change with your location. Enter these once and they repeat every month. Review annually as plans and prices change.",
  items: [
    { label: "Starlink Internet", desc: "$139–$199/month for Starlink Regional. Essential for remote work, streaming, and staying connected. Standard Starlink dish fits most caravan roof bars." },
    { label: "Mobile Plans", desc: "Telstra has the widest regional coverage in Australia — essential for outback travel. Optus covers major highways. Consider a Boost (Telstra network) SIM as a backup." },
    { label: "BUPA Medical", desc: "Keep your hospital cover active to avoid the Medicare Levy Surcharge (1–1.5% of income) and Lifetime Health Cover loading (2% per year over 30 without cover)." },
    { label: "Prescriptions", desc: "PBS co-payments: ~$7.70 (concession) or $31.60 (general) per script. Carry 3 months supply when going remote — some medications need a Special Authority form for repeats." },
    { label: "Apt Insurance", desc: "Building and contents cover for your home or investment property while you are away. Notify your insurer that the property will be vacant or tenanted." },
  ],
  tips: [
    "Starlink Pause — you can pause the service for up to 6 months total per year if you have reliable mobile coverage in that area.",
    "Some health funds allow you to reduce your cover tier while traveling — check with your fund.",
  ],
};

export const HELP_SECTION_ANNUAL: HelpContent = {
  title: "Annual — Rego & Insurance",
  intro: "Once-a-year costs. Enter the full amount in the month it is due — all other months stay $0. These will show as a spike in the Monthly Expense Breakdown chart, which is expected.",
  items: [
    { label: "Vehicle Licence (rego)", desc: "Rego varies by state and vehicle mass. WA: $300–950 for a dual-cab ute. You can transfer your WA rego while on the road — no need to re-register in each state." },
    { label: "Caravan Licence", desc: "WA: $150–350. Most states only require the tow vehicle's rego to be current — the caravan travels on the tow vehicle plates." },
    { label: "Vehicle Insurance", desc: "Comprehensive cover: $1,100–2,200/year via RAC, AAMI, or Budget Direct. Advise your insurer you are on an extended drive — some policies have km or geographic limits." },
    { label: "Caravan Insurance", desc: "Comprehensive caravan insurance: $900–1,800/year. Ensure accidental damage, storm, and on-road collision are included. Third-party property is standard." },
    { label: "Roadside Assistance", desc: "RAC Full Cover or NRMA Premium: $350–500/year. Essential — recovery from remote areas costs $3,000–8,000 without it. Ensure towing distance cover is unlimited." },
  ],
  tips: [
    "Check that your vehicle insurance covers towing — some standard comprehensive policies exclude towing-related damage.",
    "NRMA and RAA have reciprocal agreements with RAC — your cover works in all states.",
  ],
};

export const HELP_SECTION_SUPER: HelpContent = {
  title: "Super & Savings",
  intro: "Monthly contributions to superannuation and savings accounts. These are treated as expenses (money leaving your spending account) — they build long-term wealth but reduce monthly cashflow.",
  items: [
    { label: "Super SPA Contribution", desc: "Auto-populated from the Superannuation sub-page (sum of personal contribution rate × gross salary ÷ 12 for all accounts). To change it, update your personal rate in the Superannuation sub-page." },
    { label: "Savings — Zandra (ANZ)", desc: "Monthly transfer to Zandra's savings account. Enter the planned monthly amount — this is recorded as an expense in the budget." },
    { label: "Savings — Johan (CommBank)", desc: "Monthly transfer to Johan's savings account. Track the accumulated balance in the Savings sub-page." },
  ],
  tips: [
    "SPA (Salary Packaging Arrangement) contributions are concessionally taxed at 15% — far lower than most marginal rates.",
    "If you both cease employment before preservation age, employer super contributions stop. Ensure your super balance is large enough to fund the gap years.",
  ],
};

export const HELP_SECTION_FAMILY: HelpContent = {
  title: "Grandkids & Family",
  intro: "Budget for visits from grandchildren or family members joining you on the road. These are typically one-off costs in specific months — enter them in the months the visits are planned.",
  items: [
    { label: "Grandkids — Flights", desc: "Return flights for grandchildren to meet you at a waypoint. Perth–Cairns return: ~$350–600/child. Enter in the specific month of travel." },
    { label: "Grandkids — Hotels", desc: "Extra accommodation when grandkids are with you (they may not enjoy the caravan experience!). Budget $120–180/night for a motel or Airbnb nearby." },
  ],
  tips: [
    "Book school holiday flights 3–4 months in advance — prices triple in the week before holidays.",
    "Many caravan parks offer family rates or extra sites — book ahead for popular school holiday destinations.",
  ],
};

export const HELP_INCOME_SECTION: HelpContent = {
  title: "Income",
  intro: "All money coming into your accounts each month. Income reduces net expenses — a higher income total gives you more financial headroom for the lap.",
  items: [
    { label: "Rental Net Income", desc: "Auto-calculated from the Rental Property sub-page. If your property is negatively geared, this will be negative — reducing your total income." },
    { label: "Salary / Employment", desc: "Populated from the Income sub-page. Include any part-time, contract or remote work you plan to do during the trip." },
    { label: "Super Pension", desc: "Account-based pension drawdowns — tax-free after age 60. Set your drawdown rate in the Superannuation sub-page." },
    { label: "Centrelink / Govt", desc: "Age Pension entitlement modelled in the Age Pension sub-page. Includes other government payments." },
    { label: "Share Dividends", desc: "Populated from the Income sub-page. Half-yearly dividends: enter in June/December for most ASX stocks." },
    { label: "Refunds / Reimbursements", desc: "Tax refunds (usually July–September), health fund rebates, insurance refunds." },
  ],
  tips: [
    "Income from the Income sub-page is synced to the grid automatically — always use the sub-page for income sources, not direct grid entry.",
    "A fully self-funded Big Lap at $4,500/month for two people requires ~$54,000/year of income or drawdown.",
  ],
};

// ── Trip tab help ─────────────────────────────────────────────────────────────

export const HELP_TRIP_PLANNER: HelpContent = {
  title: "Trip Planner",
  intro: "Plan your route as a series of legs — each leg is one driving day from one stop to the next. The planner calculates distance, estimated drive time, and fuel cost across three scenarios.",
  items: [
    { label: "Legs", desc: "One leg = one day's drive. Enter the departure and arrival stops. The planner geocodes locations and plots the route on the Map tab." },
    { label: "Planned vs Actual km", desc: "Enter your GPS-recorded actual km when you complete a leg. The Analysis tab tracks the variance." },
    { label: "Fuel Scenarios", desc: "Three estimates: 15 L/100km (light load / good road), 18 L/100km (typical towing), 20 L/100km (heavy load / corrugated / mountain). Real-world figures for a dual-cab towing a 2.5-tonne van are 20–24L/100km on corrugated outback roads." },
    { label: "Drive Time", desc: "Calculated at 90 km/h average including stops. Add 20–30% for outback tracks, corrugated roads, and slow mountain passes." },
  ],
  tips: [
    "Plan no more than 300km per day to enjoy the journey — the Big Lap is not a race.",
    "Check road conditions before remote legs: outbackroadconditions.com.au (SA) and Main Roads WA for current closures.",
    "Fuel stops can be 300km apart in the outback — always fill up when you can, not when you need to.",
  ],
};

export const HELP_TRIP_MAP: HelpContent = {
  title: "Trip Map",
  intro: "Interactive OpenStreetMap showing your planned route, geocoded stops, and live GPS track. The map updates as you add legs in the Planner tab.",
  items: [
    { label: "Stop Markers", desc: "Each planned stop is geocoded from the location name you entered in the Planner. Click a marker to see the stop details." },
    { label: "Route Polyline", desc: "The blue line connecting stops in order. Not a turn-by-turn route — it is a straight-line connection for overview purposes." },
    { label: "GPS Track Logging", desc: "Press Start GPS to begin recording your actual position. Points are saved to the database every few seconds. Press Stop to end the session. Tracks survive app refreshes." },
    { label: "Clear Track", desc: "Deletes all GPS points for this trip. This cannot be undone." },
  ],
  tips: [
    "GPS logging works best with the app open in the foreground on a mobile device mounted to your dash.",
    "Zoom in on the GPS track after a leg to verify your route was logged correctly before clearing it.",
  ],
  warning: "GPS logging drains battery faster. Connect to a power source (USB or 12V) while tracking.",
};

export const HELP_TRIP_VEHICLE: HelpContent = {
  title: "Vehicle & Caravan",
  intro: "Weight compliance calculator for your rig. Exceeding any weight limit is illegal and voids your insurance — check this before every major leg.",
  items: [
    { label: "GVM (Gross Vehicle Mass)", desc: "The maximum legal weight of your tow vehicle fully loaded — driver, passengers, fuel, gear, accessories. If your UTE's GVM is 3,200kg and it weighs 3,400kg loaded, you are illegal." },
    { label: "GCM (Gross Combined Mass)", desc: "The maximum combined weight of tow vehicle + caravan. If your GCM is 6,000kg and your loaded rig is 6,200kg, you are over the limit." },
    { label: "Tow Ball Mass", desc: "The downward force on the tow ball — typically 10% of caravan ATM. Too high: rear of tow vehicle squats, steering becomes light. Too low: caravan sways." },
    { label: "Tow Rating", desc: "The manufacturer's maximum towing capacity. This is a hard limit — exceeding it voids your warranty and insurance. It varies with tow bar type (braked, unbraked)." },
    { label: "Payload", desc: "GVM minus tare mass of the vehicle. This is how much you can add (driver, fuel, gear). Most dual-cabs have 600–1,000kg payload." },
  ],
  tips: [
    "Weigh your fully-loaded rig at a public weighbridge before your first major trip.",
    "Water is 1kg/litre — a full 200L freshwater tank adds 200kg. Fill partially when approaching weight limits.",
    "GVM upgrades are available for some dual-cabs (e.g. Patriot Campers, Premcar) — adds 200–350kg payload legally.",
  ],
  warning: "Overloading is a criminal offence in all Australian states. You may be fined, lose your licence, and be uninsured in the event of an accident.",
};

export const HELP_TRIP_COSTS: HelpContent = {
  title: "Trip Costs",
  intro: "Record actual spending per leg and compare against your budget forecast. Categories match the main Budget grid so data rolls up into your 5-year plan.",
  items: [
    { label: "Forecast", desc: "The amount you budgeted for this leg in the main Budget grid. Populated automatically from the matching month's budget data." },
    { label: "Actual", desc: "What you actually spent. Enter receipts as you go — don't wait until the end of the week." },
    { label: "Variance", desc: "Actual minus Forecast. Positive variance = overspent. Track variances to recalibrate your budget for future months." },
    { label: "Categories", desc: "Fuel, accommodation, food, entertainment, and vehicle costs are tracked separately to pinpoint which categories are running hot." },
  ],
  tips: [
    "Use a shared Notes app to log spend in real-time, then enter it here at the end of each day.",
    "Large variances (>20%) signal that your budget assumption needs updating — revise the Budget grid for future months.",
  ],
};

export const HELP_TRIP_JOURNAL: HelpContent = {
  title: "Travel Journal",
  intro: "A weekly diary of your Big Lap adventure. One entry per week — capture the places, people, highlights and lessons so you can relive the journey and share it with family.",
  items: [
    { label: "Week Entry", desc: "Each entry covers one week of travel. The date is auto-stamped. Entries are stored permanently in the database." },
    { label: "Destinations", desc: "List the towns, parks, and waypoints you visited. Be specific — 'Cape Le Grand National Park, Esperance' is more useful than 'somewhere near Esperance'." },
    { label: "Weather", desc: "Capture conditions for each key destination. Useful for planning future trips and understanding seasonal patterns." },
    { label: "Highlights / Loved", desc: "The moments worth remembering — sunsets, wildlife encounters, conversations with fellow travellers, places you'd return to." },
    { label: "Learned", desc: "Practical lessons: roads to avoid, parks to book ahead, tips you picked up from other caravanners, gear that failed or excelled." },
  ],
  tips: [
    "Write entries on Sunday evening while the week is fresh — don't wait until the following week.",
    "Photos can be referenced by location — note the place name so you can match photos to journal entries later.",
  ],
};

export const HELP_TRIP_ANALYSIS: HelpContent = {
  title: "Trip Analysis",
  intro: "KPI summary comparing planned vs actual performance for the trip. Use these metrics to update your Budget grid with real-world numbers for future months.",
  items: [
    { label: "km Variance", desc: "Total planned km vs total actual km. A positive variance (more km than planned) usually means higher fuel costs." },
    { label: "Fuel Cost vs Estimate", desc: "Actual fuel spend vs the 18 L/100km scenario estimate from the Planner. If actual consistently exceeds the estimate, update your fuel budget using the 20 L/100km column." },
    { label: "Average Consumption", desc: "Actual litres per 100km computed from fuel receipts and km driven. Benchmark this against your vehicle specs — if actual is >22L/100km, check tyre pressure, payload, and towing setup." },
    { label: "Burn Rate", desc: "Average daily spend across the trip. Compare against your monthly budget (monthly budget ÷ 30). If burn rate > budget/day, you will overspend before the month ends." },
  ],
  tips: [
    "After each trip, update the Budget grid's Actual columns using the Analysis figures.",
    "High km variance usually means you changed routes — update the Planner legs to reflect where you actually went.",
  ],
};

// ── Global help ───────────────────────────────────────────────────────────────

export const HELP_TRIP_BOOKINGS: HelpContent = {
  title: "Advance Bookings",
  intro: "Manage park, accommodation, and ferry reservations for this trip. Bookings are shared with the Advance Bookings page — a central calendar of all confirmed reservations across your entire lap.",
  items: [
    { label: "Booking Reference", desc: "The confirmation number from the park or operator. Essential for check-in — keep these recorded in case of connectivity issues on arrival." },
    { label: "Check-in / Check-out", desc: "The dates you are booked for. The system flags conflicts if a leg's travel date falls outside your booked nights." },
    { label: "Cancellation Policy", desc: "Note the cancellation deadline — popular parks (Monkey Mia, Uluru, Kakadu) charge 100% of stay for late cancellations or no-shows." },
  ],
  tips: [
    "Book Monkey Mia, Uluru, and Kakadu 6–12 months ahead for peak season (May–September).",
    "Most WA national park campsites book out within minutes of the booking window opening (42 days ahead) for school holidays.",
    "Spirit of Tasmania peak season sailings sell out months in advance — book before planning the rest of your Tassie itinerary.",
  ],
};

export const HELP_HARD_SAVE: HelpContent = {
  title: "Hard Save",
  intro: "Forces an immediate save of all unsaved changes to the database. The app auto-saves every 600ms as you type — Hard Save is for when you want certainty before closing the tab or losing connectivity.",
  tips: [
    "Always Hard Save before closing the browser tab in a remote area with patchy connectivity.",
    "The save status indicator shows the last save time — if it is more than 2 seconds ago, press Hard Save.",
  ],
};

export const HELP_JOHAN_AI: HelpContent = {
  title: "Johan — Swerwer & Vriend",
  intro: "An AI travel companion trained on the Big Lap experience. Ask Johan for advice on routes, free camps, must-see stops, caravan setup, or anything about life on the road.",
  tips: [
    "Ask Johan: 'What free camps are near Exmouth?' or 'Best time to drive the Gibb River Road?'",
    "Johan can suggest daily itineraries for specific regions based on your available time.",
  ],
};
