"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGameStore } from '../store/gameStore';
import { StaffRole, StaffMember, TransferOffer } from '../types/models';
import { calculateAdjustedSalary } from '../store/gameStore';
import { calculateOfferProbability } from '../services/transferService';
import { getPotentialDescriptor } from '../services/staffService';
import { formatMoney, formatRole } from '../utils/textUtils';
import { getKeySkills } from '../utils/helpers';
import { ALL_ROLES } from '../utils/staffUtils';
import RosterList from './RosterList';
import EnredoSelectionModal from './EnredoSelectionModal';

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

export default function MarketDashboard() {
  const { gameState, schools, availableStaff, submitTransferOffer, advanceWeek, acceptCounter, rejectCounter, focusResearch, lockInEnredo } = useGameStore();
  const { playerSchoolId, currentPhase, pendingOffers, resolvedOffers, transferNews } = gameState;

  const [filterRole, setFilterRole] = useState<StaffRole | 'All'>('All');
  const [hideFilled, setHideFilled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hoveredPartnerId, setHoveredPartnerId] = useState<string | null>(null);

  // New States
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [offerSalary, setOfferSalary] = useState(0);
  const [offerYears, setOfferYears] = useState(1);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isEnredoModalOpen, setIsEnredoModalOpen] = useState(false);

  const playerSchool = schools.find(s => s.id === playerSchoolId);

  // Calculate unfilled roles for desperation logic
  const unfilledRolesCount = playerSchool
      ? ALL_ROLES.filter(role => !playerSchool.staff.some(s => s.role === role)).length
      : 0;

  // Calculate live probability
  const probData = (playerSchool && selectedStaff)
    ? calculateOfferProbability(
        selectedStaff,
        playerSchool,
        offerSalary,
        offerYears,
        gameState.currentWeek,
        8,
        unfilledRolesCount
      )
    : null;

  const openOfferModal = (staff: StaffMember) => {
      setSelectedStaff(staff);
      const baseSalary = calculateAdjustedSalary(staff, playerSchool?.prestige || 100);
      setOfferSalary(baseSalary > 0 ? baseSalary : staff.salaryExpectation); // Default
      setOfferYears(1);
      setIsOfferModalOpen(true);
  };

  const handleMakeOffer = () => {
      if (!playerSchool || !selectedStaff) return;
      const msg = submitTransferOffer(playerSchool.id, selectedStaff.id, offerSalary, offerYears);
      setMessage(msg);
      setTimeout(() => setMessage(null), 3000);
      setIsOfferModalOpen(false);
  };

  const handleAdvanceWeek = () => {
      advanceWeek();
      setIsResultsModalOpen(true);
  };

  const filteredStaff = availableStaff.filter(staff => {
      if (filterRole !== 'All' && staff.role !== filterRole) return false;
      if (hideFilled && playerSchool) {
          if (playerSchool.staff.some(s => s.role === staff.role)) return false;
      }
      return true;
  });
  const uniqueRoles = Array.from(new Set(availableStaff.map(s => s.role)));
  const counteredOffers = resolvedOffers.filter(o => o.status === 'Countered');

  const findPartner = (partnerId: string): StaffMember | null => {
    const inMarket = availableStaff.find(s => s.id === partnerId);
    if (inMarket) return inMarket;
    for (const school of schools) {
      const inSchool = school.staff.find(s => s.id === partnerId);
      if (inSchool) return inSchool;
    }
    return null;
  };

   const renderPartnerTooltip = (partnerId: string) => {
    const partner = findPartner(partnerId);
    if (!partner) return null;

    const skills = getKeySkills(partner.role, partner.skills);

    return (
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#0F1629] border border-[#C9A84C] rounded p-3 shadow-xl z-50 pointer-events-none">
        <div className="text-[#F0E6D3] font-bold text-sm mb-1">Par: {partner.name}</div>
        <div className="text-xs text-[#8A9BB8] mb-2">{formatRole(partner.role)}</div>
        <div className="flex flex-wrap gap-1">
          {skills.map(s => (
            <span key={s.name} className="text-[10px] bg-[#161E35] px-1 rounded border border-[#1E2D50] text-[#F0E6D3]">
              {s.name}: <span className="text-[#C9A84C]">{s.value}</span>
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Determine dynamic colors
  const headerBg = playerSchool?.colors[0] || '#1F2937';
  const headerText = getContrastColor(playerSchool?.colors[0]);

  // Probability Color
  const getProbColor = (p: number) => {
      if (p < 0.3) return 'text-[#E74C3C]';
      if (p < 0.65) return 'text-[#E67E22]';
      return 'text-[#2ECC71]';
  };
  const getProbLabel = (p: number) => {
       if (p < 0.3) return 'Baixa';
      if (p < 0.65) return 'Média';
      return 'Alta';
  };

  const getProBadge = (level: string | undefined) => {
    let color = 'bg-[#161E35] text-[#8A9BB8] border-[#1E2D50]';
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

  // Research Widget Helper
  const renderResearchWidget = () => {
      if (!playerSchool) return null;

      // Case 1: Enredo Locked
      if (playerSchool.enredo) {
          return (
              <div className="flex flex-col gap-2">
                  <div className="text-[10px] uppercase tracking-widest text-[#2ECC71] font-bold">Enredo Selecionado</div>
                  <div className="text-sm font-black text-[#F0E6D3] leading-tight">{playerSchool.enredo.title}</div>
                  <div className="text-xs text-[#8A9BB8]">{playerSchool.enredo.category}</div>
                  <button onClick={() => setIsEnredoModalOpen(true)} className="mt-2 text-[10px] uppercase font-bold tracking-widest text-[#C9A84C] hover:text-[#E8C96A] text-left">
                      Ver Detalhes →
                  </button>
              </div>
          );
      }

      // Case 2: Research in Progress (Focused Candidate)
      if (playerSchool.researchFocusId) {
          const candidate = playerSchool.enredoCandidates?.find(c => c.id === playerSchool.researchFocusId);
          if (candidate) {
              return (
                  <div className="flex flex-col gap-2">
                      <div className="text-[10px] uppercase tracking-widest text-[#C9A84C] font-bold flex items-center gap-2">
                         <span className="animate-pulse">●</span> Pesquisando
                      </div>
                      <div className="text-sm font-black text-[#F0E6D3] leading-tight">{candidate.title}</div>
                      <div className="w-full bg-[#161E35] h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-[#C9A84C] h-full transition-all duration-500"
                            style={{ width: `${(candidate.statsRevealed / 5) * 100}%` }}
                          />
                      </div>
                      <button onClick={() => setIsEnredoModalOpen(true)} className="mt-2 text-[10px] uppercase font-bold tracking-widest text-[#C9A84C] hover:text-[#E8C96A] text-left">
                          Gerenciar Pesquisa →
                      </button>
                  </div>
              );
          }
      }

      // Case 3: No Research
      return (
          <div className="flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-widest text-[#E74C3C] font-bold">Nenhuma Pesquisa Ativa</div>
              <p className="text-xs text-[#8A9BB8] leading-relaxed">
                  Escolha um enredo para pesquisar e revelar seus atributos ocultos.
              </p>
              <button
                onClick={() => setIsEnredoModalOpen(true)}
                className="mt-1 bg-[#1E2D50] hover:bg-[#2A3F6B] text-[#F0E6D3] text-xs font-bold py-1.5 px-3 rounded border border-[#2A3F6B] transition-colors"
              >
                  Iniciar Pesquisa
              </button>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-screen bg-[#080C18] text-[#F0E6D3] relative overflow-hidden font-sans">
      {/* Top Bar / Header */}
      <header
        className="relative z-20 flex justify-between items-center px-6 py-4 shadow-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${headerBg} 0%, ${headerBg}CC 60%, #080C18 100%)`,
          borderBottom: `2px solid ${playerSchool?.colors[0] || '#C9A84C'}60`,
        }}
      >
        {/* Background flag watermark */}
        {playerSchool?.flag && (
            <div
            className="absolute right-0 top-0 bottom-0 w-64 opacity-10 pointer-events-none"
            style={{
                backgroundImage: `url(${playerSchool.flag})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                maskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 100%)',
            }}
            />
        )}

        <div className="flex items-center gap-6 z-10">
            <div>
                <h1 className="text-2xl font-black leading-none tracking-wide" style={{ color: headerText }}>
                    {playerSchool ? playerSchool.name : 'Carnaval Manager'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs uppercase tracking-widest opacity-70" style={{ color: headerText }}>
                    {playerSchool?.currentDivision || 'Menu Principal'}
                    </span>
                    {getProBadge(playerSchool?.proLevel)}
                    <span className="text-xs opacity-50 ml-2" style={{ color: headerText }}>
                    Semana {gameState.currentWeek} · {currentPhase}
                    </span>
                </div>
            </div>

            <Link href="/devtools" className="text-[10px] uppercase font-bold tracking-widest opacity-50 hover:opacity-100 transition-opacity" style={{ color: headerText }}>
                🔧 DevTools
            </Link>
        </div>

        <div className="flex items-center gap-4 z-10">
             {playerSchool && (
              <div className="flex gap-2">
                 <button onClick={() => setIsHistoryOpen(true)}
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all duration-200"
                    style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderColor: 'rgba(255,255,255,0.15)',
                        color: headerText,
                    }}
                 >
                    🏆 Histórico
                 </button>
                 <button onClick={() => setIsRosterOpen(true)}
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all duration-200"
                    style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderColor: 'rgba(255,255,255,0.15)',
                        color: headerText,
                    }}
                 >
                    👥 Elenco
                 </button>
                 <button onClick={() => setIsEnredoModalOpen(true)}
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all duration-200 bg-[#3D1F7A]/60 border-[#7B4FD4]/60 text-purple-200 hover:bg-[#3D1F7A] hover:border-[#9B6FE4]"
                 >
                    🧪 {playerSchool?.enredo ? 'Enredo' : 'Pesquisar'}
                 </button>

                 {/* Next Week — Gold CTA */}
                 {currentPhase === 'Market' && (
                    <button
                        onClick={handleAdvanceWeek}
                        className="text-xs font-black uppercase tracking-widest px-5 py-2 rounded-lg transition-all duration-200 ml-2"
                        style={{
                            background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 100%)',
                            color: '#080C18',
                            boxShadow: '0 0 20px #C9A84C50',
                        }}
                    >
                        Próxima Semana →
                    </button>
                 )}
              </div>
            )}

            {playerSchool ? (
              <div
                className="px-5 py-2.5 rounded-xl text-right min-w-[160px]"
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
            ) : null}
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* LEFT COLUMN (MARKET) - Spans 3 columns */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden h-full">

            {/* Pending Decisions Panel */}
            {counteredOffers.length > 0 && (
                <div
                    className="rounded-xl p-4 flex flex-col gap-3"
                    style={{ background: '#2A1A00', border: '1px solid #E67E2240' }}
                >
                    <h3 className="font-black text-sm uppercase tracking-widest" style={{ color: '#E67E22' }}>
                        ⚠️ Contra-Propostas Pendentes
                    </h3>
                    <div className="space-y-2">
                        {counteredOffers.map(offer => {
                            const staff = availableStaff.find(s => s.id === offer.toStaffId) || schools.flatMap(s => s.staff).find(s => s.id === offer.toStaffId);
                            return (
                                <div key={offer.id} className="flex justify-between items-center bg-[#080C18]/40 p-3 rounded-lg border border-[#E67E2220]">
                                    <div>
                                        <span className="font-bold text-[#F0E6D3]">{staff?.name}</span> ({staff?.role}) pede
                                        <span className="text-[#2ECC71] font-mono font-bold ml-2">{formatMoney(offer.counterSalary || 0)}</span> por {offer.counterYears} anos.
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => acceptCounter(offer.id)}
                                            className="bg-[#2ECC71] hover:bg-[#27AE60] text-[#080C18] px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider"
                                        >
                                            Aceitar
                                        </button>
                                        <button
                                            onClick={() => rejectCounter(offer.id)}
                                            className="bg-[#E74C3C] hover:bg-[#C0392B] text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider"
                                        >
                                            Rejeitar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div
              className="flex justify-between items-center px-4 py-3 rounded-xl flex-shrink-0"
              style={{ background: '#0F1629', border: '1px solid #1E2D50' }}
            >
              <div className="flex items-center gap-4">
                <span className="text-[11px] uppercase tracking-widest text-[#4A5A7A] font-bold">Filtrar Mercado:</span>
                <select
                  className="text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none transition-colors"
                  style={{
                    background: '#161E35',
                    border: '1px solid #2A3F6B',
                    color: '#F0E6D3',
                  }}
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as StaffRole | 'All')}
                >
                  <option value="All">Todas as Funções</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{formatRole(role)}</option>
                  ))}
                </select>

                <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg transition-colors hover:bg-[#1E2D50]"
                  style={{ border: '1px solid #1E2D50' }}>
                  <input
                    type="checkbox"
                    checked={hideFilled}
                    onChange={(e) => setHideFilled(e.target.checked)}
                    className="rounded"
                    style={{ accentColor: '#C9A84C' }}
                  />
                  <span className="text-sm text-[#8A9BB8] font-medium">Ocultar Posições Preenchidas</span>
                </label>
              </div>

              {message && (
                <div className="text-sm font-bold px-4 py-2 rounded-lg animate-fade-in"
                  style={{ background: '#1A3A5C', border: '1px solid #2A5A8C', color: '#60C0FF' }}>
                  {message}
                </div>
              )}
            </div>

            {/* Staff Grid (Replaces Table) */}
            <div className="flex-1 overflow-auto pr-2">
                {filteredStaff.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 border border-dashed border-[#1E2D50] rounded-xl bg-[#0F1629]/50">
                        <div className="text-4xl opacity-30">🥁</div>
                        <div className="text-[#4A5A7A] text-sm">Nenhum profissional disponível com esses filtros.</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                        {filteredStaff.map((staff) => {
                            const prestige = playerSchool ? playerSchool.prestige : 100;
                            const adjustedSalary = calculateAdjustedSalary(staff, prestige);
                            const isRainha = staff.role === 'RainhaDeBateria';
                            const isRoleFilled = playerSchool?.staff.some(s => s.role === staff.role);
                            const potentialDesc = getPotentialDescriptor(staff.reputation, staff.potential);
                            const isPending = pendingOffers.some(o => o.toStaffId === staff.id && o.status === 'Pending');
                            const rolePending = pendingOffers.some(o => {
                                if (o.status !== 'Pending' || o.fromSchoolId !== playerSchoolId) return false;
                                const s = availableStaff.find(st => st.id === o.toStaffId);
                                return s && s.role === staff.role;
                            });
                            const skills = getKeySkills(staff.role, staff.skills);

                            return (
                            <div
                                key={staff.id}
                                className="relative rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl group"
                                style={{
                                    background: '#0F1629',
                                    border: `1px solid ${isPending ? '#C9A84C50' : isRoleFilled ? '#2ECC7130' : '#1E2D50'}`,
                                    boxShadow: isPending ? '0 0 16px #C9A84C20' : 'none',
                                }}
                            >
                                {/* Top color strip — role color coding */}
                                <div className="h-1 w-full" style={{
                                    background: isRoleFilled
                                        ? 'linear-gradient(90deg, #2ECC71, #27AE60)'
                                        : isPending
                                        ? 'linear-gradient(90deg, #C9A84C, #E8C96A)'
                                        : 'linear-gradient(90deg, #1E2D50, #2A3F6B)',
                                }} />

                                <div className="p-4 flex flex-col gap-3 h-full">
                                    {/* Name row */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[#F0E6D3] font-bold text-base leading-tight">{staff.name}</span>
                                                {staff.age && <span className="text-[10px] text-[#4A5A7A] font-mono">{staff.age}a</span>}
                                                {staff.partnerId && (
                                                <span
                                                    className="text-[10px] bg-pink-900/50 text-pink-300 px-1.5 py-0.5 rounded-full border border-pink-800 cursor-help"
                                                    onMouseEnter={() => setHoveredPartnerId(staff.partnerId!)}
                                                    onMouseLeave={() => setHoveredPartnerId(null)}
                                                >
                                                    Par
                                                </span>
                                                )}
                                                {staff.archetype && (
                                                <span className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-800">
                                                    {staff.archetype}
                                                </span>
                                                )}
                                            </div>
                                            {staff.historyText && (
                                                <div className="text-[11px] text-[#4A5A7A] mt-0.5 line-clamp-1" title={staff.historyText}>
                                                    {staff.historyText}
                                                </div>
                                            )}
                                        </div>
                                        {/* Reputation badge */}
                                        <div className="flex flex-col items-center flex-shrink-0 ml-2">
                                            <div
                                                className="text-lg font-black font-mono px-2 py-0.5 rounded-lg"
                                                style={{
                                                background: staff.reputation >= 180 ? '#7A5A10' : '#1E2D50',
                                                color: staff.reputation >= 180 ? '#E8C96A' : '#8A9BB8',
                                                border: `1px solid ${staff.reputation >= 180 ? '#C9A84C60' : '#2A3F6B'}`,
                                                }}
                                            >
                                                {staff.reputation}
                                            </div>
                                            <span className="text-[9px] text-[#4A5A7A] uppercase tracking-widest mt-0.5">{potentialDesc}</span>
                                        </div>
                                    </div>

                                    {/* Role badge */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A9BB8]">
                                            {formatRole(staff.role)}
                                        </span>
                                        {isRoleFilled && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#2ECC71] bg-[#2ECC7115] px-2 py-0.5 rounded-full border border-[#2ECC7130]">
                                                ✓ Preenchido
                                            </span>
                                        )}
                                    </div>

                                    {/* Skills */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {skills.map((skill) => (
                                            <div key={skill.name}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                                style={{
                                                background: '#161E35',
                                                border: '1px solid #1E2D50',
                                                }}
                                            >
                                                <span className="text-[10px] uppercase tracking-wider text-[#4A5A7A]">{skill.name}</span>
                                                <span
                                                className="text-xs font-black font-mono"
                                                style={{
                                                    color: skill.value >= 18 ? '#C9A84C' : skill.value >= 15 ? '#2ECC71' : '#F0E6D3',
                                                }}
                                                >
                                                {skill.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Salary + CTA */}
                                    <div className="flex items-center justify-between pt-2 border-t border-[#1E2D50] mt-auto">
                                        <div>
                                            <div className="text-[10px] text-[#4A5A7A] uppercase tracking-widest">
                                                {isRainha ? 'Investimento' : 'Expectativa Salarial'}
                                            </div>
                                            <div className="text-sm font-black font-mono text-[#F0E6D3]">
                                                {isRainha && staff.archetype !== 'CriaDaComunidade'
                                                ? '— Patrocínio'
                                                : formatMoney(adjustedSalary)}
                                            </div>
                                        </div>

                                        {isPending ? (
                                            <span className="text-[11px] font-bold text-[#C9A84C] bg-[#C9A84C15] px-3 py-1.5 rounded-lg border border-[#C9A84C30]">
                                                ⏳ Oferta Enviada
                                            </span>
                                        ) : rolePending ? (
                                            <span className="text-[11px] text-[#8A9BB8]">Em andamento</span>
                                        ) : (
                                            <button
                                                onClick={() => openOfferModal(staff)}
                                                className="text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-lg transition-all duration-200"
                                                style={{
                                                background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 100%)',
                                                color: '#080C18',
                                                boxShadow: '0 2px 8px #C9A84C30',
                                                }}
                                            >
                                                Contratar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Partner tooltip */}
                                {staff.partnerId && hoveredPartnerId === staff.partnerId && renderPartnerTooltip(staff.partnerId)}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT COLUMN (SIDE PANEL) - Spans 1 column */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full overflow-hidden">

             {/* Research Widget */}
             <div
                className="rounded-xl p-5 shadow-lg relative overflow-hidden flex-shrink-0"
                style={{
                    background: 'linear-gradient(160deg, #161E35 0%, #0F1629 100%)',
                    border: '1px solid #1E2D50'
                }}
             >
                 {/* Decorative background element */}
                 <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#C9A84C] opacity-5 pointer-events-none" />

                 <div className="relative z-10">
                    <h3 className="text-[10px] uppercase tracking-widest font-black text-[#C9A84C] mb-3 pb-2 border-b border-[#1E2D50]">
                         Laboratório de Enredo
                    </h3>
                    {renderResearchWidget()}
                 </div>
             </div>

             {/* Market News */}
             <div
                className="rounded-xl p-5 shadow-lg flex-1 flex flex-col overflow-hidden"
                style={{ background: '#0F1629', border: '1px solid #1E2D50' }}
             >
                <h3 className="text-[10px] uppercase tracking-widest font-black text-[#C9A84C] mb-3 flex-shrink-0">
                    📰 Notícias do Mercado
                </h3>
                {transferNews.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-[#4A5A7A] text-sm italic">Silêncio no mercado...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 overflow-auto pr-1">
                    {transferNews.map((news, i) => (
                        <div key={i} className="text-xs text-[#8A9BB8] flex gap-2 items-start leading-relaxed border-b border-[#1E2D50] pb-2 last:border-0">
                        <span className="text-[#C9A84C] mt-0.5 flex-shrink-0">▸</span>
                        <span>{news}</span>
                        </div>
                    ))}
                    </div>
                )}
            </div>
        </div>

      </main>

      {/* Roster Modal */}
      {isRosterOpen && playerSchool && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-[#0F1629] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#1E2D50]">
                <div className="p-5 border-b border-[#1E2D50] bg-[#161E35] rounded-t-xl flex justify-between items-center">
                    <h2 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide">Elenco: <span className="text-[#C9A84C]">{playerSchool.name}</span></h2>
                    <button onClick={() => setIsRosterOpen(false)} className="text-[#8A9BB8] hover:text-[#F0E6D3] uppercase font-bold text-xs tracking-wider">✕ Fechar</button>
                </div>
                <div className="p-6 overflow-auto bg-[#080C18]">
                    <RosterList staff={playerSchool.staff} />
                </div>
             </div>
         </div>
      )}

      {/* Offer Modal */}
      {isOfferModalOpen && selectedStaff && playerSchool && probData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
              <div
                className="rounded-xl shadow-2xl w-full max-w-md border p-6 relative overflow-hidden"
                style={{ background: '#0F1629', borderColor: '#C9A84C' }}
              >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C9A84C] to-[#E8C96A]" />

                  <h2 className="text-xl font-black text-[#F0E6D3] mb-1">Proposta de Contrato</h2>
                  <p className="text-[#8A9BB8] text-sm mb-6">Negociando com <span className="text-[#F0E6D3] font-bold">{selectedStaff.name}</span></p>

                  {/* Salary Slider */}
                  <div className="mb-6">
                      <label className="block text-[#8A9BB8] text-[10px] uppercase tracking-widest font-bold mb-2">Salário Anual</label>
                      <div className="flex justify-between items-end mb-3 bg-[#161E35] p-3 rounded-lg border border-[#1E2D50]">
                           <span className="text-xs text-[#4A5A7A]">{formatMoney(Math.floor(selectedStaff.salaryExpectation * 0.5))}</span>
                           <span className="text-2xl font-black font-mono text-[#C9A84C]">{formatMoney(offerSalary)}</span>
                           <span className="text-xs text-[#4A5A7A]">{formatMoney(Math.floor(selectedStaff.salaryExpectation * 2.5))}</span>
                      </div>
                      <input
                        type="range"
                        min={Math.floor(selectedStaff.salaryExpectation * 0.5)}
                        max={Math.floor(selectedStaff.salaryExpectation * 2.5)}
                        step={1000}
                        value={offerSalary}
                        onChange={(e) => setOfferSalary(Number(e.target.value))}
                        className="w-full h-2 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                      />
                  </div>

                  {/* Contract Years */}
                  <div className="mb-8">
                       <label className="block text-[#8A9BB8] text-[10px] uppercase tracking-widest font-bold mb-2">Duração do Contrato</label>
                       <div className="flex gap-3">
                           {[1, 2, 3].map(y => (
                               <button
                                key={y}
                                onClick={() => setOfferYears(y)}
                                className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all duration-200 ${
                                    offerYears === y
                                    ? 'bg-[#C9A84C] border-[#C9A84C] text-[#080C18] shadow-lg shadow-[#C9A84C20]'
                                    : 'bg-[#161E35] border-[#1E2D50] text-[#8A9BB8] hover:border-[#2A3F6B] hover:text-[#F0E6D3]'
                                }`}
                               >
                                   {y} Ano{y > 1 ? 's' : ''}
                               </button>
                           ))}
                       </div>
                  </div>

                  {/* Probability */}
                  <div className="mb-6 bg-[#080C18] p-4 rounded-xl border border-[#1E2D50] text-center">
                      <div className="text-[#8A9BB8] text-[10px] uppercase tracking-widest mb-1">Probabilidade de Aceite</div>
                      <div className={`text-3xl font-black ${getProbColor(probData.prob)}`}>
                          {Math.round(probData.prob * 100)}%
                      </div>
                      <div className="text-[10px] text-[#4A5A7A] mt-2 uppercase tracking-wide">
                          Ideal: {probData.idealYears} anos | Mínimo: {formatMoney(Math.round(probData.minSalary))}
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button
                        onClick={() => setIsOfferModalOpen(false)}
                        className="flex-1 bg-transparent hover:bg-[#1E2D50] text-[#8A9BB8] py-3 rounded-lg font-bold uppercase tracking-wider text-xs border border-[#1E2D50] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleMakeOffer}
                        className="flex-1 bg-[#2ECC71] hover:bg-[#27AE60] text-[#080C18] py-3 rounded-lg font-black uppercase tracking-wider text-xs shadow-lg shadow-[#2ECC7130] transition-all transform hover:-translate-y-0.5"
                      >
                        Enviar Oferta
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Week Results Modal */}
      {isResultsModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
               <div className="bg-[#0F1629] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#1E2D50]">
                    <div className="p-6 border-b border-[#1E2D50] bg-[#161E35] rounded-t-xl">
                        <div className="text-[10px] uppercase tracking-widest text-[#8A9BB8] font-bold mb-1">Resumo Semanal</div>
                        <h2 className="text-2xl font-black text-[#F0E6D3]">Resultados da Semana {gameState.currentWeek - 1}</h2>
                    </div>
                    <div className="p-8 overflow-auto space-y-8 bg-[#080C18]">
                        {/* Your Offers */}
                        <div>
                            <h3 className="text-sm font-black text-[#C9A84C] mb-4 uppercase tracking-widest border-b border-[#1E2D50] pb-2">Suas Propostas</h3>
                            {resolvedOffers.length === 0 ? (
                                <p className="text-[#4A5A7A] italic text-sm">Nenhuma negociação concluída.</p>
                            ) : (
                                <div className="space-y-3">
                                    {resolvedOffers.map(o => {
                                        const staff = availableStaff.find(s => s.id === o.toStaffId) || schools.flatMap(s => s.staff).find(s => s.id === o.toStaffId);
                                        return (
                                            <div key={o.id} className="bg-[#161E35] p-4 rounded-lg border border-[#1E2D50] flex justify-between items-center shadow-sm">
                                                <div>
                                                    <div className="font-bold text-[#F0E6D3] text-lg">{staff?.name || 'Desconhecido'}</div>
                                                    <div className="text-[#8A9BB8] text-xs font-mono mt-0.5">{formatMoney(o.offeredSalary)} / {o.contractYears} anos</div>
                                                </div>
                                                <div className="font-bold text-right">
                                                    {o.status === 'Accepted' && <span className="text-[#2ECC71] uppercase tracking-wider text-xs bg-[#2ECC7115] px-2 py-1 rounded border border-[#2ECC7130]">✅ Aceito</span>}
                                                    {o.status === 'Rejected' && <span className="text-[#E74C3C] uppercase tracking-wider text-xs bg-[#E74C3C15] px-2 py-1 rounded border border-[#E74C3C30]">❌ Recusado</span>}
                                                    {o.status === 'Countered' && <span className="text-[#E67E22] uppercase tracking-wider text-xs bg-[#E67E2215] px-2 py-1 rounded border border-[#E67E2230]">🔄 Contra-Proposta</span>}
                                                </div>
                                                {o.status === 'Countered' && (
                                                    <div className="text-xs text-[#E67E22] mt-1 font-mono">
                                                        Pede: {formatMoney(o.counterSalary || 0)} / {o.counterYears}y
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Market News */}
                        <div>
                            <h3 className="text-sm font-black text-[#C9A84C] mb-4 uppercase tracking-widest border-b border-[#1E2D50] pb-2">Giro do Mercado</h3>
                             {transferNews.length === 0 ? (
                                <p className="text-[#4A5A7A] italic text-sm">Nada de novo no front.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {transferNews.map((news, i) => (
                                        <li key={i} className="text-sm text-[#8A9BB8] flex items-start gap-2">
                                            <span className="text-[#1E2D50] mt-1">●</span> {news}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="p-6 border-t border-[#1E2D50] bg-[#161E35] rounded-b-xl text-right">
                         <button
                            onClick={() => setIsResultsModalOpen(false)}
                            className="bg-[#C9A84C] hover:bg-[#E8C96A] text-[#080C18] px-8 py-3 rounded-lg font-black uppercase tracking-wider shadow-lg shadow-[#C9A84C30] transition-transform transform hover:-translate-y-0.5"
                        >
                             Continuar
                         </button>
                    </div>
               </div>
           </div>
      )}

      {/* History Modal (League Wide) */}
      {isHistoryOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-[#0F1629] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-[#1E2D50]">
                <div
                  className="p-5 border-b flex justify-between items-center rounded-t-xl transition-colors duration-500"
                  style={{ backgroundColor: '#161E35', borderColor: '#1E2D50' }}
                >
                    <h2 className="text-xl font-black uppercase tracking-wide text-[#F0E6D3]">Galeria de Campeãs</h2>
                    <button
                        onClick={() => setIsHistoryOpen(false)}
                        className="text-[#8A9BB8] hover:text-[#F0E6D3] uppercase font-bold text-xs tracking-wider"
                    >
                        ✕ Fechar
                    </button>
                </div>
                <div className="p-6 overflow-auto flex-1 bg-[#080C18]">
                    <h3 className="text-sm font-black text-[#C9A84C] mb-4 uppercase tracking-widest border-b border-[#1E2D50] pb-2">Grupo Especial</h3>
                    <div className="space-y-2">
                        {schools
                            .flatMap(s => s.history.titulos.map(t => ({ ...t, schoolName: s.name })))
                            .filter(t => t.divisao === 'Grupo Especial')
                            .sort((a, b) => b.ano - a.ano)
                            .map((title, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#161E35] p-3 rounded-lg border border-[#1E2D50]">
                                    <span className="font-mono text-[#C9A84C] font-bold text-lg">{title.ano}</span>
                                    <span className="text-[#F0E6D3] font-bold">{title.schoolName}</span>
                                </div>
                            ))}
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* Enredo Selection Modal */}
      {isEnredoModalOpen && playerSchool && !playerSchool.enredo && (
          <EnredoSelectionModal
            isOpen={isEnredoModalOpen}
            onClose={() => setIsEnredoModalOpen(false)}
            candidates={playerSchool.enredoCandidates || []}
            researchFocusId={playerSchool.researchFocusId || null}
            onFocus={focusResearch}
            onLockIn={(id) => {
                lockInEnredo(id);
                setIsEnredoModalOpen(false);
            }}
            schoolBudget={playerSchool.budget}
          />
      )}

      {/* Enredo View Modal (Locked In) */}
      {isEnredoModalOpen && playerSchool && playerSchool.enredo && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0F1629] rounded-xl shadow-2xl p-6 border border-[#1E2D50] max-w-2xl w-full">
                <div className="flex justify-between items-start mb-6 border-b border-[#1E2D50] pb-4">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-[#2ECC71] font-bold mb-1">Enredo 2026</div>
                        <h2 className="text-2xl font-black text-[#F0E6D3]">{playerSchool.enredo.title}</h2>
                    </div>
                    <button onClick={() => setIsEnredoModalOpen(false)} className="text-[#8A9BB8] hover:text-[#F0E6D3]">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-6 text-sm text-[#8A9BB8]">
                    <div className="bg-[#161E35] p-3 rounded-lg border border-[#1E2D50]">
                        <span className="block text-[10px] uppercase tracking-widest text-[#4A5A7A] mb-1">Categoria</span>
                        <span className="text-[#F0E6D3] font-bold">{playerSchool.enredo.category}</span>
                    </div>
                    <div className="bg-[#161E35] p-3 rounded-lg border border-[#1E2D50]">
                        <span className="block text-[10px] uppercase tracking-widest text-[#4A5A7A] mb-1">Tendência</span>
                        <span className={`font-bold ${playerSchool.enredo.trend === 'Rising' ? 'text-[#2ECC71]' : 'text-[#F0E6D3]'}`}>{playerSchool.enredo.trend}</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between border-b border-[#1E2D50] pb-1">
                            <span>Complexidade</span> <span className="text-[#F0E6D3] font-mono">{playerSchool.enredo.complexity}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#1E2D50] pb-1">
                            <span>Dificuldade</span> <span className="text-[#F0E6D3] font-mono">{playerSchool.enredo.difficulty}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between border-b border-[#1E2D50] pb-1">
                            <span>Potencial</span> <span className="text-[#E8C96A] font-bold font-mono">{playerSchool.enredo.potentialScore}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#1E2D50] pb-1">
                            <span>Apelo</span> <span className="text-[#2ECC71] font-bold font-mono">{playerSchool.enredo.appeal}</span>
                        </div>
                    </div>

                    <div className="col-span-2 mt-4 pt-4 border-t border-[#1E2D50]">
                        <span className="text-[10px] uppercase tracking-widest text-[#4A5A7A]">Sinopse</span>
                        <p className="text-xs italic text-[#8A9BB8] mt-2 leading-relaxed">
                            Um desfile que explora as profundezas da cultura {playerSchool.enredo.category}, prometendo emocionar a avenida com sua narrativa envolvente e visual impactante.
                        </p>
                    </div>
                </div>
                <div className="mt-8 flex justify-end">
                    <button onClick={() => setIsEnredoModalOpen(false)} className="bg-[#1E2D50] hover:bg-[#2A3F6B] text-[#F0E6D3] px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors">Fechar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
