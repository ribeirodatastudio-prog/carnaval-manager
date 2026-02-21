
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useGameStore } from '../../store/gameStore';
import { School, Division } from '../../types/models';

export default function DevToolsPage() {
  const { schools: initialSchools, simulationResults, runPrestigeSimulation } = useGameStore();
  const [isSimulating, setIsSimulating] = useState(false);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    // Use setTimeout to allow UI to update before blocking with heavy calculation
    setTimeout(() => {
        runPrestigeSimulation(1000);
        setIsSimulating(false);
    }, 100);
  };

  if (!simulationResults) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
        <Link href="/" className="text-yellow-500 hover:text-yellow-400 mb-6 block font-medium">← Back to Dashboard</Link>
        <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600">Simulation Dev Tools</h1>

        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 max-w-2xl">
          <p className="mb-6 text-gray-300 text-lg">
            Run a 1000-year simulation to test the prestige system stability, promotion/relegation mechanics, and history evolution.
            <br/><br/>
            <span className="text-sm text-gray-500">Note: This runs purely mathematically in the browser and may take a few seconds.</span>
          </p>
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transition-all shadow-lg shadow-blue-900/50"
          >
            {isSimulating ? (
                <>
                    <span className="animate-spin text-xl">⚙️</span> Simulating 1000 Years...
                </>
            ) : (
                <>
                    <span className="text-xl">🚀</span> Run 1000 Season Simulation
                </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Process Results
  const { finalSchools, prestigeEvolution } = simulationResults;

  // Sort by final prestige
  const sortedByPrestige = [...finalSchools].sort((a, b) => b.prestige - a.prestige);
  const top10 = sortedByPrestige.slice(0, 10);

  // Group by Division
  const divisions: Division[] = ['Grupo Especial', 'Série Ouro', 'Série Prata', 'Série Bronze', 'Grupo de Avaliação'];
  const schoolsByDiv: Record<Division, School[]> = {
    'Grupo Especial': [],
    'Série Ouro': [],
    'Série Prata': [],
    'Série Bronze': [],
    'Grupo de Avaliação': []
  };

  finalSchools.forEach(s => {
    if (schoolsByDiv[s.currentDivision]) {
      schoolsByDiv[s.currentDivision].push(s);
    }
  });

  // Sort each division by Prestige
  Object.keys(schoolsByDiv).forEach(key => {
    const div = key as Division;
    schoolsByDiv[div].sort((a, b) => b.prestige - a.prestige);
  });

  // Calculate Risers/Fallers
  const deltas = finalSchools.map(final => {
    const initial = initialSchools.find(s => s.id === final.id);
    const startPrestige = initial ? initial.prestige : 0;
    return {
      ...final,
      startPrestige,
      delta: final.prestige - startPrestige
    };
  });

  const risers = [...deltas].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const fallers = [...deltas].sort((a, b) => a.delta - b.delta).slice(0, 5);

  // Sample years for evolution table (every 100 years + last)
  const sampleYears = [2026, 2126, 2226, 2326, 2426, 2526, 2626, 2726, 2826, 2926, 3025];
  const top5Schools = top10.slice(0, 5);

  const getPrestigeAtYear = (schoolId: string, year: number) => {
    const history = prestigeEvolution[schoolId];
    const entry = history.find(h => h.year === year);
    return entry ? entry.prestige : '-';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
             <div>
                <Link href="/" className="text-yellow-500 hover:text-yellow-400 mb-2 block font-medium">← Back to Dashboard</Link>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                    Simulation Results (1000 Years)
                </h1>
             </div>
             <button
                onClick={handleRunSimulation}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 px-4 py-2 rounded text-sm"
             >
                Rerun
             </button>
        </div>

        {/* Top 10 Table */}
        <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <h2 className="bg-gray-750 p-4 font-bold text-xl border-b border-gray-700 flex items-center gap-2">
                🏆 Top 10 Prestige (Global)
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="p-4">Rank</th>
                            <th className="p-4">School</th>
                            <th className="p-4">Division</th>
                            <th className="p-4 text-right">Prestige</th>
                            <th className="p-4 text-right">Change</th>
                            <th className="p-4 text-right">Titles (All)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {top10.map((school, i) => {
                            const initial = initialSchools.find(s => s.id === school.id);
                            const delta = school.prestige - (initial?.prestige || 0);
                            return (
                                <tr key={school.id} className="hover:bg-gray-700/50">
                                    <td className="p-4 font-mono text-gray-500">#{i + 1}</td>
                                    <td className="p-4 font-bold text-white" style={{color: school.colors[0]}}>{school.name}</td>
                                    <td className="p-4 text-sm text-gray-300">{school.currentDivision}</td>
                                    <td className="p-4 text-right font-bold text-yellow-400">{school.prestige}</td>
                                    <td className={`p-4 text-right font-medium ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {delta > 0 ? '+' : ''}{delta}
                                    </td>
                                    <td className="p-4 text-right">{school.history.totalTitles}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>

        {/* Division Standings */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-200 border-b border-gray-700 pb-2">Division Standings (Top 5 & Bottom 3)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {divisions.map((div) => {
                    const schools = schoolsByDiv[div];
                    const top5 = schools.slice(0, 5);
                    const bottom3 = schools.length > 5 ? schools.slice(-3) : [];

                    return (
                        <div key={div} className="bg-gray-800 rounded-xl shadow border border-gray-700 overflow-hidden flex flex-col">
                            <h3 className="bg-gray-750 p-3 font-bold text-lg border-b border-gray-700 text-center text-blue-300">
                                {div}
                            </h3>
                            <div className="p-3 flex-1">
                                <h4 className="text-xs uppercase text-gray-500 font-bold mb-2">Leaders</h4>
                                <ul className="space-y-2 mb-4">
                                    {top5.map((s, idx) => (
                                        <li key={s.id} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 w-6">#{idx + 1}</span>
                                            <span className="font-bold flex-1 truncate mr-2" style={{color: s.colors[0]}}>{s.name}</span>
                                            <span className="text-yellow-500 font-mono">{s.prestige}</span>
                                        </li>
                                    ))}
                                    {schools.length === 0 && <li className="text-gray-500 italic text-sm">No schools</li>}
                                </ul>

                                {bottom3.length > 0 && (
                                    <>
                                        <h4 className="text-xs uppercase text-gray-500 font-bold mb-2 border-t border-gray-700 pt-2">Relegation Zone</h4>
                                        <ul className="space-y-2">
                                            {bottom3.map((s, idx) => (
                                                <li key={s.id} className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-400 w-6">#{schools.length - 2 + idx}</span>
                                                    <span className="font-medium flex-1 truncate mr-2 text-gray-300">{s.name}</span>
                                                    <span className="text-red-400 font-mono">{s.prestige}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                            <div className="bg-gray-900/30 p-2 text-center text-xs text-gray-500">
                                Total Schools: {schools.length}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Risers */}
            <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                <h3 className="font-bold text-lg mb-4 text-green-400">📈 Biggest Risers</h3>
                <ul className="space-y-3">
                    {risers.map(s => (
                        <li key={s.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded">
                            <span className="font-medium">{s.name}</span>
                            <div className="text-right">
                                <span className="block font-bold text-green-400">+{s.delta}</span>
                                <span className="text-xs text-gray-500">{s.startPrestige} ➔ {s.prestige}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Fallers */}
            <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                <h3 className="font-bold text-lg mb-4 text-red-400">📉 Biggest Fallers</h3>
                <ul className="space-y-3">
                    {fallers.map(s => (
                        <li key={s.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded">
                            <span className="font-medium">{s.name}</span>
                            <div className="text-right">
                                <span className="block font-bold text-red-400">{s.delta}</span>
                                <span className="text-xs text-gray-500">{s.startPrestige} ➔ {s.prestige}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        </div>

        {/* Evolution Table */}
        <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <h2 className="bg-gray-750 p-4 font-bold text-xl border-b border-gray-700">
                ⏳ Prestige Evolution (Top 5 Global)
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-center text-sm">
                    <thead className="bg-gray-900/50 text-gray-400 uppercase">
                        <tr>
                            <th className="p-3 text-left">School</th>
                            {sampleYears.map(year => <th key={year} className="p-3">{year}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {top5Schools.map(school => (
                            <tr key={school.id} className="hover:bg-gray-700/50">
                                <td className="p-3 text-left font-bold">{school.name}</td>
                                {sampleYears.map(year => (
                                    <td key={year} className="p-3 font-mono text-gray-300">
                                        {getPrestigeAtYear(school.id, year)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
      </div>
    </div>
  );
}
