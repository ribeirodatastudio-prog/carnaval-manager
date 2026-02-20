
"use client";

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { StaffRole, StaffMember, StaffSkills } from '../types/models';

const SKILL_DISPLAY_DIVISOR = 10;

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
};

const getKeySkills = (role: StaffRole, skills: StaffSkills): { name: string; value: number }[] => {
  const allSkills = {
    'Plástica': skills.plastica,
    'Rítmica': skills.ritmica,
    'Expressão': skills.expressaoCorporal,
    'Liderança': skills.lideranca,
    'Criatividade': skills.criatividade,
    'Resiliência': skills.resiliencia,
    'Logística': skills.logistica,
    'Gestão': skills.gestaoDeRecursos,
    'Fama': skills.fama,
  };

  const selectSkills = (keys: (keyof typeof allSkills)[]) => keys.map(k => ({ name: k, value: Math.ceil(allSkills[k] / SKILL_DISPLAY_DIVISOR) }));

  switch (role) {
    case 'Carnavalesco':
      return selectSkills(['Criatividade', 'Plástica', 'Resiliência']);
    case 'MestreDeBateria':
      return selectSkills(['Rítmica', 'Liderança']);
    case 'Interprete':
      return selectSkills(['Rítmica', 'Expressão', 'Fama']);
    case 'MestreSala':
    case 'PortaBandeira':
      return selectSkills(['Expressão', 'Plástica', 'Rítmica']);
    case 'RainhaDeBateria':
      return selectSkills(['Fama', 'Expressão']);
    case 'Coreografo':
      return selectSkills(['Expressão', 'Criatividade']);
    case 'DiretorDeCarnaval':
      return selectSkills(['Gestão', 'Liderança', 'Logística']);
    case 'DiretorDeHarmonia':
      return selectSkills(['Liderança', 'Rítmica']);
    case 'MestreDeBarracao':
      return selectSkills(['Logística', 'Gestão']);
    default:
      return selectSkills(['Liderança']);
  }
};

export default function MarketDashboard() {
  const { gameState, schools, availableStaff, makeHiringOffer } = useGameStore();
  const { playerSchoolId } = gameState;
  const [filterRole, setFilterRole] = useState<StaffRole | 'All'>('All');
  const [message, setMessage] = useState<string | null>(null);

  const playerSchool = schools.find(s => s.id === playerSchoolId);

  const handleHire = (staffId: string, salaryExpectation: number) => {
    if (!playerSchoolId) {
      setMessage("You must select a school first.");
      return;
    }
    const result = makeHiringOffer(playerSchoolId, staffId, salaryExpectation);
    setMessage(result);
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredStaff = availableStaff.filter(staff => filterRole === 'All' || staff.role === filterRole);

  const uniqueRoles = Array.from(new Set(availableStaff.map(s => s.role)));

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Top Bar / Header */}
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Carnival Manager</h1>
          <div className="text-sm text-gray-400">
            Year {gameState.currentYear} | Week {gameState.currentWeek} | Phase: <span className="text-white font-semibold">{gameState.currentPhase}</span>
          </div>
        </div>

        {playerSchool ? (
          <div className="bg-gray-700 px-4 py-2 rounded-lg border border-gray-600">
             <div className="text-xs text-gray-400">School Budget</div>
             <div className="text-xl font-mono text-green-400">{formatMoney(playerSchool.budget)}</div>
             <div className="text-xs text-gray-400 mt-1">{playerSchool.name}</div>
          </div>
        ) : (
          <div className="bg-red-900/50 px-4 py-2 rounded-lg border border-red-700 text-red-200">
            No School Selected
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col p-6 gap-6">

        {/* Filters and Actions */}
        <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg shadow-sm">
           <div className="flex items-center gap-4">
             <span className="text-gray-400 font-medium">Filter by Role:</span>
             <select
               className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 focus:outline-none focus:border-yellow-500"
               value={filterRole}
               onChange={(e) => setFilterRole(e.target.value as StaffRole | 'All')}
             >
               <option value="All">All Roles</option>
               {uniqueRoles.map(role => (
                 <option key={role} value={role}>{role}</option>
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
                <th className="p-4 font-semibold border-b border-gray-700 w-1/3">Key Attributes (1-20)</th>
                <th className="p-4 font-semibold border-b border-gray-700">Salary Expectation</th>
                <th className="p-4 font-semibold border-b border-gray-700 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No staff members found matching criteria.</td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 font-medium text-white">
                      {staff.name}
                      {staff.partnerId && <span className="ml-2 text-xs bg-pink-900 text-pink-200 px-1 rounded">Has Partner</span>}
                    </td>
                    <td className="p-4 text-gray-300">{staff.role}</td>
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
                      {formatMoney(staff.salaryExpectation)} / season
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleHire(staff.id, staff.salaryExpectation)}
                        className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!playerSchool || playerSchool.budget < staff.salaryExpectation}
                      >
                        Hire
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
