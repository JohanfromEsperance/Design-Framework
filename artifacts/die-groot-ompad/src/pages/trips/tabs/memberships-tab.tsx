import { useState } from "react";
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
  Plus, Pencil, Trash2, Save, Award, ExternalLink,
  AlertTriangle, CheckCircle, CreditCard, Tag, Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "memberships_rig_v1";

type MemberCategory = "roadside" | "parks" | "camping" | "fuel" | "rewards" | "other";

interface Membership {
  id: string;
  org: string;
  category: MemberCategory;
  memberNumber: string;
  expiryDate: string;
  annualCost: number;
  benefits: string;
  website: string;
  promoCodes: string;
  discountNotes: string;
  pin: string;
}

const CAT_LABELS: Record<MemberCategory, string> = {
  roadside: "Roadside Assist",
  parks: "Holiday Parks",
  camping: "Camping Clubs",
  fuel: "Fuel Discounts",
  rewards: "Rewards / Loyalty",
  other: "Other",
};

const CAT_COLORS: Record<MemberCategory, string> = {
  roadside: "bg-destructive/10 text-destructive border-destructive/20",
  parks: "bg-[#d9b880]/15 text-[#b8943e] border-[#d9b880]/30",
  camping: "bg-primary/10 text-primary border-primary/20",
  fuel: "bg-orange-500/10 text-orange-700 border-orange-200",
  rewards: "bg-purple-500/10 text-purple-700 border-purple-200",
  other: "bg-muted text-muted-foreground border-border",
};

const DEFAULT_MEMBERSHIPS: Membership[] = [
  {
    id: "cmca", org: "CMCA — Campervan & Motorhome Club", category: "camping",
    memberNumber: "", expiryDate: "", annualCost: 170, pin: "",
    benefits: "Campsite discounts at 200+ sites, monthly magazine, rally access, 24/7 emergency contact",
    website: "cmca.com.au", promoCodes: "", discountNotes: "10–20% off at CMCA parks and many independent sites",
  },
  {
    id: "nrma", org: "NRMA Motoring (NSW / ACT)", category: "roadside",
    memberNumber: "", expiryDate: "", annualCost: 110, pin: "",
    benefits: "Roadside assist, free towing, battery replacement, lockout service, travel discounts",
    website: "nrma.com.au", promoCodes: "", discountNotes: "Towing covers tow vehicle only — check caravan coverage add-on",
  },
  {
    id: "racq", org: "RACQ (Queensland)", category: "roadside",
    memberNumber: "", expiryDate: "", annualCost: 100, pin: "",
    benefits: "Roadside assist, accommodation discounts, travel insurance partnership",
    website: "racq.com.au", promoCodes: "", discountNotes: "Member discounts at Coral Sea Resort, QLD national parks",
  },
  {
    id: "raa", org: "RAA (South Australia)", category: "roadside",
    memberNumber: "", expiryDate: "", annualCost: 100, pin: "",
    benefits: "Roadside assist, RAA Insurance discounts, travel planning",
    website: "raa.com.au", promoCodes: "", discountNotes: "Nullarbor-specific maps available from RAA member centres",
  },
  {
    id: "rac", org: "RAC (Western Australia)", category: "roadside",
    memberNumber: "", expiryDate: "", annualCost: 105, pin: "",
    benefits: "Roadside assist, remote outback coverage, travel guides",
    website: "rac.com.au", promoCodes: "", discountNotes: "Extended outback coverage important for Gibb River Rd / Nullarbor",
  },
  {
    id: "big4", org: "BIG4 Holiday Parks", category: "parks",
    memberNumber: "", expiryDate: "", annualCost: 0, pin: "",
    benefits: "10% off powered sites at 180+ BIG4 parks nationwide",
    website: "big4.com.au", promoCodes: "", discountNotes: "Free to join via app. Also includes fuel discounts at BP.",
  },
  {
    id: "discovery", org: "Discovery Parks Rewards", category: "parks",
    memberNumber: "", expiryDate: "", annualCost: 0, pin: "",
    benefits: "10% off stays + earn points redeemable for free nights",
    website: "discoveryholidayparks.com.au", promoCodes: "", discountNotes: "Free program. Useful in WA and SA remote locations.",
  },
  {
    id: "top_parks", org: "Top Parks Loyalty", category: "parks",
    memberNumber: "", expiryDate: "", annualCost: 0, pin: "",
    benefits: "Discount stays across 300+ independent parks",
    website: "topparks.com.au", promoCodes: "", discountNotes: "Free loyalty program. Book direct for best rates.",
  },
  {
    id: "wikicamps", org: "WikiCamps Australia", category: "camping",
    memberNumber: "", expiryDate: "", annualCost: 5, pin: "",
    benefits: "100k+ campsite database with GPS, reviews, photos, dump points, water",
    website: "wikicamps.com.au", promoCodes: "", discountNotes: "One-off in-app purchase. Essential for free camping research.",
  },
  {
    id: "hema", org: "Hema Explorer / Maps", category: "camping",
    memberNumber: "", expiryDate: "", annualCost: 50, pin: "",
    benefits: "Offline 4WD maps, remote tracks, satellite imagery, free camps",
    website: "hema.com.au", promoCodes: "", discountNotes: "Annual subscription. Covers areas where mobile data is unavailable.",
  },
];

