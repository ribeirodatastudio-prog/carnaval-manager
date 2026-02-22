import { mock } from "bun:test";

// Mock zustand before importing gameStore
mock.module("zustand", () => ({
  create: (fn: any) => {
    let state: any;
    const set = (partial: any) => {
      const nextState = typeof partial === 'function' ? partial(state) : partial;
      state = { ...state, ...nextState };
    };
    const get = () => state;
    state = fn(set, get);

    // Return a mock of the store hook
    const store = () => state;
    store.getState = get;
    store.setState = set;
    store.subscribe = () => () => {};
    return store;
  },
}));

import { expect, test, describe } from "bun:test";
import { useGameStore } from "./gameStore";

describe("GameStore Security", () => {
    test("submitTransferOffer should reject negative salary", () => {
        const store = (useGameStore as any).getState();

        // Ensure we are in Market phase
        (useGameStore as any).setState({
            gameState: {
                ...store.gameState,
                currentPhase: 'Market'
            }
        });

        const updatedStore = (useGameStore as any).getState();
        const schoolId = updatedStore.schools[0]?.id;
        const staffId = updatedStore.availableStaff[0]?.id;

        if (!schoolId || !staffId) {
            console.warn("Skipping test: No schools or available staff found.");
            return;
        }

        const result = updatedStore.submitTransferOffer(schoolId, staffId, -1000, 1);
        expect(result).toBe('Invalid salary');
    });

    test("submitTransferOffer should reject zero salary", () => {
        const store = (useGameStore as any).getState();

        // Ensure we are in Market phase
        (useGameStore as any).setState({
            gameState: {
                ...store.gameState,
                currentPhase: 'Market'
            }
        });

        const updatedStore = (useGameStore as any).getState();
        const schoolId = updatedStore.schools[0]?.id;
        const staffId = updatedStore.availableStaff[0]?.id;

        if (!schoolId || !staffId) {
            console.warn("Skipping test: No schools or available staff found.");
            return;
        }

        const result = updatedStore.submitTransferOffer(schoolId, staffId, 0, 1);
        expect(result).toBe('Invalid salary');
    });

    test("submitTransferOffer should accept valid positive salary within budget", () => {
        const store = (useGameStore as any).getState();

        // Ensure we are in Market phase
        (useGameStore as any).setState({
            gameState: {
                ...store.gameState,
                currentPhase: 'Market'
            }
        });

        const updatedStore = (useGameStore as any).getState();
        const school = updatedStore.schools[0];
        const staffId = updatedStore.availableStaff[0]?.id;

        if (!school || !staffId) {
            console.warn("Skipping test: No schools or available staff found.");
            return;
        }

        const validSalary = Math.min(100, school.budget);
        if (validSalary <= 0) {
             console.warn("Skipping test: School has no budget.");
             return;
        }

        const result = updatedStore.submitTransferOffer(school.id, staffId, validSalary, 1);
        // If it returns undefined, it means success in this store's implementation
        expect(result).toBeUndefined();
    });
});
