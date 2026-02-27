"use client";

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  getQualityLabel
} from '../services/preparationService';
import {
  ProductionTrack,
  StaffRole,
  WeekTurnState
} from '../types/models';
import {
  formatMoney
} from '../utils/textUtils';

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

function calculateTurnPreview(school: any, turnState: any, currentWeek: number): any {
    // This logic resides in service/preparationService.ts but we need the output here.
    // The store should provide a computed preview or we call the service function.
    // Since we can't import the service logic directly into a client component easily if it depends on store state not passed...
    // Actually we can import the service function.
    const { calculateTurnPreview } = require('../services/preparationService');
    return calculateTurnPreview(school, turnState, currentWeek);
}

// --- SUB-COMPONENTS ---

function CrisisCardItem({ crisis, onResolve, turnState, schoolBudget }: any) {
    const isResolved = turnState.crisisAllocations[crisis.id] !== undefined;
    const alloc = turnState.crisisAllocations[crisis.id];

    return (
        <div className={`bg-[#080C18] border border-[#E74C3C]/50 rounded-lg overflow-hidden mb-3 shadow-lg ${isResolved ? 'opacity-70 grayscale' : ''}`}>
            <div className="p-3 border-b border-[#1E2D50] flex justify-between items-center bg-[#1A0505]">
                <span className="text-[10px] font-black text-[#E74C3C] uppercase tracking-wider">
                    🔥 {crisis.tier}
                </span>
                <span className="text-[9px] text-[#8A9BB8] font-mono">
                    Expira em {crisis.expiresAtWeek - crisis.weekCreated} sem
                </span>
            </div>
            <div className="p-3">
                <h4 className="text-sm font-bold text-[#F0E6D3] mb-2">{crisis.title}</h4>
                <p className="text-[10px] text-[#8A9BB8] mb-3 leading-relaxed">
                    {crisis.description}
                </p>

                <div className="space-y-2">
                    {crisis.options.map((opt: any, idx: number) => {
                        const isSelected = alloc?.optionIndex === idx;
                        const canAffordMoney = schoolBudget >= opt.budgetCost;
                        const canAffordPP = true; // Handled by store validation mostly, visuals here

                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (isSelected) {
                                        // Deallocate (need action for this) - Assuming toggle or separate X button?
                                        // For now, allow switching. To deselect, maybe a separate "Cancel" button or toggle?
                                        // Using onResolve to toggle/set.
                                    } else {
                                        onResolve(crisis.id, idx);
                                    }
                                }}
                                disabled={!isSelected && (!canAffordMoney)}
                                className={`w-full text-left p-2 rounded border transition-all flex justify-between items-center ${
                                    isSelected
                                    ? 'bg-[#E74C3C] border-[#E74C3C] text-white'
                                    : 'bg-[#161E35] border-[#2A3F6B] hover:border-[#F0E6D3] text-[#8A9BB8]'
                                }`}
                            >
                                <span className="text-[10px] font-bold truncate max-w-[60%]">{opt.label}</span>
                                <div className="flex gap-2 text-[9px] font-mono">
                                    {opt.ppCost > 0 && <span>{opt.ppCost} PP</span>}
                                    {opt.budgetCost > 0 && <span>{formatMoney(opt.budgetCost)}</span>}
                                </div>
                            </button>
                        )
                    })}
                </div>
                {isResolved && (
                    <div className="mt-2 text-center">
                        <button className="text-[9px] text-[#E74C3C] underline">Cancelar Resolução</button>
                    </div>
                )}
            </div>
        </div>
    )
}

