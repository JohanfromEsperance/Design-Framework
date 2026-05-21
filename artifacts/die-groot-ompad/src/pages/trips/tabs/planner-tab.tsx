import {
  Trip,
  useListLegs,
  useCreateLeg,
  useUpdateLeg,
  useDeleteLeg,
  getListLegsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Route,
  Navigation,
  Loader2,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { VoiceField } from "@/components/voice-button";
import { cn } from "@/lib/utils";

interface PlannerTabProps {
  trip: Trip;
}

const defaultLegState = {
  fromPlace: "",
  toPlace: "",
  plannedKm: 0,
  actualKm: 0,
  actualLitres: 0,
  actualPricePerLitre: 0,
  notes: "",
};

async function geocode(place: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        place + ", Australia"
      )}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch {
    return null;
  }
}

async function getDrivingDistance(
  from: string,
  to: string
): Promise<{ distanceKm: number; durationMin: number } | null> {
  const [fromCoords, toCoords] = await Promise.all([geocode(from), geocode(to)]);
  if (!fromCoords || !toCoords) return null;
  const [fLat, fLng] = fromCoords;
  const [tLat, tLng] = toCoords;
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${fLng},${fLat};${tLng},${tLat}?overview=false`
  );
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) return null;
  return {
    distanceKm: Math.round(data.routes[0].distance / 1000),
    durationMin: Math.round(data.routes[0].duration / 60),
  };
}

function googleMapsUrl(from: string, to: string) {
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent(from + ", Australia")}` +
    `&destination=${encodeURIComponent(to + ", Australia")}` +
    `&travelmode=driving`
  );
}

