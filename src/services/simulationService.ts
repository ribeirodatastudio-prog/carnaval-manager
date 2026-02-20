
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

    // 1. Simulate Season: Calculate Scores & Rank
    const rankedByDivision: Record<Division, School[]> = { ...schoolsByDivision }; // Placeholder

    for (const div of DIVISIONS) {
      const divisionSchools = schoolsByDivision[div];
      if (divisionSchools.length === 0) continue;

      // Find max prestige in this division for normalization base
      const maxPrestige = Math.max(...divisionSchools.map(s => s.prestige), 1);

      // Calculate Scores
      const scoredSchools = divisionSchools.map(school => {
        const performanceBase = school.prestige / maxPrestige;
        const randomFactor = randomNormal(1.0, 0.30); // Mean 1.0, SD 0.30
        const finalScore = performanceBase * randomFactor;
        return { ...school, tempScore: finalScore };
      });

      // Sort by Score Descending
      scoredSchools.sort((a, b) => b.tempScore - a.tempScore);

      // Store ranked list (remove tempScore property conceptually, though we need to map back to original objects)
      // We need to update the main `schools` array with the history updates first.

      // Update History (Top 5)
      scoredSchools.forEach((s, index) => {
        const rank = index + 1;
        const entry: SchoolHistoryEntry = { divisao: div, ano: year };

        // Find the school in the main array to update
        const schoolInMain = schools.find(sch => sch.id === s.id);
        if (schoolInMain) {
          if (rank === 1) {
            schoolInMain.history.titulos.push(entry);
            schoolInMain.history.totalTitles += 1;
            // Log for result output
            if (div === 'Grupo Especial' || div === 'Série Ouro') {
                historyLog.push({ year, championId: s.id, championName: s.name, division: div });
            }
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

      // Save ranked list for promotion/relegation
      rankedByDivision[div] = scoredSchools;
    }

    // 2. Promotions and Relegations
    // We need to apply moves *after* processing all ranks to avoid moving a school and then processing it again?
    // Actually, we just change their `currentDivision` property.

    // Helper to move school
    const moveSchool = (schoolId: string, newDiv: Division) => {
      const s = schools.find(sc => sc.id === schoolId);
      if (s) s.currentDivision = newDiv;
    };

    // Especial <-> Ouro
    // Relegation: 1 Random from Bottom 5 Prestige in Especial
    const specialSchools = schools.filter(s => s.currentDivision === 'Grupo Especial');
    if (specialSchools.length > 0) {
        // Sort by Prestige Ascending
        const sortedByPrestige = [...specialSchools].sort((a, b) => a.prestige - b.prestige);
        const candidates = sortedByPrestige.slice(0, 5); // Bottom 5
        const relegated = candidates[Math.floor(Math.random() * candidates.length)];

        moveSchool(relegated.id, 'Série Ouro');

        // Promotion: Champion of Ouro
        const ouroChampion = rankedByDivision['Série Ouro'][0];
        if (ouroChampion) {
            moveSchool(ouroChampion.id, 'Grupo Especial');
        }
    }

    // Ouro <-> Prata (2 down / 2 up)
    {
        const ouroSchools = rankedByDivision['Série Ouro'];
        const prataSchools = rankedByDivision['Série Prata'];

        if (ouroSchools.length > 0 && prataSchools.length > 0) {
            // Relegate bottom 2
            const relegated = ouroSchools.slice(-2);
            relegated.forEach(s => moveSchool(s.id, 'Série Prata'));

            // Promote top 2
            const promoted = prataSchools.slice(0, 2);
            promoted.forEach(s => moveSchool(s.id, 'Série Ouro'));
        }
    }

    // Prata <-> Bronze (2 down / 2 up)
    {
        const prataSchools = rankedByDivision['Série Prata'];
        const bronzeSchools = rankedByDivision['Série Bronze'];

        if (prataSchools.length > 0 && bronzeSchools.length > 0) {
            const relegated = prataSchools.slice(-2);
            relegated.forEach(s => moveSchool(s.id, 'Série Bronze'));

            const promoted = bronzeSchools.slice(0, 2);
            promoted.forEach(s => moveSchool(s.id, 'Série Prata'));
        }
    }

    // Bronze <-> Avaliação (2 down / 2 up)
    {
        const bronzeSchools = rankedByDivision['Série Bronze'];
        const avaliacaoSchools = rankedByDivision['Grupo de Avaliação'];

        if (bronzeSchools.length > 0 && avaliacaoSchools.length > 0) {
            const relegated = bronzeSchools.slice(-2);
            relegated.forEach(s => moveSchool(s.id, 'Grupo de Avaliação'));

            const promoted = avaliacaoSchools.slice(0, 2);
            promoted.forEach(s => moveSchool(s.id, 'Série Bronze'));
        }
    }

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
