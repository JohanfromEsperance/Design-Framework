import { useGetBudget, useSaveBudget, getGetBudgetQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Save, Download } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BudgetTabProps {
  tripId: number;
}

const ROAD_EXPENSES = [
  { key: "fuel", label: "Fuel" },
  { key: "accommodation", label: "Accommodation" },
  { key: "groceries", label: "Groceries" },
  { key: "eatingOut", label: "Eating Out" },
  { key: "entertainment", label: "Entertainment" },
  { key: "passesPermits", label: "Passes & Permits" }
];

const BILLS = [
  { key: "insurance", label: "Insurance" },
  { key: "phoneInternet", label: "Phone/Internet" },
  { key: "medical", label: "Medical" },
  { key: "repairs", label: "Repairs" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "otherExpenses", label: "Other" }
];

const INCOME = [
  { key: "salary", label: "Salary" },
  { key: "businessIncome", label: "Business Income" },
  { key: "refunds", label: "Refunds" },
  { key: "otherIncome1", label: "Other Income 1" },
  { key: "otherIncome2", label: "Other Income 2" }
];

const ALL_CATEGORIES = [
  ...ROAD_EXPENSES.map(i => ({ ...i, section: "Road Expenses" })),
  ...BILLS.map(i => ({ ...i, section: "Bills" })),
  ...INCOME.map(i => ({ ...i, section: "Income" })),
];

