import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useListLegs,
  useListGpsPoints,
  useLogGpsPoint,
  useClearGpsTrack,
  useCreateLeg,
  getListGpsPointsQueryKey,
  getListLegsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Trash2, Maximize2, Plus, Loader2 } from "lucide-react";

interface MapTabProps {
  tripId: number;
}

interface ClickedLocation {
  lat: number;
  lng: number;
  placeName: string | null;
  loading: boolean;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return (
      data.address?.town ||
      data.address?.city ||
      data.address?.village ||
      data.address?.suburb ||
      data.address?.county ||
      data.address?.state ||
      data.display_name?.split(",")[0] ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

async function forwardGeocode(place: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place + ", Australia")}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch {
    return null;
  }
}

export default function MapTab({ tripId }: MapTabProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const stopLayerRef = useRef<L.LayerGroup | null>(null);
  const gpsLayerRef = useRef<L.LayerGroup | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  const { data: legs } = useListLegs(tripId);
  const { data: gpsPoints } = useListGpsPoints(tripId);
  const logGpsPoint = useLogGpsPoint();
  const clearGpsTrack = useClearGpsTrack();
  const createLeg = useCreateLeg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [clickedLocation, setClickedLocation] = useState<ClickedLocation | null>(null);
  const [mappingStops, setMappingStops] = useState(false);

  // Init map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current).setView([-25.2744, 133.7751], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    stopLayerRef.current = L.layerGroup().addTo(map);
    gpsLayerRef.current = L.layerGroup().addTo(map);
    leafletMapRef.current = map;

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Show loading indicator on map
      if (clickMarkerRef.current) {
        clickMarkerRef.current.remove();
      }
      const pulseIcon = L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;background:#d9b880;border:3px solid #1f6f5f;border-radius:50%;opacity:0.8;animation:pulse 1s infinite;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      clickMarkerRef.current = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);

      setClickedLocation({ lat, lng, placeName: null, loading: true });

      const placeName = await reverseGeocode(lat, lng);
      setClickedLocation({ lat, lng, placeName, loading: false });

      if (clickMarkerRef.current) {
        const labelIcon = L.divIcon({
          className: "",
          html: `<div style="background:#f6f1e7;border:2px solid #1f6f5f;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:600;color:#1f6f5f;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${placeName}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 24],
        });
        clickMarkerRef.current.setIcon(labelIcon);
      }
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Draw GPS track
  useEffect(() => {
    if (!leafletMapRef.current || !gpsLayerRef.current || !gpsPoints) return;
    gpsLayerRef.current.clearLayers();
    if (gpsPoints.length > 0) {
      const latlngs = gpsPoints.map((pt) => [pt.lat, pt.lng] as L.LatLngExpression);
      L.polyline(latlngs, { color: "#d9b880", weight: 3, dashArray: "6 4" }).addTo(gpsLayerRef.current!);
      gpsPoints.forEach((pt) => {
        const icon = L.circleMarker([pt.lat, pt.lng], {
          radius: 4,
          fillColor: "#d9b880",
          color: "#1f6f5f",
          weight: 1,
          fillOpacity: 1,
        });
        icon.addTo(gpsLayerRef.current!);
      });
    }
  }, [gpsPoints]);

  const handleMapTripStops = async () => {
    if (!legs || legs.length === 0 || !leafletMapRef.current) return;
    setMappingStops(true);
    stopLayerRef.current?.clearLayers();

    const places: string[] = [];
    const sortedLegs = [...legs].sort((a, b) => a.sortOrder - b.sortOrder);
    sortedLegs.forEach((leg) => {
      if (!places.includes(leg.fromPlace)) places.push(leg.fromPlace);
      if (!places.includes(leg.toPlace)) places.push(leg.toPlace);
    });

    const coords: Array<{ place: string; latlng: [number, number] }> = [];

    for (const place of places) {
      const result = await forwardGeocode(place);
      if (result) coords.push({ place, latlng: result });
      await new Promise((r) => setTimeout(r, 300)); // Nominatim rate limit
    }

    if (coords.length === 0) {
      toast({ title: "Could not geocode any stops", variant: "destructive" });
      setMappingStops(false);
      return;
    }

    coords.forEach(({ place, latlng }, idx) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#1f6f5f;color:#f6f1e7;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #f6f1e7;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${idx + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker(latlng, { icon })
        .bindTooltip(place, { permanent: false, direction: "top" })
        .addTo(stopLayerRef.current!);
    });

    if (coords.length > 1) {
      const latlngs = coords.map((c) => c.latlng as L.LatLngExpression);
      L.polyline(latlngs, { color: "#1f6f5f", weight: 3 }).addTo(stopLayerRef.current!);
    }

    const bounds = L.latLngBounds(coords.map((c) => c.latlng));
    leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
    toast({ title: `Mapped ${coords.length} stops` });
    setMappingStops(false);
  };

  const handleAddGpsPoint = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        logGpsPoint.mutate(
          {
            tripId,
            data: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              capturedAt: new Date().toISOString(),
            },
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListGpsPointsQueryKey(tripId) });
              toast({ title: "GPS point logged" });
            },
          }
        );
      },
      (error) => {
        toast({ title: "Location error", description: error.message, variant: "destructive" });
      }
    );
  };

  const handleAddAsStop = () => {
    if (!clickedLocation?.placeName) return;
    const sortedLegs = legs ? [...legs].sort((a, b) => a.sortOrder - b.sortOrder) : [];
    const lastLeg = sortedLegs[sortedLegs.length - 1];
    const fromPlace = lastLeg?.toPlace || "Previous Stop";
    const newOrder = lastLeg ? lastLeg.sortOrder + 1 : 0;

    createLeg.mutate(
      {
        tripId,
        data: {
          fromPlace,
          toPlace: clickedLocation.placeName,
          sortOrder: newOrder,
          plannedKm: 0,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLegsQueryKey(tripId) });
          toast({ title: "Stop added", description: `${fromPlace} → ${clickedLocation.placeName}` });
          if (clickMarkerRef.current) {
            clickMarkerRef.current.remove();
            clickMarkerRef.current = null;
          }
          setClickedLocation(null);
        },
      }
    );
  };

  const handleAddAsGpsPoint = () => {
    if (!clickedLocation) return;
    logGpsPoint.mutate(
      {
        tripId,
        data: {
          lat: clickedLocation.lat,
          lng: clickedLocation.lng,
          note: clickedLocation.placeName || undefined,
          capturedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGpsPointsQueryKey(tripId) });
          toast({ title: "GPS point added", description: clickedLocation.placeName || "" });
          setClickedLocation(null);
          if (clickMarkerRef.current) {
            clickMarkerRef.current.remove();
            clickMarkerRef.current = null;
          }
        },
      }
    );
  };

  const handleClearTrack = () => {
    if (!confirm("Clear all GPS points?")) return;
    clearGpsTrack.mutate(
      { tripId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGpsPointsQueryKey(tripId) });
          gpsLayerRef.current?.clearLayers();
          toast({ title: "Track cleared" });
        },
      }
    );
  };

  const handleFitMap = () => {
    leafletMapRef.current?.setView([-25.2744, 133.7751], 4);
  };

  const handleDismissClick = () => {
    if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }
    setClickedLocation(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleMapTripStops}
          disabled={mappingStops}
          className="border-primary/40 text-primary hover:bg-primary/10"
        >
          {mappingStops ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          Map Trip Stops
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddGpsPoint}
          disabled={logGpsPoint.isPending}
          className="border-primary/40 text-primary hover:bg-primary/10"
        >
          <Navigation className="mr-2 h-4 w-4" />
          Log GPS Point
        </Button>
        <Button variant="outline" size="sm" onClick={handleFitMap}>
          <Maximize2 className="mr-2 h-4 w-4" />
          Fit Map
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearTrack}
          disabled={clearGpsTrack.isPending}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear GPS Track
        </Button>
        <span className="text-xs text-muted-foreground ml-2 hidden sm:block">
          Click anywhere on the map to add a stop or log a point
        </span>
      </div>

      {/* Click-to-add panel */}
      {clickedLocation && (
        <div className="flex items-center gap-3 bg-secondary/40 border border-secondary rounded-lg px-4 py-3">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            {clickedLocation.loading ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Identifying location...
              </span>
            ) : (
              <span className="text-sm font-semibold text-foreground truncate">{clickedLocation.placeName}</span>
            )}
          </div>
          {!clickedLocation.loading && (
            <>
              <Button
                size="sm"
                onClick={handleAddAsStop}
                disabled={createLeg.isPending}
                className="shrink-0"
              >
                <Plus className="mr-1 h-3 w-3" /> Add as Stop
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddAsGpsPoint}
                disabled={logGpsPoint.isPending}
                className="shrink-0"
              >
                <Navigation className="mr-1 h-3 w-3" /> Log GPS
              </Button>
            </>
          )}
          <button
            onClick={handleDismissClick}
            className="text-muted-foreground hover:text-foreground text-xs shrink-0"
          >
            &times;
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-1 rounded bg-[#1f6f5f]" />
          <span>Trip route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-1 rounded bg-[#d9b880] border-dashed" style={{ borderTop: "2px dashed #d9b880", height: 0 }} />
          <span>GPS track</span>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-[#1f6f5f] text-[#1f6f5f]">
          {gpsPoints?.length ?? 0} GPS points
        </Badge>
      </div>

      {/* Map */}
      <div className="h-[560px] w-full rounded-xl border border-border overflow-hidden relative">
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
