export type AdvanceFailureKind = 'SESSION_LOST' | 'GENERIC';

export function classifyAdvanceFailure(message: string): AdvanceFailureKind {
  if (message.includes('Match not found') || message.includes('Request failed (404)')) {
    return 'SESSION_LOST';
  }

  return 'GENERIC';
}

export function recoveryMessageForAdvanceFailure(
  kind: AdvanceFailureKind,
  shortMatchId: string
): string {
  if (kind === 'SESSION_LOST') {
    return `Sesion en vivo no disponible (${shortMatchId}). Se recupero el setup local; reinicia para continuar.`;
  }

  return 'No fue posible avanzar la simulacion.';
}
