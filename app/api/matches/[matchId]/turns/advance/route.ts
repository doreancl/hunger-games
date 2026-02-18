import { NextResponse } from 'next/server';
import { advanceTurnResponseSchema } from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { validateSnapshotEnvelopeFromRawBody } from '@/lib/api/snapshot-request';
import { advanceTurn } from '@/lib/matches/lifecycle';

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const rateLimit = checkRateLimit(request, 'advance');
  if (!rateLimit.allowed) {
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
      return jsonError(
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json.',
        415
      );
    }

    const validated = validateSnapshotEnvelopeFromRawBody(rawBody);
    if (!validated.ok) {
      if (validated.reason === 'INVALID_JSON') {
        return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
      }

      if (validated.reason === 'SNAPSHOT_VERSION_UNSUPPORTED') {
        return jsonError(
          'SNAPSHOT_VERSION_UNSUPPORTED',
          'Snapshot version is incompatible with current release.',
          409
        );
      }

      if (validated.reason === 'INVALID_REQUEST_PAYLOAD') {
        return jsonError('INVALID_REQUEST_PAYLOAD', 'Invalid advance_turn payload.', 400, {
          issues: toValidationIssues(validated.issues ?? [])
        });
      }

      return jsonError('SNAPSHOT_INVALID', 'Snapshot checksum or payload is invalid.', 400);
    }

    const { matchId } = await context.params;
    if (validated.snapshot.match.id !== matchId) {
      return jsonError('SNAPSHOT_INVALID', 'Snapshot match id does not match route match id.', 400);
    }
  }

  const { matchId } = await context.params;
  const result = advanceTurn(matchId);

  if (!result.ok) {
    const status = result.error.code === 'MATCH_NOT_FOUND' ? 404 : 409;
    return jsonError(result.error.code, result.error.message, status);
  }

  const parsedResponse = advanceTurnResponseSchema.safeParse(result.value);
  if (!parsedResponse.success) {
    return jsonError('INTERNAL_CONTRACT_ERROR', 'Response contract validation failed.', 500, {
      issues: toValidationIssues(parsedResponse.error.issues)
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
