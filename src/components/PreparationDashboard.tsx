"use client";

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  ProductionTrack,
  AlegoriaStageId,
  StageEvent,
  PreparationEvent,
  CrisisCard,
  StaffAttentionState,
  WeeklyBudgetCompass,
  WeekPreview,
  School,
  StaffRole
} from '../types/models';
import { formatMoney, formatRole } from '../utils/textUtils';
import { evaluateConditions } from '../utils/eventUtils';
import { STAFF_ACTION_POOL, estimatedAlegoriaProgressPerWeek } from '../services/preparationService';

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

// --- SUB-COMPONENTS ---

function MesaDeCrise({ crises, currentWeek, onResolve, schoolBudget }: {
  crises: CrisisCard[];
  currentWeek: number;
  onResolve: (crisisId: string, optionIndex: number) => void;
  schoolBudget: number;
}) {
  const active = crises.filter(c => !c.isResolved);

  const tierConfig: Record<string, { color: string; label: string; border: string }> = {
    Urgente:     { color: '#E74C3C', label: '🔴 URGENTE',    border: 'border-[#E74C3C]/50' },
    Atencao:     { color: '#F1C40F', label: '🟡 ATENÇÃO',    border: 'border-[#F1C40F]/50' },
    Oportunidade:{ color: '#2ECC71', label: '🟢 OPORTUNIDADE',border: 'border-[#2ECC71]/50' },
    Informacao:  { color: '#3498DB', label: '🔵 INFO',        border: 'border-[#3498DB]/50' },
  };

  return (
    <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-widest">
          📋 Mesa de Crise
        </h3>
        {active.length > 0 && (
          <span className="bg-[#E74C3C] text-white text-xs font-black px-2 py-0.5 rounded-full">
            {active.length}
          </span>
        )}
      </div>

      {active.length === 0 && (
        <p className="text-center text-[#4A5A7A] text-xs py-6 font-mono">
          Nenhuma crise ativa. Por enquanto.
        </p>
      )}

      <div className="space-y-3">
        {active.map(crisis => {
          const cfg = tierConfig[crisis.tier];
          const weeksLeft = crisis.expiresAtWeek - currentWeek;
          const isExpiringSoon = weeksLeft <= 1;

          return (
            <CrisisCardItem
              key={crisis.id}
              crisis={crisis}
              cfg={cfg}
              weeksLeft={weeksLeft}
              isExpiringSoon={isExpiringSoon}
              onResolve={onResolve}
              schoolBudget={schoolBudget}
            />
          );
        })}
      </div>
    </section>
  );
}

