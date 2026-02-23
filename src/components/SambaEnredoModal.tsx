import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { SambaEnredo } from '../types/models';

export default function SambaEnredoModal() {
  const { gameState, chooseSamba, schools } = useGameStore();
  const { pendingSambaSelection, playerSchoolId } = gameState;
  const playerSchool = schools.find(s => s.id === playerSchoolId);

  if (!pendingSambaSelection || gameState.chosenSambaEnredo) return null;

  const getMelodiaOpinion = (val: number): { text: string; color: string } => {
    if (val >= 88) return { text: 'Melodia que vai ficar na cabeça da nação', color: '#2ECC71' };
    if (val >= 75) return { text: 'Melodia forte, difícil de esquecer', color: '#27AE60' };
    if (val >= 60) return { text: 'Melodia boa, agrada a maioria', color: '#F1C40F' };
    if (val >= 45) return { text: 'Melodia comum, sem grandes destaques', color: '#E67E22' };
    return { text: 'Melodia fraca, pode prejudicar o desfile', color: '#E74C3C' };
  };

  const getGritoOpinion = (val: number): { text: string; color: string } => {
    if (val >= 88) return { text: 'Explosivo — a Sapucaí vai tremer no grito', color: '#2ECC71' };
    if (val >= 75) return { text: 'Muito animado, levanta qualquer arquibancada', color: '#27AE60' };
    if (val >= 60) return { text: 'Animado, bom puxador na avenida', color: '#F1C40F' };
    if (val >= 45) return { text: 'Contido, não chega a empolgar muito', color: '#E67E22' };
    return { text: 'Sem impacto, torcida pode desanimar', color: '#E74C3C' };
  };

  const getApeloOpinion = (val: number): { text: string; color: string } => {
    if (val >= 88) return { text: 'A comunidade enlouqueceu — samba do povo', color: '#2ECC71' };
    if (val >= 75) return { text: 'Grande receptividade na quadra', color: '#27AE60' };
    if (val >= 60) return { text: 'Boa aceitação pela bateria e porta-bandeiras', color: '#F1C40F' };
    if (val >= 45) return { text: 'Recepção morna, alguns resistem', color: '#E67E22' };
    return { text: 'Indiferença — difícil de vestir na passarela', color: '#E74C3C' };
  };

  const getVeredictoGeral = (samba: SambaEnredo): { text: string; color: string } => {
    const avg = (samba.melodia + samba.grito + samba.apeloComunidade) / 3;
    if (avg >= 85) return { text: '🏆 Candidato forte ao título', color: '#C9A84C' };
    if (avg >= 70) return { text: '⭐ Samba competitivo', color: '#2ECC71' };
    if (avg >= 55) return { text: '🎵 Samba razoável', color: '#F1C40F' };
    return { text: '⚠️ Samba de risco', color: '#E74C3C' };
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md">
      <div className="bg-[#0F1629] rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-[#9B59B6] overflow-hidden">
        <div className="p-6 border-b border-[#9B59B640] bg-[#9B59B615] rounded-t-xl text-center">
          <h2 className="text-3xl font-black text-[#F0E6D3] uppercase tracking-wide mb-2">🎵 Escolha do Samba-Enredo — {playerSchool?.name}</h2>
          <p className="text-xl font-bold text-[#9B59B6]">Final da Disputa de Samba</p>
          {playerSchool?.enredo && (
            <div className="mt-4 inline-block bg-[#9B59B615] border border-[#9B59B630] rounded-xl px-6 py-3">
              <div className="text-[10px] text-[#9B59B6] font-bold uppercase tracking-widest mb-1">Enredo escolhido</div>
              <div className="text-base font-black text-[#F0E6D3]">{playerSchool.enredo.title}</div>
              <div className="text-xs text-[#8A9BB8] mt-0.5">{playerSchool.enredo.category}</div>
            </div>
          )}
          <p className="text-sm text-[#8A9BB8] mt-2 font-medium">Escolha o hino que levará sua escola à vitória na Avenida.</p>
        </div>

        <div className="p-6 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-[#080C18] flex-1 custom-scrollbar">
          {pendingSambaSelection.candidates.map(samba => {
            return (
              <div key={samba.id}
                className="bg-[#161E35] p-6 rounded-xl border border-[#1E2D50] flex flex-col relative overflow-hidden group hover:border-[#9B59B6] hover:shadow-2xl hover:shadow-[#9B59B620] transition-all duration-300"
              >
                {samba.isEncomendado && (
                    <div className="absolute top-0 right-0 bg-[#C9A84C] text-[#080C18] text-[9px] uppercase font-black px-3 py-1 rounded-bl-lg shadow-md">
                        Encomendado
                    </div>
                )}

                <h3 className="text-xl font-black text-[#F0E6D3] leading-tight mb-1">{samba.title}</h3>
                <div className="text-xs text-[#8A9BB8] mb-6 italic font-medium">
                    Parceria: {samba.compositors.join(", ")}
                </div>

                <div className="space-y-4 mb-6 flex-1">
                  {/* Melodia */}
                  <div className="bg-[#080C18] p-3 rounded-lg border border-[#1E2D50]">
                    <div className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-widest mb-1">Melodia</div>
                    <div className="text-sm font-bold leading-snug" style={{ color: getMelodiaOpinion(samba.melodia).color }}>
                      "{getMelodiaOpinion(samba.melodia).text}"
                    </div>
                  </div>
                  {/* O Grito */}
                  <div className="bg-[#080C18] p-3 rounded-lg border border-[#1E2D50]">
                    <div className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-widest mb-1">O Grito</div>
                    <div className="text-sm font-bold leading-snug" style={{ color: getGritoOpinion(samba.grito).color }}>
                      "{getGritoOpinion(samba.grito).text}"
                    </div>
                  </div>
                  {/* Apelo */}
                  <div className="bg-[#080C18] p-3 rounded-lg border border-[#1E2D50]">
                    <div className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-widest mb-1">Apelo da Comunidade</div>
                    <div className="text-sm font-bold leading-snug" style={{ color: getApeloOpinion(samba.apeloComunidade).color }}>
                      "{getApeloOpinion(samba.apeloComunidade).text}"
                    </div>
                  </div>
                  {/* Veredicto geral */}
                  <div className="text-center pt-2">
                    <span className="text-sm font-black" style={{ color: getVeredictoGeral(samba).color }}>
                      {getVeredictoGeral(samba).text}
                    </span>
                  </div>

                  {/* Scout Hint */}
                  <div className="mt-3 border-t border-[#1E2D5040] pt-3">
                    <div className="text-[9px] uppercase tracking-widest text-[#9B59B6] font-bold mb-1">
                      🎙️ Reação da Quadra
                    </div>
                    <p className="text-xs text-[#8A9BB8] italic leading-relaxed">
                      "{samba.scoutHint}"
                    </p>
                  </div>
                </div>

                <div className="bg-[#E74C3C15] p-3 rounded-lg text-center mb-6 border border-[#E74C3C30]">
                    <span className="text-[10px] text-[#E74C3C] font-bold uppercase tracking-wide">⚠️ Demais atributos ocultos até a escolha.</span>
                </div>

                <div className="mt-auto">
                    <button
                        onClick={() => chooseSamba(samba.id)}
                        className="w-full bg-[#2ECC71] hover:bg-[#27AE60] text-[#080C18] py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#2ECC7120] transform group-hover:scale-105 transition-all"
                    >
                        Escolher este Samba
                    </button>
                </div>
              </div>
            );
          })}

          {/* 4th option: Buy a ready-made samba */}
          {(() => {
            const COMPRA_CUSTOS: Record<string, number> = {
              'Grupo Especial': 500000,
              'Série Ouro': 100000,
              'Série Prata': 30000,
              'Série Bronze': 10000,
              'Grupo de Avaliação': 3000,
            };
            const custo = COMPRA_CUSTOS[playerSchool?.currentDivision || 'Grupo de Avaliação'] ?? 10000;
            const canAfford = (playerSchool?.budget ?? 0) >= custo;

            return (
              <div className="bg-[#1A1225] p-6 rounded-xl border border-[#C9A84C40] flex flex-col relative overflow-hidden group hover:border-[#C9A84C] hover:shadow-2xl hover:shadow-[#C9A84C15] transition-all duration-300">
                <div className="absolute top-0 right-0 bg-[#C9A84C] text-[#080C18] text-[9px] uppercase font-black px-3 py-1 rounded-bl-lg">
                  Premium
                </div>

                <div className="text-4xl mb-3 text-center">💰</div>
                <h3 className="text-xl font-black text-[#C9A84C] leading-tight mb-2 text-center">Comprar Samba Encomendado</h3>
                <p className="text-xs text-[#8A9BB8] text-center mb-4 leading-relaxed flex-1">
                  Contrate os melhores compositores do Brasil para criar um samba exclusivo, garantindo altíssima qualidade em todas as métricas.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="bg-[#080C18] p-3 rounded-lg border border-[#C9A84C20]">
                    <div className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-widest mb-1">Melodia</div>
                    <div className="text-sm font-bold text-[#2ECC71]">"Garantidamente acima da média"</div>
                  </div>
                  <div className="bg-[#080C18] p-3 rounded-lg border border-[#C9A84C20]">
                    <div className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-widest mb-1">Qualidade</div>
                    <div className="text-sm font-bold text-[#2ECC71]">"Composição profissional sob medida"</div>
                  </div>
                  <div className="bg-[#080C18] p-3 rounded-lg border border-[#C9A84C20]">
                    <div className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-widest mb-1">Risco</div>
                    <div className="text-sm font-bold text-[#F1C40F]">"Menos alma de quadra, mais técnica"</div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <div className="text-[10px] text-[#4A5A7A] uppercase tracking-widest mb-1">Custo</div>
                  <div className={`text-2xl font-black font-mono ${canAfford ? 'text-[#C9A84C]' : 'text-[#E74C3C]'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(custo)}
                  </div>
                  {!canAfford && <div className="text-[10px] text-[#E74C3C] mt-1">Orçamento insuficiente</div>}
                </div>

                <button
                  onClick={() => {
                    if (!canAfford) return;
                    chooseSamba('__comprado__'); // Special ID handled in gameStore
                  }}
                  disabled={!canAfford}
                  className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                    canAfford
                      ? 'bg-[#C9A84C] hover:bg-[#E8C96A] text-[#080C18] shadow-lg shadow-[#C9A84C20] group-hover:scale-105'
                      : 'bg-[#1E2D50] text-[#4A5A7A] cursor-not-allowed'
                  }`}
                >
                  {canAfford ? 'Comprar Samba' : 'Sem Orçamento'}
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
