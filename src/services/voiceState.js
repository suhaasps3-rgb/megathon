/**
 * The one state the Mentor shows at any moment. Pure, so the priority rules are tested:
 * a problem beats everything, then what the player is doing, then what the mentor is doing.
 */
export function voiceState({ listening = false, processing = false, speaking = false, error = null } = {}) {
  if (error) return 'error';
  if (listening) return 'listening';
  if (processing) return 'thinking';
  if (speaking) return 'speaking';
  return 'idle';
}
