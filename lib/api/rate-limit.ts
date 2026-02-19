type RateLimitScope = 'create' | 'advance' | 'resume';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;
const RATE_LIMITS: Record<RateLimitScope, number> = {
  create: 20,
  advance: 120,
  resume: 60
};

const buckets = new Map<string, RateLimitBucket>();

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_PATTERN = /^[a-f0-9:]+$/i;

function isValidClientIp(value: string): boolean {
  if (value.includes('.')) {
    return IPV4_PATTERN.test(value);
  }

  if (value.includes(':')) {
    return IPV6_PATTERN.test(value);
  }

  return false;
}

function firstValidIp(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const found = parts.find((part) => isValidClientIp(part));
  return found ?? null;
}

function cleanupExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function enforceBucketLimit(now: number): void {
  if (buckets.size < MAX_BUCKETS) {
    return;
  }

  cleanupExpiredBuckets(now);
  if (buckets.size < MAX_BUCKETS) {
    return;
  }

  const oldest = [...buckets.entries()]
    .sort((left, right) => left[1].resetAt - right[1].resetAt)
    .slice(0, Math.ceil(MAX_BUCKETS * 0.1));
  for (const [key] of oldest) {
    buckets.delete(key);
  }
}

function keyForRequest(request: Request, scope: RateLimitScope): string {
  const clientIp =
    firstValidIp(request.headers.get('x-real-ip')) ??
    firstValidIp(request.headers.get('x-forwarded-for')) ??
    firstValidIp(request.headers.get('cf-connecting-ip'));
  const userAgent = request.headers.get('user-agent')?.trim().slice(0, 120) ?? 'unknown-agent';
  const clientId = clientIp ? `ip:${clientIp}` : `anon:${userAgent}`;
  return `${scope}:${clientId}`;
}

export function checkRateLimit(request: Request, scope: RateLimitScope): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  enforceBucketLimit(now);
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