function ProductionCardItem({ card, isActive, canActivate, onToggle }: any) {
    return (
        <div className={`p-3 rounded-lg border transition-all cursor-pointer ${
            isActive
            ? 'bg-[#C9A84C]/20 border-[#C9A84C]'
            : canActivate
            ? 'bg-[#080C18] border-[#2A3F6B] hover:border-[#60C0FF]'
            : 'bg-[#080C18] border-[#1E2D50] opacity-50'
        }`}
        onClick={() => {
            if (isActive || canActivate) onToggle(card.id);
        }}>
            <div className="flex justify-between items-center mb-1">
                <span className={`text-[10px] font-bold ${isActive ? 'text-[#C9A84C]' : 'text-[#60C0FF]'}`}>
                    {card.label}
                </span>
                {isActive && <span className="text-[8px] bg-[#C9A84C] text-[#080C18] px-1 rounded font-bold">ATIVO</span>}
            </div>
            <p className="text-[9px] text-[#8A9BB8] leading-tight mb-2">{card.description}</p>
            <div className="flex justify-between text-[9px] font-mono text-[#4A5A7A]">
                <span>{card.budgetCost > 0 ? `-${formatMoney(card.budgetCost)}` : 'Grátis'}</span>
                <span>Restam: {card.usesRemaining}</span>
            </div>
        </div>
    )
}

