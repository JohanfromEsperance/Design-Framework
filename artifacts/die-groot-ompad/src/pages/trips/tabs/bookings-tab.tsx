import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus, Pencil, Trash2, Save, CalendarCheck, DollarSign,
  MapPin, Receipt, ExternalLink, Upload, X, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BookingsTabProps {
  tripId: number;
}

type BookingType = "free_camp" | "national_park" | "caravan_park" | "holiday_park" | "station_stay" | "bush_camp" | "rest_area";

interface Booking {
  id: string;
  parkName: string;
  type: BookingType;
  dateFrom: string;
  dateTo: string;
  nights: number;
  cost: number;
  confirmationNumber: string;
  membershipUsed: string;
  location: string;
  notes: string;
  receiptName?: string;
  receiptData?: string;
}

const TYPE_LABELS: Record<BookingType, string> = {
  free_camp: "Free Camp",
  national_park: "National Park",
  caravan_park: "Caravan Park",
  holiday_park: "Holiday Park",
  station_stay: "Station Stay",
  bush_camp: "Bush Camp",
  rest_area: "Rest Area",
};

const TYPE_COLORS: Record<BookingType, string> = {
  free_camp: "bg-primary/10 text-primary",
  national_park: "bg-emerald-600/10 text-emerald-700",
  caravan_park: "bg-[#d9b880]/20 text-[#b8943e]",
  holiday_park: "bg-blue-500/10 text-blue-700",
  station_stay: "bg-orange-500/10 text-orange-700",
  bush_camp: "bg-lime-600/10 text-lime-700",
  rest_area: "bg-muted text-muted-foreground",
};

const STORAGE_KEY = (tripId: number) => `bookings_trip_${tripId}`;

const EMPTY_BOOKING: Omit<Booking, "id"> = {
  parkName: "",
  type: "caravan_park",
  dateFrom: "",
  dateTo: "",
  nights: 1,
  cost: 0,
  confirmationNumber: "",
  membershipUsed: "",
  location: "",
  notes: "",
};

