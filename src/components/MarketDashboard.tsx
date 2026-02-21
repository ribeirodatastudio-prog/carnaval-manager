
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useGameStore } from '../store/gameStore';
import { StaffRole, StaffMember } from '../types/models';
import { calculateAdjustedSalary } from '../store/gameStore';
import { formatMoney, formatRole } from '../utils/textUtils';
import { getKeySkills } from '../utils/helpers';
import RosterList from './RosterList';

export default function MarketDashboard() {
  const { gameState, schools, availableStaff, makeHiringOffer } = useGameStore();
  const { playerSchoolId } = gameState;
  const [filterRole, setFilterRole] = useState<StaffRole | 'All'>('All');
  const [message, setMessage] = useState<string | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hoveredPartnerId, setHoveredPartnerId] = useState<string | null>(null);

  const playerSchool = schools.find(s => s.id === playerSchoolId);

  const handleHire = (staffId: string, offeredSalary: number) => {
    if (!playerSchoolId) {
      setMessage("You must select a school first.");
      return;
    }
    const result = makeHiringOffer(playerSchoolId, staffId, offeredSalary);
    setMessage(result);
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredStaff = availableStaff.filter(staff => filterRole === 'All' || staff.role === filterRole);
  const uniqueRoles = Array.from(new Set(availableStaff.map(s => s.role)));

  const findPartner = (partnerId: string): StaffMember | null => {
    const inMarket = availableStaff.find(s => s.id === partnerId);
    if (inMarket) return inMarket;
    for (const school of schools) {
      const inSchool = school.staff.find(s => s.id === partnerId);
      if (inSchool) return inSchool;
    }
    return null;
  };

  // Calculate Recent Champions (Special Group)
  const recentChampions = schools
    .flatMap(s => s.history.titulos.map(t => ({ ...t, schoolName: s.name, schoolColors: s.colors })))
    .filter(t => t.divisao === 'Grupo Especial')
    .sort((a, b) => b.ano - a.ano)
    .slice(0, 5);

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

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 relative">
      {/* Top Bar / Header */}
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center z-20 relative">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-yellow-500">Carnival Manager</h1>
            <div className="text-sm text-gray-400">
                Year {gameState.currentYear} | Phase: <span className="text-white font-semibold">{gameState.currentPhase}</span>
            </div>
          </div>

          <Link href="/devtools" className="text-xs bg-gray-900 border border-gray-700 px-2 py-1 rounded text-gray-500 hover:text-white hover:border-blue-500 transition-colors">
            🔧 DevTools
          </Link>
        </div>

        <div className="flex items-center gap-4">
            {playerSchool && (
              <div className="flex gap-2">
                 <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="bg-purple-900 hover:bg-purple-800 px-3 py-1 rounded text-sm text-white border border-purple-700"
                 >
                    🏆 History
                 </button>
                 <button
                    onClick={() => setIsRosterOpen(true)}
                    className="bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded text-sm text-white"
                 >
                    My Roster
                 </button>
                 <Link
                    href="/roster"
                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm text-white flex items-center"
                 >
                    Full Details
                 </Link>
              </div>
            )}

            {playerSchool ? (
              <div className="bg-gray-700 px-4 py-2 rounded-lg border border-gray-600 text-right min-w-[150px]">
                <div className="text-xs text-gray-400">Budget</div>
                <div className="text-xl font-mono text-green-400">{formatMoney(playerSchool.budget)}</div>
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

        {/* Recent Champions Widget */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center gap-4 overflow-x-auto">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider whitespace-nowrap">Recent Champions (Special Group):</span>
            <div className="flex gap-4">
                {recentChampions.map((champ, idx) => (
                    <div key={`${champ.ano}-${champ.schoolName}`} className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded border border-gray-700">
                        <span className="text-yellow-500 font-bold text-sm">{champ.ano}</span>
                        <span className="text-sm text-gray-300 whitespace-nowrap">{champ.schoolName}</span>
                    </div>
                ))}
                {recentChampions.length === 0 && <span className="text-gray-600 text-sm">No history yet.</span>}
            </div>
        </div>

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
                <th className="p-4 font-semibold border-b border-gray-700 w-1/3">Key Attributes (1-20)</th>
                <th className="p-4 font-semibold border-b border-gray-700">Estimated Cost</th>
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
                  // Calculate dynamic salary based on player's school prestige
                  const prestige = playerSchool ? playerSchool.prestige : 100; // Default to 100 if no school selected
                  const adjustedSalary = calculateAdjustedSalary(staff, prestige);
                  const isRainha = staff.role === 'RainhaDeBateria';

                  return (
                    <tr key={staff.id} className="hover:bg-gray-700/50 transition-colors group">
                      <td className="p-4 font-medium text-white relative min-w-[200px]">
                        <div className="flex items-center">
                            {staff.name}
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
                      <td className="p-4 text-gray-300">{formatRole(staff.role)}</td>
                      <td className="p-4 text-center">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${staff.reputation >= 180 ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>
                            {staff.reputation}
                         </span>
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
                          onClick={() => handleHire(staff.id, adjustedSalary)}
                          className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={
                              !playerSchool ||
                              (staff.role !== 'RainhaDeBateria' && playerSchool.budget < adjustedSalary) ||
                              (staff.archetype === 'Celebridade' && playerSchool.prestige < 180)
                          }
                          title={staff.archetype === 'Celebridade' && playerSchool && playerSchool.prestige < 180 ? "Requires Historical Prestige (180+)" : "Hire Staff"}
                        >
                          Hire
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

      {/* Roster Modal */}
      {isRosterOpen && playerSchool && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg">
                    <h2 className="text-xl font-bold text-white">Current Roster: <span className="text-yellow-500">{playerSchool.name}</span></h2>
                    <button
                        onClick={() => setIsRosterOpen(false)}
                        className="text-gray-400 hover:text-white"
                    >
                        ✕ Close
                    </button>
                </div>
                <div className="p-4 overflow-auto flex-1">
                    <RosterList staff={playerSchool.staff} />
                </div>
            </div>
        </div>
      )}

      {/* History Modal (League Wide) */}
      {isHistoryOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
             <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-700">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg">
                    <h2 className="text-xl font-bold text-yellow-500">League History</h2>
                    <button
                        onClick={() => setIsHistoryOpen(false)}
                        className="text-gray-400 hover:text-white"
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
    </div>
  );
}
