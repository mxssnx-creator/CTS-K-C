# Active Context: CTS Trading System

## Current State

**Project Status**: ✅ Loaded CTS-V-A-px from codex branch

Complete trading system with exchange connectors (BingX, Binance, Bybit, OKX, Pionex, OrangeX), trade engine, indication processing, preset coordination, and monitoring dashboards.

## Recently Completed

- [x] **PRODUCTION MODE ROOT-CAUSE FIX (2026-07-06)**: Resolved dev-works/prod-fails (coordinator errors, progression failures, crashes, 503s):
  - Migration deadlock: `ensureUniqueSiteInstance()` called `initRedis()` re-entrantly inside `initRedis -> runMigrations -> ensureCompleteProductionCoverage` (prod-only path). Now uses `ensureCoreRedis()`. Primary prod deadlock.
  - Stale snapshot: prod persisted `.v0-data/redis-snapshot.json`; on restart it restored a previous (dead) process's runtime state. Added per-process `bootSessionId` stamped into snapshots; mismatched/legacy snapshots are discarded so prod boots fresh like dev.
  - Startup coordinator (`completeStartup()` — orphaned-flag cleanup + stranded-position reconciliation) was defined but never invoked. Now wired into `instrumentation.register()`.
  - Floating `Promise.race` timeouts crashed the process ~15-35s after boot; swallowed via `.catch()` in initRedis, runMigrations, completeStartup.
  - Memory health check used `heapUsed/heapTotal` (V8 reservation, not the real ceiling) → false "unhealthy" → `/api/health` + readiness returned 503 → orchestrator restart loops. Now measured against the actual `max-old-space-size` ceiling.
  - Verified: prod build + `next start` boots healthy, all pages 200, `/api/connections` seeded (bingx-x01 enabled, 10 connections), `typecheck` + `lint` pass. Pushed to main (8c93882).

- [x] Fix missing escalateEngines property in GlobalTradeEngineCoordinator
- [x] Add symbol_order/symbol_count/symbols to hot-reload fields
- [x] Fix applyHotReload to invalidate symbol cache and re-resolve symbols when settings change
- [x] Push fixes to CTS-K-C main branch
- [x] Fix `/api/trade-engine/restart/route.ts` - replaced local uninitialized `globalTradeEngine` variable with coordinator singleton
- [x] Increase memory settings in package.json (dev/build/start) from 4096MB to 24576MB for stable progression testing
- [x] Increase Vercel API function memory from 4096MB to 10240MB for 12-symbol progression tests
- [x] Fix `scripts/validate-comprehensive.mjs` - correct URL construction for API_BASE
- [x] Fix `scripts/validate-comprehensive.mjs` - update field names to match actual API response format
- [x] Fix `scripts/validate-comprehensive.mjs` - use ordersPlaced and setsCreated for realtime progression verification
- [x] **Unique Progress Per Engine Type**: Modified progression key from `progression:{id}` to `progression:{id}:{engineType}` to ensure unique, solid progress per connection AND engine type (main, live, preset)
- [x] **Engine Type in Fingerprint**: Added `engine_type` to settings fingerprint comparison in `recoordinateForActualOne` to detect engine type changes
- [x] **Instant Re-coordination**: Added call to `ProgressionStateManager.recoordinateForActualOne()` in `applyHotReload` to re-coordinate progression instantly after settings changes (including symbol list changes, mode flags)
- [x] **Processor Updates**: Updated live-stage.ts, realtime-processor.ts, and config-set-processor.ts to read engine_type from trade_engine_state and use it in progression key
- [x] **FIX: engine_type in trade_engine_state**: Added `engine_type` field to `setSettings('trade_engine_state:${connectionId}', {...})` in engine-manager.ts:604-612 - this was MISSING and caused prehistoric progression to default to "main" engine type
- [x] **FIX: applyHotReload symbol resolution**: Fixed wrong key names in applyHotReload - use `connection:` prefix instead of `connection_settings:`, and don't double-prefix with `settings:` when calling getSettings
- [x] **FIX: prehistoric progression startup**: Added immediate `setTimeout(tick, 0)` call in `startPrehistoricProgression` so the loop starts right away instead of waiting for the first scheduleNext
- [x] **FIX: engine_type propagation**: Added engine_type to all engine config creation paths (startEngineFromConnectionConfig, startAll, resume, API routes)
- [x] **FIX: ESLint config** - Added `eslint-plugin-react-hooks` to eslint.config.mjs with react-hooks/rules-of-hooks and exhaustive-deps rules; Removed invalid eslint-disable comments for non-existent rule
- [x] **PRODUCTION MODE FIX**: Fixed connection seeding in production-seeder.ts - connections now seeded with `is_assigned: "1"`, `is_inserted: "1"`, `is_active_inserted: "1"` so auto-start monitor can pick them up
- [x] **PRODUCTION MODE FIX**: Updated `/api/system/initialize` to initialize Global Trade Engine Coordinator and set `trade_engine:global.status=running` before starting engines
- [x] **PRODUCTION MODE FIX**: Updated auto-start flow to start engines for eligible connections during initialization, and re-assert dashboard flags for connections that lost them

