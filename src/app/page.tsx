
"use client";

import React from 'react';
import { useGameStore } from '../store/gameStore';
import MarketDashboard from '../components/MarketDashboard';

export default function Home() {
  const { gameState, setPlayerSchool, schools } = useGameStore();
  const { playerSchoolId } = gameState;

  if (!playerSchoolId) {
    const divisions = [
        'Grupo Especial',
        'Série Ouro',
        'Série Prata',
        'Série Bronze',
        'Grupo de Avaliação'
    ];

    const getProBadge = (level: string) => {
        let color = 'bg-gray-600 text-gray-200 border-gray-500';
        let label = 'AMADOR';
        if (level === 'Professional') { color = 'bg-yellow-500 text-black border-yellow-300'; label = 'PRO'; }
        else if (level === 'SemiProfessional') { color = 'bg-gray-300 text-black border-gray-400'; label = 'SEMI-PRO'; }
        else if (level === 'SemiAmateur') { color = 'bg-orange-700 text-white border-orange-500'; label = 'SEMI-AMADOR'; }

        return (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color} ml-2 uppercase tracking-wide`}>
                {label}
            </span>
        );
    };

    return (
      <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white gap-8 p-8 font-sans">
        <div className="text-center mt-8">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 mb-4">
            Carnival Manager
          </h1>
          <p className="text-xl text-gray-300">Select a Samba School to begin your journey to the Sambadrome.</p>
        </div>

        <div className="w-full max-w-7xl space-y-12">
            {divisions.map((division) => {
                const divisionSchools = schools.filter(s => s.currentDivision === division);
                if (divisionSchools.length === 0) return null;

                const proLevel = divisionSchools[0].proLevel;

                return (
                    <div key={division}>
                        <h2 className="text-2xl font-bold mb-4 flex items-center border-b border-gray-700 pb-2">
                            {division}
                            {getProBadge(proLevel)}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {divisionSchools.map((school) => (
                                <button
                                key={school.id}
                                onClick={() => setPlayerSchool(school.id)}
                                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 p-4 rounded-xl text-left transition-all duration-300 transform hover:-translate-y-1 shadow-lg group relative overflow-hidden flex flex-col h-full"
                                style={{
                                    borderColor: school.colors[0] ? `${school.colors[0]}40` : '#374151',
                                }}
                                >
                                <div className="flex items-center gap-3 mb-3">
                                    {school.flag && (
                                        <div className="w-12 h-8 relative flex-shrink-0 rounded overflow-hidden shadow-md bg-black/20 border border-black/10">
                                            <img
                                                src={school.flag}
                                                alt={`${school.name} flag`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <h3 className="text-md font-bold leading-tight" style={{ color: school.colors[0] || '#FFF' }}>
                                        {school.name}
                                    </h3>
                                </div>

                                <div className="mt-auto pt-3 border-t border-gray-700/50 flex justify-between items-center text-xs text-gray-400">
                                    <span>Rep: <span className="text-white">{school.prestige}</span></span>
                                    <span className="font-mono text-green-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, notation: "compact" }).format(school.budget)}</span>
                                </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    );
  }

  return <MarketDashboard />;
}
