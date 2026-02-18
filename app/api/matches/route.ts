import { NextResponse } from 'next/server';
import {
  createMatchRequestSchema,
  createMatchResponseSchema
} from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { createMatch } from '@/lib/matches/lifecycle';

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, 'create');
  if (!rateLimit.allowed) {
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
    return jsonError(
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json.',
      415
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const parsedRequest = createMatchRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return jsonError('INVALID_REQUEST_PAYLOAD', 'Invalid create_match payload.', 400, {
      issues: toValidationIssues(parsedRequest.error.issues)
    });
  }

  const response = createMatch(parsedRequest.data);

  const parsedResponse = createMatchResponseSchema.safeParse(response);
  if (!parsedResponse.success) {
    return jsonError('INTERNAL_CONTRACT_ERROR', 'Response contract validation failed.', 500, {
      issues: toValidationIssues(parsedResponse.error.issues)
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 201 });
}
