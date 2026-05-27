import React, { useRef, useState } from "react";
import { useGetGlobalBudget, useListTrips, useGetStorageRegister } from "@workspace/api-client-react";
import { ALL_CHECKLISTS, type CheckState } from "@/data/checklists";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download, Upload, FileText, Table2, Truck, ClipboardCheck,
  Home, Map, Database, Loader2, CheckCircle, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Category definitions (mirrors budget-page.tsx) ────────────────────────────

const ALL_BUDGET_KEYS: { key: string; label: string; section: string }[] = [
  { key: "openingBalance",   label: "Opening Balance",             section: "Balance" },
  // Travel & Road
  { key: "fuel",             label: "Fuel",                        section: "Travel & Road" },
  { key: "accommodation",    label: "Parks & Accommodation",       section: "Travel & Road" },
  { key: "food",             label: "Food & Groceries",            section: "Travel & Road" },
  { key: "eatingOut",        label: "Eating Out / Restaurants",    section: "Travel & Road" },
  { key: "entertainment",    label: "Entertainment & Activities",  section: "Travel & Road" },
  { key: "passesPermits",    label: "Passes & Permits",            section: "Travel & Road" },
  { key: "ferries",          label: "Ferries & Transport",         section: "Travel & Road" },
  { key: "gasBottles",       label: "Gas Bottle Filling",          section: "Travel & Road" },
  // Vehicle & Rig
  { key: "vehicleService",   label: "Vehicle Service (UTE)",       section: "Vehicle & Rig" },
  { key: "caravanService",   label: "Caravan Service",             section: "Vehicle & Rig" },
  { key: "tyresVehicle",     label: "Tyres — Vehicle",             section: "Vehicle & Rig" },
  { key: "tyresCaravan",     label: "Tyres — Caravan",             section: "Vehicle & Rig" },
  { key: "repairs",          label: "Repairs & Parts",             section: "Vehicle & Rig" },
  // Fixed Monthly Bills
  { key: "starlink",         label: "Starlink Internet",           section: "Fixed Bills" },
  { key: "johanMobile",      label: "Johan Mobile (Telstra)",      section: "Fixed Bills" },
  { key: "zandraMobile",     label: "Zandra Mobile (Optus)",       section: "Fixed Bills" },
  { key: "medical",          label: "BUPA Medical",                section: "Fixed Bills" },
  { key: "prescriptions",    label: "Prescriptions",               section: "Fixed Bills" },
  { key: "apartmentInsurance", label: "Apt Insurance (Allianz)",   section: "Fixed Bills" },
  // Annual — Rego & Insurance
  { key: "vehicleLicence",   label: "Vehicle Licence",             section: "Annual — Rego & Insurance" },
  { key: "caravanLicence",   label: "Caravan Licence",             section: "Annual — Rego & Insurance" },
  { key: "vehicleInsurance", label: "Vehicle Insurance",           section: "Annual — Rego & Insurance" },
  { key: "caravanInsurance", label: "Caravan Insurance",           section: "Annual — Rego & Insurance" },
  { key: "roadsideAssist",   label: "Roadside Assistance",         section: "Annual — Rego & Insurance" },
  // Super & Savings
  { key: "superContribution", label: "Super SPA Contribution",      section: "Super & Savings" },
  { key: "savingsZandra",    label: "Savings — Zandra (ANZ)",      section: "Super & Savings" },
  { key: "savingsJohan",     label: "Savings — Johan (CommBank)",  section: "Super & Savings" },
  // Grandkids & Family
  { key: "grandkidsFlights", label: "Grandkids — Flights",         section: "Grandkids & Family" },
  { key: "grandkidsHotels",  label: "Grandkids — Hotels",          section: "Grandkids & Family" },
  // Rental Property Costs
  { key: "rentalInterest",   label: "Rental — Mortgage Interest",  section: "Rental Property Costs" },
  { key: "rentalRatesLevies",label: "Rental — Rates & Levies",     section: "Rental Property Costs" },
  { key: "rentalWater",      label: "Rental — Water",              section: "Rental Property Costs" },
  { key: "rentalElectricity",label: "Rental — Electricity",        section: "Rental Property Costs" },
  { key: "rentalMgmtFees",   label: "Rental — Mgmt & Letting",     section: "Rental Property Costs" },
  { key: "rentalOtherCosts", label: "Rental — Other Costs",        section: "Rental Property Costs" },
  // Income
  { key: "rentalNet",         label: "Rental — Gross Rent",        section: "Income" },
  { key: "salary",            label: "Salary / Employment",        section: "Income" },
  { key: "businessIncome",    label: "Business Income",            section: "Income" },
  { key: "dividends",         label: "Share Dividends",            section: "Income" },
  { key: "cgt",               label: "Capital Gains",              section: "Income" },
  { key: "centrelink",        label: "Centrelink / Govt",          section: "Income" },
  { key: "superPensionIncome",label: "Super Pension",              section: "Income" },
  { key: "sideIncome",        label: "Side Income",                section: "Income" },
  { key: "refunds",           label: "Refunds / Reimbursements",   section: "Income" },
  { key: "otherIncome1",      label: "Other Income 1",             section: "Income" },
  { key: "otherIncome2",      label: "Other Income 2",             section: "Income" },
  { key: "customIncome",      label: "Other (Income tab)",         section: "Income" },
  // Planning inputs
  { key: "atHome",          label: "At Home (planning toggle)",    section: "Planning" },
  { key: "freeNights",      label: "Free Nights",                  section: "Planning" },
  { key: "paidNights",      label: "Paid Nights",                  section: "Planning" },
  { key: "paidRate",        label: "Paid Rate ($/night)",          section: "Planning" },
  { key: "plannedKm",       label: "Planned km",                   section: "Planning" },
  { key: "fuelConsumption", label: "Fuel Consumption (L/100km)",   section: "Planning" },
  { key: "fuelPrice",       label: "Fuel Price ($/L)",             section: "Planning" },
  { key: "totalDays",       label: "Total Days",                   section: "Planning" },
  { key: "foodDailyRate",   label: "Food Daily Rate ($/day)",      section: "Planning" },
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
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function ts(): string {
  return new Date().toISOString().slice(0, 10);
}

// Parse a CSV text into string[][] rows, handling quoted fields correctly
function parseCSVText(text: string): string[][] {
  const normalized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuote) {
      if (ch === '"' && normalized[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}

// ── CSV Export functions ───────────────────────────────────────────────────────

function exportBudgetCSV(budget: any) {
  if (!budget?.months) return;
  const headers = ["Month", "Period", "Section", "Category", "Value"];
  const rows: (string | number | boolean)[][] = [headers];
  const months = budget.months as Record<string, Record<string, unknown>>;
  for (let i = 0; i < 60; i++) {
    const m = months[i.toString()] ?? months[i] ?? {};
    for (const { key, label, section } of ALL_BUDGET_KEYS) {
      const val = m[key];
      if (val !== undefined && val !== null && val !== 0 && val !== false) {
        rows.push([`Month ${i + 1}`, monthLabel(i), section, label, val as string | number | boolean]);
      }
    }
  }
  downloadCSV(`dgo-budget-${ts()}.csv`, toCSV(rows));
}

function exportVehicleCSV(budget: any) {
  const profile = (budget?.vehicleProfile ?? {}) as Record<string, unknown>;
  const docs = (budget?.vehicleDocs ?? {}) as Record<string, unknown>;
  const rows: (string | number | null | undefined)[][] = [
    ["Section", "Field", "Value"],
    ["Tow Vehicle", "Model",            profile.vehicleModel as string],
    ["Tow Vehicle", "Kerb Weight (kg)", profile.kerbWeight as number],
    ["Tow Vehicle", "GVM (kg)",         profile.gvm as number],
    ["Tow Vehicle", "GCM (kg)",         profile.gcm as number],
    ["Tow Vehicle", "Tow Rating (kg)",  profile.towRating as number],
    ["Payload", "People (kg)",        profile.payloadPeople as number],
    ["Payload", "Food/Water (kg)",    profile.payloadFood as number],
    ["Payload", "Recovery Gear (kg)", profile.payloadRecovery as number],
    ["Payload", "Tools (kg)",         profile.payloadTools as number],
    ["Payload", "Fuel (kg)",          profile.payloadFuel as number],
    ["Payload", "Other (kg)",         profile.payloadOther as number],
    ["Caravan", "Model",            profile.caravanModel as string],
    ["Caravan", "Tare (kg)",        profile.caravanTare as number],
    ["Caravan", "ATM (kg)",         profile.caravanAtm as number],
    ["Caravan", "Ball Weight (kg)", profile.ballWeight as number],
    ["Caravan", "Water Load (kg)",  profile.waterLoad as number],
    ["Rego — Vehicle", "Plate",                 docs.regoNumber as string],
    ["Rego — Vehicle", "Expiry",                docs.regoExpiry as string],
    ["Rego — Vehicle", "Renewal Cost ($)",       docs.regoRenewalCost as string],
    ["Rego — Vehicle", "Replacement Value ($)",  docs.replacementVehicle as string],
    ["Rego — Caravan", "Plate",                 docs.caravanRegoNumber as string],
    ["Rego — Caravan", "Expiry",                docs.caravanRegoExpiry as string],
    ["Rego — Caravan", "Replacement Value ($)", docs.replacementCaravan as string],
    ["Driver's Licence", "Number", docs.licenceNumber as string],
    ["Driver's Licence", "Expiry", docs.licenceExpiry as string],
    ["Driver's Licence", "State",  docs.licenceState as string],
    ["Insurance — Tow Vehicle", "Provider",           docs.insuranceProvider as string],
    ["Insurance — Tow Vehicle", "Policy #",           docs.insurancePolicy as string],
    ["Insurance — Tow Vehicle", "Expiry",             docs.insuranceExpiry as string],
    ["Insurance — Tow Vehicle", "Annual Premium ($)", docs.insuranceCost as string],
    ["Insurance — Caravan", "Provider",           docs.caravanInsuranceProvider as string],
    ["Insurance — Caravan", "Policy #",           docs.caravanInsurancePolicy as string],
    ["Insurance — Caravan", "Expiry",             docs.caravanInsuranceExpiry as string],
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
        rows.push([cl.title, section.title, item.id, item.label, item.critical ? "YES" : "", state[item.id] ?? "unchecked"]);
      }
    }
  }
  downloadCSV(`dgo-checklists-${ts()}.csv`, toCSV(rows));
}

function exportRentalCSV(budget: any) {
  const r = (budget?.rental ?? {}) as Record<string, unknown>;
  const rows: (string | number | null | undefined)[][] = [
    ["Field", "Value"],
    ["Address",                            r.address as string],
    ["Purchase Price ($)",                 r.purchasePrice as number],
    ["Current Market Value ($)",           r.currentValue as number],
    ["Year Built",                         r.yearBuilt as number],
    ["Construction Cost ($)",              r.constructionCost as number],
    ["Lease Signing Date (SISNING)",       r.leaseSigningDate as string],
    ["Mortgage Payoff Date",               r.mortgagePayoffDate as string],
    ["Weekly Rent ($)",                    r.weeklyRent as number],
    ["Vacancy Weeks",                      r.vacancyWeeks as number],
    ["Council Rates ($)",                  r.councilRates as number],
    ["Water Rates ($)",                    r.waterRates as number],
    ["Landlord Insurance ($) — Main Dwelling", r.landlordInsurance as number],
    ["Landlord Insurance Policy",          r.landlordInsurancePolicy as string],
    ["Owner's Insurance ($) — Granny Flat",    r.ownersInsurance as number],
    ["Owner's Insurance Policy",           r.ownersInsurancePolicy as string],
    ["Strata Levies ($)",                  r.strataLevies as number],
    ["Land Tax ($)",                       r.landTax as number],
    ["Management Fee Rate (%)",            r.managementFeeRate as number],
    ["Letting Fee (weeks)",                r.lettingFeeWeeks as number],
    ["Repairs ($)",                        r.repairs as number],
    ["Advertising ($)",                    r.advertising as number],
    ["Accounting Fees ($)",                r.accountingFees as number],
    ["Legal Fees ($)",                     r.legalFees as number],
    ["Bank Charges ($)",                   r.bankCharges as number],
    ["Loan Balance ($)",                   r.loanBalance as number],
    ["Interest Rate (%)",                  r.interestRate as number],
    ["Div 43 Annual ($)",                  r.div43Annual as number],
    ["Div 40 Annual ($)",                  r.div40Annual as number],
    ["Marginal Tax Rate (%)",              r.marginalTaxRate as number],
  ];
  downloadCSV(`dgo-rental-${ts()}.csv`, toCSV(rows));
}

function exportTripsCSV(trips: any[]) {
  if (!trips?.length) return;
  const rows: (string | number | null | undefined)[][] = [
    ["Trip ID", "Name", "Description", "Start Date", "End Date", "Fuel 15L ($/km)", "Fuel 18L ($/km)", "Fuel 20L ($/km)", "Status", "Created At"],
    ...trips.map((t: any) => [
      t.id, t.name, t.description, t.startDate, t.endDate,
      t.fuelPrice15, t.fuelPrice18, t.fuelPrice20, t.status, t.createdAt,
    ]),
  ];
  downloadCSV(`dgo-trips-${ts()}.csv`, toCSV(rows));
}

// ── CSV Import parsers ────────────────────────────────────────────────────────

const KEY_BY_LABEL = Object.fromEntries(ALL_BUDGET_KEYS.map(k => [k.label, k.key]));

function parseBudgetCSV(text: string): Record<string, Record<string, number | boolean>> {
  const rows = parseCSVText(text).slice(1); // skip header
  const months: Record<string, Record<string, number | boolean>> = {};
  for (const row of rows) {
    if (row.length < 5) continue;
    const monthStr = row[0]?.trim();   // "Month 1"
    const category = row[3]?.trim();   // label
    const rawVal   = row[4]?.trim();   // value
    const mi = parseInt(monthStr.replace(/^Month\s*/i, "")) - 1;
    const key = KEY_BY_LABEL[category];
    if (!key || isNaN(mi) || mi < 0 || mi > 59) continue;
    if (!months[mi.toString()]) months[mi.toString()] = {};
    // boolean planning fields
    if (rawVal === "true" || rawVal === "false") {
      months[mi.toString()][key] = rawVal === "true";
    } else {
      const n = parseFloat(rawVal);
      if (!isNaN(n)) months[mi.toString()][key] = n;
    }
  }
  return months;
}

type VehicleField = { target: "profile" | "docs"; key: string; isNum: boolean };
const VEHICLE_CSV_MAP: Record<string, Record<string, VehicleField>> = {
  "Tow Vehicle": {
    "Model":            { target: "profile", key: "vehicleModel",  isNum: false },
    "Kerb Weight (kg)": { target: "profile", key: "kerbWeight",    isNum: true },
    "GVM (kg)":         { target: "profile", key: "gvm",           isNum: true },
    "GCM (kg)":         { target: "profile", key: "gcm",           isNum: true },
    "Tow Rating (kg)":  { target: "profile", key: "towRating",     isNum: true },
  },
  "Payload": {
    "People (kg)":        { target: "profile", key: "payloadPeople",   isNum: true },
    "Food/Water (kg)":    { target: "profile", key: "payloadFood",     isNum: true },
    "Recovery Gear (kg)": { target: "profile", key: "payloadRecovery", isNum: true },
    "Tools (kg)":         { target: "profile", key: "payloadTools",    isNum: true },
    "Fuel (kg)":          { target: "profile", key: "payloadFuel",     isNum: true },
    "Other (kg)":         { target: "profile", key: "payloadOther",    isNum: true },
  },
  "Caravan": {
    "Model":            { target: "profile", key: "caravanModel", isNum: false },
    "Tare (kg)":        { target: "profile", key: "caravanTare",  isNum: true },
    "ATM (kg)":         { target: "profile", key: "caravanAtm",   isNum: true },
    "Ball Weight (kg)": { target: "profile", key: "ballWeight",   isNum: true },
    "Water Load (kg)":  { target: "profile", key: "waterLoad",    isNum: true },
  },
  "Rego — Vehicle": {
    "Plate":                 { target: "docs", key: "regoNumber",         isNum: false },
    "Expiry":                { target: "docs", key: "regoExpiry",         isNum: false },
    "Renewal Cost ($)":      { target: "docs", key: "regoRenewalCost",    isNum: false },
    "Replacement Value ($)": { target: "docs", key: "replacementVehicle", isNum: false },
  },
  "Rego — Caravan": {
    "Plate":                 { target: "docs", key: "caravanRegoNumber",  isNum: false },
    "Expiry":                { target: "docs", key: "caravanRegoExpiry",  isNum: false },
    "Replacement Value ($)": { target: "docs", key: "replacementCaravan", isNum: false },
  },
  "Driver's Licence": {
    "Number": { target: "docs", key: "licenceNumber", isNum: false },
    "Expiry":  { target: "docs", key: "licenceExpiry", isNum: false },
    "State":   { target: "docs", key: "licenceState",  isNum: false },
  },
  "Insurance — Tow Vehicle": {
    "Provider":           { target: "docs", key: "insuranceProvider", isNum: false },
    "Policy #":           { target: "docs", key: "insurancePolicy",   isNum: false },
    "Expiry":             { target: "docs", key: "insuranceExpiry",   isNum: false },
    "Annual Premium ($)": { target: "docs", key: "insuranceCost",     isNum: false },
  },
  "Insurance — Caravan": {
    "Provider":           { target: "docs", key: "caravanInsuranceProvider", isNum: false },
    "Policy #":           { target: "docs", key: "caravanInsurancePolicy",   isNum: false },
    "Expiry":             { target: "docs", key: "caravanInsuranceExpiry",   isNum: false },
    "Annual Premium ($)": { target: "docs", key: "caravanInsuranceCost",     isNum: false },
  },
};

function parseVehicleCSV(text: string): { profile: Record<string, unknown>; docs: Record<string, unknown> } {
  const rows = parseCSVText(text).slice(1);
  const profile: Record<string, unknown> = {};
  const docs: Record<string, unknown> = {};
  for (const row of rows) {
    if (row.length < 3) continue;
    const section = row[0]?.trim();
    const field   = row[1]?.trim();
    const value   = row[2]?.trim();
    const mapping = VEHICLE_CSV_MAP[section]?.[field];
    if (!mapping || value === "" || value === undefined) continue;
    const parsed = mapping.isNum ? parseFloat(value) : value;
    if (mapping.isNum && isNaN(parsed as number)) continue;
    if (mapping.target === "profile") profile[mapping.key] = parsed;
    else docs[mapping.key] = parsed;
  }
  return { profile, docs };
}

function parseChecklistsCSV(text: string): Record<string, Record<string, CheckState>> {
  const rows = parseCSVText(text).slice(1);
  const titleToId = Object.fromEntries(ALL_CHECKLISTS.map(cl => [cl.title, cl.id]));
  const result: Record<string, Record<string, CheckState>> = {};
  for (const row of rows) {
    if (row.length < 6) continue;
    const clTitle = row[0]?.trim();
    const itemId  = row[2]?.trim();
    const state   = row[5]?.trim() as CheckState;
    const clId    = titleToId[clTitle];
    if (!clId || !itemId || !state) continue;
    if (!result[clId]) result[clId] = {};
    result[clId][itemId] = state;
  }
  return result;
}

const RENTAL_CSV_MAP: Record<string, { key: string; isNum: boolean }> = {
  "Address":                               { key: "address",               isNum: false },
  "Purchase Price ($)":                    { key: "purchasePrice",         isNum: true  },
  "Current Market Value ($)":              { key: "currentValue",          isNum: true  },
  "Year Built":                            { key: "yearBuilt",             isNum: true  },
  "Construction Cost ($)":                 { key: "constructionCost",      isNum: true  },
  "Lease Signing Date (SISNING)":          { key: "leaseSigningDate",      isNum: false },
  "Mortgage Payoff Date":                  { key: "mortgagePayoffDate",    isNum: false },
  "Weekly Rent ($)":                       { key: "weeklyRent",            isNum: true  },
  "Vacancy Weeks":                         { key: "vacancyWeeks",          isNum: true  },
  "Council Rates ($)":                     { key: "councilRates",          isNum: true  },
  "Water Rates ($)":                       { key: "waterRates",            isNum: true  },
  "Landlord Insurance ($) — Main Dwelling":{ key: "landlordInsurance",     isNum: true  },
  "Landlord Insurance Policy":             { key: "landlordInsurancePolicy", isNum: false },
  "Owner's Insurance ($) — Granny Flat":  { key: "ownersInsurance",       isNum: true  },
  "Owner's Insurance Policy":              { key: "ownersInsurancePolicy", isNum: false },
  "Strata Levies ($)":                     { key: "strataLevies",          isNum: true  },
  "Land Tax ($)":                          { key: "landTax",               isNum: true  },
  "Management Fee Rate (%)":               { key: "managementFeeRate",     isNum: true  },
  "Letting Fee (weeks)":                   { key: "lettingFeeWeeks",       isNum: true  },
  "Repairs ($)":                           { key: "repairs",               isNum: true  },
  "Advertising ($)":                       { key: "advertising",           isNum: true  },
  "Accounting Fees ($)":                   { key: "accountingFees",        isNum: true  },
  "Legal Fees ($)":                        { key: "legalFees",             isNum: true  },
  "Bank Charges ($)":                      { key: "bankCharges",           isNum: true  },
  "Loan Balance ($)":                      { key: "loanBalance",           isNum: true  },
  "Interest Rate (%)":                     { key: "interestRate",          isNum: true  },
  "Div 43 Annual ($)":                     { key: "div43Annual",           isNum: true  },
  "Div 40 Annual ($)":                     { key: "div40Annual",           isNum: true  },
  "Marginal Tax Rate (%)":                 { key: "marginalTaxRate",       isNum: true  },
};

function parseRentalCSV(text: string): Record<string, unknown> {
  const rows = parseCSVText(text).slice(1);
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    if (row.length < 2) continue;
    const field = row[0]?.trim();
    const value = row[1]?.trim();
    const mapping = RENTAL_CSV_MAP[field];
    if (!mapping || value === "" || value === undefined) continue;
    const parsed = mapping.isNum ? parseFloat(value) : value;
    if (mapping.isNum && isNaN(parsed as number)) continue;
    result[mapping.key] = parsed;
  }
  return result;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, method = "GET", body?: unknown): Promise<any> {
  const opts: RequestInit = { method, credentials: "include" };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
    opts.headers = { "Content-Type": "application/json" };
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

// ── Master Backup ─────────────────────────────────────────────────────────────

async function buildMasterBackup(budget: any, trips: any[], storage: any): Promise<object> {
  const fullTrips = await Promise.all(
    (trips ?? []).map(async (t: any) => {
      const [legs, journal, vehicle, gps] = await Promise.all([
        apiFetch(`/api/trips/${t.id}/legs`).catch(() => []),
        apiFetch(`/api/trips/${t.id}/journal`).catch(() => []),
        apiFetch(`/api/trips/${t.id}/vehicle`).catch(() => null),
        apiFetch(`/api/trips/${t.id}/gps`).catch(() => []),
      ]);
      return { ...t, legs, journal, vehicle, gps };
    })
  );

  return {
    version: "1.0",
    application: "Die Groot Ompad",
    exportedAt: new Date().toISOString(),
    budget,
    trips: fullTrips,
    storage,
  };
}

interface RestoreResult {
  budget: boolean;
  storage: boolean;
  tripsCreated: number;
  tripsUpdated: number;
  legsRestored: number;
  journalRestored: number;
  vehiclesRestored: number;
  errors: string[];
}

async function restoreMasterBackup(data: any, existingTrips: any[]): Promise<RestoreResult> {
  const result: RestoreResult = {
    budget: false, storage: false,
    tripsCreated: 0, tripsUpdated: 0,
    legsRestored: 0, journalRestored: 0, vehiclesRestored: 0,
    errors: [],
  };

  // 1. Restore global budget
  if (data.budget) {
    try {
      await apiFetch("/api/budget", "PUT", data.budget);
      result.budget = true;
    } catch (e) {
      result.errors.push(`Budget: ${(e as Error).message}`);
    }
  }

  // 2. Restore storage register
  if (data.storage) {
    try {
      await apiFetch("/api/storage/register", "PUT", data.storage);
      result.storage = true;
    } catch (e) {
      result.errors.push(`Storage: ${(e as Error).message}`);
    }
  }

  // 3. Restore trips
  const existingById = Object.fromEntries((existingTrips ?? []).map((t: any) => [t.id, t]));

  for (const trip of (data.trips ?? [])) {
    let tripId: number;
    const { legs, journal, vehicle, gps: _gps, id: backupId, ...tripFields } = trip;

    try {
      if (existingById[backupId]) {
        // Update existing trip
        await apiFetch(`/api/trips/${backupId}`, "PUT", tripFields);
        tripId = backupId;
        result.tripsUpdated++;
      } else {
        // Create new trip
        const created = await apiFetch("/api/trips", "POST", tripFields);
        tripId = created.id;
        result.tripsCreated++;
      }
    } catch (e) {
      result.errors.push(`Trip "${trip.name}": ${(e as Error).message}`);
      continue;
    }

    // Restore legs — delete all then recreate in order
    if (Array.isArray(legs) && legs.length > 0) {
      try {
        const existingLegs = await apiFetch(`/api/trips/${tripId}/legs`).catch(() => []);
        await Promise.all(existingLegs.map((l: any) =>
          apiFetch(`/api/trips/${tripId}/legs/${l.id}`, "DELETE").catch(() => {})
        ));
        for (const leg of legs) {
          const { id: _id, tripId: _tid, ...legFields } = leg;
          await apiFetch(`/api/trips/${tripId}/legs`, "POST", legFields);
          result.legsRestored++;
        }
      } catch (e) {
        result.errors.push(`Legs for trip ${tripId}: ${(e as Error).message}`);
      }
    }

    // Restore journal entries — delete all then recreate
    if (Array.isArray(journal) && journal.length > 0) {
      try {
        const existingEntries = await apiFetch(`/api/trips/${tripId}/journal`).catch(() => []);
        await Promise.all(existingEntries.map((e: any) =>
          apiFetch(`/api/trips/${tripId}/journal/${e.id}`, "DELETE").catch(() => {})
        ));
        for (const entry of journal) {
          const { id: _id, tripId: _tid, ...entryFields } = entry;
          await apiFetch(`/api/trips/${tripId}/journal`, "POST", entryFields);
          result.journalRestored++;
        }
      } catch (e) {
        result.errors.push(`Journal for trip ${tripId}: ${(e as Error).message}`);
      }
    }

    // Restore per-trip vehicle profile
    if (vehicle && typeof vehicle === "object") {
      try {
        const { id: _id, tripId: _tid, ...vehicleFields } = vehicle;
        await apiFetch(`/api/trips/${tripId}/vehicle`, "PUT", vehicleFields);
        result.vehiclesRestored++;
      } catch (e) {
        result.errors.push(`Vehicle for trip ${tripId}: ${(e as Error).message}`);
      }
    }
  }

  return result;
}

// ── File reader helper ────────────────────────────────────────────────────────

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

type ImportStatus = "idle" | "loading" | "success" | "error";

export default function ExportPage() {
  const { data: budget, isLoading: budgetLoading } = useGetGlobalBudget();
  const { data: trips, isLoading: tripsLoading } = useListTrips();
  const { data: storage, isLoading: storageLoading } = useGetStorageRegister();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});
  const [importMsg, setImportMsg] = useState<Record<string, string>>({});

  const refs = {
    budget:    useRef<HTMLInputElement>(null),
    vehicle:   useRef<HTMLInputElement>(null),
    checklists:useRef<HTMLInputElement>(null),
    rental:    useRef<HTMLInputElement>(null),
    trips:     useRef<HTMLInputElement>(null),
    master:    useRef<HTMLInputElement>(null),
  };

  const isLoading = budgetLoading || tripsLoading || storageLoading;

  function setStatus(key: string, status: ImportStatus, msg = "") {
    setImportStatus(p => ({ ...p, [key]: status }));
    setImportMsg(p => ({ ...p, [key]: msg }));
  }

  async function invalidate() {
    await queryClient.invalidateQueries();
  }

  // ── CSV Imports ──

  async function handleBudgetImport(file: File) {
    setStatus("budget", "loading");
    try {
      const text = await readFile(file);
      const newMonths = parseBudgetCSV(text);
      if (Object.keys(newMonths).length === 0) throw new Error("No valid rows found");
      const current: any = budget ?? {};
      const merged = {
        ...current,
        months: { ...(current.months ?? {}), ...Object.fromEntries(
          Object.entries(newMonths).map(([mi, vals]) => [
            mi, { ...(current.months?.[mi] ?? {}), ...vals }
          ])
        )},
      };
      await apiFetch("/api/budget", "PUT", merged);
      await invalidate();
      const count = Object.values(newMonths).reduce((s, m) => s + Object.keys(m).length, 0);
      setStatus("budget", "success", `${count} values imported across ${Object.keys(newMonths).length} months`);
      toast({ title: "Budget imported", description: `${count} values restored` });
    } catch (e) {
      setStatus("budget", "error", (e as Error).message);
      toast({ title: "Budget import failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleVehicleImport(file: File) {
    setStatus("vehicle", "loading");
    try {
      const text = await readFile(file);
      const { profile, docs } = parseVehicleCSV(text);
      if (Object.keys(profile).length === 0 && Object.keys(docs).length === 0)
        throw new Error("No valid vehicle data found");
      const current: any = budget ?? {};
      const merged = {
        ...current,
        vehicleProfile: { ...(current.vehicleProfile ?? {}), ...profile },
        vehicleDocs:    { ...(current.vehicleDocs ?? {}), ...docs },
      };
      await apiFetch("/api/budget", "PUT", merged);
      await invalidate();
      const count = Object.keys(profile).length + Object.keys(docs).length;
      setStatus("vehicle", "success", `${count} vehicle fields imported`);
      toast({ title: "Vehicle profile imported", description: `${count} fields restored` });
    } catch (e) {
      setStatus("vehicle", "error", (e as Error).message);
      toast({ title: "Vehicle import failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleChecklistsImport(file: File) {
    setStatus("checklists", "loading");
    try {
      const text = await readFile(file);
      const newState = parseChecklistsCSV(text);
      if (Object.keys(newState).length === 0) throw new Error("No valid checklist rows found");
      const current: any = budget ?? {};
      const merged = {
        ...current,
        checklists: { ...(current.checklists ?? {}), ...newState },
      };
      await apiFetch("/api/budget", "PUT", merged);
      await invalidate();
      const count = Object.values(newState).reduce((s, cl) => s + Object.keys(cl).length, 0);
      setStatus("checklists", "success", `${count} checklist items imported`);
      toast({ title: "Checklists imported", description: `${count} items restored` });
    } catch (e) {
      setStatus("checklists", "error", (e as Error).message);
      toast({ title: "Checklists import failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleRentalImport(file: File) {
    setStatus("rental", "loading");
    try {
      const text = await readFile(file);
      const rentalData = parseRentalCSV(text);
      if (Object.keys(rentalData).length === 0) throw new Error("No valid rental fields found");
      const current: any = budget ?? {};
      const merged = {
        ...current,
        rental: { ...(current.rental ?? {}), ...rentalData },
      };
      await apiFetch("/api/budget", "PUT", merged);
      await invalidate();
      setStatus("rental", "success", `${Object.keys(rentalData).length} rental fields imported`);
      toast({ title: "Rental property imported", description: `${Object.keys(rentalData).length} fields restored` });
    } catch (e) {
      setStatus("rental", "error", (e as Error).message);
      toast({ title: "Rental import failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleTripsImport(file: File) {
    setStatus("trips", "loading");
    try {
      const text = await readFile(file);
      const rows = parseCSVText(text).slice(1);
      if (rows.length === 0) throw new Error("No trip rows found");
      let created = 0;
      for (const row of rows) {
        if (row.length < 2) continue;
        const payload = {
          name:        row[1]?.trim() || "Unnamed Trip",
          description: row[2]?.trim() || null,
          startDate:   row[3]?.trim() || null,
          endDate:     row[4]?.trim() || null,
          fuelPrice15: parseFloat(row[5]) || undefined,
          fuelPrice18: parseFloat(row[6]) || undefined,
          fuelPrice20: parseFloat(row[7]) || undefined,
          status:      row[8]?.trim() || "planning",
        };
        await apiFetch("/api/trips", "POST", payload);
        created++;
      }
      await invalidate();
      setStatus("trips", "success", `${created} trips created`);
      toast({ title: "Trips imported", description: `${created} trips created` });
    } catch (e) {
      setStatus("trips", "error", (e as Error).message);
      toast({ title: "Trips import failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleMasterImport(file: File) {
    setStatus("master", "loading");
    try {
      const text = await readFile(file);
      const data = JSON.parse(text);
      if (data.application !== "Die Groot Ompad") throw new Error("Not a valid Die Groot Ompad backup file");
      const result = await restoreMasterBackup(data, (trips as any[]) ?? []);
      await invalidate();
      const summary = [
        result.budget         && "Budget",
        result.storage        && "Storage",
        result.tripsUpdated   && `${result.tripsUpdated} trip(s) updated`,
        result.tripsCreated   && `${result.tripsCreated} trip(s) created`,
        result.legsRestored   && `${result.legsRestored} legs`,
        result.journalRestored && `${result.journalRestored} journal entries`,
        result.vehiclesRestored && `${result.vehiclesRestored} vehicle profile(s)`,
      ].filter(Boolean).join(", ");
      const msg = summary || "Nothing to restore";
      setStatus("master", result.errors.length === 0 ? "success" : "error",
        result.errors.length > 0 ? `Partial: ${result.errors.slice(0, 2).join("; ")}` : msg);
      toast({
        title:       result.errors.length === 0 ? "Master backup restored" : "Restore completed with errors",
        description: result.errors.length > 0 ? result.errors[0] : msg,
        variant:     result.errors.length > 0 ? "destructive" : "default",
      });
    } catch (e) {
      setStatus("master", "error", (e as Error).message);
      toast({ title: "Master restore failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleMasterExport() {
    try {
      const data = await buildMasterBackup(budget, (trips as any[]) ?? [], storage);
      downloadJSON(`dgo-master-backup-${ts()}.json`, data);
      toast({ title: "Master backup downloaded", description: "All application data saved to JSON file" });
    } catch (e) {
      toast({ title: "Master export failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  function makeFileHandler(key: keyof typeof refs, handler: (f: File) => Promise<void>, accept: string) {
    return {
      ref: refs[key],
      accept,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handler(file);
        e.target.value = "";
      },
      trigger: () => refs[key].current?.click(),
    };
  }

  const handlers = {
    budget:     makeFileHandler("budget",     handleBudgetImport,     ".csv"),
    vehicle:    makeFileHandler("vehicle",    handleVehicleImport,    ".csv"),
    checklists: makeFileHandler("checklists", handleChecklistsImport, ".csv"),
    rental:     makeFileHandler("rental",     handleRentalImport,     ".csv"),
    trips:      makeFileHandler("trips",      handleTripsImport,      ".csv"),
    master:     makeFileHandler("master",     handleMasterImport,     ".json"),
  };

  function StatusBadge({ k }: { k: string }) {
    const s = importStatus[k];
    const msg = importMsg[k];
    if (!s || s === "idle") return null;
    return (
      <div className={cn("flex items-center gap-1.5 text-[11px] mt-2 px-0.5", {
        "text-muted-foreground": s === "loading",
        "text-primary":          s === "success",
        "text-destructive":      s === "error",
      })}>
        {s === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
        {s === "success" && <CheckCircle className="h-3 w-3" />}
        {s === "error"   && <AlertCircle className="h-3 w-3" />}
        <span>{s === "loading" ? "Importing…" : msg}</span>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading data…</div>;

  const SECTIONS = [
    {
      key:         "budget",
      label:       "Budget — 60 Month Grid",
      description: "All 60 months of financial planning: every expense, income, and planning input. CSV exports all non-zero values; JSON backup includes every field including planning worksheet inputs.",
      icon:        Table2,
      color:       "#1f6f5f",
      onExport:    () => exportBudgetCSV(budget),
      detail:      `${Object.keys(budget?.months ?? {}).length} months · ${ALL_BUDGET_KEYS.length} categories`,
      accept:      ".csv",
    },
    {
      key:         "vehicle",
      label:       "Vehicle & Rig Profile",
      description: "Tow vehicle weights, caravan specs, payload items, insurance policies, registration plates and expiry dates, driver's licence details.",
      icon:        Truck,
      color:       "#d9b880",
      onExport:    () => exportVehicleCSV(budget),
      detail:      "Vehicle profile + all documents",
      accept:      ".csv",
    },
    {
      key:         "checklists",
      label:       "Checklists — All 4",
      description: "Every checklist item across D-2 Systems, Departure Day, Packing, and Annual Service with current YES/NO/N/A state.",
      icon:        ClipboardCheck,
      color:       "#7c3aed",
      onExport:    () => exportChecklistsCSV(budget),
      detail:      `${ALL_CHECKLISTS.reduce((s, cl) => s + cl.sections.reduce((ss, sec) => ss + sec.items.length, 0), 0)} items across ${ALL_CHECKLISTS.length} checklists`,
      accept:      ".csv",
    },
    {
      key:         "rental",
      label:       "Rental Property",
      description: "Property details, income, all expense categories, mortgage payoff date, insurance policies, depreciation parameters.",
      icon:        Home,
      color:       "#ef4444",
      onExport:    () => exportRentalCSV(budget),
      detail:      "Full rental configuration",
      accept:      ".csv",
    },
    {
      key:         "trips",
      label:       "Trips Summary",
      description: "All trip records — name, dates, fuel price scenarios, status. Import creates new trips from CSV rows (does not restore legs or journal).",
      icon:        Map,
      color:       "#0ea5e9",
      onExport:    () => exportTripsCSV((trips as any[]) ?? []),
      detail:      `${(trips as any[])?.length ?? 0} trip${(trips as any[])?.length !== 1 ? "s" : ""}`,
      accept:      ".csv",
      disabled:    !(trips as any[])?.length,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Hidden file inputs */}
      {(Object.keys(handlers) as (keyof typeof handlers)[]).map(k => (
        <input key={k} type="file" ref={handlers[k].ref}
          accept={handlers[k].accept} className="hidden"
          onChange={handlers[k].onChange} />
      ))}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backup &amp; Export</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Export individual data sets as CSV, or create a complete master backup — every field, every table — as a single JSON file you can store externally and fully restore from.
        </p>
      </div>

      {/* ── Master Backup ── */}
      <Card className="border-[#d9b880]/60 bg-[#d9b880]/5">
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-[#d9b880]/20">
              <Database className="h-5 w-5 text-[#7a5800]" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">Master Backup</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A single JSON file containing <strong>every field</strong> in the application: all 60 budget months including planning inputs, rental config, super/shares/income/tax/savings worksheets, vehicle profile, checklists, all trips with their legs, journal entries, per-trip vehicle profiles, and the storage register. Use this for external backups and full restores.
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-wrap gap-3 items-center">
            <Button onClick={handleMasterExport} className="gap-2 bg-[#1f6f5f] hover:bg-[#1a5e50]">
              <Download className="h-4 w-4" />
              Export Master Backup (.json)
            </Button>
            <Button variant="outline" className="gap-2 border-[#d9b880]/60 text-[#7a5800]"
              onClick={handlers.master.trigger}
              disabled={importStatus.master === "loading"}>
              {importStatus.master === "loading"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Upload className="h-4 w-4" />}
              Import Master Backup (.json)
            </Button>
          </div>
          <StatusBadge k="master" />
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Import replaces all budget, storage, rental, super, shares, income, and savings data. Trips are updated if they exist (matched by ID) or created if new. All legs and journal entries for each trip are fully replaced from the backup.
          </p>
        </CardContent>
      </Card>

      {/* ── Per-section Export/Import cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const h = handlers[sec.key as keyof typeof handlers];
          return (
            <Card key={sec.key} className="bg-card border-border flex flex-col">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md" style={{ background: sec.color + "20" }}>
                    <Icon className="h-4 w-4" style={{ color: sec.color }} />
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground">{sec.label}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{sec.description}</p>
              </CardHeader>
              <CardContent className="px-5 pb-4 flex-1 flex flex-col justify-end">
                <div className="text-[11px] text-muted-foreground mb-3">{sec.detail}</div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline"
                    className="gap-1.5 text-xs flex-1"
                    style={{ borderColor: sec.color + "60", color: sec.color }}
                    disabled={sec.disabled}
                    onClick={() => { sec.onExport(); toast({ title: `${sec.label} downloaded` }); }}>
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                  <Button size="sm" variant="outline"
                    className="gap-1.5 text-xs flex-1"
                    style={{ borderColor: sec.color + "40", color: sec.color }}
                    disabled={importStatus[sec.key] === "loading"}
                    onClick={h.trigger}>
                    {importStatus[sec.key] === "loading"
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Upload className="h-3.5 w-3.5" />}
                    Import CSV
                  </Button>
                </div>
                <StatusBadge k={sec.key} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── About section ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Format notes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-1">Master Backup JSON</p>
              <p>Lossless round-trip format. Contains every field in every table including planning worksheet inputs (at-home toggle, km, fuel consumption, nightly rate, food rate), all sub-page configs, and all trip data. Use for full restores.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Budget CSV</p>
              <p>One row per non-zero entry across all 60 months: month number, period label, section, category, and value. Includes all expense categories, income rows, and planning inputs. Import merges values on top of existing data.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Vehicle CSV</p>
              <p>Three-column format (Section, Field, Value) covering tow vehicle specs, payload, caravan specs, rego, licence, and insurance. Import merges fields into the existing vehicle profile without clearing other fields.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Checklists CSV</p>
              <p>One row per checklist item with your current YES/NO/N/A state. Import restores all states by item ID — works across app versions as long as item IDs haven't changed.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Rental Property CSV</p>
              <p>All rental config fields including mortgage payoff date. Import merges with existing rental config, preserving fields not present in the file.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Trips CSV</p>
              <p>Trip metadata only (name, dates, fuel prices, status). Import creates new trips — it does not restore legs or journal entries. Use the Master Backup JSON for full trip data including all legs and journal entries.</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-4 border-t border-border/40 pt-3">
            All CSV files include a UTF-8 BOM for correct Excel/Numbers rendering. Dates are ISO format (YYYY-MM-DD). Monetary values are plain numbers. Your data never leaves your account — exports are downloaded directly in your browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
