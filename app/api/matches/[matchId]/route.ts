import { NextResponse } from 'next/server';
import { getMatchStateResponseSchema } from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { getMatchState } from '@/lib/matches/lifecycle';

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const state = getMatchState(matchId);

  if (!state) {
    return jsonError('MATCH_NOT_FOUND', 'Match not found.', 404);
  }

  const parsedResponse = getMatchStateResponseSchema.safeParse(state);
  if (!parsedResponse.success) {
    return jsonError('INTERNAL_CONTRACT_ERROR', 'Response contract validation failed.', 500, {
      issues: toValidationIssues(parsedResponse.error.issues)
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
