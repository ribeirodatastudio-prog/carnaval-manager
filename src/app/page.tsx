"use client";

import React from 'react';
import { useGameStore } from '../store/gameStore';
import { SchoolArchetype } from '../types/models';
import MarketDashboard from '../components/MarketDashboard';
import PreparationDashboard from '../components/PreparationDashboard';
import DesfileScreen from '../components/DesfileScreen';
import ApuracaoScreen from '../components/ApuracaoScreen';
import ConfettiBackground from '../components/ConfettiBackground';
import Badge from '../components/Badge';
import DemissaoScreen from '../components/DemissaoScreen';

const UNIQUE_BONUS_LABELS: Record<string, string> = {
  mangueira_magnetismo: '⭐ Magnetismo de Mangueira',
  beija_flor_maquina:   '⚙️ A Máquina de Nilópolis',
  portela_patrimonio:   '📜 Patrimônio do Samba',
  mocidade_bateria:     '🥁 Bateria Lendária',
  imperio_comunidade:   '❤️ Escola do Povo',
  estacio_bercoBerco:   '🎶 Berço do Samba',
};

const ARCHETYPE_COLORS: Record<SchoolArchetype, string> = {
  Potencia:  '#C9A84C', // gold
  Familia:   '#2ECC71', // green
  Guerreira: '#E74C3C', // red
  Comercial: '#3498DB', // blue
  Revelacao: '#9B59B6', // purple
};

