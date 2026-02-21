import { StaffRole, StaffSkills, RainhaArchetype } from '../types/models';

const getSalaryRange = (role: StaffRole, isElite: boolean): [number, number] => {
  switch (role) {
    case 'Carnavalesco': return isElite ? [100000, 150000] : [20000, 50000];
    case 'DiretorDeCarnaval': return isElite ? [20000, 35000] : [10000, 18000];
    case 'MestreDeBateria': return isElite ? [15000, 25000] : [8000, 12000];
    case 'Interprete': return isElite ? [20000, 30000] : [10000, 15000];
    case 'DiretorDeHarmonia': return isElite ? [10000, 15000] : [5000, 8000];
    case 'MestreSala': return isElite ? [10000, 15000] : [5000, 8000];
    case 'PortaBandeira': return isElite ? [10000, 15000] : [5000, 8000];
    case 'Coreografo': return isElite ? [10000, 15000] : [5000, 8000];
    case 'MestreDeBarracao': return isElite ? [8000, 12000] : [4000, 7000];
    case 'RainhaDeBateria': return [0, 0]; // Special handling
    default: return [2000, 5000];
  }
};

const getRandomSalary = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const calculateSalaryExpectation = (role: StaffRole, skills: StaffSkills, reputation: number, archetype?: RainhaArchetype): number => {
  if (role === 'RainhaDeBateria') {
    if (archetype === 'Celebridade' || archetype === 'PostoPago') return 0;
    if (archetype === 'CriaDaComunidade') return getRandomSalary(2000, 5000);
    return 0;
  }

  // Elite definition: Reputation > 180 AND High Skills
  // Simplification: If Reputation > 180, we consider them Elite for salary purposes
  const isElite = reputation > 180;
  const [min, max] = getSalaryRange(role, isElite);

  return getRandomSalary(min, max);
};

export const ALL_ROLES: StaffRole[] = [
  'DiretorDeCarnaval',
  'Carnavalesco',
  'Interprete',
  'MestreDeBateria',
  'MestreSala',
  'PortaBandeira',
  'RainhaDeBateria',
  'Coreografo',
  'DiretorDeHarmonia',
  'MestreDeBarracao'
];

export const generatePotential = (reputation: number): number => {
  // Roll for how much room to grow
  const roll = Math.random();
  let bonus: number;
  if (roll < 0.05) bonus = Math.floor(Math.random() * 40) + 40;      // 5% chance: hidden gem (+40 to +79)
  else if (roll < 0.20) bonus = Math.floor(Math.random() * 25) + 15;  // 15% chance: good upside (+15 to +39)
  else if (roll < 0.55) bonus = Math.floor(Math.random() * 15) + 5;   // 35% chance: modest upside (+5 to +19)
  else bonus = Math.floor(Math.random() * 5);                          // 45% chance: near-ceiling (0 to +4)

  return Math.min(200, reputation + bonus);
};

export const generateAge = (role: StaffRole): number => {
  const ranges: Record<StaffRole, [number, number]> = {
    RainhaDeBateria: [20, 38],
    MestreSala: [24, 45],
    PortaBandeira: [22, 42],
    Interprete: [28, 65],
    MestreDeBateria: [35, 75],
    Coreografo: [28, 58],
    Carnavalesco: [32, 65],
    DiretorDeCarnaval: [38, 68],
    DiretorDeHarmonia: [34, 62],
    MestreDeBarracao: [36, 65],
  };
  const [min, max] = ranges[role] || [25, 50];
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
