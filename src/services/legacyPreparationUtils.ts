
import { ProductionTrack, School, StaffSkills } from '../types/models';

export const RECOMMENDED_BURN: Record<string, Record<ProductionTrack, number>> = {
  'Grupo Especial': { Alegorias: 45000, Fantasias: 25000, Bateria: 15000, Harmonia: 15000 },
  'Série Ouro':     { Alegorias: 8000,  Fantasias: 4000,  Bateria: 2500,  Harmonia: 2500  },
  'Série Prata':    { Alegorias: 2200,  Fantasias: 1200,  Bateria: 800,   Harmonia: 800   },
  'Série Bronze':   { Alegorias: 650,   Fantasias: 350,   Bateria: 250,   Harmonia: 250   },
  'Grupo de Avaliação': { Alegorias: 165, Fantasias: 85,  Bateria: 65,    Harmonia: 65    },
};

export const WEEKLY_RECOMMENDED_SPEND: Record<string, Record<'BiWeekly' | 'RetaFinal', number>> = {
  'Grupo Especial':     { BiWeekly: 85000,  RetaFinal: 120000 },
  'Série Ouro':         { BiWeekly: 16000,  RetaFinal: 22000  },
  'Série Prata':        { BiWeekly: 5000,   RetaFinal: 7000   },
  'Série Bronze':       { BiWeekly: 1400,   RetaFinal: 2000   },
  'Grupo de Avaliação': { BiWeekly: 380,    RetaFinal: 550    },
};

export const STAFF_ACTION_POOL: any = {}; // Placeholder if needed

export function estimatedAlegoriaProgressPerWeek(burnRate: number, division: string): number {
  const RECOMMENDED: Record<string, number> = {
    'Grupo Especial': 45000, 'Série Ouro': 8000, 'Série Prata': 2200,
    'Série Bronze': 650, 'Grupo de Avaliação': 165,
  };
  const rec = RECOMMENDED[division] ?? 1000;
  const budgetMult = Math.min(1.5, burnRate / (rec * 1.5));
  return ((60 / 200) * 5 + 2) * budgetMult; // Uses avg logistica=60
}

export function calculateRangeWidth(trackName: ProductionTrack, school: School): number {
  const trackStaff: Record<ProductionTrack, { role: string; skill: keyof StaffSkills }> = {
    Alegorias: { role: 'MestreDeBarracao',   skill: 'logistica' },
    Fantasias: { role: 'DiretorDeCarnaval',  skill: 'gestaoDeRecursos' },
    Bateria:   { role: 'MestreDeBateria',    skill: 'lideranca' },
    Harmonia:  { role: 'DiretorDeHarmonia',  skill: 'logistica' },
  };

  const { role, skill } = trackStaff[trackName];
  const staffMember = school.staff.find(s => s.role === role);
  const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');

  const primarySkill = staffMember ? (staffMember.skills as any)[skill] : 0;
  const carnavalescoBonus = carnavalesco ? carnavalesco.skills.gestaoDeRecursos / 200 : 0;

  const precision = Math.min(1.0, (primarySkill / 200) * 0.7 + carnavalescoBonus * 0.3);
  const halfRange = Math.round(7 - precision * 6); // 1 to 7
  return halfRange;
}

export function calculateTrackQuality(
  track: ProductionTrack,
  school: School,
  focused: boolean,
  staffMember: any
): number {
  let base = 40 + (school.prestige / 200) * 30; // 40–70 based on prestige
  if (staffMember) {
    const rep = staffMember.reputation;
    base += (rep / 200) * 20; // +0–20 based on reputation
  }
  if (focused) base += 5;

  if (track === 'Alegorias' && school.preparation) {
      const bonus = school.preparation.tracks.Alegorias.carCountBonus || 0;
      base += bonus;
  }

  // Removed reference to qualityCeilingBonus since it was deleted from models
  const ceilingBonus = 0;

  return Math.min(100 + ceilingBonus, Math.floor(base));
}

export function chooseAlegoriaCarCount(school: School, count: number): any {
  if (!school.preparation) throw new Error("No preparation state");
  const prep = { ...school.preparation };
  const division = school.currentDivision;

  const limits = {
    'Grupo Especial': { min: 5, max: 8 },
    'Série Ouro': { min: 3, max: 6 },
    'Série Prata': { min: 2, max: 5 },
    'Série Bronze': { min: 1, max: 4 },
    'Grupo de Avaliação': { min: 1, max: 3 },
  }[division] || { min: 1, max: 3 };

  if (count < limits.min || count > limits.max) {
    throw new Error(`Invalid car count for ${division}. Must be between ${limits.min} and ${limits.max}.`);
  }

  const carCountBonus = Math.max(0, count - limits.min) * 8;
  const burnRateMultiplier = 1 + Math.max(0, count - limits.min) * 0.15;

  prep.alegoriaCarCount = count;
  prep.tracks = { ...prep.tracks };
  prep.tracks.Alegorias = {
    ...prep.tracks.Alegorias,
    carCountBonus,
    // weeklyBurnRate no longer directly exists on TrackState in the same way, but budgetAllocated does.
    // This logic needs to be adapted or removed if burn rate is fully replaced by PP cost.
    // For legacy compat or initial setup we can keep it if used.
  };

  return prep;
}
