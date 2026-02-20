
import { create } from 'zustand';
import { GameState, School, StaffMember } from '../types/models';
import { INITIAL_SCHOOLS } from '../data/seed';
import { INITIAL_MARKET_STAFF } from '../data/staffSeed';
import { researchEnredo } from '../services/researchEngine';

/**
 * GameStoreState defines the shape of the global game state managed by Zustand.
 * It includes the current game status, the list of schools, and actions to modify the state.
 */
interface GameStoreState {
  gameState: GameState;
  schools: School[];
  availableStaff: StaffMember[];

  // Actions
  /**
   * Sets the school controlled by the player.
   * Updates the `isPlayerControlled` flag for the selected school and the `playerSchoolId` in `gameState`.
   * @param schoolId - The ID of the school the player chooses to manage.
   */
  setPlayerSchool: (schoolId: string) => void;

  /**
   * Advances the game to the next week.
   * Updates currentWeek, increments currentYear if necessary, and updates currentPhase based on week thresholds.
   */
  advanceWeek: () => void;

  /**
   * Attempts to hire a staff member for a specific school.
   * @param schoolId The ID of the hiring school.
   * @param staffId The ID of the staff member to hire.
   * @param offeredSalary The salary offered (hiring cost/bonus).
   * @returns A message indicating the result of the negotiation.
   */
  makeHiringOffer: (schoolId: string, staffId: string, offeredSalary: number) => string;

  /**
   * Generates a new Enredo (theme) for the school using the Research Engine.
   * @param schoolId The ID of the school.
   * @param budgetInvested The amount of budget to invest in research.
   */
  generateTheme: (schoolId: string, budgetInvested: number) => void;
}

/**
 * useGameStore is the Zustand hook for accessing and updating the game state.
 * It initializes with the seed data and default game state.
 */
export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: {
    currentYear: 1,
    currentWeek: 1,
    currentPhase: 'Market',
    playerSchoolId: null,
  },
  schools: INITIAL_SCHOOLS,
  availableStaff: INITIAL_MARKET_STAFF,

  setPlayerSchool: (schoolId) =>
    set((state) => {
      const updatedSchools = state.schools.map((school) => ({
        ...school,
        isPlayerControlled: school.id === schoolId,
      }));

      return {
        schools: updatedSchools,
        gameState: {
          ...state.gameState,
          playerSchoolId: schoolId,
        },
      };
    }),

  advanceWeek: () =>
    set((state) => {
      const { currentYear, currentWeek } = state.gameState;
      let nextWeek = currentWeek + 1;
      let nextYear = currentYear;

      // Reset week and increment year if we exceed 52 weeks
      if (nextWeek > 52) {
        nextWeek = 1;
        nextYear += 1;
      }

      // Determine phase based on the new week
      let nextPhase: GameState['currentPhase'] = 'Market';
      if (nextWeek >= 1 && nextWeek <= 12) {
        nextPhase = 'Market';
      } else if (nextWeek >= 13 && nextWeek <= 44) {
        nextPhase = 'Preparation';
      } else if (nextWeek === 45) {
        nextPhase = 'Parade';
      } else {
        // Weeks 46-52
        nextPhase = 'Results/Offseason';
      }

      return {
        gameState: {
          ...state.gameState,
          currentYear: nextYear,
          currentWeek: nextWeek,
          currentPhase: nextPhase,
        },
      };
    }),

  makeHiringOffer: (schoolId, staffId, offeredSalary) => {
    const state = get();
    const schoolIndex = state.schools.findIndex((s) => s.id === schoolId);
    const staffIndex = state.availableStaff.findIndex((s) => s.id === staffId);

    if (schoolIndex === -1) return 'School not found.';
    if (staffIndex === -1) return 'Staff member not available.';

    const school = state.schools[schoolIndex];
    const staff = state.availableStaff[staffIndex];

    // Check if school has enough budget
    if (school.budget < offeredSalary) {
      return 'Insufficient budget.';
    }

    // Negotiation Logic
    // 1. Calculate the "Effective Offer Value"
    // Prestige Multiplier: Historical schools (200) get a 20% boost to the perceived value of the offer.
    // Low prestige schools might need to overpay.
    // Formula: Multiplier = 1 + ((Prestige - 100) / 500)
    // Examples:
    // Prestige 200 -> 1 + (100/500) = 1.2 (+20%)
    // Prestige 100 -> 1 + (0) = 1.0
    // Prestige 50  -> 1 + (-50/500) = 0.9 (-10%)
    const prestigeMultiplier = 1 + ((school.prestige - 100) / 500);
    const effectiveOffer = offeredSalary * prestigeMultiplier;

    // 2. RNG Factor (0.9 to 1.1) to add unpredictability
    const rngFactor = 0.9 + (Math.random() * 0.2);

    // 3. Acceptance Check
    // If the effective offer (adjusted by prestige and RNG) meets the expectation.
    // We compare EffectiveOffer * RNG vs SalaryExpectation
    // If EffectiveOffer * RNG >= SalaryExpectation, they accept.
    const perceivedValue = effectiveOffer * rngFactor;

    if (perceivedValue >= staff.salaryExpectation) {
      // Accepted!
      // Update State
      const updatedStaffMember = {
        ...staff,
        currentSchoolId: school.id,
        salary: offeredSalary, // Set their salary to what was offered
      };

      // Remove from availableStaff
      const newAvailableStaff = [...state.availableStaff];
      newAvailableStaff.splice(staffIndex, 1);

      // Update School: Add staff, deduct budget
      const updatedSchools = [...state.schools];
      updatedSchools[schoolIndex] = {
        ...school,
        budget: school.budget - offeredSalary,
        staff: [...school.staff, updatedStaffMember],
      };

      set({
        schools: updatedSchools,
        availableStaff: newAvailableStaff,
      });

      return `Offer accepted! ${staff.name} has joined ${school.name}.`;
    } else {
      // Rejected
      return `${staff.name} has rejected the offer.`;
    }
  },

  generateTheme: (schoolId, budgetInvested) => {
    const state = get();
    const schoolIndex = state.schools.findIndex((s) => s.id === schoolId);
    if (schoolIndex === -1) return;

    const school = state.schools[schoolIndex];

    if (school.budget < budgetInvested) {
      console.warn("Not enough budget for research"); // Could handle this better in UI
      return;
    }

    // Find Carnavalesco skill
    const carnavalesco = school.staff.find((s) => s.role === 'Carnavalesco');
    // Calculate skill based on Criatividade (primary) and Resiliencia (secondary)
    let skill = 50;
    if (carnavalesco) {
      skill = (carnavalesco.skills.criatividade * 0.7) + (carnavalesco.skills.resiliencia * 0.3);
    }

    // Generate Enredo
    const newEnredo = researchEnredo(skill, budgetInvested);

    // Update School
    const updatedSchools = [...state.schools];
    updatedSchools[schoolIndex] = {
      ...school,
      budget: school.budget - budgetInvested,
      enredo: newEnredo,
    };

    set({ schools: updatedSchools });
  },
}));