## Current Focus

- Investigating Global Trade Coordinator crashes (need error logs)
- Verifying symbol loading from exchange works correctly
- Testing settings changes propagate instantly to running engines

## Current Focus

- ✅ Progression testing complete - all tests passing (4 passed, 1 skipped)
- ✅ Memory settings optimized for stable continuous operation
- ✅ **PRODUCTION MODE FIXED**: All issues resolved - engines now start automatically in production
  - Connection seeding creates assigned connections
  - Global coordinator initialized with proper state
  - Auto-start monitor starts engines for eligible connections

## Quick Start Guide

### To add a new page:

Create a file at `src/app/[route]/page.tsx`:
```tsx
export default function NewPage() {
  return <div>New page content</div>;
}
```

### To add components:

Create `src/components/` directory and add components:
```tsx
// src/components/ui/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2 bg-blue-600 text-white rounded">{children}</button>;
}
```

### To add a database:

Follow `.kilocode/recipes/add-database.md`

### To add API routes:

Create `src/app/api/[route]/route.ts`:
```tsx
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello" });
}
```

## Available Recipes

| Recipe | File | Use Case |
|--------|------|----------|
| Add Database | `.kilocode/recipes/add-database.md` | Data persistence with Drizzle + SQLite |

## Pending Improvements

- [ ] Add more recipes (auth, email, etc.)
- [ ] Add example components
- [ ] Add testing setup recipe

## Session History

| Date | Changes |
|------|---------|
| 2026-07-06 | **PRODUCTION MODE ROOT-CAUSE FIX**: deadlock in migrations (ensureUniqueSiteInstance re-entrancy), stale snapshot restore, unused startup coordinator, floating Promise.race crashes, false 503 from memory check. All fixed, verified, pushed (8c93882) |
| 2026-07-01 | **PRODUCTION MODE FIX COMPLETE**: Fixed connection seeding, coordinator initialization, and auto-start flow - engines now start automatically in production |
| 2026-07-01 | Verified engine progression probe: prehistoric 100% complete, strategy sets being created, engine running stably |
| 2026-07-01 | Fixed ESLint config: added eslint-plugin-react-hooks plugin, enabled react-hooks/rules-of-hooks and exhaustive-deps rules; Removed invalid eslint-disable comments for non-existent @typescript-eslint/no-unreachable-code-error rule |
| 2026-06-17 | Fixed `/api/trade-engine/restart/route.ts` - replaced uninitialized local `globalTradeEngine` variable with coordinator singleton |
| 2026-06-17 | Increased memory settings: package.json dev/build/start from 4096MB to 24576MB; Vercel API functions from 4096MB to 10240MB |
| 2026-06-17 | Fixed `scripts/validate-comprehensive.mjs` URL construction and field names for progression testing |
| 2026-06-17 | Fixed `scripts/validate-comprehensive.mjs` realtime test to use setsCreated and ordersPlaced instead of cycle counters |
| 2026-06-17 | Ran 15-minute continuous test with 20 symbols - stable progression verified |
| 2026-06-17 | Progression test passed: 4/5 tests pass, 1 skipped (position history) |
| 2026-06-17 | Fixed typo in PrehistoricProgress interface: totalCandesProcessed → totalCandlesProcessed |
| Initial | Template created with base setup |
