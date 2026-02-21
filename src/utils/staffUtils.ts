import { StaffRole, StaffSkills, RainhaArchetype, Division } from '../types/models';
import { getProLevelForDivision } from './helpers';

// Base Salary Ranges by Role and Division (Min, Max)
const SALARY_RANGES: Record<StaffRole, Record<Division, [number, number]>> = {
  Carnavalesco: {
    'Grupo Especial': [20000, 150000],
    'Série Ouro': [8000, 40000],
    'Série Prata': [2000, 12000],
    'Série Bronze': [500, 3000],
    'Grupo de Avaliação': [0, 1000],
  },
  MestreDeBateria: {
    'Grupo Especial': [15000, 25000],
    'Série Ouro': [5000, 15000],
    'Série Prata': [1500, 6000],
    'Série Bronze': [300, 1500],
    'Grupo de Avaliação': [0, 500],
  },
  DiretorDeCarnaval: {
    'Grupo Especial': [10000, 35000],
    'Série Ouro': [4000, 15000],
    'Série Prata': [0, 3000],
    'Série Bronze': [0, 0],
    'Grupo de Avaliação': [0, 0],
  },
  Interprete: {
    'Grupo Especial': [10000, 30000],
    'Série Ouro': [3000, 12000],
    'Série Prata': [500, 3000],
    'Série Bronze': [0, 500],
    'Grupo de Avaliação': [0, 0],
  },
  DiretorDeHarmonia: {
    'Grupo Especial': [5000, 15000],
    'Série Ouro': [1000, 6000],
    'Série Prata': [0, 1500],
    'Série Bronze': [0, 0],
    'Grupo de Avaliação': [0, 0],
  },
  MestreDeBarracao: {
    'Grupo Especial': [4000, 12000],
    'Série Ouro': [1000, 5000],
    'Série Prata': [0, 2000],
    'Série Bronze': [0, 0],
    'Grupo de Avaliação': [0, 0],
  },
  Coreografo: {
    'Grupo Especial': [5000, 15000],
    'Série Ouro': [1500, 6000],
    'Série Prata': [0, 1000],
    'Série Bronze': [0, 0],
    'Grupo de Avaliação': [0, 0],
  },
  MestreSala: {
    'Grupo Especial': [5000, 15000],
    'Série Ouro': [500, 4000],
    'Série Prata': [0, 800],
    'Série Bronze': [0, 0],
    'Grupo de Avaliação': [0, 0],
  },
  PortaBandeira: {
    'Grupo Especial': [5000, 15000],
    'Série Ouro': [500, 4000],
    'Série Prata': [0, 800],
    'Série Bronze': [0, 0],
    'Grupo de Avaliação': [0, 0],
  },
  RainhaDeBateria: {
    'Grupo Especial': [0, 0], // Handled specially
    'Série Ouro': [0, 0],
    'Série Prata': [0, 0],
    'Série Bronze': [0, 0],
    'Grupo de Avaliação': [0, 0],
  },
};

// Skill ranges per division to help with linear interpolation (approximate rep range)
const REP_RANGES: Record<Division, { min: number; max: number }> = {
  'Grupo Especial': { min: 95, max: 145 }, // Standard generation range, elite goes to 200
  'Série Ouro': { min: 75, max: 120 },
  'Série Prata': { min: 55, max: 100 },
  'Série Bronze': { min: 35, max: 80 },
  'Grupo de Avaliação': { min: 15, max: 60 },
};

const getRandomSalary = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const calculateSalaryExpectation = (
  role: StaffRole,
  skills: StaffSkills,
  reputation: number,
  division: Division,
  archetype?: RainhaArchetype
): number => {
  // Rainha Special Logic
  if (role === 'RainhaDeBateria') {
    if (archetype === 'Celebridade' || archetype === 'PostoPago') return 0;

    // Cria da Comunidade logic
    if (division === 'Grupo Especial') {
      return getRandomSalary(2000, 5000);
    } else if (division === 'Série Ouro') {
      return getRandomSalary(500, 2000);
    } else {
      return 0; // Volunteer below Ouro
    }
  }

  const [min, max] = SALARY_RANGES[role][division];

  // If role is volunteer for this division
  if (min === 0 && max === 0) return 0;

  // Use defined reputation ranges for the division to interpolate salary
  const { min: repMin, max: repMax } = REP_RANGES[division];

  // Extend max rep range for Grupo Especial to account for elite staff (up to 200)
  const effectiveRepMax = division === 'Grupo Especial' ? 180 : repMax;

  // Calculate position in the range (0 to 1)
  const repFraction = Math.max(0, Math.min(1, (reputation - repMin) / (effectiveRepMax - repMin)));

  // Linear interpolation
  const salary = Math.floor(min + repFraction * (max - min));

  // Add some small variance (+/- 10%)
  const variance = (Math.random() * 0.2) + 0.9; // 0.9 to 1.1

  return Math.floor(salary * variance);
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
