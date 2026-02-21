"use client";

import React from 'react';
import { useGameStore } from '../store/gameStore';
import MarketDashboard from '../components/MarketDashboard';
import ConfettiBackground from '../components/ConfettiBackground';

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
        let color = 'bg-[#1E2D50] text-[#F0E6D3] border-[#2A3F6B]';
        let label = 'AMADOR';
        if (level === 'Professional') { color = 'bg-[#C9A84C] text-[#080C18] border-[#E8C96A]'; label = 'PRO'; }
        else if (level === 'SemiProfessional') { color = 'bg-[#161E35] text-[#8A9BB8] border-[#1E2D50]'; label = 'SEMI-PRO'; }
        else if (level === 'SemiAmateur') { color = 'bg-[#2A1A00] text-[#E67E22] border-[#E67E2240]'; label = 'SEMI-AMADOR'; }

        return (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color} ml-2 uppercase tracking-wide`}>
                {label}
            </span>
        );
    };

    return (
      <div
        className="flex flex-col items-center min-h-screen gap-8 p-8 font-sans relative overflow-x-hidden"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, #1a0a2e 0%, #080C18 50%, #0a1a0a 100%)',
          color: '#F0E6D3'
        }}
      >
        <ConfettiBackground />

        <div className="text-center mt-12 mb-10 relative z-10">
          <div className="text-[#8A9BB8] uppercase tracking-[0.4em] text-sm font-bold mb-3">
            ◆ Temporada 2026 ◆
          </div>
          <h1 className="text-6xl font-black tracking-wide mb-3" style={{
            background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 40%, #A07830 70%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
          }}>
            CARNAVAL
          </h1>
          <h2 className="text-2xl font-bold text-[#F0E6D3] tracking-widest uppercase">
            Manager
          </h2>
          <p className="text-[#8A9BB8] mt-4 text-base">
            Escolha sua escola e leve-a ao título.
          </p>
        </div>

        <div className="w-full max-w-7xl space-y-12 relative z-10">
            {divisions.map((division) => {
                const divisionSchools = schools.filter(s => s.currentDivision === division);
                if (divisionSchools.length === 0) return null;

                const proLevel = divisionSchools[0].proLevel;

                return (
                    <div key={division}>
                        <h2 className="text-lg font-black uppercase tracking-widest text-[#8A9BB8] mb-4 flex items-center gap-3">
                          <span className="flex-1 h-px bg-[#1E2D50]" />
                          <span>{division}</span>
                          {getProBadge(proLevel)}
                          <span className="flex-1 h-px bg-[#1E2D50]" />
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {divisionSchools.map((school) => (
                                <button
                                  key={school.id}
                                  onClick={() => setPlayerSchool(school.id)}
                                  className="group relative overflow-hidden rounded-xl text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col h-full"
                                  style={{
                                    background: `linear-gradient(135deg, #0F1629 0%, #0F1629 60%, ${school.colors[0]}15 100%)`,
                                    border: `1px solid ${school.colors[0]}40`,
                                    boxShadow: `0 0 0 0 ${school.colors[0]}00`,
                                    transition: 'all 0.3s ease',
                                  }}
                                  onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${school.colors[0]}30`;
                                    (e.currentTarget as HTMLElement).style.borderColor = `${school.colors[0]}80`;
                                  }}
                                  onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${school.colors[0]}00`;
                                    (e.currentTarget as HTMLElement).style.borderColor = `${school.colors[0]}40`;
                                  }}
                                >
                                  {/* Color bar on left edge */}
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                                    style={{ backgroundColor: school.colors[0] }}
                                  />

                                  <div className="p-5 pl-6 flex flex-col h-full">
                                    {/* Flag + Name */}
                                    <div className="flex items-center gap-3 mb-4">
                                      {school.flag && (
                                        <div className="w-14 h-9 rounded overflow-hidden shadow-md flex-shrink-0 border border-black/20">
                                          <img src={school.flag} alt="" className="w-full h-full object-cover" />
                                        </div>
                                      )}
                                      <div>
                                        <h3 className="text-sm font-black leading-tight" style={{ color: school.colors[0] || '#F0E6D3' }}>
                                          {school.name}
                                        </h3>
                                        <div className="text-[10px] text-[#4A5A7A] uppercase tracking-widest mt-0.5">
                                          {school.currentDivision}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Stats row */}
                                    <div className="mt-auto pt-3 border-t border-[#1E2D50] flex justify-between items-center">
                                      <div className="text-center">
                                        <div className="text-xs text-[#4A5A7A] uppercase tracking-wider">Prestígio</div>
                                        <div className="text-lg font-black text-[#C9A84C] font-mono">{school.prestige}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-[#4A5A7A] uppercase tracking-wider">Orçamento</div>
                                        <div className="text-sm font-bold text-[#2ECC71] font-mono">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, notation: 'compact' }).format(school.budget)}
                                        </div>
                                      </div>
                                      <div className="text-[#2A3F6B] group-hover:text-[#C9A84C] transition-colors text-xl font-black">
                                        →
                                      </div>
                                    </div>
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
