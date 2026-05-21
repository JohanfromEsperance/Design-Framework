import { Link, useLocation } from "wouter";
import { Compass, Map, Home, Menu, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

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

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/trips", label: "My Trips", icon: Map },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
        <Compass className="h-6 w-6 text-primary mr-3" />
        <span className="text-xl font-bold text-foreground">Die Groot Ompad</span>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 shrink-0 ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Johan button in sidebar */}
      <div className="p-4 border-t border-border space-y-4">
        <button
          onClick={openJohan}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background: "linear-gradient(135deg, #1f6f5f, #2a8a76)",
            color: "#f6f1e7",
          }}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Johan — Swerwer &amp; Vriend</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm">
            GO
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Explorer</p>
            <p className="text-xs text-muted-foreground">Ready for the lap</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden absolute top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-card border-r border-border"
        >
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-card">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-64">
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>

      {/* Floating Johan button — always accessible */}
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
