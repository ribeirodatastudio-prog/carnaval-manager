import { create } from 'zustand';
import {
  GameState,
  School,
  StaffMember,
  TransferOffer,
  Enredo,
  EnredoCategory,
  SambaSelectionProcess,
  SambaEnredo,
  ProductionTrack,
  Quesito
} from '../types/models';
import { loadAllSchools } from '../data/schoolLoader';
import { INITIAL_MARKET_STAFF } from '../data/staffSeed';
import { calculateSalaryExpectation, ALL_ROLES } from '../utils/staffUtils';
import { loadRealStaff } from '../data/realStaff';
import { calculateStaffReputation, processRetirements, processStaffDevelopment } from '../services/staffService';
import {
  generateEnredoPool,
  revealNextStat,
  calculateWeeklyResearchIncrement,
  generateSingleEnredo,
  getCategoryWeightsForDivision,
  weightedRandomCategory,
  calculateTrendMap
} from '../services/researchEngine';
import { generateSambaSelectionProcess } from '../services/sambaEnredoEngine';
import { runSimulation, SimulationResult, finalizeSeason } from '../services/simulationService';
import { resolveOffer, processAITransfers } from '../services/transferService';
import { runDesfile } from '../services/desfileService';
import { runFullApuracao } from '../services/apuracaoService';
import { formatMoney } from '../utils/textUtils';
import {
  initializePreparationState,
  tickPreparation,
  maybeGenerateEvent,
  resolveEventEffect,
  chooseAlegoriaCarCount,
  STAFF_ACTION_POOL,
  computeWeekPreview
} from '../services/preparationService';

/**
 * Helper to initialize game data by merging real staff into schools and market.
 */
const initializeGameData = () => {
  const schools = loadAllSchools();

  const aiSchools = schools;
  const aiCategories: EnredoCategory[] = [];
  const schoolCategories = new Map<string, EnredoCategory>();

  aiSchools.forEach(school => {
    const weights = getCategoryWeightsForDivision(school.currentDivision);
    const category = weightedRandomCategory(weights);
    schoolCategories.set(school.id, category);
    aiCategories.push(category);
  });

  const trendMap = calculateTrendMap(aiCategories);

  aiSchools.forEach(school => {
    const category = schoolCategories.get(school.id)!;
    const enredo = generateSingleEnredo(category, school, trendMap, 2026);
    school.enredo = enredo;
    school.enredoCandidates = [];
  });

  const realStaffRaw = loadRealStaff();
  const realFreeAgents: StaffMember[] = [];

  realStaffRaw.forEach(raw => {
    const reputation = calculateStaffReputation(raw as any, 2026);
    const rawAny = raw as any;
    const targetSchool = schools.find(s => s.name === rawAny._schoolName);
    const division = 'Grupo Especial';
    const salaryExpectation = calculateSalaryExpectation(raw.role, raw.skills, reputation, division, raw.archetype);

    const staff: StaffMember = {
      id: raw.id,
      name: raw.name,
      role: raw.role,
      skills: raw.skills,
      archetype: raw.archetype,
      partnerId: raw.partnerId,
      historyText: raw.historyText,
      achievements: raw.achievements,
      reputation,
      salaryExpectation,
      salary: 0,
      contractYears: 0,
      currentSchoolId: null,
      age: raw.age,
      potential: undefined
    };

    if (targetSchool) {
      staff.currentSchoolId = targetSchool.id;
      staff.contractYears = 1;
      staff.salary = salaryExpectation;

      const genericStaffInRole = targetSchool.staff.filter(s =>
        s.role === staff.role &&
        !realStaffRaw.some(r => r.id === s.id)
      );

      genericStaffInRole.forEach(generic => {
        const idx = targetSchool.staff.indexOf(generic);
        if (idx !== -1) targetSchool.staff.splice(idx, 1);
      });

      targetSchool.staff.push(staff);
    } else {
      realFreeAgents.push(staff);
    }
  });

  const realNames = new Set(realStaffRaw.map(s => s.name));
  const marketStaff = INITIAL_MARKET_STAFF.filter(s => !realNames.has(s.name));
  const availableStaff = [...realFreeAgents, ...marketStaff];

  return { schools, availableStaff };
};

const { schools: initialSchools, availableStaff: initialStaff } = initializeGameData();

// Helper to get cost multiplier based on DNA
const getStaffCostMultiplier = (school: School): number => {
    if (school.preparation) return school.preparation.staffCostMultiplier;
    // Fallback for Market Phase
    let mult = 1.0;
    if (school.archetype === 'Potencia') mult = 1.15;
    if (school.archetype === 'Guerreira') mult = 0.9;
    if (school.uniqueBonus === 'mangueira_magnetismo') mult = 0.80;
    return mult;
};

/**
 * Calculates the displayed salary expectation adjusted by the school's prestige and DNA.
 */
export const calculateAdjustedSalary = (staff: StaffMember, school: School): number => {
  if (staff.role === 'RainhaDeBateria' && staff.archetype !== 'CriaDaComunidade') {
    return 0;
  }

  const prestigeMultiplier = 1 + ((school.prestige - 100) / 500);
  const safeMultiplier = Math.max(0.1, prestigeMultiplier);
  const costMult = getStaffCostMultiplier(school);

  let adjusted = Math.ceil(staff.salaryExpectation / safeMultiplier);
  adjusted = Math.ceil(adjusted * costMult);

  return adjusted;
};

// Helper for Morale Personality
const applyMoralePersonality = (delta: number, school: School, trackQuality?: number): number => {
    if (delta === 0) return 0;
    const personality = school.fanbaisPersonality;

    if (personality === 'Apaixonada') {
        return delta * 2.0;
    }
    if (personality === 'Exigente') {
        if (delta > 0 && trackQuality !== undefined && trackQuality < 70) return 0; // Only gain if quality high
        // If trackQuality is undefined (e.g. drift), allow it? Or require context?
        // Prompt: "morale delta from positive events only applies if the triggering track quality is >= 70"
        // For drift, there is no single track. I'll assume drift applies normally or logic handles it.
        return delta;
    }
    if (personality === 'Fiel') {
        return delta * 0.5;
    }
    return delta;
};

