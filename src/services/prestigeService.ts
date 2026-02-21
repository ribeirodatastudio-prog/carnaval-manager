
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
  processAchievements(school.history.titulos, WEIGHTS.titulo);
  processAchievements(school.history.vices, WEIGHTS.vice);
  processAchievements(school.history.terceiros, WEIGHTS.terceiro);
  processAchievements(school.history.quartos, WEIGHTS.quarto);
  processAchievements(school.history.quintos, WEIGHTS.quinto);

  // Bonus for Presence (Accumulated years)
  score += (school.anos_no_especial * 0.4);
  score += (school.anos_em_acesso * 0.1);

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
 * Uses the normalization logic to fit scores into the 1-195 scale.
 */
export function recalculatePrestige(schools: School[], currentYear: number): School[] {
  // 1. Calculate Raw Scores
  const schoolsWithScore = schools.map(school => {
    const rawScore = calculateRawScore(school, currentYear);
    return { ...school, score_bruto: rawScore };
  });

  // 2. Sort by Raw Score Descending
  schoolsWithScore.sort((a, b) => (b.score_bruto || 0) - (a.score_bruto || 0));

  // 3. Identify References
  if (schoolsWithScore.length < 2) return schoolsWithScore; // Edge case

  // Top 2 get max prestige
  // Note: If multiple schools are tied for top 2, logic might need adjustment, but assuming floating point scores, ties are rare.
  const sRef = schoolsWithScore[1].score_bruto || 0; // 2nd highest score
  const sMin = schoolsWithScore[schoolsWithScore.length - 1].score_bruto || 0; // Lowest score

  // 4. Normalize and Assign Prestige
  const updatedSchools = schoolsWithScore.map((school, index) => {
    let newPrestige = 0;

    if (school.score_bruto && school.score_bruto >= sRef) {
      // Top 2 (or anyone higher than the 2nd place ref) gets 195
      newPrestige = 195;
    } else {
      const sAdj = (school.score_bruto || 0) - sMin;
      const denominator = sRef - sMin;

      // Avoid division by zero if all scores are equal
      const sNorm = denominator > 0 ? sAdj / denominator : 0;

      // Apply power curve (0.6)
      const ratio = Math.pow(sNorm, 0.6);

      // Calculate prestige: 1 + ratio * 187
      // Clamped between 1 and 188
      const val = 1 + (ratio * 187);
      newPrestige = Math.round(Math.max(1, Math.min(188, val)));
    }

    return { ...school, prestige: newPrestige };
  });

  return updatedSchools;
}
