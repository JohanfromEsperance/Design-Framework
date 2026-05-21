import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, GripHorizontal, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HelpItem {
  label: string;
  desc: string;
}

export interface HelpContent {
  title: string;
  intro: string;
  items?: HelpItem[];
  tips?: string[];
  warning?: string;
}

// ── Draggable, resizable floating help panel ──────────────────────────────────

interface HelpPanelProps {
  content: HelpContent;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
}

export function HelpPanel({ content, onClose, initialX = 120, initialY = 140 }: HelpPanelProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const dragging = useRef(false);
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    setPos({
      x: origin.current.px + (e.clientX - origin.current.mx),
      y: origin.current.py + (e.clientY - origin.current.my),
    });
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  return (
    <div
      style={{
        position: "fixed",
        left: Math.max(0, pos.x),
        top: Math.max(0, pos.y),
        zIndex: 9999,
        width: 360,
        minWidth: 260,
        minHeight: 180,
        resize: "both",
        overflow: "auto",
      }}
      className="bg-card border border-border rounded-lg shadow-2xl flex flex-col text-sm"
    >
      {/* Header — drag handle */}
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-border rounded-t-lg cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold text-xs text-foreground truncate">{content.title}</span>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          className="ml-2 shrink-0 rounded p-0.5 hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 overflow-y-auto flex-1 text-xs">
        <p className="text-muted-foreground leading-relaxed">{content.intro}</p>

        {content.items && content.items.length > 0 && (
          <dl className="space-y-2">
            {content.items.map(item => (
              <div key={item.label}>
                <dt className="font-semibold text-foreground">{item.label}</dt>
                <dd className="text-muted-foreground leading-relaxed mt-0.5 pl-2 border-l-2 border-border">{item.desc}</dd>
              </div>
            ))}
          </dl>
        )}

        {content.tips && content.tips.length > 0 && (
          <div className="rounded-md bg-[#d9b880]/10 border border-[#d9b880]/30 p-2.5">
            <p className="font-semibold text-[#b8943e] mb-1.5 text-[10px] uppercase tracking-wide">Tips</p>
            <ul className="space-y-1">
              {content.tips.map((tip, i) => (
                <li key={i} className="text-muted-foreground leading-relaxed flex gap-1.5">
                  <span className="text-[#d9b880] shrink-0">·</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.warning && (
          <div className="rounded-md bg-destructive/8 border border-destructive/20 p-2.5">
            <p className="font-semibold text-destructive mb-1 text-[10px] uppercase tracking-wide">Important</p>
            <p className="text-muted-foreground leading-relaxed">{content.warning}</p>
          </div>
        )}
      </div>

      {/* Resize hint */}
      <div className="shrink-0 text-right px-2 pb-1">
        <span className="text-[9px] text-muted-foreground/40 select-none">drag corner to resize</span>
      </div>
    </div>
  );
}

// ── Help button — the "?" trigger ─────────────────────────────────────────────

interface HelpButtonProps {
  content: HelpContent;
  className?: string;
}

export function HelpButton({ content, className }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [spawnPos, setSpawnPos] = useState({ x: 120, y: 140 });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setSpawnPos({
        x: Math.min(rect.right + 8, window.innerWidth - 380),
        y: Math.max(rect.top - 20, 10),
      });
    }
    setOpen(v => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        title={`Help: ${content.title}`}
        className={cn(
          "inline-flex items-center justify-center rounded-full w-4 h-4 text-[9px] font-bold",
          "border border-muted-foreground/40 text-muted-foreground/60",
          "hover:border-primary hover:text-primary hover:bg-primary/8 transition-colors",
          "shrink-0 select-none",
          className
        )}
      >
        ?
      </button>
      {open && (
        <HelpPanel
          content={content}
          onClose={() => setOpen(false)}
          initialX={spawnPos.x}
          initialY={spawnPos.y}
        />
      )}
    </>
  );
}
