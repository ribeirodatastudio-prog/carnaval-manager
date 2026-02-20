
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
 * School represents a Samba School in the game.
 * It holds all data related to the school's resources, personnel, and status.
 */
export interface School {
  id: string; // Unique identifier for the school
  name: string; // The display name of the school
  colors: string[]; // Array of hex codes or color names representing the school's identity
  budget: number; // Current funds available for hiring and events
  fanbaseMorale: number; // Represents the happiness/engagement of the fans (0-100)
  staff: StaffMember[]; // Collection of staff members currently hired by the school
  isPlayerControlled: boolean; // Flag indicating if this is the school managed by the player
  prestige: number; // The school's historical importance and reputation (1-200). 180-200 = Historical.
  currentDivision: string; // The current league/division the school is competing in (e.g., 'Grupo Especial').
  history: {
    titles: number; // Total number of championships won
    runnerUps: number; // Total number of second-place finishes
  };
  enredo: Enredo | null; // The current year's theme. Null if not yet researched/chosen.
}

/**
 * GameState tracks the global progression of the game.
 * It manages the timeline and the player's current context.
 */
export interface GameState {
  currentYear: number; // The current year in the game simulation (starts at 1)
  currentWeek: number; // The current week of the year (1-52)
  currentPhase: 'Market' | 'Preparation' | 'Parade' | 'Results/Offseason'; // The current phase of the game loop
  playerSchoolId: string | null; // The ID of the school the player is currently managing
}
