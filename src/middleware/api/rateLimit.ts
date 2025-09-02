import { NextRequest, NextResponse } from 'next/server'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (in production, use Redis or similar)
const store: RateLimitStore = {}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 60000) // Clean every minute

export function createRateLimitMiddleware(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later.'
  } = config

  return async (request: NextRequest) => {
    const key = keyGenerator(request)
    const now = Date.now()
    const resetTime = now + windowMs

    // Initialize or get existing record
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime
      }
    }

    // Check if limit exceeded
    if (store[key].count >= maxRequests) {
      const remainingTime = Math.ceil((store[key].resetTime - now) / 1000)
      
      return NextResponse.json(
        { 
          error: message,
          retryAfter: remainingTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[key].resetTime.toString(),
            'Retry-After': remainingTime.toString()
          }
        }
      )
    }

    // Increment counter
    store[key].count++

    // Add rate limit headers to response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - store[key].count).toString())
    response.headers.set('X-RateLimit-Reset', store[key].resetTime.toString())

    return response
  }
}

// Default key generator (IP-based)
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown'
  return `rate_limit:${ip}`
}

// User-based key generator
export function userKeyGenerator(request: NextRequest): string {
  const userId = request.headers.get('x-user-id') || 'anonymous'
  return `rate_limit:user:${userId}`
}

// Endpoint-based key generator
export function endpointKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown'
  const pathname = new URL(request.url).pathname
  return `rate_limit:${ip}:${pathname}`
}

// Common rate limit configurations
export const rateLimitConfigs = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later.'
  },
  
  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: endpointKeyGenerator,
    message: 'Too many authentication attempts, please try again later.'
  },
  
  // Password reset (very strict)
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyGenerator: endpointKeyGenerator,
    message: 'Too many password reset attempts, please try again later.'
  },
  
  // File uploads
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many upload attempts, please try again later.'
  },
  
  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many search requests, please try again later.'
  }
}

// Helper to create multiple rate limiters
export function createMultipleRateLimits(configs: Record<string, RateLimitConfig>) {
  const limiters = Object.entries(configs).map(([name, config]) => ({
    name,
    limiter: createRateLimitMiddleware(config)
  }))
  
  return async (request: NextRequest, limitName?: string) => {
    if (limitName) {
      const limiter = limiters.find(l => l.name === limitName)?.limiter
      if (limiter) {
        return limiter(request)
      }
    }
    
    // Apply all limiters if no specific one is requested
    for (const { limiter } of limiters) {
      const result = await limiter(request)
      if (result.status === 429) {
        return result
      }
    }
    
    return NextResponse.next()
  }
}

export default createRateLimitMiddleware