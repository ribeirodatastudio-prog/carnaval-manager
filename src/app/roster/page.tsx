
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../../store/gameStore';
import RosterList from '../../components/RosterList';
import { formatMoney } from '../../utils/textUtils';

export default function RosterPage() {
  const router = useRouter();
  const { gameState, schools } = useGameStore();
  const { playerSchoolId } = gameState;
  const playerSchool = schools.find((s) => s.id === playerSchoolId);

  useEffect(() => {
    if (!playerSchoolId) {
      router.push('/');
    }
  }, [playerSchoolId, router]);

  if (!playerSchool) {
    return <div className="bg-gray-900 h-screen text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-yellow-500 hover:text-yellow-400 font-bold flex items-center gap-2">
            ← Back to Market
          </Link>
          <h1 className="text-2xl font-bold text-white border-l border-gray-600 pl-4">
            Current Roster
          </h1>
        </div>

        <div className="bg-gray-700 px-4 py-2 rounded-lg border border-gray-600 text-right">
          <div className="text-xs text-gray-400">School Budget</div>
          <div className="text-xl font-mono text-green-400">{formatMoney(playerSchool.budget)}</div>
          <div className="text-xs text-gray-400 mt-1">{playerSchool.name}</div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6 container mx-auto max-w-6xl">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
                {playerSchool.name}
              </h2>
              <div className="text-gray-400 mt-1 flex gap-4 text-sm">
                <span>Prestige: <span className="text-white font-medium">{playerSchool.prestige}</span></span>
                <span>Fanbase Morale: <span className="text-pink-400 font-medium">{playerSchool.fanbaseMorale}</span></span>
                <span>History: <span className="text-yellow-200">{playerSchool.history.titles} Titles</span></span>
              </div>
            </div>

            <div className="text-right">
               <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-1">Total Salaries</div>
               <div className="text-2xl font-mono text-red-400">
                 {formatMoney(playerSchool.staff.reduce((acc, s) => acc + s.salary, 0))}
                 <span className="text-sm text-gray-500 ml-1">/ season</span>
               </div>
            </div>
          </div>

          <div className="p-0">
            <RosterList staff={playerSchool.staff} />
          </div>
        </div>
      </main>
    </div>
  );
}