export default function PreparationDashboard() {
  const {
    gameState,
    schools,
    startTurn,
    allocatePP,
    allocateCrisisPP,
    deallocateCrisisPP,
    activateCard,
    deactivateCard,
    confirmTurn,
    setHarmoniaFocus,
    advanceWeek
  } = useGameStore();

  const { playerSchoolId, preparationSubPhase } = gameState;
  const playerSchool = schools.find(s => s.id === playerSchoolId);

  // Ensure turn is started
  useEffect(() => {
      if (playerSchool && playerSchool.preparation && !playerSchool.preparation.currentTurn) {
          startTurn();
      }
  }, [playerSchool?.preparation, startTurn]);

  if (!playerSchool || !playerSchool.preparation) return <div className="p-10 text-white">Carregando...</div>;

  const prep = playerSchool.preparation;
  const turn = prep.currentTurn;

  if (!turn) return <div className="p-10 text-white">Iniciando Turno...</div>;

  // Calculate Preview
  const preview = calculateTurnPreview(playerSchool, turn, gameState.currentWeek);

  // Validate Minimums
  const minimumsMet = Object.keys(preview.tracks).every(k => {
      const t = k as ProductionTrack;
      // Logic: allocated >= min? The preview doesn't explicitly flag this boolean,
      // but we can check if `qualityDelta` is not severe penalty or pass min info.
      // Better: Re-calculate mins or check prepService.
      // We will assume `allocatePP` caps or UI handles visuals.
      // The button check:
      // We need `computeTrackMinimums` here?
      // Or just trust the player sees alerts?
      // Requirement: "Confirmar Semana button is disabled if any track has less than its minimum".
      // We need the minimums.
      // Let's import the function.
      const { computeTrackMinimums } = require('../services/preparationService');
      const mins = computeTrackMinimums(prep, gameState.currentWeek, playerSchool);
      return turn.allocations[t] >= mins[t];
  });

  // Calculate PP Pool
  let usedPP = 0;
  Object.values(turn.allocations).forEach((v: any) => usedPP += v);
  Object.values(turn.crisisAllocations).forEach((v: any) => usedPP += v.ppCost);
  const remainingPP = turn.totalPP - usedPP;

  const headerBg = playerSchool.colors[0] || '#1F2937';
  const headerText = getContrastColor(playerSchool.colors[0]);

  return (
    <div className="flex flex-col h-screen bg-[#080C18] text-[#F0E6D3] font-sans overflow-hidden">

      {/* TOP BAR */}
      <header className="px-6 py-3 flex justify-between items-center bg-[#0F1629] border-b border-[#1E2D50] shadow-md z-20">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-[#C9A84C]"
                   style={{ backgroundImage: `url(${playerSchool.logo})` }} />
              <div>
                  <h1 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wider">{playerSchool.name}</h1>
                  <div className="text-[10px] text-[#8A9BB8] font-mono">
                      Semana {gameState.currentWeek} • Ato {prep.currentAct} • {preparationSubPhase === 'BiWeekly' ? 'Bi-Semanal' : 'Reta Final'}
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-8">
              {/* PP POOL */}
              <div className="flex flex-col items-center">
                  <div className="text-[9px] uppercase font-bold text-[#8A9BB8] tracking-widest mb-1">Pontos de Produção</div>
                  <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                          {Array.from({ length: turn.totalPP }).map((_, i) => (
                              <div key={i} className={`w-2 h-4 rounded-sm transition-all ${
                                  i < usedPP ? 'bg-[#1E2D50]' : 'bg-[#C9A84C] shadow-[0_0_8px_#C9A84C]'
                              }`} />
                          ))}
                      </div>
                      <span className="text-xl font-black font-mono text-[#F0E6D3]">{remainingPP}</span>
                  </div>
              </div>

              {/* BUDGET */}
              <div className="text-right">
                  <div className="text-[9px] uppercase font-bold text-[#8A9BB8] tracking-widest mb-1">Caixa Disponível</div>
                  <div className={`text-xl font-black font-mono ${preview.finance.isDangerous ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
                      {formatMoney(preview.finance.budgetAfter)}
                  </div>
                  <div className="text-[9px] text-[#E74C3C] font-mono">-{formatMoney(preview.finance.spendThisTurn)} esta rodada</div>
              </div>

              <button
                onClick={confirmTurn}
                disabled={!minimumsMet}
                className={`px-6 py-3 rounded-lg font-black uppercase tracking-widest text-xs transition-all ${
                    minimumsMet
                    ? 'bg-[#C9A84C] text-[#080C18] hover:bg-[#E0C060] hover:scale-105 shadow-[0_0_15px_rgba(201,168,76,0.3)]'
                    : 'bg-[#161E35] text-[#4A5A7A] cursor-not-allowed border border-[#1E2D50]'
                }`}
              >
                  {minimumsMet ? 'Confirmar Semana' : 'Atenda os Mínimos'}
              </button>
          </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">

          {/* LEFT: PRODUCTION TABLE (60%) */}
          <div className="w-[60%] p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">

              {/* TRACKS */}
              <div className="grid grid-cols-1 gap-6">
                  {/* ALEGORIAS */}
                  <TrackControl
                    track="Alegorias"
                    prep={prep}
                    preview={preview.tracks.Alegorias}
                    alloc={turn.allocations.Alegorias}
                    min={require('../services/preparationService').computeTrackMinimums(prep, gameState.currentWeek, playerSchool).Alegorias}
                    remainingPP={remainingPP}
                    onChange={(v: number) => allocatePP('Alegorias', v)}
                  />

                  {/* FANTASIAS */}
                  <TrackControl
                    track="Fantasias"
                    prep={prep}
                    preview={preview.tracks.Fantasias}
                    alloc={turn.allocations.Fantasias}
                    min={require('../services/preparationService').computeTrackMinimums(prep, gameState.currentWeek, playerSchool).Fantasias}
                    remainingPP={remainingPP}
                    onChange={(v: number) => allocatePP('Fantasias', v)}
                  />

                  {/* BATERIA */}
                  <div className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#E74C3C]" />
                      <div className="flex justify-between items-center mb-4 pl-3">
                          <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide">🥁 Bateria</h3>
                          <div className="flex items-center gap-4">
                              <div className="text-right">
                                  <div className="text-[9px] uppercase text-[#8A9BB8] font-bold">Forma</div>
                                  <div className="text-xl font-mono font-black text-[#E74C3C]">{Math.floor(prep.bateria.form)}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-[9px] uppercase text-[#8A9BB8] font-bold">Energia</div>
                                  <div className="text-xl font-mono font-black text-[#F1C40F]">{Math.floor(prep.bateria.energy)}</div>
                              </div>
                          </div>
                      </div>

                      <SliderControl
                        value={turn.allocations.Bateria}
                        min={require('../services/preparationService').computeTrackMinimums(prep, gameState.currentWeek, playerSchool).Bateria}
                        max={turn.allocations.Bateria + remainingPP}
                        color="#E74C3C"
                        onChange={(v) => allocatePP('Bateria', v)}
                      />
                  </div>

                  {/* HARMONIA */}
                  <div className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#3498DB]" />
                      <div className="flex justify-between items-center mb-4 pl-3">
                          <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide">🎤 Harmonia</h3>
                          <div className="flex gap-2">
                              {(['Samba', 'Marcha', 'Vocal', 'Equilibrado'] as const).map(f => (
                                  <button key={f} onClick={() => setHarmoniaFocus(f)}
                                    className={`text-[9px] font-bold uppercase px-2 py-1 rounded transition-all ${
                                        prep.harmoniaState.diretorFocus === f
                                        ? 'bg-[#3498DB] text-white'
                                        : 'bg-[#161E35] text-[#4A5A7A] hover:bg-[#1E2D50]'
                                    }`}>
                                      {f}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <SliderControl
                        value={turn.allocations.Harmonia}
                        min={require('../services/preparationService').computeTrackMinimums(prep, gameState.currentWeek, playerSchool).Harmonia}
                        max={turn.allocations.Harmonia + remainingPP}
                        color="#3498DB"
                        onChange={(v) => allocatePP('Harmonia', v)}
                      />
                  </div>
              </div>

              {/* CRISES INLINE */}
              {prep.activeCrises.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                      {prep.activeCrises.filter((c: any) => !c.isResolved).map((c: any) => (
                          <CrisisCardItem
                            key={c.id}
                            crisis={c}
                            onResolve={allocateCrisisPP}
                            turnState={turn}
                            schoolBudget={playerSchool.budget}
                          />
                      ))}
                  </div>
              )}

          </div>

          {/* RIGHT: TURN PREVIEW (40%) */}
          <div className="w-[40%] bg-[#0B101E] border-l border-[#1E2D50] p-6 overflow-y-auto custom-scrollbar">
              <h2 className="text-xs font-black text-[#8A9BB8] uppercase tracking-widest mb-6 border-b border-[#1E2D50] pb-2">
                  Previsão da Semana
              </h2>

              <div className="space-y-6">

                  {/* ALERTS */}
                  {preview.alerts.length > 0 && (
                      <div className="space-y-2">
                          {preview.alerts.map((a: any, i: number) => (
                              <div key={i} className={`p-3 rounded border text-[10px] font-bold flex items-center gap-2 ${
                                  a.type === 'danger' ? 'bg-[#E74C3C]/10 border-[#E74C3C] text-[#E74C3C]' :
                                  a.type === 'warning' ? 'bg-[#F1C40F]/10 border-[#F1C40F] text-[#F1C40F]' :
                                  'bg-[#3498DB]/10 border-[#3498DB] text-[#3498DB]'
                              }`}>
                                  <span>{a.type === 'danger' ? '🔴' : a.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                                  {a.message}
                              </div>
                          ))}
                      </div>
                  )}

                  {/* TRACKS PREVIEW */}
                  <div className="space-y-4">
                      {['Alegorias', 'Fantasias'].map(t => {
                          const p = preview.tracks[t as ProductionTrack];
                          const label = getQualityLabel(p.qualityAfter);
                          return (
                              <div key={t} className="bg-[#161E35] p-3 rounded-lg border border-[#1E2D50]">
                                  <div className="flex justify-between mb-1">
                                      <span className="text-xs font-bold text-[#F0E6D3]">{t}</span>
                                      <span className="text-[10px] font-mono" style={{ color: label.color }}>{label.label}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                                      <div>
                                          <div className="text-[#8A9BB8]">Qualidade</div>
                                          <div className="font-mono font-bold text-[#F0E6D3]">
                                              {Math.floor(p.qualityBefore)} → <span style={{ color: p.qualityDelta > 0 ? '#2ECC71' : '#E74C3C' }}>{Math.floor(p.qualityAfter)}</span>
                                          </div>
                                      </div>
                                      <div>
                                          <div className="text-[#8A9BB8]">Progresso</div>
                                          <div className="font-mono font-bold text-[#F0E6D3]">
                                              {Math.floor(p.progressBefore)}% → <span className="text-[#2ECC71]">{Math.floor(p.progressAfter)}%</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>

                  {/* STAFF STRESS */}
                  <div>
                      <h3 className="text-[10px] uppercase font-bold text-[#8A9BB8] mb-2">Estresse da Equipe</h3>
                      <div className="space-y-2">
                          {preview.staff.map((s: any) => (
                              <div key={s.staffId} className="flex justify-between items-center text-[10px] bg-[#161E35] p-2 rounded">
                                  <span className="text-[#F0E6D3]">{s.name}</span>
                                  <div className="flex items-center gap-2">
                                      <div className="w-16 h-1 bg-[#080C18] rounded-full overflow-hidden">
                                          <div className={`h-full ${s.stressAfter > 70 ? 'bg-[#E74C3C]' : 'bg-[#2ECC71]'}`}
                                               style={{ width: `${s.stressAfter}%` }} />
                                      </div>
                                      <span className={`font-mono ${s.stressDelta > 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
                                          {s.stressBefore}→{s.stressAfter}
                                      </span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* CARDS */}
                  <div>
                      <h3 className="text-[10px] uppercase font-bold text-[#8A9BB8] mb-2">Cartas Disponíveis</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {prep.productionCards.map((c: any) => (
                              <ProductionCardItem
                                key={c.id}
                                card={c}
                                isActive={turn.activeCards.includes(c.id)}
                                canActivate={turn.activeCards.length < turn.maxCards}
                                onToggle={(id: string) => turn.activeCards.includes(id) ? deactivateCard(id) : activateCard(id)}
                              />
                          ))}
                      </div>
                  </div>

              </div>
          </div>

      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function TrackControl({ track, prep, preview, alloc, min, remainingPP, onChange }: any) {
    const colorMap: any = { Alegorias: '#C9A84C', Fantasias: '#9B59B6' };
    const color = colorMap[track];

    return (
        <div className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color }} />
            <div className="flex justify-between items-center mb-4 pl-3">
                <h3 className="text-lg font-black text-[#F0E6D3] uppercase tracking-wide flex items-center gap-3">
                    {track}
                    {preview.isDecaying && <span className="text-[9px] text-[#E74C3C] bg-[#E74C3C]/10 px-1 rounded animate-pulse">DECAINDO</span>}
                </h3>
                <div className="text-2xl font-mono font-black" style={{ color }}>{Math.floor(preview.qualityAfter)}</div>
            </div>

            {/* PIPELINE VISUALIZATION (Simplified) */}
            <div className="h-1.5 bg-[#161E35] rounded-full overflow-hidden mb-4 relative">
                <div className="absolute top-0 left-0 h-full transition-all duration-300"
                     style={{ width: `${preview.progressAfter}%`, background: color }} />
                <div className="absolute top-0 left-0 h-full w-[1px] bg-white/20" style={{ left: '25%' }} />
                <div className="absolute top-0 left-0 h-full w-[1px] bg-white/20" style={{ left: '50%' }} />
                <div className="absolute top-0 left-0 h-full w-[1px] bg-white/20" style={{ left: '75%' }} />
            </div>

            <SliderControl
                value={alloc}
                min={min}
                max={alloc + remainingPP}
                color={color}
                onChange={onChange}
            />
        </div>
    )
}

function SliderControl({ value, min, max, color, onChange }: any) {
    return (
        <div className="relative pt-6 pb-2 pl-3">
            {/* Ticks */}
            <div className="absolute top-2 left-3 right-0 flex justify-between px-1 pointer-events-none">
                {Array.from({ length: 11 }).map((_, i) => (
                    <div key={i} className={`w-px h-2 ${i <= max ? 'bg-[#4A5A7A]' : 'bg-[#1E2D50]'}`} />
                ))}
            </div>

            {/* Min Marker */}
            {min > 0 && (
                <div className="absolute top-0 h-full bg-[#E74C3C]/10 border-r border-[#E74C3C]/50 pointer-events-none z-0"
                     style={{ width: `${(min / 10) * 100}%`, left: '12px' }}>
                    <div className="absolute top-0 right-0 text-[8px] text-[#E74C3C] font-bold -mt-3 transform translate-x-1/2">MÍN</div>
                </div>
            )}

            <input
                type="range"
                min={0}
                max={10} // Cap UI at 10 for simplicity, logic handles rest
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-2 bg-[#161E35] rounded-lg appearance-none cursor-pointer relative z-10"
                style={{ accentColor: color }}
            />

            <div className="flex justify-between mt-2 text-[9px] font-mono text-[#8A9BB8]">
                <span>0 PP</span>
                <span style={{ color }}>{value} PP ALOCADOS</span>
                <span>MAX</span>
            </div>
        </div>
    )
}
