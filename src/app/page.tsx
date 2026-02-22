"use client";

import React from 'react';
import { useGameStore } from '../store/gameStore';
import MarketDashboard from '../components/MarketDashboard';
import ConfettiBackground from '../components/ConfettiBackground';
import Badge from '../components/Badge';
import DemissaoScreen from '../components/DemissaoScreen';

export default function Home() {
  const { gameState, setPlayerSchool, schools } = useGameStore();
  const { playerSchoolId } = gameState;

  if (gameState.playerFired) {
    return <DemissaoScreen />;
  }

  if (!playerSchoolId) {
    const divisions = [
        'Grupo Especial',
        'Série Ouro',
        'Série Prata',
        'Série Bronze',
        'Grupo de Avaliação'
    ];

    const getProBadge = (level: string) => {
        let variant: 'gold' | 'blue' | 'red' | 'gray' = 'gray';
        let label = 'AMADOR';

        if (level === 'Professional') { variant = 'gold'; label = 'PRO'; }
        else if (level === 'SemiProfessional') { variant = 'blue'; label = 'SEMI-PRO'; }
        else if (level === 'SemiAmateur') { variant = 'red'; label = 'SEMI-AMADOR'; }

        return (
            <Badge variant={variant} className="ml-3">
                {label}
            </Badge>
        );
    };

    return (
      <div
        className="flex flex-col items-center min-h-screen text-[#F0E6D3] gap-8 p-8 font-sans relative overflow-x-hidden"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, #1a0a2e 0%, #080C18 50%, #0a1a0a 100%)',
        }}
      >
        <ConfettiBackground />

        {/* Title Section */}
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

        <div className="w-full max-w-7xl space-y-16 relative z-10">
            {divisions.map((division) => {
                const divisionSchools = schools.filter(s => s.currentDivision === division);
                if (divisionSchools.length === 0) return null;

                const proLevel = divisionSchools[0].proLevel;

                return (
                    <div key={division}>
                        <h2 className="text-lg font-black uppercase tracking-widest text-[#8A9BB8] mb-6 flex items-center gap-4">
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
                                    className="group relative overflow-hidden rounded-xl text-left transition-all duration-300 hover:-translate-y-2 flex flex-col h-full"
                                    style={{
                                        background: `linear-gradient(135deg, #0F1629 0%, #0F1629 60%, ${school.colors[0]}15 100%)`,
                                        border: `1px solid ${school.colors[0]}40`,
                                        boxShadow: `0 0 0 0 ${school.colors[0]}00`,
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px -12px ${school.colors[0]}40`;
                                        (e.currentTarget as HTMLElement).style.borderColor = `${school.colors[0]}80`;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${school.colors[0]}00`;
                                        (e.currentTarget as HTMLElement).style.borderColor = `${school.colors[0]}40`;
                                    }}
                                >
                                    {/* Color bar on left edge */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1.5"
                                        style={{ backgroundColor: school.colors[0] }}
                                    />

                                    <div className="p-5 pl-7 flex flex-col h-full relative">
                                        {/* Background accent */}
                                        <div
                                            className="absolute right-0 top-0 w-32 h-32 opacity-5 rounded-full blur-2xl pointer-events-none transform translate-x-1/3 -translate-y-1/3"
                                            style={{ backgroundColor: school.colors[0] }}
                                        />

                                        {/* Flag + Name */}
                                        <div className="flex items-start gap-4 mb-6 z-10">
                                            {school.flag && (
                                                <div className="w-14 h-10 rounded overflow-hidden shadow-lg flex-shrink-0 border border-white/10 bg-black/20">
                                                    <img src={school.flag} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-lg font-black leading-tight mb-1" style={{ color: school.colors[0] || '#F0E6D3' }}>
                                                    {school.name}
                                                </h3>
                                                <div className="text-[10px] text-[#4A5A7A] uppercase tracking-widest font-bold">
                                                    {school.currentDivision}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats row */}
                                        <div className="mt-auto pt-4 border-t border-[#1E2D50] flex justify-between items-center z-10">
                                            <div>
                                                <div className="text-[10px] text-[#4A5A7A] uppercase tracking-widest font-bold mb-0.5">Prestígio</div>
                                                <div className="text-xl font-black text-[#C9A84C] font-mono leading-none">{school.prestige}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-[#4A5A7A] uppercase tracking-widest font-bold mb-0.5">Orçamento</div>
                                                <div className="text-sm font-bold text-[#2ECC71] font-mono leading-none">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, notation: 'compact' }).format(school.budget)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Arrow */}
                                        <div className="absolute bottom-4 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                                            <span style={{ color: school.colors[0] }}>▼</span>
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
