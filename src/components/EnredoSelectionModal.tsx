import React from 'react';
import { Enredo } from '../types/models';
import { formatMoney } from '../utils/textUtils';

interface EnredoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Enredo[];
  researchFocusId: string | null;
  onFocus: (id: string) => void;
  onLockIn: (id: string) => void;
  schoolBudget: number;
}

export default function EnredoSelectionModal({
  isOpen, onClose, candidates, researchFocusId, onFocus, onLockIn, schoolBudget
}: EnredoSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-700">
        <div className="p-4 border-b border-gray-700 bg-gray-900 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Select Enredo for 2026</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕ Close</button>
        </div>

        <div className="p-6 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map(enredo => {
            const isFocused = researchFocusId === enredo.id;
            const revealLevel = enredo.statsRevealed;

            // Helper to render stat or hidden
            const renderStat = (label: string, value: number | string, levelReq: number, colorClass = "text-white") => {
                if (revealLevel >= levelReq) {
                    return <span className={`font-bold ${colorClass}`}>{value}</span>;
                }
                return <span className="text-gray-600 font-mono">???</span>;
            };

            return (
              <div key={enredo.id} className={`bg-gray-900 p-4 rounded-lg border-2 flex flex-col gap-2 transition-all ${isFocused ? 'border-blue-500 shadow-blue-900/50 shadow-lg' : 'border-gray-700 hover:border-gray-600'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{enredo.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                        enredo.trend === 'Rising' ? 'bg-green-900 text-green-300' :
                        enredo.trend === 'Saturated' ? 'bg-red-900 text-red-300' :
                        'bg-gray-700 text-gray-300'
                    }`}>{enredo.trend}</span>
                </div>

                <h3 className="text-lg font-bold text-white leading-tight mb-2 h-12 overflow-hidden">{enredo.title}</h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-black/20 p-3 rounded">
                    {/* Visible Stats */}
                    <div className="flex justify-between">
                        <span className="text-gray-400">Appeal</span>
                        <span className={`font-bold ${enredo.appeal > 70 ? 'text-green-400' : 'text-gray-300'}`}>{enredo.appeal}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Controversy</span>
                        <span className={`font-bold ${enredo.controversy > 60 ? 'text-red-400' : 'text-gray-300'}`}>{enredo.controversy}</span>
                    </div>
                    <div className="flex justify-between col-span-2 border-b border-gray-700 pb-1 mb-1">
                        <span className="text-gray-400">Sponsor Value</span>
                        <span className="font-mono text-yellow-500">{enredo.sponsorValue > 0 ? formatMoney((enredo.sponsorValue / 100) * schoolBudget * 0.4) : '-'}</span>
                    </div>

                    {/* Hidden Stats */}
                    <div className="flex justify-between">
                        <span className="text-gray-400">Complexity</span>
                        {renderStat('Complexity', enredo.complexity, 1)}
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Difficulty</span>
                        {renderStat('Difficulty', enredo.difficulty, 2)}
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Potential</span>
                        {renderStat('Potential', enredo.potentialScore, 3, "text-yellow-400")}
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Risk</span>
                        {renderStat('Risk', `${enredo.hiddenRisk || 0}%`, 4, "text-red-400")}
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Bonus</span>
                        {renderStat('Bonus', `${enredo.hiddenBonus || 0}%`, 5, "text-green-400")}
                    </div>
                </div>

                <div className="mt-auto pt-4 flex gap-2">
                    <button
                        onClick={() => onFocus(enredo.id)}
                        disabled={isFocused || revealLevel >= 5}
                        className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${
                            isFocused ? 'bg-blue-900/50 text-blue-300 cursor-default border border-blue-700' :
                            revealLevel >= 5 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' :
                            'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    >
                        {isFocused ? 'Researching...' : revealLevel >= 5 ? 'Fully Researched' : 'Research'}
                    </button>
                    <button
                        onClick={() => onLockIn(enredo.id)}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded text-sm font-bold shadow-lg"
                    >
                        Select
                    </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-lg text-sm text-gray-400 flex justify-between">
            <span>Research one candidate per week to reveal stats.</span>
            <span>Deadline: Week 6</span>
        </div>
      </div>
    </div>
  );
}
