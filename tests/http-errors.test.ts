import { describe, expect, it } from 'vitest';
import { jsonError, toValidationIssues } from '@/lib/api/http-errors';

describe('jsonError', () => {
  it('omits details when not provided', async () => {
    const response = jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.'
      }
    });
  });

  it('preserves typed details payload when provided', async () => {
    const response = jsonError('INVALID_REQUEST_PAYLOAD', 'Invalid payload.', 400, {
      issues: [{ path: ['settings', 'seed'], code: 'too_small', message: 'Required' }]
    });
    const body = await response.json();

    expect(body).toEqual({
      error: {
        code: 'INVALID_REQUEST_PAYLOAD',
        message: 'Invalid payload.',
        details: {
          issues: [{ path: ['settings', 'seed'], code: 'too_small', message: 'Required' }]
        }
      }
    });
  });
});

describe('toValidationIssues', () => {
  it('copies path arrays to avoid shared mutable references', () => {
    const source = [
      {
        path: ['settings', 'seed'] as (string | number)[],
        code: 'too_small',
        message: 'Required'
      }
    ];

    const mapped = toValidationIssues(source);
    source[0].path[0] = 'mutated';

    expect(mapped).toEqual([
      {
        path: ['settings', 'seed'],
        code: 'too_small',
        message: 'Required'
      }
    ]);
  });
});
