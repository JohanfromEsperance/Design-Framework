import { Link, useLocation } from "wouter";
import { Map, Home, Menu, MessageSquare, Globe, DollarSign, LogOut, Truck, ClipboardCheck, Download, Save, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useClerk, useUser } from "@clerk/react";
import { useSaveContext } from "@/lib/save-context";
import { useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function openJohan() {
  window.open(
    "https://agent.jotform.com/019d4b4f5e5e789fadd36134095d4f745b67?embedMode=popup&parentURL=" +
      encodeURIComponent(window.location.href),
    "blank",
    "scrollbars=yes,toolbar=no,width=700,height=500,top=" +
      (window.outerHeight / 2 - 250) +
      ",left=" +
      (window.outerWidth / 2 - 350)
  );
}

const MAIN_NAV = [
  { href: "/dashboard",          label: "Dashboard",         icon: Home },
  { href: "/trips",              label: "My Trips",          icon: Map },
  { href: "/advance-bookings",   label: "Advance Bookings",  icon: CalendarCheck },
  { href: "/budget",             label: "Budget",            icon: DollarSign },
  { href: "/vehicle",            label: "Rig & Vehicle",     icon: Truck },
  { href: "/export",             label: "Export Data",       icon: Download },
] as const;

const CHECKLIST_NAV = [
  { href: "/checklists/d2",        label: "D-2 Systems",    icon: ClipboardCheck },
  { href: "/checklists/departure", label: "Departure Day",  icon: ClipboardCheck },
  { href: "/checklists/packing",   label: "Packing",        icon: ClipboardCheck },
  { href: "/checklists/service",   label: "Annual Service", icon: ClipboardCheck },
] as const;

interface SidebarProps {
  location: string;
  firstName: string;
  initials: string;
  email: string | undefined;
  onSignOut: () => void;
  onNav?: () => void;
}

function NavItem({ href, label, Icon, isActive, onNav }: { href: string; label: string; Icon: React.ElementType; isActive: boolean; onNav?: () => void }) {
  return (
    <Link href={href} onClick={onNav}>
      <div
        className={`flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted"
        }`}
      >
        <Icon
          className={`mr-3 h-4 w-4 shrink-0 ${
            isActive ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        />
        {label}
      </div>
    </Link>
  );
}

function Sidebar({ location, firstName, initials, email, onSignOut, onNav }: SidebarProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Brand / logo header */}
      <div className="shrink-0 border-b border-border overflow-hidden">
        <div className="relative h-28">
          <img
            src={`${basePath}/logo.png`}
            alt="Die Groot Ompad"
            className="w-full h-full object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(246,241,231,0.95) 0%, rgba(246,241,231,0.3) 60%, transparent 100%)" }}
          />
          <div className="absolute bottom-2 left-0 right-0 px-4">
            <span className="text-sm font-bold text-foreground drop-shadow-sm">Die Groot Ompad</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-0.5">
        {/* Main nav */}
        {MAIN_NAV.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/dashboard" && location.startsWith(item.href));
          return (
            <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} isActive={isActive} onNav={onNav} />
          );
        })}

        {/* Checklists section */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 select-none">
            Checklists
          </p>
        </div>
        {CHECKLIST_NAV.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href);
          return (
            <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} isActive={isActive} onNav={onNav} />
          );
        })}
      </nav>

      {/* Sidebar footer */}
      <div className="p-4 border-t border-border space-y-2 shrink-0">
        <a
          href="https://adventure-analytics-australia.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
          style={{ background: "#d9b880", color: "#1a1a1a" }}
        >
          <Globe className="h-4 w-4 shrink-0" />
          <span>Adventure Analytics</span>
        </a>
        <button
          onClick={openJohan}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1f6f5f, #2a8a76)", color: "#f6f1e7" }}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Johan — Swerwer &amp; Vriend</span>
        </button>

        {/* User info + sign out */}
        <div className="flex items-center gap-3 pt-1">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-[#f6f1e7]"
            style={{ background: "linear-gradient(135deg, #1f6f5f, #2a8a76)" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{firstName}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <button
            title="Sign out"
            onClick={onSignOut}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { save, hasSaveFn } = useSaveContext();
  const [saving, setSaving] = useState(false);

  const handleHardSave = () => {
    if (!hasSaveFn) return;
    setSaving(true);
    save();
    setTimeout(() => setSaving(false), 1800);
  };

  const firstName = user?.firstName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "Explorer";
  const initials = firstName.slice(0, 2).toUpperCase();
  const email = user?.primaryEmailAddress?.emailAddress;

  function handleSignOut() {
    signOut({ redirectUrl: `${basePath}/sign-in` });
  }

  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMenu = () => setMobileOpen(false);

  const sidebarProps: SidebarProps = { location, firstName, initials, email, onSignOut: handleSignOut, onNav: closeMenu };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile hamburger + slide-out drawer (hidden on md+) */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-50">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-52 p-0 bg-card border-r border-border" aria-describedby={undefined}>
            <Sidebar {...sidebarProps} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar — fixed, only shown on md+ */}
      <aside
        className="fixed inset-y-0 left-0 z-10 flex w-52 flex-col border-r border-border bg-card max-md:hidden"
      >
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Main content — offset by sidebar width on md+ */}
      <div className="md:pl-52">
        <main className="flex-1 p-3 sm:p-5 md:p-8 overflow-x-hidden">{children}</main>
      </div>

      {/* Hard Save button — fixed top-right, only shown when a page has registered a save function */}
      {hasSaveFn && (
        <button
          onClick={handleHardSave}
          disabled={saving}
          className="fixed top-4 right-4 z-40 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: saving ? "#165a4c" : "#1f6f5f",
            color: "#f6f1e7",
            boxShadow: "0 2px 12px rgba(31,111,95,0.35)",
          }}
          title="Hard Save — commit all changes to the database now"
        >
          <Save className="h-3.5 w-3.5 shrink-0" />
          <span>{saving ? "Saving..." : "Hard Save"}</span>
        </button>
      )}

      {/* Floating Johan button */}
      <button
        onClick={openJohan}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #1f6f5f, #2a8a76)",
          color: "#f6f1e7",
          boxShadow: "0 4px 20px rgba(31, 111, 95, 0.4)",
        }}
        title="Chat with Johan — your AI travel companion"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Johan</span>
      </button>
    </div>
  );
}
