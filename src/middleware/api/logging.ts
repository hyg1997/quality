import { NextRequest, NextResponse } from 'next/server'
export interface LogEntry {
  timestamp: string
  method: string
  url: string
  ip: string
  userAgent: string
  userId?: string
  statusCode?: number
  responseTime?: number
  error?: string
  requestId: string
}
export interface LoggingConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  logRequests: boolean
  logResponses: boolean
  logErrors: boolean
  logSensitiveData: boolean
  excludePaths?: string[]
  includeRequestBody?: boolean
  includeResponseBody?: boolean
  maxBodySize?: number
}
const defaultConfig: LoggingConfig = {
  logLevel: 'info',
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logSensitiveData: false,
  excludePaths: ['/health', '/favicon.ico'],
  includeRequestBody: false,
  includeResponseBody: false,
  maxBodySize: 1024
}
export function createLoggingMiddleware(config: Partial<LoggingConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }
  return async (request: NextRequest) => {
    const startTime = Date.now()
    const requestId = generateRequestId()
    const url = new URL(request.url)
    if (finalConfig.excludePaths?.some(path => url.pathname.startsWith(path))) {
      return NextResponse.next()
    }
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      userId: request.headers.get('x-user-id') || undefined,
      requestId
    }
    if (finalConfig.logRequests) {
      logRequest(logEntry, request, finalConfig)
    }
    try {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-request-id', requestId)
      const response = NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })
      const responseTime = Date.now() - startTime
      logEntry.responseTime = responseTime
      logEntry.statusCode = response.status
      response.headers.set('x-request-id', requestId)
      response.headers.set('x-response-time', responseTime.toString())
      if (finalConfig.logResponses) {
        logResponse(logEntry, response, finalConfig)
      }
      return response
    } catch (error) {
      const responseTime = Date.now() - startTime
      logEntry.responseTime = responseTime
      logEntry.error = error instanceof Error ? error.message : 'Unknown error'
      logEntry.statusCode = 500
      if (finalConfig.logErrors) {
        logError(logEntry, error, finalConfig)
      }
      throw error
    }
  }
}
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  return (
    cfConnectingIp ||
    (forwarded ? forwarded.split(',')[0].trim() : null) ||
    realIp ||
    'unknown'
  )
}
function logRequest(logEntry: LogEntry, request: NextRequest, config: LoggingConfig) {
  const logData = {
    type: 'request',
    ...logEntry,
    headers: config.logSensitiveData ? Object.fromEntries(request.headers.entries()) : filterSensitiveHeaders(request.headers)
  }
  console.log(`[${logEntry.requestId}] ${logEntry.method} ${logEntry.url} - Request`, logData)
}
function logResponse(logEntry: LogEntry, response: NextResponse, config: LoggingConfig) {
  const logData = {
    type: 'response',
    ...logEntry,
    headers: config.logSensitiveData ? Object.fromEntries(response.headers.entries()) : filterSensitiveHeaders(response.headers)
  }
  const level = getLogLevel(response.status)
  console[level](`[${logEntry.requestId}] ${logEntry.method} ${logEntry.url} - ${response.status} (${logEntry.responseTime}ms)`, logData)
}
function logError(logEntry: LogEntry, error: unknown, config: LoggingConfig) {
  const logData = {
    type: 'error',
    ...logEntry,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: config.logLevel === 'debug' ? error.stack : undefined
    } : error
  }
  console.error(`[${logEntry.requestId}] ${logEntry.method} ${logEntry.url} - ERROR (${logEntry.responseTime}ms)`, logData)
}
function filterSensitiveHeaders(headers: Headers): Record<string, string> {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token'
  ]
  const filtered: Record<string, string> = {}
  headers.forEach((value, key) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      filtered[key] = '[REDACTED]'
    } else {
      filtered[key] = value
    }
  })
  return filtered
}
function getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error'
  if (statusCode >= 400) return 'warn'
  return 'log'
}
export function auditLog(operation: string, userId: string, details: Record<string, unknown> = {}) {
  const auditEntry = {
    type: 'audit',
    timestamp: new Date().toISOString(),
    operation,
    userId,
    details,
    ip: 'server' 
  }
  console.log(`[AUDIT] ${operation} by user ${userId}`, auditEntry)
}
export function securityLog(event: string, details: Record<string, unknown> = {}) {
  const securityEntry = {
    type: 'security',
    timestamp: new Date().toISOString(),
    event,
    details,
    severity: getSeverityLevel(event)
  }
  console.warn(`[SECURITY] ${event}`, securityEntry)
}
function getSeverityLevel(event: string): 'low' | 'medium' | 'high' | 'critical' {
  const highSeverityEvents = ['failed_login_attempts', 'unauthorized_access', 'privilege_escalation']
  const criticalEvents = ['data_breach', 'system_compromise', 'malicious_activity']
  if (criticalEvents.some(e => event.includes(e))) return 'critical'
  if (highSeverityEvents.some(e => event.includes(e))) return 'high'
  return 'medium'
}
export function performanceLog(operation: string, duration: number, metadata: Record<string, unknown> = {}) {
  const perfEntry = {
    type: 'performance',
    timestamp: new Date().toISOString(),
    operation,
    duration,
    metadata
  }
  const level = duration > 1000 ? 'warn' : 'log'
  console[level](`[PERF] ${operation} took ${duration}ms`, perfEntry)
}
export default createLoggingMiddleware