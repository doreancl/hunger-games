import { NextResponse } from 'next/server';
import { resumeMatchResponseSchema } from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { validateSnapshotEnvelopeFromRawBody } from '@/lib/api/snapshot-request';

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, 'resume');
  if (!rateLimit.allowed) {
    return jsonError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded for resume_match.', 429, {
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

  const rawBody = await request.text();
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
      return jsonError('INVALID_REQUEST_PAYLOAD', 'Invalid resume_match payload.', 400, {
        issues: toValidationIssues(validated.issues ?? [])
      });
    }

    return jsonError('SNAPSHOT_INVALID', 'Snapshot checksum or payload is invalid.', 400);
  }

  const snapshot = validated.snapshot;
  const responsePayload = {
    match_id: snapshot.match.id,
    phase: snapshot.match.phase,
    cycle_phase: snapshot.match.cycle_phase,
    turn_number: snapshot.match.turn_number,
    tension_level: snapshot.match.tension_level,
    settings: snapshot.settings,
    participants: snapshot.participants,
    recent_events: snapshot.recent_events
  };

  const parsedResponse = resumeMatchResponseSchema.safeParse(responsePayload);
  if (!parsedResponse.success) {
    return jsonError('INTERNAL_CONTRACT_ERROR', 'Response contract validation failed.', 500, {
      issues: toValidationIssues(parsedResponse.error.issues)
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
