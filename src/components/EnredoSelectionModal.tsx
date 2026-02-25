import React from 'react';
import { Enredo } from '../types/models';
import { formatMoney } from '../utils/textUtils';
import { formatEnredoPotential } from '../utils/helpers';

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
      <div className="bg-[#0F1629] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-[#1E2D50]">
        <div className="p-5 border-b border-[#1E2D50] bg-[#080C18] rounded-t-xl flex justify-between items-center">
          <h2 className="text-xl font-black text-[#F0E6D3] uppercase tracking-wide">Pesquisa de Enredo 2026</h2>
          <button onClick={onClose} className="text-[#8A9BB8] hover:text-[#F0E6D3] text-xs font-bold uppercase tracking-widest transition-colors">✕ Fechar</button>
        </div>

        <div className="p-6 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar">
          {candidates.map(enredo => {
            const isFocused = researchFocusId === enredo.id;
            const revealLevel = enredo.statsRevealed;

            // Helper to render stat or hidden
            const renderStat = (label: string, value: number | string, levelReq: number, colorClass = "text-[#F0E6D3]") => {
                if (revealLevel >= levelReq) {
                    return <span className={`font-black font-mono ${colorClass}`}>{value}</span>;
                }
                return <span className="text-[#4A5A7A] font-mono tracking-widest">???</span>;
            };

            return (
              <div key={enredo.id}
                className={`bg-[#161E35] p-5 rounded-xl border-2 flex flex-col gap-3 transition-all duration-300 ${
                    isFocused
                    ? 'border-[#C9A84C] shadow-lg shadow-[#C9A84C20] translate-y-[-2px]'
                    : 'border-[#1E2D50] hover:border-[#2A3F6B] hover:translate-y-[-2px] hover:shadow-xl'
                }`}
              >
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A9BB8]">{enredo.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        enredo.trend === 'Rising' ? 'bg-[#2ECC7115] text-[#2ECC71] border border-[#2ECC7130]' :
                        enredo.trend === 'Saturated' ? 'bg-[#E74C3C15] text-[#E74C3C] border border-[#E74C3C30]' :
                        'bg-[#1E2D50] text-[#8A9BB8] border border-[#2A3F6B]'
                    }`}>{enredo.trend}</span>
                </div>

                <h3 className="text-xl font-black text-[#F0E6D3] leading-tight h-14 overflow-hidden flex items-center">{enredo.title}</h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs bg-[#080C18] p-4 rounded-lg border border-[#1E2D50]">
                    {/* Visible Stats */}
                    <div className="flex justify-between items-center">
                        <span className="text-[#8A9BB8] font-bold uppercase tracking-wider text-[10px]">Apelo</span>
                        <span className={`font-black font-mono ${enredo.appeal > 70 ? 'text-[#2ECC71]' : 'text-[#F0E6D3]'}`}>{enredo.appeal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[#8A9BB8] font-bold uppercase tracking-wider text-[10px]">Polêmica</span>
                        <span className={`font-black font-mono ${enredo.controversy > 60 ? 'text-[#E74C3C]' : 'text-[#F0E6D3]'}`}>{enredo.controversy}</span>
                    </div>
                    <div className="flex justify-between items-center col-span-2 border-b border-[#1E2D50] pb-2 mb-1">
                        <span
                            className="text-[#8A9BB8] font-bold uppercase tracking-wider text-[10px] cursor-help"
                            title="Renda de patrocinadores atraídos por este enredo. Depositada no seu orçamento ao iniciar a preparação (Semana 9)."
                        >
                            💰 Renda de Patrocínio ⓘ
                        </span>
                        <span className={`font-mono font-bold ${enredo.sponsorValue > 0 ? 'text-[#2ECC71]' : 'text-[#4A5A7A]'}`}>
                            {enredo.sponsorValue > 0
                                ? `+${formatMoney((enredo.sponsorValue / 100) * schoolBudget * 0.4)}`
                                : 'Nenhum'
                            }
                        </span>
                    </div>

                    {/* Hidden Stats */}
                    <div className="flex justify-between items-center">
                        <span className="text-[#8A9BB8] font-bold uppercase tracking-wider text-[10px]">Complex.</span>
                        {renderStat('Complexity', enredo.complexity, 1)}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[#8A9BB8] font-bold uppercase tracking-wider text-[10px]">Dificul.</span>
                        {renderStat('Difficulty', enredo.difficulty, 2)}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[#8A9BB8] font-bold uppercase tracking-wider text-[10px]">Potencial</span>
                        {(() => {
                            if (revealLevel >= 3) {
                                const { label, color } = formatEnredoPotential(enredo.potentialScore);
                                return <span className="font-bold font-mono text-[9px]" style={{ color }}>{label}</span>;
                            }
                            return <span className="text-[#4A5A7A] font-mono tracking-widest">???</span>;
                        })()}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[#8A9BB8] font-bold uppercase tracking-wider text-[10px]">Risco</span>
                        {renderStat('Risk', `${enredo.hiddenRisk || 0}%`, 4, "text-[#E74C3C]")}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[#8A9BB8] font-bold uppercase tracking-wider text-[10px]">Bônus</span>
                        {renderStat('Bonus', `${enredo.hiddenBonus || 0}%`, 5, "text-[#2ECC71]")}
                    </div>
                </div>

                <div className="mt-auto pt-4 flex gap-3">
                    <button
                        onClick={() => onFocus(enredo.id)}
                        disabled={isFocused || revealLevel >= 5}
                        className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-colors border ${
                            isFocused
                            ? 'bg-[#3D1F7A]/30 text-[#9B6FE4] border-[#7B4FD4]/50 cursor-default'
                            : revealLevel >= 5
                            ? 'bg-[#1E2D50] text-[#4A5A7A] border-transparent cursor-not-allowed'
                            : 'bg-transparent hover:bg-[#1E2D50] text-[#F0E6D3] border-[#2A3F6B]'
                        }`}
                    >
                        {isFocused ? 'Pesquisando...' : revealLevel >= 5 ? 'Completo' : 'Pesquisar'}
                    </button>
                    <button
                        onClick={() => onLockIn(enredo.id)}
                        className="flex-1 bg-[#C9A84C] hover:bg-[#E8C96A] text-[#080C18] py-3 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-[#C9A84C20] transition-transform active:scale-95"
                    >
                        Escolher
                    </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-[#1E2D50] bg-[#080C18] rounded-b-xl text-xs text-[#8A9BB8] flex justify-between font-medium">
            <span>ℹ️ Pesquise um candidato por semana para revelar atributos ocultos.</span>
            <span className="text-[#E67E22] font-bold uppercase tracking-wider">Prazo: Semana 6</span>
        </div>
      </div>
    </div>
  );
}
