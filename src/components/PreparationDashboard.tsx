"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useGameStore } from '../store/gameStore';
import { ProductionTrack, StaffMember, PreparationEvent } from '../types/models';
import { formatMoney, formatRole } from '../utils/textUtils';
import Badge from './Badge';

// Helper for contrast (same as MarketDashboard)
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
    initiateBateriaGig
  } = useGameStore();

  const { playerSchoolId, preparationSubPhase } = gameState;
  const playerSchool = schools.find(s => s.id === playerSchoolId);
  const prep = playerSchool?.preparation;

  const [activeTab, setActiveTab] = useState<'Overview' | 'Staff'>('Overview');

  if (!playerSchool || !prep) return <div className="p-10 text-white">Carregando Preparação...</div>;

  // Header Colors
  const headerBg = playerSchool.colors[0] || '#1F2937';
  const headerText = getContrastColor(playerSchool.colors[0]);

  // Countdown Logic
  const weeksLeft = prep.weeksUntilParade;
  const isUrgent = weeksLeft <= 8;
  const isCritical = weeksLeft <= 3;

  // Calculate Advance Button Text
  const advanceText = prep.isBiWeekly ? 'Avançar 2 Semanas' : 'Avançar 1 Semana';

  // Event Modal Logic
  const pendingEvent = prep.pendingEvent;

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
         {/* Background flag watermark */}
         {playerSchool.flag && (
            <div
            className="absolute right-0 top-0 bottom-0 w-96 opacity-10 pointer-events-none"
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
            {isUrgent && (
                 <div className="text-[10px] text-[#E74C3C] mt-1 font-bold bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                  {Object.values(prep.tracks)
                    .filter(t => t.progress < 100)
                    .map(t => `${t.track} ${Math.floor(t.progress)}%`)
                    .join(' · ')}
                </div>
            )}
        </div>

        <div className="flex items-center gap-4 relative z-10">
            <div
                className="px-5 py-2.5 rounded-xl text-right min-w-[160px] backdrop-blur-md"
                style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(201, 168, 76, 0.3)',
                }}
              >
                <div className="text-[10px] uppercase tracking-widest text-[#C9A84C] opacity-80 font-bold">Orçamento</div>
                <div
                    className="text-xl font-black font-mono"
                    style={{ color: playerSchool.budget < 500000 ? '#E74C3C' : '#C9A84C' }}
                >
                    {formatMoney(playerSchool.budget)}
                </div>
            </div>
            <button
                onClick={() => advanceWeek()}
                className="text-xs font-black uppercase tracking-widest px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-[#C9A84C20]"
                style={{
                    background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 100%)',
                    color: '#080C18',
                }}
            >
                {advanceText} →
            </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">

        {/* TRACKS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {(Object.entries(prep.tracks) as [ProductionTrack, typeof prep.tracks.Alegorias][]).map(([key, track]) => {
                const staffName = {
                    Alegorias: playerSchool.staff.find(s => s.role === 'MestreDeBarracao')?.name ?? 'Vago',
                    Fantasias: playerSchool.staff.find(s => s.role === 'DiretorDeCarnaval')?.name ?? 'Vago',
                    Bateria: playerSchool.staff.find(s => s.role === 'MestreDeBateria')?.name ?? 'Vago',
                    Harmonia: playerSchool.staff.find(s => s.role === 'DiretorDeHarmonia')?.name ?? 'Vago',
                }[key];

                const isDone = track.progress >= 100;
                const isRisk = track.finishingRisk > 0 && !isDone;

                return (
                    <div key={key} className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-[#2A3F6B] transition-colors shadow-lg">
                        {isDone && <div className="absolute inset-0 bg-[#2ECC71]/10 pointer-events-none" />}
                        {isRisk && <div className="absolute inset-0 bg-[#E74C3C]/10 pointer-events-none animate-pulse" />}

                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide">{key}</h3>
                                <div className="text-xs text-[#8A9BB8] font-bold">{staffName}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black font-mono" style={{ color: isDone ? '#2ECC71' : isRisk ? '#E74C3C' : '#C9A84C' }}>
                                    {Math.floor(track.progress)}%
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-[#161E35] rounded-full overflow-hidden border border-[#1E2D50]">
                            <div
                                className="h-full transition-all duration-700 ease-out rounded-full relative"
                                style={{
                                    width: `${track.progress}%`,
                                    background: isDone ? '#2ECC71' : isRisk ? '#E74C3C' : '#C9A84C'
                                }}
                            >
                                {track.staffFocused && !isDone && (
                                    <div className="absolute inset-0 bg-white/30 animate-pulse" />
                                )}
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold font-mono">
                            <div className="bg-[#080C18] p-2 rounded border border-[#1E2D50]">
                                <span className="text-[#4A5A7A] block text-[9px] uppercase tracking-wider mb-1">Qualidade</span>
                                <span className="text-[#F0E6D3] text-lg">{Math.floor(track.quality)}</span>
                            </div>
                            <div className="bg-[#080C18] p-2 rounded border border-[#1E2D50]">
                                <span className="text-[#4A5A7A] block text-[9px] uppercase tracking-wider mb-1">Previsão</span>
                                <span className={track.finishingRisk > 50 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}>
                                    {track.projectedCompletion ? `Semana ${track.projectedCompletion}` : '---'}
                                </span>
                            </div>
                        </div>

                        {/* Controls */}
                        {!isDone && (
                            <div className="mt-auto pt-4 border-t border-[#1E2D50] flex flex-col gap-3">
                                {/* Budget Slider */}
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] uppercase tracking-wider text-[#8A9BB8] font-bold">Orçamento Semanal</span>
                                        <span className="text-[10px] font-mono text-[#C9A84C]">{formatMoney(track.weeklyBurnRate)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1000} // Minimal burn
                                        max={200000} // Max burn
                                        step={5000}
                                        value={track.weeklyBurnRate}
                                        onChange={(e) => setTrackBudget(key, Number(e.target.value))}
                                        className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                                    />
                                </div>
                                {/* Focus Toggle */}
                                <label className="flex items-center justify-between cursor-pointer p-2 rounded bg-[#161E35] border border-[#1E2D50] hover:border-[#2A3F6B] transition-colors">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#F0E6D3]">Focar Esforços</span>
                                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${track.staffFocused ? 'bg-[#C9A84C]' : 'bg-[#080C18]'}`}>
                                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${track.staffFocused ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={track.staffFocused}
                                        onChange={(e) => setTrackFocus(key, e.target.checked)}
                                    />
                                </label>
                            </div>
                        )}
                        {isDone && (
                            <div className="mt-auto pt-4 border-t border-[#1E2D50] text-center">
                                <span className="text-xs uppercase tracking-widest font-black text-[#2ECC71]">Concluído</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* BATERIA PANEL */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide flex items-center gap-2">
                        🥁 Bateria
                        {prep.bateria.outsideGigActive && (
                            <span className="text-[9px] bg-[#E67E22] text-[#080C18] px-2 py-0.5 rounded font-bold animate-pulse">SHOW EXTERNO ATIVO</span>
                        )}
                    </h3>
                    <div className="text-right">
                         <div className="text-[10px] text-[#4A5A7A] uppercase tracking-wider font-bold">Renda de Shows</div>
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
                             {/* Optimal Zone Marker (75-95%) */}
                             <div className="absolute top-0 bottom-0 bg-[#2ECC71]/20 border-l border-r border-[#2ECC71]/30" style={{ left: '75%', right: '5%' }} />

                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${prep.bateria.form}%`,
                                    background: prep.bateria.form > 95 ? '#E74C3C' : prep.bateria.form >= 75 ? '#2ECC71' : '#C9A84C'
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] text-[#4A5A7A] mt-1 font-mono uppercase">
                            <span>Crua</span>
                            <span>Ideal (75-95)</span>
                            <span>Passada</span>
                        </div>
                    </div>

                    {/* Energy Bar */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#8A9BB8]">Energia</span>
                            <span className="text-xs font-mono font-bold text-[#F0E6D3]">{Math.floor(prep.bateria.energy)}%</span>
                        </div>
                        <div className="h-1.5 bg-[#161E35] rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${prep.bateria.energy}%`,
                                    background: prep.bateria.energy < 30 ? '#E74C3C' : '#3498DB'
                                }}
                            />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-[#080C18] p-3 rounded-lg border border-[#1E2D50]">
                            <div className="text-[10px] text-[#4A5A7A] uppercase tracking-wider font-bold mb-1">Presença</div>
                            <div className="text-lg font-mono font-black text-[#F0E6D3]">{prep.bateria.availabilityThisWeek}%</div>
                        </div>
                        <div className="bg-[#080C18] p-3 rounded-lg border border-[#1E2D50]">
                            <div className="text-[10px] text-[#4A5A7A] uppercase tracking-wider font-bold mb-1">Ensaios</div>
                            <div className="text-lg font-mono font-black text-[#F0E6D3]">
                                {prep.bateria.rehearsalsHeld} <span className="text-[10px] text-[#E74C3C]">(-{prep.bateria.rehearsalsMissed})</span>
                            </div>
                        </div>
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
                    {playerSchool.currentDivision === 'Grupo Especial' && (
                        <p className="text-[9px] text-center text-[#4A5A7A] italic">Escolas do Especial raramente buscam shows menores.</p>
                    )}
                </div>
            </section>

            {/* STAFF STRESS PANEL */}
            <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg lg:col-span-2 flex flex-col">
                <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide mb-6 flex justify-between items-center">
                    <span>🧘 Gestão de Estresse</span>
                    <span className="text-[10px] bg-[#161E35] text-[#8A9BB8] px-2 py-1 rounded font-normal">Descanso recupera energia e reduz estresse</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {prep.staffStress.map(ss => {
                        const staff = playerSchool.staff.find(s => s.id === ss.staffId);
                        if (!staff) return null;

                        // Stress Visuals
                        let stressColor = '#2ECC71';
                        if (ss.stressLevel > 30) stressColor = '#F1C40F';
                        if (ss.stressLevel > 60) stressColor = '#E67E22';
                        if (ss.stressLevel > 80) stressColor = '#E74C3C';

                        return (
                            <div key={ss.staffId} className={`p-4 rounded-lg border flex justify-between items-center transition-colors ${
                                ss.isResting ? 'bg-[#080C18] border-[#2A3F6B] opacity-70' : 'bg-[#161E35] border-[#1E2D50]'
                            }`}>
                                <div className="flex-1 min-w-0 mr-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="font-bold text-[#F0E6D3] truncate">{staff.name}</div>
                                        <div className="text-[9px] text-[#8A9BB8] uppercase tracking-wider font-bold ml-2">{formatRole(staff.role).split(' ')[0]}</div>
                                    </div>

                                    {/* Stress Dot Bar */}
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[9px] text-[#4A5A7A] font-bold uppercase w-12">Estresse</span>
                                        <div className="flex-1 flex gap-0.5 h-1.5">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={`flex-1 rounded-sm ${
                                                    (ss.stressLevel / 10) > i ? '' : 'bg-[#080C18]'
                                                }`}
                                                style={{ background: (ss.stressLevel / 10) > i ? stressColor : undefined }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                     {/* Energy Bar */}
                                     <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-[#4A5A7A] font-bold uppercase w-12">Energia</span>
                                        <div className="flex-1 h-1.5 bg-[#080C18] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#3498DB]" style={{ width: `${ss.energy}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStaffRest(ss.staffId, !ss.isResting)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
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

      {/* EVENT MODAL */}
      {pendingEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className={`rounded-xl p-8 max-w-lg w-full border-2 shadow-2xl transform transition-all ${
              pendingEvent.severity === 'Major'
                ? 'border-[#E74C3C] bg-[#1A0505]'
                : 'border-[#2A3F6B] bg-[#0F1629]'
            }`}>
              {pendingEvent.severity === 'Major' && (
                <div className="text-[#E74C3C] text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="text-xl">⚠️</span> Evento Maior
                </div>
              )}
              <h2 className="text-2xl font-black text-[#F0E6D3] mb-4 leading-tight">{pendingEvent.title}</h2>
              <p className="text-[#8A9BB8] text-sm leading-relaxed mb-8 border-l-2 border-[#1E2D50] pl-4">
                  {pendingEvent.description}
              </p>

              <div className="flex flex-col gap-3">
                <button onClick={() => resolvePreparationEvent(pendingEvent.id, 'A')}
                  className="w-full p-5 rounded-xl bg-[#1E2D50] hover:bg-[#2A3F6B] border border-[#2A3F6B] text-left transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#C9A84C]/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                  <div className="relative z-10">
                      <div className="font-black text-[#F0E6D3] mb-1 text-lg">{pendingEvent.optionA.label}</div>
                      <div className="text-xs text-[#4A5A7A] font-mono group-hover:text-[#8A9BB8] transition-colors">
                          {pendingEvent.optionA.effect.replace(/_/g, ' ').toLowerCase()}
                      </div>
                  </div>
                </button>
                <button onClick={() => resolvePreparationEvent(pendingEvent.id, 'B')}
                  className="w-full p-5 rounded-xl bg-[#1E2D50] hover:bg-[#2A3F6B] border border-[#2A3F6B] text-left transition-all group relative overflow-hidden">
                   <div className="absolute inset-0 bg-[#C9A84C]/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                   <div className="relative z-10">
                      <div className="font-black text-[#F0E6D3] mb-1 text-lg">{pendingEvent.optionB.label}</div>
                      <div className="text-xs text-[#4A5A7A] font-mono group-hover:text-[#8A9BB8] transition-colors">
                          {pendingEvent.optionB.effect.replace(/_/g, ' ').toLowerCase()}
                      </div>
                   </div>
                </button>
              </div>
            </div>
          </div>
      )}

    </div>
  );
}
