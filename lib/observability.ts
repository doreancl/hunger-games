export type TelemetryValue = string | number | boolean | null;
export type TelemetryDimensions = Record<string, TelemetryValue>;

const LATENCY_SERIES_LIMIT = 200;
const latencySeriesByMetric = new Map<string, number[]>();

function roundedMilliseconds(value: number): number {
  return Math.max(0, Math.round(value * 100) / 100);
}

function stableKey(metric: string, dimensions?: TelemetryDimensions): string {
  if (!dimensions) {
    return metric;
  }

  const entries = Object.entries(dimensions).sort(([left], [right]) => left.localeCompare(right));
  return `${metric}|${entries.map(([key, value]) => `${key}:${String(value)}`).join('|')}`;
}

function percentile95(samples: number[]): number {
  const ordered = [...samples].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(ordered.length * 0.95) - 1);
  return ordered[index] ?? 0;
}

export function emitStructuredLog(event: string, payload: TelemetryDimensions): void {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...payload
    })
  );
}

export function recordLatencyMetric(
  metric: string,
  durationMs: number,
  dimensions?: TelemetryDimensions
): { p95_ms: number; samples: number } {
  const key = stableKey(metric, dimensions);
  const current = latencySeriesByMetric.get(key) ?? [];
  current.push(roundedMilliseconds(durationMs));

  if (current.length > LATENCY_SERIES_LIMIT) {
    current.splice(0, current.length - LATENCY_SERIES_LIMIT);
  }

  latencySeriesByMetric.set(key, current);

  const p95 = roundedMilliseconds(percentile95(current));
  emitStructuredLog('metric.latency', {
    metric,
    duration_ms: roundedMilliseconds(durationMs),
    p95_ms: p95,
    samples: current.length,
    unit: 'ms',
    ...dimensions
  });

  return {
    p95_ms: p95,
    samples: current.length
  };
}

export function resetObservabilityForTests(): void {
  latencySeriesByMetric.clear();
}
