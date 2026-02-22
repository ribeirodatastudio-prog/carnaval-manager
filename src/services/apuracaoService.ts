import {
  School,
  DesfileResult,
  SchoolApuracaoResult,
  Quesito,
  QuitoResult,
  Division
} from '../types/models';
import { calculateQuitoQualityIndexes } from './desfileService';

// Box-Muller Random for Normal Distribution
function boxMullerRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function rollJudgeScore(qualityIndex: number): number {
    // qualityIndex 0–100 → judge score 9.0–10.0
    // Distribution: higher quality = higher mean, tighter spread

    // Mean: 9.0 at 0, 10.0 at 100
    const mean = 9.0 + (qualityIndex / 100) * 1.0;

    // StdDev: Tighter at high quality to ensure 10s are common for top schools
    // at 100: 0.07 (very tight)
    // at 0: 0.15 (more variance)
    const stdDev = 0.15 - (qualityIndex / 100) * 0.08;

    const z = boxMullerRandom();
    const raw = mean + z * stdDev;

    // Round to nearest tenth, clamp 9.0–10.0
    return Math.round(Math.max(9.0, Math.min(10.0, raw)) * 10) / 10;
}

function resolveQuesito(qualityIndex: number): QuitoResult {
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

export function runFullApuracao(
    schools: School[],
    desfileResult: DesfileResult | null
): SchoolApuracaoResult[] {
    // Filter for Grupo Especial only (since Desfile/Apuracao is mainly for player's division)
    // Assuming player is in Grupo Especial or we want to simulate the player's division.
    // The prompt says "Runs for ALL Grupo Especial schools".
    // I will filter by 'Grupo Especial'.

    const divisionSchools = schools.filter(s => s.currentDivision === 'Grupo Especial');

    const results: SchoolApuracaoResult[] = divisionSchools.map(school => {
        let qualityIndexes: Record<Quesito, number>;

        if (school.isPlayerControlled && desfileResult) {
            // Player School: Use the result from the Desfile (which includes incidents)
            qualityIndexes = desfileResult.quitoQualityIndexes;
        } else {
            // AI School: Generate synthetic indexes
            // Pass empty incidents array for AI for now (could generate random AI incidents here if desired)
            qualityIndexes = calculateQuitoQualityIndexes(school, []);
        }

        return computeSchoolApuracao(school, qualityIndexes);
    });

    // Sort by Total Descending
    results.sort((a, b) => b.finalTotal - a.finalTotal);

    // Assign Ranks (handling ties if any, though sort is stable-ish)
    results.forEach((r, i) => {
        r.finalRank = i + 1;
    });

    // Handle Ties: If totals are equal, they share rank?
    // Prompt says "Two schools CAN tie... Show it."
    // So if A=269.5 and B=269.5, both should have same rank or just ordered arbitrarily?
    // Usually tie-breaker is reverse order of reading.
    // But for simplicity and UI "Classificação", usually distinct ranks 1, 2, 3...
    // If I want to support shared rank:
    for (let i = 1; i < results.length; i++) {
        if (results[i].finalTotal === results[i-1].finalTotal) {
            // Use reverse quesito tie breaker?
            // "Tie-breaking rules (usually reverse order of quesitos read)"
            // Let's implement that for realism.
            // Quesito order read: Bateria -> ... -> MSPB.
            // Reverse: MSPB -> ... -> Bateria.

            const qOrder: Quesito[] = [
                'MestreSalaPortaBandeira', 'ComissaoDeFrente', 'Fantasia', 'AlegoriasAderecos',
                'Enredo', 'Evolucao', 'Harmonia', 'SambaEnredo', 'Bateria'
            ];

            let broken = false;
            for (const q of qOrder) {
                const s1 = results[i-1].quesitos[q].total;
                const s2 = results[i].quesitos[q].total;
                if (s1 !== s2) {
                    // If previous is actually lower in this tie-breaker, swap?
                    // But we already sorted by total.
                    // We need to resort the whole array with tie-breaker logic.
                    broken = true;
                    break;
                }
            }
        }
    }

    // Proper Sort with Tie Breaker
    results.sort((a, b) => {
        if (b.finalTotal !== a.finalTotal) return b.finalTotal - a.finalTotal;

        // Tie Breaker: Reverse Quesito Order
        const qOrder: Quesito[] = [
            'MestreSalaPortaBandeira', 'ComissaoDeFrente', 'Fantasia', 'AlegoriasAderecos',
            'Enredo', 'Evolucao', 'Harmonia', 'SambaEnredo', 'Bateria'
        ];

        for (const q of qOrder) {
             const valA = a.quesitos[q].total;
             const valB = b.quesitos[q].total;
             if (valB !== valA) return valB - valA;
        }

        return 0; // Absolute tie
    });

    // Re-assign ranks
    results.forEach((r, i) => r.finalRank = i + 1);

    return results;
}
