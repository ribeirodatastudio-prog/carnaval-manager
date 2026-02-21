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
