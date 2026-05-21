# Threat Model

## Project Overview

Die Groot Ompad is a full-stack travel planning application for caravanners. The production app consists of a React + Vite frontend and an Express 5 API backed by PostgreSQL through Drizzle ORM. Clerk is used for user authentication, and the API serves trip plans, travel legs, journal entries, GPS logs, vehicle/caravan weight profiles, and budget data.

This threat model is scoped to production-reachable code. `artifacts/mockup-sandbox/` is development-only and should be ignored unless future scans show it is exposed in production. Replit-managed TLS is assumed in production. No deployment exists at scan time, so future production scans should assume a normal public deployment unless deployment visibility is explicitly private or password-protected.

## Assets

- **User accounts and sessions** — Clerk identities, session state, and bearer tokens. Compromise would let an attacker impersonate legitimate users.
- **Trip records** — trip names, notes, schedules, fuel planning, and analytics. These are the core business records and can reveal personal travel plans.
- **Location and movement data** — GPS points and route legs. Exposure reveals a user's historical and near-real-time travel patterns.
- **Financial and household planning data** — budget plans, income, expenses, rental/super/shares data. Exposure affects user privacy and can aid fraud or profiling.
- **Vehicle and caravan compliance data** — weights, limits, caravan details, and towing calculations. These are operationally sensitive and affect safety-related decisions.
- **Application secrets** — database connection strings and Clerk secret keys. Exposure could enable broader compromise of infrastructure or auth flows.

## Trust Boundaries

- **Browser to API** — all client data crosses into the Express API. The browser is untrusted, so every API route must authenticate callers and validate/authorize requested resources server-side.
- **API to PostgreSQL** — the API has direct read/write access to all application data. Any injection flaw or missing authorization at the API layer can expose the full dataset.
- **API to Clerk** — the server trusts Clerk-issued identity material and proxies Clerk frontend API traffic in production. Host/header handling here must not let attackers subvert auth behavior or leak secrets.
- **Public to authenticated boundary** — the frontend has sign-in flows, but server-side enforcement must decide which endpoints are public versus authenticated. Client-side route guards are not a security boundary.
- **Trip-to-user boundary** — each trip and its related legs, journal entries, vehicle profile, budget, and GPS data must belong to exactly one authorized user or tenant. Integer `tripId` values are not a sufficient security boundary by themselves.
- **Production to dev-only boundary** — mockup sandbox and local-only tooling should not affect production risk unless specifically wired into production entry points.

## Scan Anchors

- Production API entry point: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`.
- Primary high-risk surface: `artifacts/api-server/src/routes/` and `lib/db/src/schema/`.
- Client auth gate: `artifacts/die-groot-ompad/src/App.tsx`.
- Client/API auth token plumbing: `lib/api-client-react/src/custom-fetch.ts`.
- Dev-only area to usually ignore: `artifacts/mockup-sandbox/`.

## Threat Categories

### Spoofing

The app relies on Clerk for identity, so the API must treat Clerk-authenticated identity as the source of truth for every protected request. Middleware that merely parses auth context is not enough; each sensitive endpoint must reject unauthenticated callers and must not trust frontend allowlists or route guards.

Required guarantees:
- All non-public API endpoints that read or mutate trip, budget, journal, vehicle, GPS, or analytics data must require a valid authenticated identity.
- Any role or allowlist restriction shown in the frontend must also be enforced server-side.

### Tampering

Clients can create and update trips, legs, budgets, journal entries, vehicle profiles, and GPS logs. The API must assume all client input is attacker-controlled and ensure a caller can only mutate records they own.

Required guarantees:
- Every write path must bind the requested `tripId` and subordinate record IDs to the authenticated user on the server.
- Business data must never rely on client-side gating or hidden UI state for integrity.
- Database writes must remain parameterized and schema-validated.

### Information Disclosure

The application stores sensitive travel, location, financial, and vehicle data. If a caller can list trips globally, query by predictable `tripId`, or read unscoped aggregate endpoints, the full dataset becomes exposed.

Required guarantees:
- API responses must be filtered server-side to the authenticated user's own trips and related records.
- Aggregate or dashboard endpoints must not return cross-user totals unless explicitly intended and strongly authorized.
- Logs and error responses must not expose session material, cookies, or secrets.

### Denial of Service

The API accepts JSON writes and performs data aggregation and multiple DB reads for some endpoints. Publicly reachable endpoints without authentication or rate controls increase abuse potential, especially for write-heavy surfaces like GPS logging and trip creation.

Required guarantees:
- Public endpoints must stay minimal and cheap.
- Sensitive or write-heavy endpoints should require authentication before performing database work.
- External calls and expensive aggregation paths should remain bounded.

### Elevation of Privilege

The main privilege boundary is between one user's trip data and another user's trip data. Because most records are keyed by integer `tripId`, missing server-side ownership checks would allow an attacker to move horizontally across the entire dataset by enumerating IDs.

Required guarantees:
- Each trip must be associated with an owner or tenant identifier in the database.
- Every route that accepts `tripId`, `legId`, or `entryId` must verify ownership against the authenticated principal before reading, updating, deleting, or aggregating data.
- Frontend-only admin or beta allowlists must never be treated as authoritative access control.
