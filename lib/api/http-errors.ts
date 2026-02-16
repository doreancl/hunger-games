import { NextResponse } from 'next/server';
import { apiErrorSchema } from '@/lib/domain/schemas';
import type { ApiError, ValidationIssue } from '@/lib/domain/types';

export function jsonError(
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

  return NextResponse.json(apiErrorSchema.parse(payload), { status });
}

export function toValidationIssues(
  issues: ReadonlyArray<{ path: (string | number)[]; code: string; message: string }>
): ValidationIssue[] {
  return issues.map((issue) => ({
    path: [...issue.path],
    code: issue.code,
    message: issue.message
  }));
}
