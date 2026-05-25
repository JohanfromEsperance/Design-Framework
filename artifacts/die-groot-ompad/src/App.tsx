import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { SaveProvider } from "@/lib/save-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TripsList from "@/pages/trips/index";
import TripShell from "@/pages/trips/trip-shell";
import BudgetPage from "@/pages/budget-page";
import VehiclePage from "@/pages/vehicle-page";
import ChecklistPage from "@/pages/checklist-page";
import ExportPage from "@/pages/export-page";
import AdvanceBookingsPage from "@/pages/advance-bookings-page";
import PowerConfigPage from "@/pages/power-config-page";
import { CHECKLIST_D2, CHECKLIST_DEPARTURE, CHECKLIST_PACKING, CHECKLIST_SERVICE } from "@/data/checklists";

// ── Clerk config ───────────────────────────────────────────────────────────────

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// ── Clerk appearance — warm sand / safari green brand ──────────────────────────

const clerkAppearance = {
  baseTheme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
    socialButtonsVariant: "iconButton" as const,
  },
  variables: {
    colorPrimary: "#1f6f5f",
    colorForeground: "#1a1209",
    colorMutedForeground: "#6b5c3e",
    colorDanger: "#b91c1c",
    colorBackground: "#f6f1e7",
    colorInput: "#ede8dd",
    colorInputForeground: "#1a1209",
    colorNeutral: "#9a8c74",
    fontFamily: "inherit",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#f6f1e7] border border-[#d9c9a8] shadow-xl rounded-2xl w-[420px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#1a1209] font-bold",
    headerSubtitle: "text-[#6b5c3e]",
    socialButtonsBlockButtonText: "text-[#1a1209] font-medium",
    formFieldLabel: "text-[#1a1209] font-medium",
    footerActionLink: "text-[#1f6f5f] font-semibold hover:text-[#165a4c]",
    footerActionText: "text-[#6b5c3e]",
    dividerText: "text-[#6b5c3e]",
    identityPreviewEditButton: "text-[#1f6f5f]",
    formFieldSuccessText: "text-[#1f6f5f]",
    alertText: "text-[#1a1209]",
    logoBox: "py-2",
    logoImage: "h-20 w-auto object-contain",
    socialButtonsBlockButton: "border-[#c8b896] bg-[#ede8dd] hover:bg-[#e4ddd0]",
    formButtonPrimary: "bg-[#1f6f5f] hover:bg-[#165a4c] text-[#f6f1e7] font-semibold",
    formFieldInput: "bg-[#ede8dd] border-[#c8b896] text-[#1a1209]",
    footerAction: "bg-[#ede8dd]/60 border-t border-[#d9c9a8]",
    dividerLine: "bg-[#d9c9a8]",
    alert: "bg-[#ede8dd] border-[#c8b896]",
    otpCodeFieldInput: "border-[#c8b896] bg-[#ede8dd]",
    formFieldRow: "",
    main: "",
  },
};

// ── Query client ───────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

// ── Auth cache invalidator ─────────────────────────────────────────────────────

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== uid) {
        qc.clear();
      }
      prevUserIdRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

// ── Sign-in page ───────────────────────────────────────────────────────────────

function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex" style={{ background: "#f6f1e7" }}>
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col">
        <img
          src={`${basePath}/logo.png`}
          alt="Die Groot Ompad"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 60%, #f6f1e7)" }} />
        <div className="relative z-10 p-10 mt-auto">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ background: "rgba(246,241,231,0.85)", color: "#1f6f5f", backdropFilter: "blur(8px)" }}
          >
            Private — Members Only
          </div>
        </div>
      </div>

      {/* Right panel — sign in */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12" style={{ background: "#f6f1e7" }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <img
              src={`${basePath}/logo.png`}
              alt="Die Groot Ompad"
              className="h-32 w-auto object-contain mx-auto rounded-xl shadow-md"
            />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#1a1209", fontFamily: "inherit" }}>
              Die Groot Ompad
            </h1>
            <p className="text-sm font-medium mb-1" style={{ color: "#1f6f5f" }}>
              Australia's Big Lap — Travel Command Centre
            </p>
            <p className="text-xs italic" style={{ color: "#8a7355" }}>
              Isaiah 40:31 — Those who wait upon the Lord shall renew their strength
            </p>
          </div>

          <div
            className="w-full rounded-2xl overflow-hidden border shadow-lg"
            style={{ background: "#ede8dd", borderColor: "#d9c9a8" }}
          >
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              appearance={clerkAppearance}
            />
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: "#8a7355" }}>
            This is a private app — access by invitation only.
          </p>
          <p className="mt-1 text-center text-xs" style={{ color: "#a89878" }}>
            "Our journey never ends" &mdash; Asset Academy
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sign-up page (styled the same way) ────────────────────────────────────────

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6" style={{ background: "#f6f1e7" }}>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#1a1209" }}>Die Groot Ompad</h1>
          <p className="text-xs" style={{ color: "#8a7355" }}>Create your account</p>
        </div>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

