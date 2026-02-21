import { School, Division, SchoolHistoryEntry, Enredo } from '../types/models';
import { recalculatePrestige } from './prestigeService';

export interface YearlyResult {
  year: number;
  championId: string;
  championName: string;
  division: Division;
}

export interface SimulationResult {
  finalSchools: School[];
  history: YearlyResult[];
  prestigeEvolution: Record<string, { year: number; prestige: number }[]>;
}

// Box-Muller transform for normal distribution
function randomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

// Divisions ordered by tier
const DIVISIONS: Division[] = [
  'Grupo Especial',
  'Série Ouro',
  'Série Prata',
  'Série Bronze',
  'Grupo de Avaliação'
];

/**
 * Calculates the total parade score for a school based on Enredo, Staff, and Attributes.
 */
function calculateParadeScore(school: School): number {
    let score = 0;

    // 1. Base Score (Prestige & Resources)
    // Prestige (0-200) accounts for school tradition, budget inertia, etc.
    score += school.prestige * 0.5; // Max 100

    // 2. Enredo Execution
    const enredo = school.enredo;
    if (!enredo) {
        // Penalty for no enredo (shouldn't happen usually)
        return score - 50;
    }

    const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
    // Default skills if no carnavalesco (volunteer/amateur level)
    const criatividade = carnavalesco ? carnavalesco.skills.criatividade : 30;

    // Enredo fidelidade (narrative coherence)
    // execGap represents the gap between difficulty and skill
    const execGap = Math.max(0, enredo.difficulty - criatividade / 2);
    const enredoScore = enredo.potentialScore * (1 - execGap / 200);
    score += enredoScore; // Max 100

    // Fantasia Modifier
    // "Fantasia... difficulty penalizes; high school prestige helps"
    const fantasiaModifier = 1 - (execGap * 0.003);
    const visualScore = (school.prestige * 0.3) * fantasiaModifier;
    score += visualScore; // Max ~60

    // Harmonia (internal consistency)
    const harmoniaNoise = enredo.controversy > 70 ? (Math.random() - 0.5) * 30 : 0;
    score += harmoniaNoise;

    // Animação (crowd energy)
    const animacaoBonus = (enredo.appeal / 100) * (school.fanbaseMorale / 100) * 20;
    score += animacaoBonus; // Max 20

    // 3. Samba-Enredo Score (NEW)
    let sambaScoreValue = 0;
    if (school.sambaEnredo) {
        const s = school.sambaEnredo;
        const weightedAvg =
            (s.melodia * 0.18) +
            (s.letra * 0.12) +
            (s.ritmo * 0.15) +
            (s.sinergiaBateria * 0.10) +
            (s.grito * 0.15) +
            (s.emocao * 0.10) +
            (s.apeloComunidade * 0.08) +
            (s.aderenciaAoEnredo * 0.07) +
            (s.versatilidade * 0.05);

        sambaScoreValue = weightedAvg * 0.4; // Scale to ~40 points max
    } else {
        // Fallback for AI schools (simulated)
        // Assume average 60-80
        sambaScoreValue = (60 + Math.random() * 20) * 0.4;
    }
    score += sambaScoreValue;

    // Hidden Risks/Bonuses
    const riskRoll = (enredo.hiddenRisk && Math.random() * 100 < enredo.hiddenRisk) ? -(Math.random() * 8 + 2) : 0;
    const bonusRoll = (enredo.hiddenBonus && Math.random() * 100 < enredo.hiddenBonus) ? (Math.random() * 10 + 3) : 0;
    score += riskRoll + bonusRoll;

    // Trend Modifier
    const trendModifier = enredo.trend === 'Rising' ? 1.05 : enredo.trend === 'Saturated' ? 0.95 : 1.0;
    score *= trendModifier;

    // Add some random noise to represent the day of the parade (weather, accidents, judging variance)
    score += randomNormal(0, 2);

    return score;
}

/**
 * Runs a multi-year simulation of school prestige, promotion, and relegation.
 */
