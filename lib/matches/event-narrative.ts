import type { Match } from '@/lib/domain/types';
import type { SpecialEventNarrative } from '@/lib/matches/special-events';

type BuildEventNarrativeInput = {
  template_id: string;
  phase: Match['cycle_phase'];
  participant_names: string[];
  eliminated_names: string[];
  special_narrative: SpecialEventNarrative;
};

export function buildEventNarrative(input: BuildEventNarrativeInput): string {
  if (input.special_narrative?.kind === 'early_pedestal_escape') {
    if (input.special_narrative.exploded) {
      return `${input.special_narrative.leaver_name} abandona el pedestal antes de tiempo y explota.`;
    }

    return `${input.special_narrative.leaver_name} abandona el pedestal antes de tiempo, pero no explota.`;
  }

  const participantsLabel =
    input.participant_names.length === 0 ? 'sin participantes' : input.participant_names.join(', ');
  const eliminationSuffix =
    input.eliminated_names.length > 0
      ? ` Eliminados: ${input.eliminated_names.join(', ')}.`
      : ' Nadie fue eliminado.';
  return `Evento ${input.template_id} en fase ${input.phase} con ${participantsLabel}.${eliminationSuffix}`;
}
