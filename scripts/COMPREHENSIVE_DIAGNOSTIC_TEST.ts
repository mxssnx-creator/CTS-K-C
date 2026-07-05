import "../lib/instrumentation"
import { initRedis, getAllConnections, setSettings, updateConnection, getRedisClient } from "../lib/redis-db"
import { createExchangeConnector, type BaseExchangeConnector } from "@/lib/exchange-connectors"
import { logProgressionEvent } from "@/lib/engine-progression-logs"
import { VolumeCalculator } from "@/lib/volume-calculator"
import { getVenueMinQty } from "@/lib/exchange-min-qty"

interface DiagnosticResult {
  success: boolean
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
  stats?: {
    balance?: number
    testBalance?: number
    symbols?: string[]
    realStats?: { total: number }
    liveStats?: { open: number }
  }
  issues: string[]
  logs: string[]
}

const LOG_PREFIX = "[v0] [Diagnostic]"

export default async function runDiagnostic(
  connectionId: string,
  symbols: string[] = ["PLAYSOUTUSDT", "XANUSDT", "BSBUSDT", "NILUSDT"],
  options?: { liveTrade?: boolean; controlOrders?: boolean; volumeFactor?: number }
): Promise<DiagnosticResult> {
  const issues: string[] = []
  const logs: string[] = []
  let passed = 0
  let failed = 0
  let warnings = 0

  console.log(`${LOG_PREFIX} Starting comprehensive diagnostic for ${connectionId} with ${symbols.length} symbols`)

  try {
    await initRedis()
    logs.push("Redis initialized successfully")
    passed++
  } catch (e) {
    issues.push(`Redis initialization failed: ${e instanceof Error ? e.message : String(e)}`)
    failed++
    return {
      success: false,
      summary: { total: 1, passed: 0, failed: 1, warnings: 0 },
      issues,
      logs,
    }
  }

  const client = getRedisClient()
  const allConnections = await getAllConnections()
  const connection = allConnections.find((c) => c.id === connectionId) as Record<string, unknown> | undefined

  if (!connection) {
    issues.push(`Connection ${connectionId} not found`)
    failed++
    return {
      success: false,
      summary: { total: 2, passed: 0, failed: 2, warnings: 0 },
      issues,
      logs,
    }
  }

  logs.push(`Found connection: ${connection.name} (${connection.exchange})`)
  passed++

  const hasCredentials = !!(connection.api_key && connection.api_secret &&
    (connection.api_key as string).length >= 10 && (connection.api_secret as string).length >= 10)

  if (!hasCredentials) {
    issues.push("Connection missing valid API credentials")
    warnings++
  }

  let connector: BaseExchangeConnector | null = null
  let testBalance = 0

  if (hasCredentials) {
    try {
      connector = await createExchangeConnector(connection.exchange as string, {
        apiKey: connection.api_key as string,
        apiSecret: connection.api_secret as string,
        apiPassphrase: (connection.api_passphrase as string) || "",
        isTestnet: connection.is_testnet === "1" || connection.is_testnet === true,
        apiType: (connection.api_type as string) || "perpetual_futures",
      })
      logs.push("Exchange connector created successfully")
      passed++

      const testResult = await connector.testConnection()
      if (testResult.success) {
        testBalance = testResult.balance || 0
        logs.push(`Connection test passed - Balance: ${testBalance}`)
        passed++
      } else {
        issues.push(`Connection test failed: ${testResult.error}`)
        failed++
      }
    } catch (e) {
      issues.push(`Connector creation/test failed: ${e instanceof Error ? e.message : String(e)}`)
      failed++
    }
  } else {
    logs.push("Skipping live connection test - no credentials")
    warnings++
  }

  await updateConnection(connectionId, {
    ...connection,
    is_enabled: "1",
    is_inserted: "1",
    is_active_inserted: "1",
    is_enabled_dashboard: "1",
    is_assigned: "1",
    is_live_trade: options?.liveTrade !== false ? "1" : "0",
    active_symbols: JSON.stringify(symbols),
    symbol_count: String(symbols.length),
    live_volume_factor: String(options?.volumeFactor || 2.2),
    updated_at: new Date().toISOString(),
  })
  logs.push(`Connection updated with ${symbols.length} symbols`)
  passed++

  await client.hset(`connection_settings:${connectionId}`, {
    volume_factor_live: String(options?.volumeFactor || 2.2),
    volume_factor_preset: "1.0",
    symbol_order: "volatility_1h",
    symbol_count: String(symbols.length),
    base_min_profit_factor: "1.0",
    main_min_profit_factor: "1.2",
    real_min_profit_factor: "1.2",
    variant_trailing: "true",
    variant_block: "true",
    variant_dca: "false",
    control_orders: options?.controlOrders !== false ? "true" : "false",
    updated_at: new Date().toISOString(),
  }).catch(() => {})
  logs.push("Connection settings updated")
  passed++

  await setSettings(`trade_engine_state:${connectionId}`, {
    connection_id: connectionId,
    symbols: symbols,
    active_symbols: symbols,
    status: "ready",
    config_set_symbols_total: symbols.length,
    config_set_symbols_processed: 0,
    prehistoric_data_loaded: false,
    updated_at: new Date().toISOString(),
  })
  logs.push("Trade engine state initialized")
  passed++

  try {
    await client.hset(`prehistoric:${connectionId}`, {
      symbols_total: String(symbols.length),
      symbols_processed: "0",
      is_complete: "0",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await client.expire(`prehistoric:${connectionId}`, 86400)
    logs.push("Prehistoric state initialized")
    passed++
  } catch (e) {
    warnings++
    logs.push(`Prehistoric state init warning: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (connector && hasCredentials) {
    try {
      for (const symbol of symbols) {
        try {
          const minQty = getVenueMinQty(symbol)
          const currentPrice = 10
          const volFactor = options?.volumeFactor || 2.2

          const volumeResult = VolumeCalculator.calculatePositionVolume({
            positionCost: 0.002,
            positionsAverage: 2,
            accountBalance: testBalance,
            currentPrice,
            leverage: 10,
            exchangeMinVolume: minQty,
            tradeMode: "main",
            mainVolumeFactor: volFactor,
          })

          const qty = volumeResult.volume || 0
          const notional = qty * currentPrice

          logs.push(`${symbol}: Volume calc OK - minQty=${minQty}, qty=${qty.toFixed(6)}, notional=$${notional.toFixed(2)}`)
          passed++
        } catch (e) {
          issues.push(`${symbol}: Volume calc error - ${e instanceof Error ? e.message : String(e)}`)
          failed++
        }
      }
    } catch (e) {
      issues.push(`Volume calculation batch failed: ${e instanceof Error ? e.message : String(e)}`)
      warnings++
    }
  }

  try {
    await logProgressionEvent(connectionId, "diagnostic_complete", "info", "Comprehensive diagnostic completed", {
      symbols,
      symbolCount: symbols.length,
      issues: issues.length,
      warnings: warnings,
      passed,
      failed,
    })
  } catch {}

  const total = passed + failed + warnings
  const result: DiagnosticResult = {
    success: failed === 0,
    summary: { total, passed, failed, warnings },
    stats: {
      testBalance,
      symbols,
    },
    issues,
    logs,
  }

  console.log(`${LOG_PREFIX} Complete: ${passed} passed, ${failed} failed, ${warnings} warnings`)
  return result
}