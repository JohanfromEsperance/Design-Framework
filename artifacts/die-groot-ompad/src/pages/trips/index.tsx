import { Layout } from "@/components/layout";
import { useListTrips, useCreateTrip, useDeleteTrip, getListTripsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, Calendar, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function TripsList() {
  const { data: trips, isLoading } = useListTrips();
  const createTrip = useCreateTrip();
  const deleteTrip = useDeleteTrip();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripNotes, setNewTripNotes] = useState("");

  const handleCreate = () => {
    if (!newTripName.trim()) {
      toast({ title: "Error", description: "Trip name is required", variant: "destructive" });
      return;
    }

    createTrip.mutate({
      data: {
        name: newTripName,
        notes: newTripNotes,
        fuelPrice15: 1.50,
        fuelPrice18: 1.50,
        fuelPrice20: 1.50,
      }
    }, {
      onSuccess: (newTrip) => {
        setIsCreateOpen(false);
        setNewTripName("");
        setNewTripNotes("");
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
        toast({ title: "Success", description: "Trip created successfully" });
        setLocation(`/trips/${newTrip.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create trip", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      deleteTrip.mutate({ tripId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
          toast({ title: "Success", description: "Trip deleted" });
        }
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Expeditions</h1>
            <p className="text-muted-foreground mt-1">Manage your planned and completed trips.</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Plan a New Expedition</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Trip Name</Label>
                  <Input 
                    id="name" 
                    value={newTripName} 
                    onChange={(e) => setNewTripName(e.target.value)} 
                    placeholder="e.g. The Big Lap 2025" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Description (Optional)</Label>
                  <Textarea 
                    id="notes" 
                    value={newTripNotes} 
                    onChange={(e) => setNewTripNotes(e.target.value)} 
                    placeholder="What's the goal for this trip?"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createTrip.isPending}>
                  {createTrip.isPending ? "Creating..." : "Create Trip"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips?.map(trip => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card className="h-full flex flex-col cursor-pointer hover:border-primary transition-all hover:shadow-md bg-card group relative">
                <CardHeader>
                  <CardTitle className="text-xl flex justify-between items-start">
                    <span className="line-clamp-2">{trip.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(trip.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {trip.notes || "No description provided."}
                  </p>
                  
                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center text-sm text-foreground">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "No start date"} 
                      {trip.endDate ? ` - ${new Date(trip.endDate).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          
          {trips?.length === 0 && (
            <div className="col-span-full text-center py-16 border-2 border-dashed border-border rounded-lg">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Your map is blank</h3>
              <p className="text-muted-foreground mt-1">Create a trip to start planning your route.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}