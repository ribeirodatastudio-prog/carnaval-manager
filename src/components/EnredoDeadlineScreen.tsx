import React from 'react';
import { Enredo } from '../types/models';
import { formatMoney } from '../utils/textUtils';
import { useGameStore } from '../store/gameStore';
import { formatEnredoPotential } from '../utils/helpers';

export default function EnredoDeadlineScreen() {
  const { gameState, schools, focusResearch, lockInEnredo } = useGameStore();
  const playerSchool = schools.find(s => s.id === gameState.playerSchoolId);

  if (!playerSchool || !playerSchool.enredoCandidates) return null;

  const candidates = playerSchool.enredoCandidates;
  const researchFocusId = playerSchool.researchFocusId;
  const schoolBudget = playerSchool.budget;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md">
      <div className="bg-[#0F1629] rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-[#E74C3C] overflow-hidden">
        <div className="p-6 border-b border-[#E74C3C40] bg-[#E74C3C15] rounded-t-xl text-center">
          <h2 className="text-3xl font-black text-[#F0E6D3] uppercase tracking-wide mb-2">O Mercado Fechou!</h2>
          <p className="text-xl font-bold text-[#E74C3C]">Hora de definir o seu Carnaval 2026.</p>
          <p className="text-sm text-[#8A9BB8] mt-2 font-medium">Você deve selecionar um enredo agora para avançar para a fase de Preparação.</p>
        </div>

        <div className="p-6 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-[#080C18] custom-scrollbar">
          {candidates.map(enredo => {
            const isFocused = researchFocusId === enredo.id;
            const revealLevel = enredo.statsRevealed;

            const renderStat = (label: string, value: number | string, levelReq: number, colorClass = "text-[#F0E6D3]") => {
                if (revealLevel >= levelReq) {
                    return <span className={`font-black font-mono ${colorClass}`}>{value}</span>;
                }
                return <span className="text-[#4A5A7A] font-mono tracking-widest">???</span>;
            };

            return (
              <div key={enredo.id}
                className={`bg-[#161E35] p-5 rounded-xl border-2 flex flex-col gap-3 transition-all ${
                    isFocused
                    ? 'border-[#C9A84C] shadow-lg shadow-[#C9A84C20]'
                    : 'border-[#1E2D50] hover:border-[#2A3F6B] hover:shadow-xl'
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
                        className="flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-widest bg-[#1E2D50] text-[#4A5A7A] cursor-not-allowed border border-transparent"
                        disabled
                    >
                        {revealLevel >= 5 ? 'Pesquisa Completa' : 'Pesquisa Encerrada'}
                    </button>
                    <button
                        onClick={() => lockInEnredo(enredo.id)}
                        className="flex-1 bg-[#2ECC71] hover:bg-[#27AE60] text-[#080C18] py-3 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-[#2ECC7120] transform hover:scale-105 transition-all"
                    >
                        Confirmar Enredo
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
