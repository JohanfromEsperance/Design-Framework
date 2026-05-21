import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
// Fields mirror the CommSec Holdings CSV export exactly.
// All CommSec-supplied fields are stored; computed fields fall back to arithmetic
// when the import source doesn't supply them.

export interface ShareHolding {
  id: string;
  // Core identity
  code: string;
  company: string;          // not in CommSec export — user-editable
  // Position
  qty: number;              // CommSec: Avail Units
  purchasePrice: number;    // CommSec: Purchase $
  currentPrice: number;     // CommSec: Last $
  // Daily move (CommSec: Change $, Chg %)
  changePrice: number;
  changePct: number;
  // Total return (CommSec: Profit/Loss $, P/L %)
  profitLoss: number;
  plPct: number;
  // Portfolio metrics (CommSec: Mkt Value $, Wgt %, Value Chg $)
  mktValue: number;
  weight: number;
  valueChange: number;
  // Manual
  purchaseDate: string;
}

export interface SharesPortfolio {
  holdings: ShareHolding[];
  importedAt?: string;    // ISO timestamp of last CommSec import
  accountNumber?: string;
  reportDate?: string;
}

export const DEFAULT_SHARES: SharesPortfolio = { holdings: [] };

// ── Helpers ────────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `h${Date.now()}${_id++}`;

const fmtCcy = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", minimumFractionDigits: 3, maximumFractionDigits: 3,
  }).format(n);

const fmtK = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", maximumFractionDigits: 0,
  }).format(n);

