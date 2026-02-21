
import { School, SchoolHistoryEntry, Division } from '../types/models';

const K_DECAY = 0.08;

const WEIGHTS = {
  titulo: { max: 18.0, min: 2.0 },
  vice: { max: 10.0, min: 1.0 },
  terceiro: { max: 5.5, min: 0.5 },
  quarto: { max: 3.0, min: 0.2 },
  quinto: { max: 1.5, min: 0.1 },
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

const DIVISION_FLOOR: Record<Division, number> = {
  'Grupo Especial': 50,
  'Série Ouro': 25,
  'Série Prata': 12,
  'Série Bronze': 5,
  'Grupo de Avaliação': 1,
};

// No longer using a fixed reference. We normalize against the current max raw score.
// const MAX_SCORE_REFERENCE = 287.0;

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

  // Bonus for Presence (Accumulated years) - Logarithmic
  const especialYears = school.anos_no_especial || 0;
  const accessYears = school.anos_em_acesso || 0;

  score += 2.0 * Math.log1p(especialYears);
  score += 0.5 * Math.log1p(accessYears);

  // Bonus for Current Division (Fixed base bonus)
  score += DIVISION_PRESENCE_BONUS[school.currentDivision] || 0;

  // Staff Bonus: Up to 20 points based on total reputation (was 40)
  const staffRepSum = school.staff.reduce((sum, s) => sum + s.reputation, 0);
  const staffBonus = Math.min(20, staffRepSum / 20);
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

  // 2. Sort by Raw Score Descending
  schoolsWithScore.sort((a, b) => (b.score_bruto || 0) - (a.score_bruto || 0));

  // 3. Dynamic Normalization
  // Find the maximum raw score among all schools (avoid division by zero)
  const maxRaw = Math.max(...schoolsWithScore.map(s => s.score_bruto || 0), 1);

  // 4. Normalize and Assign Prestige
  const updatedSchools = schoolsWithScore.map((school) => {
    const rawScore = school.score_bruto || 0;

    // Apply power curve (0.55) to raw score relative to the current max
    // This ensures distribution is scale-invariant
    const ratio = Math.pow(Math.max(0, rawScore) / maxRaw, 0.55);

    // Map to 0-200 scale
    const calculatedPrestige = ratio * 200;

    // Apply Division Floor
    const floor = DIVISION_FLOOR[school.currentDivision] || 1;

    // Clamp between floor and 200
    const newPrestige = Math.round(Math.max(floor, Math.min(200, calculatedPrestige)));

    return { ...school, prestige: newPrestige };
  });

  return updatedSchools;
}