// ── Access denied ──────────────────────────────────────────────────────────────

function AccessDenied() {
  const { signOut } = useClerk();
  const { user } = useUser();
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6" style={{ background: "#f6f1e7" }}>
      <img src={`${basePath}/logo.png`} alt="Die Groot Ompad" className="h-32 w-auto object-contain rounded-xl shadow-md mb-2" />
      <h1 className="text-xl font-bold" style={{ color: "#1a1209" }}>Access Restricted</h1>
      <p className="text-sm text-center max-w-sm" style={{ color: "#6b5c3e" }}>
        This app is currently in private beta. Your account (<strong>{user?.primaryEmailAddress?.emailAddress}</strong>) does not have access yet.
      </p>
      <button
        onClick={() => signOut({ redirectUrl: `${basePath}/sign-in` })}
        className="mt-2 px-5 py-2 rounded-lg text-sm font-semibold"
        style={{ background: "#1f6f5f", color: "#f6f1e7" }}
      >
        Sign out
      </button>
    </div>
  );
}

// ── Branded loading screen (shown while Clerk initialises) ─────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6"
      style={{ background: "#f6f1e7" }}>
      <img
        src={`${basePath}/logo.png`}
        alt="Die Groot Ompad"
        className="h-24 w-auto object-contain rounded-xl shadow-md"
      />
      <div className="w-7 h-7 border-2 rounded-full animate-spin"
        style={{ borderColor: "#d9c9a8", borderTopColor: "#1f6f5f" }} />
    </div>
  );
}

// ── Admin allowlist ────────────────────────────────────────────────────────────

const ADMIN_EMAILS = ["johan@asset-academy.com", "johansnyman800@gmail.com"];

// ── Auth gate — checks email allowlist ─────────────────────────────────────────

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <LoadingScreen />;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  if (!ADMIN_EMAILS.includes(email)) return <AccessDenied />;
  return <>{children}</>;
}

// ── Home redirect ──────────────────────────────────────────────────────────────

function HomeRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <AuthGate><Redirect to="/dashboard" /></AuthGate>;
  return <Redirect to="/sign-in" />;
}

// ── Protected app shell ────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [location] = useLocation();
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) {
    // Preserve the deep-link path so Clerk redirects back after sign-in
    const dest = location && location !== "/" ? `?redirect_url=${encodeURIComponent(basePath + location)}` : "";
    return <Redirect to={`/sign-in${dest}`} />;
  }
  return <AuthGate>{children}</AuthGate>;
}

// ── Main router ────────────────────────────────────────────────────────────────

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back, explorer",
            subtitle: "Sign in to your travel command centre",
          },
        },
        signUp: {
          start: {
            title: "Join the journey",
            subtitle: "Create your Die Groot Ompad account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <SaveProvider>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard">
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/trips">
              <ProtectedRoute>
                <Layout><TripsList /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/trips/:tripId">
              {(params) => (
                <ProtectedRoute>
                  <Layout><TripShell params={params as { tripId: string }} /></Layout>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/budget">
              <ProtectedRoute>
                <Layout><BudgetPage /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/advance-bookings">
              <ProtectedRoute>
                <Layout><AdvanceBookingsPage /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/vehicle">
              <ProtectedRoute>
                <Layout><VehiclePage /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/power-config">
              <ProtectedRoute>
                <Layout><PowerConfigPage /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/checklists/d2">
              <ProtectedRoute>
                <Layout><ChecklistPage checklist={CHECKLIST_D2} /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/checklists/departure">
              <ProtectedRoute>
                <Layout><ChecklistPage checklist={CHECKLIST_DEPARTURE} /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/checklists/packing">
              <ProtectedRoute>
                <Layout><ChecklistPage checklist={CHECKLIST_PACKING} /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/checklists/service">
              <ProtectedRoute>
                <Layout><ChecklistPage checklist={CHECKLIST_SERVICE} /></Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/export">
              <ProtectedRoute>
                <Layout><ExportPage /></Layout>
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
        </SaveProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
