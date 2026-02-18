import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordLatencyMetric, resetObservabilityForTests } from '@/lib/observability';

describe('observability metrics', () => {
  afterEach(() => {
    resetObservabilityForTests();
    vi.restoreAllMocks();
  });

  it('records latency metrics with p95 evidence', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    recordLatencyMetric('api.latency', 10, { route: '/api/matches', method: 'POST' });
    recordLatencyMetric('api.latency', 40, { route: '/api/matches', method: 'POST' });
    const result = recordLatencyMetric('api.latency', 100, {
      route: '/api/matches',
      method: 'POST'
    });

    expect(result.samples).toBe(3);
    expect(result.p95_ms).toBe(100);

    const lastLogRaw = infoSpy.mock.calls.at(-1)?.[0] as string;
    const lastLog = JSON.parse(lastLogRaw) as Record<string, unknown>;
    expect(lastLog.event).toBe('metric.latency');
    expect(lastLog.metric).toBe('api.latency');
    expect(lastLog.p95_ms).toBe(100);
    expect(lastLog.samples).toBe(3);
    expect(lastLog.unit).toBe('ms');
  });
});
