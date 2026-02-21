
// types/models.ts

/**
 * StaffRole defines the key roles in a Samba School.
 * These are the main positions that the player can hire and manage.
 */
export type StaffRole =
  | 'DiretorDeCarnaval'
  | 'Carnavalesco'
  | 'Interprete'
  | 'MestreDeBateria'
  | 'MestreSala'
  | 'PortaBandeira'
  | 'RainhaDeBateria'
  | 'Coreografo'
  | 'DiretorDeHarmonia'
  | 'MestreDeBarracao';

/**
 * StaffSkills defines the granular skill set for a staff member.
 * All skills are evaluated internally from 1 to 200.
 */
export interface StaffSkills {
  // Technical
  plastica: number;
  ritmica: number;
  expressaoCorporal: number;

  // Mental
  lideranca: number;
  criatividade: number;
  resiliencia: number;

  // Organizational/Other
  logistica: number;
  gestaoDeRecursos: number;
  fama: number; // Mainly for Rainha
}

/**
 * Archetypes for Rainha de Bateria.
 */
export type RainhaArchetype = 'Celebridade' | 'PostoPago' | 'CriaDaComunidade';

/**
 * Represents a specific achievement in a staff member's career.
 */
export interface StaffAchievement {
  type: 'Title' | 'Vice' | 'Estandarte' | 'Nota10';
  year?: number; // If year is unknown, it's a generic count
  division?: Division; // Defaults to Grupo Especial if not specified
  count?: number; // For "15 titles", count = 15
}

/**
 * StaffMember represents an individual hired by a Samba School.
 * Each staff member has specific skills and costs associated with them.
 */
export interface StaffMember {
  id: string; // Unique identifier for the staff member
  name: string; // Full name of the staff member
  role: StaffRole; // The specific role they fulfill in the school
  salary: number; // The cost per turn/season for this staff member (actual contracted salary)
  skills: StaffSkills; // Detailed skill breakdown
  contractYears: number; // Number of years remaining on their contract
  currentSchoolId: string | null; // The ID of the school they currently work for, or null if free agent
  salaryExpectation: number; // The salary they expect when negotiating a new contract
  reputation: number; // The fame/prestige of the staff member (1-200), heavily influences salary expectation
  partnerId?: string; // ID of the partner (for MestreSala/PortaBandeira couples)
  synergy?: number; // Synergy level for couples (1-100 or similar scale, TBD)
  archetype?: RainhaArchetype; // Specific archetype for Rainha de Bateria
  age: number; // Age of the staff member
  potential?: number; // Maximum reputation ceiling (1-200) for generated staff

  // Historical Data
  historyText?: string; // "Cargos Históricos" (e.g., "Mangueira (2016-22), Imperatriz (2023-24)")
  achievements?: StaffAchievement[]; // Structured achievements for reputation calculation
}

/**
 * Represents a transfer offer made by a school to a staff member.
 */
export interface TransferOffer {
  id: string;
  fromSchoolId: string;
  toStaffId: string;
  offeredSalary: number;
  contractYears: number;        // 1, 2, or 3
  weekMade: number;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Countered';
  counterSalary?: number;
  counterYears?: number;
}

/**
 * EnredoCategory defines the thematic classification of an Enredo.
 */
export type EnredoCategory = 'History' | 'Culture' | 'Abstract' | 'Political' | 'Religious';

/**
 * Enredo represents the theme (Samba-Enredo) chosen by a school for the year.
 * A good Enredo is crucial for high scores in multiple categories.
 */
export interface Enredo {
  id: string; // Unique identifier for the Enredo
  title: string; // The title of the theme
  category: EnredoCategory; // The thematic category
  complexity: number; // How difficult the theme is to execute (1-100). Higher complexity requires higher staff skill.
  potentialScore: number; // The theoretical maximum score this theme can achieve (1-100) if executed perfectly.
}

/**
 * Division defines the league tiers in the carnival.
 */
export type Division =
  | 'Grupo Especial'
  | 'Série Ouro'
  | 'Série Prata'
  | 'Série Bronze'
  | 'Grupo de Avaliação';

/**
 * Represents a specific achievement in a school's history.
 */
export interface SchoolHistoryEntry {
  divisao: Division;
  ano: number;
}

/**
 * Detailed history of a school's performance.
 */
export interface SchoolHistory {
  // Counts (for quick display)
  totalTitles: number;
  totalRunnerUps: number;

  // Detailed lists
  titulos: SchoolHistoryEntry[];
  vices: SchoolHistoryEntry[];
  terceiros: SchoolHistoryEntry[];
  quartos: SchoolHistoryEntry[];
  quintos: SchoolHistoryEntry[];
}

/**
 * School represents a Samba School in the game.
 * It holds all data related to the school's resources, personnel, and status.
 */
export interface School {
  id: string; // Unique identifier for the school
  name: string; // The display name of the school
  logo?: string; // Path to the school's logo image
  colors: string[]; // Array of hex codes or color names representing the school's identity
  flag?: string; // URL/Path to the school's flag image
  budget: number; // Current funds available for hiring and events
  fanbaseMorale: number; // Represents the happiness/engagement of the fans (0-100)
  staff: StaffMember[]; // Collection of staff members currently hired by the school
  isPlayerControlled: boolean; // Flag indicating if this is the school managed by the player
  prestige: number; // The school's historical importance and reputation (1-200). 180-200 = Historical.
  currentDivision: Division; // The current league/division the school is competing in.

  // Prestige Calculation Metrics
  score_bruto?: number; // Raw score from the prestige formula (for simulation/debugging)
  anos_no_especial: number; // Consecutive/Total years in Special Group
  anos_em_acesso: number; // Years outside Special Group

  history: SchoolHistory; // Detailed history

  enredo: Enredo | null; // The current year's theme. Null if not yet researched/chosen.
}

/**
 * GameState tracks the global progression of the game.
 * It manages the timeline and the player's current context.
 */
export interface GameState {
  currentYear: number; // The current year in the game simulation (starts at 1 or 2026)
  currentWeek: number; // The current week of the year (1-52)
  currentPhase: 'Market' | 'Preparation' | 'Parade' | 'Results/Offseason'; // The current phase of the game loop
  playerSchoolId: string | null; // The ID of the school the player is currently managing
  pendingOffers: TransferOffer[]; // Offers waiting for resolution
  resolvedOffers: TransferOffer[]; // Offers resolved this week
  transferNews: string[]; // Market activity log
  hallOfFame: StaffMember[]; // Retired legends with >= 200 reputation
}