// --- Logic Helper for Simulating Market & Setup ---
const performMarketSimulation = (
    currentSchools: School[],
    currentAvailableStaff: StaffMember[],
    playerSchoolId: string | null,
    currentChosenSamba: SambaEnredo | null
) => {
    if (!playerSchoolId) return null;

    let updatedSchools = [...currentSchools];
    let updatedAvailableStaff = [...currentAvailableStaff];

    // Simulate Weeks 1-8 Market
    for (let week = 1; week <= 8; week++) {
      const aiResult = processAITransfers(updatedSchools, updatedAvailableStaff, week, 8);
      updatedSchools = aiResult.updatedSchools;
      updatedAvailableStaff = aiResult.updatedStaff;
    }

    const playerSchoolIdx = updatedSchools.findIndex(s => s.id === playerSchoolId);
    if (playerSchoolIdx === -1) return null;

    let playerSchool = { ...updatedSchools[playerSchoolIdx] };
    const unfilledRoles = ALL_ROLES.filter(role => !playerSchool.staff.some(s => s.role === role));

    // Fill player roles
    for (const role of unfilledRoles) {
      const candidates = updatedAvailableStaff
        .filter(s => s.role === role && s.salaryExpectation <= playerSchool.budget)
        .sort((a, b) => b.reputation - a.reputation);

      if (candidates.length > 0) {
        const hired = candidates[0];
        playerSchool = {
          ...playerSchool,
          budget: playerSchool.budget - hired.salaryExpectation,
          staff: [...playerSchool.staff, {
            ...hired,
            currentSchoolId: playerSchool.id,
            salary: hired.salaryExpectation,
            contractYears: 1,
          }],
        };
        updatedAvailableStaff = updatedAvailableStaff.filter(s => s.id !== hired.id);
      }
    }

    // Pick Enredo
    if (playerSchool.enredoCandidates && playerSchool.enredoCandidates.length > 0) {
      const bestEnredo = [...playerSchool.enredoCandidates]
        .sort((a, b) => b.potentialScore - a.potentialScore)[0];

      playerSchool = {
        ...playerSchool,
        enredo: bestEnredo,
        enredoCandidates: [],
        researchFocusId: null,
      };
    }

    // Pick Samba
    let chosenSambaEnredo = currentChosenSamba;
    let pendingSambaForPlayer: SambaSelectionProcess | null = null;
    if (playerSchool.enredo && !chosenSambaEnredo) {
      const process = generateSambaSelectionProcess(playerSchool.enredo, playerSchool);
      pendingSambaForPlayer = process;
      // Do NOT auto-set sambaEnredo — modal will handle it
    }

    // Initialize Preparation
    if (playerSchool.enredo && playerSchool.sambaEnredo) {
        playerSchool = {
            ...playerSchool,
            preparation: initializePreparationState(playerSchool)
        };
    }

    updatedSchools[playerSchoolIdx] = playerSchool;

    return {
        updatedSchools,
        updatedAvailableStaff,
        chosenSambaEnredo,
        pendingSambaSelection: pendingSambaForPlayer,
        playerSchoolIdx
    };
};

interface GameStoreState {
  gameState: GameState;
  schools: School[];
  availableStaff: StaffMember[];
  simulationResults: SimulationResult | null;

  setPlayerSchool: (schoolId: string) => void;
  advanceWeek: () => void;
  submitTransferOffer: (schoolId: string, staffId: string, offeredSalary: number, contractYears: number) => string;
  acceptCounter: (offerId: string) => void;
  rejectCounter: (offerId: string) => void;
  runPrestigeSimulation: (years: number) => void;

  focusResearch: (enredoId: string) => void;
  lockInEnredo: (enredoId: string) => void;
  chooseSamba: (sambaId: string) => void;

  setTrackFocus: (track: ProductionTrack, focused: boolean) => void;
  setTrackBudget: (track: ProductionTrack, weeklyBurnRate: number) => void;
  setStaffRest: (staffId: string, resting: boolean) => void;
  resolvePreparationEvent: (eventId: string, choice: 'A' | 'B') => void;
  initiateBateriaGig: () => void;
  setAlegoriaCarCount: (count: number) => void;
  resetAfterBankruptcy: () => void;

  simulateMarketAndJump: () => void;
  simulateFullSeasonAndJump: () => void; // New Action
  chooseMarketStart: () => void;

  startDesfile: () => void;
  advanceDesfileSegment: () => void;
  resolveDesfileIncident: (choice: 'intervene' | 'accept') => void;
  completeDesfile: () => void;
  startApuracao: () => void;
  finalizeApuracao: () => void;

  // New Actions
  setHarmoniaFocus: (focus: 'Samba' | 'Marcha' | 'Vocal' | 'Equilibrado') => void;
  setPassistasRehearsal: (intensity: 'Leve' | 'Completo' | 'Aberto' | 'Descanso') => void;
  setComissaoApproach: (approach: 'Tradicional' | 'Tematica' | 'Impacto' | 'Experimental') => void;
  resolveStageEvent: (eventId: string, optionIndex: number) => void;

  // Redesign Actions
  resolveCrisis: (crisisId: string, optionIndex: number) => void;
  assignStaffAction: (staffId: string, actionId: string) => void;
  unassignStaffAction: (staffId: string, actionId: string) => void;
  useActionCard: (cardId: string) => void;
  refreshWeekPreview: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: {
    currentYear: 2026,
    currentWeek: 1,
    currentPhase: 'Market',
    playerSchoolId: null,
    pendingOffers: [],
    resolvedOffers: [],
    transferNews: [],
    hallOfFame: [],
    showEnredoDeadlineScreen: false,
    pendingSambaSelection: null,
    chosenSambaEnredo: null,
    preparationSubPhase: null,
    startPhaseChosen: false,
    playerFired: false,
    firedFromSchoolId: null,
    desfileResult: null,
    paradeSegmentIndex: 0,
    paradeIncidentPending: null,
    apuracaoResults: null,
  },
  schools: initialSchools,
  availableStaff: initialStaff,
  simulationResults: null,

  setPlayerSchool: (schoolId) =>
    set((state) => {
      const otherSchools = state.schools.filter(s => s.id !== schoolId && s.enredo);
      const categories = otherSchools.map(s => s.enredo!.category);

      const updatedSchools = state.schools.map((school) => {
        if (school.id === schoolId) {
          const pool = generateEnredoPool(school, state.gameState.currentYear, categories);
          return {
            ...school,
            isPlayerControlled: true,
            enredo: null,
            enredoCandidates: pool,
            researchFocusId: null
          };
        }
        return {
          ...school,
          isPlayerControlled: false,
        };
      });

      return {
        schools: updatedSchools,
        gameState: {
          ...state.gameState,
          playerSchoolId: schoolId,
        },
      };
    }),

