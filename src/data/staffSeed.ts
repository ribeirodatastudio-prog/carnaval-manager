
import { StaffMember, StaffRole, StaffSkills } from '../types/models';

// Helper to generate simple IDs
const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

// Salary Calculation Constants
const SKILL_SALARY_MULTIPLIER = 15;
const REPUTATION_SALARY_MULTIPLIER = 45;

const ROLES: StaffRole[] = [
  'DiretorDeCarnaval',
  'Carnavalesco',
  'Interprete',
  'MestreDeBateria',
  'RainhaDeBateria',
  'Coreografo',
  'DiretorDeHarmonia',
  'MestreDeBarracao',
  // MS and PB are handled separately for coupling
];

const COUPLE_ROLES = ['MestreSala', 'PortaBandeira'];

// Helper to calculate average of primary skills
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

const calculateSalaryExpectation = (role: StaffRole, skills: StaffSkills, reputation: number): number => {
  const primarySkillVal = getPrimarySkillValue(role, skills);
  return Math.floor((primarySkillVal * SKILL_SALARY_MULTIPLIER) + (reputation * REPUTATION_SALARY_MULTIPLIER));
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
    fama: clamp(baseLevel + variance()), // Reputation might be different from fame skill, but keeping them related
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
      const baseSkill = Math.floor(Math.random() * 101) + 50;
      const synergy = Math.floor(Math.random() * 50) + 50; // 50-100 synergy

      const msName = getRandomName();
      const msSkills = generateSkills(baseSkill);
      let msRep = baseSkill + (Math.floor(Math.random() * 41) - 20);
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
      const pbSkills = generateSkills(baseSkill); // Similar skill level
      let pbRep = baseSkill + (Math.floor(Math.random() * 41) - 20);
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

      // We added 2 staff
      // If loop counter increment is just i++, we effectively skip one iteration count if we increment i here
      // But actually, we just added 2 items. The loop condition is based on `i < count`.
      // We should increment i an extra time, or just let the loop run and maybe exceed count slightly or handle it.
      // Better to check staff.length
      if (staff.length >= count) break;
      i++; // Skip next iteration count

    } else {
      // Single staff
      const role = ROLES[Math.floor(Math.random() * ROLES.length)];
      const baseSkill = Math.floor(Math.random() * 101) + 50;
      const skills = generateSkills(baseSkill);
      let reputation = baseSkill + (Math.floor(Math.random() * 41) - 20);
      reputation = Math.max(1, Math.min(200, reputation));

      staff.push({
        id: generateId('staff'),
        name: getRandomName(),
        role,
        salary: 0,
        skills,
        reputation,
        contractYears: 0,
        currentSchoolId: null,
        salaryExpectation: calculateSalaryExpectation(role, skills, reputation),
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
  ...generateRandomStaff(30) // Generating 30 random staff members to fill the market
];
