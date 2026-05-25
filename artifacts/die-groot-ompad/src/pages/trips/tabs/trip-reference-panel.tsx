import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Link2, Receipt, CalendarCheck, Image,
  ExternalLink, ChevronDown, ChevronRight, Save,
  CheckCircle2, Clock, AlertCircle, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadAdvanceBookings, bookingStatus, outstandingAmount,
  ADV_TYPE_LABELS, ADV_TYPE_COLORS,
} from "@/lib/advance-bookings-store";
import type { Booking } from "./bookings-tab";

const STORAGE_KEY = (tripId: number) => `bookings_trip_${tripId}`;
const NOTES_KEY = (tripId: number) => `trip_notes_${tripId}`;

function loadSiteBookings(tripId: number): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(tripId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadNotes(tripId: number): string {
  return localStorage.getItem(NOTES_KEY(tripId)) ?? "";
}

function saveNotes(tripId: number, text: string) {
  localStorage.setItem(NOTES_KEY(tripId), text);
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, count, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-primary shrink-0">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-foreground flex-1">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] font-semibold bg-primary/10 text-primary rounded-full px-2 py-0.5 mr-1">{count}</span>
        )}
        {open
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="px-3 py-3 space-y-2">{children}</div>}
    </div>
  );
}

interface TripReferencePanelProps {
  open: boolean;
  onClose: () => void;
  tripId: number;
  tripName: string;
}