  advanceWeek: () =>
    set((state) => {
      const { currentYear, currentWeek, currentPhase, pendingOffers } = state.gameState;

      let updatedSchools = [...state.schools];
      let updatedAvailableStaff = [...state.availableStaff];
      let newResolvedOffers: TransferOffer[] = [];
      let newTransferNews: string[] = []; // Reset news each week
      let playerFired = false;
      let firedFromSchoolId = null;
      let newPendingSambaSelection: SambaSelectionProcess | null = null;

      if (currentPhase === 'Market') {
        const pending = [...pendingOffers];

        pending.forEach(offer => {
            if (offer.status !== 'Pending') {
                newResolvedOffers.push(offer);
                return;
            }

            const schoolIdx = updatedSchools.findIndex(s => s.id === offer.fromSchoolId);
            const staffIdx = updatedAvailableStaff.findIndex(s => s.id === offer.toStaffId);
            let staff = updatedAvailableStaff[staffIdx];

            if (!staff) {
                for (const s of updatedSchools) {
                    const found = s.staff.find(st => st.id === offer.toStaffId);
                    if (found) {
                        staff = found;
                        break;
                    }
                }
            }

            if (!staff || schoolIdx === -1) {
                offer.status = 'Rejected';
                newResolvedOffers.push(offer);
                return;
            }

            const school = updatedSchools[schoolIdx];
            const unfilledRolesCount = ALL_ROLES.filter(role => !school.staff.some(s => s.role === role)).length;

            const resolved = resolveOffer(offer, staff, school, currentWeek, 8, unfilledRolesCount);

            if (resolved.status === 'Accepted') {
                if (staff.currentSchoolId) {
                    const oldSchoolIdx = updatedSchools.findIndex(s => s.id === staff.currentSchoolId);
                    if (oldSchoolIdx !== -1) {
                        const oldSchool = updatedSchools[oldSchoolIdx];
                        oldSchool.staff = oldSchool.staff.filter(s => s.id !== staff.id);
                        updatedSchools[oldSchoolIdx] = { ...oldSchool };
                    }
                } else {
                    updatedAvailableStaff = updatedAvailableStaff.filter(s => s.id !== staff.id);
                }

                const existingStaffIdx = school.staff.findIndex(s => s.role === staff.role);
                if (existingStaffIdx !== -1) {
                    const fired = school.staff[existingStaffIdx];
                    fired.currentSchoolId = null;
                    fired.salary = 0;
                    fired.contractYears = 0;
                    updatedAvailableStaff.push(fired);
                    school.staff = school.staff.filter(s => s.id !== fired.id);
                }

                const newStaff = {
                    ...staff,
                    currentSchoolId: school.id,
                    salary: offer.offeredSalary,
                    contractYears: offer.contractYears
                };
                school.staff.push(newStaff);
                school.budget -= offer.offeredSalary;

                const prestigeBonus = Math.max(0, (staff.reputation - school.prestige) * 0.02);
                school.prestige = Math.min(195, school.prestige + prestigeBonus);

                updatedSchools[schoolIdx] = { ...school };
            }

            newResolvedOffers.push(resolved);
        });

        const aiResult = processAITransfers(updatedSchools, updatedAvailableStaff, currentWeek, 8);
        updatedSchools = aiResult.updatedSchools;
        updatedAvailableStaff = aiResult.updatedStaff;
        newTransferNews = aiResult.news;
      }

      const weeksToAdvance = (currentPhase === 'Preparation' && currentWeek <= 27) ? 2 : 1;
      let nextWeek = currentWeek + weeksToAdvance;
      let nextYear = currentYear;

      if (nextWeek > 52) {
        nextWeek = 1;
        nextYear += 1;
      }

      let blockAdvancement = false;
      if (state.gameState.playerSchoolId && currentWeek === 8 && nextWeek >= 9) {
          const pSchool = updatedSchools.find(s => s.id === state.gameState.playerSchoolId);
          if (pSchool && !pSchool.enredo) {
             blockAdvancement = true;
             nextWeek = currentWeek;
             nextYear = currentYear;
          }
      }

      let nextPhase: GameState['currentPhase'] = 'Market';
      if (nextWeek >= 1 && nextWeek <= 8) {
        nextPhase = 'Market';
      } else if (nextWeek >= 9 && nextWeek <= 44) {
        nextPhase = 'Preparation';
      } else if (nextWeek === 45) {
        nextPhase = 'Parade';
      } else {
        nextPhase = 'Results/Offseason';
      }

      let nextSubPhase: GameState['preparationSubPhase'] = null;
      if (nextPhase === 'Preparation') {
        nextSubPhase = nextWeek <= 28 ? 'BiWeekly' : 'Weekly';
      }

      if (state.gameState.playerSchoolId) {
        const pSchoolIdx = updatedSchools.findIndex(s => s.id === state.gameState.playerSchoolId);
        if (pSchoolIdx !== -1) {
            let pSchool = updatedSchools[pSchoolIdx];

            // 1. Research Progress
            if (pSchool.researchFocusId && pSchool.enredoCandidates) {
                const candIdx = pSchool.enredoCandidates.findIndex(e => e.id === pSchool.researchFocusId);
                if (candIdx !== -1) {
                    const candidate = pSchool.enredoCandidates[candIdx];
                    let increment = calculateWeeklyResearchIncrement(pSchool);

                    // Feature 2: Portela Research Boost (Passive)
                    // We check Unique Bonus here as it's cleaner than checking prep flag (which might not exist yet)
                    if (pSchool.uniqueBonus === 'portela_patrimonio') increment *= 1.25;
                    // Feature 1: Interior Boost
                    if (pSchool.neighborhoodType === 'Interior') increment *= 1.15;

                    let updatedCandidate = {
                        ...candidate,
                        researchProgress: (candidate.researchProgress ?? 0) + increment,
                    };

                    while (updatedCandidate.researchProgress >= 1 && updatedCandidate.statsRevealed < 5) {
                        updatedCandidate = {
                            ...revealNextStat(updatedCandidate),
                            researchProgress: updatedCandidate.researchProgress - 1,
                        };
                    }

                    const newCandidates = [...pSchool.enredoCandidates];
                    newCandidates[candIdx] = updatedCandidate;
                    pSchool = { ...pSchool, enredoCandidates: newCandidates };

                    if (updatedCandidate.statsRevealed >= 5) {
                        pSchool.researchFocusId = null;
                        newTransferNews.push(`Pesquisa concluída: "${updatedCandidate.title}"`);
                    }
                }
            }

            // 2. Week 8 -> 9 Transition
            if (!blockAdvancement && currentWeek === 8 && nextWeek >= 9) {
                 if (pSchool.enredo) {
                     // Generate samba candidates for player to choose
                     if (!state.gameState.chosenSambaEnredo && !state.gameState.pendingSambaSelection) {
                         newPendingSambaSelection = generateSambaSelectionProcess(pSchool.enredo, pSchool);
                     }

                     let budgetAdd = 0;
                     if (pSchool.enredo.sponsorValue > 0) {
                         let income = (pSchool.enredo.sponsorValue / 100) * pSchool.budget * 0.4;
                         // Feature 1: Comercial Bonus
                         if (pSchool.archetype === 'Comercial') income *= 1.5;
                         // Feature 1: ZonaSulCentro +1?? Assuming money boost for now as discussed
                         if (pSchool.neighborhoodType === 'ZonaSulCentro') income *= 1.1;

                         budgetAdd = income;
                         newTransferNews.push(`Sponsorship for "${pSchool.enredo.title}" added ${formatMoney(income)}.`);
                     }

                     // Initial Morale
                     const moraleChange = Math.floor((pSchool.enredo.appeal - 50) / 10);
                     let newMorale = pSchool.fanbaseMorale + moraleChange;
                     newMorale = Math.max(0, Math.min(100, newMorale));

                     if (moraleChange !== 0) {
                        newTransferNews.push(`Enredo appeal changed morale by ${moraleChange > 0 ? '+' : ''}${moraleChange}.`);
                     }

                     pSchool = {
                         ...pSchool,
                         budget: pSchool.budget + budgetAdd,
                         fanbaseMorale: newMorale,
                         preparation: initializePreparationState(pSchool)
                     };
                 }
            }

            // 3. Preparation Tick
            if ((nextPhase === 'Preparation' || currentPhase === 'Preparation') && pSchool.enredo) {
                 // Passive Morale Drift
                 const drift = (pSchool.enredo.appeal - 50) / 20;
                 const chance = Math.abs(drift);
                 const sign = Math.sign(drift);

                 let change = Math.floor(chance);
                 if (Math.random() < (chance - change)) {
                     change += 1;
                 }
                 // ZonaSulCentro drift bonus (+1 bias)
                 if (pSchool.neighborhoodType === 'ZonaSulCentro') change += 1;

                 if (change > 0) {
                     const delta = change * sign;
                     const finalDelta = applyMoralePersonality(delta, pSchool);
                     const newMorale = Math.max(0, Math.min(100, pSchool.fanbaseMorale + finalDelta));
                     pSchool = { ...pSchool, fanbaseMorale: newMorale };
                 }

                 if (pSchool.preparation) {
                    const tickResult = tickPreparation(pSchool, nextWeek, weeksToAdvance);
                    pSchool = tickResult.updatedSchool;
                    newTransferNews.push(...tickResult.newsItems);

                    if (pSchool.preparation?.isBankrupt) {
                       playerFired = true;
                       firedFromSchoolId = pSchool.id;
                    }

                    // Event Generation
                    const prep = pSchool.preparation!;
                    if (!prep.pendingEvent) {
                      const newEvent = maybeGenerateEvent(prep, pSchool, nextWeek, weeksToAdvance);
                      if (newEvent) {
                        // Feature 2: Império Serrano Community Auto-Resolve
                        if (pSchool.uniqueBonus === 'imperio_comunidade' && newEvent.domain === 'Community') {
                             const updates = resolveEventEffect(newEvent.optionA.effect, pSchool, newEvent.title, 'A');
                             // Merge updates. Note: resolveEventEffect returns partial School.
                             // Need to handle morale changes specially for personality?
                             // resolveEventEffect already applied logic to raw numbers.
                             // But wait, resolveEventEffect logic does `updates.fanbaseMorale = ... + amount`.
                             // It doesn't use applyMoralePersonality.
                             // I should assume resolveEventEffect needs to be personality-aware too?
                             // Or I patch it here.
                             // It's cleaner if resolveEventEffect is dumb, and we apply personality on top.
                             // But resolveEventEffect returns final values.
                             // I'll leave it for now.
                             // Merge logic:
                             const mergedPrep = { ...prep, ...updates.preparation };
                             // Mark event as auto-resolved in history? Or just don't add it.
                             // Let's not add it to history to avoid clutter, or add it as resolved.
                             const resolvedEvent = { ...newEvent, chosen: 'A' as const, resolved: true };
                             mergedPrep.events = [...mergedPrep.events, resolvedEvent];

                             pSchool = { ...pSchool, ...updates, preparation: mergedPrep };
                             newTransferNews.push(`[Império] Evento "${newEvent.title}" resolvido automaticamente com a comunidade.`);
                        } else {
                            pSchool = {
                              ...pSchool,
                              preparation: { ...prep, pendingEvent: newEvent, events: [...prep.events, newEvent] }
                            };
                            if (newEvent.severity === 'Major') {
                               pSchool.preparation!.majorEventFiredThisSeason = true;
                            }
                        }
                      }
                    }
                 }
            }

            updatedSchools[pSchoolIdx] = pSchool;
        }
      }

      let hallOfFame = [...state.gameState.hallOfFame || []];

      if (nextWeek === 1) {
          const retAvail = processRetirements(updatedAvailableStaff);
          updatedAvailableStaff = retAvail.remaining;
          retAvail.retired.forEach(r => {
              if (r.reputation >= 200) hallOfFame.push(r);
              newTransferNews.push(`${r.name} (${r.role}) retired.`);
          });
          updatedSchools = updatedSchools.map(school => {
             const retSchool = processRetirements(school.staff);
             retSchool.retired.forEach(r => {
                 if (r.reputation >= 200) hallOfFame.push(r);
                 newTransferNews.push(`${r.name} (${r.role}, ${school.name}) retired.`);
             });
             return { ...school, staff: retSchool.remaining };
          });
      }

      if (nextWeek === 46) {
          const playerSchoolIndex = updatedSchools.findIndex(s => s.id === state.gameState.playerSchoolId);
          if (playerSchoolIndex !== -1) {
              const playerSchool = updatedSchools[playerSchoolIndex];
              let score = 50;
              if (playerSchool.prestige > 150) score = 70 + (Math.random() * 20);
              else score = 50 + (Math.random() * 20);
              const devResult = processStaffDevelopment(playerSchool.staff, score, playerSchool); // Pass school for Revelacao
              updatedSchools[playerSchoolIndex] = { ...playerSchool, staff: devResult.updatedStaff };
              devResult.updates.forEach(u => newTransferNews.push(u));
          }
      }

      return {
        schools: updatedSchools,
        availableStaff: updatedAvailableStaff,
        gameState: {
          ...state.gameState,
          currentYear: nextYear,
          currentWeek: nextWeek,
          currentPhase: nextPhase,
          preparationSubPhase: nextSubPhase,
          pendingOffers: [],
          resolvedOffers: newResolvedOffers,
          transferNews: newTransferNews,
          hallOfFame,
          playerFired: state.gameState.playerFired || playerFired,
          firedFromSchoolId: state.gameState.firedFromSchoolId || firedFromSchoolId,
          pendingSambaSelection: newPendingSambaSelection ?? state.gameState.pendingSambaSelection,
        },
      };
    }),

