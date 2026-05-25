import { useState, useRef, useCallback, useEffect } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Save, Receipt, Upload, X, Link2, Camera,
  ClipboardPaste, Image, ScanLine,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  type Booking, type BookingType,
  EMPTY_BOOKING, TYPE_LABELS,
  nightsBetween, normaliseUrl, isValidUrl,
} from "@/lib/bookings-store";

interface BookingDialogProps {
  open: boolean;
  initial: Booking | null;
  defaultLegId?: string;
  defaultLegLabel?: string;
  onSave: (booking: Booking) => void;
  onClose: () => void;
}

export default function BookingDialog({
  open,
  initial,
  defaultLegId,
  defaultLegLabel,
  onSave,
  onClose,
}: BookingDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<Omit<Booking, "id">>(() =>
    initial ? { ...EMPTY_BOOKING, ...initial } : { ...EMPTY_BOOKING, legId: defaultLegId, legLabel: defaultLegLabel }
  );
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanTarget, setScanTarget] = useState<"siteUrl" | "linkUrl">("siteUrl");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { ...EMPTY_BOOKING, ...initial }
        : { ...EMPTY_BOOKING, legId: defaultLegId, legLabel: defaultLegLabel }
      );
      setNewLinkLabel("");
      setNewLinkUrl("");
      setPhotoName(null);
    }
  }, [open, initial, defaultLegId, defaultLegLabel]);

  const stopScan = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanOpen(false);
    setScanError(null);
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "dontInvert" });
    if (result) {
      const text = result.data.trim();
      stopScan();
      const isUrl = text.startsWith("http://") || text.startsWith("https://");
      if (scanTarget === "siteUrl") {
        if (isUrl) {
          setForm(f => ({ ...f, siteUrl: text }));
          toast({ title: "QR scanned", description: "URL saved as main site link" });
        } else {
          setForm(f => ({ ...f, confirmationNumber: text }));
          toast({ title: "QR scanned", description: `Saved as confirmation number: ${text}` });
        }
      } else {
        setNewLinkUrl(isUrl ? text : "https://" + text);
        toast({ title: "QR scanned", description: "URL ready to add as link" });
      }
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [scanTarget, stopScan, toast]);

  const startScan = useCallback(async (target: "siteUrl" | "linkUrl") => {
    setScanTarget(target);
    setScanError(null);
    setScanOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setScanError("Camera access denied — grant permission and try again");
    }
  }, [tick]);

  useEffect(() => () => stopScan(), [stopScan]);

  const handleSave = () => {
    if (!form.parkName.trim()) {
      toast({ title: "Park name is required", variant: "destructive" });
      return;
    }
    const booking: Booking = {
      ...form,
      id: initial?.id ?? crypto.randomUUID(),
    };
    onSave(booking);
    onClose();
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large — max 5 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, receiptName: file.name, receiptData: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Photo too large — max 8 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const id = crypto.randomUUID();
      const name = file.name || `photo-${Date.now()}.jpg`;
      setPhotoName(name);
      setForm(f => ({
        ...f,
        referencePhotos: [...(f.referencePhotos ?? []), { id, name, data: reader.result as string }],
      }));
      toast({ title: "Photo saved", description: name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removePhoto = (photoId: string) => {
    setForm(f => ({ ...f, referencePhotos: (f.referencePhotos ?? []).filter(p => p.id !== photoId) }));
  };

  const addLink = () => {
    const url = normaliseUrl(newLinkUrl);
    if (!url || !isValidUrl(url)) {
      toast({ title: "Enter a valid URL", variant: "destructive" });
      return;
    }
    setForm(f => ({
      ...f,
      links: [...(f.links ?? []), { id: crypto.randomUUID(), label: newLinkLabel.trim() || new URL(url).hostname, url }],
    }));
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const removeLink = (linkId: string) => {
    setForm(f => ({ ...f, links: (f.links ?? []).filter(l => l.id !== linkId) }));
  };

  const pasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setNewLinkUrl(text.trim());
    } catch {
      toast({ title: "Paste from clipboard not supported", variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{initial ? "Edit Booking" : "Add Booking"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {form.legLabel && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border">
                <span className="font-medium text-foreground">Leg:</span> {form.legLabel}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Park / Site Name *</Label>
                <Input value={form.parkName} onChange={e => setForm(f => ({ ...f, parkName: e.target.value }))} placeholder="e.g. Eucla Caravan Park" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as BookingType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Date From</Label>
                <Input type="date" value={form.dateFrom}
                  onChange={e => {
                    const df = e.target.value;
                    setForm(f => ({ ...f, dateFrom: df, nights: nightsBetween(df, f.dateTo) }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date To</Label>
                <Input type="date" value={form.dateTo}
                  onChange={e => {
                    const dt = e.target.value;
                    setForm(f => ({ ...f, dateTo: dt, nights: nightsBetween(f.dateFrom, dt) }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nights</Label>
                <Input type="number" min={1} value={form.nights} onChange={e => setForm(f => ({ ...f, nights: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Total Cost ($)</Label>
                <Input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmation Number</Label>
                <Input value={form.confirmationNumber} onChange={e => setForm(f => ({ ...f, confirmationNumber: e.target.value }))} placeholder="Ref #" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Location / Address</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Eucla WA 6443" />
              </div>
              <div className="space-y-1.5">
                <Label>Membership Used</Label>
                <Input value={form.membershipUsed} onChange={e => setForm(f => ({ ...f, membershipUsed: e.target.value }))} placeholder="e.g. CMCA, BIG4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Access notes, pet policy, dump point, power availability..." className="resize-none" />
            </div>

            <div className="border-t border-border/40 pt-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Site Links & References</p>

              <div className="space-y-1.5">
                <Label>Main Site URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.siteUrl ?? ""}
                    onChange={e => setForm(f => ({ ...f, siteUrl: e.target.value }))}
                    placeholder="https://park-website.com.au or paste booking URL"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" className="shrink-0 px-3"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text.trim()) setForm(f => ({ ...f, siteUrl: text.trim() }));
                      } catch { /* ignore */ }
                    }}
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 px-3"
                    onClick={() => startScan("siteUrl")}
                    title="Scan QR code"
                  >
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Scan a booking QR → URL goes to site link, plain text goes to confirmation number</p>
              </div>

              <div className="space-y-2">
                <Label>Additional Links</Label>
                {(form.links ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(form.links ?? []).map(l => (
                      <div key={l.id} className="flex items-center gap-1.5 text-xs bg-blue-500/8 border border-blue-500/20 text-blue-700 rounded-full pl-3 pr-1.5 py-0.5">
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="max-w-[160px] truncate">{l.label}</span>
                        <button onClick={() => removeLink(l.id)} className="hover:text-destructive ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} placeholder="Label" className="w-36 shrink-0" />
                  <Input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://..." className="flex-1"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                  />
                  <Button type="button" variant="outline" size="sm" className="shrink-0 px-3" onClick={pasteUrl} title="Paste URL">
                    <ClipboardPaste className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 px-3" onClick={() => startScan("linkUrl")} title="Scan QR">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 px-3" onClick={addLink}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reference Photos</Label>
                <p className="text-[10px] text-muted-foreground">Take a photo of a booking page, park sign, or QR code.</p>
                {(form.referencePhotos ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(form.referencePhotos ?? []).map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 text-xs bg-[#d9b880]/10 border border-[#d9b880]/30 text-[#b8943e] rounded-full pl-3 pr-1.5 py-0.5">
                        <Image className="h-3 w-3 shrink-0" />
                        <span className="max-w-[140px] truncate">{p.name}</span>
                        <button onClick={() => removePhoto(p.id)} className="hover:text-destructive ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
                    <Camera className="mr-1.5 h-3.5 w-3.5" /> Take Photo
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Image
                  </Button>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoCapture} />
                  {photoName && <span className="text-[10px] text-muted-foreground self-center">{photoName}</span>}
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Receipt / Payment Proof</p>
              {form.receiptData ? (
                <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-muted/20">
                  <Receipt className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{form.receiptName}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground"
                    onClick={() => setForm(f => ({ ...f, receiptData: undefined, receiptName: undefined }))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Receipt (max 5 MB)
                  </Button>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptUpload} />
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave}><Save className="mr-1.5 h-4 w-4" /> {initial ? "Update" : "Add Booking"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scanOpen} onOpenChange={v => { if (!v) stopScan(); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-primary" />
              Scan Booking QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="relative bg-black" style={{ aspectRatio: "1/1" }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                {(["top-left","top-right","bottom-left","bottom-right"] as const).map(c => (
                  <div key={c} className={`absolute w-6 h-6 border-[#d9b880] ${
                    c === "top-left" ? "top-0 left-0 border-t-2 border-l-2 rounded-tl" :
                    c === "top-right" ? "top-0 right-0 border-t-2 border-r-2 rounded-tr" :
                    c === "bottom-left" ? "bottom-0 left-0 border-b-2 border-l-2 rounded-bl" :
                    "bottom-0 right-0 border-b-2 border-r-2 rounded-br"
                  }`} />
                ))}
                <div className="absolute left-1 right-1 top-1/2 h-px bg-[#d9b880]/70 animate-pulse" />
              </div>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="px-4 py-3 space-y-2">
            {scanError
              ? <p className="text-xs text-destructive">{scanError}</p>
              : <p className="text-xs text-muted-foreground text-center">Point camera at a booking confirmation QR code</p>
            }
            <p className="text-[10px] text-muted-foreground text-center">
              {scanTarget === "siteUrl"
                ? "URL → main site link  ·  text → confirmation number"
                : "URL will be placed in the additional link URL field"}
            </p>
            <Button variant="outline" size="sm" className="w-full" onClick={stopScan}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
