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
import EnredoDeadlineScreen from './EnredoDeadlineScreen';
import SambaEnredoModal from './SambaEnredoModal';
import Badge from './Badge';

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
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#080C18] border border-[#2A3F6B] rounded-xl p-3 shadow-2xl z-50 pointer-events-none">
        <div className="text-[#C9A84C] font-bold text-sm mb-1">Partner: {partner.name}</div>
        <div className="text-xs text-[#8A9BB8] mb-2">{formatRole(partner.role)}</div>
        <div className="flex flex-wrap gap-1">
          {skills.map(s => (
            <span key={s.name} className="text-[10px] bg-[#161E35] px-1.5 py-0.5 rounded border border-[#1E2D50] text-[#F0E6D3]">
              {s.name}: <span className="text-white font-bold">{s.value}</span>
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Determine dynamic colors
  const headerBg = playerSchool?.colors[0] || '#1F2937';
  const headerText = getContrastColor(playerSchool?.colors[0]);
  const secondaryColor = playerSchool?.colors[1] || headerBg;

  // Probability Color
  const getProbColor = (p: number) => {
      if (p < 0.3) return 'text-[#E74C3C]';
      if (p < 0.65) return 'text-[#E67E22]';
      return 'text-[#2ECC71]';
  };
  const getProbLabel = (p: number) => {
       if (p < 0.3) return 'Low';
      if (p < 0.65) return 'Medium';
      return 'High';
  };

  const getProBadge = (level: string | undefined) => {
    let variant: 'gold' | 'blue' | 'red' | 'gray' = 'gray';
    let label = 'AMADOR';

    if (level === 'Professional') { variant = 'gold'; label = 'PRO'; }
    else if (level === 'SemiProfessional') { variant = 'blue'; label = 'SEMI-PRO'; }
    else if (level === 'SemiAmateur') { variant = 'red'; label = 'SEMI-AMADOR'; }

    return <Badge variant={variant} className="ml-2">{label}</Badge>;
  };

  return (
    <div className="flex flex-col h-screen bg-[#080C18] text-[#F0E6D3] relative font-sans overflow-hidden">
      {/* Top Bar / Header */}
      <header
        className="relative z-20 flex justify-between items-center px-6 py-4 shadow-2xl overflow-hidden shrink-0"
        style={{
          background: `linear-gradient(135deg, ${headerBg} 0%, ${headerBg}CC 60%, #080C18 100%)`,
          borderBottom: `2px solid ${playerSchool?.colors[0] || '#C9A84C'}60`,
        }}
      >
        {/* Background flag watermark */}
        {playerSchool?.flag && (
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
                {playerSchool ? (
                    <div>
                        <h1 className="text-3xl font-black leading-none tracking-wide" style={{ color: headerText }}>
                            {playerSchool.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs uppercase tracking-widest opacity-80 font-bold" style={{ color: headerText }}>
                                {playerSchool.currentDivision}
                            </span>
                            {getProBadge(playerSchool.proLevel)}
                            <span className="text-xs opacity-60 ml-2 font-mono" style={{ color: headerText }}>
                                Semana {gameState.currentWeek} · {currentPhase}
                            </span>
                        </div>
                    </div>
                ) : (
                    <h1 className="text-2xl font-black leading-none text-[#F0E6D3]">Carnival Manager</h1>
                )}
            </div>

           <Link href="/devtools" className="text-[10px] uppercase tracking-widest bg-black/20 hover:bg-black/30 border border-white/20 px-2 py-1 rounded transition-colors backdrop-blur-sm self-start text-[#F0E6D3]">
            🔧 DevTools
          </Link>
        </div>

        <div className="flex items-center gap-4 relative z-10">
             {playerSchool && (
              <div className="flex gap-3">
                 <button onClick={() => setIsHistoryOpen(true)}
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all duration-200 backdrop-blur-sm hover:bg-white/10"
                    style={{
                        borderColor: 'rgba(255,255,255,0.15)',
                        color: headerText,
                    }}
                 >
                    🏆 Histórico
                 </button>
                 <button onClick={() => setIsRosterOpen(true)}
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all duration-200 backdrop-blur-sm hover:bg-white/10"
                    style={{
                        borderColor: 'rgba(255,255,255,0.15)',
                        color: headerText,
                    }}
                 >
                    👥 Elenco
                 </button>
                 {currentPhase === 'Market' && (
                    <button onClick={() => setIsEnredoModalOpen(true)}
                        className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all duration-200 bg-[#3D1F7A]/60 border-[#7B4FD4]/60 text-purple-200 hover:bg-[#3D1F7A] hover:border-[#9B6FE4]"
                    >
                        🧪 {playerSchool?.enredo ? 'Enredo' : 'Pesquisar'}
                    </button>
                 )}
                  {/* Next Week Button */}
                 {currentPhase === 'Market' && (
                    <button
                        onClick={handleAdvanceWeek}
                        className="text-xs font-black uppercase tracking-widest px-5 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
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
            ) : (
              <div className="bg-red-900/50 px-4 py-2 rounded-lg border border-red-700 text-red-200">
                No School Selected
              </div>
            )}
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 overflow-hidden flex gap-6 p-6">

        {/* LEFT PANEL: Market & Action Area */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

            {/* Pending Decisions Alert */}
            {counteredOffers.length > 0 && (
                <div
                    className="rounded-xl p-4 flex flex-col gap-3"
                    style={{ background: '#2A1A00', border: '1px solid #E67E2240' }}
                >
                    <h3 className="font-black text-sm uppercase tracking-widest text-[#E67E22] flex items-center gap-2">
                        ⚠️ Contra-Propostas Pendentes
                    </h3>
                    <div className="space-y-2">
                        {counteredOffers.map(offer => {
                            const staff = availableStaff.find(s => s.id === offer.toStaffId) || schools.flatMap(s => s.staff).find(s => s.id === offer.toStaffId);
                            return (
                                <div key={offer.id} className="flex justify-between items-center bg-[#080C18]/50 p-3 rounded-lg border border-[#E67E2220]">
                                    <div className="text-sm">
                                        <span className="font-bold text-[#F0E6D3]">{staff?.name}</span> <span className="text-[#8A9BB8]">({formatRole(staff?.role)})</span> pede
                                        <span className="text-[#2ECC71] font-mono font-bold ml-2">{formatMoney(offer.counterSalary || 0)}</span> por {offer.counterYears} anos.
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => acceptCounter(offer.id)}
                                            className="bg-[#2ECC71] hover:bg-[#27AE60] text-[#080C18] px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider"
                                        >
                                            Aceitar
                                        </button>
                                        <button
                                            onClick={() => rejectCounter(offer.id)}
                                            className="bg-[#E74C3C] hover:bg-[#C0392B] text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider"
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

            {/* Filters Bar */}
            <div
                className="flex justify-between items-center px-5 py-4 rounded-xl shadow-lg shrink-0"
                style={{ background: '#0F1629', border: '1px solid #1E2D50' }}
            >
                <div className="flex items-center gap-4">
                    <span className="text-[11px] uppercase tracking-widest text-[#4A5A7A] font-bold">Filtrar Mercado:</span>
                    <select
                        className="text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none transition-colors cursor-pointer"
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

                    <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg transition-colors hover:bg-[#1E2D50] border border-transparent hover:border-[#2A3F6B]">
                        <input
                            type="checkbox"
                            checked={hideFilled}
                            onChange={(e) => setHideFilled(e.target.checked)}
                            className="rounded accent-[#C9A84C]"
                        />
                        <span className="text-sm text-[#8A9BB8] font-medium">Ocultar Posições Preenchidas</span>
                    </label>
                </div>

                {message && (
                    <div className="text-xs font-bold px-4 py-2 rounded-lg animate-fade-in flex items-center gap-2"
                        style={{ background: '#1A3A5C', border: '1px solid #2A5A8C', color: '#60C0FF' }}>
                        <span>ℹ️</span> {message}
                    </div>
                )}
            </div>

            {/* Market Grid (Replaces Table) */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {filteredStaff.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-50">
                        <div className="text-5xl">🥁</div>
                        <div className="text-[#8A9BB8] text-sm font-bold uppercase tracking-wider">Nenhum profissional disponível com esses filtros.</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
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
                                    className="relative rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl group"
                                    style={{
                                        background: '#0F1629',
                                        border: `1px solid ${isPending ? '#C9A84C50' : isRoleFilled ? '#2ECC7130' : '#1E2D50'}`,
                                        boxShadow: isPending ? '0 0 16px #C9A84C10' : 'none',
                                    }}
                                >
                                    {/* Top color strip */}
                                    <div className="h-1 w-full" style={{
                                        background: isRoleFilled
                                            ? 'linear-gradient(90deg, #2ECC71, #27AE60)'
                                            : isPending
                                            ? 'linear-gradient(90deg, #C9A84C, #E8C96A)'
                                            : 'linear-gradient(90deg, #1E2D50, #2A3F6B)',
                                    }} />

                                    <div className="p-4 flex flex-col gap-3 flex-1">
                                        {/* Header Row */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-[#F0E6D3] font-bold text-base leading-tight">{staff.name}</span>
                                                    {staff.age && <span className="text-[10px] text-[#4A5A7A] font-mono font-bold bg-[#080C18] px-1.5 py-0.5 rounded">{staff.age}a</span>}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                     {staff.partnerId && (
                                                        <span
                                                            className="text-[9px] font-bold uppercase tracking-wider bg-pink-900/30 text-pink-300 px-1.5 py-0.5 rounded-full border border-pink-800/50 cursor-help transition-colors hover:bg-pink-900/50"
                                                            onMouseEnter={() => setHoveredPartnerId(staff.partnerId!)}
                                                            onMouseLeave={() => setHoveredPartnerId(null)}
                                                        >
                                                            Par
                                                        </span>
                                                    )}
                                                    {staff.archetype && (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-800/50">
                                                            {staff.archetype}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Reputation */}
                                            <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                                <div
                                                    className="text-lg font-black font-mono px-2 py-0.5 rounded-lg leading-none"
                                                    style={{
                                                        background: staff.reputation >= 180 ? '#7A5A10' : '#161E35',
                                                        color: staff.reputation >= 180 ? '#E8C96A' : '#8A9BB8',
                                                        border: `1px solid ${staff.reputation >= 180 ? '#C9A84C60' : '#2A3F6B'}`,
                                                    }}
                                                >
                                                    {staff.reputation}
                                                </div>
                                                <span className="text-[8px] text-[#4A5A7A] uppercase tracking-widest mt-1 font-bold">{potentialDesc}</span>
                                            </div>
                                        </div>

                                        {/* History Text */}
                                        {staff.historyText && (
                                            <div className="text-[10px] text-[#4A5A7A] line-clamp-2 leading-relaxed italic border-l-2 border-[#1E2D50] pl-2">
                                                "{staff.historyText}"
                                            </div>
                                        )}

                                        {/* Role Badge */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A9BB8] bg-[#161E35] px-2 py-1 rounded border border-[#1E2D50]">
                                                {formatRole(staff.role)}
                                            </span>
                                            {isRoleFilled && (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[#2ECC71] flex items-center gap-1">
                                                    ✓ Preenchido
                                                </span>
                                            )}
                                        </div>

                                        {/* Skills */}
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {skills.map((skill) => (
                                                <div key={skill.name}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#080C18] border border-[#1E2D50]"
                                                >
                                                    <span className="text-[9px] uppercase tracking-wider text-[#4A5A7A] font-bold">{skill.name}</span>
                                                    <span
                                                        className="text-[10px] font-black font-mono"
                                                        style={{
                                                            color: skill.value >= 18 ? '#C9A84C' : skill.value >= 15 ? '#2ECC71' : '#F0E6D3',
                                                        }}
                                                    >
                                                        {skill.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Bottom Action Row */}
                                        <div className="flex items-center justify-between pt-3 border-t border-[#1E2D50] mt-auto">
                                            <div>
                                                <div className="text-[9px] text-[#4A5A7A] uppercase tracking-widest font-bold mb-0.5">
                                                    {isRainha ? 'Investimento' : 'Expectativa'}
                                                </div>
                                                <div className="text-sm font-black font-mono text-[#F0E6D3]">
                                                    {isRainha && staff.archetype !== 'CriaDaComunidade'
                                                        ? <span className="text-[#C9A84C] text-xs">— Patrocínio</span>
                                                        : formatMoney(adjustedSalary)}
                                                </div>
                                            </div>

                                            {isPending ? (
                                                <span className="text-[10px] font-bold text-[#C9A84C] bg-[#C9A84C15] px-3 py-1.5 rounded-lg border border-[#C9A84C30] uppercase tracking-wider">
                                                    ⏳ Oferta Enviada
                                                </span>
                                            ) : rolePending ? (
                                                <span className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-wider">Em Negociação</span>
                                            ) : (
                                                <button
                                                    onClick={() => openOfferModal(staff)}
                                                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 100%)',
                                                        color: '#080C18',
                                                        boxShadow: '0 4px 12px #C9A84C20',
                                                    }}
                                                >
                                                    Contratar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Partner Tooltip Rendered at top level of card if hovered */}
                                    {staff.partnerId && hoveredPartnerId === staff.partnerId && renderPartnerTooltip(staff.partnerId)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT PANEL: Research & News */}
        <div className="w-80 flex flex-col gap-6 shrink-0">

            {/* Research Status Card */}
            <div
                className="rounded-xl p-5 flex flex-col gap-4 shadow-lg"
                style={{ background: '#0F1629', border: '1px solid #2A3F6B' }}
            >
                <div className="flex items-center justify-between">
                     <h3 className="text-[11px] uppercase tracking-widest font-black text-[#C9A84C]">
                        🧪 Pesquisa
                    </h3>
                    {playerSchool?.enredo && <span className="text-[10px] font-bold text-[#2ECC71]">Definido</span>}
                </div>

                {playerSchool?.enredo ? (
                     <div className="flex flex-col gap-2">
                        <div className="text-sm font-bold text-[#F0E6D3]">{playerSchool.enredo.title}</div>
                        <div className="text-xs text-[#8A9BB8]">{playerSchool.enredo.category}</div>
                        <button
                            onClick={() => setIsEnredoModalOpen(true)}
                            className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#C9A84C] hover:text-[#E8C96A] text-left"
                        >
                            Ver Detalhes →
                        </button>
                     </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <p className="text-xs text-[#8A9BB8] leading-relaxed">
                            Pesquise temas para o Carnaval 2026. Escolha com sabedoria.
                        </p>
                        <button
                            onClick={() => setIsEnredoModalOpen(true)}
                            className="w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
                            style={{
                                background: '#161E35',
                                border: '1px solid #C9A84C',
                                color: '#C9A84C'
                            }}
                        >
                            Pesquisar Agora
                        </button>
                    </div>
                )}
            </div>

            {/* Market News Panel */}
            <div
                className="rounded-xl p-5 flex-1 flex flex-col gap-3 shadow-lg min-h-0"
                style={{ background: '#0F1629', border: '1px solid #1E2D50' }}
            >
                <h3 className="text-[11px] uppercase tracking-widest font-black text-[#8A9BB8] flex items-center gap-2">
                    📰 Notícias do Mercado
                </h3>

                <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                    {transferNews.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[#4A5A7A] text-xs italic">
                            Silêncio no mercado...
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {transferNews.map((news, i) => (
                                <div key={i} className="text-xs text-[#8A9BB8] flex gap-2 items-start leading-relaxed border-b border-[#1E2D50] pb-2 last:border-0">
                                    <span className="text-[#C9A84C] mt-0.5 flex-shrink-0 text-[10px]">▸</span>
                                    <span>{news}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

      </main>

      {/* MODALS */}

      {/* Offer Modal */}
      {isOfferModalOpen && selectedStaff && playerSchool && probData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="rounded-xl shadow-2xl w-full max-w-md border p-6 transform transition-all"
                   style={{ background: '#0F1629', borderColor: '#C9A84C40' }}>

                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <div className="text-[10px] text-[#C9A84C] font-bold uppercase tracking-widest mb-1">Negociação</div>
                          <h2 className="text-xl font-black text-[#F0E6D3]">{selectedStaff.name}</h2>
                          <div className="text-xs text-[#8A9BB8]">{formatRole(selectedStaff.role)}</div>
                      </div>
                      <div className="text-right">
                          <div className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-widest">Expectativa</div>
                          <div className="text-sm font-mono font-bold text-[#F0E6D3]">{formatMoney(selectedStaff.salaryExpectation)}</div>
                      </div>
                  </div>

                  {/* Salary Slider */}
                  <div className="mb-6">
                      <label className="block text-[#8A9BB8] text-xs font-bold uppercase tracking-wider mb-2">Oferta Salarial (Anual)</label>
                      <div className="flex justify-between items-center mb-3">
                           <span className="text-xs text-[#4A5A7A] font-mono">{formatMoney(Math.floor(selectedStaff.salaryExpectation * 0.5))}</span>
                           <span className="text-2xl font-black font-mono text-[#C9A84C]">{formatMoney(offerSalary)}</span>
                           <span className="text-xs text-[#4A5A7A] font-mono">{formatMoney(Math.floor(selectedStaff.salaryExpectation * 2.5))}</span>
                      </div>
                      <input
                        type="range"
                        min={Math.floor(selectedStaff.salaryExpectation * 0.5)}
                        max={Math.floor(selectedStaff.salaryExpectation * 2.5)}
                        step={1000}
                        value={offerSalary}
                        onChange={(e) => setOfferSalary(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#161E35] rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
                      />
                  </div>

                  {/* Contract Years */}
                  <div className="mb-8">
                       <label className="block text-[#8A9BB8] text-xs font-bold uppercase tracking-wider mb-3">Duração do Contrato</label>
                       <div className="flex gap-3">
                           {[1, 2, 3].map(y => (
                               <button
                                key={y}
                                onClick={() => setOfferYears(y)}
                                className={`flex-1 py-3 rounded-lg border text-sm font-bold transition-all ${
                                    offerYears === y
                                    ? 'bg-[#C9A84C] border-[#C9A84C] text-[#080C18]'
                                    : 'bg-[#161E35] border-[#1E2D50] text-[#8A9BB8] hover:border-[#2A3F6B]'
                                }`}
                               >
                                   {y} Ano{y > 1 ? 's' : ''}
                               </button>
                           ))}
                       </div>
                  </div>

                  {/* Probability */}
                  <div className="mb-8 bg-[#080C18] p-4 rounded-xl border border-[#1E2D50] text-center relative overflow-hidden">
                      <div className="relative z-10">
                          <div className="text-[#4A5A7A] text-[10px] font-bold uppercase tracking-widest mb-1">Probabilidade de Aceite</div>
                          <div className={`text-3xl font-black ${getProbColor(probData.prob)}`}>
                              {Math.round(probData.prob * 100)}%
                          </div>
                          <div className="text-[10px] text-[#8A9BB8] mt-2 font-mono">
                              Ideal: {probData.idealYears} anos | Min: {formatMoney(Math.round(probData.minSalary))}
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <button onClick={() => setIsOfferModalOpen(false)}
                        className="flex-1 bg-transparent hover:bg-[#1E2D50] text-[#8A9BB8] py-3 rounded-lg font-bold border border-[#1E2D50] transition-colors uppercase text-xs tracking-wider">
                          Cancelar
                      </button>
                      <button onClick={handleMakeOffer}
                        className="flex-1 bg-[#C9A84C] hover:bg-[#E8C96A] text-[#080C18] py-3 rounded-lg font-black shadow-lg shadow-[#C9A84C20] transition-transform active:scale-95 uppercase text-xs tracking-wider">
                          Enviar Oferta
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Week Results Modal */}
      {isResultsModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
               <div className="rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#1E2D50] overflow-hidden"
                    style={{ background: '#0F1629' }}>
                    <div className="p-5 border-b border-[#1E2D50] bg-[#080C18] flex justify-between items-center">
                        <h2 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide">
                            Resumo da Semana <span className="text-[#C9A84C]">{gameState.currentWeek - 1}</span>
                        </h2>
                    </div>
                    <div className="p-6 overflow-auto space-y-8">
                        {/* Your Offers */}
                        <div>
                            <h3 className="text-sm font-black text-[#8A9BB8] mb-4 uppercase tracking-widest border-b border-[#1E2D50] pb-2">Suas Ofertas</h3>
                            {resolvedOffers.length === 0 ? (
                                <p className="text-[#4A5A7A] italic text-sm">Nenhuma oferta resolvida esta semana.</p>
                            ) : (
                                <div className="space-y-3">
                                    {resolvedOffers.map(o => {
                                        const staff = availableStaff.find(s => s.id === o.toStaffId) || schools.flatMap(s => s.staff).find(s => s.id === o.toStaffId);
                                        return (
                                            <div key={o.id} className="bg-[#161E35] p-4 rounded-lg border border-[#1E2D50] flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-[#F0E6D3] text-lg">{staff?.name || 'Desconhecido'}</div>
                                                    <div className="text-[#8A9BB8] text-xs mt-0.5">
                                                        {formatRole(staff?.role)} · <span className="font-mono text-[#C9A84C]">{formatMoney(o.offeredSalary)}</span> / {o.contractYears}y
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black uppercase tracking-wider text-sm">
                                                        {o.status === 'Accepted' && <span className="text-[#2ECC71]">✅ Aceito</span>}
                                                        {o.status === 'Rejected' && <span className="text-[#E74C3C]">❌ Recusado</span>}
                                                        {o.status === 'Countered' && <span className="text-[#E67E22]">🔄 Contra-proposta</span>}
                                                    </div>
                                                    {o.status === 'Countered' && (
                                                        <div className="text-xs text-[#E67E22] mt-1 font-mono">
                                                            Pede: {formatMoney(o.counterSalary || 0)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-5 border-t border-[#1E2D50] bg-[#080C18] text-right">
                         <button onClick={() => setIsResultsModalOpen(false)}
                            className="bg-[#C9A84C] hover:bg-[#E8C96A] text-[#080C18] px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm shadow-lg shadow-[#C9A84C20]">
                             Continuar
                         </button>
                    </div>
               </div>
           </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-[#1E2D50] overflow-hidden"
                  style={{ background: '#0F1629' }}>
                <div
                  className="p-5 border-b flex justify-between items-center"
                  style={{ background: '#080C18', borderColor: '#1E2D50' }}
                >
                    <h2 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide">Galeria de Campeões</h2>
                    <button
                        onClick={() => setIsHistoryOpen(false)}
                        className="text-[#8A9BB8] hover:text-[#F0E6D3] uppercase text-xs font-bold tracking-widest transition-colors"
                    >
                        ✕ Fechar
                    </button>
                </div>
                <div className="p-6 overflow-auto flex-1 custom-scrollbar">
                    <h3 className="text-sm font-black text-[#C9A84C] mb-4 uppercase tracking-widest">Grupo Especial</h3>
                    <div className="space-y-2">
                        {schools
                            .flatMap(s => s.history.titulos.map(t => ({ ...t, schoolName: s.name })))
                            .filter(t => t.divisao === 'Grupo Especial')
                            .sort((a, b) => b.ano - a.ano)
                            .map((title, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#161E35] p-4 rounded-lg border border-[#1E2D50] hover:border-[#2A3F6B] transition-colors">
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="rounded-xl shadow-2xl p-6 border border-[#C9A84C40] max-w-2xl w-full"
                 style={{ background: '#0F1629' }}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="text-[10px] text-[#C9A84C] font-bold uppercase tracking-widest mb-1">Enredo 2026</div>
                        <h2 className="text-2xl font-black text-[#F0E6D3] leading-tight">{playerSchool.enredo.title}</h2>
                    </div>
                    <button onClick={() => setIsEnredoModalOpen(false)} className="text-[#8A9BB8] hover:text-[#F0E6D3]">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                     <div className="bg-[#161E35] p-3 rounded-lg border border-[#1E2D50]">
                        <div className="text-[#4A5A7A] text-[10px] uppercase tracking-wider font-bold mb-1">Categoria</div>
                        <div className="text-[#F0E6D3] font-bold">{playerSchool.enredo.category}</div>
                     </div>
                     <div className="bg-[#161E35] p-3 rounded-lg border border-[#1E2D50]">
                        <div className="text-[#4A5A7A] text-[10px] uppercase tracking-wider font-bold mb-1">Tendência</div>
                        <div className={`font-bold ${playerSchool.enredo.trend === 'Rising' ? 'text-[#2ECC71]' : 'text-[#8A9BB8]'}`}>{playerSchool.enredo.trend}</div>
                     </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                    <div className="text-center">
                        <div className="text-[#4A5A7A] text-[10px] uppercase tracking-wider font-bold">Complexidade</div>
                        <div className="text-xl font-mono font-bold text-[#F0E6D3]">{playerSchool.enredo.complexity}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[#4A5A7A] text-[10px] uppercase tracking-wider font-bold">Potencial</div>
                        <div className="text-xl font-mono font-bold text-[#C9A84C]">{playerSchool.enredo.potentialScore}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[#4A5A7A] text-[10px] uppercase tracking-wider font-bold">Apelo</div>
                        <div className="text-xl font-mono font-bold text-[#2ECC71]">{playerSchool.enredo.appeal}</div>
                    </div>
                </div>

                <div className="pt-4 border-t border-[#1E2D50]">
                     <p className="text-xs italic text-[#8A9BB8] leading-relaxed">
                        Este enredo explora a profundidade cultural de {playerSchool.enredo.category}, prometendo um desfile inesquecível na Sapucaí.
                    </p>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={() => setIsEnredoModalOpen(false)}
                        className="bg-[#1E2D50] hover:bg-[#2A3F6B] text-[#F0E6D3] px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Roster Modal */}
      {isRosterOpen && playerSchool && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0F1629] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#1E2D50]">
                <div className="p-5 border-b border-[#1E2D50] flex justify-between items-center rounded-t-xl bg-[#080C18]">
                        <h2 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide">Meu Elenco</h2>
                        <button onClick={() => setIsRosterOpen(false)} className="text-[#8A9BB8] hover:text-[#F0E6D3]">✕</button>
                </div>
                <div className="p-4 overflow-auto custom-scrollbar">
                        <RosterList staff={playerSchool.staff} />
                </div>
            </div>
        </div>
      )}

      {/* Enredo Deadline Screen (Blocks Advancement) */}
      {gameState.showEnredoDeadlineScreen && <EnredoDeadlineScreen />}

      {/* Samba Enredo Selection Modal (Blocks Advancement) */}
      {gameState.pendingSambaSelection && !gameState.chosenSambaEnredo && gameState.currentWeek >= 9 && <SambaEnredoModal />}

    </div>
  );
}
