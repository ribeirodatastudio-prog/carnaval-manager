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

// Helper for contrast
function getContrastColor(hex: string | undefined): string {
    if (!hex) return '#FFFFFF';
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#111827' : '#F9FAFB'; // gray-900 vs gray-50
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
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-black/90 border border-pink-500 rounded p-3 shadow-xl z-50 pointer-events-none">
        <div className="text-pink-300 font-bold text-sm mb-1">Partner: {partner.name}</div>
        <div className="text-xs text-gray-400 mb-2">{formatRole(partner.role)}</div>
        <div className="flex flex-wrap gap-1">
          {skills.map(s => (
            <span key={s.name} className="text-[10px] bg-gray-800 px-1 rounded border border-gray-600">
              {s.name}: <span className="text-white">{s.value}</span>
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
      if (p < 0.3) return 'text-red-500';
      if (p < 0.65) return 'text-yellow-500';
      return 'text-green-500';
  };
  const getProbLabel = (p: number) => {
       if (p < 0.3) return 'Low';
      if (p < 0.65) return 'Medium';
      return 'High';
  };

  const getProBadge = (level: string | undefined) => {
    let color = 'bg-gray-500 text-white';
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
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 relative">
      {/* Top Bar / Header */}
      <header
        className="p-4 shadow-md flex justify-between items-center z-20 relative transition-colors duration-500"
        style={{ backgroundColor: headerBg, color: headerText }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            {playerSchool?.flag && (
                <div className="w-16 h-10 relative rounded overflow-hidden shadow-sm border border-black/10">
                    <img src={playerSchool.flag} alt="Flag" className="w-full h-full object-cover" />
                </div>
            )}
            <div>
                {playerSchool ? (
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-none flex items-center">
                            {playerSchool.name}
                        </h1>
                         <div className="text-sm opacity-90 flex items-center mt-1">
                            {playerSchool.currentDivision}
                            {getProBadge(playerSchool.proLevel)}
                        </div>
                    </div>
                ) : (
                    <h1 className="text-2xl font-bold leading-none">Carnival Manager</h1>
                )}
                <div className="text-xs opacity-75 mt-1">
                    Year {gameState.currentYear} | Phase: <span className="font-semibold">{currentPhase}</span> | Week: {gameState.currentWeek}
                </div>
            </div>
          </div>
           <Link href="/devtools" className="text-xs bg-black/20 hover:bg-black/30 border border-white/20 px-2 py-1 rounded transition-colors backdrop-blur-sm self-start">
            🔧 DevTools
          </Link>
        </div>

        <div className="flex items-center gap-4">
             {playerSchool && (
              <div className="flex gap-2">
                 <button onClick={() => setIsHistoryOpen(true)} className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded text-sm border border-white/10 backdrop-blur-sm transition-colors">
                    🏆 History
                 </button>
                 <button onClick={() => setIsRosterOpen(true)} className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded text-sm border border-white/10 backdrop-blur-sm transition-colors">
                    My Roster
                 </button>
                 {currentPhase === 'Market' && (
                    <button onClick={() => setIsEnredoModalOpen(true)} className="bg-purple-900/50 hover:bg-purple-800 text-purple-100 border border-purple-500 px-3 py-1 rounded text-sm backdrop-blur-sm transition-colors">
                        {playerSchool?.enredo ? '📜 Enredo' : '🧪 Research'}
                    </button>
                 )}
                  {/* Next Week Button */}
                 {currentPhase === 'Market' && (
                    <button
                        onClick={handleAdvanceWeek}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-1 rounded text-sm border border-green-400 shadow-lg animate-pulse"
                    >
                        Next Week ➡️
                    </button>
                 )}
              </div>
            )}

            {playerSchool ? (
              <div className="bg-black/20 px-4 py-2 rounded-lg border border-white/10 text-right min-w-[150px] backdrop-blur-sm">
                <div className="text-xs opacity-80">Budget</div>
                <div className="text-xl font-mono font-bold">{formatMoney(playerSchool.budget)}</div>
              </div>
            ) : (
              <div className="bg-red-900/50 px-4 py-2 rounded-lg border border-red-700 text-red-200">
                No School Selected
              </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col p-6 gap-6">

        {/* Pending Decisions Panel */}
        {counteredOffers.length > 0 && (
            <div className="bg-yellow-900/40 border border-yellow-600 p-4 rounded-lg">
                <h3 className="text-yellow-400 font-bold mb-2">⚠️ Pending Counter-Offers</h3>
                <div className="space-y-2">
                    {counteredOffers.map(offer => {
                        const staff = availableStaff.find(s => s.id === offer.toStaffId) || schools.flatMap(s => s.staff).find(s => s.id === offer.toStaffId);
                        return (
                            <div key={offer.id} className="flex justify-between items-center bg-black/40 p-2 rounded">
                                <div>
                                    <span className="font-bold text-white">{staff?.name}</span> ({staff?.role}) requests
                                    <span className="text-green-400 font-mono ml-2">{formatMoney(offer.counterSalary || 0)}</span> for {offer.counterYears} year(s).
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => acceptCounter(offer.id)}
                                        className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-xs font-bold"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => rejectCounter(offer.id)}
                                        className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-xs font-bold"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Filters and Actions */}
        <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg shadow-sm">
           <div className="flex items-center gap-4">
             <span className="text-gray-400 font-medium">Filter Market:</span>
             <select
               className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 focus:outline-none focus:border-yellow-500"
               value={filterRole}
               onChange={(e) => setFilterRole(e.target.value as StaffRole | 'All')}
             >
               <option value="All">All Roles</option>
               {uniqueRoles.map(role => (
                 <option key={role} value={role}>{formatRole(role)}</option>
               ))}
             </select>

             <label className="flex items-center gap-2 cursor-pointer bg-gray-700/50 px-3 py-1 rounded border border-gray-600 hover:bg-gray-700 transition-colors">
               <input
                 type="checkbox"
                 checked={hideFilled}
                 onChange={(e) => setHideFilled(e.target.checked)}
                 className="rounded bg-gray-600 border-gray-500 text-yellow-500 focus:ring-yellow-500/50"
               />
               <span className="text-sm text-gray-300">Hide Filled Positions</span>
             </label>
           </div>

           {message && (
             <div className="bg-blue-900/80 text-blue-100 px-4 py-2 rounded animate-fade-in border border-blue-700">
               {message}
             </div>
           )}
        </div>

        {/* Market Table */}
        <div className="flex-1 overflow-auto bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900 sticky top-0 z-10 text-gray-400 text-sm uppercase tracking-wider">
              <tr>
                <th className="p-4 font-semibold border-b border-gray-700">Name</th>
                <th className="p-4 font-semibold border-b border-gray-700">Role</th>
                <th className="p-4 font-semibold border-b border-gray-700 text-center">Rep</th>
                <th className="p-4 font-semibold border-b border-gray-700 w-1/3">Key Attributes</th>
                <th className="p-4 font-semibold border-b border-gray-700">Expected Cost</th>
                <th className="p-4 font-semibold border-b border-gray-700 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No staff members found matching criteria.</td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const prestige = playerSchool ? playerSchool.prestige : 100;
                  const adjustedSalary = calculateAdjustedSalary(staff, prestige);
                  const isRainha = staff.role === 'RainhaDeBateria';

                  const isRoleFilled = playerSchool?.staff.some(s => s.role === staff.role);
                  const potentialDesc = getPotentialDescriptor(staff.reputation, staff.potential);

                  // Check if offer pending
                  const isPending = pendingOffers.some(o => o.toStaffId === staff.id && o.status === 'Pending');
                  // Check if pending offer for this ROLE exists
                  const rolePending = pendingOffers.some(o => {
                      if (o.status !== 'Pending' || o.fromSchoolId !== playerSchoolId) return false;
                      const s = availableStaff.find(st => st.id === o.toStaffId);
                      return s && s.role === staff.role;
                  });

                  return (
                    <tr key={staff.id} className="hover:bg-gray-700/50 transition-colors group">
                      <td className="p-4 font-medium text-white relative min-w-[200px]">
                        <div className="flex items-center">
                            {staff.name}
                            {staff.age && <span className="ml-2 text-xs text-gray-500">({staff.age}y)</span>}
                            {staff.partnerId && (
                            <span
                                className="ml-2 text-xs bg-pink-900 text-pink-200 px-1 rounded cursor-help"
                                onMouseEnter={() => setHoveredPartnerId(staff.partnerId!)}
                                onMouseLeave={() => setHoveredPartnerId(null)}
                            >
                                Partner
                            </span>
                            )}
                            {staff.archetype && (
                                <span className="ml-2 text-xs bg-purple-900 text-purple-200 px-1 rounded">
                                    {staff.archetype}
                                </span>
                            )}
                        </div>
                        {staff.historyText && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-[250px]" title={staff.historyText}>
                                {staff.historyText}
                            </div>
                        )}
                        {staff.partnerId && hoveredPartnerId === staff.partnerId && renderPartnerTooltip(staff.partnerId)}
                      </td>
                      <td className="p-4 text-gray-300">
                        <div className="flex flex-col">
                            {formatRole(staff.role)}
                            {isRoleFilled && (
                                <span className="text-[10px] uppercase font-bold text-green-500 flex items-center gap-1">
                                    ✓ Filled
                                </span>
                            )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                         <div className="flex flex-col items-center gap-1">
                             <span className={`px-2 py-1 rounded text-xs font-bold ${staff.reputation >= 180 ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>
                                {staff.reputation}
                             </span>
                             <span className="text-[10px] text-gray-500 uppercase tracking-tight">{potentialDesc}</span>
                         </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {getKeySkills(staff.role, staff.skills).map((skill) => (
                            <div key={skill.name} className="flex flex-col bg-gray-900 px-2 py-1 rounded border border-gray-600 min-w-[60px] text-center">
                              <span className="text-[10px] text-gray-500 uppercase">{skill.name}</span>
                              <span className={`font-bold ${skill.value >= 18 ? 'text-yellow-400' : skill.value >= 15 ? 'text-green-400' : 'text-gray-200'}`}>
                                {skill.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-gray-300">
                        {isRainha ? (
                             staff.archetype === 'PostoPago' ? <span className="text-green-400">Injects Money</span> :
                             staff.archetype === 'Celebridade' ? <span className="text-yellow-400">R$ 0 (Requires Fame)</span> :
                             formatMoney(adjustedSalary)
                        ) : (
                            <span>{formatMoney(adjustedSalary)} <span className="text-xs text-gray-500">/ season</span></span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => openOfferModal(staff)}
                          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                              isPending ? 'bg-yellow-600 text-white cursor-not-allowed' :
                              rolePending ? 'bg-gray-600 text-gray-400 cursor-not-allowed' :
                              'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                          disabled={!playerSchool || isPending || rolePending}
                          title={isPending ? "Offer Pending" : rolePending ? "Offer already submitted for this role this week" : "Make Offer"}
                        >
                          {isPending ? "Pending" : "Make Offer"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Offer Modal */}
      {isOfferModalOpen && selectedStaff && playerSchool && probData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Make Offer to {selectedStaff.name}</h2>

                  {/* Salary Slider */}
                  <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-1">Annual Salary Offer</label>
                      <div className="flex justify-between items-center mb-2">
                           <span className="text-sm text-gray-500">{formatMoney(Math.floor(selectedStaff.salaryExpectation * 0.5))}</span>
                           <span className="text-xl font-bold font-mono text-green-400">{formatMoney(offerSalary)}</span>
                           <span className="text-sm text-gray-500">{formatMoney(Math.floor(selectedStaff.salaryExpectation * 2.5))}</span>
                      </div>
                      <input
                        type="range"
                        min={Math.floor(selectedStaff.salaryExpectation * 0.5)}
                        max={Math.floor(selectedStaff.salaryExpectation * 2.5)}
                        step={1000}
                        value={offerSalary}
                        onChange={(e) => setOfferSalary(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                  </div>

                  {/* Contract Years */}
                  <div className="mb-6">
                       <label className="block text-gray-400 text-sm mb-2">Contract Duration (Years)</label>
                       <div className="flex gap-2">
                           {[1, 2, 3].map(y => (
                               <button
                                key={y}
                                onClick={() => setOfferYears(y)}
                                className={`flex-1 py-2 rounded border ${offerYears === y ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}`}
                               >
                                   {y} Year{y > 1 ? 's' : ''}
                               </button>
                           ))}
                       </div>
                  </div>

                  {/* Probability */}
                  <div className="mb-6 bg-gray-900 p-3 rounded border border-gray-700 text-center">
                      <div className="text-gray-400 text-sm">Acceptance Probability</div>
                      <div className={`text-2xl font-bold ${getProbColor(probData.prob)}`}>
                          {Math.round(probData.prob * 100)}% ({getProbLabel(probData.prob)})
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                          Ideal: {probData.idealYears} years | Min Salary: {formatMoney(Math.round(probData.minSalary))}
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setIsOfferModalOpen(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded">Cancel</button>
                      <button onClick={handleMakeOffer} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold shadow-lg">Submit Offer</button>
                  </div>
              </div>
          </div>
      )}

      {/* Week Results Modal */}
      {isResultsModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
               <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700">
                    <div className="p-4 border-b border-gray-700 bg-gray-900 rounded-t-lg">
                        <h2 className="text-xl font-bold text-white">Week {gameState.currentWeek - 1} Results</h2>
                    </div>
                    <div className="p-6 overflow-auto space-y-6">
                        {/* Your Offers */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-300 mb-2 border-b border-gray-600 pb-1">Your Offers</h3>
                            {resolvedOffers.length === 0 ? (
                                <p className="text-gray-500 italic">No offers resolved this week.</p>
                            ) : (
                                <div className="space-y-2">
                                    {resolvedOffers.map(o => {
                                        const staff = availableStaff.find(s => s.id === o.toStaffId) || schools.flatMap(s => s.staff).find(s => s.id === o.toStaffId); // Try to find staff everywhere
                                        return (
                                            <div key={o.id} className="bg-gray-900 p-3 rounded border border-gray-700 flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-white">{staff?.name || 'Unknown Staff'}</span>
                                                    <span className="text-gray-500 text-sm ml-2">({formatMoney(o.offeredSalary)} / {o.contractYears}y)</span>
                                                </div>
                                                <div className="font-bold">
                                                    {o.status === 'Accepted' && <span className="text-green-500">✅ Accepted</span>}
                                                    {o.status === 'Rejected' && <span className="text-red-500">❌ Rejected</span>}
                                                    {o.status === 'Countered' && <span className="text-yellow-500">🔄 Countered</span>}
                                                </div>
                                                {o.status === 'Countered' && (
                                                    <div className="text-xs text-yellow-300 mt-1">
                                                        Counter: {formatMoney(o.counterSalary || 0)} / {o.counterYears}y
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
                            <h3 className="text-lg font-bold text-gray-300 mb-2 border-b border-gray-600 pb-1">Market News</h3>
                             {transferNews.length === 0 ? (
                                <p className="text-gray-500 italic">No market activity reported.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {transferNews.map((news, i) => (
                                        <li key={i} className="text-sm text-gray-400">• {news}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-lg text-right">
                         <button onClick={() => setIsResultsModalOpen(false)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded">
                             Continue
                         </button>
                    </div>
               </div>
           </div>
      )}

      {/* History Modal (League Wide) */}
      {isHistoryOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
             <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-700">
                <div
                  className="p-4 border-b flex justify-between items-center rounded-t-lg transition-colors duration-500"
                  style={{ backgroundColor: headerBg, borderColor: secondaryColor }}
                >
                    <h2 className="text-xl font-bold" style={{ color: headerText }}>League History</h2>
                    <button
                        onClick={() => setIsHistoryOpen(false)}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                        style={{ color: headerText }}
                    >
                        ✕ Close
                    </button>
                </div>
                <div className="p-6 overflow-auto flex-1">
                    <h3 className="text-lg font-bold text-white mb-4">Champions of Grupo Especial</h3>
                    <div className="space-y-2">
                        {schools
                            .flatMap(s => s.history.titulos.map(t => ({ ...t, schoolName: s.name })))
                            .filter(t => t.divisao === 'Grupo Especial')
                            .sort((a, b) => b.ano - a.ano)
                            .map((title, i) => (
                                <div key={i} className="flex justify-between items-center bg-gray-900/50 p-3 rounded border border-gray-700">
                                    <span className="font-mono text-yellow-500 font-bold">{title.ano}</span>
                                    <span className="text-white">{title.schoolName}</span>
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 border border-gray-700 max-w-2xl w-full">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-white">Current Enredo: {playerSchool.enredo.title}</h2>
                    <button onClick={() => setIsEnredoModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>Category: <span className="text-white font-bold">{playerSchool.enredo.category}</span></div>
                    <div>Trend: <span className={`${playerSchool.enredo.trend === 'Rising' ? 'text-green-400' : 'text-white'}`}>{playerSchool.enredo.trend}</span></div>
                    <div>Complexity: <span className="text-white">{playerSchool.enredo.complexity}</span></div>
                    <div>Difficulty: <span className="text-white">{playerSchool.enredo.difficulty}</span></div>
                    <div>Potential: <span className="text-yellow-400 font-bold">{playerSchool.enredo.potentialScore}</span></div>
                    <div>Controversy: <span className="text-red-400 font-bold">{playerSchool.enredo.controversy}</span></div>
                    <div>Appeal: <span className="text-green-400 font-bold">{playerSchool.enredo.appeal}</span></div>
                    <div className="col-span-2 mt-2 pt-2 border-t border-gray-700">
                        <span className="text-gray-500">History/Description:</span>
                        <p className="text-xs italic text-gray-400 mt-1">
                            This theme explores the depths of {playerSchool.enredo.category} culture...
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={() => setIsEnredoModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded">Close</button>
                </div>
            </div>
        </div>
      )}

      {/* Roster Modal */}
      {isRosterOpen && playerSchool && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
                <div className="p-4 border-b flex justify-between items-center rounded-t-lg bg-gray-900">
                        <h2 className="text-xl font-bold text-white">My Roster</h2>
                        <button onClick={() => setIsRosterOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="p-4 overflow-auto">
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
