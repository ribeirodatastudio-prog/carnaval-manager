
import { School, Division, SchoolHistoryEntry } from '../types/models';
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

    // We will store the *ordered* list of schools for each division after results are finalized.
    // This list will determine history updates and promotions/relegations.
    const rankedByDivision: Record<Division, School[]> = { ...schoolsByDivision }; // Placeholder

    // 1. Determine Results for Each Division
    for (const div of DIVISIONS) {
      const divisionSchools = schoolsByDivision[div];
      if (divisionSchools.length === 0) continue;

      // A. Calculate Performance Scores
      const maxPrestige = Math.max(...divisionSchools.map(s => s.prestige), 1);

      const scoredSchools = divisionSchools.map(school => {
        const performanceBase = school.prestige / maxPrestige;
        const randomFactor = randomNormal(1.0, 0.30); // Mean 1.0, SD 0.30
        const finalScore = performanceBase * randomFactor;
        return { ...school, tempScore: finalScore };
      });

      // Sort by Score Descending (Highest Score First)
      scoredSchools.sort((a, b) => b.tempScore - a.tempScore);

      // B. Determine Relegation Candidates & Victims
      // Logic:
      // - Special: Bottom 4 candidates -> 1 random victim
      // - Others: Bottom 5 candidates -> 2 random victims
      // Note: If division is too small, handle gracefully.

      const numCandidates = div === 'Grupo Especial' ? 4 : 5;
      const numVictims = div === 'Grupo Especial' ? 1 : 2;

      // Identify candidates from the bottom of the list
      // If division size < numCandidates, use all as candidates (or all - 1? Unlikely case given game data).
      const candidateStartIndex = Math.max(0, scoredSchools.length - numCandidates);
      const candidates = scoredSchools.slice(candidateStartIndex);
      const safeSchoolsFromBottom = scoredSchools.slice(0, candidateStartIndex);

      // Randomly select victims
      // Shuffle candidates array and pick first N as victims
      const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
      const victims = shuffledCandidates.slice(0, numVictims);
      const survivors = shuffledCandidates.slice(numVictims);

      // Mark victims for relegation logic later
      // We'll construct the final ranked list such that victims are at the very bottom.

      // C. Determine Winners (Top 3)
      // Logic: Randomly chosen between all schools that are NOT randomly chosen to be relegated.
      // Pool = Safe Schools (from step B) + Survivors (from step B)
      const nonRelegatedPool = [...safeSchoolsFromBottom, ...survivors];

      // Randomly pick Top 3 (Champion, Vice, 3rd)
      // Note: If pool size < 3, just shuffle what we have.
      const shuffledWinners = [...nonRelegatedPool].sort(() => Math.random() - 0.5);

      const top3 = shuffledWinners.slice(0, 3);
      const middlePack = shuffledWinners.slice(3);

      // Re-sort middle pack by performance score?
      // "The rest of the schools... just fill the middle ranks".
      // Usually, meritocracy should apply for the middle to respect prestige.
      // So we take `middlePack` and sort them by their `tempScore` again.
      middlePack.sort((a, b) => b.tempScore - a.tempScore);

      // D. Construct Final Ranked List
      // Order: Top 3 (Random) -> Middle Pack (Score) -> Victims (Randomly Relegated)
      const finalRankedList = [...top3, ...middlePack, ...victims];

      // Update the main map
      rankedByDivision[div] = finalRankedList;

      // E. Update History (Titles, Vices, etc.) based on this final rank
      finalRankedList.forEach((s, index) => {
        const rank = index + 1;
        const entry: SchoolHistoryEntry = { divisao: div, ano: year };

        // Find school in main array
        const schoolInMain = schools.find(sch => sch.id === s.id);
        if (schoolInMain) {
            if (rank === 1) {
                schoolInMain.history.titulos.push(entry);
                schoolInMain.history.totalTitles += 1;
                // Log all champions
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

            // Update years in division
            if (div === 'Grupo Especial') {
                schoolInMain.anos_no_especial += 1;
            } else {
                schoolInMain.anos_em_acesso += 1;
            }
        }
      });
    }

    // 2. Promotions and Relegations
    // Now we strictly move schools based on their position in `rankedByDivision`.
    // The "Victims" are already at the bottom of the list.
    // The "Winners" (Promotable) are at the top.

    const moveSchool = (schoolId: string, newDiv: Division) => {
      const s = schools.find(sc => sc.id === schoolId);
      if (s) s.currentDivision = newDiv;
    };

    // Helper to process a pair of divisions (Higher <-> Lower)
    const processInterDivisionMoves = (
        higherDiv: Division,
        lowerDiv: Division,
        numDown: number,
        numUp: number
    ) => {
        const higherList = rankedByDivision[higherDiv];
        const lowerList = rankedByDivision[lowerDiv];

        if (higherList.length > 0 && lowerList.length > 0) {
            // Relegate bottom N
            const relegated = higherList.slice(-numDown);
            relegated.forEach(s => moveSchool(s.id, lowerDiv));

            // Promote top N
            const promoted = lowerList.slice(0, numUp);
            promoted.forEach(s => moveSchool(s.id, higherDiv));
        }
    };

    // Apply moves
    processInterDivisionMoves('Grupo Especial', 'Série Ouro', 1, 1);
    processInterDivisionMoves('Série Ouro', 'Série Prata', 2, 2);
    processInterDivisionMoves('Série Prata', 'Série Bronze', 2, 2);
    processInterDivisionMoves('Série Bronze', 'Grupo de Avaliação', 2, 2);


    // 3. Recalculate Prestige
    // Uses the history we just updated
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
