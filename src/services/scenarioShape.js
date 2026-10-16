const text = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * True when an AI-made scenario has everything the Game screen reads: a list of decisions, each
 * with a question and at least two choices that have text and a numeric (or missing) cost.
 * Anything else falls back to a built-in scenario instead of crashing the screen.
 */
export function isPlayableScenario(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.decisions) || s.decisions.length === 0) return false;
  return s.decisions.every((d) =>
    d && text(d.text) && Array.isArray(d.choices) && d.choices.length >= 2 &&
    d.choices.every((c) => c && text(c.text) && (c.cost === undefined || Number.isFinite(Number(c.cost)))),
  );
}
