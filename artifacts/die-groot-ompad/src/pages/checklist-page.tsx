import { useCallback, useEffect, useRef, useState } from "react";
import { useGetGlobalBudget, useSaveGlobalBudget } from "@workspace/api-client-react";
import { ChecklistDef, CheckSection, CheckState, computeStats } from "@/data/checklists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle, RotateCcw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type ChecklistMap = Record<string, Record<string, CheckState>>;

// ── Pill toggle button ────────────────────────────────────────────────────────
interface PillProps {
  value: CheckState;
  option: "yes" | "no" | "na";
  onClick: () => void;
}
function Pill({ value, option, onClick }: PillProps) {
  const active = value === option;
  const configs = {
    yes: {
      label: "YES",
      icon: <CheckCircle2 className="h-3 w-3" />,
      activeStyle: { background: "#1f6f5f", color: "#f6f1e7", borderColor: "#1f6f5f" },
      idleStyle: { background: "transparent", color: "#6b7280", borderColor: "#d1d5db" },
    },
    no: {
      label: "NO",
      icon: <XCircle className="h-3 w-3" />,
      activeStyle: { background: "#dc2626", color: "#fff", borderColor: "#dc2626" },
      idleStyle: { background: "transparent", color: "#6b7280", borderColor: "#d1d5db" },
    },
    na: {
      label: "N/A",
      icon: <MinusCircle className="h-3 w-3" />,
      activeStyle: { background: "#6b7280", color: "#fff", borderColor: "#6b7280" },
      idleStyle: { background: "transparent", color: "#9ca3af", borderColor: "#e5e7eb" },
    },
  };
  const { label, icon, activeStyle, idleStyle } = configs[option];
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all select-none"
      style={active ? activeStyle : idleStyle}
      title={label}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Section component ─────────────────────────────────────────────────────────
interface SectionProps {
  section: CheckSection;
  sectionState: Record<string, CheckState>;
  onChange: (itemId: string, value: CheckState) => void;
}
function Section({ section, sectionState, onChange }: SectionProps) {
  const total = section.items.length;
  const answered = section.items.filter(i => sectionState[i.id] != null).length;
  const noCount = section.items.filter(i => sectionState[i.id] === "no").length;
  const allDone = answered === total;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-semibold text-foreground">{section.title}</CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {noCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {noCount} NO
              </span>
            )}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: allDone ? "#1f6f5f18" : "#d9b88018",
                color: allDone ? "#1f6f5f" : "#b97e30",
              }}
            >
              {answered}/{total}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="divide-y divide-border">
          {section.items.map((item) => {
            const state = sectionState[item.id] ?? null;
            const isNo = state === "no";
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2"
                style={{
                  background: isNo ? "rgba(220,38,38,0.04)" : undefined,
                }}
              >
                {item.critical && (
                  <span
                    className="shrink-0 h-1.5 w-1.5 rounded-full"
                    style={{ background: "#d9b880" }}
                    title="Critical item"
                  />
                )}
                <span
                  className={`flex-1 text-xs leading-snug ${
                    state === "yes"
                      ? "text-muted-foreground line-through"
                      : state === "na"
                      ? "text-muted-foreground/60 italic"
                      : "text-foreground"
                  }`}
                >
                  {item.label}
                </span>
                <div className="shrink-0 flex items-center gap-1">
                  <Pill
                    value={state}
                    option="yes"
                    onClick={() => onChange(item.id, state === "yes" ? null : "yes")}
                  />
                  <Pill
                    value={state}
                    option="no"
                    onClick={() => onChange(item.id, state === "no" ? null : "no")}
                  />
                  <Pill
                    value={state}
                    option="na"
                    onClick={() => onChange(item.id, state === "na" ? null : "na")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main checklist page ───────────────────────────────────────────────────────
interface ChecklistPageProps {
  checklist: ChecklistDef;
}

export default function ChecklistPage({ checklist }: ChecklistPageProps) {
  const { data: budget, isLoading } = useGetGlobalBudget();
  const upsert = useSaveGlobalBudget();

  const [localState, setLocalState] = useState<Record<string, CheckState>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, CheckState>>({});

  // Seed local state from server on load
  useEffect(() => {
    if (!budget) return;
    const all = (budget.checklists ?? {}) as ChecklistMap;
    const mine = all[checklist.id] ?? {};
    setLocalState(mine as Record<string, CheckState>);
    pendingRef.current = mine as Record<string, CheckState>;
  }, [budget, checklist.id]);

  const scheduleSave = useCallback(
    (nextState: Record<string, CheckState>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("saving");
      saveTimer.current = setTimeout(async () => {
        try {
          const currentAll = ((budget?.checklists ?? {}) as ChecklistMap);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await upsert.mutateAsync({
            data: {
              ...(budget ?? {}),
              year: budget?.year ?? String(new Date().getFullYear()),
              checklists: { ...currentAll, [checklist.id]: nextState },
            } as any,
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("idle");
        }
      }, 600);
    },
    [budget, checklist.id, upsert]
  );

  function handleChange(itemId: string, value: CheckState) {
    const next = { ...pendingRef.current, [itemId]: value === null ? undefined as unknown as CheckState : value };
    if (value === null) delete (next as Record<string, CheckState | undefined>)[itemId];
    pendingRef.current = next as Record<string, CheckState>;
    setLocalState(next as Record<string, CheckState>);
    scheduleSave(next as Record<string, CheckState>);
  }

  async function handleReset() {
    if (!confirm(`Reset all ${checklist.title} answers? This cannot be undone.`)) return;
    const next: Record<string, CheckState> = {};
    pendingRef.current = next;
    setLocalState(next);
    setSaveStatus("saving");
    try {
      const currentAll = ((budget?.checklists ?? {}) as ChecklistMap);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await upsert.mutateAsync({
        data: {
          ...(budget ?? {}),
          year: budget?.year ?? String(new Date().getFullYear()),
          checklists: { ...currentAll, [checklist.id]: next },
        } as any,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }

  const stats = computeStats(checklist, localState);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{checklist.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{checklist.subtitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
          </span>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: stats.total, color: "#6b7280" },
          {
            label: "Answered",
            value: `${stats.answered} (${stats.pct}%)`,
            color: "#1f6f5f",
          },
          {
            label: "Unchecked",
            value: stats.unchecked,
            color: stats.unchecked > 0 ? "#b97e30" : "#1f6f5f",
          },
          {
            label: "Marked NO",
            value: stats.noCount,
            color: stats.noCount > 0 ? "#dc2626" : "#6b7280",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {s.label}
            </p>
            <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Completion</span>
          <span>{stats.pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${stats.pct}%`,
              background:
                stats.pct === 100
                  ? "#1f6f5f"
                  : stats.noCount > 0
                  ? "linear-gradient(90deg,#1f6f5f,#dc2626)"
                  : "linear-gradient(90deg,#1f6f5f,#d9b880)",
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: "#d9b880" }} />
          Amber dot = critical item
        </span>
        <span className="flex items-center gap-1">
          Tap YES / NO / N/A to toggle — auto-saves to your account
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {checklist.sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            sectionState={localState}
            onChange={handleChange}
          />
        ))}
      </div>
    </div>
  );
}
