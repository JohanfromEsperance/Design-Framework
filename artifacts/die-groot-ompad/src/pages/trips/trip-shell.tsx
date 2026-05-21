import { Layout } from "@/components/layout";
import { useGetTrip, useUpdateTrip, getGetTripQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Map, Route, Car, TrendingDown, BookOpen, BarChart3, CalendarCheck, Award, Pencil, X, Check } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PlannerTab from "./tabs/planner-tab";
import MapTab from "./tabs/map-tab";
import VehicleTab from "./tabs/vehicle-tab";
import TripCostsTab from "./tabs/trip-costs-tab";
import JournalTab from "./tabs/journal-tab";
import AnalysisTab from "./tabs/analysis-tab";
import BookingsTab from "./tabs/bookings-tab";
import MembershipsTab from "./tabs/memberships-tab";

interface TripShellProps {
  params: {
    tripId: string;
  }
}

export default function TripShell({ params }: TripShellProps) {
  const tripId = parseInt(params.tripId, 10);
  const { data: trip, isLoading } = useGetTrip(tripId);
  const updateTrip = useUpdateTrip();
  const queryClient = useQueryClient();

  const [editingDates, setEditingDates] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");

  const startEdit = () => {
    setDraftStart(trip?.startDate ? trip.startDate.slice(0, 10) : "");
    setDraftEnd(trip?.endDate ? trip.endDate.slice(0, 10) : "");
    setEditingDates(true);
  };

  const cancelEdit = () => setEditingDates(false);

  const saveDates = () => {
    updateTrip.mutate(
      { tripId, data: { startDate: draftStart || undefined, endDate: draftEnd || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTripQueryKey(tripId) });
          setEditingDates(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground">Trip not found</h2>
        </div>
      </Layout>
    );
  }

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{trip.name}</h1>

            {editingDates ? (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start</label>
                  <input
                    type="date" value={draftStart}
                    onChange={e => setDraftStart(e.target.value)}
                    className="border border-border rounded px-2 py-1 text-sm bg-card text-foreground"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">End</label>
                  <input
                    type="date" value={draftEnd}
                    onChange={e => setDraftEnd(e.target.value)}
                    className="border border-border rounded px-2 py-1 text-sm bg-card text-foreground"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 px-2">
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" onClick={saveDates} disabled={updateTrip.isPending} className="h-8 px-3">
                  <Check className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground text-sm">
                  {fmtDate(trip.startDate)
                    ? `${fmtDate(trip.startDate)}${fmtDate(trip.endDate) ? ` — ${fmtDate(trip.endDate)}` : ""}`
                    : "No dates set"}
                </p>
                <button
                  onClick={startEdit}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit trip dates"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="planner" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-8">
            <TabsTrigger value="planner" className="flex items-center gap-1.5">
              <Route className="h-4 w-4" /> <span className="hidden sm:inline">Planner</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-1.5">
              <Map className="h-4 w-4" /> <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="flex items-center gap-1.5">
              <Car className="h-4 w-4" /> <span className="hidden sm:inline">Vehicle</span>
            </TabsTrigger>
            <TabsTrigger value="costs" className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4" /> <span className="hidden sm:inline">Trip Costs</span>
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Journal</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-1.5">
              <CalendarCheck className="h-4 w-4" /> <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="memberships" className="flex items-center gap-1.5">
              <Award className="h-4 w-4" /> <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="planner" className="m-0">
              <PlannerTab trip={trip} />
            </TabsContent>

            <TabsContent value="map" className="m-0">
              <MapTab tripId={trip.id} />
            </TabsContent>

            <TabsContent value="vehicle" className="m-0">
              <VehicleTab tripId={trip.id} />
            </TabsContent>

            <TabsContent value="costs" className="m-0">
              <TripCostsTab tripId={trip.id} />
            </TabsContent>

            <TabsContent value="journal" className="m-0">
              <JournalTab tripId={trip.id} />
            </TabsContent>

            <TabsContent value="analysis" className="m-0">
              <AnalysisTab tripId={trip.id} />
            </TabsContent>

            <TabsContent value="bookings" className="m-0">
              <BookingsTab tripId={trip.id} />
            </TabsContent>

            <TabsContent value="memberships" className="m-0">
              <MembershipsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
