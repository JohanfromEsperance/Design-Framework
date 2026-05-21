import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ShareHolding {
  id: string;
  code: string;
  company: string;
  qty: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
}

export interface SharesPortfolio {
  holdings: ShareHolding[];
}

export const DEFAULT_SHARES: SharesPortfolio = { holdings: [] };

// ── Helpers ────────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `h${Date.now()}${_id++}`;

const fmtCcy = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);

const fmtK = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", maximumFractionDigits: 0,
  }).format(n);

const gainColor = (n: number) =>
  n > 0 ? "text-primary" : n < 0 ? "text-destructive" : "text-foreground";

// ── CSV parser ─────────────────────────────────────────────────────────────────
// Expected columns (case-insensitive): Code, Company, Qty, Purchase Price, Current Price, [Purchase Date]

function parseCSV(text: string): ShareHolding[] {
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

  const codeIdx    = col(["code", "ticker", "symbol", "asx"]);
  const compIdx    = col(["company", "name", "stock"]);
  const qtyIdx     = col(["qty", "quantity", "units", "shares"]);
  const buyPxIdx   = col(["purchase price", "buy price", "cost", "purchase"]);
  const curPxIdx   = col(["current price", "last price", "price", "current"]);
  const dateIdx    = col(["date", "purchase date", "bought"]);

  const holdings: ShareHolding[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const code = codeIdx >= 0 ? cells[codeIdx]?.toUpperCase() : "";
    if (!code) continue;
    holdings.push({
      id: uid(),
      code,
      company:       compIdx >= 0  ? (cells[compIdx] ?? "")  : "",
      qty:           qtyIdx >= 0   ? Number(cells[qtyIdx]?.replace(/[^0-9.]/g, ""))   : 0,
      purchasePrice: buyPxIdx >= 0 ? Number(cells[buyPxIdx]?.replace(/[^0-9.]/g, "")) : 0,
      currentPrice:  curPxIdx >= 0 ? Number(cells[curPxIdx]?.replace(/[^0-9.]/g, "")) : 0,
      purchaseDate:  dateIdx >= 0  ? (cells[dateIdx] ?? "")  : "",
    });
  }
  return holdings;
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

  // ── Portfolio totals ───────────────────────────────────────────────────────

  const totals = React.useMemo(() => {
    let invested = 0, value = 0;
    for (const h of holdings) {
      invested += h.qty * h.purchasePrice;
      value    += h.qty * h.currentPrice;
    }
    const gain = value - invested;
    const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
    return { invested, value, gain, gainPct };
  }, [holdings]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const update = (next: ShareHolding[]) => onChange({ ...data, holdings: next });

  const addRow = () => update([
    ...holdings,
    { id: uid(), code: "", company: "", qty: 0, purchasePrice: 0, currentPrice: 0, purchaseDate: "" },
  ]);

  const removeRow = (id: string) => update(holdings.filter(h => h.id !== id));

  const updateRow = (id: string, field: keyof ShareHolding, val: string) => {
    update(holdings.map(h => {
      if (h.id !== id) return h;
      const numFields: (keyof ShareHolding)[] = ["qty", "purchasePrice", "currentPrice"];
      return { ...h, [field]: numFields.includes(field) ? Number(val) || 0 : val };
    }));
  };

  // ── CSV import ─────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setImportError("No valid rows found. Ensure columns: Code, Company, Qty, Purchase Price, Current Price.");
          return;
        }
        update([...holdings, ...parsed]);
      } catch {
        setImportError("Failed to parse file. Ensure it is a valid CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 p-4">

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Invested",  value: fmtK(totals.invested), icon: DollarSign, color: "text-foreground" },
          { label: "Portfolio Value", value: fmtK(totals.value),    icon: DollarSign, color: "text-foreground" },
          { label: "Total Gain/Loss", value: fmtK(totals.gain),     icon: totals.gain >= 0 ? TrendingUp : TrendingDown, color: gainColor(totals.gain) },
          { label: "Return",          value: `${totals.gainPct >= 0 ? "+" : ""}${totals.gainPct.toFixed(1)}%`, icon: TrendingUp, color: gainColor(totals.gain) },
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
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" /> Add Row
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
        <p className="text-xs text-muted-foreground">
          CSV columns: <span className="font-mono">Code, Company, Qty, Purchase Price, Current Price, [Purchase Date]</span>
        </p>
        {importError && (
          <p className="text-xs text-destructive ml-auto">{importError}</p>
        )}
      </div>

      {/* Holdings table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Code", "Company", "Qty", "Buy Price", "Current Price", "Value", "Gain/Loss", "Return", "Date", ""].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground text-xs">
                      No holdings. Import a CSV or add a row to get started.
                    </td>
                  </tr>
                )}
                {holdings.map((h, idx) => {
                  const val  = h.qty * h.currentPrice;
                  const cost = h.qty * h.purchasePrice;
                  const gain = val - cost;
                  const pct  = cost > 0 ? (gain / cost) * 100 : 0;
                  return (
                    <tr key={h.id} className={cn("border-b border-border/40 hover:bg-muted/20 transition-colors", idx % 2 === 0 ? "" : "bg-muted/10")}>
                      <td className="px-2 py-1 font-mono font-bold text-foreground">
                        <Cell value={h.code} onChange={v => updateRow(h.id, "code", v.toUpperCase())} className="font-mono font-bold w-16" />
                      </td>
                      <td className="px-2 py-1">
                        <Cell value={h.company} onChange={v => updateRow(h.id, "company", v)} className="w-40" />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <Cell value={h.qty} onChange={v => updateRow(h.id, "qty", v)} type="number" className="w-16 text-right" />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <Cell value={h.purchasePrice} onChange={v => updateRow(h.id, "purchasePrice", v)} type="number" className="w-20 text-right" />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <Cell value={h.currentPrice} onChange={v => updateRow(h.id, "currentPrice", v)} type="number" className="w-20 text-right" />
                      </td>
                      <td className="px-2 py-1 text-right font-semibold text-foreground">{fmtK(val)}</td>
                      <td className={cn("px-2 py-1 text-right font-semibold", gainColor(gain))}>{fmtK(gain)}</td>
                      <td className={cn("px-2 py-1 text-right font-semibold", gainColor(gain))}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1">
                        <Cell value={h.purchaseDate} onChange={v => updateRow(h.id, "purchaseDate", v)} className="w-24" />
                      </td>
                      <td className="px-2 py-1">
                        <button
                          onClick={() => removeRow(h.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {holdings.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/40 font-semibold">
                    <td colSpan={5} className="px-3 py-2 text-xs text-muted-foreground">Total ({holdings.length} holdings)</td>
                    <td className="px-3 py-2 text-right text-xs">{fmtK(totals.value)}</td>
                    <td className={cn("px-3 py-2 text-right text-xs", gainColor(totals.gain))}>{fmtK(totals.gain)}</td>
                    <td className={cn("px-3 py-2 text-right text-xs", gainColor(totals.gain))}>
                      {totals.gainPct >= 0 ? "+" : ""}{totals.gainPct.toFixed(1)}%
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Import template hint */}
      <Card className="border-border/60 border-dashed">
        <CardContent className="p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">CSV Import Format</p>
          <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed">
{`Code,Company,Qty,Purchase Price,Current Price,Purchase Date
VAS,"Vanguard Australian Shares Index ETF",100,85.50,92.30,2024-01-15
VGS,"Vanguard Intl Shares ETF",50,110.00,125.80,2024-03-01
BHP,"BHP Group Limited",200,44.00,47.50,2023-11-20`}
          </pre>
        </CardContent>
      </Card>

    </div>
  );
}
