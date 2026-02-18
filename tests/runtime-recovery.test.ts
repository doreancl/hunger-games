import { describe, expect, it } from 'vitest';
import { classifyAdvanceFailure, recoveryMessageForAdvanceFailure } from '@/lib/runtime-recovery';

describe('runtime recovery policy', () => {
  it('classifies missing server session as recoverable', () => {
    expect(classifyAdvanceFailure('Match not found.')).toBe('SESSION_LOST');
    expect(classifyAdvanceFailure('Request failed (404) for /api/matches/abc/turns/advance')).toBe(
      'SESSION_LOST'
    );
  });

  it('classifies other failures as generic', () => {
    expect(classifyAdvanceFailure('Request failed (500) for /api/matches/abc/turns/advance')).toBe(
      'GENERIC'
    );
  });

  it('builds guided recovery message for lost session', () => {
    expect(recoveryMessageForAdvanceFailure('SESSION_LOST', 'abcd1234')).toContain(
      'Sesion en vivo no disponible'
    );
    expect(recoveryMessageForAdvanceFailure('SESSION_LOST', 'abcd1234')).toContain('abcd1234');
  });
});
