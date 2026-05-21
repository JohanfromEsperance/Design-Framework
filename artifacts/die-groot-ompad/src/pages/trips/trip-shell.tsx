import { Layout } from "@/components/layout";
import { useGetTrip } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Route, Car, DollarSign, BookOpen, BarChart3, CalendarCheck, Award } from "lucide-react";
import PlannerTab from "./tabs/planner-tab";
import MapTab from "./tabs/map-tab";
import VehicleTab from "./tabs/vehicle-tab";
import BudgetTab from "./tabs/budget-tab";
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

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{trip.name}</h1>
            {trip.startDate && (
              <p className="text-muted-foreground mt-1">
                {new Date(trip.startDate).toLocaleDateString()} {trip.endDate ? `- ${new Date(trip.endDate).toLocaleDateString()}` : ''}
              </p>
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
            <TabsTrigger value="budget" className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" /> <span className="hidden sm:inline">Budget</span>
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
            
            <TabsContent value="budget" className="m-0">
              <BudgetTab tripId={trip.id} />
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
