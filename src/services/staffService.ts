
import { StaffMember, Division, StaffAchievement, StaffRole, School } from '../types/models';

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

// Per-role retirement configuration
const RETIREMENT_CONFIG: Record<StaffRole, { startAge: number; certainAge: number }> = {
  // Physical performance roles — retire young
  RainhaDeBateria:   { startAge: 35, certainAge: 45 },
  MestreSala:        { startAge: 42, certainAge: 55 },
  PortaBandeira:     { startAge: 40, certainAge: 52 },

  // Artistic/vocal roles — moderate career length
  Interprete:        { startAge: 55, certainAge: 75 },
  Coreografo:        { startAge: 50, certainAge: 65 },

  // Technical/craft/leadership roles — long careers
  Carnavalesco:      { startAge: 60, certainAge: 80 },
  DiretorDeCarnaval: { startAge: 62, certainAge: 82 },
  DiretorDeHarmonia: { startAge: 60, certainAge: 78 },
  MestreDeBarracao:  { startAge: 60, certainAge: 78 },

  // Legendary endurance — Mestres de Bateria can go forever
  MestreDeBateria:   { startAge: 65, certainAge: 90 },
};

export function processRetirements(
  allStaff: StaffMember[]
): { remaining: StaffMember[]; retired: StaffMember[] } {
  const remaining: StaffMember[] = [];
  const retired: StaffMember[] = [];

  for (const member of allStaff) {
    const age = member.age;
    const config = RETIREMENT_CONFIG[member.role];

    // If no config or age undefined (fallback), just age them
    if (!config || age === undefined) {
      remaining.push({ ...member, age: (age || 0) + 1 });
      continue;
    }

    if (age < config.startAge) {
      // Age staff by 1 year each season
      remaining.push({ ...member, age: age + 1 });
      continue;
    }

    // Linear retirement probability: 0% at startAge, 100% at certainAge
    const progress = Math.min(1, (age - config.startAge) / (config.certainAge - config.startAge));
    const retirementChance = progress;

    if (Math.random() < retirementChance) {
      retired.push(member);
    } else {
      remaining.push({ ...member, age: age + 1 });
    }
  }

  return { remaining, retired };
}

export function processStaffDevelopment(
  staff: StaffMember[],
  carnavalScore: number, // 0-100
  school?: School
): { updatedStaff: StaffMember[]; updates: string[] } {
    const updates: string[] = [];
    const updatedStaff = staff.map(member => {
    // Skip real staff (no potential defined) and already-maxed staff
    if (member.potential === undefined) return member;
    if (member.reputation >= member.potential) return member;

    // Base growth chance: better carnival = better development environment
    // carnavalScore 0 = 5% chance, carnavalScore 100 = 40% chance
    let baseChance = 0.05 + (carnavalScore / 100) * 0.35;

    // Feature 1: Revelacao Bonus (Staff Development)
    if (school?.archetype === 'Revelacao') {
        baseChance *= 1.3;
    }

    // Gap bonus: staff far from their potential grow faster (hunger/drive)
    const gap = member.potential - member.reputation;
    const gapBonus = Math.min(0.15, gap / 200); // Up to +15% if very far from potential

    const growthChance = Math.min(0.55, baseChance + gapBonus);

    if (Math.random() < growthChance) {
      // Growth amount: 1-5 reputation points, more if far from potential
      const maxGrowth = Math.min(gap, Math.max(1, Math.floor(gap / 10)));
      const growth = Math.floor(Math.random() * maxGrowth) + 1;
      const newReputation = Math.min(member.potential, member.reputation + growth);

      updates.push(`${member.name} (${member.role}) developed +${growth} reputation.`);

      return { ...member, reputation: newReputation };
    }

    return member;
  });

  return { updatedStaff, updates };
}

export function getPotentialDescriptor(reputation: number, potential: number | undefined): string {
    if (potential === undefined) return "Real/Legacy"; // Real staff

    const gap = potential - reputation;

    if (gap > 40) return "Joia Bruta";
    if (gap > 20) return "Promissor";
    if (gap > 5) return "Talento Limitado"; // Or "Em Evolução"
    return "Consolidado";
}
