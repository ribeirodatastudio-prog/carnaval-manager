
import { create } from 'zustand';
import { GameState, School } from '../types/models';
import { INITIAL_SCHOOLS } from '../data/seed';

/**
 * GameStoreState defines the shape of the global game state managed by Zustand.
 * It includes the current game status, the list of schools, and actions to modify the state.
 */
interface GameStoreState {
  gameState: GameState;
  schools: School[];

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
}

/**
 * useGameStore is the Zustand hook for accessing and updating the game state.
 * It initializes with the seed data and default game state.
 */
export const useGameStore = create<GameStoreState>((set) => ({
  gameState: {
    currentYear: 1,
    currentWeek: 1,
    currentPhase: 'Market',
    playerSchoolId: null,
  },
  schools: INITIAL_SCHOOLS,

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
      let { currentYear, currentWeek } = state.gameState;
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
}));
