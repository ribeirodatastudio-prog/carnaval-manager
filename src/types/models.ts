
// types/models.ts

/**
 * StaffRole defines the key roles in a Samba School.
 * These are the main positions that the player can hire and manage.
 * - 'Carnavalesco': Responsible for the theme, costumes, and overall artistic direction.
 * - 'MestreDeBateria': Leads the percussion section (bateria).
 * - 'Interprete': The main singer who leads the samba-enredo.
 * - 'MestreSalaPortaBandeira': The couple carrying the school's flag, crucial for specific scoring.
 */
export type StaffRole = 'Carnavalesco' | 'MestreDeBateria' | 'Interprete' | 'MestreSalaPortaBandeira';

/**
 * StaffMember represents an individual hired by a Samba School.
 * Each staff member has specific skills and costs associated with them.
 */
export interface StaffMember {
  id: string; // Unique identifier for the staff member
  name: string; // Full name of the staff member
  role: StaffRole; // The specific role they fulfill in the school
  salary: number; // The cost per turn/season for this staff member
  skillLevel: number; // Internal skill value from 1 to 200 (displayed as 1-20 to the player)
  contractYears: number; // Number of years remaining on their contract
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
