import { NextResponse } from 'next/server';
import { startMatchResponseSchema } from '@/lib/domain/schemas';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';
import { startMatch } from '@/lib/matches/lifecycle';

type RouteContext = {
  params: Promise<{ matchId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const result = startMatch(matchId);

  if (!result.ok) {
    const status = result.error.code === 'MATCH_NOT_FOUND' ? 404 : 409;
    return jsonError(result.error.code, result.error.message, status);
  }

  const parsedResponse = startMatchResponseSchema.safeParse(result.value);
  if (!parsedResponse.success) {
    return jsonError('INTERNAL_CONTRACT_ERROR', 'Response contract validation failed.', 500, {
      issues: toValidationIssues(parsedResponse.error.issues)
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
