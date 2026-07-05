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
    await initRedis()
    console.log("[v0] Redis initialized via instrumentation")
  } catch (e) {
    console.warn("[v0] Redis init failed in instrumentation:", e)
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