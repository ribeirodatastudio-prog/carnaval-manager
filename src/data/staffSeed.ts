
import { StaffMember, StaffRole, StaffSkills, RainhaArchetype } from '../types/models';

// Helper to generate simple IDs
const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

const ROLES: StaffRole[] = [
  'DiretorDeCarnaval',
  'Carnavalesco',
  'Interprete',
  'MestreDeBateria',
  'RainhaDeBateria',
  'Coreografo',
  'DiretorDeHarmonia',
  'MestreDeBarracao',
];

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

// Helper to calculate average of primary skills (used for reference, not strictly salary anymore)
const getPrimarySkillValue = (role: StaffRole, skills: StaffSkills): number => {
  switch (role) {
    case 'Carnavalesco':
      return (skills.criatividade * 0.6) + (skills.plastica * 0.4);
    case 'MestreDeBateria':
      return (skills.ritmica * 0.7) + (skills.lideranca * 0.3);
    case 'Interprete':
      return (skills.ritmica * 0.4) + (skills.expressaoCorporal * 0.3) + (skills.fama * 0.3);
    case 'MestreSala':
    case 'PortaBandeira':
      return (skills.expressaoCorporal * 0.5) + (skills.plastica * 0.3) + (skills.ritmica * 0.2);
    case 'RainhaDeBateria':
      return (skills.fama * 0.6) + (skills.expressaoCorporal * 0.4);
    case 'Coreografo':
      return (skills.expressaoCorporal * 0.5) + (skills.criatividade * 0.5);
    case 'DiretorDeCarnaval':
      return (skills.gestaoDeRecursos * 0.4) + (skills.lideranca * 0.3) + (skills.logistica * 0.3);
    case 'DiretorDeHarmonia':
      return (skills.lideranca * 0.4) + (skills.ritmica * 0.3) + (skills.logistica * 0.3);
    case 'MestreDeBarracao':
      return (skills.logistica * 0.5) + (skills.gestaoDeRecursos * 0.3) + (skills.plastica * 0.2);
    default:
      return 100;
  }
};

