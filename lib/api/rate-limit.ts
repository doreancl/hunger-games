type RateLimitScope = 'create' | 'advance' | 'resume';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const RATE_LIMITS: Record<RateLimitScope, number> = {
  create: 20,
  advance: 120,
  resume: 60
};

const buckets = new Map<string, RateLimitBucket>();

function keyForRequest(request: Request, scope: RateLimitScope): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientId = forwardedFor?.split(',')[0]?.trim() || 'anonymous';
  return `${scope}:${clientId}`;
}

export function checkRateLimit(request: Request, scope: RateLimitScope): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const key = keyForRequest(request, scope);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= RATE_LIMITS[scope]) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
