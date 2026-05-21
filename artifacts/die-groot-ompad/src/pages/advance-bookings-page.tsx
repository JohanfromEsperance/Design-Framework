import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Save, CalendarCheck, DollarSign,
  AlertCircle, CheckCircle2, Clock, TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AdvanceBooking, AdvBookingType, ADV_TYPE_LABELS, ADV_TYPE_COLORS,
  bookingStatus, outstandingAmount,
  loadAdvanceBookings, saveAdvanceBookings,
} from "@/lib/advance-bookings-store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";

const EMPTY: Omit<AdvanceBooking, "id"> = {
  name: "", type: "caravan_park", stayDate: "", checkoutDate: "",
  cost: 0, amountPaid: 0, confirmationNumber: "", tripName: "", notes: "",
};

const STATUS_FILTERS = ["all", "outstanding", "partial", "paid"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_COLORS = {
  paid:        { border: "border-primary/30",       bg: "bg-primary/5",       badge: "bg-primary/10 text-primary",           icon: <CheckCircle2 className="h-4 w-4 text-primary" /> },
  partial:     { border: "border-[#d9b880]/50",     bg: "bg-[#d9b880]/8",     badge: "bg-[#d9b880]/20 text-[#b8943e]",       icon: <Clock className="h-4 w-4 text-[#b8943e]" /> },
  outstanding: { border: "border-destructive/40",   bg: "bg-destructive/5",   badge: "bg-destructive/10 text-destructive",    icon: <AlertCircle className="h-4 w-4 text-destructive" /> },
};

function fmtAud(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  if (!s) return "";
  return new Date(s + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
}

export default function AdvanceBookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<AdvanceBooking[]>(loadAdvanceBookings);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<AdvanceBooking, "id">>(EMPTY);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const persist = (next: AdvanceBooking[]) => {
    setBookings(next);
    saveAdvanceBookings(next);
  };

  const openAdd = () => { setEditingId(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (b: AdvanceBooking) => {
    setEditingId(b.id);
    const { id: _id, ...rest } = b;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Booking name is required", variant: "destructive" });
      return;
    }
    if (editingId) {
      persist(bookings.map(b => b.id === editingId ? { ...form, id: editingId } : b));
      toast({ title: "Booking updated" });
    } else {
      persist([...bookings, { ...form, id: crypto.randomUUID() }]);
      toast({ title: "Booking added" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remove this advance booking?")) return;
    persist(bookings.filter(b => b.id !== id));
    toast({ title: "Booking removed" });
  };

  const sorted = useMemo(() =>
    [...bookings].sort((a, b) => {
      if (!a.stayDate) return 1;
      if (!b.stayDate) return -1;
      return a.stayDate.localeCompare(b.stayDate);
    }),
    [bookings]
  );

  const filtered = useMemo(() =>
    statusFilter === "all" ? sorted : sorted.filter(b => bookingStatus(b) === statusFilter),
    [sorted, statusFilter]
  );

  const totalCost       = bookings.reduce((s, b) => s + (b.cost || 0), 0);
  const totalPaid       = bookings.reduce((s, b) => s + Math.min(b.amountPaid || 0, b.cost || 0), 0);
  const totalOutstanding = bookings.reduce((s, b) => s + outstandingAmount(b), 0);
  const countOutstanding = bookings.filter(b => bookingStatus(b) === "outstanding").length;
  const countPartial     = bookings.filter(b => bookingStatus(b) === "partial").length;

  const chartData = useMemo(() => {
    const byMonth: Record<string, { label: string; paid: number; partial: number; outstanding: number }> = {};
    for (const b of sorted) {
      if (!b.stayDate) continue;
      const d = new Date(b.stayDate + "T12:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
      if (!byMonth[key]) byMonth[key] = { label, paid: 0, partial: 0, outstanding: 0 };
      const st = bookingStatus(b);
      if (st === "paid")        byMonth[key].paid        += b.cost;
      else if (st === "partial") byMonth[key].partial     += b.cost;
      else                       byMonth[key].outstanding += b.cost;
    }
    return Object.values(byMonth);
  }, [sorted]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Advance Bookings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Future bookings requiring payment up to 12 months ahead — ferries, national parks, popular parks
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" /> Add Booking
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Bookings",  value: bookings.length.toString(), color: "text-foreground", icon: <CalendarCheck className="h-4 w-4" /> },
          { label: "Total Committed", value: fmtAud(totalCost),          color: "text-foreground", icon: <DollarSign className="h-4 w-4" /> },
          { label: "Total Paid",      value: fmtAud(totalPaid),          color: "text-primary",    icon: <CheckCircle2 className="h-4 w-4" /> },
          { label: "Outstanding",     value: fmtAud(totalOutstanding),   color: totalOutstanding > 0 ? "text-destructive" : "text-muted-foreground", icon: <AlertCircle className="h-4 w-4" /> },
        ].map(({ label, value, color, icon }) => (
          <Card key={label} className="bg-card">
            <CardContent className="pt-3 pb-3 px-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <div className="flex items-center justify-between gap-1">
                <span className={cn("text-lg font-bold truncate", color)}>{value}</span>
                <span className={cn("shrink-0 opacity-40", color)}>{icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert banner */}
      {(countOutstanding > 0 || countPartial > 0) && (
        <div className="flex items-start gap-2.5 bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive font-medium">
            {countOutstanding > 0 && `${countOutstanding} booking${countOutstanding !== 1 ? "s" : ""} with nothing paid`}
            {countOutstanding > 0 && countPartial > 0 && " · "}
            {countPartial > 0 && `${countPartial} partially paid`}
            {" — confirm and pay before departure dates"}
          </p>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5" /> Advance Booking Spend by Month
            </p>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={38} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 10, borderRadius: 6 }}
                    formatter={(v: number, name: string) => [
                      v.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }),
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="paid"        name="Paid"        stackId="s" fill="#1f6f5f" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="partial"     name="Partial"     stackId="s" fill="#d9b880" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outstanding" name="Outstanding" stackId="s" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => {
          const count = f === "all" ? bookings.length : bookings.filter(b => bookingStatus(b) === f).length;
          return (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                statusFilter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Booking list */}
      {filtered.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="py-14 text-center">
            <CalendarCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No bookings yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Record ferries, national parks, and advance-pay sites</p>
            <Button className="mt-4" size="sm" onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> Add First Booking
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => {
            const st = bookingStatus(b);
            const sc = STATUS_COLORS[st];
            const nights = nightsBetween(b.stayDate, b.checkoutDate);
            const isPast = b.stayDate && new Date(b.stayDate + "T12:00:00") < new Date();
            const isExpanded = expandedId === b.id;

            return (
              <Card key={b.id} className={cn("bg-card overflow-hidden border", sc.border, sc.bg, isPast && "opacity-60")}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  >
                    {/* Status icon */}
                    <div className="shrink-0">{sc.icon}</div>

                    {/* Type badge */}
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 hidden sm:inline", ADV_TYPE_COLORS[b.type])}>
                      {ADV_TYPE_LABELS[b.type]}
                    </span>

                    {/* Name + trip */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{b.name}</p>
                      {b.tripName && (
                        <p className="text-[10px] text-muted-foreground truncate">Trip: {b.tripName}</p>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-xs font-medium text-foreground">{fmtDate(b.stayDate)}</p>
                      {nights > 0 && <p className="text-[10px] text-muted-foreground">{nights} night{nights !== 1 ? "s" : ""}</p>}
                    </div>

                    {/* Cost */}
                    <div className="text-right shrink-0 min-w-[72px]">
                      <p className="text-sm font-bold text-foreground">{fmtAud(b.cost)}</p>
                      {b.amountPaid > 0 && b.amountPaid < b.cost && (
                        <p className="text-[10px] text-destructive">{fmtAud(outstandingAmount(b))} owed</p>
                      )}
                      {b.amountPaid >= b.cost && b.cost > 0 && (
                        <p className="text-[10px] text-primary">Paid</p>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/40 px-4 py-3 space-y-3 bg-muted/10">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Stay Date</p>
                          <p>{fmtDate(b.stayDate) || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Checkout</p>
                          <p>{fmtDate(b.checkoutDate) || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Amount Paid</p>
                          <p className="font-medium">{fmtAud(b.amountPaid)} <span className="text-muted-foreground">of {fmtAud(b.cost)}</span></p>
                        </div>
                        {b.confirmationNumber && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Confirmation #</p>
                            <p className="font-mono">{b.confirmationNumber}</p>
                          </div>
                        )}
                        {b.tripName && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Trip</p>
                            <p>{b.tripName}</p>
                          </div>
                        )}
                        {b.notes && (
                          <div className="col-span-2 sm:col-span-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Notes</p>
                            <p className="leading-relaxed text-foreground">{b.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(b)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Advance Booking" : "Add Advance Booking"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Venue / Park Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Spirit of Tasmania, Wilsons Prom NP" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as AdvBookingType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ADV_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trip Name (optional)</Label>
                <Input value={form.tripName} onChange={e => setForm(f => ({ ...f, tripName: e.target.value }))} placeholder="e.g. East Coast Run" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Arrival / Stay Date</Label>
                <Input type="date" value={form.stayDate} onChange={e => setForm(f => ({ ...f, stayDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Checkout Date</Label>
                <Input type="date" value={form.checkoutDate} onChange={e => setForm(f => ({ ...f, checkoutDate: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Total Cost ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.cost || ""} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Amount Paid ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.amountPaid || ""} onChange={e => setForm(f => ({ ...f, amountPaid: Number(e.target.value) }))} placeholder="0" />
              </div>
            </div>

            {form.cost > 0 && (
              <div className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-between",
                form.amountPaid >= form.cost ? "bg-primary/8 text-primary border border-primary/20" :
                form.amountPaid > 0 ? "bg-[#d9b880]/15 text-[#b8943e] border border-[#d9b880]/30" :
                "bg-destructive/8 text-destructive border border-destructive/20"
              )}>
                <span>{form.amountPaid >= form.cost ? "Fully paid" : form.amountPaid > 0 ? "Partial payment" : "Nothing paid yet"}</span>
                <span className="font-bold">
                  {form.amountPaid < form.cost ? `${fmtAud(form.cost - form.amountPaid)} outstanding` : ""}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Confirmation Number</Label>
              <Input value={form.confirmationNumber} onChange={e => setForm(f => ({ ...f, confirmationNumber: e.target.value }))} placeholder="Ref / booking #" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Access details, pet policy, cancellation terms..." className="resize-none" />
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
