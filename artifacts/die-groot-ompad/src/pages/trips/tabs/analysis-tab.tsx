import { useGetTripSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalysisTabProps {
  tripId: number;
}

export default function AnalysisTab({ tripId }: AnalysisTabProps) {
  const { data: summary, isLoading } = useGetTripSummary(tripId);

  if (isLoading) return <div>Loading analysis...</div>;
  if (!summary) return <div>No data available for analysis.</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">KPI Snapshot</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summary.totalActualKm} <span className="text-lg font-normal text-muted-foreground">km</span></div>
            <p className="text-xs text-muted-foreground mt-1">Planned: {summary.totalPlannedKm} km</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fuel Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground"><span className="text-lg font-normal text-muted-foreground">$</span>{summary.totalActualFuelCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Variance: <span className={summary.costVariance > 0 ? "text-destructive" : "text-primary"}>{summary.costVariance > 0 ? "+" : ""}{summary.costVariance.toFixed(2)}</span></p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Consumption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summary.avgConsumptionL100km.toFixed(1)} <span className="text-lg font-normal text-muted-foreground">L/100km</span></div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Legs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summary.totalLegs}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}