import { NextResponse } from 'next/server';
import {
  createMatchRequestSchema,
  createMatchResponseSchema
} from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { createMatch } from '@/lib/matches/lifecycle';
import { recordLatencyMetric } from '@/lib/observability';

const MAX_CREATE_MATCH_REQUEST_BYTES = 16_384;

export async function POST(request: Request) {
  const requestStartMs = Date.now();
  let statusCode = 500;

  try {
    const rateLimit = checkRateLimit(request, 'create');
    if (!rateLimit.allowed) {
      statusCode = 429;
      return jsonError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded for create_match.', 429, {
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
      return jsonError(
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json.',
        415
      );
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_CREATE_MATCH_REQUEST_BYTES) {
      statusCode = 413;
      return jsonError(
        'PAYLOAD_TOO_LARGE',
        `Request body exceeds ${MAX_CREATE_MATCH_REQUEST_BYTES} bytes.`,
        413
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      statusCode = 400;
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    }

    const parsedRequest = createMatchRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      statusCode = 400;
      return jsonError('INVALID_REQUEST_PAYLOAD', 'Invalid create_match payload.', 400, {
        issues: toValidationIssues(parsedRequest.error.issues)
      });
    }

    const response = createMatch(parsedRequest.data);

    const parsedResponse = createMatchResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      statusCode = 500;
      return jsonError('INTERNAL_CONTRACT_ERROR', 'Response contract validation failed.', 500, {
        issues: toValidationIssues(parsedResponse.error.issues)
      });
    }

    statusCode = 201;
    return NextResponse.json(parsedResponse.data, { status: 201 });
  } finally {
    recordLatencyMetric('api.latency', Date.now() - requestStartMs, {
      route: '/api/matches',
      method: 'POST',
      status_code: statusCode
    });
  }
}
