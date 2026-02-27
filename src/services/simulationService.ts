import { School, Division, SchoolHistoryEntry, Enredo, SchoolApuracaoResult } from '../types/models';
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

    // 1. Prestige
    score += school.prestige * 0.2;

    // 2. Enredo Execution
    const enredo = school.enredo;
    if (!enredo) return score - 50;

    const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
    const criatividade = carnavalesco ? carnavalesco.skills.criatividade : 30;
    const execGap = Math.max(0, enredo.difficulty - criatividade / 2);
    const enredoScore = enredo.potentialScore * (1 - execGap / 200);
    score += enredoScore;

    // 3. Visual / Fantasia / Harmonia (Preparation Dependent)
    let preparationScore = 0;

    if (school.preparation) {
        // PLAYER LOGIC
        const prep = school.preparation;

        // Track Quality Bonuses
        const alegBonus = (prep.tracks.Alegorias.quality / 100) * 20;
        const fantBonus = (prep.tracks.Fantasias.quality / 100) * 12;
        const harmBonus = (prep.tracks.Harmonia.quality / 100) * 8;

        // Progress Penalties
        const alegPenalty = prep.tracks.Alegorias.progress < 100 ? ((100 - prep.tracks.Alegorias.progress) / 100) * -15 : 0;
        const fantPenalty = prep.tracks.Fantasias.progress < 100 ? ((100 - prep.tracks.Fantasias.progress) / 100) * -10 : 0;
        const harmPenalty = prep.tracks.Harmonia.progress < 100 ? ((100 - prep.tracks.Harmonia.progress) / 100) * -8 : 0;

        // Bateria Score
        const form = prep.bateria.form;
        let bateriaScore = 0;
        if (form >= 75 && form <= 95) {
            bateriaScore = (form / 100) * 25;
        } else if (form < 75) {
            bateriaScore = (form / 100) * 15;
        } else {
            bateriaScore = 15;
        }

        preparationScore = alegBonus + fantBonus + harmBonus + alegPenalty + fantPenalty + harmPenalty + bateriaScore;

    } else {
        // AI LOGIC (Synthetic)
        const prestigeFactor = school.prestige / 200;

        // Synthetic Quality (Adjusted for new range 60-95)
        const synQuality = 60 + (prestigeFactor * 35) + (Math.random() * 10);

        const alegBonus = (synQuality / 100) * 20;
        const fantBonus = (synQuality / 100) * 12;
        const harmBonus = (synQuality / 100) * 8;

        const synForm = 70 + (prestigeFactor * 25) + (Math.random() * 5);
        let bateriaScore = 0;
        if (synForm >= 75 && synForm <= 95) {
             bateriaScore = (synForm / 100) * 25;
        } else {
             bateriaScore = 18;
        }

        preparationScore = alegBonus + fantBonus + harmBonus + bateriaScore;
        preparationScore += (Math.random() - 0.5) * 5;
    }
    score += preparationScore;

    // 4. Harmonia Noise / Controversy
    const baseNoise = (Math.random() - 0.5) * 10;
    const controversyNoise = enredo.controversy > 70 ? (Math.random() - 0.5) * 15 : 0;
    score += baseNoise + controversyNoise;

    // 5. Animação
    const animacaoBonus = (enredo.appeal / 100) * (school.fanbaseMorale / 100) * 15;
    score += animacaoBonus;

    // 6. Staff aggregate skill bonus
    const staffReps = school.staff.map(s => s.reputation).sort((a, b) => b - a).slice(0, 4);
    const avgTopRep = staffReps.length > 0 ? staffReps.reduce((a, b) => a + b, 0) / staffReps.length : 0;
    score += (avgTopRep / 200) * 20;

    // 7. Samba-Enredo Score
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

        sambaScoreValue = weightedAvg * 0.4;
    } else {
        sambaScoreValue = (60 + Math.random() * 20) * 0.4;
    }
    score += sambaScoreValue;

    return score;
}

/**
 * Runs a multi-year simulation of school prestige, promotion, and relegation.
 */
