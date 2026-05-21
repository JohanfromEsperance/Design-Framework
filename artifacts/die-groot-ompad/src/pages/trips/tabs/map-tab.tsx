import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { Button } from "@/components/ui/button";
import { useListLegs, useListGpsPoints, useLogGpsPoint, useClearGpsTrack, getListGpsPointsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface MapTabProps {
  tripId: number;
}

export default function MapTab({ tripId }: MapTabProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  const { data: legs } = useListLegs(tripId);
  const { data: gpsPoints } = useListGpsPoints(tripId);
  const logGpsPoint = useLogGpsPoint();
  const clearGpsTrack = useClearGpsTrack();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!mapRef.current) return;
    
    // Initialize map
    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current).setView([-25.2744, 133.7751], 4); // Center of Australia
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMapRef.current);
      
      markersLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
    }
    
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update GPS track
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current || !gpsPoints) return;
    
    // In a full implementation we would draw polyline of the track
    // Keeping simple for now
    markersLayerRef.current.clearLayers();
    
    if (gpsPoints.length > 0) {
      const latlngs = gpsPoints.map(pt => [pt.lat, pt.lng] as L.LatLngExpression);
      const polyline = L.polyline(latlngs, { color: 'green', weight: 3 }).addTo(markersLayerRef.current);
      leafletMapRef.current.fitBounds(polyline.getBounds());
    }
  }, [gpsPoints]);

  const handleAddGpsPoint = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          logGpsPoint.mutate({
            tripId,
            data: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              capturedAt: new Date().toISOString()
            }
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListGpsPointsQueryKey(tripId) });
              toast({ title: "GPS point saved" });
            }
          });
        },
        (error) => {
          toast({ title: "Location error", description: error.message, variant: "destructive" });
        }
      );
    } else {
      toast({ title: "Geolocation not supported", variant: "destructive" });
    }
  };

  const handleClearTrack = () => {
    if (confirm("Clear all GPS points?")) {
      clearGpsTrack.mutate({ tripId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGpsPointsQueryKey(tripId) });
          toast({ title: "Track cleared" });
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={handleAddGpsPoint} disabled={logGpsPoint.isPending}>
          Add GPS Point
        </Button>
        <Button variant="outline">Map Trip Stops</Button>
        <Button variant="outline" onClick={() => leafletMapRef.current?.setView([-25.2744, 133.7751], 4)}>
          Fit Map
        </Button>
        <Button variant="destructive" onClick={handleClearTrack} disabled={clearGpsTrack.isPending}>
          Clear GPS Track
        </Button>
      </div>
      
      <div className="h-[600px] w-full rounded-xl border border-border overflow-hidden z-0 relative">
        <div ref={mapRef} className="w-full h-full" style={{ zIndex: 1 }} />
      </div>
    </div>
  );
}
