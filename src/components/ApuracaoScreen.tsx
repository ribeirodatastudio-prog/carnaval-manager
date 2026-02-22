"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { Quesito, SchoolApuracaoResult } from '../types/models';
import Badge from './Badge';

const QUESITO_LABELS: Record<Quesito, string> = {
    Bateria: 'Bateria',
    SambaEnredo: 'Samba-Enredo',
    Harmonia: 'Harmonia',
    Evolucao: 'Evolução',
    Enredo: 'Enredo',
    AlegoriasAderecos: 'Alegorias e Adereços',
    Fantasia: 'Fantasia',
    ComissaoDeFrente: 'Comissão de Frente',
    MestreSalaPortaBandeira: 'Mestre-Sala e Porta-Bandeira'
};

const QUESITO_ORDER: Quesito[] = [
    'Bateria', 'SambaEnredo', 'Harmonia', 'Evolucao', 'Enredo',
    'AlegoriasAderecos', 'Fantasia', 'ComissaoDeFrente', 'MestreSalaPortaBandeira'
];

type Speed = 'Normal' | 'Fast' | 'Instant';

export default function ApuracaoScreen() {
    const {
        gameState,
        schools,
        startApuracao,
        finalizeApuracao
    } = useGameStore();

    const { apuracaoResults } = gameState;

    // --- Local State for Animation ---
    const [currentQuesitoIdx, setCurrentQuesitoIdx] = useState(0);
    const [currentTenth, setCurrentTenth] = useState(90); // 9.0 to 10.0 (90-100)
    const [runningTotals, setRunningTotals] = useState<Record<string, number>>({});
    const [revealedScores, setRevealedScores] = useState<Set<string>>(new Set());
    const [isComplete, setIsComplete] = useState(false);
    const [speed, setSpeed] = useState<Speed>('Normal');
    const [isPlaying, setIsPlaying] = useState(false);

    // Derived state
    const currentQuesito = QUESITO_ORDER[currentQuesitoIdx];
    const playerSchoolId = gameState.playerSchoolId;

    // Initialize
    useEffect(() => {
        if (!apuracaoResults) {
            startApuracao();
        } else {
            // Initialize running totals
            const initial: Record<string, number> = {};
            apuracaoResults.forEach(r => initial[r.schoolId] = 0);
            setRunningTotals(initial);
        }
    }, [apuracaoResults, startApuracao]);

    // Timer Loop
    useEffect(() => {
        if (!isPlaying || isComplete || !apuracaoResults) return;

        const delay = speed === 'Instant' ? 10 : speed === 'Fast' ? 150 : 800;

        const timer = setTimeout(() => {
            // Reveal logic
            // Check if we have scores to reveal at this tenth
            // If so, reveal them and update running totals
            // Then move to next tenth/quesito

            // For Instant, we can just skip to end?
            if (speed === 'Instant') {
                finishInstant();
                return;
            }

            processStep();

        }, delay);

        return () => clearTimeout(timer);
    }, [isPlaying, isComplete, currentQuesitoIdx, currentTenth, speed, apuracaoResults]);

    const processStep = () => {
        if (!apuracaoResults) return;

        // Find scores matching current step
        const stepScore = currentTenth / 10; // e.g. 9.3

        // In the real logic, scores are revealed one by one if they match.
        // But our `total` for a quesito is a sum of 3 scores (max 30).
        // The prompt describes: "When a school gets a 9.4... [Score] - [School]".
        // But `total` is 29.8 etc.
        // Ah, the prompt says: "When a school gets a 9.4...".
        // This implies we read INDIVIDUAL judge scores?
        // Prompt: "3 scores survive and are summed... Max per quesito 30.0".
        // UI Layout shows "9.3 -- Escola X".
        // This usually refers to the TOTAL or the individual judge score?
        // Rio Carnaval reads individual judge scores. "Julgador 1: 9.8. Julgador 2: 10.0".
        // But our model simplifies to "Total".
        // Wait, `QuitoResult` has `total`.
        // If we display 9.0-10.0, we are revealing individual scores?
        // Or the AVERAGE?
        // The prompt says: "Scores are read... quesito by quesito... tenth by tenth... When a school gets a 9.4... All schools' Bateria scores are revealed".
        // This implies we are revealing the TOTAL for that quesito but scaled?
        // No, total is up to 30.
        // Maybe we just reveal the SUM?
        // "9.3 -- Escola X" -> 9.3 * 3 = 27.9?
        // Or maybe the prompt implies we reveal the AVERAGE (Total / 3)?
        // 30.0 / 3 = 10.0.
        // 29.8 / 3 = 9.93.
        // Let's assume we reveal the TOTAL sum (e.g. 29.8).
        // But the tenth-by-tenth drama (9.0 -> 10.0) only works for individual scores or averages.
        // Let's look at the UI Layout example:
        // "9.3 -- Escola X"
        // "9.5 -- Escola Y"
        // This looks like individual scores or average.
        // Given `QuitoResult.total` is used for ranking.
        // I will display the TOTAL (e.g. 29.5) but the loop will go from 27.0 to 30.0?
        // Or 9.0 to 10.0 and we simulate "reading the envelopes"?
        // Rio reads 4 envelopes (or 6).
        // Implementing full reading of 4 envelopes per school per quesito is long.
        // The prompt simplifies: "When a school gets a 9.4...".
        // This implies one score per school per quesito.
        // So I will assume we reveal the TOTAL for that quesito.
        // And the range is 27.0 to 30.0.
        // BUT the prompt says "tenth by tenth from 9.0 upward".
        // This strongly suggests we are revealing the score as if it were a single judge or average.
        // I will reveal the TOTAL, but divide by 3 for the "announced" number?
        // Or I just loop from 270 to 300 (tenths)?
        // Let's loop from 26.0 to 30.0 (covering 8.something avg).
        // The prompt "9.0 upward" is explicit.
        // I will use the TOTAL and loop from 27.0 to 30.0.
        // Start loop at 26.0 (just in case) to 30.0.

        // Wait, if I change the loop to be Total-based, I need to update state variables.
        // `currentTenth` 90 -> 100 becomes 270 -> 300.

        let nextTenth = currentTenth + 1;
        let nextQuesito = currentQuesitoIdx;

        // Find schools that scored EXACTLY currentTenth / 10 in this quesito (Total)
        // Comparison with precision
        const target = currentTenth / 10;

        const matchingSchools = apuracaoResults.filter(r => {
            const val = r.quesitos[currentQuesito].total;
            // Compare with epsilon
            return Math.abs(val - target) < 0.05;
        });

        // Update totals
        if (matchingSchools.length > 0) {
            const newTotals = { ...runningTotals };
            matchingSchools.forEach(s => {
                const val = s.quesitos[currentQuesito].total;
                newTotals[s.schoolId] = (newTotals[s.schoolId] || 0) + val;
                setRevealedScores(prev => new Set(prev).add(`${s.schoolId}-${currentQuesito}`));
            });
            setRunningTotals(newTotals);
        }

        // Advance
        if (nextTenth > 300) { // Max 30.0
            nextTenth = 260; // Reset to 26.0 for next quesito
            nextQuesito++;
        }

        if (nextQuesito >= QUESITO_ORDER.length) {
            setIsComplete(true);
            setIsPlaying(false);
            // Ensure final totals match exactly (floating point drift safety)
            const finals: Record<string, number> = {};
            apuracaoResults.forEach(r => finals[r.schoolId] = r.finalTotal);
            setRunningTotals(finals);
        } else {
            setCurrentTenth(nextTenth);
            setCurrentQuesitoIdx(nextQuesito);
        }
    };

    const finishInstant = () => {
        if (!apuracaoResults) return;
        const finals: Record<string, number> = {};
        apuracaoResults.forEach(r => finals[r.schoolId] = r.finalTotal);
        setRunningTotals(finals);
        setIsComplete(true);
        setIsPlaying(false);
        // Reveal all
        const allRevealed = new Set<string>();
        apuracaoResults.forEach(r => {
             QUESITO_ORDER.forEach(q => allRevealed.add(`${r.schoolId}-${q}`));
        });
        setRevealedScores(allRevealed);
    };

    const startPlaying = (newSpeed: Speed) => {
        if (!isPlaying) {
            // If starting fresh
            if (currentQuesitoIdx === 0 && currentTenth === 90) {
                setCurrentTenth(260); // Start at 26.0
            }
        }
        setSpeed(newSpeed);
        setIsPlaying(true);
    };

    if (!apuracaoResults) return <div className="p-10 text-[#F0E6D3]">Aguardando resultados...</div>;

    // --- Sorted Leaderboard for Display ---
    const sortedLeaderboard = [...apuracaoResults].sort((a, b) => {
        const totalA = runningTotals[a.schoolId] || 0;
        const totalB = runningTotals[b.schoolId] || 0;
        if (Math.abs(totalA - totalB) > 0.05) return totalB - totalA;
        // Tie breaker logic for display during running? Use alphabetical or previous year rank?
        return a.schoolName.localeCompare(b.schoolName);
    });

    const playerRank = sortedLeaderboard.findIndex(s => s.schoolId === playerSchoolId) + 1;
    const leaderTotal = runningTotals[sortedLeaderboard[0].schoolId] || 0;
    const playerTotal = runningTotals[playerSchoolId || ''] || 0;
    const diffToLeader = leaderTotal - playerTotal;

    // Math elimination check
    // Remaining quesitos * 30.0
    const remainingQuesitos = QUESITO_ORDER.length - 1 - currentQuesitoIdx; // -1 because current is partially done?
    // Actually current is BEING revealed.
    // If we are at 29.0 of current, max remaining for ME is (30 - currentVal) + (remaining * 30).
    // But I don't know my current val yet if not revealed!
    // Assume max 30 for unrevealed.
    // Simplifying: Remaining points = (9 - currentQuesitoIdx) * 30.
    // If current quesito is finished for LEADER but not me?
    // This is complex. Let's use a simple approximation:
    // Max possible score = Current Total + (Unrevealed Quesitos * 30).
    // If Max Possible < Leader Current Total, then eliminated.
    // Wait, leader also has unrevealed quesitos?
    // "Matematicamente eliminado" usually means "Even if I get 30s and they get 0s (unlikely) or minimums..."
    // In Carnaval, minimum is usually ~9.0 (27.0).
    // Let's assume simpler: if `diffToLeader > (Remaining Quesitos * 0.5)` it's hard.
    // But strict math elimination: `diff > Remaining * (30 - MinScore)`.
    // Let's just show "Diferença" and let player sweat.
    // Or if `diffToLeader > 2.0` (which is huge), show warning.

    return (
        <div className="flex flex-col h-screen bg-[#080C18] text-[#F0E6D3] overflow-hidden font-sans">
             {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center border-b border-[#1E2D50] bg-[#0F1629] shrink-0">
                <div className="flex items-center gap-4">
                     <h1 className="text-xl font-black uppercase tracking-wider text-[#C9A84C]">Apuração 2026</h1>
                     <Badge variant="gold">Grupo Especial</Badge>
                </div>

                {!isComplete && (
                    <div className="flex gap-2">
                        <button onClick={() => startPlaying('Normal')} disabled={isPlaying && speed === 'Normal'} className={`px-4 py-2 rounded uppercase font-black text-xs ${isPlaying && speed === 'Normal' ? 'bg-[#C9A84C] text-[#080C18]' : 'bg-[#1E2D50] text-[#8A9BB8]'}`}>
                            ▶ Normal
                        </button>
                        <button onClick={() => startPlaying('Fast')} disabled={isPlaying && speed === 'Fast'} className={`px-4 py-2 rounded uppercase font-black text-xs ${isPlaying && speed === 'Fast' ? 'bg-[#C9A84C] text-[#080C18]' : 'bg-[#1E2D50] text-[#8A9BB8]'}`}>
                            ▶▶ Rápido
                        </button>
                        <button onClick={() => finishInstant()} className="px-4 py-2 rounded uppercase font-black text-xs bg-[#E74C3C] text-[#FFFFFF]">
                            ⚡ Instantâneo
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Left: Quesito Reveal */}
                <div className="w-1/3 border-r border-[#1E2D50] p-6 flex flex-col items-center justify-center relative bg-[#0B1021]">
                    {!isComplete ? (
                        <>
                            <div className="text-[#8A9BB8] uppercase tracking-[0.2em] font-bold text-sm mb-4">Quesito {currentQuesitoIdx + 1}/9</div>
                            <h2 className="text-4xl font-black text-[#F0E6D3] uppercase text-center mb-12 animate-pulse-slow">
                                {QUESITO_LABELS[currentQuesito]}
                            </h2>

                            <div className="w-full max-w-sm space-y-2">
                                {/* Recently revealed cards for this quesito */}
                                {apuracaoResults
                                    .filter(r => revealedScores.has(`${r.schoolId}-${currentQuesito}`))
                                    .sort((a, b) => b.quesitos[currentQuesito].total - a.quesitos[currentQuesito].total)
                                    .map(r => (
                                        <div key={r.schoolId} className={`flex justify-between items-center p-3 rounded border animate-slide-in ${
                                            r.schoolId === playerSchoolId
                                                ? 'bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]'
                                                : 'bg-[#161E35] border-[#1E2D50] text-[#8A9BB8]'
                                        }`}>
                                            <span className="font-bold uppercase truncate max-w-[200px]">{r.schoolName}</span>
                                            <span className="font-mono font-black text-xl">{r.quesitos[currentQuesito].total.toFixed(1)}</span>
                                        </div>
                                    ))
                                }
                                {/* Current value being read indicator */}
                                <div className="text-center text-[#4A5A7A] font-mono text-sm mt-4 uppercase tracking-widest">
                                    Lendo notas: {(currentTenth / 10).toFixed(1)}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center animate-fade-in">
                            <div className="text-[#C9A84C] text-6xl mb-4">🏆</div>
                            <h2 className="text-3xl font-black text-[#F0E6D3] uppercase mb-2">Campeã</h2>
                            <h1 className="text-4xl font-black text-[#C9A84C] uppercase mb-8">{sortedLeaderboard[0].schoolName}</h1>

                            <div className="space-y-4">
                                <div className="bg-[#1E2D50] p-4 rounded text-left">
                                    <div className="text-[10px] uppercase text-[#8A9BB8]">Sua Classificação</div>
                                    <div className="text-2xl font-black text-[#F0E6D3]">{playerRank}º Lugar</div>
                                </div>
                                <button
                                    onClick={() => finalizeApuracao()}
                                    className="w-full py-4 bg-[#C9A84C] text-[#080C18] font-black uppercase tracking-widest rounded hover:scale-105 transition-transform"
                                >
                                    Próxima Temporada →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Leaderboard */}
                <div className="flex-1 bg-[#080C18] p-6 overflow-y-auto custom-scrollbar">
                     <div className="flex justify-between items-end mb-6">
                         <h3 className="text-lg font-black uppercase tracking-wider text-[#F0E6D3]">Classificação Geral</h3>
                         <div className="text-right">
                             <div className="text-[10px] uppercase text-[#4A5A7A]">Diferença para o Líder</div>
                             <div className={`font-mono font-bold ${diffToLeader > 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
                                 {diffToLeader.toFixed(1)} pts
                             </div>
                         </div>
                     </div>

                     <div className="space-y-1">
                         {sortedLeaderboard.map((r, index) => {
                             const isPlayer = r.schoolId === playerSchoolId;
                             const score = runningTotals[r.schoolId] || 0;

                             return (
                                 <div key={r.schoolId} className={`flex items-center p-3 rounded transition-all duration-500 ${
                                     isPlayer
                                        ? 'bg-[#C9A84C] text-[#080C18] shadow-lg shadow-[#C9A84C20] scale-[1.01]'
                                        : 'bg-[#0F1629] text-[#8A9BB8] border-b border-[#1E2D50]'
                                 }`}>
                                     <div className="w-8 font-mono font-bold opacity-50">{index + 1}º</div>
                                     <div className="flex-1 font-bold uppercase truncate px-4">{r.schoolName}</div>

                                     {/* Quesito Progress Bars (Mini) */}
                                     <div className="hidden xl:flex gap-1 mr-6">
                                         {QUESITO_ORDER.map((q, i) => {
                                             const val = r.quesitos[q]?.total || 0;
                                             // Opacity based on if revealed
                                             const isRevealed = revealedScores.has(`${r.schoolId}-${q}`);
                                             return (
                                                 <div key={q} className={`w-1 h-4 rounded-full ${
                                                     val === 30 ? 'bg-[#2ECC71]' : val >= 29.8 ? 'bg-[#F1C40F]' : 'bg-[#E74C3C]'
                                                 } ${!isRevealed ? 'opacity-20' : ''}`} />
                                             )
                                         })}
                                     </div>

                                     <div className="w-20 text-right font-mono font-black text-lg">
                                         {score.toFixed(1)}
                                     </div>
                                 </div>
                             )
                         })}
                     </div>
                </div>
            </main>
        </div>
    );
}
