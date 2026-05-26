import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, QrCode, Search, ChevronDown, ChevronUp, Trash2, Edit2,
  Link2, FileText, Camera, Package, X, ExternalLink, Upload,
  ScanLine, AlertTriangle, Copy, Download, Layers, Truck, Caravan, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import jsQR from "jsqr";
import QRCode from "qrcode";
import {
  type StorageLocation, type StorageItem, type StorageItemUrl,
  type LocationCategory, type ItemCondition,
  STORAGE_KEY, QR_PREFIX, makeQrPayload, parseQrPayload,
  loadRegister, saveRegister, buildPowerSeedLocations,
} from "@/lib/storage-store";
import { useGetStorageRegister, useSaveStorageRegister } from "@workspace/api-client-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }

const CATEGORY_COLORS: Record<LocationCategory, string> = {
  UTE:     "bg-[#d9b880]/20 text-[#b8943e] border-[#d9b880]/50",
  CARAVAN: "bg-primary/10 text-primary border-primary/30",
  OTHER:   "bg-muted text-muted-foreground border-border",
};

const CATEGORY_ICONS: Record<LocationCategory, React.ElementType> = {
  UTE: Truck,
  CARAVAN: Caravan,
  OTHER: Package,
};

const CONDITION_COLORS: Record<ItemCondition, string> = {
  Good:    "text-green-700 bg-green-50 border-green-200",
  Fair:    "text-[#b8943e] bg-[#d9b880]/10 border-[#d9b880]/30",
  Poor:    "text-destructive bg-destructive/5 border-destructive/20",
  Unknown: "text-muted-foreground bg-muted border-border",
};

function blankItem(): StorageItem {
  return {
    id: uid(), name: "", description: "", usage: "", manufacturer: "", model: "",
    serialNumber: "", partNumber: "", condition: "Good", quantity: 1,
    urls: [], pdfName: "", pdfData: "", photoData: "", notes: "",
  };
}

function blankLocation(): StorageLocation {
  return {
    id: uid(), name: "", locationDescription: "", category: "CARAVAN",
    items: [], photoData: "", notes: "", sortOrder: Date.now(), tagSerial: "",
  };
}

// ── QR code generator (returns a data URL) ────────────────────────────────────

async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 240,
    margin: 2,
    color: { dark: "#1f6f5f", light: "#f6f1e7" },
    errorCorrectionLevel: "M",
  });
}

// ── QR Scanner Modal ──────────────────────────────────────────────────────────

