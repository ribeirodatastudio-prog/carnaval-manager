
"use client";

import React from 'react';
import { useGameStore } from '../store/gameStore';
import MarketDashboard from '../components/MarketDashboard';

export default function Home() {
  const { gameState, setPlayerSchool, schools } = useGameStore();
  const { playerSchoolId } = gameState;

  if (!playerSchoolId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-8 p-8 font-sans">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 mb-4">
            Carnival Manager
          </h1>
          <p className="text-xl text-gray-300">Select a Samba School to begin your journey to the Sambadrome.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {schools.map((school) => (
            <button
              key={school.id}
              onClick={() => setPlayerSchool(school.id)}
              className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-yellow-500 p-6 rounded-xl text-left transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-yellow-500/20 group"
            >
              <h3 className="text-lg font-bold mb-3 truncate group-hover:text-yellow-400 transition-colors" style={{ color: school.colors[0] || '#FFF' }}>
                {school.name}
              </h3>
              <div className="flex justify-between items-center text-sm text-gray-400 mt-2">
                <span>Prestige: <span className="text-white font-medium">{school.prestige}</span></span>
                <span>Budget: <span className="text-green-400 font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(school.budget)}</span></span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <MarketDashboard />;
}