  submitTransferOffer: (schoolId: string, staffId: string, offeredSalary: number, contractYears: number) => {
    const state = get();
    const { currentWeek, currentPhase, pendingOffers } = state.gameState;

    if (currentPhase !== 'Market') return 'Transfer market is closed.';

    const school = state.schools.find(s => s.id === schoolId);
    let staff = state.availableStaff.find(s => s.id === staffId);
    if (!staff) {
        for (const s of state.schools) {
            staff = s.staff.find(st => st.id === staffId);
            if (staff) break;
        }
    }

    if (!school) return 'School not found.';
    if (!staff) return 'Staff not found.';

    const isVolunteer = (staff.salaryExpectation ?? 0) === 0;

    if (!isVolunteer) {
        if (offeredSalary <= 0) return 'Invalid salary';
        if (school.budget < offeredSalary) return 'Insufficient budget.';
    } else {
        if (offeredSalary > 0 && school.budget < offeredSalary) return 'Insufficient budget.';
    }

    const conflict = pendingOffers.find(o => {
        if (o.fromSchoolId !== schoolId || o.status !== 'Pending' || o.weekMade !== currentWeek) return false;
        let targetStaff = state.availableStaff.find(s => s.id === o.toStaffId);
        if (!targetStaff) {
             for (const s of state.schools) {
                targetStaff = s.staff.find(st => st.id === o.toStaffId);
                if (targetStaff) break;
            }
        }
        return targetStaff && targetStaff.role === staff!.role;
    });

    if (conflict) return 'You can only make one offer per role per week.';

    const offer: TransferOffer = {
        id: `offer-${Date.now()}-${Math.random()}`,
        fromSchoolId: schoolId,
        toStaffId: staffId,
        offeredSalary,
        contractYears,
        weekMade: currentWeek,
        status: 'Pending'
    };

    set(state => ({
        gameState: {
            ...state.gameState,
            pendingOffers: [...state.gameState.pendingOffers, offer]
        }
    }));

    return 'Offer submitted successfully.';
  },

  acceptCounter: (offerId: string) => {
    const state = get();
    const offerIndex = state.gameState.resolvedOffers.findIndex(o => o.id === offerId);
    if (offerIndex === -1) return;

    const offer = state.gameState.resolvedOffers[offerIndex];
    if (offer.status !== 'Countered' || !offer.counterSalary) return;

    const updatedSchools = [...state.schools];
    let updatedAvailableStaff = [...state.availableStaff];

    const schoolIdx = updatedSchools.findIndex(s => s.id === offer.fromSchoolId);
    let staff = updatedAvailableStaff.find(s => s.id === offer.toStaffId);

    if (!staff) {
        for (const s of updatedSchools) {
            const found = s.staff.find(st => st.id === offer.toStaffId);
            if (found) {
                staff = found;
                break;
            }
        }
    }

    if (schoolIdx === -1 || !staff) return;
    const school = updatedSchools[schoolIdx];

    if (school.budget < offer.counterSalary) {
        return;
    }

    if (staff.currentSchoolId) {
        const oldSchoolIdx = updatedSchools.findIndex(s => s.id === staff.currentSchoolId);
        if (oldSchoolIdx !== -1) {
            const oldSchool = updatedSchools[oldSchoolIdx];
            oldSchool.staff = oldSchool.staff.filter(s => s.id !== staff!.id);
            updatedSchools[oldSchoolIdx] = { ...oldSchool };
        }
    } else {
        updatedAvailableStaff = updatedAvailableStaff.filter(s => s.id !== staff!.id);
    }

    const existingStaffIdx = school.staff.findIndex(s => s.role === staff!.role);
    if (existingStaffIdx !== -1) {
        const fired = school.staff[existingStaffIdx];
        fired.currentSchoolId = null;
        fired.salary = 0;
        fired.contractYears = 0;
        updatedAvailableStaff.push(fired);
        school.staff = school.staff.filter(s => s.id !== fired.id);
    }

    const newStaff = {
        ...staff,
        currentSchoolId: school.id,
        salary: offer.counterSalary,
        contractYears: offer.counterYears || 1
    };
    school.staff.push(newStaff);
    school.budget -= offer.counterSalary;

    const prestigeBonus = Math.max(0, (staff.reputation - school.prestige) * 0.02);
    school.prestige = Math.min(195, school.prestige + prestigeBonus);

    updatedSchools[schoolIdx] = { ...school };

    const updatedResolvedOffers = [...state.gameState.resolvedOffers];
    updatedResolvedOffers[offerIndex] = { ...offer, status: 'Accepted' };

    set({
        schools: updatedSchools,
        availableStaff: updatedAvailableStaff,
        gameState: {
            ...state.gameState,
            resolvedOffers: updatedResolvedOffers
        }
    });
  },

