# Die Groot Ompad

A full-stack Australian travel operating system for caravanners doing the Big Lap — combining multi-leg trip planning, GPS logging, vehicle/caravan weight compliance, 12-month budget management, and a weekly travel journal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (wouter, shadcn/ui, @tanstack/react-query, recharts, leaflet)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle ORM table definitions (trips, legs, budget, journal, vehicle, gps)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `artifacts/api-server/src/routes/` — Express route handlers (trips, legs, budget, journal, vehicle, gps, analytics)
- `artifacts/die-groot-ompad/src/pages/` — React pages (dashboard, trips list, trip shell with 6 tabs)

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → typed hooks + Zod validation on both client and server
- `serialize()` utility converts Drizzle `Date` objects to ISO strings before Zod parsing (Zod v4 expects `string` for date-time fields)
- Vehicle weight compliance computed client-side from profile data; API stores raw measurements only
- Budget months stored as JSONB blob keyed by month index 0–11 for flexible schema evolution
- GPS track stored as individual points per trip, cleared atomically via DELETE
- Default vehicle/budget data returned by GET endpoints when no record exists yet, avoiding 404 on first visit

## Product

Six integrated modules per trip, accessible via tabs:
1. **Planner** — multi-leg route planner with 3-scenario fuel estimates (15/18/20 L/100km), actual vs estimate KPIs
2. **Map** — Leaflet/OSM interactive map with geocoded stop markers, route polyline, and live GPS point logging
3. **Vehicle** — tow vehicle + caravan weight compliance calculator with GVM/GCM/tow rating status pills
4. **Budget** — 12-month spreadsheet with expense/income categories, auto-computed totals, Recharts cashflow chart
5. **Journal** — weekly travel journal with rich entry fields (weather, destinations, loved, learned)
6. **Analysis** — trip KPI summary (km variance, fuel cost vs estimate, avg consumption)

## User preferences

- Brand: warm sand (#f6f1e7), safari green (#1f6f5f), amber (#d9b880), Australian outback aesthetic
- No emojis in UI
- Dense, information-rich layout — every pixel earns its place

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after changing DB schema files
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing openapi.yaml
- Express 5: use `/{*splat}` wildcard, `req.params.id` is `string|string[]` — always parse
- Never use `console.log` in server code — use `req.log` in handlers, `logger` elsewhere
- `serialize()` must wrap all DB results before `Zod.parse()` (Date → ISO string conversion)
- Leaflet map: init in `useEffect` only, always clean up on unmount with `map.remove()`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Demo trip seeded: Die Groot Ompad — Nullarbor Crossing (Esperance → Ceduna), trip ID = 1