export function runSimulation(initialSchools: School[], startYear: number, totalYears: number): SimulationResult {
  let schools: School[] = JSON.parse(JSON.stringify(initialSchools));

  const historyLog: YearlyResult[] = [];
  const prestigeEvolution: Record<string, { year: number; prestige: number }[]> = {};

  schools.forEach(s => {
    prestigeEvolution[s.id] = [];
  });

  for (let year = startYear; year < startYear + totalYears; year++) {
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

    for (const div of DIVISIONS) {
      const divisionSchools = schoolsByDivision[div];
      if (divisionSchools.length === 0) continue;

      const scoredSchools = divisionSchools.map(school => {
        const finalScore = calculateParadeScore(school);
        return { ...school, tempScore: finalScore };
      });

      scoredSchools.sort((a, b) => b.tempScore - a.tempScore);

      const numCandidates = div === 'Grupo Especial' ? 4 : 5;
      const numVictims = div === 'Grupo Especial' ? 1 : 2;

      const candidateStartIndex = Math.max(0, scoredSchools.length - numCandidates);
      const candidates = scoredSchools.slice(candidateStartIndex);
      const safeSchoolsFromBottom = scoredSchools.slice(0, candidateStartIndex);

      const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
      const victims = shuffledCandidates.slice(0, numVictims);
      const survivors = shuffledCandidates.slice(numVictims);

      const nonRelegatedPool = [...safeSchoolsFromBottom, ...survivors];
      nonRelegatedPool.sort((a, b) => b.tempScore - a.tempScore);

      const top3 = nonRelegatedPool.slice(0, 3);
      const middlePack = nonRelegatedPool.slice(3);

      const finalRankedList = [...top3, ...middlePack, ...victims];
      rankedByDivision[div] = finalRankedList;

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

    schools = recalculatePrestige(schools, year);
    schools = schools.map(s => ({ ...s, prestige: Math.round(s.prestige) }));

    schools.forEach(s => {
      if (prestigeEvolution[s.id]) {
        prestigeEvolution[s.id].push({ year, prestige: s.prestige });
      }
    });
  }

  return { finalSchools: schools, history: historyLog, prestigeEvolution };
}

/**
 * Finalizes the season for the player, using explicit Apuracao results for Grupo Especial
 * and simulating other divisions.
 */
export function finalizeSeason(
  currentSchools: School[],
  playerDivisionResults: SchoolApuracaoResult[],
  year: number,
  playerDivision: Division
): { schools: School[], history: YearlyResult[] } {
    let schools: School[] = JSON.parse(JSON.stringify(currentSchools));
    const historyLog: YearlyResult[] = [];

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

    const playerDivisionRanked = playerDivisionResults.map(r => {
        return schoolsByDivision[playerDivision].find(s => s.id === r.schoolId);
    }).filter((s): s is School => !!s);

    if (playerDivisionRanked.length === schoolsByDivision[playerDivision].length) {
        rankedByDivision[playerDivision] = playerDivisionRanked;
    }

    const otherDivisions: Division[] = (
      ['Grupo Especial', 'Série Ouro', 'Série Prata', 'Série Bronze', 'Grupo de Avaliação'] as Division[]
    ).filter(d => d !== playerDivision);

    for (const div of otherDivisions) {
      const divisionSchools = schoolsByDivision[div];
      if (divisionSchools.length === 0) continue;

      const scoredSchools = divisionSchools.map(school => {
        const finalScore = calculateParadeScore(school);
        return { ...school, tempScore: finalScore };
      });

      scoredSchools.sort((a, b) => b.tempScore - a.tempScore);

      const numCandidates = 5;
      const numVictims = 2;

      const candidateStartIndex = Math.max(0, scoredSchools.length - numCandidates);
      const candidates = scoredSchools.slice(candidateStartIndex);
      const safeSchoolsFromBottom = scoredSchools.slice(0, candidateStartIndex);

      const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
      const victims = shuffledCandidates.slice(0, numVictims);
      const survivors = shuffledCandidates.slice(numVictims);

      const nonRelegatedPool = [...safeSchoolsFromBottom, ...survivors];
      nonRelegatedPool.sort((a, b) => b.tempScore - a.tempScore);

      const finalRankedList = [...nonRelegatedPool, ...victims];
      rankedByDivision[div] = finalRankedList;
    }

    for (const div of DIVISIONS) {
        const list = rankedByDivision[div];
        list.forEach((s, index) => {
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

    const moveSchool = (schoolId: string, newDiv: Division) => {
      const s = schools.find(sc => sc.id === schoolId);
      if (s) s.currentDivision = newDiv;
    };

    const processInterDivisionMoves = (higherDiv: Division, lowerDiv: Division, numDown: number, numUp: number) => {
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

    schools = recalculatePrestige(schools, year);
    schools = schools.map(s => ({ ...s, prestige: Math.round(s.prestige) }));

    return { schools, history: historyLog };
}
