"use client";

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { incidentNarratives } from '../data/desfileNarratives';
import { ParadeSegmentType } from '../types/models';

export default function DesfileScreen() {
    const {
        gameState,
        schools,
        startDesfile,
        advanceDesfileSegment,
        resolveDesfileIncident,
        completeDesfile
    } = useGameStore();

    const { desfileResult, paradeSegmentIndex, paradeIncidentPending } = gameState;
    const school = schools.find(s => s.id === gameState.playerSchoolId);

    // Initial Start
    useEffect(() => {
        if (!desfileResult && school) {
            startDesfile();
        }
    }, [desfileResult, school, startDesfile]);

    if (!desfileResult || !school) return <div className="p-10 text-[#F0E6D3]">Preparando a Avenida...</div>;

    const currentSegment = desfileResult.segments[paradeSegmentIndex];
    const isFinished = paradeSegmentIndex >= desfileResult.segments.length;

    // --- End Screen ---
    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#080C18] text-[#F0E6D3] p-8 animate-fade-in relative overflow-hidden">
                {/* Ambient Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#080C18] via-[#161E35] to-[#080C18] opacity-80" />

                <div className="z-10 max-w-2xl text-center space-y-8">
                    <div className="text-[#C9A84C] text-sm font-black uppercase tracking-[0.3em]">Fim do Desfile</div>

                    <h1 className="text-5xl font-black leading-tight">
                        A {school.name} cruza a linha final!
                    </h1>

                    <p className="text-[#8A9BB8] text-lg leading-relaxed">
                        Os portões se fecham. A harmonia se abraça. O público ainda canta o refrão do samba enquanto a escola se dispersa na Praça da Apoteose.
                        O trabalho de um ano inteiro agora está nas mãos dos jurados.
                    </p>

                    <div className="py-8">
                        <div className="text-2xl font-mono text-[#F0E6D3]">
                            "Agora é esperar. A apuração começa terça-feira."
                        </div>
                    </div>

                    <button
                        onClick={() => completeDesfile()}
                        className="px-8 py-4 bg-[#C9A84C] text-[#080C18] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform shadow-lg shadow-[#C9A84C40]"
                    >
                        Ir para a Apuração →
                    </button>
                </div>
            </div>
        );
    }

    // --- Incident Modal ---
    if (paradeIncidentPending) {
        const narrative = incidentNarratives[paradeIncidentPending.type][0]; // Assuming 1 variant for now or pick random stored?
        // Wait, desfileService stored specific narrative text in `narrativeText` field.
        // But for choices, we need the generic template or specific text.
        // desfileService only stored `narrativeText` for the description.
        // We need the intervention texts.
        // I should have stored them or I can look them up by type.
        // desfileService used index 0 always. I will assume index 0 here too.

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-fade-in">
                <div className="max-w-xl w-full border-2 border-[#E74C3C] bg-[#1A0505] rounded-xl p-8 relative shadow-[0_0_50px_rgba(231,76,60,0.3)]">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E74C3C] text-[#1A0505] px-4 py-1 font-black uppercase tracking-widest text-xs rounded">
                        🚨 Incidente na Avenida
                    </div>

                    <h2 className="text-3xl font-black text-[#F0E6D3] mb-6 mt-4 text-center">
                        {paradeIncidentPending.type.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </h2>

                    <p className="text-[#F0E6D3] text-lg leading-relaxed mb-8 text-center font-serif italic border-l-2 border-[#E74C3C] pl-4 ml-4">
                        "{paradeIncidentPending.narrativeText}"
                    </p>

                    <div className="space-y-4">
                         {/* Option A: Intervene */}
                        <button
                            onClick={() => resolveDesfileIncident('intervene')}
                            className="w-full p-4 bg-[#E74C3C]/10 border border-[#E74C3C] rounded-lg text-left hover:bg-[#E74C3C]/20 transition-colors group"
                        >
                            <div className="text-[#E74C3C] font-black uppercase text-xs mb-1 group-hover:text-[#F0E6D3]">Intervir (Mitigar Penalidade)</div>
                            <div className="text-[#F0E6D3] text-sm">
                                {narrative.intervene.replace(/{staffName}/g, 'A equipe')}
                            </div>
                        </button>

                         {/* Option B: Accept */}
                         <button
                            onClick={() => resolveDesfileIncident('accept')}
                            className="w-full p-4 bg-transparent border border-[#4A5A7A] rounded-lg text-left hover:border-[#8A9BB8] transition-colors group"
                        >
                            <div className="text-[#4A5A7A] font-black uppercase text-xs mb-1 group-hover:text-[#8A9BB8]">Aceitar e Seguir</div>
                            <div className="text-[#8A9BB8] text-sm">
                                {narrative.accept.replace(/{staffName}/g, 'A equipe')}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Main Parade UI ---
    return (
        <div className="flex flex-col h-screen bg-[#080C18] text-[#F0E6D3] overflow-hidden font-sans">
            {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center border-b border-[#1E2D50] bg-[#0F1629]">
                <div>
                    <h1 className="text-xl font-black uppercase tracking-wider text-[#C9A84C]">{school.name}</h1>
                    <div className="text-xs text-[#8A9BB8] font-bold">DESFILE OFICIAL • {school.currentDivision.toUpperCase()} • 2026</div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-[#4A5A7A] uppercase font-bold">Enredo</div>
                    <div className="text-sm font-bold truncate max-w-[300px]">{school.enredo?.title}</div>
                </div>
            </header>

            {/* Timeline Strip */}
            <div className="px-6 py-4 flex justify-between items-center bg-[#080C18]">
                {desfileResult.segments.map((seg, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 relative group cursor-default">
                        <div
                            className={`w-3 h-3 rounded-full transition-all duration-500 ${
                                i === paradeSegmentIndex
                                    ? 'bg-[#C9A84C] scale-125 shadow-[0_0_10px_#C9A84C]'
                                    : i < paradeSegmentIndex
                                        ? 'bg-[#2ECC71]'
                                        : 'bg-[#1E2D50]'
                            }`}
                        />
                        {/* Tooltip for segment name */}
                        <div className="absolute top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] uppercase whitespace-nowrap bg-black/80 px-2 py-1 rounded pointer-events-none z-10">
                            {seg.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Stage / Content */}
            <main className="flex-1 relative flex flex-col items-center justify-center p-6 overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080C18] to-transparent pointer-events-none z-10" />
                {school.flag && (
                    <img
                        src={school.flag}
                        className="absolute inset-0 w-full h-full object-cover opacity-10 scale-110 blur-sm animate-pulse-slow"
                        alt=""
                    />
                )}

                {/* Segment Card */}
                <div className="relative z-20 max-w-4xl w-full bg-[#0F1629]/90 backdrop-blur-xl border border-[#1E2D50] rounded-2xl p-10 shadow-2xl transform transition-all duration-500">

                    {/* Segment Header */}
                    <div className="flex justify-between items-start mb-8 border-b border-[#ffffff10] pb-6">
                        <div>
                            <div className="text-[#C9A84C] text-xs font-black uppercase tracking-[0.2em] mb-2">
                                Segmento {currentSegment.index + 1} / 11
                            </div>
                            <h2 className="text-4xl font-black text-[#F0E6D3] uppercase tracking-wide">
                                {currentSegment.label}
                            </h2>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-[#8A9BB8] uppercase font-bold mb-1">Destaques</div>
                             <div className="flex flex-col items-end gap-1">
                                 {currentSegment.staffFeatured.map(role => {
                                     const staff = school.staff.find(s => s.role === role);
                                     return (
                                         <div key={role} className="flex items-center gap-2">
                                             <span className="text-sm font-bold text-[#F0E6D3]">{staff?.name || 'Vago'}</span>
                                             <span className="text-[9px] bg-[#1E2D50] px-1.5 py-0.5 rounded text-[#8A9BB8]">{role}</span>
                                         </div>
                                     )
                                 })}
                             </div>
                        </div>
                    </div>

                    {/* Narrative */}
                    <div className="mb-10 min-h-[120px] flex items-center justify-center">
                        <p className="text-2xl text-center font-serif leading-relaxed italic text-[#F0E6D3] opacity-90">
                            "{currentSegment.narrativeText}"
                        </p>
                    </div>

                    {/* Stats / Feedback */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        {/* Quality Bar */}
                        <div className="bg-[#080C18] p-4 rounded-xl border border-[#1E2D50]">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#8A9BB8]">Execução Técnica</span>
                                <span className="text-lg font-mono font-black text-[#F0E6D3]">{Math.floor(currentSegment.qualityRating)}/100</span>
                            </div>
                            <div className="h-2 bg-[#161E35] rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${currentSegment.qualityRating}%`,
                                        background: currentSegment.qualityRating > 80 ? '#2ECC71' : currentSegment.qualityRating > 60 ? '#F1C40F' : '#E74C3C'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Crowd Reaction */}
                        <div className="bg-[#080C18] p-4 rounded-xl border border-[#1E2D50] flex flex-col justify-center text-center relative overflow-hidden">
                             <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent animate-shimmer" />
                             <span className="text-xs font-bold uppercase tracking-wider text-[#8A9BB8] mb-1 relative z-10">Reação do Público</span>
                             <span className={`text-2xl font-black uppercase tracking-widest relative z-10 ${
                                 currentSegment.crowdReaction === 'Delirio' ? 'text-[#E74C3C] animate-pulse' :
                                 currentSegment.crowdReaction === 'Empolgado' ? 'text-[#C9A84C]' :
                                 'text-[#8A9BB8]'
                             }`}>
                                 {currentSegment.crowdReaction}
                             </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <button
                        onClick={() => advanceDesfileSegment()}
                        className="w-full py-5 bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#080C18] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-[#C9A84C30]"
                    >
                        Próximo Segmento →
                    </button>

                </div>
            </main>

            {/* Footer / Crowd Momentum */}
            <footer className="h-16 bg-[#0F1629] border-t border-[#1E2D50] relative overflow-hidden flex items-center justify-center">
                {/* Visualizing Momentum */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-full h-full bg-gradient-to-r from-[#080C18] via-[#C9A84C] to-[#080C18]"
                         style={{ transform: `scaleX(${Math.max(0, Math.min(100, desfileResult.overallCrowdMomentum + (currentSegment.qualityRating - 60))) / 100})` }}
                    />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A9BB8]">Termômetro da Arquibancada</span>
                     <div className="w-64 h-2 bg-[#161E35] rounded-full overflow-hidden border border-[#4A5A7A]">
                         <div
                            className="h-full bg-[#C9A84C] transition-all duration-700"
                            style={{ width: `${Math.max(0, Math.min(100, desfileResult.overallCrowdMomentum + (currentSegment.qualityRating - 60)))}%` }}
                         />
                     </div>
                     <span className="text-xs font-mono font-bold text-[#C9A84C]">{Math.floor(Math.max(0, Math.min(100, desfileResult.overallCrowdMomentum + (currentSegment.qualityRating - 60))))}%</span>
                </div>
            </footer>
        </div>
    );
}
