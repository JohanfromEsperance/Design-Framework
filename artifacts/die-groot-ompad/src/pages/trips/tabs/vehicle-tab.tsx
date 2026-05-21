import { useGetVehicleProfile, useSaveVehicleProfile, getGetVehicleProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Save, AlertTriangle, CheckCircle, AlertOctagon } from "lucide-react";

interface VehicleTabProps {
  tripId: number;
}

export default function VehicleTab({ tripId }: VehicleTabProps) {
  const { data: profile, isLoading } = useGetVehicleProfile(tripId);
  const saveProfile = useSaveVehicleProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveProfile.mutate({
      tripId,
      data: formData
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVehicleProfileQueryKey(tripId) });
        toast({ title: "Vehicle profile saved" });
      }
    });
  };

  if (isLoading) return <div>Loading vehicle data...</div>;

  // Calculations
  const kerbWeight = Number(formData.kerbWeight) || 0;
  const payloadPeople = Number(formData.payloadPeople) || 0;
  const payloadFood = Number(formData.payloadFood) || 0;
  const payloadRecovery = Number(formData.payloadRecovery) || 0;
  const payloadTools = Number(formData.payloadTools) || 0;
  const payloadFuel = Number(formData.payloadFuel) || 0;
  const payloadOther = Number(formData.payloadOther) || 0;
  const ballWeight = Number(formData.ballWeight) || 0;
  
  const gvm = Number(formData.gvm) || 0;
  const gcm = Number(formData.gcm) || 0;
  const towRating = Number(formData.towRating) || 0;
  const caravanAtm = Number(formData.caravanAtm) || 0;

  const totalVehicleMass = kerbWeight + payloadPeople + payloadFood + payloadRecovery + payloadTools + payloadFuel + payloadOther + ballWeight;
  const combinedMass = totalVehicleMass + caravanAtm;

  // Status checks
  const getStatus = (value: number, limit: number) => {
    if (!limit || limit === 0) return { status: 'unknown', icon: null, color: 'text-muted-foreground' };
    const ratio = value / limit;
    if (ratio > 1) return { status: 'DANGER', icon: <AlertOctagon className="h-4 w-4" />, color: 'text-destructive' };
    if (ratio > 0.9) return { status: 'WARN', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-yellow-500' };
    return { status: 'OK', icon: <CheckCircle className="h-4 w-4" />, color: 'text-primary' };
  };

  const gvmStatus = getStatus(totalVehicleMass, gvm);
  const gcmStatus = getStatus(combinedMass, gcm);
  const towStatus = getStatus(caravanAtm, towRating);
  const ballStatus = getStatus(ballWeight, towRating * 0.1); // approx 10%

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Rig Specifications</h2>
        <Button onClick={handleSave} disabled={saveProfile.isPending}>
          <Save className="mr-2 h-4 w-4" /> Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Tow Vehicle</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Vehicle Model</Label>
                <Input value={formData.vehicleModel || ""} onChange={e => handleChange("vehicleModel", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kerb Weight (kg)</Label>
                <Input type="number" value={formData.kerbWeight || ""} onChange={e => handleChange("kerbWeight", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>GVM (kg)</Label>
                <Input type="number" value={formData.gvm || ""} onChange={e => handleChange("gvm", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>GCM (kg)</Label>
                <Input type="number" value={formData.gcm || ""} onChange={e => handleChange("gcm", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Tow Rating (kg)</Label>
                <Input type="number" value={formData.towRating || ""} onChange={e => handleChange("towRating", Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Payload Items (Vehicle)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>People (kg)</Label>
                <Input type="number" value={formData.payloadPeople || ""} onChange={e => handleChange("payloadPeople", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Food/Water (kg)</Label>
                <Input type="number" value={formData.payloadFood || ""} onChange={e => handleChange("payloadFood", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Recovery Gear (kg)</Label>
                <Input type="number" value={formData.payloadRecovery || ""} onChange={e => handleChange("payloadRecovery", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Tools (kg)</Label>
                <Input type="number" value={formData.payloadTools || ""} onChange={e => handleChange("payloadTools", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Fuel (kg)</Label>
                <Input type="number" value={formData.payloadFuel || ""} onChange={e => handleChange("payloadFuel", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Other (kg)</Label>
                <Input type="number" value={formData.payloadOther || ""} onChange={e => handleChange("payloadOther", Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Caravan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Caravan Model</Label>
                <Input value={formData.caravanModel || ""} onChange={e => handleChange("caravanModel", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tare (kg)</Label>
                <Input type="number" value={formData.caravanTare || ""} onChange={e => handleChange("caravanTare", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>ATM (kg)</Label>
                <Input type="number" value={formData.caravanAtm || ""} onChange={e => handleChange("caravanAtm", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Ball Weight (kg)</Label>
                <Input type="number" value={formData.ballWeight || ""} onChange={e => handleChange("ballWeight", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Water Load (kg)</Label>
                <Input type="number" value={formData.waterLoad || ""} onChange={e => handleChange("waterLoad", Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary">Weight Compliance Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="flex items-center justify-between p-3 bg-card rounded-md border border-border">
                <div>
                  <span className="font-semibold text-foreground">GVM</span>
                  <p className="text-xs text-muted-foreground">Total Vehicle Mass</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-right">
                    {totalVehicleMass} / {gvm} kg
                  </span>
                  <div className={`flex items-center gap-1 font-bold w-20 justify-end ${gvmStatus.color}`}>
                    {gvmStatus.icon} {gvmStatus.status}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-card rounded-md border border-border">
                <div>
                  <span className="font-semibold text-foreground">GCM</span>
                  <p className="text-xs text-muted-foreground">Combined Mass</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-right">
                    {combinedMass} / {gcm} kg
                  </span>
                  <div className={`flex items-center gap-1 font-bold w-20 justify-end ${gcmStatus.color}`}>
                    {gcmStatus.icon} {gcmStatus.status}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-card rounded-md border border-border">
                <div>
                  <span className="font-semibold text-foreground">Tow Rating</span>
                  <p className="text-xs text-muted-foreground">Caravan ATM</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-right">
                    {caravanAtm} / {towRating} kg
                  </span>
                  <div className={`flex items-center gap-1 font-bold w-20 justify-end ${towStatus.color}`}>
                    {towStatus.icon} {towStatus.status}
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}