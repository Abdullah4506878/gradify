import { SkipThrottle, Throttle } from '@nestjs/throttler';

// Re-exported so call sites only need to import from here for auth-related
// throttling decorators. Use on genuinely public/unauthenticated endpoints
// that shouldn't count against the global 100 req/min limit.
export { SkipThrottle };

/**
 * Stricter rate limit for brute-force-prone auth endpoints (e.g. login):
 * 5 attempts per 15 minutes, overriding the global default throttler.
 */
export const LoginThrottle = () => Throttle({ default: { ttl: 900000, limit: 5 } });