export default function TripReferencePanel({ open, onClose, tripId, tripName }: TripReferencePanelProps) {
  const [notes, setNotes] = useState(() => loadNotes(tripId));
  const [notesDirty, setNotesDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotesChange = (text: string) => {
    setNotes(text);
    setNotesDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotes(tripId, text);
      setNotesDirty(false);
    }, 1200);
  };

  const saveNow = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveNotes(tripId, notes);
    setNotesDirty(false);
  };

  const siteBookings = loadSiteBookings(tripId);
  const allAdvBookings = loadAdvanceBookings();
  const advBookings = allAdvBookings.filter(b =>
    b.tripName && b.tripName.toLowerCase() === tripName.toLowerCase()
  );

  const allLinks: Array<{ label: string; url: string; from: string }> = [];
  for (const b of siteBookings) {
    if (b.siteUrl) allLinks.push({ label: b.parkName, url: b.siteUrl, from: b.parkName });
    for (const l of b.links ?? []) allLinks.push({ label: l.label, url: l.url, from: b.parkName });
  }
  for (const b of advBookings) {
    if (b.siteUrl) allLinks.push({ label: b.name, url: b.siteUrl, from: b.name });
  }

  const receipts: Array<{ name: string; data: string; from: string }> = [];
  for (const b of siteBookings) {
    if (b.receiptData) receipts.push({ name: b.receiptName ?? "Receipt", data: b.receiptData, from: b.parkName });
    for (const p of b.referencePhotos ?? []) receipts.push({ name: p.name, data: p.data, from: b.parkName });
  }
  for (const b of advBookings) {
    if (b.receiptData) receipts.push({ name: b.receiptName ?? "Receipt", data: b.receiptData, from: b.name });
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[440px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-4 py-3 border-b border-border bg-card shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            Trip Reference — {tripName}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-3">

            {/* ── Trip Notes ── */}
            <Section title="Trip Notes" icon={<FileText className="h-3.5 w-3.5" />} defaultOpen>
              <Textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Freeform notes about this trip — planning reminders, contacts, fuel stops, must-see spots..."
                rows={5}
                className="resize-none text-xs bg-card"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {notesDirty ? "Unsaved changes..." : "Auto-saved"}
                </span>
                {notesDirty && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={saveNow}>
                    <Save className="h-3 w-3 mr-1" /> Save now
                  </Button>
                )}
              </div>
            </Section>

            {/* ── Site Bookings ── */}
            <Section title="Site Bookings" icon={<CalendarCheck className="h-3.5 w-3.5" />} count={siteBookings.length} defaultOpen={siteBookings.length > 0}>
              {siteBookings.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No site bookings recorded — add them on the Bookings tab.</p>
              ) : (
                [...siteBookings]
                  .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))
                  .map(b => (
                    <div key={b.id} className="border border-border/40 rounded-lg p-2.5 space-y-1 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{b.parkName}</p>
                          {b.dateFrom && (
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(b.dateFrom).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                              {b.dateTo && b.dateTo !== b.dateFrom ? ` — ${new Date(b.dateTo).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
                              {" · "}{b.nights} night{b.nights !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-foreground shrink-0">${(b.cost || 0).toFixed(0)}</span>
                      </div>
                      {b.confirmationNumber && (
                        <p className="text-[10px] font-mono text-muted-foreground">Conf: {b.confirmationNumber}</p>
                      )}
                      {b.notes && <p className="text-[10px] text-muted-foreground leading-relaxed">{b.notes}</p>}
                      {b.siteUrl && (
                        <a href={b.siteUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                          <ExternalLink className="h-2.5 w-2.5" /> {b.siteUrl.replace(/^https?:\/\//, "").slice(0, 50)}
                        </a>
                      )}
                    </div>
                  ))
              )}
            </Section>

            {/* ── Advance Bookings ── */}
            <Section title="Advance Bookings" icon={<AlertCircle className="h-3.5 w-3.5" />} count={advBookings.length} defaultOpen={advBookings.length > 0}>
              {advBookings.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No advance bookings tagged to "{tripName}".</p>
              ) : (
                advBookings.map(b => {
                  const st = bookingStatus(b);
                  const owed = outstandingAmount(b);
                  return (
                    <div key={b.id} className={cn(
                      "border rounded-lg p-2.5 space-y-1",
                      st === "paid" ? "border-primary/20 bg-primary/4"
                        : st === "partial" ? "border-[#d9b880]/30 bg-[#d9b880]/6"
                        : "border-destructive/20 bg-destructive/4"
                    )}>
                      <div className="flex items-center gap-2">
                        {st === "paid"
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          : st === "partial"
                          ? <Clock className="h-3.5 w-3.5 text-[#b8943e] shrink-0" />
                          : <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{b.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            <span className={cn("font-medium px-1.5 py-0.5 rounded-full text-[9px] border mr-1.5", ADV_TYPE_COLORS[b.type])}>
                              {ADV_TYPE_LABELS[b.type]}
                            </span>
                            {b.stayDate && new Date(b.stayDate + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-foreground">${b.cost.toLocaleString("en-AU", { maximumFractionDigits: 0 })}</p>
                          {owed > 0 && <p className="text-[10px] text-destructive">${owed.toLocaleString("en-AU", { maximumFractionDigits: 0 })} owed</p>}
                        </div>
                      </div>
                      {b.confirmationNumber && (
                        <p className="text-[10px] font-mono text-muted-foreground">Conf: {b.confirmationNumber}</p>
                      )}
                      {b.notes && <p className="text-[10px] text-muted-foreground">{b.notes}</p>}
                      {b.siteUrl && (
                        <a href={b.siteUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                          <ExternalLink className="h-2.5 w-2.5" /> {b.siteUrl.replace(/^https?:\/\//, "").slice(0, 50)}
                        </a>
                      )}
                      {b.receiptOcrText && (
                        <details className="text-[10px] text-muted-foreground">
                          <summary className="cursor-pointer text-primary font-medium">OCR text</summary>
                          <p className="mt-1 leading-relaxed whitespace-pre-wrap font-mono bg-muted/30 rounded p-1.5">{b.receiptOcrText}</p>
                        </details>
                      )}
                    </div>
                  );
                })
              )}
            </Section>

            {/* ── Links ── */}
            <Section title="All Links" icon={<Link2 className="h-3.5 w-3.5" />} count={allLinks.length} defaultOpen={allLinks.length > 0}>
              {allLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No links saved yet — add URLs in the Bookings tab.</p>
              ) : (
                allLinks.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-border/30 last:border-0">
                    <Link2 className="h-3 w-3 mt-0.5 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground">{l.from}</p>
                      <a href={l.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline break-all leading-snug">
                        {l.label !== l.from ? `${l.label} — ` : ""}{l.url.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                    </a>
                  </div>
                ))
              )}
            </Section>

            {/* ── Receipts & Photos ── */}
            <Section title="Receipts & Photos" icon={<Receipt className="h-3.5 w-3.5" />} count={receipts.length} defaultOpen={receipts.length > 0}>
              {receipts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No receipts or reference photos saved yet.</p>
              ) : (
                receipts.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                    {r.data.startsWith("data:image") ? (
                      <Image className="h-3.5 w-3.5 text-[#b8943e] shrink-0" />
                    ) : (
                      <Receipt className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground">{r.from}</p>
                      <p className="text-xs text-foreground truncate">{r.name}</p>
                    </div>
                    <a href={r.data} download={r.name}
                      className="text-[10px] text-primary hover:underline shrink-0">Download</a>
                  </div>
                ))
              )}
            </Section>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
