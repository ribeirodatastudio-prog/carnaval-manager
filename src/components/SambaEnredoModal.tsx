import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { SambaEnredo } from '../types/models';

export default function SambaEnredoModal() {
  const { gameState, chooseSamba, schools } = useGameStore();
  const { pendingSambaSelection, playerSchoolId } = gameState;
  const playerSchool = schools.find(s => s.id === playerSchoolId);

  if (!pendingSambaSelection || gameState.chosenSambaEnredo) return null;

  const calculateNotaDaQuadra = (samba: SambaEnredo) => {
    // Weights: Melodia (18), Grito (15), Apelo (8). Sum = 41.
    const wMelodia = 18;
    const wGrito = 15;
    const wApelo = 8;
    const totalWeight = wMelodia + wGrito + wApelo;

    const weightedSum = (samba.melodia * wMelodia) + (samba.grito * wGrito) + (samba.apeloComunidade * wApelo);
    return (weightedSum / totalWeight).toFixed(1);
  };

  const getBarColor = (val: number) => {
      if (val >= 90) return 'bg-[#2ECC71]';
      if (val >= 75) return 'bg-[#27AE60]';
      if (val >= 60) return 'bg-[#F1C40F]';
      if (val >= 40) return 'bg-[#E67E22]';
      return 'bg-[#E74C3C]';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md">
      <div className="bg-[#0F1629] rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-[#9B59B6] overflow-hidden">
        <div className="p-6 border-b border-[#9B59B640] bg-[#9B59B615] rounded-t-xl text-center">
          <h2 className="text-3xl font-black text-[#F0E6D3] uppercase tracking-wide mb-2">🎵 Escolha do Samba-Enredo — {playerSchool?.name}</h2>
          <p className="text-xl font-bold text-[#9B59B6]">Final da Disputa de Samba</p>
          <p className="text-sm text-[#8A9BB8] mt-2 font-medium">Escolha o hino que levará sua escola à vitória na Avenida.</p>
        </div>

        <div className="p-6 overflow-auto grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#080C18] flex-1 custom-scrollbar">
          {pendingSambaSelection.candidates.map(samba => {
            const notaQuadra = calculateNotaDaQuadra(samba);

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

                <div className="space-y-5 mb-8">
                    {/* Visible Stats */}
                    <div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                            <span className="text-[#8A9BB8]">Melodia</span>
                            <span className="text-[#F0E6D3]">{samba.melodia}</span>
                        </div>
                        <div className="h-1.5 bg-[#080C18] rounded-full overflow-hidden border border-[#1E2D50]">
                            <div className={`h-full ${getBarColor(samba.melodia)}`} style={{ width: `${samba.melodia}%` }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                            <span className="text-[#8A9BB8]">O Grito (Explosão)</span>
                            <span className="text-[#F0E6D3]">{samba.grito}</span>
                        </div>
                        <div className="h-1.5 bg-[#080C18] rounded-full overflow-hidden border border-[#1E2D50]">
                            <div className={`h-full ${getBarColor(samba.grito)}`} style={{ width: `${samba.grito}%` }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                            <span className="text-[#8A9BB8]">Apelo da Comunidade</span>
                            <span className="text-[#F0E6D3]">{samba.apeloComunidade}</span>
                        </div>
                        <div className="h-1.5 bg-[#080C18] rounded-full overflow-hidden border border-[#1E2D50]">
                            <div className={`h-full ${getBarColor(samba.apeloComunidade)}`} style={{ width: `${samba.apeloComunidade}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#080C18] p-4 rounded-xl border border-[#1E2D50] mb-6 text-center shadow-inner">
                    <div className="text-[10px] text-[#4A5A7A] font-bold uppercase tracking-widest mb-1">Nota da Quadra</div>
                    <div className="text-4xl font-black text-[#C9A84C] font-mono">{notaQuadra}</div>
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
        </div>
      </div>
    </div>
  );
}
