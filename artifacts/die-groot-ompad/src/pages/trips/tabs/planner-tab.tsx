import { Trip, useListLegs, useCreateLeg, useUpdateLeg, useDeleteLeg, getListLegsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PlannerTabProps {
  trip: Trip;
}

export default function PlannerTab({ trip }: PlannerTabProps) {
  const { data: legs, isLoading } = useListLegs(trip.id);
  const createLeg = useCreateLeg();
  const updateLeg = useUpdateLeg();
  const deleteLeg = useDeleteLeg();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Create a default leg state
  const defaultLegState = {
    fromPlace: "",
    toPlace: "",
    plannedKm: 0,
    actualKm: 0,
    actualLitres: 0,
    actualPricePerLitre: 0,
    notes: ""
  };
  
  const [currentLegData, setCurrentLegData] = useState(defaultLegState);

  // Safely get sorted legs
  const sortedLegs = legs ? [...legs].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const activeLeg = sortedLegs[currentIndex];

  useEffect(() => {
    if (activeLeg) {
      setCurrentLegData({
        fromPlace: activeLeg.fromPlace || "",
        toPlace: activeLeg.toPlace || "",
        plannedKm: activeLeg.plannedKm || 0,
        actualKm: activeLeg.actualKm || 0,
        actualLitres: activeLeg.actualLitres || 0,
        actualPricePerLitre: activeLeg.actualPricePerLitre || 0,
        notes: activeLeg.notes || ""
      });
    } else {
      setCurrentLegData(defaultLegState);
    }
  }, [currentIndex, legs]);

  const handleNext = () => {
    if (currentIndex < sortedLegs.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleAddStop = () => {
    const newOrder = sortedLegs.length > 0 ? sortedLegs[sortedLegs.length - 1].sortOrder + 1 : 1;
    createLeg.mutate({
      tripId: trip.id,
      data: {
        fromPlace: "New Stop",
        toPlace: "Destination",
        sortOrder: newOrder,
        plannedKm: 0
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLegsQueryKey(trip.id) });
        setCurrentIndex(sortedLegs.length);
        toast({ title: "Leg added" });
      }
    });
  };

  const handleSaveLeg = () => {
    if (!activeLeg) return;
    updateLeg.mutate({
      tripId: trip.id,
      legId: activeLeg.id,
      data: currentLegData
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLegsQueryKey(trip.id) });
        toast({ title: "Saved", description: "Leg details updated" });
      }
    });
  };

  const handleDeleteLeg = () => {
    if (!activeLeg) return;
    if (confirm("Delete this leg?")) {
      deleteLeg.mutate({ tripId: trip.id, legId: activeLeg.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLegsQueryKey(trip.id) });
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
          toast({ title: "Leg deleted" });
        }
      });
    }
  };

  // Calculations
  const fuelPrice18 = trip.fuelPrice18 || 1.5;
  const plannedKm = currentLegData.plannedKm || 0;
  
  const est15 = plannedKm * 0.15;
  const est18 = plannedKm * 0.18;
  const est20 = plannedKm * 0.20;
  
  const estCost18 = est18 * fuelPrice18;
  const actualFuelCost = (currentLegData.actualLitres || 0) * (currentLegData.actualPricePerLitre || 0);
  const kmPerL = currentLegData.actualLitres ? (currentLegData.actualKm || 0) / currentLegData.actualLitres : 0;
  const lPer100 = currentLegData.actualKm ? ((currentLegData.actualLitres || 0) / currentLegData.actualKm) * 100 : 0;
  const varianceCost = actualFuelCost - estCost18;

  if (isLoading) return <div>Loading planner...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrev} disabled={currentIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-foreground">
            {sortedLegs.length > 0 ? `Leg ${currentIndex + 1} of ${sortedLegs.length}` : 'No legs yet'}
          </span>
          <Button variant="outline" size="icon" onClick={handleNext} disabled={currentIndex >= sortedLegs.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {activeLeg && (
            <Button variant="destructive" size="icon" onClick={handleDeleteLeg}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={handleAddStop}>
            <Plus className="mr-2 h-4 w-4" /> Add Stop
          </Button>
        </div>
      </div>

      {activeLeg ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Route Details</CardTitle>
                <Button size="sm" onClick={handleSaveLeg} disabled={updateLeg.isPending}>
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input 
                      value={currentLegData.fromPlace} 
                      onChange={e => setCurrentLegData({...currentLegData, fromPlace: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input 
                      value={currentLegData.toPlace} 
                      onChange={e => setCurrentLegData({...currentLegData, toPlace: e.target.value})} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
                  <div className="space-y-2">
                    <Label>Planned Km</Label>
                    <Input 
                      type="number" 
                      value={currentLegData.plannedKm} 
                      onChange={e => setCurrentLegData({...currentLegData, plannedKm: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2 pt-4">
                  <Label>Notes</Label>
                  <Textarea 
                    rows={4}
                    value={currentLegData.notes}
                    onChange={e => setCurrentLegData({...currentLegData, notes: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Actual Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Actual Km</Label>
                    <Input 
                      type="number" 
                      value={currentLegData.actualKm} 
                      onChange={e => setCurrentLegData({...currentLegData, actualKm: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Actual Litres</Label>
                    <Input 
                      type="number" 
                      value={currentLegData.actualLitres} 
                      onChange={e => setCurrentLegData({...currentLegData, actualLitres: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price / Litre ($)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={currentLegData.actualPricePerLitre} 
                      onChange={e => setCurrentLegData({...currentLegData, actualPricePerLitre: Number(e.target.value)})} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Estimates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">15L / 100km</span>
                  <span className="font-medium text-foreground">{est15.toFixed(1)} L</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold bg-muted p-2 rounded">
                  <span>18L / 100km (Baseline)</span>
                  <span>{est18.toFixed(1)} L</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">20L / 100km</span>
                  <span className="font-medium text-foreground">{est20.toFixed(1)} L</span>
                </div>
                <div className="pt-4 border-t border-border mt-4 flex justify-between items-center">
                  <span className="font-medium text-foreground">Est. Cost (Baseline)</span>
                  <span className="font-bold text-lg">${estCost18.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>KPIs</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground">Actual Cost</span>
                  <span className="font-bold text-foreground">${actualFuelCost.toFixed(2)}</span>
                </div>
                <div className="bg-muted p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground">Variance vs Est</span>
                  <span className={`font-bold ${varianceCost > 0 ? 'text-destructive' : 'text-primary'}`}>
                    {varianceCost > 0 ? '+' : ''}{varianceCost.toFixed(2)}
                  </span>
                </div>
                <div className="bg-muted p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground">Km / L</span>
                  <span className="font-bold text-foreground">{kmPerL.toFixed(2)}</span>
                </div>
                <div className="bg-muted p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground">L / 100km</span>
                  <span className="font-bold text-foreground">{lPer100.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">No legs found. Add a stop to begin planning.</p>
        </div>
      )}
    </div>
  );
}
