
'use client';

import React from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * TopBar component displays key game metrics:
 * - Current Year (offset by 2023)
 * - Current Week (1-52)
 * - Current Phase (Market, Preparation, Parade, Results/Offseason)
 *
 * It also provides a button to advance to the next week.
 */
export const TopBar: React.FC = () => {
  // Access game state from the store
  const { gameState, advanceWeek } = useGameStore();
  const { currentYear, currentWeek, currentPhase } = gameState;

  // Calculate the display year (starts at 2024 for year 1)
  const displayYear = 2023 + currentYear;

  return (
    <div className="bg-gray-800 text-white p-4 shadow-md w-full mb-4">
      <div className="container mx-auto flex items-center justify-between">
        {/* Game Stats */}
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Year</span>
            <span className="text-xl font-bold leading-none">{displayYear}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Week</span>
            <span className="text-xl font-bold leading-none">{currentWeek}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Phase</span>
            <span className="text-xl font-bold leading-none text-blue-300">{currentPhase}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={advanceWeek}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
        >
          Next Week
        </button>
      </div>
    </div>
  );
};
