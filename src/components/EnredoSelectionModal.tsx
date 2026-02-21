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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ background: '#0F1629', border: '1px solid #1E2D50' }}
      >
        <div
          className="p-5 border-b flex justify-between items-center"
          style={{ background: '#161E35', borderColor: '#1E2D50' }}
        >
          <h2 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide">
            <span className="text-[#C9A84C]">Pesquisa</span> de Enredo 2026
          </h2>
          <button onClick={onClose} className="text-[#8A9BB8] hover:text-[#F0E6D3] transition-colors text-sm font-bold uppercase tracking-wider">
            ✕ Fechar
          </button>
        </div>

        <div className="p-6 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-[#080C18]">
          {candidates.map(enredo => {
            const isFocused = researchFocusId === enredo.id;
            const revealLevel = enredo.statsRevealed;

            // Helper to render stat or hidden
            const renderStat = (label: string, value: number | string, levelReq: number, colorClass = "text-[#F0E6D3]") => {
                if (revealLevel >= levelReq) {
                    return <span className={`font-black font-mono ${colorClass}`}>{value}</span>;
                }
                return <span className="text-[#4A5A7A] font-mono tracking-widest text-xs">???</span>;
            };

            return (
              <div
                key={enredo.id}
                className="rounded-xl overflow-hidden flex flex-col gap-3 p-4 transition-all duration-300 hover:-translate-y-1"
                style={{
                    background: '#0F1629',
                    border: isFocused ? '1px solid #C9A84C' : '1px solid #1E2D50',
                    boxShadow: isFocused ? '0 0 24px #C9A84C20' : 'none'
                }}
              >
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A9BB8] border border-[#1E2D50] px-2 py-0.5 rounded-full">{enredo.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${
                        enredo.trend === 'Rising' ? 'bg-[#2ECC7115] text-[#2ECC71] border-[#2ECC7130]' :
                        enredo.trend === 'Saturated' ? 'bg-[#E74C3C15] text-[#E74C3C] border-[#E74C3C30]' :
                        'bg-[#1E2D50] text-[#8A9BB8] border-[#2A3F6B]'
                    }`}>{enredo.trend}</span>
                </div>

                <h3 className="text-lg font-black text-[#F0E6D3] leading-tight mb-2 h-14 overflow-hidden" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {enredo.title}
                </h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-[#161E35] p-3 rounded-lg border border-[#1E2D50]">
                    {/* Visible Stats */}
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8A9BB8] uppercase tracking-wider">Apelo</span>
                        <span className={`font-black font-mono ${enredo.appeal > 70 ? 'text-[#2ECC71]' : 'text-[#F0E6D3]'}`}>{enredo.appeal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8A9BB8] uppercase tracking-wider">Polêmica</span>
                        <span className={`font-black font-mono ${enredo.controversy > 60 ? 'text-[#E74C3C]' : 'text-[#F0E6D3]'}`}>{enredo.controversy}</span>
                    </div>
                    <div className="flex justify-between items-center col-span-2 border-b border-[#1E2D50] pb-2 mb-1">
                        <span className="text-[10px] text-[#8A9BB8] uppercase tracking-wider">Patrocínio</span>
                        <span className="font-black font-mono text-[#C9A84C]">{enredo.sponsorValue > 0 ? formatMoney((enredo.sponsorValue / 100) * schoolBudget * 0.4) : '-'}</span>
                    </div>

                    {/* Hidden Stats */}
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8A9BB8] uppercase tracking-wider">Complex.</span>
                        {renderStat('Complexity', enredo.complexity, 1)}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8A9BB8] uppercase tracking-wider">Dificuldade</span>
                        {renderStat('Difficulty', enredo.difficulty, 2)}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8A9BB8] uppercase tracking-wider">Potencial</span>
                        {renderStat('Potential', enredo.potentialScore, 3, "text-[#E8C96A]")}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8A9BB8] uppercase tracking-wider">Risco</span>
                        {renderStat('Risk', `${enredo.hiddenRisk || 0}%`, 4, "text-[#E74C3C]")}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8A9BB8] uppercase tracking-wider">Bônus</span>
                        {renderStat('Bonus', `${enredo.hiddenBonus || 0}%`, 5, "text-[#2ECC71]")}
                    </div>
                </div>

                <div className="mt-auto pt-4 flex gap-2">
                    <button
                        onClick={() => onFocus(enredo.id)}
                        disabled={isFocused || revealLevel >= 5}
                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 border ${
                            isFocused ? 'bg-[#1E2D50] text-[#C9A84C] border-[#C9A84C] cursor-default' :
                            revealLevel >= 5 ? 'bg-[#0F1629] text-[#4A5A7A] border-[#1E2D50] cursor-not-allowed' :
                            'bg-[#1E2D50] hover:bg-[#2A3F6B] text-[#F0E6D3] border-[#2A3F6B] hover:text-white'
                        }`}
                    >
                        {isFocused ? 'Pesquisando...' : revealLevel >= 5 ? 'Concluído' : 'Pesquisar'}
                    </button>
                    <button
                        onClick={() => onLockIn(enredo.id)}
                        className="flex-1 bg-[#C9A84C] hover:bg-[#E8C96A] text-[#080C18] py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-lg shadow-[#C9A84C20] transition-colors"
                    >
                        Escolher
                    </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#1E2D50] bg-[#161E35] flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#8A9BB8]">
            <span>Pesquise um enredo por semana para revelar estatísticas.</span>
            <span className="text-[#E74C3C]">Prazo: Semana 6</span>
        </div>
      </div>
    </div>
  );
}
