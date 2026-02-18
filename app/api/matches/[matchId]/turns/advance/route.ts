import { NextResponse } from 'next/server';
import { advanceTurnResponseSchema } from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { advanceTurn } from '@/lib/matches/lifecycle';
import { recordLatencyMetric } from '@/lib/observability';

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const requestStartMs = Date.now();
  let statusCode = 500;

  try {
    const { matchId } = await context.params;
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
