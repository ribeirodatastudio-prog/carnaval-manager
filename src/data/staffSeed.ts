
import { StaffMember, StaffRole } from '../types/models';

// Helper to generate simple IDs
const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

// Salary Calculation Constants
// Assuming salary is per turn (week).
// Total Season Cost = Salary * 52.
// With Multipliers: Skill * 15 + Reputation * 45
// Max Legend (200/200): (3000 + 9000) = 12,000 per turn -> ~624,000 per season.
// Average Staff (100/100): (1500 + 4500) = 6,000 per turn -> ~312,000 per season.
// Newbie (50/50): (750 + 2250) = 3,000 per turn -> ~156,000 per season.
const SKILL_SALARY_MULTIPLIER = 15;
const REPUTATION_SALARY_MULTIPLIER = 45;

const calculateSalaryExpectation = (skill: number, reputation: number): number => {
  return Math.floor((skill * SKILL_SALARY_MULTIPLIER) + (reputation * REPUTATION_SALARY_MULTIPLIER));
};

/**
 * Tier S Staff - Legends of the Carnival
 * These are real-world legends with stats near the maximum (190-200).
 */
export const TIER_S_STAFF: StaffMember[] = [
  {
    id: 'staff-legend-1',
    name: 'Paulo Barros',
    role: 'Carnavalesco',
    salary: 0, // Set upon hiring
    skillLevel: 198,
    reputation: 200,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: calculateSalaryExpectation(198, 200),
  },
  {
    id: 'staff-legend-2',
    name: 'Mestre Ciça',
    role: 'MestreDeBateria',
    salary: 0,
    skillLevel: 195,
    reputation: 200,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: calculateSalaryExpectation(195, 200),
  },
  {
    id: 'staff-legend-3',
    name: 'Neguinho da Beija-Flor',
    role: 'Interprete',
    salary: 0,
    skillLevel: 195,
    reputation: 200,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: calculateSalaryExpectation(195, 200),
  },
  {
    id: 'staff-legend-4',
    name: 'Selminha Sorriso',
    role: 'MestreSalaPortaBandeira',
    salary: 0,
    skillLevel: 197,
    reputation: 200,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: calculateSalaryExpectation(197, 200),
  },
  {
    id: 'staff-legend-5',
    name: 'Claudinho',
    role: 'MestreSalaPortaBandeira',
    salary: 0,
    skillLevel: 196,
    reputation: 195,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: calculateSalaryExpectation(196, 195),
  },
  {
    id: 'staff-legend-6',
    name: 'Rosa Magalhães',
    role: 'Carnavalesco',
    salary: 0,
    skillLevel: 194,
    reputation: 198,
    contractYears: 0,
    currentSchoolId: null,
    salaryExpectation: calculateSalaryExpectation(194, 198),
  },
];

// Data for generating random names
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

const ROLES: StaffRole[] = ['Carnavalesco', 'MestreDeBateria', 'Interprete', 'MestreSalaPortaBandeira'];

/**
 * Generates a random staff member with skills in the specified range.
 * @param count Number of staff members to generate
 */
export const generateRandomStaff = (count: number): StaffMember[] => {
  const staff: StaffMember[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const role = ROLES[Math.floor(Math.random() * ROLES.length)];

    // Generate Skill (50-150)
    const skillLevel = Math.floor(Math.random() * 101) + 50;

    // Generate Reputation (Correlated with skill, but with variance)
    // Range: Skill - 20 to Skill + 20, clamped between 1 and 200
    let reputation = skillLevel + (Math.floor(Math.random() * 41) - 20);
    reputation = Math.max(1, Math.min(200, reputation));

    staff.push({
      id: generateId('staff'),
      name: `${firstName} ${lastName}`,
      role,
      salary: 0,
      skillLevel,
      reputation,
      contractYears: 0,
      currentSchoolId: null,
      salaryExpectation: calculateSalaryExpectation(skillLevel, reputation),
    });
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