export function runSimulation(initialSchools: School[], startYear: number, totalYears: number): SimulationResult {
  // Deep copy to avoid mutating the store directly during simulation steps
  let schools: School[] = JSON.parse(JSON.stringify(initialSchools));

  const historyLog: YearlyResult[] = [];
  const prestigeEvolution: Record<string, { year: number; prestige: number }[]> = {};

  // Initialize evolution tracking
  schools.forEach(s => {
    prestigeEvolution[s.id] = [];
  });

  for (let year = startYear; year < startYear + totalYears; year++) {
    // Group schools by division
    const schoolsByDivision: Record<Division, School[]> = {
      'Grupo Especial': [],
      'Série Ouro': [],
      'Série Prata': [],
      'Série Bronze': [],
      'Grupo de Avaliação': []
    };

    schools.forEach(s => {
      if (schoolsByDivision[s.currentDivision]) {
        schoolsByDivision[s.currentDivision].push(s);
      }
    });

    const rankedByDivision: Record<Division, School[]> = { ...schoolsByDivision };

    // 1. Determine Results for Each Division
    for (const div of DIVISIONS) {
      const divisionSchools = schoolsByDivision[div];
      if (divisionSchools.length === 0) continue;

      // A. Calculate Performance Scores
      const scoredSchools = divisionSchools.map(school => {
        const finalScore = calculateParadeScore(school);
        return { ...school, tempScore: finalScore };
      });

      // Sort by Score Descending (Highest Score First)
      scoredSchools.sort((a, b) => b.tempScore - a.tempScore);

      // B. Determine Relegation Candidates & Victims
      const numCandidates = div === 'Grupo Especial' ? 4 : 5;
      const numVictims = div === 'Grupo Especial' ? 1 : 2;

      const candidateStartIndex = Math.max(0, scoredSchools.length - numCandidates);
      const candidates = scoredSchools.slice(candidateStartIndex);
      const safeSchoolsFromBottom = scoredSchools.slice(0, candidateStartIndex);

      // Randomly select victims from the bottom candidates
      const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
      const victims = shuffledCandidates.slice(0, numVictims);
      const survivors = shuffledCandidates.slice(numVictims);

      // C. Determine Winners (Top 3)
      // Pool = Safe Schools + Survivors
      const nonRelegatedPool = [...safeSchoolsFromBottom, ...survivors];

      // Top 3 should be based on Score, not Random (Prompt: "Champion... randomly... from non-relegated").
      // Wait, memory said "selects the Champion... randomly... to prevent domination".
      // But the new requirement says "theme quality and fit directly affect simulation scores".
      // If I make it purely random again, the Enredo choice doesn't matter much.
      // I should probably make it weighted random or just use the scores.
      // "The system must be purely meritocratic..." (Memory).
      // The previous implementation used random selection from Top 3.
      // I will respect the score, but maybe add randomness in `calculateParadeScore` (already added noise).
      // So I will sort by `tempScore`.

      nonRelegatedPool.sort((a, b) => b.tempScore - a.tempScore);

      // If I strictly follow memory "Champion... randomly selected from non-relegated", I undermine the Enredo feature.
      // I will assume the Enredo feature update supersedes the "random champion" rule to make Enredo matter.
      // However, to keep some unpredictability, I'll stick to the Score sorting.

      const top3 = nonRelegatedPool.slice(0, 3);
      const middlePack = nonRelegatedPool.slice(3);

      // D. Construct Final Ranked List
      const finalRankedList = [...top3, ...middlePack, ...victims];

      // Update the main map
      rankedByDivision[div] = finalRankedList;

      // E. Update History
      finalRankedList.forEach((s, index) => {
        const rank = index + 1;
        const entry: SchoolHistoryEntry = { divisao: div, ano: year };

        const schoolInMain = schools.find(sch => sch.id === s.id);
        if (schoolInMain) {
            if (rank === 1) {
                schoolInMain.history.titulos.push(entry);
                schoolInMain.history.totalTitles += 1;
                historyLog.push({ year, championId: s.id, championName: s.name, division: div });
            } else if (rank === 2) {
                schoolInMain.history.vices.push(entry);
                schoolInMain.history.totalRunnerUps += 1;
            } else if (rank === 3) {
                schoolInMain.history.terceiros.push(entry);
            } else if (rank === 4) {
                schoolInMain.history.quartos.push(entry);
            } else if (rank === 5) {
                schoolInMain.history.quintos.push(entry);
            }

            if (div === 'Grupo Especial') {
                schoolInMain.anos_no_especial += 1;
            } else {
                schoolInMain.anos_em_acesso += 1;
            }
        }
      });
    }

    // 2. Promotions and Relegations
    const moveSchool = (schoolId: string, newDiv: Division) => {
      const s = schools.find(sc => sc.id === schoolId);
      if (s) s.currentDivision = newDiv;
    };

    const processInterDivisionMoves = (
        higherDiv: Division,
        lowerDiv: Division,
        numDown: number,
        numUp: number
    ) => {
        const higherList = rankedByDivision[higherDiv];
        const lowerList = rankedByDivision[lowerDiv];

        if (higherList.length > 0 && lowerList.length > 0) {
            const relegated = higherList.slice(-numDown);
            relegated.forEach(s => moveSchool(s.id, lowerDiv));

            const promoted = lowerList.slice(0, numUp);
            promoted.forEach(s => moveSchool(s.id, higherDiv));
        }
    };

    processInterDivisionMoves('Grupo Especial', 'Série Ouro', 1, 1);
    processInterDivisionMoves('Série Ouro', 'Série Prata', 2, 2);
    processInterDivisionMoves('Série Prata', 'Série Bronze', 2, 2);
    processInterDivisionMoves('Série Bronze', 'Grupo de Avaliação', 2, 2);

    // 3. Recalculate Prestige
    schools = recalculatePrestige(schools, year);

    // 4. Log Evolution
    schools.forEach(s => {
      if (prestigeEvolution[s.id]) {
        prestigeEvolution[s.id].push({ year, prestige: s.prestige });
      }
    });
  }

  return { finalSchools: schools, history: historyLog, prestigeEvolution };
}
