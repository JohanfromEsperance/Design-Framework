import { Layout } from "@/components/layout";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, Route, Fuel, BookOpen, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboard();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Commander's Dashboard</h1>
            <p className="text-muted-foreground mt-1">Your Big Lap intelligence center.</p>
          </div>
          <Button onClick={() => setLocation("/trips")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Manage Trips
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trips</CardTitle>
              <Map className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats?.totalTrips || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Distance Logged</CardTitle>
              <Route className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats?.totalKm?.toLocaleString() || 0} <span className="text-lg font-normal text-muted-foreground">km</span></div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fuel Cost</CardTitle>
              <Fuel className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground"><span className="text-lg font-normal text-muted-foreground">$</span>{stats?.totalFuelCost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || "0.00"}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Journal Entries</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats?.totalJournalEntries || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">Recent Expeditions</h2>
          
          {stats?.recentTrips && stats.recentTrips.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.recentTrips.map(trip => (
                <Link key={trip.id} href={`/trips/${trip.id}`}>
                  <Card className="cursor-pointer hover:border-primary transition-colors bg-card">
                    <CardHeader>
                      <CardTitle className="text-lg">{trip.name}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-1">{trip.notes || "No description"}</p>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'Unscheduled'}</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Map className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground">No trips yet</h3>
              <p className="text-muted-foreground mt-2 mb-4">Start planning your first Big Lap adventure.</p>
              <Button onClick={() => setLocation("/trips")}>Create your first trip</Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}