export default function BudgetTab({ tripId }: BudgetTabProps) {
  const { data: budget, isLoading } = useGetBudget(tripId);
  const saveBudget = useSaveBudget();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [budgetData, setBudgetData] = useState<any>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  useEffect(() => {
    if (budget) {
      setBudgetData(budget);
    } else if (!isLoading) {
      const emptyMonths: Record<string, any> = {};
      for (let i = 0; i < 12; i++) {
        emptyMonths[i.toString()] = {
          fuel: 0, accommodation: 0, groceries: 0, eatingOut: 0, 
          entertainment: 0, passesPermits: 0, insurance: 0, phoneInternet: 0,
          medical: 0, repairs: 0, subscriptions: 0, otherExpenses: 0,
          salary: 0, businessIncome: 0, refunds: 0, otherIncome1: 0, otherIncome2: 0,
          openingBalance: 0
        };
      }
      setBudgetData({ year: new Date().getFullYear().toString(), months: emptyMonths });
    }
  }, [budget, isLoading]);

  const triggerSave = (data: any) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBudget.mutate({ tripId, data: { year: data.year, months: data.months } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetBudgetQueryKey(tripId) }); }
      });
    }, 1000);
  };

  const handleCellChange = (monthIndex: number, category: string, value: number) => {
    setBudgetData((prev: any) => {
      const newData = { ...prev };
      if (!newData.months[monthIndex]) newData.months[monthIndex] = {};
      newData.months[monthIndex][category] = value;
      triggerSave(newData);
      return newData;
    });
  };

  const handleManualSave = () => {
    if (!budgetData) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveBudget.mutate({ tripId, data: { year: budgetData.year, months: budgetData.months } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBudgetQueryKey(tripId) });
        toast({ title: "Budget saved" });
      }
    });
  };

  const handleDownloadCSV = () => {
    if (!budgetData) return;

    const monthHeaders = Array.from({ length: 12 }, (_, i) => `Month ${i + 1} (${budgetData.year})`);
    const rows: string[][] = [];

    rows.push(["Category", "Section", ...monthHeaders]);
    rows.push(["Opening Balance", "Balance", ...Array.from({ length: 12 }, (_, i) =>
      i === 0 ? String(budgetData.months[0]?.openingBalance || 0) : String(computedTotals[i]?.openingBalance.toFixed(2) || "0")
    )]);

    for (const cat of ALL_CATEGORIES) {
      rows.push([
        cat.label, cat.section,
        ...Array.from({ length: 12 }, (_, i) => String(budgetData.months[i]?.[cat.key] || 0))
      ]);
    }

    rows.push(["Total Expenses", "Summary", ...Array.from({ length: 12 }, (_, i) =>
      String(computedTotals[i]?.totalExpenses.toFixed(2) || "0")
    )]);
    rows.push(["Total Income", "Summary", ...Array.from({ length: 12 }, (_, i) =>
      String(computedTotals[i]?.totalIncome.toFixed(2) || "0")
    )]);
    rows.push(["Net Cashflow", "Summary", ...Array.from({ length: 12 }, (_, i) =>
      String((computedTotals[i]?.totalIncome - computedTotals[i]?.totalExpenses).toFixed(2) || "0")
    )]);
    rows.push(["Closing Balance", "Summary", ...Array.from({ length: 12 }, (_, i) =>
      String(computedTotals[i]?.closingBalance.toFixed(2) || "0")
    )]);

    const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${budgetData.year}-trip${tripId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV downloaded", description: `budget-${budgetData.year}-trip${tripId}.csv` });
  };

  const computedTotals = useMemo(() => {
    if (!budgetData) return [];
    const results = [];
    let currentBalance = 0;
    for (let i = 0; i < 12; i++) {
      const monthData = budgetData.months[i] || {};
      const monthOpening = i === 0 ? (Number(monthData.openingBalance) || 0) : currentBalance;
      const totalExpenses = [...ROAD_EXPENSES, ...BILLS].reduce((sum, item) => sum + (Number(monthData[item.key]) || 0), 0);
      const totalIncome = INCOME.reduce((sum, item) => sum + (Number(monthData[item.key]) || 0), 0);
      const closing = monthOpening + totalIncome - totalExpenses;
      currentBalance = closing;
      results.push({ month: i + 1, name: `Month ${i+1}`, openingBalance: monthOpening, totalExpenses, totalIncome, closingBalance: closing });
    }
    return results;
  }, [budgetData]);

  if (isLoading || !budgetData) return <div>Loading budget...</div>;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">12-Month Planner</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadCSV}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
          <Button onClick={handleManualSave} disabled={saveBudget.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save Spreadsheet
          </Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader><CardTitle>Cashflow Projection</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={computedTotals} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
              <Legend />
              <Bar dataKey="totalIncome" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalExpenses" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <div className="border border-border rounded-lg bg-card overflow-x-auto">
        <div className="min-w-[1200px]">
          <div className="grid grid-cols-[200px_repeat(12,minmax(80px,1fr))] border-b border-border bg-muted/50 font-medium">
            <div className="p-3 border-r border-border sticky left-0 bg-muted/50 z-10">Category</div>
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} className="p-3 text-center border-r border-border last:border-r-0">M{i+1}</div>
            ))}
          </div>

          <div className="grid grid-cols-[200px_repeat(12,minmax(80px,1fr))] border-b border-border bg-primary/5">
            <div className="p-3 border-r border-border font-bold sticky left-0 bg-card z-10">Opening Balance</div>
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} className="p-2 border-r border-border last:border-r-0 flex items-center justify-end font-medium">
                {i === 0 ? (
                  <input 
                    type="number" 
                    className="w-full bg-transparent outline-none text-right font-bold"
                    value={budgetData.months[0]?.openingBalance || 0}
                    onChange={(e) => handleCellChange(0, "openingBalance", Number(e.target.value))}
                  />
                ) : (
                  <span>{computedTotals[i]?.openingBalance.toFixed(0)}</span>
                )}
              </div>
            ))}
          </div>

          {[{ title: "Road Expenses", items: ROAD_EXPENSES }, { title: "Bills", items: BILLS }].map((section) => (
            <div key={section.title}>
              <div className="bg-muted p-2 font-semibold text-sm border-b border-border">{section.title}</div>
              {section.items.map(item => (
                <div key={item.key} className="grid grid-cols-[200px_repeat(12,minmax(80px,1fr))] border-b border-border">
                  <div className="p-3 border-r border-border font-medium text-sm sticky left-0 bg-card z-10">{item.label}</div>
                  {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className="p-2 border-r border-border last:border-r-0">
                      <input 
                        type="number" 
                        className="w-full bg-transparent outline-none text-right text-sm"
                        value={budgetData.months[i]?.[item.key] || ""}
                        onChange={(e) => handleCellChange(i, item.key, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-[200px_repeat(12,minmax(80px,1fr))] border-b border-border bg-destructive/5 text-destructive">
            <div className="p-3 border-r border-border font-bold sticky left-0 bg-card z-10">Total Expenses</div>
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} className="p-2 border-r border-border last:border-r-0 flex items-center justify-end font-bold text-sm">
                {computedTotals[i]?.totalExpenses.toFixed(0)}
              </div>
            ))}
          </div>

          <div>
            <div className="bg-muted p-2 font-semibold text-sm border-b border-border">Income</div>
            {INCOME.map(item => (
              <div key={item.key} className="grid grid-cols-[200px_repeat(12,minmax(80px,1fr))] border-b border-border">
                <div className="p-3 border-r border-border font-medium text-sm sticky left-0 bg-card z-10">{item.label}</div>
                {Array.from({length: 12}).map((_, i) => (
                  <div key={i} className="p-2 border-r border-border last:border-r-0">
                    <input 
                      type="number" 
                      className="w-full bg-transparent outline-none text-right text-sm"
                      value={budgetData.months[i]?.[item.key] || ""}
                      onChange={(e) => handleCellChange(i, item.key, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[200px_repeat(12,minmax(80px,1fr))] border-b border-border bg-primary/5 text-primary">
            <div className="p-3 border-r border-border font-bold sticky left-0 bg-card z-10">Total Income</div>
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} className="p-2 border-r border-border last:border-r-0 flex items-center justify-end font-bold text-sm">
                {computedTotals[i]?.totalIncome.toFixed(0)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[200px_repeat(12,minmax(80px,1fr))] border-b-2 border-border bg-muted font-bold text-foreground">
            <div className="p-3 border-r border-border sticky left-0 bg-muted z-10">Closing Balance</div>
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} className={`p-3 border-r border-border last:border-r-0 flex items-center justify-end ${(computedTotals[i]?.closingBalance || 0) < 0 ? "text-destructive" : ""}`}>
                {computedTotals[i]?.closingBalance.toFixed(0)}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
