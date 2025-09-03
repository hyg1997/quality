import { NextRequest, NextResponse } from 'next/server'
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
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
const store: RateLimitStore = {}
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 60000)
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
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime
      }
    }
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
    store[key].count++
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - store[key].count).toString())
    response.headers.set('X-RateLimit-Reset', store[key].resetTime.toString())
    return response
  }
}
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown'
  return `rate_limit:${ip}`
}
export function userKeyGenerator(request: NextRequest): string {
  const userId = request.headers.get('x-user-id') || 'anonymous'
  return `rate_limit:user:${userId}`
}
export function endpointKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown'
  const pathname = new URL(request.url).pathname
  return `rate_limit:${ip}:${pathname}`
}
export const rateLimitConfigs = {
  general: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later.'
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: endpointKeyGenerator,
    message: 'Too many authentication attempts, please try again later.'
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyGenerator: endpointKeyGenerator,
    message: 'Too many password reset attempts, please try again later.'
  },
  upload: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Too many upload attempts, please try again later.'
  },
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Too many search requests, please try again later.'
  }
}
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