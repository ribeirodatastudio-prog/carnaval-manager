"use client";

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ProductionTrack, AlegoriaStageId, StageEvent, PreparationEvent } from '../types/models';
import { formatMoney, formatRole } from '../utils/textUtils';
import { evaluateConditions } from '../utils/eventUtils';

// Helper for contrast
function getContrastColor(hex: string | undefined): string {
    if (!hex) return '#FFFFFF';
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#080C18' : '#F0E6D3';
}

export default function PreparationDashboard() {
  const {
    gameState,
    schools,
    advanceWeek,
    setTrackFocus,
    setTrackBudget,
    setStaffRest,
    resolvePreparationEvent,
    resolveStageEvent,
    initiateBateriaGig,
    setAlegoriaCarCount,
    setHarmoniaFocus,
    setPassistasRehearsal,
    setComissaoApproach
  } = useGameStore();

  const { playerSchoolId, preparationSubPhase } = gameState;
  const playerSchool = schools.find(s => s.id === playerSchoolId);
  const prep = playerSchool?.preparation;

  const [selectedCarCount, setSelectedCarCount] = useState<number | null>(null);

  if (!playerSchool || !prep) return <div className="p-10 text-white">Carregando Preparação...</div>;

  // Header Colors
  const headerBg = playerSchool.colors[0] || '#1F2937';
  const headerText = getContrastColor(playerSchool.colors[0]);

  // Countdown Logic
  const weeksLeft = prep.weeksUntilParade;
  const isUrgent = weeksLeft <= 8;
  const isCritical = weeksLeft <= 3;

  // Advance Logic
  let advanceText = prep.isBiWeekly ? 'Avançar 2 Semanas' : 'Avançar 1 Semana';
  if (weeksLeft <= 1) advanceText = 'IR PARA O DESFILE';

  // Event Logic
  const pendingEvent = prep.pendingEvent;
  const pendingStageEvent = prep.pendingStageEvent;
  const anyEvent = pendingEvent || pendingStageEvent;

  // Car Modal Logic
  const showCarModal = prep.alegoriaCarCount === null && gameState.currentWeek >= 9;

  // Limits & Guidelines
  const carLimits = {
    'Grupo Especial': { min: 5, max: 8 },
    'Série Ouro': { min: 3, max: 6 },
    'Série Prata': { min: 2, max: 5 },
    'Série Bronze': { min: 1, max: 4 },
    'Grupo de Avaliação': { min: 1, max: 3 },
  }[playerSchool.currentDivision] || { min: 1, max: 3 };

  const sliderMax: Record<string, number> = {
      'Grupo Especial': 200000,
      'Série Ouro': 30000,
      'Série Prata': 8000,
      'Série Bronze': 2500,
      'Grupo de Avaliação': 600,
  };
  const maxBurn = sliderMax[playerSchool.currentDivision] || 600;

  const guidelines: Record<string, Record<ProductionTrack, number>> = {
      'Grupo Especial': { Alegorias: 45000, Fantasias: 25000, Bateria: 15000, Harmonia: 15000 },
      'Série Ouro':     { Alegorias: 8000,  Fantasias: 4000,  Bateria: 2500,  Harmonia: 2500 },
      'Série Prata':    { Alegorias: 2200,  Fantasias: 1200,  Bateria: 800,   Harmonia: 800 },
      'Série Bronze':   { Alegorias: 650,   Fantasias: 350,   Bateria: 250,   Harmonia: 250 },
      'Grupo de Avaliação': { Alegorias: 165, Fantasias: 85,  Bateria: 65,    Harmonia: 65 },
  };
  const divisionGuidelines = guidelines[playerSchool.currentDivision] || guidelines['Grupo de Avaliação'];

  // Budget Display
  const weeklyTotalBurn = Object.values(prep.tracks).reduce(
    (sum, t) => sum + (t.progress >= 100 ? 0 : t.weeklyBurnRate),
    0
  );
  const weeksAdvance = prep.isBiWeekly ? 2 : 1;
  const weeklySpendDisplay = weeklyTotalBurn * weeksAdvance;
  const runwayWeeks = Math.floor(playerSchool.budget / (weeklyTotalBurn || 1));
  const runwayColor = runwayWeeks < 6 ? '#E74C3C' : runwayWeeks < 12 ? '#F1C40F' : '#2ECC71';
  const isRunwayCritical = runwayWeeks < 6;

  // Situational Text
  function getSituationalAssessment(prep: any, weeksLeft: number): string {
    const issues: string[] = [];
    if (prep.bateria.form < 40 && weeksLeft < 10) issues.push('Bateria fria');
    if (prep.bateria.form > 95) issues.push('Bateria passou do ponto');
    if (prep.tracks.Alegorias.finishingRisk > 50) issues.push('Alegorias arriscadas');
    if (prep.tracks.Fantasias.finishingRisk > 50) issues.push('Fantasias atrasadas');
    if (prep.isBankrupt) issues.push('Falência!');

    if (issues.length === 0) return '✅ Preparação em dia.';
    return '⚠️ ' + issues.join(', ');
  }
  const situationalText = getSituationalAssessment(prep, weeksLeft);

  const canAdvance = !showCarModal && !anyEvent;

  return (
    <div className="flex flex-col h-screen bg-[#080C18] text-[#F0E6D3] relative font-sans overflow-hidden">

      {/* HEADER */}
      <header
        className="relative z-20 flex justify-between items-center px-6 py-4 shadow-2xl overflow-hidden shrink-0"
        style={{
          background: `linear-gradient(135deg, ${headerBg} 0%, ${headerBg}CC 60%, #080C18 100%)`,
          borderBottom: `2px solid ${playerSchool.colors[0] || '#C9A84C'}60`,
        }}
      >
         {playerSchool.flag && (
            <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 pointer-events-none"
            style={{
                backgroundImage: `url(${playerSchool.flag})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, transparent 100%)',
            }}
            />
        )}

        <div className="flex items-center gap-6 relative z-10">
            <div>
                <h1 className="text-3xl font-black leading-none tracking-wide" style={{ color: headerText }}>
                    {playerSchool.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs uppercase tracking-widest opacity-80 font-bold" style={{ color: headerText }}>
                        Preparação {preparationSubPhase === 'BiWeekly' ? '(Bi-Semanal)' : '(Reta Final)'}
                    </span>
                    <span className="text-xs opacity-60 ml-2 font-mono" style={{ color: headerText }}>
                        Semana {gameState.currentWeek}
                    </span>
                </div>
            </div>
        </div>

        {/* CENTER COUNTDOWN */}
        <div className={`text-center transition-all absolute left-1/2 -translate-x-1/2 ${isCritical ? 'animate-pulse' : ''}`}>
            <div className={`font-black uppercase tracking-widest transition-all ${
                isCritical ? 'text-4xl text-[#E74C3C]' :
                isUrgent ? 'text-2xl text-[#E67E22]' :
                'text-lg text-[#F0E6D3]'
            }`}>
                {weeksLeft === 1 ? '⚠️ ÚLTIMA SEMANA' :
                 weeksLeft === 0 ? '🎭 É HOJE!' :
                 `${weeksLeft} semanas até a Sapucaí`}
            </div>
            <div className="text-xs text-center mt-1 font-bold opacity-80">{situationalText}</div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
             <div className="flex flex-col items-end gap-1">
                 <div className="px-5 py-2 rounded-xl text-right min-w-[160px] backdrop-blur-md"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201, 168, 76, 0.3)' }}>
                    <div className="text-[10px] uppercase tracking-widest text-[#C9A84C] opacity-80 font-bold">Orçamento</div>
                    <div className="text-xl font-black font-mono" style={{ color: playerSchool.budget < 500000 ? '#E74C3C' : '#C9A84C' }}>
                        {formatMoney(playerSchool.budget)}
                    </div>
                 </div>
                 <div className="bg-black/40 backdrop-blur-md rounded px-3 py-1.5 text-xs font-mono border border-white/10 flex gap-4">
                     <div><span className="text-[#8A9BB8] text-[9px] uppercase mr-1">Gasto:</span><span className="text-[#E74C3C]">{formatMoney(weeklySpendDisplay)}</span></div>
                     <div className={isRunwayCritical ? 'animate-pulse' : ''}><span className="text-[#8A9BB8] text-[9px] uppercase mr-1">Reserva:</span><span style={{ color: runwayColor }}>{runwayWeeks} sem</span></div>
                 </div>
            </div>

            <button onClick={() => canAdvance && advanceWeek()} disabled={!canAdvance}
                className={`text-xs font-black uppercase tracking-widest px-6 py-3 rounded-lg transition-all duration-200 transform shadow-lg ${
                    canAdvance ? 'hover:scale-105 active:scale-95 text-[#080C18]' : 'opacity-50 cursor-not-allowed bg-[#161E35] text-[#8A9BB8]'
                }`}
                style={canAdvance ? { background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 100%)' } : {}}
            >
                {advanceText} →
            </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">

        {/* 1. ALEGORIA PIPELINE (Replaces simple bar) */}
        <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg relative">
            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide flex items-center gap-3">
                    🏰 Alegorias e Adereços
                    <span className="text-xs bg-[#161E35] text-[#8A9BB8] px-2 py-1 rounded font-normal border border-[#1E2D50]">
                        {prep.alegoriaCarCount ? `${prep.alegoriaCarCount} Carros` : 'Planejamento'}
                    </span>
                </h3>
                <div className="flex gap-4 text-right">
                    <div>
                        <div className="text-[10px] text-[#8A9BB8] uppercase font-bold">Qualidade</div>
                        <div className="text-2xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.tracks.Alegorias.quality)}</div>
                    </div>
                </div>
            </div>

            {/* Pipeline Visualization */}
            <div className="flex justify-between items-start relative mb-6">
                {/* Connector Line */}
                <div className="absolute top-6 left-0 right-0 h-1 bg-[#1E2D50] z-0" />

                {prep.alegoriaStages?.map((stage, idx) => {
                    const isActive = stage.isUnlocked && !stage.isComplete;
                    const isDone = stage.isComplete;
                    const isLocked = !stage.isUnlocked;

                    return (
                        <div key={stage.id} className={`relative flex flex-col items-center flex-1 ${isLocked ? 'opacity-30' : ''}`}>
                            {/* Node */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-300 ${
                                isDone ? 'bg-[#2ECC71] border-[#2ECC71] text-[#080C18]' :
                                isActive ? 'bg-[#C9A84C] border-[#F1C40F] text-[#080C18] scale-110 shadow-[0_0_15px_rgba(241,196,15,0.5)]' :
                                'bg-[#080C18] border-[#1E2D50] text-[#4A5A7A]'
                            }`}>
                                {isDone ? '✓' : idx + 1}
                            </div>

                            <div className="mt-3 text-center">
                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-[#F1C40F]' : 'text-[#8A9BB8]'}`}>
                                    {stage.label}
                                </div>
                                {isActive && (
                                    <div className="text-xs font-mono text-[#C9A84C]">{Math.floor(stage.progress)}%</div>
                                )}
                                {isDone && (
                                    <div className="text-[10px] font-mono text-[#2ECC71]">Concluído (Sem. {stage.weekCompleted})</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Active Stage Details & Controls */}
            {(() => {
                const activeStage = prep.alegoriaStages?.find(s => s.isUnlocked && !s.isComplete);
                if (!activeStage) return <div className="text-center text-[#2ECC71] font-bold uppercase py-4 bg-[#080C18] rounded border border-[#2ECC71]/30">Todas as etapas concluídas! Prontos para o desfile.</div>;

                const track = prep.tracks.Alegorias;
                const guideline = divisionGuidelines.Alegorias;
                const ratio = track.weeklyBurnRate / guideline;
                let thumbColor = '#C9A84C';
                if (ratio > 1.5) thumbColor = '#E67E22';
                if (ratio > 2.0) thumbColor = '#E74C3C';

                return (
                    <div className="bg-[#080C18] rounded-lg p-4 border border-[#1E2D50] flex gap-6 items-center">
                        <div className="flex-1">
                            <div className="text-xs text-[#8A9BB8] uppercase font-bold mb-2">Progresso Atual: <span className="text-[#F0E6D3]">{activeStage.label}</span></div>
                            <div className="h-3 bg-[#161E35] rounded-full overflow-hidden border border-[#1E2D50]">
                                <div className="h-full bg-[#C9A84C] transition-all duration-500 relative" style={{ width: `${activeStage.progress}%` }}>
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <div className="w-1/3">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] uppercase text-[#8A9BB8] font-bold">Investimento Semanal</span>
                                <span className="text-[10px] font-mono" style={{ color: thumbColor }}>{formatMoney(track.weeklyBurnRate)}</span>
                            </div>
                            <input
                                type="range"
                                min={1000}
                                max={maxBurn}
                                step={100}
                                value={track.weeklyBurnRate}
                                onChange={(e) => setTrackBudget('Alegorias', Number(e.target.value))}
                                className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer"
                                style={{ accentColor: thumbColor }}
                            />
                            <div className="text-[9px] text-[#4A5A7A] mt-1 text-center font-mono">
                                Base: {formatMoney(guideline)}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </section>

        {/* 2. HARMONIA & FANTASIA ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* HARMONIA PANEL */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide">🎤 Harmonia</h3>
                    <div className="text-2xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.tracks.Harmonia.quality)}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-[#080C18] p-2 rounded text-center border border-[#1E2D50]">
                        <div className="text-[9px] text-[#8A9BB8] uppercase font-bold mb-1">Canto</div>
                        <div className="h-1 bg-[#161E35] rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-[#3498DB]" style={{ width: `${prep.harmoniaState.sambaFixado}%` }} />
                        </div>
                    </div>
                    <div className="bg-[#080C18] p-2 rounded text-center border border-[#1E2D50]">
                        <div className="text-[9px] text-[#8A9BB8] uppercase font-bold mb-1">Marcha</div>
                        <div className="h-1 bg-[#161E35] rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-[#E67E22]" style={{ width: `${prep.harmoniaState.marchaSincronizada}%` }} />
                        </div>
                    </div>
                    <div className="bg-[#080C18] p-2 rounded text-center border border-[#1E2D50]">
                        <div className="text-[9px] text-[#8A9BB8] uppercase font-bold mb-1">Voz</div>
                        <div className="h-1 bg-[#161E35] rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-[#2ECC71]" style={{ width: `${prep.harmoniaState.densidadeVocal}%` }} />
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <span className="text-[10px] uppercase text-[#8A9BB8] font-bold block mb-2">Foco do Diretor</span>
                    <div className="grid grid-cols-2 gap-2">
                        {(['Samba', 'Marcha', 'Vocal', 'Equilibrado'] as const).map(focus => (
                            <button
                                key={focus}
                                onClick={() => setHarmoniaFocus(focus)}
                                className={`px-3 py-2 rounded text-xs font-bold uppercase transition-all ${
                                    prep.harmoniaState.diretorFocus === focus
                                    ? 'bg-[#C9A84C] text-[#080C18]'
                                    : 'bg-[#161E35] text-[#8A9BB8] hover:bg-[#1E2D50]'
                                }`}
                            >
                                {focus}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-[#1E2D50]">
                     <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] uppercase text-[#8A9BB8] font-bold">Investimento</span>
                        <span className="text-[10px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Harmonia.weeklyBurnRate)}</span>
                    </div>
                    <input
                        type="range" min={1000} max={maxBurn} step={100}
                        value={prep.tracks.Harmonia.weeklyBurnRate}
                        onChange={(e) => setTrackBudget('Harmonia', Number(e.target.value))}
                        className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                    />
                </div>
            </section>

            {/* FANTASIA PANEL */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide">✂️ Fantasias</h3>
                    <div className="text-right">
                        <div className="text-[10px] text-[#8A9BB8] uppercase font-bold">Qualidade</div>
                        <div className="text-2xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.fantasia.designQuality)}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-[#080C18] p-3 rounded-lg border border-[#1E2D50] mb-6">
                    <div>
                        <div className="text-[9px] text-[#8A9BB8] uppercase font-bold">Abordagem</div>
                        <div className="text-sm font-bold text-[#F0E6D3]">{prep.fantasia.approach || 'A Definir'}</div>
                    </div>
                    <div>
                        <div className="text-[9px] text-[#8A9BB8] uppercase font-bold text-right">Risco Entrega</div>
                        <div className={`text-sm font-mono font-black text-right ${prep.fantasia.deliveryRisk > 50 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
                            {Math.floor(prep.fantasia.deliveryRisk)}%
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between mb-1">
                        <span className="text-[10px] uppercase text-[#8A9BB8] font-bold">Taxa de Participação (Alas)</span>
                        <span className="text-[10px] font-mono text-[#F0E6D3]">{Math.floor(prep.fantasia.participationRate * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#161E35] rounded-full overflow-hidden">
                        <div className="h-full bg-[#9B59B6]" style={{ width: `${prep.fantasia.participationRate * 100}%` }} />
                    </div>
                </div>

                <div className="pt-4 border-t border-[#1E2D50]">
                     <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] uppercase text-[#8A9BB8] font-bold">Investimento</span>
                        <span className="text-[10px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Fantasias.weeklyBurnRate)}</span>
                    </div>
                    <input
                        type="range" min={1000} max={maxBurn} step={100}
                        value={prep.tracks.Fantasias.weeklyBurnRate}
                        onChange={(e) => setTrackBudget('Fantasias', Number(e.target.value))}
                        className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                    />
                </div>
            </section>
        </div>

        {/* 3. PEOPLE ROW: MSPB, COMISSAO, PASSISTAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MSPB */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg relative">
                <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide mb-4">👑 Mestre-Sala e PB</h3>
                {prep.mspb ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-[9px] text-[#8A9BB8] uppercase font-bold">Química</div>
                                <div className="text-xl font-mono text-[#E91E63] font-black">{Math.floor(prep.mspb.quimica)}%</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] text-[#8A9BB8] uppercase font-bold">Preparação</div>
                                <div className="text-xl font-mono text-[#F0E6D3] font-black">{Math.floor(prep.mspb.preparacao)}</div>
                            </div>
                        </div>
                        {prep.mspb.ensaioGeralResult && (
                            <div className="bg-[#080C18] p-2 rounded text-center border border-[#1E2D50]">
                                <div className="text-[9px] text-[#8A9BB8] uppercase font-bold">Ensaio Geral</div>
                                <div className="text-sm font-bold text-[#C9A84C]">{prep.mspb.ensaioGeralResult}</div>
                            </div>
                        )}
                        {prep.mspb.coreografiaApproach === null && gameState.currentWeek < 16 && (
                            <div className="text-xs text-[#8A9BB8] italic text-center">Coreografia a definir na semana 16</div>
                        )}
                        {prep.mspb.coreografiaApproach === null && gameState.currentWeek >= 16 && (
                            <div className="text-xs text-[#F1C40F] italic text-center">Aguardando decisão...</div>
                        )}
                        {prep.mspb.coreografiaApproach !== null && (
                            <div className="text-xs font-bold uppercase tracking-wider text-center" style={{ color: prep.mspb.coreografiaApproach === 'Ousada' ? '#E74C3C' : '#2ECC71' }}>
                                Coreografia: {prep.mspb.coreografiaApproach}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-[#E74C3C] text-xs font-bold text-center py-8">Casal não contratado!</div>
                )}
            </section>

            {/* COMISSAO */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg">
                <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide mb-4">🎭 Comissão de Frente</h3>
                <div className="flex flex-col gap-4">
                    <div className="bg-[#080C18] p-3 rounded border border-[#1E2D50]">
                        <div className="text-[9px] text-[#8A9BB8] uppercase font-bold mb-1">Conceito</div>
                        <div className="text-sm font-bold text-[#3498DB]">{prep.comissaoDeFrente.approach || 'A Definir'}</div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] uppercase text-[#8A9BB8] font-bold">Qualidade</span>
                            <span className="text-[10px] font-mono text-[#F0E6D3]">{Math.floor(prep.comissaoDeFrente.quality)}</span>
                        </div>
                        <div className="h-1.5 bg-[#161E35] rounded-full overflow-hidden">
                            <div className="h-full bg-[#3498DB]" style={{ width: `${prep.comissaoDeFrente.quality}%` }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* PASSISTAS */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg">
                <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide mb-4">💃 Passistas</h3>
                {prep.passistas ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between">
                            <div className="text-center">
                                <div className="text-[9px] text-[#8A9BB8] uppercase font-bold">Forma</div>
                                <div className="text-lg font-mono text-[#E67E22] font-black">{Math.floor(prep.passistas.form)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[9px] text-[#8A9BB8] uppercase font-bold">Energia</div>
                                <div className="text-lg font-mono text-[#3498DB] font-black">{Math.floor(prep.passistas.energy)}</div>
                            </div>
                        </div>
                        <div>
                            <span className="text-[9px] uppercase text-[#8A9BB8] font-bold block mb-1">Intensidade</span>
                            <select
                                value={prep.passistas.rehearsalIntensity}
                                onChange={(e) => setPassistasRehearsal(e.target.value as any)}
                                className="w-full bg-[#080C18] border border-[#1E2D50] text-xs p-2 rounded text-[#F0E6D3] uppercase font-bold outline-none focus:border-[#C9A84C]"
                            >
                                <option value="Descanso">Descanso</option>
                                <option value="Leve">Leve</option>
                                <option value="Aberto">Aberto</option>
                                <option value="Completo">Completo</option>
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="text-[#8A9BB8] text-xs text-center py-8">N/A para Grupo de Avaliação</div>
                )}
            </section>
        </div>

        {/* 4. BATERIA & STRESS (Existing UI updated) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* BATERIA PANEL */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide flex items-center gap-2">
                        🥁 Bateria
                        {prep.bateria.outsideGigActive && (
                            <span className="text-[9px] bg-[#E67E22] text-[#080C18] px-2 py-0.5 rounded font-bold animate-pulse">SHOW</span>
                        )}
                    </h3>
                    <div className="text-right">
                         <div className="text-[10px] text-[#4A5A7A] uppercase tracking-wider font-bold">Renda</div>
                         <div className="text-sm font-mono text-[#2ECC71]">{formatMoney(prep.bateria.gigIncome)}</div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Form Bar */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#8A9BB8]">Forma Técnica</span>
                            <span className="text-xs font-mono font-bold text-[#F0E6D3]">{Math.floor(prep.bateria.form)}/100</span>
                        </div>
                        <div className="h-3 bg-[#161E35] rounded-full overflow-hidden border border-[#1E2D50] relative">
                             {/* Optimal Zone Marker */}
                             <div className="absolute top-0 bottom-0 bg-[#2ECC71]/20 border-l border-r border-[#2ECC71]/30"
                                  style={{ left: `${prep.bateriaOptimalMin}%`, right: `${100 - prep.bateriaOptimalMax}%` }} />

                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${prep.bateria.form}%`,
                                    background: prep.bateria.form > prep.bateriaOptimalMax ? '#E74C3C' : prep.bateria.form >= prep.bateriaOptimalMin ? '#2ECC71' : '#C9A84C'
                                }}
                            />
                        </div>
                    </div>

                    {/* Energy Bar */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#8A9BB8]">Energia</span>
                            <span className="text-xs font-mono font-bold text-[#F0E6D3]">{Math.floor(prep.bateria.energy)}%</span>
                        </div>
                        <div className="h-1.5 bg-[#161E35] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${prep.bateria.energy}%`, background: prep.bateria.energy < 30 ? '#E74C3C' : '#3498DB' }} />
                        </div>
                    </div>

                    {/* Bateria Budget Slider */}
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] uppercase text-[#8A9BB8] font-bold">Investimento</span>
                            <span className="text-[10px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Bateria.weeklyBurnRate)}</span>
                        </div>
                        <input
                            type="range" min={1000} max={maxBurn} step={100}
                            value={prep.tracks.Bateria.weeklyBurnRate}
                            onChange={(e) => setTrackBudget('Bateria', Number(e.target.value))}
                            className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                        />
                    </div>

                    {/* Gig Button */}
                    <button
                        onClick={() => initiateBateriaGig()}
                        disabled={prep.bateria.outsideGigActive || playerSchool.currentDivision === 'Grupo Especial'}
                        className={`w-full py-3 rounded-lg font-black uppercase tracking-widest text-xs border transition-all ${
                            prep.bateria.outsideGigActive || playerSchool.currentDivision === 'Grupo Especial'
                            ? 'bg-[#161E35] border-[#1E2D50] text-[#4A5A7A] cursor-not-allowed'
                            : 'bg-[#080C18] border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#080C18]'
                        }`}
                    >
                        {prep.bateria.outsideGigActive ? 'Show Agendado' : 'Agendar Show Extra'}
                    </button>
                </div>
            </section>

            {/* STAFF STRESS PANEL */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg lg:col-span-2 flex flex-col">
                <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide mb-6 flex justify-between items-center">
                    <span>🧘 Gestão de Estresse</span>
                    <span className="text-[10px] bg-[#161E35] text-[#8A9BB8] px-2 py-1 rounded font-normal">
                        🔴 Anel = Estresse &nbsp;|&nbsp; 🔵 Barra = Energia &nbsp;|&nbsp; ⚡ Descanso recupera energia
                    </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {prep.staffStress.map(ss => {
                        const staff = playerSchool.staff.find(s => s.id === ss.staffId);
                        if (!staff) return null;

                        // Stress Visuals (Rings)
                        let ringColor = '#2ECC71';
                        if (ss.stressLevel > 50) ringColor = '#F1C40F';
                        if (ss.stressLevel > 70) ringColor = '#E67E22';
                        if (ss.stressLevel > 85) ringColor = '#E74C3C';

                        return (
                            <div key={ss.staffId} className={`p-4 rounded-lg border flex justify-between items-center transition-colors ${
                                ss.isResting ? 'bg-[#080C18] border-[#2A3F6B] opacity-70' : 'bg-[#161E35] border-[#1E2D50]'
                            }`}>
                                <div className="flex items-center gap-4 flex-1">
                                    {/* Stress Ring */}
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div className="relative w-12 h-12 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="24" cy="24" r="20" stroke="#1E2D50" strokeWidth="4" fill="none" />
                                                <circle cx="24" cy="24" r="20" stroke={ringColor} strokeWidth="4" fill="none"
                                                    strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * ss.stressLevel) / 100}
                                                />
                                            </svg>
                                            <span className="absolute text-[10px] font-bold" style={{ color: ringColor }}>{Math.floor(ss.stressLevel)}</span>
                                        </div>
                                        <span className="text-[8px] uppercase font-bold text-[#8A9BB8] tracking-wider">Estresse</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-[#F0E6D3] truncate">{staff.name}</div>
                                        <div className="text-[9px] text-[#8A9BB8] uppercase tracking-wider font-bold mb-2">{formatRole(staff.role).split(' ')[0]}</div>
                                        {/* Energy bar with label */}
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <span className="text-[8px] text-[#3498DB] uppercase font-bold tracking-wider">Energia</span>
                                            <span className="text-[8px] font-mono text-[#3498DB]">{Math.floor(ss.energy)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[#080C18] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{
                                                width: `${ss.energy}%`,
                                                background: ss.energy < 25 ? '#E74C3C' : ss.energy < 50 ? '#F1C40F' : '#3498DB'
                                            }} />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStaffRest(ss.staffId, !ss.isResting)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ml-4 ${
                                        ss.isResting
                                        ? 'bg-[#2A3F6B] border-[#60C0FF] text-[#60C0FF]'
                                        : 'bg-[#080C18] border-[#1E2D50] text-[#4A5A7A] hover:border-[#8A9BB8] hover:text-[#8A9BB8]'
                                    }`}
                                    title={ss.isResting ? "Cancel Rest" : "Rest this week"}
                                >
                                    {ss.isResting ? '💤' : '⚡'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>

      </main>

      {/* EVENT MODAL (Handles both PrepEvents and StageEvents) */}
      {anyEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className={`rounded-xl p-8 max-w-lg w-full border-2 shadow-2xl transform transition-all ${
              (anyEvent as PreparationEvent).severity === 'Major'
                ? 'border-[#E74C3C] bg-[#1A0505]'
                : 'border-[#2A3F6B] bg-[#0F1629]'
            }`}>
              {(anyEvent as PreparationEvent).severity === 'Major' && (
                <div className="text-[#E74C3C] text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="text-xl">⚠️</span> Evento Maior
                </div>
              )}
              <h2 className="text-2xl font-black text-[#F0E6D3] mb-4 leading-tight">{anyEvent.title}</h2>
              <p className="text-[#8A9BB8] text-sm leading-relaxed mb-8 border-l-2 border-[#1E2D50] pl-4">
                  {anyEvent.description}
              </p>

              <div className="flex flex-col gap-3">
                {/* STAGE EVENT RENDERING (Dynamic Options) */}
                {(anyEvent as StageEvent).options ? (
                    (anyEvent as StageEvent).options
                        .filter(opt => evaluateConditions(opt.conditions, playerSchool))
                        .map((opt, idx) => {
                            // Map original index because filter changes it?
                            // Wait, resolveStageEvent needs the index in the ORIGINAL options array or filtered?
                            // Store logic: `const option = event.options[optionIndex];`
                            // So we must pass the index from the ORIGINAL array.
                            const originalIdx = (anyEvent as StageEvent).options.indexOf(opt);
                            return (
                                <button key={idx} onClick={() => resolveStageEvent(anyEvent.id, originalIdx)}
                                    className="w-full p-5 rounded-xl bg-[#1E2D50] hover:bg-[#2A3F6B] border border-[#2A3F6B] text-left transition-all group relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="font-black text-[#F0E6D3] mb-1 text-lg">{opt.label}</div>
                                        {/* Hide effect detail for immersion, or show? PrepEvent showed it. */}
                                        <div className="text-xs text-[#4A5A7A] font-mono group-hover:text-[#8A9BB8] transition-colors">
                                            {opt.effect.replace(/_/g, ' ').toLowerCase()}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                ) : (
                    /* STANDARD PREPARATION EVENT RENDERING (A/B) */
                    <>
                        <button onClick={() => resolvePreparationEvent(anyEvent.id, 'A')}
                        className="w-full p-5 rounded-xl bg-[#1E2D50] hover:bg-[#2A3F6B] border border-[#2A3F6B] text-left transition-all group relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="font-black text-[#F0E6D3] mb-1 text-lg">{(anyEvent as PreparationEvent).optionA.label}</div>
                            <div className="text-xs text-[#4A5A7A] font-mono group-hover:text-[#8A9BB8] transition-colors">
                                {(anyEvent as PreparationEvent).optionA.effect.replace(/_/g, ' ').toLowerCase()}
                            </div>
                        </div>
                        </button>
                        <button onClick={() => resolvePreparationEvent(anyEvent.id, 'B')}
                        className="w-full p-5 rounded-xl bg-[#1E2D50] hover:bg-[#2A3F6B] border border-[#2A3F6B] text-left transition-all group relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="font-black text-[#F0E6D3] mb-1 text-lg">{(anyEvent as PreparationEvent).optionB.label}</div>
                            <div className="text-xs text-[#4A5A7A] font-mono group-hover:text-[#8A9BB8] transition-colors">
                                {(anyEvent as PreparationEvent).optionB.effect.replace(/_/g, ' ').toLowerCase()}
                            </div>
                        </div>
                        </button>
                    </>
                )}
              </div>
            </div>
          </div>
      )}

      {/* Feature 1: Alegoria Car Count Modal (Blocking) */}
      {showCarModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-fade-in">
              <div className="rounded-xl p-8 max-w-2xl w-full border border-[#C9A84C] shadow-2xl bg-[#080C18] relative">
                  <div className="text-[#C9A84C] text-xs font-black uppercase tracking-widest mb-2 text-center">
                    Planejamento Artístico
                  </div>
                  <h2 className="text-3xl font-black text-[#F0E6D3] mb-6 text-center leading-none">
                    Defina a Grandiosidade
                  </h2>
                  <p className="text-[#8A9BB8] text-center mb-8 max-w-lg mx-auto">
                      Quantos carros alegóricos sua escola levará para a avenida? Mais carros aumentam o potencial de notas, mas custam muito mais caro para manter.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                     {Array.from({ length: carLimits.max - carLimits.min + 1 }, (_, i) => carLimits.min + i).map(count => {
                         const isSelected = selectedCarCount === count;
                         const isRecommended = count === (carLimits.min + 1);
                         const burnIncrease = Math.round((1 + Math.max(0, count - carLimits.min) * 0.15) * 100 - 100);

                         return (
                             <button key={count} onClick={() => setSelectedCarCount(count)}
                                className={`p-6 rounded-xl border-2 transition-all relative ${
                                    isSelected ? 'border-[#C9A84C] bg-[#161E35] scale-105 shadow-xl' : 'border-[#1E2D50] bg-[#0F1629] hover:border-[#4A5A7A] opacity-70 hover:opacity-100'
                                }`}>
                                 {isRecommended && (
                                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C9A84C] text-[#080C18] text-[9px] font-black uppercase px-2 py-0.5 rounded">Recomendado</div>
                                 )}
                                 <div className="text-4xl font-black mb-2 text-[#F0E6D3]">{count}</div>
                                 <div className="text-xs uppercase tracking-widest font-bold text-[#8A9BB8] mb-4">Carros</div>
                                 {count > carLimits.min && (
                                     <div className="text-xs text-[#E74C3C] font-mono bg-black/30 p-1 rounded">+{burnIncrease}% Custo</div>
                                 )}
                                 {count === carLimits.min && (
                                     <div className="text-xs text-[#2ECC71] font-mono bg-black/30 p-1 rounded">Custo Base</div>
                                 )}
                             </button>
                         )
                     })}
                  </div>

                  <div className="flex justify-center gap-4">
                     <button onClick={() => selectedCarCount && setAlegoriaCarCount(selectedCarCount)} disabled={!selectedCarCount}
                        className={`px-10 py-4 rounded-xl font-black uppercase tracking-widest text-lg transition-all ${
                            selectedCarCount ? 'bg-[#C9A84C] text-[#080C18] hover:scale-105' : 'bg-[#161E35] text-[#4A5A7A] cursor-not-allowed'
                        }`}>
                         Confirmar Planejamento
                     </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
