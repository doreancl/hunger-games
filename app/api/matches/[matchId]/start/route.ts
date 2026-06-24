import { NextResponse } from 'next/server';
import { UNRECOVERABLE_MATCH_MESSAGE } from '@/lib/domain/messages';
import { startMatchResponseSchema } from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { startMatchFromSnapshot } from '@/lib/matches/lifecycle';
import { validateSnapshotEnvelopeFromRawBody } from '@/lib/api/snapshot-request';
import { recordLatencyMetric } from '@/lib/observability';

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const requestStartMs = Date.now();
  let statusCode = 500;

  try {
    const { matchId } = await context.params;
    const contentType = _request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('application/json')) {
      statusCode = 415;
      return jsonError(
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json.',
        415
      );
    }

    const rawBody = await _request.text();
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
          UNRECOVERABLE_MATCH_MESSAGE,
          409
        );
      }

      if (validated.reason === 'INVALID_REQUEST_PAYLOAD') {
        statusCode = 400;
        return jsonError('INVALID_REQUEST_PAYLOAD', 'Invalid start_match payload.', 400, {
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

    const result = startMatchFromSnapshot(validated.snapshot);

    if (!result.ok) {
      const status = result.error.code === 'MATCH_NOT_FOUND' ? 404 : 409;
      statusCode = status;
      return jsonError(result.error.code, result.error.message, status);
    }

    const parsedResponse = startMatchResponseSchema.safeParse(result.value);
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
      route: '/api/matches/:matchId/start',
      method: 'POST',
      status_code: statusCode
    });
  }
}
