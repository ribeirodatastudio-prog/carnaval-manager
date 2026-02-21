
import { School, SchoolHistoryEntry, Division } from '../types/models';

const K_DECAY = 0.04;

const WEIGHTS = {
  titulo: { max: 18.0, min: 6.0 },
  vice: { max: 10.0, min: 3.5 },
  terceiro: { max: 5.5, min: 2.0 },
  quarto: { max: 3.0, min: 1.0 },
  quinto: { max: 1.5, min: 0.5 },
};

const DIVISION_MULTIPLIERS: Record<Division, number> = {
  'Grupo Especial': 1.0,
  'Série Ouro': 0.25,
  'Série Prata': 0.0625,
  'Série Bronze': 0.015,
  'Grupo de Avaliação': 0.004,
};

const DIVISION_PRESENCE_BONUS: Record<Division, number> = {
  'Grupo Especial': 0, // Calculated separately via anos_no_especial
  'Série Ouro': 3.0,
  'Série Prata': 1.5,
  'Série Bronze': 0.8,
  'Grupo de Avaliação': 0.3,
};

// Based on current Mangueira/Beija-Flor scores (approx 275) mapping to 195.
// Formula: (Score / MAX_REFERENCE)^0.6 * 200 = 195
// => 275 / MAX_REFERENCE = (195/200)^(1/0.6) = 0.975^1.666 = 0.958
// => MAX_REFERENCE = 275 / 0.958 = 287
const MAX_SCORE_REFERENCE = 287.0;

/**
 * Calculates the raw score for a single school based on its history and current status.
 */
export function calculateRawScore(school: School, currentYear: number): number {
  let score = 0;

  // Helper to process a list of achievements
  const processAchievements = (entries: SchoolHistoryEntry[], weightConfig: { max: number; min: number }) => {
    for (const entry of entries) {
      const delta = currentYear - entry.ano;
      if (delta < 0) continue; // Should not happen in valid history

      // Weight decay formula
      const weight = weightConfig.min + (weightConfig.max - weightConfig.min) * Math.exp(-K_DECAY * delta);

      // Division multiplier
      const mult = DIVISION_MULTIPLIERS[entry.divisao] || 0;

      score += weight * mult;
    }
  };

  // Process all history categories
  if (school.history) {
    processAchievements(school.history.titulos || [], WEIGHTS.titulo);
    processAchievements(school.history.vices || [], WEIGHTS.vice);
    processAchievements(school.history.terceiros || [], WEIGHTS.terceiro);
    processAchievements(school.history.quartos || [], WEIGHTS.quarto);
    processAchievements(school.history.quintos || [], WEIGHTS.quinto);
  }

  // Bonus for Presence (Accumulated years)
  score += ((school.anos_no_especial || 0) * 0.4);
  score += ((school.anos_em_acesso || 0) * 0.1);

  // Bonus for Current Division (Fixed base bonus)
  score += DIVISION_PRESENCE_BONUS[school.currentDivision] || 0;

  // Staff Bonus: Up to 40 points based on total reputation
  const staffRepSum = school.staff.reduce((sum, s) => sum + s.reputation, 0);
  const staffBonus = Math.min(40, staffRepSum / 10);
  score += staffBonus;

  return score;
}

/**
 * Recalculates prestige for all schools and updates them in place (or returns new objects).
 * Uses a purely meritocratic logic based on raw score, capped at 200.
 */
export function recalculatePrestige(schools: School[], currentYear: number): School[] {
  // 1. Calculate Raw Scores
  const schoolsWithScore = schools.map(school => {
    const rawScore = calculateRawScore(school, currentYear);
    return { ...school, score_bruto: rawScore };
  });

  // 2. Sort by Raw Score Descending (for consistent ordering if needed elsewhere, though prestige calculation is independent now)
  schoolsWithScore.sort((a, b) => (b.score_bruto || 0) - (a.score_bruto || 0));

  // 3. Normalize and Assign Prestige
  const updatedSchools = schoolsWithScore.map((school) => {
    const rawScore = school.score_bruto || 0;

    // Apply power curve (0.6) to raw score relative to reference max
    // Ensures distribution is similar to previous logic but without artificial pinning
    const ratio = Math.pow(Math.max(0, rawScore) / MAX_SCORE_REFERENCE, 0.6);

    // Map to 0-200 scale
    const calculatedPrestige = ratio * 200;

    // Clamp between 1 and 200
    // We allow reaching 200 if score >= MAX_SCORE_REFERENCE
    const newPrestige = Math.round(Math.max(1, Math.min(200, calculatedPrestige)));

    return { ...school, prestige: newPrestige };
  });

  return updatedSchools;
}
