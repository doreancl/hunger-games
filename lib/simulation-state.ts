export type MatchState = {
  id: string;
  turn: number;
  active: boolean;
};

export function nextTurn(state: MatchState): MatchState {
  if (!state.active) {
    return state;
  }

  return {
    ...state,
    turn: state.turn + 1
  };
}

export function canResumeFromLocalStorage(raw: string | null): boolean {
  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MatchState>;
    return (
      typeof parsed.id === 'string' &&
      typeof parsed.turn === 'number' &&
      typeof parsed.active === 'boolean'
    );
  } catch {
    return false;
  }
}
