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
import { Plus, Trash2, Save, ArrowRight, Route } from "lucide-react";
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

export default function PlannerTab({ trip }: PlannerTabProps) {
  const { data: legs, isLoading } = useListLegs(trip.id);
  const createLeg = useCreateLeg();
  const updateLeg = useUpdateLeg();
  const deleteLeg = useDeleteLeg();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [legData, setLegData] = useState(defaultLegState);

  const sortedLegs = legs ? [...legs].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const activeLeg = sortedLegs[selectedIndex];

  // Sync form when selection or legs change
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
    } else {
      setLegData(defaultLegState);
    }
  }, [selectedIndex, legs]);

  // When new legs arrive (e.g. from Map tab), auto-select the newest one
  useEffect(() => {
    if (sortedLegs.length > 0 && selectedIndex >= sortedLegs.length) {
      setSelectedIndex(sortedLegs.length - 1);
    }
  }, [sortedLegs.length]);

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

  const fuelPrice18 = trip.fuelPrice18 || 1.5;
  const plannedKm = legData.plannedKm || 0;
  const est15 = plannedKm * 0.15;
  const est18 = plannedKm * 0.18;
  const est20 = plannedKm * 0.2;
  const estCost18 = est18 * fuelPrice18;
  const actualFuelCost = (legData.actualLitres || 0) * (legData.actualPricePerLitre || 0);
  const kmPerL = legData.actualLitres ? (legData.actualKm || 0) / legData.actualLitres : 0;
  const lPer100 = legData.actualKm
    ? ((legData.actualLitres || 0) / legData.actualKm) * 100
    : 0;
  const varianceCost = actualFuelCost - estCost18;

  const totalPlannedKm = sortedLegs.reduce((s, l) => s + (l.plannedKm || 0), 0);
  const totalActualKm = sortedLegs.reduce((s, l) => s + (l.actualKm || 0), 0);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading planner...</div>;

  return (
    <div className="flex gap-0 h-full" style={{ minHeight: "calc(100vh - 220px)" }}>
      {/* ── Stop list panel ── */}
      <div className="w-64 shrink-0 flex flex-col border-r border-border bg-card rounded-l-xl overflow-hidden">
        {/* Header */}
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

        {/* Leg rows */}
        <div className="flex-1 overflow-y-auto">
          {sortedLegs.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground leading-relaxed">
              No stops yet.<br />Add one here or click the map.
            </div>
          ) : (
            sortedLegs.map((leg, idx) => {
              const isActive = idx === selectedIndex;
              const hasActual = (leg.actualKm || 0) > 0;
              return (
                <button
                  key={leg.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors",
                    isActive
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : "hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Number badge */}
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
                      {/* From → To */}
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-medium text-foreground truncate max-w-[70px]">
                          {leg.fromPlace || "—"}
                        </span>
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate max-w-[70px]">
                          {leg.toPlace || "—"}
                        </span>
                      </div>
                      {/* Distance row */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {leg.plannedKm ? `${leg.plannedKm} km planned` : "0 km"}
                        </span>
                        {hasActual && (
                          <span className="text-[10px] text-primary font-medium">
                            {leg.actualKm} km actual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Trip totals footer */}
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
            {/* Editor header */}
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
              {/* Left: Route + Actual */}
              <div className="xl:col-span-2 space-y-6">
                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Route Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>From</Label>
                        <VoiceField
                          value={legData.fromPlace}
                          onChange={(v) => setLegData({ ...legData, fromPlace: v })}
                        >
                          <Input
                            value={legData.fromPlace}
                            onChange={(e) =>
                              setLegData({ ...legData, fromPlace: e.target.value })
                            }
                            placeholder="Departure town"
                          />
                        </VoiceField>
                      </div>
                      <div className="space-y-1.5">
                        <Label>To</Label>
                        <VoiceField
                          value={legData.toPlace}
                          onChange={(v) => setLegData({ ...legData, toPlace: v })}
                        >
                          <Input
                            value={legData.toPlace}
                            onChange={(e) =>
                              setLegData({ ...legData, toPlace: e.target.value })
                            }
                            placeholder="Destination town"
                          />
                        </VoiceField>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="space-y-1.5 max-w-[160px]">
                        <Label>Planned Km</Label>
                        <Input
                          type="number"
                          value={legData.plannedKm}
                          onChange={(e) =>
                            setLegData({ ...legData, plannedKm: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <VoiceField
                        value={legData.notes}
                        onChange={(v) => setLegData({ ...legData, notes: v })}
                        speakable
                        appendMode
                      >
                        <Textarea
                          rows={4}
                          value={legData.notes}
                          onChange={(e) =>
                            setLegData({ ...legData, notes: e.target.value })
                          }
                          placeholder="Fuel stops, attractions, warnings..."
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
                        <Input
                          type="number"
                          value={legData.actualKm}
                          onChange={(e) =>
                            setLegData({ ...legData, actualKm: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Actual Litres</Label>
                        <Input
                          type="number"
                          value={legData.actualLitres}
                          onChange={(e) =>
                            setLegData({ ...legData, actualLitres: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Price / Litre ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={legData.actualPricePerLitre}
                          onChange={(e) =>
                            setLegData({
                              ...legData,
                              actualPricePerLitre: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Estimates + KPIs */}
              <div className="space-y-6">
                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fuel Estimates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">15 L/100km</span>
                      <span className="font-medium">{est15.toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold bg-muted px-2 py-1.5 rounded">
                      <span>18 L/100km (Base)</span>
                      <span>{est18.toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">20 L/100km</span>
                      <span className="font-medium">{est20.toFixed(1)} L</span>
                    </div>
                    <div className="pt-3 border-t border-border flex justify-between items-center">
                      <span className="text-sm font-medium">Est. Cost</span>
                      <span className="font-bold text-lg">${estCost18.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">KPIs</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">
                        Actual Cost
                      </span>
                      <span className="font-bold text-sm">${actualFuelCost.toFixed(2)}</span>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">
                        Variance
                      </span>
                      <span
                        className={cn(
                          "font-bold text-sm",
                          varianceCost > 0 ? "text-destructive" : "text-primary"
                        )}
                      >
                        {varianceCost > 0 ? "+" : ""}
                        {varianceCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">
                        Km / L
                      </span>
                      <span className="font-bold text-sm">{kmPerL.toFixed(2)}</span>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">
                        L / 100km
                      </span>
                      <span className="font-bold text-sm">{lPer100.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center">
              <Route className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No stops yet. Add one using the <Plus className="inline h-3 w-3" /> button,<br />
                or click any point on the Map tab.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
