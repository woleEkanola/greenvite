import 'server-only'
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  interval?: number
  limit?: number
}

export function rateLimit(key: string, options: RateLimitOptions = {}): { success: boolean; remaining: number; resetTime: number } {
  const { interval = 60_000, limit = 10 } = options
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + interval })
    return { success: true, remaining: limit - 1, resetTime: now + interval }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, resetTime: entry.resetTime }
}

const interval = 3 * 60 * 1000 // 3 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, interval).unref()
