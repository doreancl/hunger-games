import { describe, expect, it } from 'vitest';
import { canResumeFromLocalStorage, nextTurn } from '@/lib/simulation-state';

describe('nextTurn', () => {
  it('increments turn when match is active', () => {
    const result = nextTurn({ id: 'm1', turn: 2, active: true });

    expect(result.turn).toBe(3);
    expect(result.id).toBe('m1');
    expect(result.active).toBe(true);
  });

  it('returns same state when match is not active', () => {
    const state = { id: 'm1', turn: 2, active: false };
    const result = nextTurn(state);

    expect(result).toEqual(state);
  });
});

describe('canResumeFromLocalStorage', () => {
  it('returns false for null', () => {
    expect(canResumeFromLocalStorage(null)).toBe(false);
  });

  it('returns false for invalid json', () => {
    expect(canResumeFromLocalStorage('{bad-json')).toBe(false);
  });

  it('returns false for incomplete state', () => {
    expect(canResumeFromLocalStorage(JSON.stringify({ id: 'm1', turn: 1 }))).toBe(false);
  });

  it('returns true for valid serialized state', () => {
    expect(
      canResumeFromLocalStorage(
        JSON.stringify({ id: 'm1', turn: 1, active: true })
      )
    ).toBe(true);
  });
});
