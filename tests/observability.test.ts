import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  recordCounterMetric,
  recordLatencyMetric,
  recordThresholdAlert,
  resetObservabilityForTests
} from '@/lib/observability';

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

  it('supports metrics without dimensions and trims sample window', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    for (let index = 0; index < 205; index += 1) {
      recordLatencyMetric('simulation.tick', index);
    }

    const result = recordLatencyMetric('simulation.tick', -4);
    expect(result.samples).toBe(200);

    const lastLogRaw = infoSpy.mock.calls.at(-1)?.[0] as string;
    const lastLog = JSON.parse(lastLogRaw) as Record<string, unknown>;
    expect(lastLog.metric).toBe('simulation.tick');
    expect(lastLog.duration_ms).toBe(0);
    expect(lastLog.samples).toBe(200);
  });

  it('records counter metrics with cumulative totals', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const first = recordCounterMetric('catalog.invalid_version_count', 1, {
      source: 'default_catalog_bootstrap'
    });
    const second = recordCounterMetric('catalog.invalid_version_count', 2, {
      source: 'default_catalog_bootstrap'
    });

    expect(first.total).toBe(1);
    expect(second.total).toBe(3);

    const lastLogRaw = infoSpy.mock.calls.at(-1)?.[0] as string;
    const lastLog = JSON.parse(lastLogRaw) as Record<string, unknown>;
    expect(lastLog.event).toBe('metric.counter');
    expect(lastLog.metric).toBe('catalog.invalid_version_count');
    expect(lastLog.total).toBe(3);
  });

  it('triggers threshold alert only once per alert key', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const first = recordThresholdAlert('catalog.invalid_version_count.threshold', 3, 3, {
      source: 'default_catalog_bootstrap'
    });
    const second = recordThresholdAlert('catalog.invalid_version_count.threshold', 4, 3, {
      source: 'default_catalog_bootstrap'
    });

    expect(first.triggered).toBe(true);
    expect(second.triggered).toBe(false);

    const alertLogs = infoSpy.mock.calls
      .map((entry) => JSON.parse(entry[0] as string) as Record<string, unknown>)
      .filter((entry) => entry.event === 'alert.triggered');
    expect(alertLogs).toHaveLength(1);
    expect(alertLogs[0]?.alert).toBe('catalog.invalid_version_count.threshold');
  });
});