const fmtNum = (n: number, dp = 2) =>
  new Intl.NumberFormat("en-AU", { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

const gainColor = (n: number) =>
  n > 0 ? "text-primary" : n < 0 ? "text-destructive" : "text-foreground";

// Parse a numeric cell — handles empty, "," and "-" for missing
function num(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  return parseFloat(cleaned) || 0;
}

// ── CommSec CSV parser ─────────────────────────────────────────────────────────
// CommSec Holdings export format:
//   Row 0:  Account Number: XXXXXXX
//   Row 1:  "Share Holdings    As of HH:MM:SS AM/PM Sydney Time, DD Mon YYYY"
//   Row 2:  Code,Avail Units,Purchase $,Last $,Change $,Chg %,Profit/Loss $,P/L %,Mkt Value $,Wgt %,Value Chg $
//   Row 3:  CHESS  (section header — skip)
//   Rows N: data rows
//   Then:   Subtotal row, Issuer Sponsored Holdings section, Total row
//
// Also handles the generic CSV format used for manual entry:
//   Code,Company,Qty,Purchase Price,Current Price,[Purchase Date]

function parseCommSecCSV(text: string): { holdings: ShareHolding[]; accountNumber: string; reportDate: string } {
  const lines = text.split(/\r?\n/);
  let accountNumber = "";
  let reportDate = "";
  const holdings: ShareHolding[] = [];

  // Extract account number from first line
  const acctLine = lines[0] ?? "";
  const acctMatch = acctLine.match(/Account Number:\s*(\d+)/i);
  if (acctMatch) accountNumber = acctMatch[1];

  // Extract report date from second line
  const dateLine = lines[1] ?? "";
  const dateMatch = dateLine.match(/(\d{1,2}\s+\w+\s+\d{4})/);
  if (dateMatch) reportDate = dateMatch[1];

  // Find the header row — contains "Code" and "Avail Units"
  let headerIdx = -1;
  let headerCols: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, "").toLowerCase());
    if (cols[0] === "code" && cols.some(c => c.includes("avail") || c.includes("units") || c.includes("qty"))) {
      headerIdx = i;
      headerCols = cols;
      break;
    }
  }
  if (headerIdx < 0) return { holdings: [], accountNumber, reportDate };

  // Column indices
  const ci = (names: string[]) => {
    for (const n of names) {
      const idx = headerCols.findIndex(h => h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const iCode      = ci(["code"]);
  const iQty       = ci(["avail units", "qty", "quantity", "units"]);
  const iBuyPx     = ci(["purchase $", "purchase price", "buy price", "cost"]);
  const iLastPx    = ci(["last $", "current price", "last price", "current"]);
  const iChange    = ci(["change $"]);
  const iChgPct    = ci(["chg %"]);
  const iPL        = ci(["profit/loss $", "profit", "gain"]);
  const iPLPct     = ci(["p/l %"]);
  const iMktVal    = ci(["mkt value $", "market value", "value $"]);
  const iWeight    = ci(["wgt %", "weight"]);
  const iValChg    = ci(["value chg $"]);
  const iCompany   = ci(["company", "name", "stock"]);
  const iDate      = ci(["date", "purchase date"]);

  // Skip rows that are section headers or summary rows
  const SKIP_PREFIXES = ["chess", "subtotal", "total", "issuer sponsored", "there are no", "account number"];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const lower = raw.toLowerCase();
    if (SKIP_PREFIXES.some(p => lower.startsWith(p))) continue;

    const cells = raw.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const code = iCode >= 0 ? cells[iCode]?.toUpperCase().trim() : "";
    if (!code || code.length === 0) continue;
    // Skip if code looks like a label row
    if (code.toLowerCase() === "code" || code.toLowerCase() === "total" || code.toLowerCase() === "subtotal") continue;

    const qty       = num(cells[iQty]);
    const buyPx     = num(cells[iBuyPx]);
    const lastPx    = num(cells[iLastPx]);
    const changeP   = num(cells[iChange]);
    const chgPct    = num(cells[iChgPct]);
    const pl        = num(cells[iPL]);
    const plPct     = num(cells[iPLPct]);
    const mktVal    = iMktVal >= 0 ? num(cells[iMktVal]) : qty * lastPx;
    const weight    = num(cells[iWeight]);
    const valChg    = num(cells[iValChg]);
    const company   = iCompany >= 0 ? (cells[iCompany] ?? "") : "";
    const date      = iDate >= 0 ? (cells[iDate] ?? "") : "";

    holdings.push({
      id: uid(),
      code,
      company,
      qty,
      purchasePrice: buyPx,
      currentPrice:  lastPx,
      changePrice:   changeP,
      changePct:     chgPct,
      profitLoss:    pl,
      plPct,
      mktValue:      mktVal,
      weight,
      valueChange:   valChg,
      purchaseDate:  date,
    });
  }

  return { holdings, accountNumber, reportDate };
}

// ── Generic fallback parser (original simple format) ──────────────────────────

function parseGenericCSV(text: string): ShareHolding[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map(h => h.trim().toLowerCase());
  const col = (names: string[]) => {
    for (const n of names) {
      const idx = header.findIndex(h => h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  const codeIdx  = col(["code", "ticker", "symbol", "asx"]);
  const compIdx  = col(["company", "name", "stock"]);
  const qtyIdx   = col(["qty", "quantity", "units", "shares"]);
  const buyIdx   = col(["purchase price", "buy price", "cost", "purchase"]);
  const curIdx   = col(["current price", "last price", "price", "current", "last"]);
  const dateIdx  = col(["date", "purchase date", "bought"]);
  const holdings: ShareHolding[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const code = codeIdx >= 0 ? cells[codeIdx]?.toUpperCase() : "";
    if (!code) continue;
    holdings.push({
      id: uid(),
      code,
      company:      compIdx >= 0 ? (cells[compIdx] ?? "") : "",
      qty:          num(cells[qtyIdx]),
      purchasePrice: num(cells[buyIdx]),
      currentPrice:  num(cells[curIdx]),
      changePrice: 0, changePct: 0, profitLoss: 0, plPct: 0,
      mktValue: 0, weight: 0, valueChange: 0,
      purchaseDate:  dateIdx >= 0 ? (cells[dateIdx] ?? "") : "",
    });
  }
  return holdings;
}

// ── Detect format ──────────────────────────────────────────────────────────────

function isCommSecFormat(text: string): boolean {
  const first = text.slice(0, 300).toLowerCase();
  return first.includes("account number") || first.includes("avail units") || first.includes("mkt value");
}

// ── Inline editable cell ───────────────────────────────────────────────────────

function Cell({
  value, onChange, type = "text", className = "",
}: {
  value: string | number; onChange: (v: string) => void; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        "w-full bg-transparent text-xs px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-card border border-transparent focus:border-border",
        className
      )}
    />
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SharesSub({
  data,
  onChange,
}: {
  data: SharesPortfolio;
  onChange: (updated: SharesPortfolio) => void;
}) {
  const holdings = data.holdings ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Portfolio totals ─────────────────────────────────────────────────────────

  const totals = React.useMemo(() => {
    let invested = 0, value = 0, plDollar = 0, dailyChg = 0;
    for (const h of holdings) {
      const cost = h.qty * h.purchasePrice;
      const val  = h.mktValue > 0 ? h.mktValue : h.qty * h.currentPrice;
      invested  += cost;
      value     += val;
      plDollar  += h.profitLoss !== 0 ? h.profitLoss : (val - cost);
      dailyChg  += h.valueChange;
    }
    const gainPct = invested > 0 ? (plDollar / invested) * 100 : 0;
    return { invested, value, plDollar, gainPct, dailyChg };
  }, [holdings]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const update = (next: ShareHolding[], meta?: Partial<SharesPortfolio>) =>
    onChange({ ...data, ...meta, holdings: next });

  const addRow = () => update([
    ...holdings,
    {
      id: uid(), code: "", company: "", qty: 0, purchasePrice: 0, currentPrice: 0,
      changePrice: 0, changePct: 0, profitLoss: 0, plPct: 0,
      mktValue: 0, weight: 0, valueChange: 0, purchaseDate: "",
    },
  ]);

  const removeRow = (id: string) => update(holdings.filter(h => h.id !== id));

  const updateRow = (id: string, field: keyof ShareHolding, val: string) => {
    const numFields: (keyof ShareHolding)[] = [
      "qty", "purchasePrice", "currentPrice", "changePrice", "changePct",
      "profitLoss", "plPct", "mktValue", "weight", "valueChange",
    ];
    update(holdings.map(h => {
      if (h.id !== id) return h;
      return { ...h, [field]: numFields.includes(field) ? (parseFloat(val) || 0) : val };
    }));
  };

  // ── CSV import ───────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        let newHoldings: ShareHolding[];
        let meta: Partial<SharesPortfolio> = {};

        if (isCommSecFormat(text)) {
          const result = parseCommSecCSV(text);
          if (result.holdings.length === 0) {
            setImportError("No holdings found in CommSec export. Ensure the file contains share rows.");
            return;
          }
          newHoldings = result.holdings;
          meta = {
            importedAt: new Date().toISOString(),
            accountNumber: result.accountNumber,
            reportDate: result.reportDate,
          };
        } else {
          newHoldings = parseGenericCSV(text);
          if (newHoldings.length === 0) {
            setImportError("No valid rows found. Expected CommSec export or columns: Code, Qty, Purchase Price, Current Price.");
            return;
          }
        }

        // Replace holdings on CommSec import (it's a full snapshot), merge otherwise
        const isFull = isCommSecFormat(text);
        update(isFull ? newHoldings : [...holdings, ...newHoldings], meta);
      } catch {
        setImportError("Failed to parse file. Ensure it is a valid CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const isCommSec = !!data.accountNumber;

  return (
    <div className="space-y-4 p-4">

      {/* Import banner — CommSec account info */}
      {isCommSec && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-foreground">CommSec Account {data.accountNumber}</span>
            {data.reportDate && <> &nbsp;·&nbsp; As of {data.reportDate}</>}
            {data.importedAt && <> &nbsp;·&nbsp; Imported {new Date(data.importedAt).toLocaleDateString("en-AU")}</>}
            &nbsp;·&nbsp; Re-import below to refresh prices
          </span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Invested",  value: fmtK(totals.invested), icon: DollarSign, color: "text-foreground" },
          { label: "Portfolio Value", value: fmtK(totals.value),    icon: DollarSign, color: "text-foreground" },
          { label: "Total Gain/Loss", value: `${totals.plDollar >= 0 ? "+" : ""}${fmtK(totals.plDollar)}`, icon: totals.plDollar >= 0 ? TrendingUp : TrendingDown, color: gainColor(totals.plDollar) },
          { label: "Return",          value: `${totals.gainPct >= 0 ? "+" : ""}${fmtNum(totals.gainPct)}%`, icon: TrendingUp, color: gainColor(totals.plDollar) },
          ...(isCommSec ? [{ label: "Today's Value Chg", value: `${totals.dailyChg >= 0 ? "+" : ""}${fmtK(totals.dailyChg)}`, icon: totals.dailyChg >= 0 ? TrendingUp : TrendingDown, color: gainColor(totals.dailyChg) }] : []),
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-3 flex items-center gap-2">
              <Icon className={cn("h-5 w-5 shrink-0", color)} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={cn("text-sm font-bold", color)}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Import controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" />
          {isCommSec ? "Re-import CommSec CSV" : "Import CSV"}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" /> Add Row
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
        <p className="text-xs text-muted-foreground">
          CommSec Holdings export accepted — or generic CSV with columns:
          <span className="font-mono ml-1">Code, Qty, Purchase Price, Current Price</span>
        </p>
        {importError && (
          <p className="text-xs text-destructive">{importError}</p>
        )}
      </div>

      {/* Holdings table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    { h: "Code",         cls: "w-14" },
                    { h: "Company",      cls: "w-32" },
                    { h: "Avail Units",  cls: "w-20 text-right" },
                    { h: "Purchase $",   cls: "w-24 text-right" },
                    { h: "Last $",       cls: "w-20 text-right" },
                    { h: "Change $",     cls: "w-20 text-right" },
                    { h: "Chg %",        cls: "w-16 text-right" },
                    { h: "Profit/Loss $",cls: "w-24 text-right" },
                    { h: "P/L %",        cls: "w-16 text-right" },
                    { h: "Mkt Value $",  cls: "w-24 text-right" },
                    { h: "Wgt %",        cls: "w-14 text-right" },
                    { h: "Value Chg $",  cls: "w-22 text-right" },
                    { h: "Date",         cls: "w-24" },
                    { h: "",             cls: "w-8" },
                  ].map(({ h, cls }) => (
                    <th key={h} className={cn("px-2 py-2 font-semibold text-muted-foreground uppercase tracking-wide text-[10px] whitespace-nowrap", cls)}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-10 text-muted-foreground text-xs">
                      No holdings. Import a CommSec Holdings CSV or add a row manually.
                    </td>
                  </tr>
                )}
                {holdings.map((h, idx) => {
                  const val  = h.mktValue > 0 ? h.mktValue : h.qty * h.currentPrice;
                  const cost = h.qty * h.purchasePrice;
                  const pl   = h.profitLoss !== 0 ? h.profitLoss : (val - cost);
                  const plp  = h.plPct !== 0 ? h.plPct : (cost > 0 ? (pl / cost) * 100 : 0);
                  const chg  = h.changePrice;
                  const chgp = h.changePct;
                  const wgt  = h.weight;
                  const vc   = h.valueChange;
                  return (
                    <tr key={h.id} className={cn("border-b border-border/40 hover:bg-muted/20 transition-colors", idx % 2 !== 0 && "bg-muted/10")}>
                      {/* Code */}
                      <td className="px-2 py-1 font-mono font-bold text-foreground">
                        <Cell value={h.code} onChange={v => updateRow(h.id, "code", v.toUpperCase())} className="font-mono font-bold w-14" />
                      </td>
                      {/* Company */}
                      <td className="px-2 py-1">
                        <Cell value={h.company} onChange={v => updateRow(h.id, "company", v)} className="w-32" />
                      </td>
                      {/* Avail Units */}
                      <td className="px-2 py-1 text-right">
                        <Cell value={h.qty} onChange={v => updateRow(h.id, "qty", v)} type="number" className="w-20 text-right" />
                      </td>
                      {/* Purchase $ */}
                      <td className="px-2 py-1 text-right">
                        <Cell value={h.purchasePrice} onChange={v => updateRow(h.id, "purchasePrice", v)} type="number" className="w-20 text-right" />
                      </td>
                      {/* Last $ */}
                      <td className="px-2 py-1 text-right">
                        <Cell value={h.currentPrice} onChange={v => updateRow(h.id, "currentPrice", v)} type="number" className="w-16 text-right" />
                      </td>
                      {/* Change $ */}
                      <td className={cn("px-2 py-1 text-right tabular-nums font-medium", gainColor(chg))}>
                        {chg !== 0 ? `${chg > 0 ? "+" : ""}${fmtCcy(chg)}` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* Chg % */}
                      <td className={cn("px-2 py-1 text-right tabular-nums font-medium", gainColor(chgp))}>
                        {chgp !== 0 ? `${chgp > 0 ? "+" : ""}${fmtNum(chgp)}%` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* P/L $ */}
                      <td className={cn("px-2 py-1 text-right font-semibold tabular-nums", gainColor(pl))}>
                        {pl !== 0 ? fmtK(pl) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* P/L % */}
                      <td className={cn("px-2 py-1 text-right font-semibold tabular-nums", gainColor(plp))}>
                        {plp !== 0 ? `${plp > 0 ? "+" : ""}${fmtNum(plp)}%` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* Mkt Value */}
                      <td className="px-2 py-1 text-right font-semibold text-foreground tabular-nums">
                        {val > 0 ? fmtK(val) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* Wgt % */}
                      <td className="px-2 py-1 text-right text-muted-foreground tabular-nums">
                        {wgt > 0 ? `${fmtNum(wgt)}%` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* Value Chg $ */}
                      <td className={cn("px-2 py-1 text-right tabular-nums", gainColor(vc))}>
                        {vc !== 0 ? `${vc > 0 ? "+" : ""}${fmtK(vc)}` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* Date */}
                      <td className="px-2 py-1">
                        <Cell value={h.purchaseDate} onChange={v => updateRow(h.id, "purchaseDate", v)} className="w-24 text-xs" />
                      </td>
                      {/* Delete */}
                      <td className="px-2 py-1">
                        <button onClick={() => removeRow(h.id)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {holdings.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                    <td colSpan={7} className="px-3 py-2 text-xs text-muted-foreground">{holdings.length} holdings</td>
                    <td className={cn("px-2 py-2 text-right text-xs font-bold tabular-nums", gainColor(totals.plDollar))}>
                      {totals.plDollar >= 0 ? "+" : ""}{fmtK(totals.plDollar)}
                    </td>
                    <td className={cn("px-2 py-2 text-right text-xs font-bold tabular-nums", gainColor(totals.plDollar))}>
                      {totals.gainPct >= 0 ? "+" : ""}{fmtNum(totals.gainPct)}%
                    </td>
                    <td className="px-2 py-2 text-right text-xs font-bold tabular-nums text-foreground">{fmtK(totals.value)}</td>
                    <td className="px-2 py-2 text-right text-xs text-muted-foreground">100%</td>
                    <td className={cn("px-2 py-2 text-right text-xs font-bold tabular-nums", gainColor(totals.dailyChg))}>
                      {totals.dailyChg !== 0 ? `${totals.dailyChg > 0 ? "+" : ""}${fmtK(totals.dailyChg)}` : "—"}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CommSec format hint */}
      <Card className="border-border/60 border-dashed">
        <CardContent className="p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">CommSec Holdings Export — Accepted Format</p>
          <p className="text-[10px] text-muted-foreground">
            In CommSec: Portfolio &rarr; Holdings &rarr; Export &rarr; CSV. The file includes all columns below.
            On import the full portfolio snapshot replaces existing holdings.
          </p>
          <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed overflow-x-auto">
{`Account Number: 2938365
"Share Holdings    As of 6:19:22 AM Sydney Time, 22 May 2026"
Code,Avail Units,Purchase $,Last $,Change $,Chg %,Profit/Loss $,P/L %,Mkt Value $,Wgt %,Value Chg $
CHESS
VAS,100,85.540,92.300,,,-285.00,-52.78,9230.00,12.50,46.15
VGS,50,110.000,125.800,,,795.00,14.45,6290.00,8.52,31.45
Subtotal,,,,,,510.00,...`}
          </pre>
        </CardContent>
      </Card>

    </div>
  );
}
