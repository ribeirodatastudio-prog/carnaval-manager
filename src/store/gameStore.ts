
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
   * Advances the game to the next phase.
   * Logic for phase progression (Planning -> Market -> Parade -> Results -> Planning) will be implemented here.
   * (Placeholder for future implementation)
   */
  advancePhase: () => void;
}

/**
 * useGameStore is the Zustand hook for accessing and updating the game state.
 * It initializes with the seed data and default game state.
 */
export const useGameStore = create<GameStoreState>((set) => ({
  gameState: {
    currentYear: 2024,
    currentPhase: 'Planning',
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

  advancePhase: () => {
    // Placeholder implementation
    console.log('Advance phase called');
  },
}));
