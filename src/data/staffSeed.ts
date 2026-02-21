
import { StaffMember, StaffRole, StaffSkills, RainhaArchetype } from '../types/models';
import { GENERIC_MARKET_POOL } from './genericStaffSeed';
import { calculateSalaryExpectation, generateAge, generatePotential } from '../utils/staffUtils';

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
  age: generateAge(staff.role),
  potential: generatePotential(staff.reputation),
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

  const clampTo160 = (val: number) => Math.min(160, val);

  for (let i = 0; i < count; i++) {
    // 20% chance to generate a couple if we still need staff
    const generateCouple = Math.random() < 0.2;

    if (generateCouple) {
      // Create MestreSala
      const msId = generateId('staff-ms');
      const pbId = generateId('staff-pb');
      // Cap base skill at 155 to ensure < 160 even with variance
      const baseSkill = Math.floor(Math.random() * 16) + 140; // 140-155
      const synergy = Math.floor(Math.random() * 50) + 50; // 50-100 synergy

      const msName = getRandomName();
      const msSkills = generateSkills(baseSkill);
      // Strict clamp
      (Object.keys(msSkills) as Array<keyof StaffSkills>).forEach(k => msSkills[k] = clampTo160(msSkills[k]));

      let msRep = baseSkill + (Math.floor(Math.random() * 21) - 10);
      msRep = Math.max(1, Math.min(160, msRep));

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
        age: generateAge('MestreSala'),
        potential: generatePotential(msRep)
      });

      // Create PortaBandeira
      const pbName = getRandomName();
      const pbSkills = generateSkills(baseSkill);
      (Object.keys(pbSkills) as Array<keyof StaffSkills>).forEach(k => pbSkills[k] = clampTo160(pbSkills[k]));

      let pbRep = baseSkill + (Math.floor(Math.random() * 21) - 10);
      pbRep = Math.max(1, Math.min(160, pbRep));

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
        age: generateAge('PortaBandeira'),
        potential: generatePotential(pbRep)
      });

      if (staff.length >= count) break;
      i++;

    } else {
      // Single staff
      const role = ROLES[Math.floor(Math.random() * ROLES.length)];
      const baseSkill = Math.floor(Math.random() * 16) + 140; // 140-155
      const skills = generateSkills(baseSkill);
      (Object.keys(skills) as Array<keyof StaffSkills>).forEach(k => skills[k] = clampTo160(skills[k]));

      let reputation = baseSkill + (Math.floor(Math.random() * 21) - 10);
      reputation = Math.max(1, Math.min(160, reputation));

      let archetype: RainhaArchetype | undefined;
      if (role === 'RainhaDeBateria') {
        const rand = Math.random();
        if (rand < 0.2) archetype = 'Celebridade'; // Rare
        else if (rand < 0.6) archetype = 'PostoPago'; // Common
        else archetype = 'CriaDaComunidade'; // Common

        // Adjust stats/reputation based on archetype
        if (archetype === 'Celebridade') {
          // Even celebrities generated here shouldn't exceed 160 significantly if at all, but let's allow small bump or cap
          reputation = Math.min(160, Math.max(150, reputation));
          skills.fama = Math.min(160, Math.max(150, skills.fama));
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
        age: generateAge(role),
        potential: generatePotential(reputation)
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
  ...generateRandomStaff(30),
  ...GENERIC_MARKET_POOL.map(s => ({
      ...s,
      potential: s.potential || generatePotential(s.reputation),
      age: s.age || generateAge(s.role) // Override/Fill
  }))
];