function QrScannerModal({
  open,
  onClose,
  onScanned,
}: {
  open: boolean;
  onClose: () => void;
  onScanned: (payload: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) { stopCamera(); return; }
    setError("");
    setScanning(true);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        const tick = () => {
          const vid = videoRef.current;
          const canvas = canvasRef.current;
          if (!vid || !canvas || vid.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
          canvas.width = vid.videoWidth;
          canvas.height = vid.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(vid, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code?.data) {
            stopCamera();
            onScanned(code.data);
            onClose();
          } else {
            rafRef.current = requestAnimationFrame(tick);
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => { setError("Camera access denied or unavailable."); setScanning(false); });

    return stopCamera;
  }, [open, stopCamera, onScanned, onClose]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" /> Scan QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          {/* Scan frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/70 rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
            </div>
          </div>
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-white text-sm text-center">{error}</p>
            </div>
          )}
          {scanning && !error && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="text-xs text-white/80 bg-black/50 px-3 py-1 rounded-full">
                Point camera at QR code
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── QR Display Modal ──────────────────────────────────────────────────────────

function QrDisplayModal({
  location,
  onClose,
}: {
  location: StorageLocation | null;
  onClose: () => void;
}) {
  const [qrUrl, setQrUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!location) { setQrUrl(""); return; }
    generateQrDataUrl(makeQrPayload(location.id)).then(setQrUrl);
  }, [location]);

  const downloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${(location?.name ?? "location").replace(/\s+/g, "_")}_QR.png`;
    a.click();
  };

  const copyId = () => {
    if (!location) return;
    navigator.clipboard.writeText(makeQrPayload(location.id));
    toast({ description: "QR payload copied to clipboard." });
  };

  return (
    <Dialog open={!!location} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">QR Code</DialogTitle>
        </DialogHeader>
        {location && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-bold text-foreground text-center">{location.name}</p>
            <p className="text-[10px] text-muted-foreground text-center">{location.locationDescription}</p>
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="w-48 h-48 rounded-lg border border-border" />
            ) : (
              <div className="w-48 h-48 rounded-lg border border-border bg-muted animate-pulse" />
            )}
            <p className="text-[9px] font-mono text-muted-foreground bg-muted rounded px-2 py-1 text-center break-all">
              {makeQrPayload(location.id)}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyId} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button size="sm" onClick={downloadQr} className="gap-1.5"
                style={{ background: "#1f6f5f", color: "#f6f1e7" }}>
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Item Form Dialog ──────────────────────────────────────────────────────────

function ItemDialog({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: StorageItem | null;
  onSave: (item: StorageItem) => void;
  onClose: () => void;
}) {
  const [item, setItem] = useState<StorageItem>(blankItem());
  const [scanOpen, setScanOpen] = useState(false);
  const { toast } = useToast();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItem(initial ? { ...initial } : blankItem());
  }, [initial, open]);

  const handleItemScan = useCallback((payload: string) => {
    setScanOpen(false);
    const isUrl = payload.startsWith("http://") || payload.startsWith("https://");
    if (isUrl) {
      setItem(prev => ({
        ...prev,
        urls: [...prev.urls, { id: uid(), label: "Scanned link", url: payload }],
      }));
      toast({ description: "URL added to item links." });
    } else {
      setItem(prev => ({ ...prev, serialNumber: payload }));
      toast({ description: "Scanned text saved as serial number." });
    }
  }, [toast]);

  const set = (field: keyof StorageItem) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setItem(prev => ({ ...prev, [field]: e.target.value }));

  const addUrl = () =>
    setItem(prev => ({ ...prev, urls: [...prev.urls, { id: uid(), label: "", url: "" }] }));

  const updateUrl = (id: string, field: keyof StorageItemUrl, val: string) =>
    setItem(prev => ({ ...prev, urls: prev.urls.map(u => u.id === id ? { ...u, [field]: val } : u) }));

  const removeUrl = (id: string) =>
    setItem(prev => ({ ...prev, urls: prev.urls.filter(u => u.id !== id) }));

  const handlePdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setItem(prev => ({ ...prev, pdfName: file.name, pdfData: ev.target?.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setItem(prev => ({ ...prev, photoData: ev.target?.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isValid = item.name.trim().length > 0;

  return (
    <>
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold">
              {initial ? "Edit Item" : "Add Item"}
            </DialogTitle>
            <Button size="sm" variant="outline" className="h-7 px-2.5 gap-1.5 text-xs"
              onClick={() => setScanOpen(true)}>
              <ScanLine className="h-3.5 w-3.5" /> Scan QR Tag
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Row 1 — Name + Qty + Condition */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Item Name *</Label>
              <Input value={item.name} onChange={set("name")} placeholder="e.g. BMV-712 Battery Monitor" className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input type="number" min={1} value={item.quantity}
                onChange={e => setItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                className="text-xs h-8" />
            </div>
          </div>

          {/* Description + Usage */}
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea value={item.description} onChange={set("description")}
              placeholder="What is this item?" rows={2} className="text-xs resize-none" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Usage / Purpose</Label>
            <Textarea value={item.usage} onChange={set("usage")}
              placeholder="How and when is this used?" rows={2} className="text-xs resize-none" />
          </div>

          {/* Manufacturer + Model + Part + Serial */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Manufacturer</Label>
              <Input value={item.manufacturer} onChange={set("manufacturer")} placeholder="e.g. Victron Energy" className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Model</Label>
              <Input value={item.model} onChange={set("model")} placeholder="e.g. SmartSolar MPPT 100/50" className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Part Number</Label>
              <Input value={item.partNumber} onChange={set("partNumber")} placeholder="e.g. SCC110050210" className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Serial Number</Label>
              <Input value={item.serialNumber} onChange={set("serialNumber")} placeholder="e.g. HQ2547GJHCF" className="text-xs h-8" />
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-1">
            <Label className="text-xs">Condition</Label>
            <Select value={item.condition}
              onValueChange={v => setItem(prev => ({ ...prev, condition: v as ItemCondition }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Good", "Fair", "Poor", "Unknown"] as ItemCondition[]).map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* URL Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Links / URLs</Label>
              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1" onClick={addUrl}>
                <Plus className="h-3 w-3" /> Add Link
              </Button>
            </div>
            {item.urls.map(u => (
              <div key={u.id} className="flex gap-2 items-center">
                <Input value={u.label} onChange={e => updateUrl(u.id, "label", e.target.value)}
                  placeholder="Label" className="text-xs h-7 w-28 shrink-0" />
                <Input value={u.url} onChange={e => updateUrl(u.id, "url", e.target.value)}
                  placeholder="https://..." className="text-xs h-7 flex-1" />
                <button onClick={() => removeUrl(u.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* PDF + Photo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">PDF / Datasheet</Label>
              <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdf} />
              <Button size="sm" variant="outline" className="w-full h-8 gap-1.5 text-xs"
                onClick={() => pdfInputRef.current?.click()}>
                <FileText className="h-3.5 w-3.5" />
                {item.pdfName ? item.pdfName.slice(0, 20) + "…" : "Attach PDF"}
              </Button>
              {item.pdfName && (
                <button className="text-[10px] text-destructive hover:underline"
                  onClick={() => setItem(prev => ({ ...prev, pdfName: "", pdfData: "" }))}>
                  Remove PDF
                </button>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Photo</Label>
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              <Button size="sm" variant="outline" className="w-full h-8 gap-1.5 text-xs"
                onClick={() => photoInputRef.current?.click()}>
                <Camera className="h-3.5 w-3.5" />
                {item.photoData ? "Change Photo" : "Add Photo"}
              </Button>
              {item.photoData && (
                <img src={item.photoData} alt="Item" className="w-full h-20 object-cover rounded border border-border mt-1" />
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={item.notes} onChange={set("notes")}
              placeholder="Any additional notes, Bluetooth PIN, config details, etc." rows={2} className="text-xs resize-none" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!isValid} onClick={() => onSave(item)}
            style={{ background: "#1f6f5f", color: "#f6f1e7" }}>
            {initial ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <QrScannerModal
      open={scanOpen}
      onClose={() => setScanOpen(false)}
      onScanned={handleItemScan}
    />
    </>
  );
}

// ── Location Form Dialog ──────────────────────────────────────────────────────

function LocationDialog({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: StorageLocation | null;
  onSave: (loc: StorageLocation) => void;
  onClose: () => void;
}) {
  const [loc, setLoc] = useState<StorageLocation>(blankLocation());
  const [scanOpen, setScanOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoc(initial ? { ...initial } : blankLocation());
  }, [initial, open]);

  const set = (field: keyof StorageLocation) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setLoc(prev => ({ ...prev, [field]: e.target.value }));

  const handleLocScan = useCallback((payload: string) => {
    setScanOpen(false);
    const isOwnQr = payload.startsWith(QR_PREFIX);
    if (isOwnQr) {
      toast({ description: "That QR belongs to an existing location. Scan from the main screen to open it." });
    } else {
      // Store raw scan result as the physical tag serial — name stays user-defined
      setLoc(prev => ({ ...prev, tagSerial: payload }));
      toast({ description: "QR tag linked — type the location name yourself." });
    }
  }, [toast]);

  return (
    <>
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold">
              {initial ? "Edit Location" : "New Storage Location"}
            </DialogTitle>
            <Button size="sm" variant="outline" className="h-7 px-2.5 gap-1.5 text-xs"
              onClick={() => setScanOpen(true)}>
              <ScanLine className="h-3.5 w-3.5" /> Scan QR Tag
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Location Name *</Label>
            <Input value={loc.name} onChange={set("name")}
              placeholder="e.g. FRONT TUNNEL DOOR LEFT" className="text-xs h-8 font-semibold" />
          </div>

          {/* Physical tag serial — populated by QR scan, not editable */}
          <div className="space-y-1">
            <Label className="text-xs">QR Tag Serial</Label>
            <div className="flex gap-2">
              <Input
                value={loc.tagSerial ?? ""}
                readOnly
                placeholder="Scan the physical label attached to this location"
                className="text-xs h-8 font-mono bg-muted/40 flex-1"
              />
              <Button size="sm" variant="outline" className="h-8 px-2 shrink-0"
                title="Scan physical QR label to link it"
                onClick={() => setScanOpen(true)}>
                <ScanLine className="h-3.5 w-3.5" />
              </Button>
              {loc.tagSerial && (
                <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setLoc(prev => ({ ...prev, tagSerial: "" }))}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Scan to link the physical QR sticker — location name is always typed by you
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={loc.category}
              onValueChange={v => setLoc(prev => ({ ...prev, category: v as LocationCategory }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UTE" className="text-xs">UTE</SelectItem>
                <SelectItem value="CARAVAN" className="text-xs">CARAVAN</SelectItem>
                <SelectItem value="OTHER" className="text-xs">OTHER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Physical Location Description</Label>
            <Textarea value={loc.locationDescription} onChange={set("locationDescription")}
              placeholder="Describe exactly where this storage is — e.g. 'Left-hand tunnel door, front section, top shelf'" rows={2}
              className="text-xs resize-none" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={loc.notes} onChange={set("notes")}
              placeholder="Any notes about this location" rows={2} className="text-xs resize-none" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!loc.name.trim()}
            onClick={() => onSave(loc)} style={{ background: "#1f6f5f", color: "#f6f1e7" }}>
            {initial ? "Save Changes" : "Create Location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <QrScannerModal
      open={scanOpen}
      onClose={() => setScanOpen(false)}
      onScanned={handleLocScan}
    />
    </>
  );
}

// ── Location Detail Sheet ─────────────────────────────────────────────────────

function LocationSheet({
  location,
  onClose,
  onUpdate,
  onDelete,
}: {
  location: StorageLocation | null;
  onClose: () => void;
  onUpdate: (loc: StorageLocation) => void;
  onDelete: (id: string) => void;
}) {
  const [qrUrl, setQrUrl] = useState("");
  const [editItem, setEditItem] = useState<StorageItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [editLoc, setEditLoc] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!location) { setQrUrl(""); return; }
    generateQrDataUrl(makeQrPayload(location.id)).then(setQrUrl);
  }, [location]);

  if (!location) return null;

  const saveItem = (item: StorageItem) => {
    const items = editItem
      ? location.items.map(i => i.id === item.id ? item : i)
      : [...location.items, item];
    onUpdate({ ...location, items });
    setEditItem(null);
    setAddingItem(false);
    toast({ description: editItem ? "Item updated." : "Item added." });
  };

  const deleteItem = (id: string) => {
    onUpdate({ ...location, items: location.items.filter(i => i.id !== id) });
    toast({ description: "Item removed." });
  };

  const CatIcon = CATEGORY_ICONS[location.category];

  return (
    <>
      <Dialog open={!!location} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0" aria-describedby={undefined}>
          <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CatIcon className="h-4 w-4 text-primary shrink-0" />
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[location.category])}>
                    {location.category}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold leading-tight">{location.name}</DialogTitle>
                {location.locationDescription && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{location.locationDescription}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditLoc(true)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setQrModal(true)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <QrCode className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${location.name}" and all its items?`)) { onDelete(location.id); onClose(); } }}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-4">
              {/* QR code thumbnail */}
              <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg border border-border">
                {qrUrl ? (
                  <img src={qrUrl} alt="QR" className="w-16 h-16 rounded border border-border shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded border border-border bg-muted shrink-0 animate-pulse" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">QR Code</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Print and attach to this storage location. Scanning opens this panel.
                  </p>
                  <button onClick={() => setQrModal(true)}
                    className="mt-1.5 text-[10px] text-primary hover:underline font-medium">
                    View full QR / Download
                  </button>
                </div>
              </div>

              {/* Notes */}
              {location.notes && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2 border-l-2 border-primary/30">
                  {location.notes}
                </div>
              )}

              {/* Items header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Contents — {location.items.length} item{location.items.length !== 1 ? "s" : ""}
                </p>
                <Button size="sm" className="h-7 px-3 text-xs gap-1.5"
                  style={{ background: "#1f6f5f", color: "#f6f1e7" }}
                  onClick={() => setAddingItem(true)}>
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>

              {/* Items list */}
              {location.items.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  No items yet — click Add Item to begin.
                </div>
              ) : (
                <div className="space-y-2">
                  {location.items.map(item => (
                    <ItemRow key={item.id} item={item}
                      onEdit={() => setEditItem(item)}
                      onDelete={() => deleteItem(item.id)} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Item add/edit dialog */}
      <ItemDialog
        open={addingItem || !!editItem}
        initial={editItem}
        onSave={saveItem}
        onClose={() => { setAddingItem(false); setEditItem(null); }}
      />

      {/* Edit location dialog */}
      <LocationDialog
        open={editLoc}
        initial={location}
        onSave={updated => { onUpdate(updated); setEditLoc(false); }}
        onClose={() => setEditLoc(false)}
      />

      {/* QR modal */}
      <QrDisplayModal
        location={qrModal ? location : null}
        onClose={() => setQrModal(false)}
      />
    </>
  );
}

// ── Item Row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: StorageItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = item.description || item.usage || item.serialNumber || item.notes ||
    item.urls.length > 0 || item.pdfName || item.photoData;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-card">
        {/* Expand toggle */}
        {hasDetails && (
          <button onClick={() => setExpanded(p => !p)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
        {!hasDetails && <div className="w-3.5 shrink-0" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
            {item.quantity > 1 && (
              <span className="text-[10px] text-muted-foreground shrink-0">×{item.quantity}</span>
            )}
          </div>
          {item.manufacturer && item.model && (
            <p className="text-[10px] text-muted-foreground truncate">{item.manufacturer} {item.model}</p>
          )}
          {item.serialNumber && (
            <p className="text-[10px] font-mono text-muted-foreground">SN: {item.serialNumber}</p>
          )}
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={cn("text-[9px] px-1 py-0 border font-medium", CONDITION_COLORS[item.condition])}>
            {item.condition}
          </Badge>
          {item.urls.length > 0 && <Link2 className="h-3 w-3 text-blue-500" />}
          {item.pdfName && <FileText className="h-3 w-3 text-[#b8943e]" />}
          {item.photoData && <Camera className="h-3 w-3 text-muted-foreground" />}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onEdit}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Edit2 className="h-3 w-3" />
          </button>
          <button onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 bg-muted/20 border-t border-border space-y-1.5 text-xs">
          {item.description && (
            <div><span className="font-semibold text-muted-foreground">Description: </span>{item.description}</div>
          )}
          {item.usage && (
            <div><span className="font-semibold text-muted-foreground">Usage: </span>{item.usage}</div>
          )}
          {item.partNumber && (
            <div><span className="font-semibold text-muted-foreground">Part No.: </span>
              <span className="font-mono">{item.partNumber}</span></div>
          )}
          {item.notes && (
            <div className="bg-card border border-border rounded px-2 py-1.5 text-muted-foreground italic">{item.notes}</div>
          )}
          {item.urls.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {item.urls.map(u => (
                <a key={u.id} href={u.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                  <ExternalLink className="h-2.5 w-2.5" /> {u.label || u.url}
                </a>
              ))}
            </div>
          )}
          {item.pdfName && (
            <a href={item.pdfData} download={item.pdfName}
              className="flex items-center gap-1 text-[10px] text-[#b8943e] hover:underline">
              <FileText className="h-3 w-3" /> {item.pdfName}
            </a>
          )}
          {item.photoData && (
            <img src={item.photoData} alt={item.name}
              className="w-full max-w-[200px] h-28 object-cover rounded border border-border mt-1" />
          )}
        </div>
      )}
    </div>
  );
}

// ── Location Summary Card (list view) ─────────────────────────────────────────

function LocationCard({
  location,
  onOpen,
}: {
  location: StorageLocation;
  onOpen: () => void;
}) {
  const CatIcon = CATEGORY_ICONS[location.category];
  const conditionCounts = location.items.reduce<Record<ItemCondition, number>>(
    (acc, item) => { acc[item.condition] = (acc[item.condition] || 0) + 1; return acc; },
    { Good: 0, Fair: 0, Poor: 0, Unknown: 0 },
  );
  const hasPoor = conditionCounts.Poor > 0;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left border border-border rounded-xl bg-card hover:border-primary/40 hover:bg-primary/3 transition-all p-4 group"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-primary/8 shrink-0">
          <CatIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-bold text-foreground">{location.name}</span>
            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", CATEGORY_COLORS[location.category])}>
              {location.category}
            </Badge>
            {hasPoor && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-destructive border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Poor condition
              </Badge>
            )}
          </div>
          {location.locationDescription && (
            <p className="text-xs text-muted-foreground leading-snug truncate">{location.locationDescription}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-muted-foreground">
              {location.items.length} item{location.items.length !== 1 ? "s" : ""}
            </span>
            {conditionCounts.Good > 0 && (
              <span className="text-[10px] text-green-600">{conditionCounts.Good} good</span>
            )}
            {conditionCounts.Fair > 0 && (
              <span className="text-[10px] text-[#b8943e]">{conditionCounts.Fair} fair</span>
            )}
            {conditionCounts.Poor > 0 && (
              <span className="text-[10px] text-destructive">{conditionCounts.Poor} poor</span>
            )}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0 rotate-[-90deg]" />
      </div>
    </button>
  );
}

// ── Scan Result Modal ─────────────────────────────────────────────────────────

function ScanResultModal({
  payload,
  locations,
  onOpenLocation,
  onAddAsSerial,
  onClose,
}: {
  payload: string | null;
  locations: StorageLocation[];
  onOpenLocation: (loc: StorageLocation) => void;
  onAddAsSerial: (serial: string) => void;
  onClose: () => void;
}) {
  if (!payload) return null;
  const locationId = parseQrPayload(payload);
  const found = locationId ? locations.find(l => l.id === locationId) : null;

  return (
    <Dialog open={!!payload} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" /> QR Scan Result
          </DialogTitle>
        </DialogHeader>
        {found ? (
          <div className="space-y-3">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary">Storage location found</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{found.name}</p>
              <p className="text-xs text-muted-foreground">{found.locationDescription}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {found.items.length} item{found.items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button className="w-full text-sm" style={{ background: "#1f6f5f", color: "#f6f1e7" }}
              onClick={() => { onOpenLocation(found); onClose(); }}>
              Open Location
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Scanned data:</p>
              <p className="text-xs font-mono text-foreground break-all">{payload}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              This QR code is not a storage location. Use the scanned text as a serial number?
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Dismiss</Button>
              <Button size="sm" className="flex-1" style={{ background: "#1f6f5f", color: "#f6f1e7" }}
                onClick={() => { onAddAsSerial(payload); onClose(); }}>
                Use as Serial
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StoragePage() {
  const { data: remoteData } = useGetStorageRegister();
  const saveToApi = useSaveStorageRegister();
  const firstRender = React.useRef(true);
  const [register, setRegister] = useState(() => loadRegister());
  const [activeCategory, setActiveCategory] = useState<LocationCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanPayload, setScanPayload] = useState<string | null>(null);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [openLocation, setOpenLocation] = useState<StorageLocation | null>(null);
  const [pendingSerial, setPendingSerial] = useState<string | null>(null);
  const [addItemForSerial, setAddItemForSerial] = useState(false);
  const { toast } = useToast();

  // On first API load: if local is empty, restore from DB
  useEffect(() => {
    if (!remoteData || register.locations.length > 0) return;
    const remote = remoteData as unknown as typeof register;
    if (remote.locations.length > 0) {
      setRegister(remote);
      saveRegister(remote);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteData]);

  // Persist on every change (skip first render to avoid overwriting fresher API data)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    saveRegister(register);
    saveToApi.mutate({ data: register as unknown as import("@workspace/api-client-react").AssetRegisterData });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register]);

  // Offer to seed power equipment on first load
  const [showSeedPrompt, setShowSeedPrompt] = useState(() => {
    const r = loadRegister();
    return r.locations.length === 0;
  });

  const seedPowerSystem = () => {
    setRegister(prev => ({
      ...prev,
      locations: [...buildPowerSeedLocations(), ...prev.locations],
    }));
    setShowSeedPrompt(false);
    toast({ description: "Power system equipment pre-populated." });
  };

  const addLocation = (loc: StorageLocation) => {
    setRegister(prev => ({ ...prev, locations: [...prev.locations, loc] }));
    toast({ description: "Location added." });
  };

  const updateLocation = (updated: StorageLocation) => {
    setRegister(prev => ({ ...prev, locations: prev.locations.map(l => l.id === updated.id ? updated : l) }));
    // Keep the sheet in sync
    setOpenLocation(updated);
  };

  const deleteLocation = (id: string) => {
    setRegister(prev => ({ ...prev, locations: prev.locations.filter(l => l.id !== id) }));
    toast({ description: "Location deleted." });
  };

  const handleScanned = (payload: string) => { setScanPayload(payload); };

  const handleUseAsSerial = (serial: string) => {
    setPendingSerial(serial);
    setAddItemForSerial(true);
    setAddLocOpen(false);
  };

  // Filter locations
  const filtered = register.locations
    .filter(l => activeCategory === "ALL" || l.category === activeCategory)
    .filter(l => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.locationDescription.toLowerCase().includes(q) ||
        l.items.some(i =>
          i.name.toLowerCase().includes(q) ||
          i.serialNumber.toLowerCase().includes(q) ||
          i.model.toLowerCase().includes(q) ||
          i.manufacturer.toLowerCase().includes(q)
        )
      );
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  // Stats
  const totalItems = register.locations.reduce((s, l) => s + l.items.length, 0);
  const uteCount = register.locations.filter(l => l.category === "UTE").length;
  const caravanCount = register.locations.filter(l => l.category === "CARAVAN").length;

  // Group by category for display when showing ALL
  const uteLocations = filtered.filter(l => l.category === "UTE");
  const caravanLocations = filtered.filter(l => l.category === "CARAVAN");
  const otherLocations = filtered.filter(l => l.category === "OTHER");

  const renderGroup = (label: string, locs: StorageLocation[], icon: React.ElementType) => {
    if (locs.length === 0) return null;
    const Icon = icon;
    return (
      <div className="space-y-2">
        {activeCategory === "ALL" && (
          <div className="flex items-center gap-2 pt-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 select-none">{label}</p>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}
        {locs.map(loc => (
          <LocationCard key={loc.id} location={loc} onOpen={() => setOpenLocation(loc)} />
        ))}
      </div>
    );
  };

  const newItemWithSerial = pendingSerial
    ? { ...blankItem(), serialNumber: pendingSerial }
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Storage Register
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {register.locations.length} locations · {totalItems} items ·
            {uteCount > 0 ? ` ${uteCount} UTE ·` : ""} {caravanCount > 0 ? ` ${caravanCount} Caravan` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
            onClick={() => setScannerOpen(true)}>
            <ScanLine className="h-3.5 w-3.5" /> Scan QR
          </Button>
          <Button size="sm" className="gap-1.5 h-8 text-xs"
            style={{ background: "#1f6f5f", color: "#f6f1e7" }}
            onClick={() => setAddLocOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Location
          </Button>
        </div>
      </div>

      {/* Seed prompt */}
      {showSeedPrompt && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Pre-populate power system equipment?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your Victron and BMPRO equipment from Power &amp; BMS can be added as a starting point (batteries, MPPT controllers, DC-DC chargers, safety systems).
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" style={{ background: "#1f6f5f", color: "#f6f1e7" }}
                onClick={seedPowerSystem} className="text-xs h-7">
                Yes, pre-populate
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7"
                onClick={() => setShowSeedPrompt(false)}>
                Start empty
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search + category tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search locations, items, serial numbers…"
            className="pl-8 h-8 text-xs" />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["ALL", "UTE", "CARAVAN", "OTHER"] as const).map(cat => (
            <button key={cat}
              className={cn("px-3 py-1.5 font-medium transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted")}
              onClick={() => setActiveCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Locations list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {search ? "No results for that search." : "No storage locations yet."}
          </p>
          <p className="text-xs mt-1 opacity-70">
            {search ? "Try a different search term." : "Click Add Location to create the first one."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {renderGroup("UTE", uteLocations, Truck)}
          {renderGroup("CARAVAN", caravanLocations, Caravan)}
          {renderGroup("OTHER", otherLocations, Package)}
        </div>
      )}

      {/* Modals */}
      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />

      <ScanResultModal
        payload={scanPayload}
        locations={register.locations}
        onOpenLocation={loc => setOpenLocation(loc)}
        onAddAsSerial={handleUseAsSerial}
        onClose={() => setScanPayload(null)}
      />

      <LocationDialog
        open={addLocOpen}
        initial={null}
        onSave={loc => { addLocation(loc); setAddLocOpen(false); }}
        onClose={() => setAddLocOpen(false)}
      />

      <LocationSheet
        location={openLocation}
        onClose={() => setOpenLocation(null)}
        onUpdate={updateLocation}
        onDelete={deleteLocation}
      />

      {/* Add item with scanned serial */}
      {addItemForSerial && newItemWithSerial && (
        <ItemDialog
          open={true}
          initial={newItemWithSerial}
          onSave={item => {
            toast({ description: "Item saved. Add it to a location from the location sheet." });
            setAddItemForSerial(false);
            setPendingSerial(null);
          }}
          onClose={() => { setAddItemForSerial(false); setPendingSerial(null); }}
        />
      )}
    </div>
  );
}

