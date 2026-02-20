
import { create } from 'zustand';
import { GameState, School, StaffMember } from '../types/models';
import { loadAllSchools } from '../data/schoolLoader';
import { INITIAL_MARKET_STAFF } from '../data/staffSeed';
import { researchEnredo } from '../services/researchEngine';
import { runSimulation, SimulationResult } from '../services/simulationService';

/**
 * Calculates the displayed salary expectation adjusted by the school's prestige.
 * Higher prestige schools see a lower "effective price" because staff want to work there.
 */
export const calculateAdjustedSalary = (staff: StaffMember, schoolPrestige: number): number => {
  if (staff.role === 'RainhaDeBateria' && staff.archetype !== 'CriaDaComunidade') {
    return 0; // Celebrity and PostoPago don't have salary negotiation in the same way
  }

  // Formula matching the hiring logic:
  // EffectiveOffer = Offered * PrestigeMultiplier
  // We want to find Offered such that EffectiveOffer == Expectation
  // Offered = Expectation / PrestigeMultiplier

  const prestigeMultiplier = 1 + ((schoolPrestige - 100) / 500);
  // Avoid division by zero or negative multipliers (unlikely with this formula but good to be safe)
  const safeMultiplier = Math.max(0.1, prestigeMultiplier);

  return Math.ceil(staff.salaryExpectation / safeMultiplier);
};

/**
 * GameStoreState defines the shape of the global game state managed by Zustand.
 * It includes the current game status, the list of schools, and actions to modify the state.
 */
interface GameStoreState {
  gameState: GameState;
  schools: School[];
  availableStaff: StaffMember[];
  simulationResults: SimulationResult | null;

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

  /**
   * Runs the prestige simulation for a specified number of years.
   * Updates simulationResults in the state.
   */
  runPrestigeSimulation: (years: number) => void;
}

/**
 * useGameStore is the Zustand hook for accessing and updating the game state.
 * It initializes with the seed data and default game state.
 */
export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: {
    currentYear: 2026,
    currentWeek: 1,
    currentPhase: 'Market',
    playerSchoolId: null,
  },
  schools: loadAllSchools(),
  availableStaff: INITIAL_MARKET_STAFF,
  simulationResults: null,

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

    // Special Logic for Rainha de Bateria
    if (staff.role === 'RainhaDeBateria') {
       if (staff.archetype === 'Celebridade' && school.prestige < 180) {
         return 'Celebrity Rainha requires a Historical Reputation (180+).';
       }
       // Posto Pago adds money, so we don't check budget for it (assuming offeredSalary is 0 or ignored)
       if (staff.archetype !== 'PostoPago' && school.budget < offeredSalary) {
         return 'Insufficient budget.';
       }
    } else {
       // Standard Budget Check
       if (school.budget < offeredSalary) {
         return 'Insufficient budget.';
       }
    }

    // Negotiation Logic
    let accepted = false;

    if (staff.role === 'RainhaDeBateria') {
      // Rainhas always accept if criteria met (Celebrity rep check already done above)
      accepted = true;
    } else {
        // 1. Calculate the "Effective Offer Value"
        const prestigeMultiplier = 1 + ((school.prestige - 100) / 500);
        const effectiveOffer = offeredSalary * prestigeMultiplier;

        // 2. RNG Factor (0.9 to 1.1)
        const rngFactor = 0.9 + (Math.random() * 0.2);

        // 3. Acceptance Check
        const perceivedValue = effectiveOffer * rngFactor;

        if (perceivedValue >= staff.salaryExpectation) {
            accepted = true;
        }
    }

    if (accepted) {
      // Handle Existing Staff in Role (Replacement)
      // Check if school already has someone in this role
      // Exception: Maybe some roles allow multiples? Prompt says "only one of each person can be hired" -> implies unique roles.
      const existingStaffIndex = school.staff.findIndex(s => s.role === staff.role);
      let releasedStaff: StaffMember | null = null;

      const newSchoolStaff = [...school.staff];

      if (existingStaffIndex !== -1) {
        // Remove existing staff
        releasedStaff = newSchoolStaff[existingStaffIndex];
        newSchoolStaff.splice(existingStaffIndex, 1);

        // Reset released staff state
        releasedStaff = {
            ...releasedStaff,
            currentSchoolId: null,
            salary: 0,
            contractYears: 0
        };
      }

      // Prepare New Staff Member
      const updatedStaffMember = {
        ...staff,
        currentSchoolId: school.id,
        salary: offeredSalary, // Set their salary to what was offered
      };

      // Remove from availableStaff
      const newAvailableStaff = [...state.availableStaff];
      newAvailableStaff.splice(staffIndex, 1);

      // Add released staff back to available pool
      if (releasedStaff) {
          newAvailableStaff.push(releasedStaff);
      }

      // Update School Budget & Stats
      let newBudget = school.budget;
      let newFanbaseMorale = school.fanbaseMorale;

      if (staff.role === 'RainhaDeBateria') {
          if (staff.archetype === 'PostoPago') {
              // Add 100k-500k
              const injection = Math.floor(Math.random() * 400000) + 100000;
              newBudget += injection;
              // Note: Could add a message about the injection amount
          } else if (staff.archetype === 'CriaDaComunidade') {
              // Buff Morale
              newFanbaseMorale = Math.min(100, newFanbaseMorale + 10); // +10 morale
              newBudget -= offeredSalary;
          } else {
             // Celebrity - Cost 0 usually
             newBudget -= offeredSalary;
          }
      } else {
          newBudget -= offeredSalary;
      }

      const updatedSchools = [...state.schools];
      updatedSchools[schoolIndex] = {
        ...school,
        budget: newBudget,
        fanbaseMorale: newFanbaseMorale,
        staff: [...newSchoolStaff, updatedStaffMember],
      };

      set({
        schools: updatedSchools,
        availableStaff: newAvailableStaff,
      });

      let successMsg = `Offer accepted! ${staff.name} has joined ${school.name}.`;
      if (releasedStaff) {
          successMsg += ` (Replaced ${releasedStaff.name})`;
      }
      return successMsg;
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

  runPrestigeSimulation: (years) => {
    const state = get();
    const results = runSimulation(state.schools, state.gameState.currentYear, years);
    set({ simulationResults: results });
  },
}));
