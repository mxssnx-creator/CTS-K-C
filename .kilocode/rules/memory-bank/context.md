# Active Context: CTS Trading System

## Current State

**Project Status**: ✅ Loaded CTS-V-A-px from codex branch

Complete trading system with exchange connectors (BingX, Binance, Bybit, OKX, Pionex, OrangeX), trade engine, indication processing, preset coordination, and monitoring dashboards.

## Recently Completed

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
- [x] **FIX: engine_type propagation**: Added engine_type to all engine config creation paths (startEngineFromConnectionConfig, startAll, resume)

## Current Focus

- ✅ Progression testing complete - all tests passing (4 passed, 1 skipped)
- Memory settings optimized for stable continuous operation

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
| 2026-06-17 | Fixed `/api/trade-engine/restart/route.ts` - replaced uninitialized local `globalTradeEngine` variable with coordinator singleton |
| 2026-06-17 | Increased memory settings: package.json dev/build/start from 4096MB to 24576MB; Vercel API functions from 4096MB to 10240MB |
| 2026-06-17 | Fixed `scripts/validate-comprehensive.mjs` URL construction and field names for progression testing |
| 2026-06-17 | Fixed `scripts/validate-comprehensive.mjs` realtime test to use setsCreated and ordersPlaced instead of cycle counters |
| 2026-06-17 | Ran 15-minute continuous test with 20 symbols - stable progression verified |
| 2026-06-17 | Progression test passed: 4/5 tests pass, 1 skipped (position history) |
| 2026-06-17 | Fixed typo in PrehistoricProgress interface: totalCandesProcessed → totalCandlesProcessed |
| Initial | Template created with base setup |
