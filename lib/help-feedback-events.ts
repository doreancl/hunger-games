export const OPEN_HELP_FEEDBACK_EVENT = 'hunger-games.open-help-feedback';

export function requestHelpFeedbackDialog(): void {
  window.dispatchEvent(new CustomEvent(OPEN_HELP_FEEDBACK_EVENT));
}
