import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Server-side bootstrap endpoint. This POST is intentionally idempotent
  // and safe to call from client mounts (EngineAutoInitializer). It will
  // run the same seeding and initialization logic used in production
  // without importing `fs` or other server-only modules into client
  // bundles.
  try {
    const { seedProductionData } = await import("@/lib/production-seeder")
    await seedProductionData({ seedSettings: true, seedConnections: true, seedMarketData: true, seedProgression: true })
    
    // Initialize the Global Trade Engine Coordinator
    const { getGlobalTradeEngineCoordinator, initializeGlobalCoordinator } = await import("@/lib/trade-engine")
    const coordinator = initializeGlobalCoordinator()
    
    // Set global state to running so auto-start monitor picks it up
    const { getRedisClient, initRedis, setSettings } = await import("@/lib/redis-db")
    await initRedis()
    const client = getRedisClient()
    await setSettings("trade_engine:global", {
      status: "running",
      started_at: new Date().toISOString(),
      version: "5.2.0",
    })
    
    // Start coordinator to begin processing
    await coordinator.startAll()
    
    // Start coordinator
    await fetch("/api/trade-engine/auto-start", { method: "POST", cache: "no-store" }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("/api/system/initialize error:", err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
