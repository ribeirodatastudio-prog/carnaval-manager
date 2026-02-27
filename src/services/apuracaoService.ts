import {
  School,
  DesfileResult,
  SchoolApuracaoResult,
  Quesito,
  QuitoResult
} from '../types/models';
import { calculateQuitoQualityIndexes } from './desfileService';

// Box-Muller Random for Normal Distribution
function boxMullerRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function rollJudgeScore(qualityIndex: number): number {
    // qualityIndex 0-100 → judge score 9.0-10.0
    // NON-LINEAR: compressed at the top to simulate real carnival scoring
    //
    // Real carnival scoring distribution (Grupo Especial):
    //   Quality 95-100 → 10.0 (campeão territory)
    //   Quality 85-94  → 9.8-9.9 (competitivo)
    //   Quality 70-84  → 9.5-9.7 (meio de tabela)
    //   Quality 50-69  → 9.2-9.4 (zona de rebaixamento)
    //   Quality 0-49   → 9.0-9.1 (desastre)

    let mean: number;

    if (qualityIndex >= 95) {
        // Elite zone: 9.95 to 10.0
        mean = 9.95 + (qualityIndex - 95) * 0.01;  // 95→9.95, 100→10.0
    } else if (qualityIndex >= 85) {
        // Competitive zone: 9.8 to 9.95
        mean = 9.8 + (qualityIndex - 85) * 0.015;   // 85→9.8, 94→9.935
    } else if (qualityIndex >= 70) {
        // Middle zone: 9.5 to 9.8
        mean = 9.5 + (qualityIndex - 70) * 0.02;    // 70→9.5, 84→9.78
    } else if (qualityIndex >= 50) {
        // Danger zone: 9.2 to 9.5
        mean = 9.2 + (qualityIndex - 50) * 0.015;   // 50→9.2, 69→9.485
    } else {
        // Disaster zone: 9.0 to 9.2
        mean = 9.0 + (qualityIndex / 50) * 0.2;     // 0→9.0, 49→9.196
    }

    // StdDev: Very tight at the top (0.03), more variance at bottom (0.12)
    // This means quality 98 almost guarantees 10.0, but quality 92 might get a 9.8
    const stdDev = qualityIndex >= 90
        ? 0.03 + (100 - qualityIndex) * 0.003   // 90→0.06, 100→0.03
        : 0.06 + (90 - qualityIndex) * 0.001;   // 50→0.10, 0→0.15

    const z = boxMullerRandom();
    const raw = mean + z * stdDev;

    return Math.round(Math.max(9.0, Math.min(10.0, raw)) * 10) / 10;
}

export function resolveQuesito(qualityIndex: number): QuitoResult {
    // 1. Roll 6 judge scores
    const allScores = Array.from({ length: 6 }, () => rollJudgeScore(qualityIndex));

    // 2. Discard 2 by draw (one from each module)
    // Module 1: indices 0, 1, 2
    // Module 2: indices 3, 4, 5
    const discardIdx1 = Math.floor(Math.random() * 3);      // 0, 1, or 2
    const discardIdx2 = Math.floor(Math.random() * 3) + 3;  // 3, 4, or 5

    const keptAfterDraw = allScores.filter((_, i) => i !== discardIdx1 && i !== discardIdx2);

    // 3. Discard lowest of remaining 4
    const minVal = Math.min(...keptAfterDraw);
    // Find index of minVal in keptAfterDraw to remove only one instance
    const minIdxInKept = keptAfterDraw.indexOf(minVal);
    const surviving = keptAfterDraw.filter((_, i) => i !== minIdxInKept);

    // 4. Sum surviving 3
    const total = surviving.reduce((a, b) => a + b, 0);

    return {
        allScores,
        discarded: [allScores[discardIdx1], allScores[discardIdx2], minVal],
        surviving,
        total: Math.round(total * 10) / 10 // Ensure precision
    };
}

export function computeSchoolApuracao(
    school: School,
    quitoIndexes: Record<Quesito, number>
): SchoolApuracaoResult {
    const quesitosResult: Partial<Record<Quesito, QuitoResult>> = {};
    let finalTotal = 0;

    const quesitoOrder: Quesito[] = [
        'Bateria', 'SambaEnredo', 'Harmonia', 'Evolucao', 'Enredo',
        'AlegoriasAderecos', 'Fantasia', 'ComissaoDeFrente', 'MestreSalaPortaBandeira'
    ];

    quesitoOrder.forEach(q => {
        const result = resolveQuesito(quitoIndexes[q]);
        quesitosResult[q] = result;
        finalTotal += result.total;
    });

    return {
        schoolId: school.id,
        schoolName: school.name,
        quesitos: quesitosResult as Record<Quesito, QuitoResult>,
        finalTotal: Math.round(finalTotal * 10) / 10,
        finalRank: 0 // To be filled later
    };
}

import { Division } from '../types/models';

export function runFullApuracao(
    schools: School[],
    desfileResult: DesfileResult | null,
    playerDivision: Division
): SchoolApuracaoResult[] {
    // Filter for the player's division
    const divisionSchools = schools.filter(s => s.currentDivision === playerDivision);

    const results: SchoolApuracaoResult[] = divisionSchools.map(school => {
        let qualityIndexes: Record<Quesito, number>;

        if (school.isPlayerControlled && desfileResult) {
            // Player School: Use the result from the Desfile (which includes incidents)
            qualityIndexes = desfileResult.quitoQualityIndexes;
        } else {
            // AI School: Generate synthetic indexes
            qualityIndexes = calculateQuitoQualityIndexes(school, []);
        }

        return computeSchoolApuracao(school, qualityIndexes);
    });

    // Sort by Total Descending with Tie Breaker (Reverse Quesito Order)
    results.sort((a, b) => {
        // Primary: Final Total
        if (b.finalTotal !== a.finalTotal) return b.finalTotal - a.finalTotal;

        // Tie Breaker: Reverse Quesito Order
        const qOrder: Quesito[] = [
            'MestreSalaPortaBandeira', 'ComissaoDeFrente', 'Fantasia', 'AlegoriasAderecos',
            'Enredo', 'Evolucao', 'Harmonia', 'SambaEnredo', 'Bateria'
        ];

        for (const q of qOrder) {
             const valA = a.quesitos[q] ? a.quesitos[q].total : 0;
             const valB = b.quesitos[q] ? b.quesitos[q].total : 0;
             if (valB !== valA) return valB - valA;
        }

        return 0; // Absolute tie
    });

    // Assign Ranks
    results.forEach((r, i) => r.finalRank = i + 1);

    return results;
}