const calculateSalaryExpectation = (role: StaffRole, skills: StaffSkills, reputation: number, archetype?: RainhaArchetype): number => {
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

const generateSkills = (baseLevel: number): StaffSkills => {
  const variance = () => Math.floor(Math.random() * 21) - 10; // -10 to +10
  const clamp = (val: number) => Math.max(1, Math.min(200, val));

  return {
    plastica: clamp(baseLevel + variance()),
    ritmica: clamp(baseLevel + variance()),
    expressaoCorporal: clamp(baseLevel + variance()),
    lideranca: clamp(baseLevel + variance()),
    criatividade: clamp(baseLevel + variance()),
    resiliencia: clamp(baseLevel + variance()),
    logistica: clamp(baseLevel + variance()),
    gestaoDeRecursos: clamp(baseLevel + variance()),
    fama: clamp(baseLevel + variance()),
  };
};

/**
 * Tier S Staff - Legends of the Carnival
 */
export const TIER_S_STAFF: StaffMember[] = [
  {
    id: 'staff-legend-1',
    name: 'Paulo Barros',
    role: 'Carnavalesco' as StaffRole,
    salary: 0,
    skills: { ...generateSkills(198), criatividade: 200, plastica: 198 },
    reputation: 200,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: 0, // Calculated below
  },
  {
    id: 'staff-legend-2',
    name: 'Mestre Ciça',
    role: 'MestreDeBateria' as StaffRole,
    salary: 0,
    skills: { ...generateSkills(195), ritmica: 200, lideranca: 195 },
    reputation: 200,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: 0,
  },
  {
    id: 'staff-legend-3',
    name: 'Neguinho da Beija-Flor',
    role: 'Interprete' as StaffRole,
    salary: 0,
    skills: { ...generateSkills(195), ritmica: 198, fama: 200, expressaoCorporal: 190 },
    reputation: 200,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: 0,
  },
  {
    id: 'staff-legend-4',
    name: 'Selminha Sorriso',
    role: 'PortaBandeira' as StaffRole,
    salary: 0,
    skills: { ...generateSkills(197), expressaoCorporal: 200, plastica: 195 },
    reputation: 200,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: 0,
    partnerId: 'staff-legend-5',
    synergy: 100,
  },
  {
    id: 'staff-legend-5',
    name: 'Claudinho',
    role: 'MestreSala' as StaffRole,
    salary: 0,
    skills: { ...generateSkills(196), expressaoCorporal: 198, plastica: 195 },
    reputation: 195,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: 0,
    partnerId: 'staff-legend-4',
    synergy: 100,
  },
  {
    id: 'staff-legend-6',
    name: 'Rosa Magalhães',
    role: 'Carnavalesco' as StaffRole,
    salary: 0,
    skills: { ...generateSkills(194), criatividade: 195, plastica: 198, resiliencia: 190 },
    reputation: 198,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: 0,
  },
].map(staff => ({
  ...staff,
  salaryExpectation: calculateSalaryExpectation(staff.role, staff.skills, staff.reputation)
}));

const FIRST_NAMES = [
  'Carlos', 'João', 'Pedro', 'Lucas', 'Mateus', 'Gabriel', 'Rafael', 'Felipe', 'Bruno', 'Thiago',
  'Ana', 'Maria', 'Julia', 'Beatriz', 'Fernanda', 'Camila', 'Larissa', 'Amanda', 'Bruna', 'Mariana',
  'Jorge', 'Luiz', 'Antônio', 'José', 'Francisco', 'Paulo', 'Roberto', 'Marcos', 'Ricardo', 'Eduardo'
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
  'Nascimento', 'Medeiros', 'Moura', 'Dias', 'Castro', 'Pinto', 'Cardoso', 'Marques', 'Teixeira', 'Mendes'
];

const getRandomName = () => {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
};

/**
 * Generates a random staff member with skills in the specified range.
 * @param count Number of staff members to generate
 */
export const generateRandomStaff = (count: number): StaffMember[] => {
  const staff: StaffMember[] = [];

  for (let i = 0; i < count; i++) {
    // 20% chance to generate a couple if we still need staff
    const generateCouple = Math.random() < 0.2;

    if (generateCouple) {
      // Create MestreSala
      const msId = generateId('staff-ms');
      const pbId = generateId('staff-pb');
      // Division 1 average: 160-180
      const baseSkill = Math.floor(Math.random() * 21) + 160;
      const synergy = Math.floor(Math.random() * 50) + 50; // 50-100 synergy

      const msName = getRandomName();
      const msSkills = generateSkills(baseSkill);
      let msRep = baseSkill + (Math.floor(Math.random() * 21) - 10);
      msRep = Math.max(1, Math.min(200, msRep));

      staff.push({
        id: msId,
        name: msName,
        role: 'MestreSala',
        salary: 0,
        skills: msSkills,
        reputation: msRep,
        contractYears: 0,
        currentSchoolId: null,
        salaryExpectation: calculateSalaryExpectation('MestreSala', msSkills, msRep),
        partnerId: pbId,
        synergy,
      });

      // Create PortaBandeira
      const pbName = getRandomName();
      const pbSkills = generateSkills(baseSkill);
      let pbRep = baseSkill + (Math.floor(Math.random() * 21) - 10);
      pbRep = Math.max(1, Math.min(200, pbRep));

      staff.push({
        id: pbId,
        name: pbName,
        role: 'PortaBandeira',
        salary: 0,
        skills: pbSkills,
        reputation: pbRep,
        contractYears: 0,
        currentSchoolId: null,
        salaryExpectation: calculateSalaryExpectation('PortaBandeira', pbSkills, pbRep),
        partnerId: msId,
        synergy,
      });

      if (staff.length >= count) break;
      i++;

    } else {
      // Single staff
      const role = ROLES[Math.floor(Math.random() * ROLES.length)];
      // Division 1 average: 160-180
      const baseSkill = Math.floor(Math.random() * 21) + 160;
      const skills = generateSkills(baseSkill);
      let reputation = baseSkill + (Math.floor(Math.random() * 21) - 10);
      reputation = Math.max(1, Math.min(200, reputation));

      let archetype: RainhaArchetype | undefined;
      if (role === 'RainhaDeBateria') {
        const rand = Math.random();
        if (rand < 0.2) archetype = 'Celebridade'; // Rare
        else if (rand < 0.6) archetype = 'PostoPago'; // Common
        else archetype = 'CriaDaComunidade'; // Common

        // Adjust stats/reputation based on archetype
        if (archetype === 'Celebridade') {
          reputation = Math.max(180, reputation); // High rep
          skills.fama = Math.max(180, skills.fama);
        } else if (archetype === 'PostoPago') {
          // Penalize stats slightly
          skills.ritmica = Math.max(1, skills.ritmica - 20);
          skills.expressaoCorporal = Math.max(1, skills.expressaoCorporal - 20);
        }
        // Community has normal stats but low cost
      }

      staff.push({
        id: generateId('staff'),
        name: getRandomName(),
        role,
        salary: 0,
        skills,
        reputation,
        contractYears: 0,
        currentSchoolId: null,
        salaryExpectation: calculateSalaryExpectation(role, skills, reputation, archetype),
        archetype,
      });
    }

    if (staff.length >= count) break;
  }

  return staff;
};

/**
 * Combines legends and random staff to create the initial market pool.
 */
export const INITIAL_MARKET_STAFF = [
  ...TIER_S_STAFF,
  ...generateRandomStaff(30)
];
