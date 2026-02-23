import { NextResponse } from 'next/server';
import {
  godModeQueueRequestSchema,
  godModeQueueResponseSchema
} from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { queueGodModeActions } from '@/lib/matches/lifecycle';
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
      return jsonError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded for god_mode.', 429, {
        issues: [
          {
            path: ['request'],
            code: 'rate_limit_exceeded',
            message: `Retry after ${rateLimit.retryAfterSeconds} seconds.`
          }
        ]
      });
    }

    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('application/json')) {
      statusCode = 415;
      return jsonError('UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.', 415);
    }

    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch {
      statusCode = 400;
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    }

    const parsedRequest = godModeQueueRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      statusCode = 400;
      return jsonError('INVALID_REQUEST_PAYLOAD', 'Invalid god_mode payload.', 400, {
        issues: toValidationIssues(parsedRequest.error.issues)
      });
    }

    const result = queueGodModeActions(matchId, parsedRequest.data.actions);
    if (!result.ok) {
      const status = result.error.code === 'MATCH_NOT_FOUND' ? 404 : 409;
      statusCode = status;
      return jsonError(result.error.code, result.error.message, status);
    }

    const parsedResponse = godModeQueueResponseSchema.safeParse(result.value);
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
      route: '/api/matches/:matchId/god-mode',
      method: 'POST',
      status_code: statusCode
    });
  }
}
