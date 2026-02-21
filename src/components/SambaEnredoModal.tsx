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
      if (val >= 90) return 'bg-green-500';
      if (val >= 75) return 'bg-green-400';
      if (val >= 60) return 'bg-yellow-400';
      if (val >= 40) return 'bg-orange-400';
      return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-purple-500">
        <div className="p-6 border-b border-gray-700 bg-purple-900/20 rounded-t-lg text-center">
          <h2 className="text-3xl font-bold text-white mb-2">🎵 Escolha do Samba-Enredo — {playerSchool?.name}</h2>
          <p className="text-xl text-purple-300">Final da Disputa de Samba</p>
          <p className="text-sm text-gray-400 mt-2">Escolha o hino que levará sua escola à vitória na Avenida.</p>
        </div>

        <div className="p-6 overflow-auto grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-900/50 flex-1">
          {pendingSambaSelection.candidates.map(samba => {
            const notaQuadra = calculateNotaDaQuadra(samba);

            return (
              <div key={samba.id} className="bg-gray-900 p-6 rounded-lg border border-gray-700 flex flex-col relative overflow-hidden group hover:border-purple-500 transition-colors">
                {samba.isEncomendado && (
                    <div className="absolute top-0 right-0 bg-yellow-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl">
                        Encomendado
                    </div>
                )}

                <h3 className="text-xl font-bold text-white leading-tight mb-1">{samba.title}</h3>
                <div className="text-xs text-gray-500 mb-4 italic">
                    Parceria: {samba.compositors.join(", ")}
                </div>

                <div className="space-y-4 mb-6">
                    {/* Visible Stats */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">Melodia</span>
                            <span className="font-bold text-white">{samba.melodia}</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full ${getBarColor(samba.melodia)}`} style={{ width: `${samba.melodia}%` }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">O Grito (Explosão)</span>
                            <span className="font-bold text-white">{samba.grito}</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full ${getBarColor(samba.grito)}`} style={{ width: `${samba.grito}%` }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">Apelo da Comunidade</span>
                            <span className="font-bold text-white">{samba.apeloComunidade}</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full ${getBarColor(samba.apeloComunidade)}`} style={{ width: `${samba.apeloComunidade}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-black/30 p-3 rounded border border-white/5 mb-4 text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Nota da Quadra</div>
                    <div className="text-3xl font-bold text-yellow-400">{notaQuadra}</div>
                </div>

                <div className="bg-red-900/20 p-2 rounded text-center mb-6 border border-red-900/30">
                    <span className="text-xs text-red-300">⚠️ Demais atributos (Letra, Ritmo, Emoção...) serão revelados após a escolha.</span>
                </div>

                <div className="mt-auto">
                    <button
                        onClick={() => chooseSamba(samba.id)}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded font-bold text-lg shadow-lg transform group-hover:scale-105 transition-all"
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
