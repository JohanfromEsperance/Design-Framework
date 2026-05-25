import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Pencil, Trash2, CalendarCheck, DollarSign,
  MapPin, Receipt, ExternalLink, Link2, AlertCircle, Image,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import BookingDialog from "@/components/booking-dialog";
import {
  type Booking,
  TYPE_LABELS, TYPE_COLORS,
  loadBookings, saveBookings, googleMapsUrl,
} from "@/lib/bookings-store";

interface BookingsTabProps {
  tripId: number;
}

export default function BookingsTab({ tripId }: BookingsTabProps) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings(tripId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const persist = (next: Booking[]) => {
    setBookings(next);
    saveBookings(tripId, next);
  };

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (b: Booking) => {
    setEditing(b);
    setDialogOpen(true);
  };

  const handleSave = (booking: Booking) => {
    const existing = bookings.findIndex(b => b.id === booking.id);
    if (existing >= 0) {
      const next = bookings.map(b => b.id === booking.id ? booking : b);
      persist(next);
      toast({ title: "Booking updated" });
    } else {
      persist([...bookings, booking]);
      toast({ title: "Booking added" });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this booking?")) return;
    persist(bookings.filter(b => b.id !== id));
    toast({ title: "Booking deleted" });
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Park & Site Bookings</h2>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Booking
        </Button>
      </div>

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

      {sorted.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="py-16 text-center">
            <CalendarCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No bookings yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add caravan parks, free camps, and station stays — or enter via the Planner leg</p>
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
            const linkCount = (b.links?.length ?? 0) + (b.siteUrl ? 1 : 0);
            const photoCount = b.referencePhotos?.length ?? 0;
            return (
              <Card key={b.id} className={cn("bg-card overflow-hidden transition-all", isPast ? "opacity-70" : "")}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  >
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full shrink-0", TYPE_COLORS[b.type])}>
                      {TYPE_LABELS[b.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{b.parkName}</p>
                      <div className="flex items-center gap-2">
                        {b.location && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />{b.location}
                          </p>
                        )}
                        {b.legLabel && (
                          <span className="text-[10px] text-muted-foreground/70 font-medium shrink-0">
                            {b.legLabel}
                          </span>
                        )}
                      </div>
                    </div>
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
                    <div className="text-right shrink-0 w-20">
                      <p className="text-sm font-bold text-foreground">${(b.cost || 0).toFixed(0)}</p>
                      {b.nights > 0 && b.cost > 0 && (
                        <p className="text-[10px] text-muted-foreground">${(b.cost / b.nights).toFixed(0)}/night</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {b.receiptData && <Receipt className="h-3.5 w-3.5 text-primary" />}
                      {linkCount > 0 && <Link2 className="h-3.5 w-3.5 text-blue-500" />}
                      {photoCount > 0 && <Image className="h-3.5 w-3.5 text-[#b8943e]" />}
                      {b.confirmationNumber && (
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          #{b.confirmationNumber}
                        </span>
                      )}
                    </div>
                  </div>

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
                        {b.legLabel && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Leg</p>
                            <p className="text-foreground">{b.legLabel}</p>
                          </div>
                        )}
                        {b.notes && (
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Notes</p>
                            <p className="text-foreground text-xs leading-relaxed">{b.notes}</p>
                          </div>
                        )}
                      </div>

                      {b.siteUrl && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Site URL</p>
                          <a href={b.siteUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline break-all">
                            <ExternalLink className="h-3 w-3 shrink-0" />{b.siteUrl}
                          </a>
                        </div>
                      )}

                      {b.links && b.links.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Saved Links</p>
                          <div className="flex flex-wrap gap-2">
                            {b.links.map(l => (
                              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs bg-blue-500/8 border border-blue-500/20 text-blue-700 rounded-full px-3 py-1 hover:bg-blue-500/15 transition-colors">
                                <Link2 className="h-3 w-3 shrink-0" />{l.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {b.referencePhotos && b.referencePhotos.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Reference Photos</p>
                          <div className="flex flex-wrap gap-2">
                            {b.referencePhotos.map(p => (
                              <a key={p.id} href={p.data} download={p.name}
                                className="flex items-center gap-1.5 text-xs bg-[#d9b880]/10 border border-[#d9b880]/30 text-[#b8943e] rounded-full px-3 py-1 hover:bg-[#d9b880]/20 transition-colors">
                                <Image className="h-3 w-3 shrink-0" />{p.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {b.receiptData && (
                        <div className="border border-border rounded-lg p-3 bg-card flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs text-foreground font-medium">{b.receiptName || "Receipt"}</span>
                          </div>
                          <a href={b.receiptData} download={b.receiptName || "receipt"} className="text-xs text-primary hover:underline">Download</a>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {b.location && (
                          <a href={googleMapsUrl(b.location)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
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

      <BookingDialog
        open={dialogOpen}
        initial={editing}
        onSave={handleSave}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