export default function PlannerTab({ trip }: PlannerTabProps) {
  const { data: legs, isLoading } = useListLegs(trip.id);
  const createLeg = useCreateLeg();
  const updateLeg = useUpdateLeg();
  const deleteLeg = useDeleteLeg();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [legData, setLegData] = useState(defaultLegState);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  // Drag-to-reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const sortedLegs = legs ? [...legs].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const activeLeg = sortedLegs[selectedIndex];

  useEffect(() => {
    if (activeLeg) {
      setLegData({
        fromPlace: activeLeg.fromPlace || "",
        toPlace: activeLeg.toPlace || "",
        plannedKm: activeLeg.plannedKm || 0,
        actualKm: activeLeg.actualKm || 0,
        actualLitres: activeLeg.actualLitres || 0,
        actualPricePerLitre: activeLeg.actualPricePerLitre || 0,
        notes: activeLeg.notes || "",
      });
      setRouteInfo(null);
    } else {
      setLegData(defaultLegState);
      setRouteInfo(null);
    }
  }, [selectedIndex, legs]);

  useEffect(() => {
    if (sortedLegs.length > 0 && selectedIndex >= sortedLegs.length) {
      setSelectedIndex(sortedLegs.length - 1);
    }
  }, [sortedLegs.length]);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== idx) setDragOverIndex(idx);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIdx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...sortedLegs];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIdx, 0, moved);

    // Batch PATCH sortOrder for all legs that shifted
    newOrder.forEach((leg, i) => {
      const newSort = i + 1;
      if (leg.sortOrder !== newSort) {
        updateLeg.mutate({
          tripId: trip.id,
          legId: leg.id,
          data: {
            fromPlace: leg.fromPlace || "",
            toPlace: leg.toPlace || "",
            plannedKm: leg.plannedKm || 0,
            actualKm: leg.actualKm || 0,
            actualLitres: leg.actualLitres || 0,
            actualPricePerLitre: leg.actualPricePerLitre || 0,
            notes: leg.notes || "",
            sortOrder: newSort,
          },
        });
      }
    });

    // Single query invalidation after all mutations queued
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: getListLegsQueryKey(trip.id) });
    }, 700);

    setSelectedIndex(targetIdx);
    setDragIndex(null);
    setDragOverIndex(null);

    toast({ title: "Leg order updated" });
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleAddStop = () => {
    const newOrder =
      sortedLegs.length > 0 ? sortedLegs[sortedLegs.length - 1].sortOrder + 1 : 1;
    createLeg.mutate(
      {
        tripId: trip.id,
        data: { fromPlace: "New Stop", toPlace: "Destination", sortOrder: newOrder, plannedKm: 0 },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLegsQueryKey(trip.id) });
          setSelectedIndex(sortedLegs.length);
          toast({ title: "Stop added" });
        },
      }
    );
  };

  const handleSaveLeg = () => {
    if (!activeLeg) return;
    updateLeg.mutate(
      { tripId: trip.id, legId: activeLeg.id, data: legData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLegsQueryKey(trip.id) });
          toast({ title: "Saved" });
        },
      }
    );
  };

  const handleDeleteLeg = () => {
    if (!activeLeg || !confirm("Delete this leg?")) return;
    deleteLeg.mutate(
      { tripId: trip.id, legId: activeLeg.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLegsQueryKey(trip.id) });
          setSelectedIndex((i) => Math.max(0, i - 1));
          toast({ title: "Leg deleted" });
        },
      }
    );
  };

  const handleCalculateDistance = async () => {
    if (!legData.fromPlace.trim() || !legData.toPlace.trim()) {
      toast({ title: "Enter both From and To first", variant: "destructive" });
      return;
    }
    setCalculatingDistance(true);
    try {
      const result = await getDrivingDistance(legData.fromPlace, legData.toPlace);
      if (!result) {
        toast({ title: "Could not calculate route", description: "Check place names and try again.", variant: "destructive" });
        return;
      }
      setLegData((d) => ({ ...d, plannedKm: result.distanceKm }));
      setRouteInfo(result);
      toast({
        title: `${result.distanceKm} km driving distance`,
        description: `Est. ${Math.floor(result.durationMin / 60)}h ${result.durationMin % 60}m — ${legData.fromPlace} → ${legData.toPlace}`,
      });
    } catch {
      toast({ title: "Distance calculation failed", variant: "destructive" });
    } finally {
      setCalculatingDistance(false);
    }
  };

  const fuelPrice18 = trip.fuelPrice18 || 1.5;
  const plannedKm = legData.plannedKm || 0;
  const est15 = plannedKm * 0.15;
  const est18 = plannedKm * 0.18;
  const est20 = plannedKm * 0.2;
  const estCost15 = est15 * fuelPrice18;
  const estCost18 = est18 * fuelPrice18;
  const estCost20 = est20 * fuelPrice18;
  const actualFuelCost = (legData.actualLitres || 0) * (legData.actualPricePerLitre || 0);
  const kmPerL = legData.actualLitres ? (legData.actualKm || 0) / legData.actualLitres : 0;
  const lPer100 = legData.actualKm ? ((legData.actualLitres || 0) / legData.actualKm) * 100 : 0;
  const varianceCost = actualFuelCost - estCost18;

  const totalPlannedKm = sortedLegs.reduce((s, l) => s + (l.plannedKm || 0), 0);
  const totalActualKm = sortedLegs.reduce((s, l) => s + (l.actualKm || 0), 0);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading planner...</div>;

  return (
    <div className="flex gap-0 h-full" style={{ minHeight: "calc(100vh - 220px)" }}>
      {/* ── Stop list panel ── */}
      <div className="w-64 shrink-0 flex flex-col border-r border-border bg-card rounded-l-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {sortedLegs.length} {sortedLegs.length === 1 ? "Leg" : "Legs"}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddStop}
            disabled={createLeg.isPending}
            className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
            title="Add stop"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {sortedLegs.length > 0 && (
          <p className="px-3 py-1.5 text-[10px] text-muted-foreground/60 border-b border-border/40 flex items-center gap-1">
            <GripVertical className="h-3 w-3" /> Drag to reorder
          </p>
        )}

        <div className="flex-1 overflow-y-auto">
          {sortedLegs.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground leading-relaxed">
              No stops yet.<br />Add one here or click the map.
            </div>
          ) : (
            sortedLegs.map((leg, idx) => {
              const isActive = idx === selectedIndex;
              const hasActual = (leg.actualKm || 0) > 0;
              const isDragOver = dragOverIndex === idx && dragIndex !== idx;
              const isDragging = dragIndex === idx;
              return (
                <div
                  key={leg.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center border-b border-border/50 transition-all select-none",
                    isActive ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/60",
                    isDragOver ? "border-t-2 border-t-primary" : "",
                    isDragging ? "opacity-40" : ""
                  )}
                >
                  <div className="px-1.5 py-3 text-muted-foreground/30 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing transition-colors">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <button
                    onClick={() => setSelectedIndex(idx)}
                    className="flex-1 text-left py-2.5 pr-3 min-w-0"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs font-medium text-foreground truncate max-w-[55px]">
                            {leg.fromPlace || "—"}
                          </span>
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium text-foreground truncate max-w-[55px]">
                            {leg.toPlace || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {leg.plannedKm ? `${leg.plannedKm.toLocaleString()} km` : "—"}
                          </span>
                          {hasActual && (
                            <span className="text-[10px] text-primary font-medium">
                              {leg.actualKm} actual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {sortedLegs.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/40 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total planned</span>
              <span className="font-semibold">{totalPlannedKm.toLocaleString()} km</span>
            </div>
            {totalActualKm > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total actual</span>
                <span className="font-semibold text-primary">{totalActualKm.toLocaleString()} km</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Leg editor panel ── */}
      <div className="flex-1 overflow-y-auto bg-background rounded-r-xl">
        {activeLeg ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Leg {selectedIndex + 1} — {activeLeg.fromPlace} to {activeLeg.toPlace}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleDeleteLeg}
                  disabled={deleteLeg.isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
                <Button size="sm" onClick={handleSaveLeg} disabled={updateLeg.isPending}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Route Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>From</Label>
                        <VoiceField value={legData.fromPlace} onChange={(v) => setLegData({ ...legData, fromPlace: v })}>
                          <Input value={legData.fromPlace} onChange={(e) => setLegData({ ...legData, fromPlace: e.target.value })} placeholder="Departure town" />
                        </VoiceField>
                      </div>
                      <div className="space-y-1.5">
                        <Label>To</Label>
                        <VoiceField value={legData.toPlace} onChange={(v) => setLegData({ ...legData, toPlace: v })}>
                          <Input value={legData.toPlace} onChange={(e) => setLegData({ ...legData, toPlace: e.target.value })} placeholder="Destination town" />
                        </VoiceField>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="flex items-end gap-3 flex-wrap">
                        <div className="space-y-1.5">
                          <Label>Planned Km</Label>
                          <Input
                            type="number"
                            value={legData.plannedKm}
                            onChange={(e) => setLegData({ ...legData, plannedKm: Number(e.target.value) })}
                            className="w-36"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCalculateDistance}
                          disabled={calculatingDistance || !legData.fromPlace || !legData.toPlace}
                          className="border-primary/40 text-primary hover:bg-primary/10 mb-0.5"
                        >
                          {calculatingDistance ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Navigation className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Get Driving Distance
                        </Button>
                        {legData.fromPlace && legData.toPlace && (
                          <a
                            href={googleMapsUrl(legData.fromPlace, legData.toPlace)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View in Google Maps
                          </a>
                        )}
                      </div>
                      {routeInfo && (
                        <div className="flex items-center gap-3 text-xs bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                          <Navigation className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-primary font-semibold">{routeInfo.distanceKm.toLocaleString()} km driving</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">Est. {Math.floor(routeInfo.durationMin / 60)}h {routeInfo.durationMin % 60}m drive time</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <VoiceField value={legData.notes} onChange={(v) => setLegData({ ...legData, notes: v })} speakable appendMode>
                        <Textarea
                          rows={4}
                          value={legData.notes}
                          onChange={(e) => setLegData({ ...legData, notes: e.target.value })}
                          placeholder="Fuel stops, attractions, warnings, road conditions..."
                          className="resize-none"
                        />
                      </VoiceField>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Actual Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Actual Km</Label>
                        <Input type="number" value={legData.actualKm} onChange={(e) => setLegData({ ...legData, actualKm: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Actual Litres</Label>
                        <Input type="number" value={legData.actualLitres} onChange={(e) => setLegData({ ...legData, actualLitres: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Price / Litre ($)</Label>
                        <Input type="number" step="0.01" value={legData.actualPricePerLitre} onChange={(e) => setLegData({ ...legData, actualPricePerLitre: Number(e.target.value) })} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fuel Estimates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0 divide-y divide-border">
                    <div className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <span className="text-muted-foreground">15 L/100km</span>
                        <span className="ml-2 font-medium">{est15.toFixed(1)} L</span>
                      </div>
                      <span className="text-muted-foreground">${estCost15.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 text-sm bg-primary/5 px-2 rounded-sm font-semibold">
                      <div>
                        <span className="text-foreground">18 L/100km</span>
                        <span className="ml-2">{est18.toFixed(1)} L</span>
                      </div>
                      <span className="text-primary text-base">${estCost18.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <span className="text-muted-foreground">20 L/100km</span>
                        <span className="ml-2 font-medium">{est20.toFixed(1)} L</span>
                      </div>
                      <span className="text-muted-foreground">${estCost20.toFixed(2)}</span>
                    </div>
                    <div className="pt-3 flex justify-between items-center text-xs text-muted-foreground">
                      <span>Fuel price used</span>
                      <span>${fuelPrice18.toFixed(2)}/L</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Actual KPIs</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Actual Cost</span>
                      <span className="font-bold text-sm">${actualFuelCost.toFixed(2)}</span>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">vs Baseline</span>
                      <span className={cn("font-bold text-sm",
                        actualFuelCost === 0 ? "text-muted-foreground"
                          : varianceCost > 0 ? "text-destructive" : "text-primary"
                      )}>
                        {actualFuelCost === 0 ? "—" : `${varianceCost > 0 ? "+" : ""}${varianceCost.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Km / L</span>
                      <span className="font-bold text-sm">{kmPerL > 0 ? kmPerL.toFixed(2) : "—"}</span>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">L / 100km</span>
                      <span className="font-bold text-sm">{lPer100 > 0 ? lPer100.toFixed(2) : "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <Route className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">Select a leg from the list</p>
            <p className="text-sm mt-1">or add a new stop to begin planning</p>
          </div>
        )}
      </div>
    </div>
  );
}
