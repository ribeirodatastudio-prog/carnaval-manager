"use client";

import React from 'react';
import { useGameStore } from '../store/gameStore';
import { formatMoney } from '../utils/textUtils';

export default function DemissaoScreen() {
    const { gameState, schools, resetAfterBankruptcy } = useGameStore();
    const { firedFromSchoolId } = gameState;
    const school = schools.find(s => s.id === firedFromSchoolId);

    if (!school || !school.preparation) {
        return <div className="p-10 text-white">Carregando...</div>;
    }

    const prep = school.preparation;
    const weeksSurvived = prep.bankruptAtWeek || (45 - prep.weeksUntilParade);
    const bestTrack = Object.values(prep.tracks).reduce((max, t) => Math.max(max, t.progress), 0);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#080C18] text-[#F0E6D3] relative font-sans p-8 overflow-hidden">
             {/* Background flag watermark */}
            {school.flag && (
                <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `url(${school.flag})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'grayscale(100%)'
                }}
                />
            )}

            <div className="relative z-10 max-w-2xl w-full bg-[#0F1629] border-2 border-[#E74C3C] rounded-2xl p-10 shadow-2xl text-center">
                <div className="text-[#E74C3C] text-sm font-black uppercase tracking-widest mb-6 animate-pulse">
                    ⚠️ Gestão Interrompida
                </div>

                <h1 className="text-5xl font-black mb-2 text-[#F0E6D3]">
                    VOCÊ FOI DEMITIDO
                </h1>
                <h2 className="text-2xl font-bold mb-8 opacity-60" style={{ color: school.colors[0] }}>
                    {school.name}
                </h2>

                <p className="text-[#8A9BB8] mb-10 leading-relaxed text-lg">
                    A situação financeira da escola tornou-se insustentável. A diretoria decidiu afastar você do cargo para tentar salvar o que resta do carnaval.
                </p>

                <div className="grid grid-cols-3 gap-6 mb-10">
                    <div className="bg-[#161E35] p-4 rounded-xl border border-[#1E2D50]">
                        <div className="text-[10px] uppercase tracking-widest text-[#4A5A7A] font-bold mb-1">Semanas</div>
                        <div className="text-3xl font-black font-mono text-[#F0E6D3]">{weeksSurvived}</div>
                    </div>
                    <div className="bg-[#161E35] p-4 rounded-xl border border-[#1E2D50]">
                        <div className="text-[10px] uppercase tracking-widest text-[#4A5A7A] font-bold mb-1">Gasto Total</div>
                        <div className="text-2xl font-black font-mono text-[#E74C3C]">{formatMoney(prep.totalBudgetSpent)}</div>
                    </div>
                    <div className="bg-[#161E35] p-4 rounded-xl border border-[#1E2D50]">
                        <div className="text-[10px] uppercase tracking-widest text-[#4A5A7A] font-bold mb-1">Progresso</div>
                        <div className="text-3xl font-black font-mono text-[#C9A84C]">{Math.floor(bestTrack)}%</div>
                    </div>
                </div>

                <button
                    onClick={() => resetAfterBankruptcy()}
                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-95 shadow-xl"
                    style={{
                        background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
                        color: '#FFFFFF',
                        boxShadow: '0 10px 30px -10px rgba(231, 76, 60, 0.5)'
                    }}
                >
                    Começar de Novo
                </button>
                <p className="mt-4 text-xs text-[#4A5A7A] italic">
                    Você poderá escolher uma nova escola na mesma divisão.
                </p>
            </div>
        </div>
    );
}
