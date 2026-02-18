import { NextResponse } from 'next/server';
import { advanceTurnResponseSchema } from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { validateSnapshotEnvelopeFromRawBody } from '@/lib/api/snapshot-request';
import { advanceTurn } from '@/lib/matches/lifecycle';
import { recordLatencyMetric } from '@/lib/observability';

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requestStartMs = Date.now();
  let statusCode = 500;

  try {
    const { matchId } = await context.params;
    const rateLimit = checkRateLimit(request, 'advance');
    if (!rateLimit.allowed) {
      statusCode = 429;
      return jsonError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded for advance_turn.', 429, {
        issues: [
          {
            path: ['request'],
            code: 'rate_limit_exceeded',
            message: `Retry after ${rateLimit.retryAfterSeconds} seconds.`
          }
        ]
      });
    }

    const rawBody = await request.text();
    if (rawBody.trim() !== '') {
      const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.includes('application/json')) {
        statusCode = 415;
        return jsonError(
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json.',
          415
        );
      }

      const validated = validateSnapshotEnvelopeFromRawBody(rawBody);
      if (!validated.ok) {
        if (validated.reason === 'INVALID_JSON') {
          statusCode = 400;
          return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
        }

        if (validated.reason === 'SNAPSHOT_VERSION_UNSUPPORTED') {
          statusCode = 409;
          return jsonError(
            'SNAPSHOT_VERSION_UNSUPPORTED',
            'Snapshot version is incompatible with current release.',
            409
          );
        }

        if (validated.reason === 'INVALID_REQUEST_PAYLOAD') {
          statusCode = 400;
          return jsonError('INVALID_REQUEST_PAYLOAD', 'Invalid advance_turn payload.', 400, {
            issues: toValidationIssues(validated.issues ?? [])
          });
        }

        statusCode = 400;
        return jsonError('SNAPSHOT_INVALID', 'Snapshot checksum or payload is invalid.', 400);
      }

      if (validated.snapshot.match.id !== matchId) {
        statusCode = 400;
        return jsonError('SNAPSHOT_INVALID', 'Snapshot match id does not match route match id.', 400);
      }
    }

    const result = advanceTurn(matchId);

    if (!result.ok) {
      const status = result.error.code === 'MATCH_NOT_FOUND' ? 404 : 409;
      statusCode = status;
      return jsonError(result.error.code, result.error.message, status);
    }

    const parsedResponse = advanceTurnResponseSchema.safeParse(result.value);
    if (!parsedResponse.success) {
      statusCode = 500;
      return jsonError('INTERNAL_CONTRACT_ERROR', 'Response contract validation failed.', 500, {
        issues: toValidationIssues(parsedResponse.error.issues)
      });
    }

    statusCode = 200;
    return NextResponse.json(parsedResponse.data, { status: 200 });
  } finally {
    recordLatencyMetric('api.latency', Date.now() - requestStartMs, {
      route: '/api/matches/:matchId/turns/advance',
      method: 'POST',
      status_code: statusCode
    });
  }
}
