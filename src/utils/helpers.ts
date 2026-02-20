
/**
 * Converts the internal skill value (1-200) to a display value (1-20).
 *
 * Logic:
 * - Returns 1 for values 1-19.
 * - Returns Math.floor(value / 10) for values >= 20.
 * - Caps at 20 (so 200 returns 20).
 *
 * @param internalSkill - The internal skill level (1-200).
 * @returns The display skill level (1-20).
 */
export const getDisplaySkill = (internalSkill: number): number => {
  if (internalSkill < 20) {
    return 1;
  }
  const displaySkill = Math.floor(internalSkill / 10);
  return Math.min(displaySkill, 20);
};