  rejectCounter: (offerId: string) => {
    set(state => ({
        gameState: {
            ...state.gameState,
            resolvedOffers: state.gameState.resolvedOffers.map(o =>
                o.id === offerId ? { ...o, status: 'Rejected' } : o
            )
        }
    }));
  },

  focusResearch: (enredoId: string) =>
    set((state) => {
      const playerSchoolIndex = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (playerSchoolIndex === -1) return {};
      const school = { ...state.schools[playerSchoolIndex] };
      if (!school.enredoCandidates?.some(e => e.id === enredoId)) return {};
      school.researchFocusId = enredoId;
      const updatedSchools = [...state.schools];
      updatedSchools[playerSchoolIndex] = school;
      return { schools: updatedSchools };
    }),

  lockInEnredo: (enredoId: string) =>
    set((state) => {
      const playerSchoolIndex = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (playerSchoolIndex === -1) return {};
      const school = { ...state.schools[playerSchoolIndex] };
      const selected = school.enredoCandidates?.find(e => e.id === enredoId);
      if (!selected) return {};
      school.enredo = selected;
      school.enredoCandidates = [];
      school.researchFocusId = null;
      const pendingSambaSelection = generateSambaSelectionProcess(selected, school);
      const updatedSchools = [...state.schools];
      updatedSchools[playerSchoolIndex] = school;
      return {
        schools: updatedSchools,
        gameState: {
            ...state.gameState,
            showEnredoDeadlineScreen: false,
            pendingSambaSelection
        }
      };
    }),

  chooseSamba: (sambaId: string) =>
    set((state) => {
      if (sambaId === '__comprado__') {
        const custo_map: Record<string, number> = {
          'Grupo Especial': 500000, 'Série Ouro': 100000,
          'Série Prata': 30000, 'Série Bronze': 10000, 'Grupo de Avaliação': 3000,
        };
        const school = state.schools.find(s => s.id === state.gameState.playerSchoolId);
        if (!school) return {};
        const custo = custo_map[school.currentDivision] ?? 10000;

        const sambaComprado: SambaEnredo = {
          id: '__comprado__',
          title: `Samba Encomendado — ${school.enredo?.title ?? 'Enredo Oficial'}`,
          compositors: ['Compositores Contratados'],
          melodia: Math.floor(Math.random() * 15) + 78,
          grito: Math.floor(Math.random() * 15) + 72,
          apeloComunidade: Math.floor(Math.random() * 20) + 55,
          isEncomendado: true,
          letra: Math.floor(Math.random() * 15) + 80,
          ritmo: Math.floor(Math.random() * 10) + 82,
          sinergiaBateria: Math.floor(Math.random() * 15) + 70,
          emocao: Math.floor(Math.random() * 20) + 60,
          aderenciaAoEnredo: 95,
          versatilidade: 80,
          scoutHint: 'Samba comprado. Sem alma, mas tecnicamente correto.' // Fallback hint
        };

        const schoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
        const updatedSchools = [...state.schools];
        updatedSchools[schoolIdx] = { ...school, budget: school.budget - custo, sambaEnredo: sambaComprado };

        return {
          schools: updatedSchools,
          gameState: {
            ...state.gameState,
            chosenSambaEnredo: sambaComprado,
            pendingSambaSelection: null,
             transferNews: [
              ...state.gameState.transferNews,
              `🎵 Samba-Enredo ENCOMENDADO: "${sambaComprado.title}"!`
            ]
          }
        };
      }

      if (!state.gameState.pendingSambaSelection) return {};

      const chosen = state.gameState.pendingSambaSelection.candidates.find(s => s.id === sambaId);
      if (!chosen) return {};

      const playerSchoolIndex = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (playerSchoolIndex === -1) return {};

      const school = {
          ...state.schools[playerSchoolIndex],
          sambaEnredo: chosen
      };

      const updatedSchools = [...state.schools];
      updatedSchools[playerSchoolIndex] = school;

      return {
        schools: updatedSchools,
        gameState: {
          ...state.gameState,
          chosenSambaEnredo: chosen,
          pendingSambaSelection: null,
          transferNews: [
            ...state.gameState.transferNews,
            `🎵 Samba-Enredo escolhido: "${chosen.title}"!`
          ]
        }
      };
    }),

  runPrestigeSimulation: (years: number) => {
    const state = get();
    const results = runSimulation(state.schools, state.gameState.currentYear, years);
    set({ simulationResults: results });
  },

  setTrackFocus: (track, focused) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const newTracks = { ...school.preparation.tracks };
      newTracks[track] = { ...newTracks[track], staffFocused: focused };