const EMPTY_FORM: Omit<Membership, "id"> = {
  org: "", category: "other", memberNumber: "", expiryDate: "",
  annualCost: 0, benefits: "", website: "", promoCodes: "", discountNotes: "", pin: "",
};

function loadMemberships(): Membership[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MEMBERSHIPS;
    const saved = JSON.parse(raw) as Membership[];
    const savedMap = new Map(saved.map(m => [m.id, m]));
    const merged = DEFAULT_MEMBERSHIPS.map(d => savedMap.has(d.id) ? { ...d, ...savedMap.get(d.id)! } : d);
    const custom = saved.filter(m => !DEFAULT_MEMBERSHIPS.find(d => d.id === m.id));
    return [...merged, ...custom];
  } catch { return DEFAULT_MEMBERSHIPS; }
}

function saveMemberships(items: Membership[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function expiryBadge(dateStr: string) {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  if (days < 0) return { label: "EXPIRED", color: "text-destructive bg-destructive/10" };
  if (days <= 30) return { label: `${days}d`, color: "text-destructive bg-destructive/10" };
  if (days <= 90) return { label: `${days}d`, color: "text-[#b8943e] bg-[#d9b880]/15" };
  return { label: new Date(dateStr).toLocaleDateString("en-AU", { month: "short", year: "numeric" }), color: "text-primary bg-primary/10" };
}

const CAT_FILTERS: Array<MemberCategory | "all"> = ["all", "roadside", "parks", "camping", "fuel", "rewards", "other"];

export default function MembershipsTab() {
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<Membership[]>(loadMemberships);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Membership, "id">>(EMPTY_FORM);
  const [categoryFilter, setCategoryFilter] = useState<MemberCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const persist = (next: Membership[]) => {
    setMemberships(next);
    saveMemberships(next);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (m: Membership) => {
    setEditingId(m.id);
    const { id: _id, ...rest } = m;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.org.trim()) {
      toast({ title: "Organisation name required", variant: "destructive" });
      return;
    }
    if (editingId) {
      persist(memberships.map(m => m.id === editingId ? { ...form, id: editingId } : m));
      toast({ title: "Membership updated" });
    } else {
      persist([...memberships, { ...form, id: crypto.randomUUID() }]);
      toast({ title: "Membership added" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remove this membership?")) return;
    persist(memberships.filter(m => m.id !== id));
    toast({ title: "Membership removed" });
  };

  const filtered = categoryFilter === "all" ? memberships : memberships.filter(m => m.category === categoryFilter);
  const alerts = memberships.filter(m => m.expiryDate && daysUntil(m.expiryDate) <= 90);
  const totalAnnualCost = memberships.reduce((s, m) => s + (m.annualCost || 0), 0);

  return (
    <div className="space-y-6 pb-8">

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Memberships, Rewards & Discounts</h2>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Membership
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total Memberships</p>
            <span className="text-2xl font-bold text-foreground">{memberships.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Annual Cost</p>
            <span className="text-2xl font-bold text-[#b8943e]">${totalAnnualCost}/yr</span>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Expiring Soon</p>
            <span className={cn("text-2xl font-bold", alerts.length > 0 ? "text-destructive" : "text-primary")}>
              {alerts.length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Expiry alerts */}
      {alerts.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wide text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Renewal Alerts
          </p>
          {alerts.map(m => {
            const badge = expiryBadge(m.expiryDate)!;
            return (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{m.org}</span>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", badge.color)}>{badge.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CAT_FILTERS.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
              categoryFilter === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {cat === "all" ? "All" : CAT_LABELS[cat]}
            <span className="ml-1.5 opacity-60">
              {cat === "all" ? memberships.length : memberships.filter(m => m.category === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Membership cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(m => {
          const badge = expiryBadge(m.expiryDate);
          const isExpanded = expandedId === m.id;
          const hasData = m.memberNumber || m.expiryDate || m.promoCodes;
          return (
            <Card key={m.id} className={cn(
              "bg-card overflow-hidden transition-all cursor-pointer hover:shadow-sm",
              !hasData ? "border-dashed border-border/60" : ""
            )} onClick={() => setExpandedId(isExpanded ? null : m.id)}>
              <CardContent className="p-0">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", CAT_COLORS[m.category])}>
                          {CAT_LABELS[m.category]}
                        </span>
                        {m.annualCost > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            ${m.annualCost}/yr
                          </span>
                        )}
                        {m.annualCost === 0 && (
                          <span className="text-[10px] text-primary font-medium">Free</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm text-foreground truncate">{m.org}</h3>
                      {m.memberNumber && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Member # {m.memberNumber}
                          {m.pin && <span className="ml-2 text-muted-foreground/60">PIN: {m.pin}</span>}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {badge ? (
                        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", badge.color)}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">No expiry</span>
                      )}
                    </div>
                  </div>

                  {m.benefits && !isExpanded && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{m.benefits}</p>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-border/50 px-5 py-4 space-y-4 bg-muted/10" onClick={e => e.stopPropagation()}>
                    {m.benefits && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                          <Star className="h-3 w-3" /> Benefits
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">{m.benefits}</p>
                      </div>
                    )}

                    {m.discountNotes && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                          <Tag className="h-3 w-3" /> Discount Notes
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">{m.discountNotes}</p>
                      </div>
                    )}

                    {m.promoCodes && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                          <CreditCard className="h-3 w-3" /> Promo Codes
                        </p>
                        <p className="text-xs font-mono text-foreground bg-muted px-3 py-2 rounded-md">{m.promoCodes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      {m.website && (
                        <a
                          href={m.website.startsWith("http") ? m.website : `https://${m.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> {m.website}
                        </a>
                      )}
                      <div className="flex-1" />
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(m)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Membership" : "Add Membership"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Organisation *</Label>
                <Input value={form.org} onChange={e => setForm(f => ({ ...f, org: e.target.value }))} placeholder="e.g. CMCA — Campervan & Motorhome Club" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as MemberCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Annual Cost ($)</Label>
                <Input type="number" step="0.01" value={form.annualCost} onChange={e => setForm(f => ({ ...f, annualCost: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Member Number</Label>
                <Input value={form.memberNumber} onChange={e => setForm(f => ({ ...f, memberNumber: e.target.value }))} placeholder="12345678" />
              </div>
              <div className="space-y-1.5">
                <Label>PIN / Password</Label>
                <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Benefits</Label>
              <Textarea value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))} rows={2} placeholder="What does this membership include?" className="resize-none" />
            </div>

            <div className="space-y-1.5">
              <Label>Discount Notes</Label>
              <Textarea value={form.discountNotes} onChange={e => setForm(f => ({ ...f, discountNotes: e.target.value }))} rows={2} placeholder="How to claim discounts, partner venues, exclusions..." className="resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Promo / Discount Codes</Label>
                <Textarea value={form.promoCodes} onChange={e => setForm(f => ({ ...f, promoCodes: e.target.value }))} rows={2} placeholder="One code per line" className="resize-none font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="www.example.com.au" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}><Save className="mr-1.5 h-4 w-4" /> {editingId ? "Update" : "Add Membership"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
