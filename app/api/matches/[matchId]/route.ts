import { NextResponse } from 'next/server';
import { getMatchStateResponseSchema } from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { getMatchState } from '@/lib/matches/lifecycle';
import { recordLatencyMetric } from '@/lib/observability';

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const requestStartMs = Date.now();
  let statusCode = 500;

  try {
    const { matchId } = await context.params;
    const state = getMatchState(matchId);

    if (!state) {
      statusCode = 404;
      return jsonError('MATCH_NOT_FOUND', 'Match not found.', 404);
    }

    const parsedResponse = getMatchStateResponseSchema.safeParse(state);
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
      route: '/api/matches/:matchId',
      method: 'GET',
      status_code: statusCode
    });
  }
}
