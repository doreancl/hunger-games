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
});