function loadBookings(tripId: number): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(tripId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBookings(tripId: number, bookings: Booking[]) {
  localStorage.setItem(STORAGE_KEY(tripId), JSON.stringify(bookings));
}

function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 1;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function googleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location + ", Australia")}`;
}

export default function BookingsTab({ tripId }: BookingsTabProps) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings(tripId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Booking, "id">>(EMPTY_BOOKING);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = (next: Booking[]) => {
    setBookings(next);
    saveBookings(tripId, next);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_BOOKING);
    setDialogOpen(true);
  };

  const openEdit = (b: Booking) => {
    setEditingId(b.id);
    const { id: _id, ...rest } = b;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.parkName.trim()) {
      toast({ title: "Park name is required", variant: "destructive" });
      return;
    }
    if (editingId) {
      persist(bookings.map(b => b.id === editingId ? { ...form, id: editingId } : b));
      toast({ title: "Booking updated" });
    } else {
      const newB: Booking = { ...form, id: crypto.randomUUID() };
      persist([...bookings, newB]);
      toast({ title: "Booking added" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this booking?")) return;
    persist(bookings.filter(b => b.id !== id));
    toast({ title: "Booking deleted" });
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

  const sorted = [...bookings].sort((a, b) => {
    if (!a.dateFrom) return 1;
    if (!b.dateFrom) return -1;
    return a.dateFrom.localeCompare(b.dateFrom);
  });

  const totalCost = bookings.reduce((s, b) => s + (b.cost || 0), 0);
  const totalNights = bookings.reduce((s, b) => s + (b.nights || 0), 0);
  const upcoming = bookings.filter(b => b.dateFrom && new Date(b.dateFrom) >= new Date()).length;

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Park & Site Bookings</h2>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Booking
        </Button>
      </div>

      {/* Summary strip */}
      {bookings.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Bookings", value: bookings.length.toString(), icon: CalendarCheck, color: "text-primary" },
            { label: "Total Nights", value: totalNights.toString(), icon: MapPin, color: "text-[#b8943e]" },
            { label: "Total Paid", value: `$${totalCost.toFixed(0)}`, icon: DollarSign, color: "text-foreground" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                <div className="flex items-center justify-between">
                  <span className={cn("text-2xl font-bold", color)}>{value}</span>
                  <Icon className={cn("h-5 w-5 opacity-50", color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {upcoming > 0 && (
        <div className="flex items-center gap-2 bg-[#d9b880]/10 border border-[#d9b880]/30 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 text-[#b8943e] shrink-0" />
          <span className="text-[#b8943e] font-medium">{upcoming} upcoming booking{upcoming !== 1 ? "s" : ""} — confirm before you arrive</span>
        </div>
      )}

      {/* Booking list */}
      {sorted.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="py-16 text-center">
            <CalendarCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No bookings yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add caravan parks, free camps, and station stays</p>
            <Button className="mt-4" size="sm" onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> Add First Booking
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(b => {
            const isExpanded = expandedId === b.id;
            const isPast = b.dateFrom && new Date(b.dateTo || b.dateFrom) < new Date();
            return (
              <Card key={b.id} className={cn("bg-card overflow-hidden transition-all", isPast ? "opacity-70" : "")}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  >
                    {/* Type badge */}
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full shrink-0", TYPE_COLORS[b.type])}>
                      {TYPE_LABELS[b.type]}
                    </span>

                    {/* Park name + location */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{b.parkName}</p>
                      {b.location && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />{b.location}
                        </p>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="text-right shrink-0">
                      {b.dateFrom ? (
                        <>
                          <p className="text-xs font-medium text-foreground">
                            {new Date(b.dateFrom).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                            {b.dateTo && b.dateTo !== b.dateFrom && (
                              <> — {new Date(b.dateTo).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{b.nights} night{b.nights !== 1 ? "s" : ""}</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No date</p>
                      )}
                    </div>

                    {/* Cost */}
                    <div className="text-right shrink-0 w-20">
                      <p className="text-sm font-bold text-foreground">${(b.cost || 0).toFixed(0)}</p>
                      {b.nights > 0 && b.cost > 0 && (
                        <p className="text-[10px] text-muted-foreground">${(b.cost / b.nights).toFixed(0)}/night</p>
                      )}
                    </div>

                    {/* Indicators */}
                    <div className="flex items-center gap-2 shrink-0">
                      {b.receiptData && <Receipt className="h-4 w-4 text-primary" title="Receipt attached" />}
                      {b.confirmationNumber && (
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          #{b.confirmationNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border/50 px-5 py-4 space-y-4 bg-muted/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {b.confirmationNumber && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Confirmation #</p>
                            <p className="font-mono text-foreground">{b.confirmationNumber}</p>
                          </div>
                        )}
                        {b.membershipUsed && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Membership Used</p>
                            <p className="text-foreground">{b.membershipUsed}</p>
                          </div>
                        )}
                        {b.notes && (
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Notes</p>
                            <p className="text-foreground text-xs leading-relaxed">{b.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Receipt preview */}
                      {b.receiptData && (
                        <div className="border border-border rounded-lg p-3 bg-card flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs text-foreground font-medium">{b.receiptName || "Receipt"}</span>
                          </div>
                          <a
                            href={b.receiptData}
                            download={b.receiptName || "receipt"}
                            className="text-xs text-primary hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {b.location && (
                          <a
                            href={googleMapsUrl(b.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> View on Google Maps
                          </a>
                        )}
                        <div className="flex-1" />
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(b)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Booking" : "Add Booking"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
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
                    const nights = nightsBetween(df, form.dateTo);
                    setForm(f => ({ ...f, dateFrom: df, nights }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date To</Label>
                <Input type="date" value={form.dateTo}
                  onChange={e => {
                    const dt = e.target.value;
                    const nights = nightsBetween(form.dateFrom, dt);
                    setForm(f => ({ ...f, dateTo: dt, nights }));
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
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Access notes, pet policy, dump point, power availability..." className="resize-none" />
            </div>

            {/* Receipt upload */}
            <div className="space-y-2">
              <Label>Receipt / Payment Proof</Label>
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}><Save className="mr-1.5 h-4 w-4" /> {editingId ? "Update" : "Add Booking"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
