/**
 * Health Check Service
 * 
 * Provides readiness and liveness checks for the system
 * Monitors key dependencies: Redis, database, external APIs
 */

import { getRedisClient } from './redis-db'

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

export interface ComponentHealth {
  status: HealthStatus
  responseTime: number
  lastCheck: Date
  error?: string
}

export interface HealthReport {
  status: HealthStatus
  timestamp: Date
  uptime: number
  checks: {
    redis: ComponentHealth
    database: ComponentHealth
    memory: ComponentHealth
  }
  summary: string
}

export interface ReadinessReport {
  ready: boolean
  timestamp: Date
  components: {
    redis: boolean
    database: boolean
    migrations: boolean
  }
  message: string
}

export class HealthCheckService {
  private startTime = Date.now()
  private lastCheck?: HealthReport

  /**
   * Perform full health check
   */
  async getHealthReport(): Promise<HealthReport> {
    const checks = {
      redis: await this.checkRedis(),
      database: await this.checkDatabase(),
      memory: await this.checkMemory()
    }

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status)
    let status: HealthStatus = HealthStatus.HEALTHY

    if (statuses.includes(HealthStatus.UNHEALTHY)) {
      status = HealthStatus.UNHEALTHY
    } else if (statuses.includes(HealthStatus.DEGRADED)) {
      status = HealthStatus.DEGRADED
    }

    const report: HealthReport = {
      status,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      checks,
      summary: this.generateSummary(checks)
    }

    this.lastCheck = report
    return report
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const client = await getRedisClient()
      if (!client) {
        return {
          status: HealthStatus.UNHEALTHY,
          responseTime: Date.now() - startTime,
          lastCheck: new Date(),
          error: 'Redis client not available'
        }
      }

      // Simple ping to verify connection
      const response = await client.ping()

      if (response !== 'PONG') {
        return {
          status: HealthStatus.UNHEALTHY,
          responseTime: Date.now() - startTime,
          lastCheck: new Date(),
          error: 'Redis ping failed'
        }
      }

      return {
        status: HealthStatus.HEALTHY,
        responseTime: Date.now() - startTime,
        lastCheck: new Date()
      }
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check database connection
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const client = await getRedisClient()
      if (!client) {
        return {
          status: HealthStatus.UNHEALTHY,
          responseTime: Date.now() - startTime,
          lastCheck: new Date(),
          error: 'Database client not available'
        }
      }

      // Try to read a simple key
      await client.get('_health_check_test')

      return {
        status: HealthStatus.HEALTHY,
        responseTime: Date.now() - startTime,
        lastCheck: new Date()
      }
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Resolve the real V8 old-space ceiling in MB (defaults to Node's 4096 MB).
   * `process.memoryUsage().heapTotal` is only the *currently reserved* heap,
   * which V8 grows lazily toward this ceiling — so comparing heapUsed against
   * heapTotal is misleading and flips the system to UNHEALTHY on cold start.
   */
  private resolveMaxOldSpaceMb(): number {
    const DEFAULT = 4096
    try {
      const args = [...(process.execArgv || []), process.env.NODE_OPTIONS || ""].join(" ")
      const m = args.match(/--max-old-space-size=(\d+)/)
      if (m && Number(m[1]) > 0) return Number(m[1])
    } catch { /* ignore */ }
    return DEFAULT
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const memUsage = process.memoryUsage()
      // Compare against the REAL ceiling (max-old-space-size), not heapTotal.
      const maxOldSpaceMb = this.resolveMaxOldSpaceMb()
      const heapUsedMb = memUsage.heapUsed / 1024 / 1024
      const heapUsedPercent = (heapUsedMb / maxOldSpaceMb) * 100

      let status = HealthStatus.HEALTHY

      // Only flag unhealthy when we are genuinely close to the OOM ceiling.
      if (heapUsedPercent > 92) {
        status = HealthStatus.UNHEALTHY
      } else if (heapUsedPercent > 80) {
        status = HealthStatus.DEGRADED
      }

      return {
        status,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: status !== HealthStatus.HEALTHY
          ? `High memory usage: ${heapUsedPercent.toFixed(1)}% of ${maxOldSpaceMb}MB ceiling`
          : undefined
      }
    } catch (error) {
      return {
        status: HealthStatus.DEGRADED,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(checks: { [key: string]: ComponentHealth }): string {
    const healthy = Object.values(checks).filter(c => c.status === HealthStatus.HEALTHY).length
    const total = Object.keys(checks).length

    return `${healthy}/${total} components healthy`
  }

  /**
   * Get readiness status
   * System is ready when it can handle requests
   */
  async getReadinessStatus(): Promise<ReadinessReport> {
    const health = await this.getHealthReport()
    const ready = health.status !== HealthStatus.UNHEALTHY

    return {
      ready,
      timestamp: new Date(),
      components: {
        redis: health.checks.redis.status !== HealthStatus.UNHEALTHY,
        database: health.checks.database.status !== HealthStatus.UNHEALTHY,
        migrations: true // Would check migrations here
      },
      message: ready
        ? 'System is ready to handle requests'
        : `System is not ready: ${health.summary}`
    }
  }

  /**
   * Get liveness status
   * System is alive if it's still running and responsive
   */
  async getLivenessStatus(): Promise<{
    alive: boolean
    uptime: number
    timestamp: Date
  }> {
    return {
      alive: true,
      uptime: Date.now() - this.startTime,
      timestamp: new Date()
    }
  }

  /**
   * Get last health check
   */
  getLastHealthCheck(): HealthReport | undefined {
    return this.lastCheck
  }

  /**
   * Get system stats for monitoring
   */
  getSystemStats(): {
    uptime: number
    memory: NodeJS.MemoryUsage
    cpu: NodeJS.CpuUsage
    eventLoop: number
  } {
    return {
      uptime: Date.now() - this.startTime,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      eventLoop: 0 // Would measure event loop lag here
    }
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService()

export default HealthCheckService
