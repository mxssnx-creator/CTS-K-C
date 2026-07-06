/**
 * Next.js Instrumentation
 * 
 * This file is loaded by Next.js on the server-side before any other code.
 * It provides a place for global initialization, logging, and telemetry setup.
 */

import { initRedis } from "@/lib/redis-db"

export async function register() {
  console.log("[v0] Instrumentation registered")
  
  try {
    // Run the full startup sequence. This initialises Redis, applies
    // migrations, and — critically — runs the startup coordinator's
    // orphaned-flag cleanup and stranded-position reconciliation. Those
    // steps used to live in `completeStartup()` which was defined but
    // never invoked, so stale `engine_is_running` flags / dead progression
    // from an unclean shutdown were never cleared. Running it on every
    // boot (dev AND prod) keeps production behaviour consistent with dev.
    const { completeStartup } = await import("@/lib/startup-coordinator")
    await completeStartup()
    console.log("[v0] Redis initialized + startup sequence complete via instrumentation")
  } catch (e) {
    // Never let startup coordination block the server from coming up.
    console.warn("[v0] Startup sequence failed in instrumentation (continuing):", e)
    try {
      await initRedis()
      console.log("[v0] Redis initialized via instrumentation (fallback)")
    } catch (e2) {
      console.warn("[v0] Redis init failed in instrumentation:", e2)
    }
  }
}

export async function onRequest(context: { request: Request; params: Record<string, string> }) {
  const { request } = context
  const url = typeof request.url === 'string' ? request.url : String(request.url)
  console.log(`[v0] Request: ${request.method} ${url}`)
}

export async function onError(context: { error: Error; _request: Request; params: Record<string, string> }) {
  const { error } = context
  console.error("[v0] Error in request:", error.message)
}