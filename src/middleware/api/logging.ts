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
  maxBodySize: 1024 // 1KB
}

export function createLoggingMiddleware(config: Partial<LoggingConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }
  
  return async (request: NextRequest) => {
    const startTime = Date.now()
    const requestId = generateRequestId()
    const url = new URL(request.url)
    
    // Skip logging for excluded paths
    if (finalConfig.excludePaths?.some(path => url.pathname.startsWith(path))) {
      return NextResponse.next()
    }
    
    // Extract request information
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      userId: request.headers.get('x-user-id') || undefined,
      requestId
    }
    
    // Log request
    if (finalConfig.logRequests) {
      logRequest(logEntry, request, finalConfig)
    }
    
    try {
      // Add request ID to headers for tracing
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-request-id', requestId)
      
      // Process request
      const response = NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })
      
      // Calculate response time
      const responseTime = Date.now() - startTime
      logEntry.responseTime = responseTime
      logEntry.statusCode = response.status
      
      // Add response headers
      response.headers.set('x-request-id', requestId)
      response.headers.set('x-response-time', responseTime.toString())
      
      // Log response
      if (finalConfig.logResponses) {
        logResponse(logEntry, response, finalConfig)
      }
      
      return response
      
    } catch (error) {
      // Log error
      const responseTime = Date.now() - startTime
      logEntry.responseTime = responseTime
      logEntry.error = error instanceof Error ? error.message : 'Unknown error'
      logEntry.statusCode = 500
      
      if (finalConfig.logErrors) {
        logError(logEntry, error, finalConfig)
      }
      
      // Re-throw error
      throw error
    }
  }
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Extract client IP
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

// Log request
function logRequest(logEntry: LogEntry, request: NextRequest, config: LoggingConfig) {
  const logData = {
    type: 'request',
    ...logEntry,
    headers: config.logSensitiveData ? Object.fromEntries(request.headers.entries()) : filterSensitiveHeaders(request.headers)
  }
  
  console.log(`[${logEntry.requestId}] ${logEntry.method} ${logEntry.url} - Request`, logData)
}

// Log response
function logResponse(logEntry: LogEntry, response: NextResponse, config: LoggingConfig) {
  const logData = {
    type: 'response',
    ...logEntry,
    headers: config.logSensitiveData ? Object.fromEntries(response.headers.entries()) : filterSensitiveHeaders(response.headers)
  }
  
  const level = getLogLevel(response.status)
  console[level](`[${logEntry.requestId}] ${logEntry.method} ${logEntry.url} - ${response.status} (${logEntry.responseTime}ms)`, logData)
}

// Log error
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

// Filter sensitive headers
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

// Get appropriate log level based on status code
function getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error'
  if (statusCode >= 400) return 'warn'
  return 'log'
}

// Audit logging for sensitive operations
export function auditLog(operation: string, userId: string, details: Record<string, unknown> = {}) {
  const auditEntry = {
    type: 'audit',
    timestamp: new Date().toISOString(),
    operation,
    userId,
    details,
    ip: 'server' // This would be set by the calling code
  }
  
  console.log(`[AUDIT] ${operation} by user ${userId}`, auditEntry)
}

// Security event logging
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

// Get severity level for security events
function getSeverityLevel(event: string): 'low' | 'medium' | 'high' | 'critical' {
  const highSeverityEvents = ['failed_login_attempts', 'unauthorized_access', 'privilege_escalation']
  const criticalEvents = ['data_breach', 'system_compromise', 'malicious_activity']
  
  if (criticalEvents.some(e => event.includes(e))) return 'critical'
  if (highSeverityEvents.some(e => event.includes(e))) return 'high'
  return 'medium'
}

// Performance logging
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