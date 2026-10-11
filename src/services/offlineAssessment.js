/**
 * The quick read of the first question, used when there is no AI key or the AI cannot be
 * reached. Saving or growing money reads as a more advanced starting point than spending it.
 * The level feeds the Learn game's difficulty, so both paths return the same shape.
 */
export function offlineAssessment(optionId, analysis) {
  return {
    level: optionId === 'save' || optionId === 'grow' ? 6 : 3,
    analysis,
  };
}
