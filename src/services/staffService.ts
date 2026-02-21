
import { StaffMember, Division, StaffAchievement } from '../types/models';

const K_DECAY = 0.04;

const WEIGHTS = {
  Title: {
    'Grupo Especial': 18.0,
    'Série Ouro': 4.5, // 25% of Special
    'Série Prata': 1.125,
    'Série Bronze': 0.28,
    'Grupo de Avaliação': 0.07,
  },
  Vice: {
    'Grupo Especial': 10.0,
    'Série Ouro': 2.5,
    'Série Prata': 0.625,
    'Série Bronze': 0.15,
    'Grupo de Avaliação': 0.04,
  },
  Estandarte: 9.0, // Half of Special Title
  Nota10: 9.0, // Half of Special Title
};

/**
 * Calculates the reputation (1-200) for a staff member based on their achievements.
 */
export function calculateStaffReputation(staff: StaffMember, currentYear: number): number {
  if (!staff.achievements || staff.achievements.length === 0) {
    // Fallback: If no achievements, return existing reputation or a base value based on skills
    // For now, we return the existing reputation if it exists, otherwise calculate from skills
    if (staff.reputation) return staff.reputation;

    // Simple skill-based fallback (average of all skills)
    const skills = Object.values(staff.skills);
    const avgSkill = skills.reduce((a, b) => a + b, 0) / skills.length;
    return Math.round(avgSkill);
  }

  let rawScore = 0;

  for (const ach of staff.achievements) {
    let weight = 0;
    const division = ach.division || 'Grupo Especial';

    // Determine Base Weight
    if (ach.type === 'Title') {
      weight = WEIGHTS.Title[division] || 0;
    } else if (ach.type === 'Vice') {
      weight = WEIGHTS.Vice[division] || 0;
    } else if (ach.type === 'Estandarte') {
      weight = WEIGHTS.Estandarte;
    } else if (ach.type === 'Nota10') {
      weight = WEIGHTS.Nota10;
    }

    // Apply Decay or Count Multiplier
    if (ach.year) {
      const delta = currentYear - ach.year;
      if (delta >= 0) {
        // Decay formula: Weight * exp(-k * delta)
        const decayedWeight = weight * Math.exp(-K_DECAY * delta);
        // If count is present (e.g. "3 Estandartes in 2020"), multiply by count. Default to 1.
        const count = ach.count || 1;
        rawScore += decayedWeight * count;
      }
    } else {
      // Undated Achievement (e.g. "15 Titles")
      // Treat as full value * count
      // This is very powerful, as requested.
      const count = ach.count || 1;
      rawScore += weight * count;
    }
  }

  // Normalize Score to 1-200
  // Reference: Neguinho (15 titles * 18 = 270) should be 200.
  // Reference: Average winner (1 title recently = 18) should be decent, maybe 120-130 base?
  // Actually, staff reputation in this game is 1-200. 180+ is elite.
  // 15 titles is absurdly high (Legend).
  // Let's use a similar normalization to schools, but simpler.

  // Max expected raw score for a legend ~300.
  // Min useful score ~10.

  // Linear scaling?
  // If raw > 250 -> 200.
  // If raw < 10 -> Base skill level?

  // Let's add a base reputation derived from current skills (e.g., 100-150 range)
  // because a newbie with 0 titles shouldn't have 0 reputation, they have skill.
  const skillsList = Object.values(staff.skills);
  const avgSkill = skillsList.reduce((a, b) => a + b, 0) / skillsList.length;

  // Base reputation is roughly their skill level.
  // Achievements ADD to this reputation.
  // But we cap at 200.

  // Weighting:
  // Let's say a Title (18 pts) adds ~5-10 reputation points?
  // If base is 160 (good staff), +1 title -> 170.
  // If base is 180 (elite), +1 title -> 185.

  // If we just add rawScore to avgSkill?
  // 160 + 18 = 178.
  // Neguinho: 180 (Skill) + 270 (Titles) = 450 -> Cap at 200.

  let finalRep = avgSkill + (rawScore * 0.5); // Tune this multiplier

  // Ensure strict 1-200 range
  return Math.round(Math.max(1, Math.min(200, finalRep)));
}