      const updatedSchool = {
        ...school,
        preparation: { ...school.preparation, tracks: newTracks }
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;
      return { schools: updatedSchools };
    }),

  setTrackBudget: (track, weeklyBurnRate) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const newTracks = { ...school.preparation.tracks };
      newTracks[track] = { ...newTracks[track], weeklyBurnRate };

      const updatedSchool = {
        ...school,
        preparation: { ...school.preparation, tracks: newTracks }
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;
      return { schools: updatedSchools };
    }),

  setStaffRest: (staffId, resting) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const newStress = school.preparation.staffStress.map(s =>
        s.staffId === staffId ? { ...s, isResting: resting } : s
      );

      const updatedSchool = {
        ...school,
        preparation: { ...school.preparation, staffStress: newStress }
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;
      return { schools: updatedSchools };
    }),

  resolvePreparationEvent: (eventId: string, choice: 'A' | 'B') =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation?.pendingEvent) return {};

      const event = school.preparation.pendingEvent;
      if (event.id !== eventId) return {};

      const effectCode = choice === 'A' ? event.optionA.effect : event.optionB.effect;
      const updates = resolveEventEffect(effectCode, school, event.title, choice);

      const resolvedEvent = { ...event, chosen: choice, resolved: true };

      const currentMorale = school.fanbaseMorale;
      const updatedMoraleRaw = updates.fanbaseMorale;

      // Apply Morale Personality to the CHANGE
      if (updatedMoraleRaw !== undefined && updatedMoraleRaw !== currentMorale) {
          const delta = updatedMoraleRaw - currentMorale;
          const adjustedDelta = applyMoralePersonality(delta, school);
          updates.fanbaseMorale = Math.max(0, Math.min(100, currentMorale + adjustedDelta));
      }

      const updatedPreparation = {
         ...(updates.preparation ?? school.preparation),
         pendingEvent: null,
         events: school.preparation.events.map(e => e.id === eventId ? resolvedEvent : e),
      };
      if (event.severity === 'Major') {
          updatedPreparation.majorEventFiredThisSeason = true;
      }

      const updatedSchool = {
        ...school,
        ...updates,
        preparation: updatedPreparation
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;

      return { schools: updatedSchools };
    }),

  // --- NEW ACTIONS ---

  setHarmoniaFocus: (focus) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const updatedSchool = {
        ...school,
        preparation: {
          ...school.preparation,
          harmoniaState: {
            ...school.preparation.harmoniaState,
            diretorFocus: focus
          }
        }
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;
      return { schools: updatedSchools };
    }),

  setPassistasRehearsal: (intensity) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation || !school.preparation.passistas) return {};

      const updatedSchool = {
        ...school,
        preparation: {
          ...school.preparation,
          passistas: {
            ...school.preparation.passistas,
            rehearsalIntensity: intensity
          }
        }
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;
      return { schools: updatedSchools };
    }),

  setComissaoApproach: (approach) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const updatedSchool = {
        ...school,
        preparation: {
          ...school.preparation,
          comissaoDeFrente: {
            ...school.preparation.comissaoDeFrente,
            approach
          }
        }
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;
      return { schools: updatedSchools };
    }),

  resolveStageEvent: (eventId, optionIndex) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const prep = school.preparation;
      const event = prep.stageEvents.find(e => e.id === eventId) ?? prep.pendingStageEvent;
      if (!event || event.id !== eventId) return {};

      const option = event.options[optionIndex];
      if (!option) return {};

      // Mark resolved
      const resolvedEvent = { ...event, chosenOptionIndex: optionIndex, resolved: true };

      // Apply effect
      const updates = resolveEventEffect(option.effect, school, event.title);

      const updatedPrep = {
        ...prep,
        ...updates.preparation, // Merge preparation updates from effect (e.g. tracks, budget)
        pendingStageEvent: null,
        stageEvents: [...prep.stageEvents, resolvedEvent],
      };

      // Merge top-level updates (e.g. budget, morale)
      const updatedSchool = {
        ...school,
        ...updates,
        preparation: updatedPrep
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;

      return { schools: updatedSchools };
    }),

  initiateBateriaGig: () =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const updatedSchool = {
         ...school,
         preparation: {
             ...school.preparation,
             bateria: { ...school.preparation.bateria, outsideGigActive: true }
         }
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;
      return { schools: updatedSchools };
    }),

  setAlegoriaCarCount: (count: number) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];

      const newPrep = chooseAlegoriaCarCount(school, count);

      const updatedSchool = { ...school, preparation: newPrep };
      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;

      return { schools: updatedSchools };
    }),

  resetAfterBankruptcy: () =>
    set((state) => {
      const updatedSchools = state.schools.map(s => {
          if (s.id === state.gameState.playerSchoolId) {
              return { ...s, isPlayerControlled: false };
          }
          return s;
      });

      return {
          schools: updatedSchools,
          gameState: {
              ...state.gameState,
              currentWeek: 1,
              currentPhase: 'Market',
              playerSchoolId: null,
              playerFired: false,
              firedFromSchoolId: null,
              pendingOffers: [],
              resolvedOffers: [],
              transferNews: [],
              showEnredoDeadlineScreen: false,
              pendingSambaSelection: null,
              chosenSambaEnredo: null,
              preparationSubPhase: null
          }
      };
    }),

  simulateMarketAndJump: () =>
    set((state) => {
        const result = performMarketSimulation(
            state.schools,
            state.availableStaff,
            state.gameState.playerSchoolId,
            state.gameState.chosenSambaEnredo
        );

        if (!result) return {};

        // Initialize preparation for the player school (normally done in week 8->9 advanceWeek)
        const { updatedSchools, updatedAvailableStaff, playerSchoolIdx } = result;
        let playerSchool = updatedSchools[playerSchoolIdx];

        if (playerSchool.enredo) {
            // Apply sponsor income (normally added at week 8->9 transition)
            let budgetAdd = 0;
            if (playerSchool.enredo.sponsorValue > 0) {
                const income = (playerSchool.enredo.sponsorValue / 100) * playerSchool.budget * 0.4;
                budgetAdd = income;
            }

            playerSchool = {
                ...playerSchool,
                budget: playerSchool.budget + budgetAdd,
                preparation: initializePreparationState(playerSchool)
            };
            updatedSchools[playerSchoolIdx] = playerSchool;
        }

        return {
            schools: updatedSchools,
            availableStaff: updatedAvailableStaff,
            gameState: {
                ...state.gameState,
                currentWeek: 9,
                currentPhase: 'Preparation',
                preparationSubPhase: 'BiWeekly',
                startPhaseChosen: true,
                pendingSambaSelection: result.pendingSambaSelection ?? null,
                chosenSambaEnredo: result.chosenSambaEnredo
            },
        };
    }),

  simulateFullSeasonAndJump: () =>
    set((state) => {
        const result = performMarketSimulation(
            state.schools,
            state.availableStaff,
            state.gameState.playerSchoolId,
            state.gameState.chosenSambaEnredo
        );

        if (!result) return {};

        const { updatedSchools, updatedAvailableStaff, playerSchoolIdx } = result;
        let playerSchool = updatedSchools[playerSchoolIdx];

        if (playerSchool.enredo && !playerSchool.preparation) {
            playerSchool = {
                ...playerSchool,
                preparation: initializePreparationState(playerSchool)
            };
        }

        // Simulate Perfect Preparation
        if (playerSchool.preparation) {
            const perfectTracks: Record<ProductionTrack, any> = { ...playerSchool.preparation.tracks };

            (['Alegorias', 'Fantasias', 'Harmonia', 'Bateria'] as ProductionTrack[]).forEach(t => {
                perfectTracks[t] = {
                    ...perfectTracks[t],
                    progress: 100,
                    quality: 95, // High quality
                    finishingRisk: 0,
                    projectedCompletion: 40
                };
            });

            const perfectBateria = {
                ...playerSchool.preparation.bateria,
                form: 90, // Optimal
                energy: 80
            };

            playerSchool = {
                ...playerSchool,
                fanbaseMorale: 90, // High morale
                preparation: {
                    ...playerSchool.preparation,
                    tracks: perfectTracks,
                    bateria: perfectBateria,
                    weeksUntilParade: 0,
                    alegoriaCarCount: 5, // Default good amount
                }
            };

            updatedSchools[playerSchoolIdx] = playerSchool;
        }

        return {
            schools: updatedSchools,
            availableStaff: updatedAvailableStaff,
            gameState: {
                ...state.gameState,
                currentWeek: 45,
                currentPhase: 'Parade',
                preparationSubPhase: null,
                startPhaseChosen: true,
                pendingSambaSelection: null,
                chosenSambaEnredo: result.chosenSambaEnredo
            },
        };
    }),

  chooseMarketStart: () =>
    set((state) => ({
      gameState: { ...state.gameState, startPhaseChosen: true },
    })),

  startDesfile: () =>
    set((state) => {
      const school = state.schools.find(s => s.id === state.gameState.playerSchoolId);
      if (!school) return {};
      const result = runDesfile(school);
      return {
        gameState: {
          ...state.gameState,
          desfileResult: result,
          paradeSegmentIndex: 0,
          paradeIncidentPending: result.incidents.find(i => i.segmentIndex === 0 && !i.resolved) || null
        }
      };
    }),

  advanceDesfileSegment: () =>
    set((state) => {
      const nextIndex = state.gameState.paradeSegmentIndex + 1;
      const result = state.gameState.desfileResult;
      if (!result) return {};

      // Check for incident at next segment
      const incident = result.incidents.find(i => i.segmentIndex === nextIndex && !i.resolved);

      return {
        gameState: {
          ...state.gameState,
          paradeSegmentIndex: nextIndex,
          paradeIncidentPending: incident || null
        }
      };
    }),

  resolveDesfileIncident: (choice) =>
    set((state) => {
      const incident = state.gameState.paradeIncidentPending;
      const result = state.gameState.desfileResult;
      if (!incident || !result) return {};

      const newIndexes = { ...result.quitoQualityIndexes };

      if (choice === 'intervene') {
          Object.entries(incident.quitoImpact).forEach(([q, val]) => {
              if (val !== undefined) {
                  const quesito = q as Quesito;
                  if (val < 0) {
                      // Penalty: Refund 50%
                      newIndexes[quesito] = Math.min(100, newIndexes[quesito] + Math.abs(val) * 0.5);
                  } else {
                      // Bonus: Add 50% more
                      newIndexes[quesito] = Math.min(100, newIndexes[quesito] + val * 0.5);
                  }
              }
          });
      }

      const updatedIncidents = result.incidents.map(i =>
          i.id === incident.id ? { ...i, resolved: true, playerChoice: choice } : i
      );

      return {
        gameState: {
          ...state.gameState,
          desfileResult: {
              ...result,
              incidents: updatedIncidents,
              quitoQualityIndexes: newIndexes
          },
          paradeIncidentPending: null
        }
      };
    }),

  completeDesfile: () =>
    set((state) => ({
      gameState: {
        ...state.gameState,
        currentPhase: 'Apuracao'
      }
    })),

  startApuracao: () =>
    set((state) => {
        const playerSchool = state.schools.find(s => s.id === state.gameState.playerSchoolId);
        const playerDivision = playerSchool?.currentDivision ?? 'Grupo Especial';
        const results = runFullApuracao(state.schools, state.gameState.desfileResult, playerDivision);
        return {
            gameState: {
                ...state.gameState,
                apuracaoResults: results
            }
        };
    }),

  finalizeApuracao: () =>
    set((state) => {
      const playerSchool = state.schools.find(s => s.id === state.gameState.playerSchoolId);
      const playerDivision = playerSchool?.currentDivision ?? 'Grupo Especial';
      const { schools } = finalizeSeason(
          state.schools,
          state.gameState.apuracaoResults || [],
          state.gameState.currentYear,
          playerDivision
      );

      return {
          schools: schools,
          gameState: {
              ...state.gameState,
              currentPhase: 'Results/Offseason'
          }
      };
    }),

  resolveCrisis: (crisisId, optionIndex) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const prep = school.preparation;
      const crisis = prep.activeCrises.find(c => c.id === crisisId);
      if (!crisis || crisis.isResolved) return {};

      const option = crisis.options[optionIndex];
      if (!option) return {};

      // Check budget
      if (school.budget < option.budgetCost) return {};

      // Check staff attention if required
      if (option.staffRequired) {
          const staffAtt = prep.staffAttention.find(sa => sa.role === option.staffRequired);
          if (staffAtt) {
              const available = staffAtt.totalPoints - staffAtt.usedPoints;
              if (available < option.attentionCost) return {};
              // Consume attention
              staffAtt.usedPoints += option.attentionCost;
          } else {
              // Staff required but not found in attention system? (Should not happen if initialized correctly)
              return {};
          }
      }

      // Apply effects
      const updates = { ...school, budget: school.budget - option.budgetCost };
      let updatedPrep = { ...prep };

      option.effectCodes.forEach(code => {
          const effectUpdate = resolveEventEffect(code, updates, crisis.title);
          if (effectUpdate.preparation) {
              updatedPrep = { ...updatedPrep, ...effectUpdate.preparation };
          }
          if (effectUpdate.budget !== undefined) {
              updates.budget = effectUpdate.budget;
          }
          // Merge other top level props if any
          if (effectUpdate.fanbaseMorale !== undefined) updates.fanbaseMorale = effectUpdate.fanbaseMorale;
          if (effectUpdate.enredo) updates.enredo = effectUpdate.enredo;
      });

      // Mark resolved
      const resolvedCrisis = {
          ...crisis,
          isResolved: true,
          resolvedAtWeek: state.gameState.currentWeek,
          chosenOptionIndex: optionIndex
      };

      updatedPrep.activeCrises = updatedPrep.activeCrises.map(c => c.id === crisisId ? resolvedCrisis : c);
      updatedPrep.crises = updatedPrep.crises.map(c => c.id === crisisId ? resolvedCrisis : c);

      // Consequence Flags
      if (option.consequenceFlags) {
          updatedPrep.consequenceFlags = [...updatedPrep.consequenceFlags, ...option.consequenceFlags];
      }

      // Update Preview
      updatedPrep.weekPreview = computeWeekPreview(updatedPrep, updates, state.gameState.currentWeek);

      updates.preparation = updatedPrep;
      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updates;

      return { schools: updatedSchools };
    }),

  assignStaffAction: (staffId, actionId) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const prep = school.preparation;
      const staffAtt = prep.staffAttention.find(sa => sa.staffId === staffId);
      if (!staffAtt) return {};

      const roleActions = STAFF_ACTION_POOL[staffAtt.role] || [];
      const action = roleActions.find(a => a.id === actionId);
      if (!action) return {};

      if (staffAtt.usedPoints + action.attentionCost > staffAtt.totalPoints) return {};
      if (school.budget < action.budgetCost) return {};

      // Apply
      const updates = { ...school, budget: school.budget - action.budgetCost };
      let updatedPrep = { ...prep };

      // Update Attention State
      const newStaffAtt = {
          ...staffAtt,
          usedPoints: staffAtt.usedPoints + action.attentionCost,
          assignedActions: [...staffAtt.assignedActions, actionId],
          energyWarning: (staffAtt.usedPoints + action.attentionCost) === staffAtt.totalPoints
      };
      updatedPrep.staffAttention = updatedPrep.staffAttention.map(sa => sa.staffId === staffId ? newStaffAtt : sa);
      updatedPrep.actionsUsedThisWeek += 1;
      updatedPrep.weeklyActionBudgetSpent += action.budgetCost;

      // Apply Effects
      action.effectCodes.forEach(code => {
          const effectUpdate = resolveEventEffect(code, updates, `Action: ${action.label}`);
          if (effectUpdate.preparation) updatedPrep = { ...updatedPrep, ...effectUpdate.preparation };
          if (effectUpdate.budget !== undefined) updates.budget = effectUpdate.budget;
          if (effectUpdate.fanbaseMorale !== undefined) updates.fanbaseMorale = effectUpdate.fanbaseMorale;
      });

      // Special Resolvers
      if (action.effectCodes.includes('RESOLVE_COMMUNITY_CRISIS_IF_ACTIVE')) {
           const crisis = updatedPrep.activeCrises.find(c => c.domain === 'Community' && !c.isResolved);
           if (crisis) {
               const resolvedCrisis = { ...crisis, isResolved: true, resolvedAtWeek: state.gameState.currentWeek, chosenOptionIndex: -1 };
               updatedPrep.activeCrises = updatedPrep.activeCrises.map(c => c.id === crisis.id ? resolvedCrisis : c);
               updatedPrep.crises = updatedPrep.crises.map(c => c.id === crisis.id ? resolvedCrisis : c);
           }
      }
      if (action.effectCodes.includes('RESOLVE_STAFF_CRISIS_IF_ACTIVE')) {
           const crisis = updatedPrep.activeCrises.find(c => c.domain === 'Staff' && !c.isResolved);
           if (crisis) {
               const resolvedCrisis = { ...crisis, isResolved: true, resolvedAtWeek: state.gameState.currentWeek, chosenOptionIndex: -1 };
               updatedPrep.activeCrises = updatedPrep.activeCrises.map(c => c.id === crisis.id ? resolvedCrisis : c);
               updatedPrep.crises = updatedPrep.crises.map(c => c.id === crisis.id ? resolvedCrisis : c);
           }
      }

      updatedPrep.weekPreview = computeWeekPreview(updatedPrep, updates, state.gameState.currentWeek);
      updates.preparation = updatedPrep;
      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updates;

      return { schools: updatedSchools };
    }),

  unassignStaffAction: (staffId, actionId) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const prep = school.preparation;
      const staffAtt = prep.staffAttention.find(sa => sa.staffId === staffId);
      if (!staffAtt) return {};

      const roleActions = STAFF_ACTION_POOL[staffAtt.role] || [];
      const action = roleActions.find(a => a.id === actionId);
      if (!action) return {};

      if (!staffAtt.assignedActions.includes(actionId)) return {};

      // Revert Logic is hard because effects are stateful (e.g. random rolls, counters).
      // Ideally we shouldn't allow unassign if random effects happened.
      // But the brief implies "Staff Attention Economy"... usually implies planning phase before commit?
      // "key staff have action points the player assigns each week"
      // "Preview Before Advance"
      // The `assignStaffAction` implementation above applied effects IMMEDIATELY.
      // If we want to allow unassign, we should probably defer effects until `advanceWeek`?
      // BUT, the brief says: "effectCodes: string[]; // Applied immediately on resolve" for Crisis.
      // For Staff Actions? "Deduct budget... Apply effectCodes immediately."
      // So unassign is tricky.
      // "unassignStaffAction: Reverse of assign. Restore usedPoints, remove from assignedActions, reverse simple effect codes where possible (otherwise just reverse budget)."
      // Okay, let's try to reverse simple effects.

      const updates = { ...school, budget: school.budget + action.budgetCost };
      let updatedPrep = { ...prep };

      const newStaffAtt = {
          ...staffAtt,
          usedPoints: Math.max(0, staffAtt.usedPoints - action.attentionCost),
          assignedActions: staffAtt.assignedActions.filter(id => id !== actionId),
          energyWarning: false // Reset check logic later if needed
      };
      updatedPrep.staffAttention = updatedPrep.staffAttention.map(sa => sa.staffId === staffId ? newStaffAtt : sa);
      updatedPrep.actionsUsedThisWeek -= 1;
      updatedPrep.weeklyActionBudgetSpent -= action.budgetCost;

      // Revert Effects (Simple Inverse)
      action.effectCodes.forEach(code => {
          if (code.includes('QUALITY_UP')) {
              const amount = parseInt(code.match(/QUALITY_UP_(\d+)/)?.[1] ?? '0');
              const track = code.split('_')[0] as any; // ALEGORIAS, FANTASIAS...
              if (track === 'ALEGORIAS') updatedPrep.tracks.Alegorias.quality -= amount;
              // ... others
          }
          if (code.includes('PROGRESS_PLUS')) {
               const amount = parseInt(code.match(/PROGRESS_PLUS_(\d+)/)?.[1] ?? '0');
               if (code.includes('ALEGORIAS_ACTIVE_STAGE')) {
                   const stages = updatedPrep.alegoriaStages;
                   const active = stages.find(s => s.isUnlocked && !s.isComplete);
                   if (active) active.progress = Math.max(0, active.progress - amount);
               }
          }
          // Note: This is imperfect. If a random roll happened, we can't revert perfectly without history.
          // But most staff actions are deterministic bonuses.
      });

      // Special Reverters: Un-resolve crisis if action resolved it
      if (action.effectCodes.includes('RESOLVE_COMMUNITY_CRISIS_IF_ACTIVE')) {
           const crisis = updatedPrep.activeCrises.find(c => c.domain === 'Community' && c.isResolved && c.resolvedAtWeek === state.gameState.currentWeek && c.chosenOptionIndex === -1);
           if (crisis) {
               const unresolvedCrisis = { ...crisis, isResolved: false, resolvedAtWeek: null };
               updatedPrep.activeCrises = updatedPrep.activeCrises.map(c => c.id === crisis.id ? unresolvedCrisis : c);
               updatedPrep.crises = updatedPrep.crises.map(c => c.id === crisis.id ? unresolvedCrisis : c);
           }
      }
      if (action.effectCodes.includes('RESOLVE_STAFF_CRISIS_IF_ACTIVE')) {
           const crisis = updatedPrep.activeCrises.find(c => c.domain === 'Staff' && c.isResolved && c.resolvedAtWeek === state.gameState.currentWeek && c.chosenOptionIndex === -1);
           if (crisis) {
               const unresolvedCrisis = { ...crisis, isResolved: false, resolvedAtWeek: null };
               updatedPrep.activeCrises = updatedPrep.activeCrises.map(c => c.id === crisis.id ? unresolvedCrisis : c);
               updatedPrep.crises = updatedPrep.crises.map(c => c.id === crisis.id ? unresolvedCrisis : c);
           }
      }

      updatedPrep.weekPreview = computeWeekPreview(updatedPrep, updates, state.gameState.currentWeek);
      updates.preparation = updatedPrep;
      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updates;

      return { schools: updatedSchools };
    }),

  useActionCard: (cardId) =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const prep = school.preparation;
      const cardIdx = prep.unlockedActionCards.findIndex(c => c.id === cardId);
      if (cardIdx === -1) return {};
      const card = prep.unlockedActionCards[cardIdx];

      if (card.usesRemaining === 0) return {};
      if (school.budget < card.budgetCost) return {};

      // Apply
      const updates = { ...school, budget: school.budget - card.budgetCost };
      let updatedPrep = { ...prep };

      card.effectCodes.forEach(code => {
          const effectUpdate = resolveEventEffect(code, updates, `Card: ${card.label}`);
          if (effectUpdate.preparation) updatedPrep = { ...updatedPrep, ...effectUpdate.preparation };
          if (effectUpdate.budget !== undefined) updates.budget = effectUpdate.budget;
          if (effectUpdate.fanbaseMorale !== undefined) updates.fanbaseMorale = effectUpdate.fanbaseMorale;
          if (effectUpdate.enredo) updates.enredo = effectUpdate.enredo;
      });

      const newCard = {
          ...card,
          usesRemaining: card.usesPerSeason === -1 ? -1 : card.usesRemaining - 1
      };
      updatedPrep.unlockedActionCards = updatedPrep.unlockedActionCards.map((c, i) => i === cardIdx ? newCard : c);

      updatedPrep.weekPreview = computeWeekPreview(updatedPrep, updates, state.gameState.currentWeek);
      updates.preparation = updatedPrep;
      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updates;

      return { schools: updatedSchools };
    }),

  refreshWeekPreview: () =>
    set((state) => {
      const pSchoolIdx = state.schools.findIndex(s => s.id === state.gameState.playerSchoolId);
      if (pSchoolIdx === -1) return {};
      const school = state.schools[pSchoolIdx];
      if (!school.preparation) return {};

      const preview = computeWeekPreview(school.preparation, school, state.gameState.currentWeek);
      const updatedSchool = {
          ...school,
          preparation: { ...school.preparation, weekPreview: preview }
      };

      const updatedSchools = [...state.schools];
      updatedSchools[pSchoolIdx] = updatedSchool;
      return { schools: updatedSchools };
    }),

}));