function CrisisCardItem({ crisis, cfg, weeksLeft, isExpiringSoon, onResolve, schoolBudget }: any) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`bg-[#080C18] border ${cfg.border} rounded-lg overflow-hidden transition-all duration-300`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#161E35] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/30" style={{ color: cfg.color }}>
                        {cfg.label}
                    </span>
                    <span className="text-xs font-bold text-[#F0E6D3] text-left leading-tight truncate max-w-[150px] lg:max-w-[200px]">
                        {crisis.title}
                    </span>
                </div>
                {crisis.tier !== 'Informacao' && (
                    <span className={`text-[10px] font-mono font-bold ${isExpiringSoon ? 'text-[#E74C3C] animate-pulse' : 'text-[#8A9BB8]'}`}>
                        {weeksLeft} sem.
                    </span>
                )}
            </button>

            {expanded && (
                <div className="p-3 border-t border-[#1E2D50] bg-[#0F1629]">
                    <p className="text-[11px] text-[#8A9BB8] mb-3 leading-relaxed">
                        {crisis.description}
                    </p>

                    {crisis.tier !== 'Informacao' && (
                        <div className="bg-[#1A0505] border border-[#E74C3C]/30 p-2 rounded mb-3">
                            <div className="text-[9px] text-[#E74C3C] font-bold uppercase mb-1">Se ignorar:</div>
                            <div className="text-[10px] text-[#F0E6D3]">{crisis.inactionConsequence}</div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {crisis.options.map((opt: any, idx: number) => {
                            const canAfford = schoolBudget >= opt.budgetCost;
                            // TODO: Check staff attention here too if we passed attention state down
                            // For simplicity, just checking budget for disabled state visual
                            const isDisabled = !canAfford;

                            return (
                                <button
                                    key={idx}
                                    disabled={isDisabled}
                                    onClick={() => onResolve(crisis.id, idx)}
                                    className={`w-full text-left p-2 rounded border transition-all ${
                                        isDisabled
                                        ? 'bg-[#161E35] border-[#1E2D50] opacity-50 cursor-not-allowed'
                                        : 'bg-[#080C18] border-[#2A3F6B] hover:border-[#F0E6D3] hover:bg-[#161E35]'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-[#F0E6D3]">{opt.label}</span>
                                        <div className="flex gap-2 text-[9px] font-mono">
                                            {opt.budgetCost !== 0 && (
                                                <span className={opt.budgetCost > 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}>
                                                    {opt.budgetCost > 0 ? '-' : '+'}{formatMoney(Math.abs(opt.budgetCost))}
                                                </span>
                                            )}
                                            {opt.attentionCost > 0 && (
                                                <span className="text-[#F1C40F]">{opt.attentionCost}★</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-[#4A5A7A]">{opt.description}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function StaffAttentionPanel({ staffAttention, playerSchool, currentWeek, onAssign, onUnassign }: {
  staffAttention: StaffAttentionState[];
  playerSchool: School;
  currentWeek: number;
  onAssign: (staffId: string, actionId: string) => void;
  onUnassign: (staffId: string, actionId: string) => void;
}) {
  return (
    <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-4 shadow-lg mb-6">
      <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-widest mb-4">
        👥 Atenção da Equipe
      </h3>
      <div className="space-y-4">
        {staffAttention.map(sa => {
          const actions = (STAFF_ACTION_POOL[sa.role] ?? []).filter(a => {
            if (!a.availableWeeks) return true;
            return currentWeek >= a.availableWeeks[0] && currentWeek <= a.availableWeeks[1];
          });
          const staffMember = playerSchool.staff.find(s => s.id === sa.staffId);
          if (!staffMember) return null;

          return (
            <div key={sa.staffId} className="bg-[#080C18] rounded-lg p-3 border border-[#1E2D50]">
              {/* Name + Role */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-bold text-[#F0E6D3]">{staffMember.name}</div>
                  <div className="text-[9px] text-[#8A9BB8] uppercase">{formatRole(sa.role)}</div>
                </div>
                {/* Attention dots */}
                <div className="flex flex-col items-end">
                  <div className="flex gap-1">
                    {Array.from({ length: sa.totalPoints }).map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full border-2 ${
                        i < sa.usedPoints
                          ? 'bg-[#C9A84C] border-[#C9A84C]'
                          : 'bg-transparent border-[#4A5A7A]'
                      }`} />
                    ))}
                  </div>
                  <div className="text-[8px] text-[#4A5A7A] italic mt-0.5">
                    Pontos resetam ao avançar
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {sa.burnoutRisk && (
                <div className="text-[9px] text-[#E74C3C] font-bold mb-2">⚠️ Risco de burnout</div>
              )}
              {sa.energyWarning && !sa.burnoutRisk && (
                <div className="text-[9px] text-[#F1C40F] font-bold mb-2">
                  ⚡ Usar tudo → penalidade de energia
                </div>
              )}

              {/* Available actions */}
              <div className="space-y-1">
                {actions.map(action => {
                  const isAssigned = sa.assignedActions.includes(action.id);
                  const canAffordPoints = sa.usedPoints + action.attentionCost <= sa.totalPoints || isAssigned;
                  const canAffordBudget = playerSchool.budget >= action.budgetCost;
                  const isDisabled = !isAssigned && (!canAffordPoints || !canAffordBudget);

                  const trackColors: Record<string, string> = {
                    Alegorias: '#E67E22', Harmonia: '#3498DB', Fantasias: '#9B59B6', Bateria: '#E74C3C', Crises: '#F1C40F'
                  };

                  return (
                    <button
                      key={action.id}
                      disabled={isDisabled}
                      onClick={() => isAssigned ? onUnassign(sa.staffId, action.id) : onAssign(sa.staffId, action.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-all border ${
                        isAssigned
                          ? 'bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#C9A84C]'
                          : isDisabled
                          ? 'bg-[#080C18] border-[#1E2D50] text-[#4A5A7A] opacity-50 cursor-not-allowed'
                          : 'bg-[#161E35] border-[#1E2D50] text-[#F0E6D3] hover:border-[#C9A84C]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate pr-2">{action.label}</span>
                        <div className="flex items-center gap-1 text-[8px] shrink-0">
                          {action.affectsTrack && (
                            <span className="px-1 rounded font-bold" style={{
                              background: trackColors[action.affectsTrack] + '30',
                              color: trackColors[action.affectsTrack],
                              border: `1px solid ${trackColors[action.affectsTrack]}50`,
                            }}>
                              {action.affectsTrack}
                            </span>
                          )}
                          {action.attentionCost > 0 && (
                            <span className="text-[#8A9BB8]">{action.attentionCost}pt</span>
                          )}
                          {action.budgetCost > 0 && (
                            <span className="text-[#E74C3C]">{formatMoney(action.budgetCost)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-[8px] text-[#8A9BB8] mt-0.5 leading-tight">{action.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeeklyCompassPanel({ compass, school }: {
  compass: WeeklyBudgetCompass;
  school: School;
}) {
  return (
    <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-4 shadow-lg mb-6">
      <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-widest mb-3">
        💰 Orçamento
      </h3>

      <div className="font-mono text-2xl font-black mb-0.5"
           style={{ color: school.budget < compass.dangerThreshold ? '#E74C3C' : '#C9A84C' }}>
        {formatMoney(compass.totalBudgetRemaining)}
      </div>
      <div className="text-[9px] text-[#8A9BB8] uppercase mb-4">Caixa total</div>

      <div className="space-y-2 text-[10px]">
        <div className="flex justify-between">
          <span className="text-[#8A9BB8]">Gasto projetado</span>
          <span className="font-mono font-bold"
                style={{ color: compass.isOverRecommended ? '#E74C3C' : '#F0E6D3' }}>
            {formatMoney(compass.projectedSpendThisWeek)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8A9BB8]">Custo recomendado</span>
          <span className="font-mono text-[#C9A84C]">
            {formatMoney(compass.recommendedSpendThisWeek)}
          </span>
        </div>
        {compass.isOverRecommended && (
          <div className="text-[#E74C3C] font-bold text-[9px]">
            ⚠️ +{formatMoney(compass.overspendAmount)} acima do recomendado
          </div>
        )}
        <div className="border-t border-[#1E2D50] pt-2 flex justify-between">
          <span className="text-[#8A9BB8]">Reserva estimada</span>
          <span className="font-mono font-bold"
                style={{ color: compass.runwayWeeksAtCurrentRate < 6 ? '#E74C3C'
                               : compass.runwayWeeksAtCurrentRate < 12 ? '#F1C40F'
                               : '#2ECC71' }}>
            {compass.runwayWeeksAtCurrentRate} semanas
          </span>
        </div>
      </div>
    </section>
  );
}

function ActionCardsPanel({ cards, pendingActionCards, budget, onUse }: {
    cards: any[], pendingActionCards: any[] | undefined, budget: number, onUse: (id: string) => void
}) {
    if (cards.length === 0) return null;

    return (
        <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-4 shadow-lg mb-6">
            <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-widest mb-3">
                🎴 Cartas de Ação
            </h3>
            <div className="space-y-2">
                {cards.map(card => {
                    const isPending = pendingActionCards?.some(pc => pc.cardId === card.id);
                    // If pending, budget is already deducted, so don't check budget for disable logic unless we assume refund
                    // Actually refund is logic store side. Visuals:

                    return (
                        <button
                            key={card.id}
                            onClick={() => onUse(card.id)}
                            disabled={!isPending && (card.usesRemaining === 0 || budget < card.budgetCost)}
                            className={`w-full text-left p-2 rounded border relative overflow-hidden group transition-all ${
                                isPending
                                ? 'bg-[#2ECC71]/20 border-[#2ECC71] hover:bg-[#2ECC71]/30'
                                : card.usesRemaining === 0
                                ? 'bg-[#161E35] border-[#1E2D50] opacity-50'
                                : 'bg-[#2A3F6B]/20 border-[#2A3F6B] hover:bg-[#2A3F6B]/40 hover:border-[#60C0FF]'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold text-[10px] ${isPending ? 'text-[#2ECC71]' : 'text-[#60C0FF]'}`}>
                                    {isPending ? '✓ Agendado' : card.label}
                                </span>
                                {card.usesPerSeason !== -1 && (
                                    <span className="text-[9px] bg-black/40 px-1.5 rounded text-[#8A9BB8]">
                                        {card.usesRemaining}/{card.usesPerSeason}
                                    </span>
                                )}
                            </div>
                            <div className={`text-[9px] mb-1 leading-tight ${isPending ? 'text-[#F0E6D3]' : 'text-[#8A9BB8]'}`}>
                                {isPending ? `Será executado ao avançar. Clique para cancelar.` : card.description}
                            </div>
                            {card.budgetCost > 0 && !isPending && (
                                <div className="text-[9px] text-[#E74C3C] font-mono">-{formatMoney(card.budgetCost)}</div>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

function WeekPreviewPanel({
  preview, prep, currentWeek, canAdvance, advanceText, onAdvance
}: {
  preview: WeekPreview | null;
  prep: any;
  currentWeek: number;
  canAdvance: boolean;
  advanceText: string;
  onAdvance: () => void;
}) {
  const severityIcon = { info: '→', warning: '⚠️', danger: '🔴', positive: '✅' };
  const severityColor = {
    info: '#8A9BB8', warning: '#F1C40F', danger: '#E74C3C', positive: '#2ECC71'
  };

  const hasPending = (prep.pendingStaffActions?.length > 0) || (prep.pendingActionCards?.length > 0);

  return (
    <section className="bg-[#080C18] border border-[#1E2D50] rounded-xl p-4 shadow-lg mb-6">

      {/* Planned Actions Section */}
      {hasPending && (
        <div className="mb-4 border-b border-[#1E2D50] pb-4">
            <div className="text-[9px] text-[#8A9BB8] uppercase font-bold mb-2">
            O que vai acontecer:
            </div>
            {prep.pendingStaffActions?.map((pa: any, i: number) => {
            const role = pa.role as StaffRole;
            const action = STAFF_ACTION_POOL[role]?.find((a: any) => a.id === pa.actionId);
            return action ? (
                <div key={`sa-${i}`} className="text-[9px] text-[#2ECC71] flex items-center gap-1 mb-1">
                <span>✓</span>
                <span className="font-bold">{action.label}</span>
                {action.affectsTrack && (
                    <span className="text-[#4A5A7A] ml-auto">→ {action.affectsTrack}</span>
                )}
                </div>
            ) : null;
            })}
            {prep.pendingActionCards?.map((pc: any, i: number) => {
                const card = prep.unlockedActionCards?.find((c: any) => c.id === pc.cardId);
                return card ? (
                    <div key={`ac-${i}`} className="text-[9px] text-[#60C0FF] flex items-center gap-1 mb-1">
                    <span>✓</span>
                    <span className="font-bold">{card.label}</span>
                    <span className="text-[#4A5A7A] ml-auto">→ Carta</span>
                    </div>
                ) : null;
            })}
        </div>
      )}

      <h3 className="text-[10px] font-black text-[#8A9BB8] uppercase tracking-widest mb-3">
        Alertas & Previsões:
      </h3>

      {preview && (
        <div className="space-y-2 mb-4">
          {preview.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span style={{ color: severityColor[item.severity] }}>
                {severityIcon[item.severity]}
              </span>
              <div className="flex-1">
                <span className="text-[#F0E6D3]">{item.label}</span>
                {item.quantifiedImpact && (
                  <div className="font-mono font-bold mt-0.5"
                        style={{ color: severityColor[item.severity] }}>
                    {item.quantifiedImpact}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && preview.unusedActionsRemaining > 3 && (
        <div className="mb-2 p-2 rounded border border-[#F1C40F]/30 bg-[#F1C40F]/5
                        text-[#F1C40F] text-[9px] font-bold">
          ⚠️ {preview.unusedActionsRemaining} ações de equipe não utilizadas
        </div>
      )}

      {preview && preview.unusedCrisesCount > 0 && (
        <div className="mb-3 p-2 rounded border border-[#E74C3C]/30 bg-[#E74C3C]/5
                        text-[#E74C3C] text-[9px] font-bold">
          🔴 {preview.unusedCrisesCount} crise(s) vão sofrer consequências automáticas
        </div>
      )}

      <button
        onClick={onAdvance}
        disabled={!canAdvance}
        className={`w-full py-4 font-black uppercase text-sm rounded-lg transition-all duration-200
                    transform shadow-lg ${canAdvance
                      ? 'hover:scale-105 active:scale-95 text-[#080C18]'
                      : 'opacity-50 cursor-not-allowed bg-[#161E35] text-[#8A9BB8]'
                    }`}
        style={canAdvance
          ? { background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 100%)' }
          : {}}
      >
        {advanceText} →
      </button>
    </section>
  );
}

// --- MAIN COMPONENT ---

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
    setComissaoApproach,
    resolveCrisis,
    assignStaffAction,
    unassignStaffAction,
    useActionCard,
    refreshWeekPreview
  } = useGameStore();

  const { playerSchoolId, preparationSubPhase } = gameState;
  const playerSchool = schools.find(s => s.id === playerSchoolId);
  const prep = playerSchool?.preparation;

  const [selectedCarCount, setSelectedCarCount] = useState<number | null>(null);

  // Refresh preview on mount
  useEffect(() => {
      refreshWeekPreview();
  }, [gameState.currentWeek]);

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

  // Modal Logic
  // Only Stage Events and Car Selection block advance
  const pendingStageEvent = prep.pendingStageEvent;
  const showCarModal = prep.alegoriaCarCount === null && gameState.currentWeek >= 9;

  const canAdvance = !showCarModal && !pendingStageEvent;

  // Guidelines
  const guidelines: Record<string, Record<ProductionTrack, number>> = {
      'Grupo Especial': { Alegorias: 45000, Fantasias: 25000, Bateria: 15000, Harmonia: 15000 },
      'Série Ouro':     { Alegorias: 8000,  Fantasias: 4000,  Bateria: 2500,  Harmonia: 2500 },
      'Série Prata':    { Alegorias: 2200,  Fantasias: 1200,  Bateria: 800,   Harmonia: 800 },
      'Série Bronze':   { Alegorias: 650,   Fantasias: 350,   Bateria: 250,   Harmonia: 250 },
      'Grupo de Avaliação': { Alegorias: 165, Fantasias: 85,  Bateria: 65,    Harmonia: 65 },
  };
  const divisionGuidelines = guidelines[playerSchool.currentDivision] || guidelines['Grupo de Avaliação'];
  const maxBurn = divisionGuidelines.Alegorias * 4;

  const carLimits = {
    'Grupo Especial': { min: 5, max: 8 },
    'Série Ouro': { min: 3, max: 6 },
    'Série Prata': { min: 2, max: 5 },
    'Série Bronze': { min: 1, max: 4 },
    'Grupo de Avaliação': { min: 1, max: 3 },
  }[playerSchool.currentDivision] || { min: 1, max: 3 };

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
        </div>

        <div className="relative z-10">
             {/* Simple Budget Display (Full details in Compass) */}
             <div className="px-5 py-2 rounded-xl text-right backdrop-blur-md border border-white/10 bg-black/20">
                <div className="text-[10px] uppercase tracking-widest text-[#C9A84C] opacity-80 font-bold">Orçamento</div>
                <div className="text-xl font-black font-mono" style={{ color: playerSchool.budget < 500000 ? '#E74C3C' : '#C9A84C' }}>
                    {formatMoney(playerSchool.budget)}
                </div>
             </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* MOBILE LAYOUT (Specific Order) */}
        <div className="flex flex-col gap-6 lg:hidden">
            <MesaDeCrise
                crises={prep.crises}
                currentWeek={gameState.currentWeek}
                onResolve={resolveCrisis}
                schoolBudget={playerSchool.budget}
            />
            {prep.weeklyCompass && (
                <WeeklyCompassPanel
                    compass={prep.weeklyCompass}
                    school={playerSchool}
                />
            )}

            {/* TRACKS GROUP */}
            <div className="flex flex-col gap-6">
                {/* ALEGORIAS */}
                <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg relative">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide flex items-center gap-3">
                            🏰 Alegorias
                            <span className="text-xs bg-[#161E35] text-[#8A9BB8] px-2 py-1 rounded font-normal border border-[#1E2D50]">
                                {prep.alegoriaCarCount ? `${prep.alegoriaCarCount} Carros` : 'Planejamento'}
                            </span>
                        </h3>
                        <div className="text-2xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.tracks.Alegorias.quality)}</div>
                    </div>
                    <div className="flex justify-between items-start relative mb-6">
                        <div className="absolute top-6 left-0 right-0 h-1 bg-[#1E2D50] z-0" />
                        {prep.alegoriaStages?.map((stage, idx) => {
                            const isDone = stage.isComplete || stage.progress >= 100;
                            const isActive = stage.isUnlocked && !isDone;
                            const isLocked = !stage.isUnlocked && !isDone;

                            return (
                                <div key={stage.id} className={`relative flex flex-col items-center flex-1 ${isLocked ? 'opacity-30' : ''}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-300 ${
                                        isDone ? 'bg-[#2ECC71] border-[#2ECC71] text-[#080C18]' :
                                        isActive ? 'bg-[#C9A84C] border-[#F1C40F] text-[#080C18] scale-110 shadow-[0_0_15px_rgba(241,196,15,0.5)]' :
                                        'bg-[#080C18] border-[#1E2D50] text-[#4A5A7A]'
                                    }`}>
                                        {isDone ? '✓' : idx + 1}
                                    </div>
                                    <div className="mt-3 text-center">
                                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-[#F1C40F]' : 'text-[#8A9BB8]'}`}>
                                            {stage.label}
                                        </div>
                                        {isActive && <div className="text-xs font-mono text-[#C9A84C]">{Math.floor(stage.progress)}%</div>}
                                    </div>
                                    {isActive && stage.progress >= 100 && !stage.isComplete && (
                                        <div className="absolute -bottom-8 w-max text-[9px] text-[#2ECC71] font-bold bg-[#080C18] border border-[#2ECC71] px-2 py-0.5 rounded">
                                            ⏳ Pronto para avançar →
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {(() => {
                        const track = prep.tracks.Alegorias;
                        const guideline = divisionGuidelines.Alegorias;
                        const ratio = track.weeklyBurnRate / guideline;
                        let thumbColor = '#C9A84C';
                        if (ratio > 1.5) thumbColor = '#E67E22';
                        return (
                            <div className="bg-[#080C18] rounded-lg p-4 border border-[#1E2D50] flex gap-4 items-center">
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] uppercase text-[#8A9BB8] font-bold">Investimento Semanal</span>
                                        <span className="text-[10px] font-mono" style={{ color: thumbColor }}>{formatMoney(track.weeklyBurnRate)}</span>
                                    </div>
                                    <input type="range" min={100} max={maxBurn} step={100}
                                        value={track.weeklyBurnRate}
                                        onChange={(e) => {
                                            setTrackBudget('Alegorias', Number(e.target.value));
                                            refreshWeekPreview();
                                        }}
                                        className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer"
                                        style={{ accentColor: thumbColor }}
                                    />
                                </div>
                            </div>
                        );
                    })()}
                </section>
                {/* HARMONIA, FANTASIA, ETC. (Simulated Component Blocks for brevity in Mobile View - duplicating structure) */}
                {/* ... Just replicating tracks structure ... */}
                {/* For brevity, I will render the Desktop "Center Column" content here too, but flat */}
                {/* Or I can componentize the Tracks Section. Let's do inline for now to ensure correctness. */}

                {/* HARMONIA */}
                <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg">
                    {/* ... Harmonia content ... */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide">🎤 Harmonia</h3>
                        <div className="text-xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.tracks.Harmonia.quality)}</div>
                    </div>
                    {/* ... (Controls) ... */}
                    <div className="pt-2 border-t border-[#1E2D50]">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[9px] uppercase text-[#8A9BB8] font-bold">Invest.</span>
                            <span className="text-[9px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Harmonia.weeklyBurnRate)}</span>
                        </div>
                        <input type="range" min={100} max={maxBurn} step={100}
                            value={prep.tracks.Harmonia.weeklyBurnRate}
                            onChange={(e) => {
                                setTrackBudget('Harmonia', Number(e.target.value));
                                refreshWeekPreview();
                            }}
                            className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                        />
                    </div>
                </section>

                {/* FANTASIA */}
                <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide">✂️ Fantasias</h3>
                        <div className="text-xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.fantasia.designQuality)}</div>
                    </div>
                    {/* ... Controls ... */}
                    <div className="pt-2 border-t border-[#1E2D50]">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[9px] uppercase text-[#8A9BB8] font-bold">Invest.</span>
                            <span className="text-[9px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Fantasias.weeklyBurnRate)}</span>
                        </div>
                        <input type="range" min={100} max={maxBurn} step={100}
                            value={prep.tracks.Fantasias.weeklyBurnRate}
                            onChange={(e) => {
                                setTrackBudget('Fantasias', Number(e.target.value));
                                refreshWeekPreview();
                            }}
                            className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                        />
                    </div>
                </section>

                {/* BATERIA */}
                <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide flex items-center gap-2">
                            🥁 Bateria
                        </h3>
                        <div className="text-right">
                             <div className="text-xs font-mono text-[#2ECC71]">{formatMoney(prep.bateria.gigIncome)}</div>
                        </div>
                    </div>
                    {/* ... Controls ... */}
                    <div className="pt-2 border-t border-[#1E2D50]">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[9px] uppercase text-[#8A9BB8] font-bold">Invest.</span>
                            <span className="text-[9px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Bateria.weeklyBurnRate)}</span>
                        </div>
                        <input type="range" min={100} max={maxBurn} step={100}
                            value={prep.tracks.Bateria.weeklyBurnRate}
                            onChange={(e) => {
                                setTrackBudget('Bateria', Number(e.target.value));
                                refreshWeekPreview();
                            }}
                            className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                        />
                    </div>
                </section>
            </div>

            <StaffAttentionPanel
                staffAttention={prep.staffAttention}
                playerSchool={playerSchool}
                currentWeek={gameState.currentWeek}
                onAssign={assignStaffAction}
                onUnassign={unassignStaffAction}
            />

            <ActionCardsPanel
                cards={prep.unlockedActionCards}
                pendingActionCards={prep.pendingActionCards}
                budget={playerSchool.budget}
                onUse={useActionCard}
            />

            <WeekPreviewPanel
                preview={prep.weekPreview}
                prep={prep}
                currentWeek={gameState.currentWeek}
                canAdvance={canAdvance}
                advanceText={advanceText}
                onAdvance={advanceWeek}
            />
        </div>

        {/* DESKTOP LAYOUT (3 Columns) */}
        <div className="hidden lg:grid grid-cols-12 gap-6 max-w-[1920px] mx-auto">

            {/* LEFT COLUMN: CRISIS & STAFF (30%) */}
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 order-1">
                <MesaDeCrise
                    crises={prep.crises}
                    currentWeek={gameState.currentWeek}
                    onResolve={resolveCrisis}
                    schoolBudget={playerSchool.budget}
                />
                <StaffAttentionPanel
                    staffAttention={prep.staffAttention}
                    playerSchool={playerSchool}
                    currentWeek={gameState.currentWeek}
                    onAssign={assignStaffAction}
                    onUnassign={unassignStaffAction}
                />
            </div>

            {/* CENTER COLUMN: PRODUCTION TRACKS (40%) */}
            <div className="lg:col-span-5 xl:col-span-6 flex flex-col gap-6 order-2">
                {/* 1. ALEGORIA PIPELINE */}
                <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-6 shadow-lg relative">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide flex items-center gap-3">
                            🏰 Alegorias
                            <span className="text-xs bg-[#161E35] text-[#8A9BB8] px-2 py-1 rounded font-normal border border-[#1E2D50]">
                                {prep.alegoriaCarCount ? `${prep.alegoriaCarCount} Carros` : 'Planejamento'}
                            </span>
                        </h3>
                        <div className="text-2xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.tracks.Alegorias.quality)}</div>
                    </div>

                    {/* Pipeline Visualization */}
                    <div className="flex justify-between items-start relative mb-6">
                        <div className="absolute top-6 left-0 right-0 h-1 bg-[#1E2D50] z-0" />
                        {prep.alegoriaStages?.map((stage, idx) => {
                            const isActive = stage.isUnlocked && !stage.isComplete;
                            const isDone = stage.isComplete;
                            const isLocked = !stage.isUnlocked;
                            return (
                                <div key={stage.id} className={`relative flex flex-col items-center flex-1 ${isLocked ? 'opacity-30' : ''}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-300 ${
                                        isDone ? 'bg-[#2ECC71] border-[#2ECC71] text-[#080C18]' :
                                        isActive ? 'bg-[#C9A84C] border-[#F1C40F] text-[#080C18] scale-110 shadow-[0_0_15px_rgba(241,196,15,0.5)]' :
                                        'bg-[#080C18] border-[#1E2D50] text-[#4A5A7A]'
                                    }`}>
                                        {isDone ? '✓' : idx + 1}
                                    </div>
                                    <div className="mt-3 text-center">
                                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-[#F1C40F]' : 'text-[#8A9BB8]'}`}>
                                            {stage.label}
                                        </div>
                                        {isActive && <div className="text-xs font-mono text-[#C9A84C]">{Math.floor(stage.progress)}%</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Controls */}
                    {(() => {
                        const track = prep.tracks.Alegorias;
                        const guideline = divisionGuidelines.Alegorias;
                        const ratio = track.weeklyBurnRate / guideline;
                        let thumbColor = '#C9A84C';
                        if (ratio > 1.5) thumbColor = '#E67E22';

                        // Estimate
                        const activeStage = prep.alegoriaStages?.find(s => s.isUnlocked && !s.isComplete);
                        const progressPerWeek = estimatedAlegoriaProgressPerWeek(track.weeklyBurnRate, playerSchool.currentDivision);
                        const weeksToComplete = activeStage
                            ? Math.ceil((100 - activeStage.progress) / progressPerWeek)
                            : null;

                        return (
                            <div className="bg-[#080C18] rounded-lg p-4 border border-[#1E2D50] flex gap-4 items-center">
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] uppercase text-[#8A9BB8] font-bold">
                                            💸 Investimento Semanal
                                        </span>
                                        <span className="text-[10px] font-mono" style={{ color: thumbColor }}>{formatMoney(track.weeklyBurnRate)}</span>
                                    </div>
                                    <div className="text-[9px] text-[#4A5A7A] mb-2">(controla velocidade + qualidade)</div>

                                    <input type="range" min={100} max={maxBurn} step={100}
                                        value={track.weeklyBurnRate}
                                        onChange={(e) => {
                                            setTrackBudget('Alegorias', Number(e.target.value));
                                            refreshWeekPreview();
                                        }}
                                        className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer"
                                        style={{ accentColor: thumbColor }}
                                    />

                                    {weeksToComplete !== null && (
                                        <div className="text-[9px] font-mono mt-1 text-center font-bold" style={{
                                            color: weeksToComplete <= 4 ? '#2ECC71' : weeksToComplete <= 8 ? '#F1C40F' : '#E74C3C'
                                        }}>
                                            {activeStage ? `→ conclusão estimada em ~${weeksToComplete} semana(s)` : '✓ Etapa concluída'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </section>

                {/* HARMONIA & FANTASIA ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* HARMONIA */}
                    <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide">🎤 Harmonia</h3>
                            <div className="text-xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.tracks.Harmonia.quality)}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 mb-4">
                            {[
                                { l: 'Canto', v: prep.harmoniaState.sambaFixado, c: '#3498DB' },
                                { l: 'Marcha', v: prep.harmoniaState.marchaSincronizada, c: '#E67E22' },
                                { l: 'Voz', v: prep.harmoniaState.densidadeVocal, c: '#2ECC71' }
                            ].map(s => (
                                <div key={s.l} className="bg-[#080C18] p-1.5 rounded text-center border border-[#1E2D50]">
                                    <div className="text-[8px] text-[#8A9BB8] uppercase font-bold mb-1">{s.l}</div>
                                    <div className="h-1 bg-[#161E35] rounded-full overflow-hidden">
                                        <div className="h-full" style={{ width: `${s.v}%`, background: s.c }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-1 mb-4">
                            {(['Samba', 'Marcha', 'Vocal', 'Equilibrado'] as const).map(focus => (
                                <button key={focus} onClick={() => setHarmoniaFocus(focus)}
                                    className={`px-2 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                                        prep.harmoniaState.diretorFocus === focus
                                        ? 'bg-[#C9A84C] text-[#080C18]' : 'bg-[#161E35] text-[#8A9BB8] hover:bg-[#1E2D50]'
                                    }`}>
                                    {focus}
                                </button>
                            ))}
                        </div>
                        <div className="pt-2 border-t border-[#1E2D50]">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] uppercase text-[#8A9BB8] font-bold">Invest.</span>
                                <span className="text-[9px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Harmonia.weeklyBurnRate)}</span>
                            </div>
                            <input type="range" min={100} max={maxBurn} step={100}
                                value={prep.tracks.Harmonia.weeklyBurnRate}
                                onChange={(e) => {
                                    setTrackBudget('Harmonia', Number(e.target.value));
                                    refreshWeekPreview();
                                }}
                                className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                            />
                        </div>
                    </section>

                    {/* FANTASIA */}
                    <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide">✂️ Fantasias</h3>
                            <div className="text-xl font-mono font-black text-[#C9A84C]">{Math.floor(prep.fantasia.designQuality)}</div>
                        </div>
                        <div className="flex items-center justify-between bg-[#080C18] p-2 rounded border border-[#1E2D50] mb-4">
                            <div>
                                <div className="text-[8px] text-[#8A9BB8] uppercase font-bold">Abordagem</div>
                                <div className="text-xs font-bold text-[#F0E6D3]">{prep.fantasia.approach || 'A Definir'}</div>
                            </div>
                            <div>
                                <div className="text-[8px] text-[#8A9BB8] uppercase font-bold text-right">Risco</div>
                                <div className={`text-xs font-mono font-black text-right ${prep.fantasia.deliveryRisk > 50 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
                                    {Math.floor(prep.fantasia.deliveryRisk)}%
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-[#1E2D50]">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] uppercase text-[#8A9BB8] font-bold">Invest.</span>
                                <span className="text-[9px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Fantasias.weeklyBurnRate)}</span>
                            </div>
                            <input type="range" min={100} max={maxBurn} step={100}
                                value={prep.tracks.Fantasias.weeklyBurnRate}
                                onChange={(e) => {
                                    setTrackBudget('Fantasias', Number(e.target.value));
                                    refreshWeekPreview();
                                }}
                                className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                            />
                        </div>
                    </section>
                </div>

                {/* BATERIA */}
                <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-5 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-[#F0E6D3] uppercase tracking-wide flex items-center gap-2">
                            🥁 Bateria
                            {prep.bateria.outsideGigActive && (
                                <span className="text-[9px] bg-[#E67E22] text-[#080C18] px-2 py-0.5 rounded font-bold animate-pulse">SHOW</span>
                            )}
                        </h3>
                        <div className="text-right">
                             <div className="text-[8px] text-[#4A5A7A] uppercase tracking-wider font-bold">Renda</div>
                             <div className="text-xs font-mono text-[#2ECC71]">{formatMoney(prep.bateria.gigIncome)}</div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A9BB8]">Forma</span>
                                <span className="text-[9px] font-mono font-bold text-[#F0E6D3]">{Math.floor(prep.bateria.form)}/100</span>
                            </div>
                            <div className="h-2 bg-[#161E35] rounded-full overflow-hidden border border-[#1E2D50] relative">
                                 <div className="absolute top-0 bottom-0 bg-[#2ECC71]/20 border-l border-r border-[#2ECC71]/30"
                                      style={{ left: `${prep.bateriaOptimalMin}%`, right: `${100 - prep.bateriaOptimalMax}%` }} />
                                <div className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${prep.bateria.form}%`,
                                        background: prep.bateria.form > prep.bateriaOptimalMax ? '#E74C3C' : prep.bateria.form >= prep.bateriaOptimalMin ? '#2ECC71' : '#C9A84C'
                                    }}
                                />
                            </div>
                        </div>
                        <div className="pt-2 border-t border-[#1E2D50]">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] uppercase text-[#8A9BB8] font-bold">Invest.</span>
                                <span className="text-[9px] font-mono text-[#C9A84C]">{formatMoney(prep.tracks.Bateria.weeklyBurnRate)}</span>
                            </div>
                            <input type="range" min={100} max={maxBurn} step={100}
                                value={prep.tracks.Bateria.weeklyBurnRate}
                                onChange={(e) => {
                                    setTrackBudget('Bateria', Number(e.target.value));
                                    refreshWeekPreview();
                                }}
                                className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                            />
                        </div>
                    </div>
                </section>

                {/* MSPB, COMISSAO, PASSISTAS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-4 shadow-lg">
                        <h3 className="text-xs font-black text-[#F0E6D3] uppercase tracking-wide mb-2">👑 Casal</h3>
                        {prep.mspb ? (
                            <div className="text-center">
                                <div className="text-lg font-mono text-[#E91E63] font-black">{Math.floor(prep.mspb.quimica)}%</div>
                                <div className="text-[8px] text-[#8A9BB8] uppercase">Química</div>
                            </div>
                        ) : <div className="text-[9px] text-[#4A5A7A] text-center">N/A</div>}
                    </section>
                    <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-4 shadow-lg">
                        <h3 className="text-xs font-black text-[#F0E6D3] uppercase tracking-wide mb-2">🎭 Comissão</h3>
                        <div className="text-center">
                            <div className="text-lg font-mono text-[#3498DB] font-black">{Math.floor(prep.comissaoDeFrente.quality)}</div>
                            <div className="text-[8px] text-[#8A9BB8] uppercase">Qualidade</div>
                        </div>
                    </section>
                    <section className="bg-[#0F1629] border border-[#1E2D50] rounded-xl p-4 shadow-lg">
                        <h3 className="text-xs font-black text-[#F0E6D3] uppercase tracking-wide mb-2">💃 Passistas</h3>
                        {prep.passistas ? (
                            <div className="text-center">
                                <div className="text-lg font-mono text-[#E67E22] font-black">{Math.floor(prep.passistas.form)}</div>
                                <div className="text-[8px] text-[#8A9BB8] uppercase">Forma</div>
                                <select value={prep.passistas.rehearsalIntensity}
                                    onChange={(e) => setPassistasRehearsal(e.target.value as any)}
                                    className="w-full bg-[#080C18] border border-[#1E2D50] text-[9px] p-1 rounded text-[#F0E6D3] mt-2">
                                    <option value="Descanso">Descanso</option>
                                    <option value="Leve">Leve</option>
                                    <option value="Aberto">Aberto</option>
                                    <option value="Completo">Completo</option>
                                </select>
                            </div>
                        ) : <div className="text-[9px] text-[#4A5A7A] text-center">N/A</div>}
                    </section>
                </div>
            </div>

            {/* RIGHT COLUMN: COMPASS & PREVIEW (30%) */}
            <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-6 order-3">
                {prep.weeklyCompass && (
                    <WeeklyCompassPanel
                        compass={prep.weeklyCompass}
                        school={playerSchool}
                    />
                )}

                <ActionCardsPanel
                    cards={prep.unlockedActionCards}
                    pendingActionCards={prep.pendingActionCards}
                    budget={playerSchool.budget}
                    onUse={useActionCard}
                />

                <WeekPreviewPanel
                    preview={prep.weekPreview}
                    prep={prep}
                    currentWeek={gameState.currentWeek}
                    canAdvance={canAdvance}
                    advanceText={advanceText}
                    onAdvance={advanceWeek}
                />
            </div>

        </div>
      </main>

      {/* BLOCKING STAGE EVENT MODAL */}
      {pendingStageEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="rounded-xl p-8 max-w-lg w-full border-2 border-[#2A3F6B] bg-[#0F1629] shadow-2xl transform transition-all">
              <h2 className="text-2xl font-black text-[#F0E6D3] mb-4 leading-tight">{pendingStageEvent.title}</h2>
              <p className="text-[#8A9BB8] text-sm leading-relaxed mb-8 border-l-2 border-[#1E2D50] pl-4">
                  {pendingStageEvent.description}
              </p>

              <div className="flex flex-col gap-3">
                {pendingStageEvent.options
                        .filter(opt => evaluateConditions(opt.conditions, playerSchool))
                        .map((opt, idx) => {
                            const originalIdx = pendingStageEvent.options.indexOf(opt);
                            return (
                                <button key={idx} onClick={() => resolveStageEvent(pendingStageEvent.id, originalIdx)}
                                    className="w-full p-5 rounded-xl bg-[#1E2D50] hover:bg-[#2A3F6B] border border-[#2A3F6B] text-left transition-all group relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="font-black text-[#F0E6D3] mb-1 text-lg">{opt.label}</div>
                                        <div className="text-xs text-[#4A5A7A] font-mono group-hover:text-[#8A9BB8] transition-colors">
                                            {opt.effect.replace(/_/g, ' ').toLowerCase()}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                }
              </div>
            </div>
          </div>
      )}

      {/* CAR SELECTION MODAL */}
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
