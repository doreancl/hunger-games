import { NextResponse } from 'next/server';
import {
  apiErrorSchema,
  createMatchRequestSchema,
  createMatchResponseSchema
} from '@/lib/domain/schemas';
import type {
  ApiError,
  CreateMatchResponse,
  ValidationIssue
} from '@/lib/domain/types';

function jsonError(
  code: ApiError['error']['code'],
  message: string,
  status: number,
  details?: ApiError['error']['details']
) {
  const payload: ApiError = {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details })
    }
  };

  const safePayload = apiErrorSchema.parse(payload);
  return NextResponse.json(safePayload, { status });
}

function toValidationIssues(issues: ReadonlyArray<{ path: (string | number)[]; code: string; message: string }>): ValidationIssue[] {
  return issues.map((issue) => ({
    path: [...issue.path],
    code: issue.code,
    message: issue.message
  }));
}

export async function POST(request: Request) {
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

  const response: CreateMatchResponse = {
    match_id: crypto.randomUUID(),
    phase: 'setup'
  };

  const parsedResponse = createMatchResponseSchema.safeParse(response);
  if (!parsedResponse.success) {
    return jsonError('INTERNAL_CONTRACT_ERROR', 'Response contract validation failed.', 500, {
      issues: toValidationIssues(parsedResponse.error.issues)
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 201 });
}