export default function Home() {
  const { gameState, setPlayerSchool, schools, chooseMarketStart, simulateMarketAndJump } = useGameStore();
  const { playerSchoolId, startPhaseChosen } = gameState;

  if (gameState.playerFired) {
    return <DemissaoScreen />;
  }

  if (gameState.currentPhase === 'Preparation') {
    return <PreparationDashboard />;
  }

  if (gameState.currentPhase === 'Parade') {
    return <DesfileScreen />;
  }

  if (gameState.currentPhase === 'Apuracao') {
    return <ApuracaoScreen />;
  }

  if (gameState.currentPhase === 'Results/Offseason') {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-[#080C18] text-[#F0E6D3] p-8">
              <h1 className="text-4xl font-black uppercase text-[#C9A84C] mb-4">Fim da Temporada {gameState.currentYear}</h1>
              <p className="mb-8 text-[#8A9BB8]">Os resultados foram processados. Prepare-se para o próximo ano.</p>
              <button
                  onClick={() => useGameStore.getState().advanceWeek()}
                  className="px-8 py-4 bg-[#C9A84C] text-[#080C18] font-black uppercase rounded hover:scale-105 transition-transform"
              >
                  Iniciar Temporada {gameState.currentYear + 1}
              </button>
          </div>
      );
  }

  // --- Start Phase Choice Screen ---
  if (playerSchoolId && !startPhaseChosen) {
    const playerSchool = schools.find(s => s.id === playerSchoolId);
    if (!playerSchool) return null; // Safety

    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen text-[#F0E6D3] gap-8 p-8 font-sans relative overflow-x-hidden"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #1a0a2e 0%, #080C18 70%, #0a1a0a 100%)',
        }}
      >
        <ConfettiBackground />

        {/* Header */}
        <div className="text-center z-10 space-y-4">
            <div className="flex items-center justify-center gap-4 mb-4">
                {playerSchool.flag && (
                    <div className="w-16 h-12 rounded overflow-hidden shadow-lg border border-white/10 bg-black/20">
                        <img src={playerSchool.flag} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                <h1 className="text-4xl font-black uppercase tracking-wide" style={{ color: playerSchool.colors[0] }}>
                    {playerSchool.name}
                </h1>
            </div>
            <div className="h-px w-32 bg-[#C9A84C] mx-auto opacity-50" />
            <h2 className="text-2xl font-bold text-[#F0E6D3]">
                Como você quer começar a temporada 2026?
            </h2>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl z-10">

            {/* Card 1: Mercado Completo */}
            <button
                onClick={() => chooseMarketStart()}
                className="group relative overflow-hidden rounded-xl text-left transition-all duration-300 hover:-translate-y-2 flex flex-col h-full bg-[#0F1629] border border-[#1E2D50] hover:border-[#C9A84C]"
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px -12px ${playerSchool.colors[0]}40`;
                    (e.currentTarget as HTMLElement).style.borderColor = playerSchool.colors[0];
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `none`;
                    (e.currentTarget as HTMLElement).style.borderColor = '#1E2D50';
                }}
            >
                <div className="p-8 flex flex-col h-full relative">
                     {/* Background accent */}
                     <div
                        className="absolute right-0 top-0 w-48 h-48 opacity-5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3"
                        style={{ backgroundColor: playerSchool.colors[0] }}
                    />

                    <div className="uppercase tracking-widest text-xs font-bold text-[#8A9BB8] mb-2">Opção Padrão</div>
                    <h3 className="text-2xl font-black text-[#F0E6D3] mb-4">Mercado Completo</h3>
                    <p className="text-[#8A9BB8] text-sm leading-relaxed mb-8 flex-1">
                        Semanas 1–8 — Negocie contratos, pesquise enredos e escolha seu samba manualmente. Controle total sobre a montagem do elenco.
                    </p>

                    <div className="flex items-center gap-2 text-[#C9A84C] font-bold uppercase tracking-wider text-sm group-hover:gap-4 transition-all">
                        Jogar o Mercado <span>→</span>
                    </div>
                </div>
            </button>

             {/* Card 2: Simular Mercado */}
             <button
                onClick={() => simulateMarketAndJump()}
                className="group relative overflow-hidden rounded-xl text-left transition-all duration-300 hover:-translate-y-2 flex flex-col h-full bg-[#0F1629] border border-[#1E2D50] hover:border-[#2ECC71]"
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px -12px #2ECC7140`;
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `none`;
                }}
            >
                <div className="p-8 flex flex-col h-full relative">
                     {/* Background accent */}
                     <div
                        className="absolute right-0 top-0 w-48 h-48 opacity-5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3"
                        style={{ backgroundColor: '#2ECC71' }}
                    />

                    <div className="uppercase tracking-widest text-xs font-bold text-[#2ECC71] mb-2">Modo Rápido</div>
                    <h3 className="text-2xl font-black text-[#F0E6D3] mb-4">Pular para Preparação</h3>
                    <p className="text-[#8A9BB8] text-sm leading-relaxed mb-6 flex-1">
                        O mercado é simulado automaticamente. Você recebe um elenco e enredo selecionados pelo sistema e começa direto na Semana 9.
                    </p>

                    <div className="bg-[#1E2D50]/50 border border-[#C9A84C]/30 rounded p-3 mb-8 text-xs text-[#C9A84C] flex gap-2 items-start">
                        <span>⚠️</span>
                        <span>Ideal para testar a fase de preparação. Seu elenco será montado automaticamente com o melhor disponível no orçamento.</span>
                    </div>

                    <div className="flex items-center gap-2 text-[#2ECC71] font-bold uppercase tracking-wider text-sm group-hover:gap-4 transition-all">
                        Simular Mercado <span>→</span>
                    </div>
                </div>
            </button>

        </div>
      </div>
    );
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
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {school.archetype && (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{
                                                            color: ARCHETYPE_COLORS[school.archetype],
                                                            borderColor: ARCHETYPE_COLORS[school.archetype],
                                                            backgroundColor: `${ARCHETYPE_COLORS[school.archetype]}20`
                                                        }}>
                                                            {school.archetype}
                                                        </span>
                                                    )}
                                                    {school.uniqueBonus && UNIQUE_BONUS_LABELS[school.uniqueBonus] && (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[#C9A84C] bg-[#C9A84C20] text-[#C9A84C]">
                                                            {UNIQUE_BONUS_LABELS[school.uniqueBonus]}
                                                        </span>
                                                    )}
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
