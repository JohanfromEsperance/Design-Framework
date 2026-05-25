import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, CalendarCheck, Pencil, Trash2, ExternalLink, Link2, Receipt, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import BookingDialog from "@/components/booking-dialog";
import {
  type Booking, TYPE_LABELS, TYPE_COLORS,
  loadBookings, saveBookings, googleMapsUrl,
} from "@/lib/bookings-store";

interface LegBookingsPanelProps {
  tripId: number;
  legId: string;
  legLabel: string;
}

export default function LegBookingsPanel({ tripId, legId, legLabel }: LegBookingsPanelProps) {
  const { toast } = useToast();

  const allBookings = loadBookings(tripId);
  const legBookings = allBookings.filter(b => b.legId === legId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  const refresh = () => forceUpdate(n => n + 1);

  const handleSave = (booking: Booking) => {
    const all = loadBookings(tripId);
    const existing = all.findIndex(b => b.id === booking.id);
    if (existing >= 0) {
      all[existing] = booking;
    } else {
      all.push(booking);
    }
    saveBookings(tripId, all);
    refresh();
    toast({ title: editing ? "Booking updated" : "Booking added" });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this booking?")) return;
    const all = loadBookings(tripId).filter(b => b.id !== id);
    saveBookings(tripId, all);
    refresh();
    toast({ title: "Booking deleted" });
  };

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (b: Booking) => {
    setEditing(b);
    setDialogOpen(true);
  };

  const sorted = [...legBookings].sort((a, b) => {
    if (!a.dateFrom) return 1;
    if (!b.dateFrom) return -1;
    return a.dateFrom.localeCompare(b.dateFrom);
  });

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Leg Bookings</CardTitle>
            <Button size="sm" variant="outline" onClick={openAdd} className="h-7 px-2.5 text-xs gap-1.5">
              <Plus className="h-3 w-3" /> Add Booking
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <CalendarCheck className="h-6 w-6 mx-auto mb-2 opacity-30" />
              <p>No bookings for this leg yet</p>
              <p className="mt-0.5 opacity-70">Add caravan parks, free camps, station stays</p>
            </div>
          ) : (
            sorted.map(b => {
              const isExpanded = expandedId === b.id;
              const isPast = b.dateFrom && new Date(b.dateTo || b.dateFrom) < new Date();
              const linkCount = (b.links?.length ?? 0) + (b.siteUrl ? 1 : 0);
              const photoCount = b.referencePhotos?.length ?? 0;
              return (
                <div
                  key={b.id}
                  className={cn(
                    "border border-border rounded-lg overflow-hidden bg-card transition-all",
                    isPast && "opacity-70"
                  )}
                >
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  >
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", TYPE_COLORS[b.type])}>
                      {TYPE_LABELS[b.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">{b.parkName}</p>
                      {b.location && (
                        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />{b.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {b.dateFrom ? (
                        <>
                          <p className="text-[11px] font-medium text-foreground">
                            {new Date(b.dateFrom).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                            {b.dateTo && b.dateTo !== b.dateFrom && (
                              <> — {new Date(b.dateTo).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{b.nights} night{b.nights !== 1 ? "s" : ""}</p>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">No date</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 w-16">
                      <p className="text-xs font-bold">${(b.cost || 0).toFixed(0)}</p>
                      {b.nights > 0 && b.cost > 0 && (
                        <p className="text-[10px] text-muted-foreground">${(b.cost / b.nights).toFixed(0)}/night</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {b.receiptData && <Receipt className="h-3 w-3 text-primary" />}
                      {linkCount > 0 && <Link2 className="h-3 w-3 text-blue-500" />}
                      {photoCount > 0 && <Image className="h-3 w-3 text-[#b8943e]" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/50 px-3 py-3 space-y-3 bg-muted/10">
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        {b.confirmationNumber && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Confirmation #</p>
                            <p className="font-mono">{b.confirmationNumber}</p>
                          </div>
                        )}
                        {b.membershipUsed && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Membership</p>
                            <p>{b.membershipUsed}</p>
                          </div>
                        )}
                        {b.notes && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Notes</p>
                            <p className="leading-relaxed">{b.notes}</p>
                          </div>
                        )}
                      </div>

                      {b.siteUrl && (
                        <a href={b.siteUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline break-all">
                          <ExternalLink className="h-3 w-3 shrink-0" />{b.siteUrl}
                        </a>
                      )}

                      {b.links && b.links.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {b.links.map(l => (
                            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] bg-blue-500/8 border border-blue-500/20 text-blue-700 rounded-full px-2.5 py-0.5 hover:bg-blue-500/15 transition-colors">
                              <Link2 className="h-2.5 w-2.5 shrink-0" />{l.label}
                            </a>
                          ))}
                        </div>
                      )}

                      {b.referencePhotos && b.referencePhotos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {b.referencePhotos.map(p => (
                            <a key={p.id} href={p.data} download={p.name}
                              className="flex items-center gap-1 text-[11px] bg-[#d9b880]/10 border border-[#d9b880]/30 text-[#b8943e] rounded-full px-2.5 py-0.5 hover:bg-[#d9b880]/20 transition-colors">
                              <Image className="h-2.5 w-2.5 shrink-0" />{p.name}
                            </a>
                          ))}
                        </div>
                      )}

                      {b.location && (
                        <a href={googleMapsUrl(b.location)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> View on Google Maps
                        </a>
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(b)}>
                          <Pencil className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDelete(b.id)}>
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <BookingDialog
        open={dialogOpen}
        initial={editing}
        defaultLegId={legId}
        defaultLegLabel={legLabel}
        onSave={handleSave}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
