import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, resetRateLimitsForTests } from '@/lib/api/rate-limit';

describe('rate limit isolation', () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it('isolates counters by scope for the same client', () => {
    const request = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': '203.0.113.10' }
    });

    for (let index = 0; index < 20; index += 1) {
      expect(checkRateLimit(request, 'create').allowed).toBe(true);
    }

    expect(checkRateLimit(request, 'create').allowed).toBe(false);
    expect(checkRateLimit(request, 'resume').allowed).toBe(true);
  });

  it('isolates counters by client for the same scope', () => {
    const requestA = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': '203.0.113.10' }
    });
    const requestB = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': '203.0.113.11' }
    });

    for (let index = 0; index < 20; index += 1) {
      expect(checkRateLimit(requestA, 'create').allowed).toBe(true);
    }

    expect(checkRateLimit(requestA, 'create').allowed).toBe(false);
    expect(checkRateLimit(requestB, 'create').allowed).toBe(true);
  });

  it('resets bucket after the window expires', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);

    const request = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': '203.0.113.99' }
    });

    for (let index = 0; index < 20; index += 1) {
      expect(checkRateLimit(request, 'create').allowed).toBe(true);
    }

    expect(checkRateLimit(request, 'create').allowed).toBe(false);

    nowSpy.mockReturnValue(62_000);
    const afterReset = checkRateLimit(request, 'create');
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.retryAfterSeconds).toBe(0);
  });

  it('does not trust malformed forwarded headers as distinct clients', () => {
    const requestA = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': 'not-an-ip' }
    });
    const requestB = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': 'still-not-an-ip' }
    });

    for (let index = 0; index < 20; index += 1) {
      expect(checkRateLimit(requestA, 'create').allowed).toBe(true);
    }

    expect(checkRateLimit(requestB, 'create').allowed).toBe(false);
  });

  it('does not accept pseudo IPv6 values as valid distinct clients', () => {
    const requestA = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': 'dead:beef' }
    });
    const requestB = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': '::::' }
    });

    for (let index = 0; index < 20; index += 1) {
      expect(checkRateLimit(requestA, 'create').allowed).toBe(true);
    }

    expect(checkRateLimit(requestB, 'create').allowed).toBe(false);
  });

  it('evicts expired buckets when bucket store is full', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);

    for (let index = 0; index < 10_000; index += 1) {
      const ip = `203.${Math.floor(index / 65_536)}.${Math.floor(index / 256) % 256}.${index % 256}`;
      const request = new Request('http://localhost/api/matches', {
        headers: { 'x-forwarded-for': ip }
      });
      checkRateLimit(request, 'create');
      checkRateLimit(request, 'advance');
      checkRateLimit(request, 'resume');
    }

    nowSpy.mockReturnValue(70_000);
    const freshRequest = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': '198.51.100.1' }
    });
    const result = checkRateLimit(freshRequest, 'create');
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);

    nowSpy.mockRestore();
  });

  it('prunes oldest buckets when full and none are expired', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(5_000);

    for (let index = 0; index < 10_000; index += 1) {
      const request = new Request('http://localhost/api/matches', {
        headers: { 'x-forwarded-for': `198.51.${Math.floor(index / 255)}.${index % 255}` }
      });
      checkRateLimit(request, 'create');
    }

    const triggerRequest = new Request('http://localhost/api/matches', {
      headers: { 'x-forwarded-for': '192.0.2.99' }
    });
    const result = checkRateLimit(triggerRequest, 'create');
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);

    nowSpy.mockRestore();
  });
});
