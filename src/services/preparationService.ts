import {
  School,
  PreparationState,
  ProductionTrack,
  TrackState,
  BateriaState,
  StaffStress,
  PreparationEvent,
  StageEvent,
  AlegoriaStage,
  AlegoriaStageId,
  PassistasState,
  MSPBState,
  ComissaoDeFrenteState,
  HarmoniaState,
  FantasiaState,
  EventSeverity,
  EventDomain,
  CrisisCard,
  StaffRole,
  ProductionCard,
  EnredoProductionEffects,
  WeekTurnState,
  TurnPreview,
  TrackPreview,
  BateriaPreview,
  HarmoniaPreview,
  FinancePreview,
  StaffPreview,
  CrisisPreviewItem,
  PreviewAlert,
  BaselinePreview,
  Enredo
} from '../types/models';

import {
  RECOMMENDED_BURN,
  WEEKLY_RECOMMENDED_SPEND,
  calculateRangeWidth,
  estimatedAlegoriaProgressPerWeek,
  calculateTrackQuality
} from './legacyPreparationUtils';

// --- 1. ENREDO EFFECTS ---

export function computeEnredoEffects(enredo: Enredo, school: School): EnredoProductionEffects {
  let complexityTier: EnredoProductionEffects['complexityTier'] = 'Simples';
  if (enredo.complexity >= 81) complexityTier = 'Enciclopedico';
  else if (enredo.complexity >= 61) complexityTier = 'Profundo';
  else if (enredo.complexity >= 31) complexityTier = 'Moderado';

  let difficultyTier: EnredoProductionEffects['difficultyTier'] = 'Normal';
  if (enredo.difficulty >= 81) difficultyTier = 'QuaseImpossivel';
  else if (enredo.difficulty >= 61) difficultyTier = 'Abstrato';
  else if (enredo.difficulty <= 30) difficultyTier = 'Facil';

  let alegoriaMinPPBonus = 0;
  let fantasiaMinPPBonus = 0;
  let crisisChanceBonus = 0;
  let enredoCeilingBonus = 0;

  // Complexity Logic
  if (complexityTier === 'Moderado') {
    crisisChanceBonus = 0.10;
  } else if (complexityTier === 'Profundo') {
    alegoriaMinPPBonus = 1;
    fantasiaMinPPBonus = 1;
    crisisChanceBonus = 0.15;
  } else if (complexityTier === 'Enciclopedico') {
    alegoriaMinPPBonus = 1;
    fantasiaMinPPBonus = 1;
    crisisChanceBonus = 0.20;
    enredoCeilingBonus = 5;
  }

  // Difficulty Logic
  let alegoriaMult = 1.0;
  let fantasiaMult = 1.0;

  if (difficultyTier === 'Facil') {
    alegoriaMult = 1.15;
    fantasiaMult = 1.10;
  } else if (difficultyTier === 'Abstrato') {
    alegoriaMult = 0.85;
    fantasiaMult = 0.90;
  } else if (difficultyTier === 'QuaseImpossivel') {
    alegoriaMult = 0.75;
    fantasiaMult = 0.80;
    // Mitigation: High creativity carnavalesco halves the penalty
    const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
    if (carnavalesco && carnavalesco.skills.criatividade >= 160) {
      alegoriaMult = 0.875; // 0.75 + (0.25/2)
      fantasiaMult = 0.90; // 0.80 + (0.20/2)
    }
  }

  // Controversy Logic
  let communityChanceBonus = 0;
  if (enredo.controversy > 50) communityChanceBonus = 0.15;

  // Appeal Logic
  let appealMoraleEffect = 0;
  if (enredo.appeal > 70) appealMoraleEffect = 1;
  else if (enredo.appeal < 30) appealMoraleEffect = -2;

  return {
    complexityTier,
    difficultyTier,
    alegoriaMinPPBonus,
    fantasiaMinPPBonus,
    alegoriaDifficultyMult: alegoriaMult,
    fantasiaDifficultyMult: fantasiaMult,
    crisisChanceBonus,
    communityChanceBonus,
    appealMoraleEffect,
    exclusiveCrisisIds: [], // Populated by specific logic if needed
    enredoCeilingBonus
  };
}

// --- 2. PP CALCULATION ---

export function computePP(school: School, prep: PreparationState): WeekTurnState {
  const base = 10;

  // Staff Bonus
  let staffBonus = 0;
  const keyRoles = ['Carnavalesco', 'MestreDeBateria', 'DiretorDeHarmonia', 'MestreDeBarracao'];
  let totalContribution = 0;

  keyRoles.forEach(role => {
    const member = school.staff.find(s => s.role === role);
    if (member) {
      let avg = 0;
      if (role === 'Carnavalesco') avg = (member.skills.criatividade + member.skills.plastica) / 2;
      else if (role === 'MestreDeBateria') avg = (member.skills.ritmica + member.skills.lideranca) / 2;
      else if (role === 'DiretorDeHarmonia') avg = (member.skills.logistica + member.skills.lideranca) / 2;
      else if (role === 'MestreDeBarracao') avg = (member.skills.logistica + member.skills.gestaoDeRecursos) / 2;

      totalContribution += Math.floor(avg / 50); // 0, 1, 2, 3, 4
    }
  });
  staffBonus = Math.min(6, Math.floor(totalContribution / 2));

  // Morale Bonus
  let moraleBonus = 0;
  if (school.fanbaseMorale >= 95) moraleBonus = 2;
  else if (school.fanbaseMorale >= 80) moraleBonus = 1;
  else if (school.fanbaseMorale < 30) moraleBonus = -1;

  // Archetype Bonus
  const archetypeBonus = school.archetype === 'Potencia' ? 1 : 0;

  // Burnout Penalty
  let burnoutPenalty = 0;
  prep.staffStress.forEach(s => {
    if (s.stressLevel >= 90) burnoutPenalty -= 1;
  });

  // Crisis Penalty
  const activeUnresolved = prep.activeCrises.filter(c => !c.isResolved).length;
  const crisisPenalty = Math.max(-2, -Math.min(activeUnresolved, 2));

  const totalPP = Math.max(4, base + staffBonus + moraleBonus + archetypeBonus + burnoutPenalty + crisisPenalty);

  const maxCards = school.archetype === 'Guerreira' ? 3 : 2;

  return {
    totalPP,
    ppBreakdown: {
      base,
      staffBonus,
      moraleBonus,
      archetypeBonus,
      burnoutPenalty,
      crisisPenalty
    },
    allocations: {
      Alegorias: 0,
      Fantasias: 0,
      Bateria: 0,
      Harmonia: 0
    },
    crisisAllocations: {},
    activeCards: [],
    maxCards,
    isConfirmed: false
  };
}

// --- 3. TRACK MINIMUMS ---

export function computeTrackMinimums(prep: PreparationState, currentWeek: number, school: School): Record<ProductionTrack, number> {
  const ef = prep.enredoEffects;
  let act = 1;
  if (currentWeek >= 23) act = 2;
  if (currentWeek >= 37) act = 3;

  const mins: Record<ProductionTrack, number> = {
    Alegorias: 0, Fantasias: 0, Bateria: 0, Harmonia: 0
  };

  if (act === 1) {
    mins.Alegorias = 2 + ef.alegoriaMinPPBonus;
    mins.Fantasias = 1 + ef.fantasiaMinPPBonus;
    mins.Bateria = 1;
    mins.Harmonia = 1;
  } else if (act === 2) {
    mins.Alegorias = 3 + ef.alegoriaMinPPBonus;
    mins.Fantasias = 2 + ef.fantasiaMinPPBonus;
    mins.Bateria = 1;
    mins.Harmonia = 2;
  } else {
    mins.Alegorias = 3 + ef.alegoriaMinPPBonus;
    mins.Fantasias = 2 + ef.fantasiaMinPPBonus;
    mins.Bateria = 2;
    mins.Harmonia = 2;
  }

  // Completed tracks need 0
  if (prep.tracks.Alegorias.progress >= 100) mins.Alegorias = 0;
  if (prep.tracks.Fantasias.progress >= 100) mins.Fantasias = 0;

  // Revelacao Bonus
  if (school.archetype === 'Revelacao') {
    // Reduce highest non-zero min by 1
    const sorted = Object.entries(mins).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] > 0) {
      mins[sorted[0][0] as ProductionTrack] -= 1;
    }
  }

  return mins;
}

// --- 4. MONEY PER PP ---

export function computeMoneyPerPP(division: string): number {
  const map: Record<string, number> = {
    'Grupo Especial': 8000,
    'Série Ouro': 2000,
    'Série Prata': 600,
    'Série Bronze': 200,
    'Grupo de Avaliação': 50
  };
  return map[division] || 50;
}

// --- 5. STAFF MULTIPLIERS ---

export function computeStaffMultipliers(school: School, prep: PreparationState): Record<ProductionTrack, { qualityMult: number; progressMult: number }> {
  const getMultiplier = (role: string, skillValue: number) => {
    const staff = school.staff.find(s => s.role === role);
    if (!staff) return 0.7; // Missing staff penalty

    // Stress check
    const stress = prep.staffStress.find(ss => ss.staffId === staff.id)?.stressLevel || 0;
    if (stress >= 90) return 0.8;
    if (stress >= 70) return 1.0; // Negates bonus

    if (skillValue >= 150) return 1.4;
    if (skillValue >= 100) return 1.2;
    if (skillValue >= 50) return 1.0;
    return 0.8;
  };

  const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
  const barracao = school.staff.find(s => s.role === 'MestreDeBarracao');
  const mestre = school.staff.find(s => s.role === 'MestreDeBateria');
  const harmonia = school.staff.find(s => s.role === 'DiretorDeHarmonia');

  // Alegorias
  const alegQual = getMultiplier('Carnavalesco', carnavalesco ? carnavalesco.skills.criatividade : 0);
  const alegProg = getMultiplier('MestreDeBarracao', barracao ? (barracao.skills.logistica + barracao.skills.gestaoDeRecursos)/2 : 0);

  // Fantasias (Secondary influence -> reduced bonus)
  const fantQualBase = getMultiplier('Carnavalesco', carnavalesco ? carnavalesco.skills.plastica : 0);
  // Halve the bonus/penalty deviation from 1.0
  const fantQual = 1.0 + (fantQualBase - 1.0) * 0.5;
  const fantProg = 1.0; // Standard progress

  // Bateria
  const batMult = getMultiplier('MestreDeBateria', mestre ? (mestre.skills.ritmica + mestre.skills.lideranca)/2 : 0);

  // Harmonia
  const harmMult = getMultiplier('DiretorDeHarmonia', harmonia ? (harmonia.skills.logistica + harmonia.skills.lideranca)/2 : 0);

  return {
    Alegorias: { qualityMult: alegQual, progressMult: alegProg },
    Fantasias: { qualityMult: fantQual, progressMult: fantProg },
    Bateria: { qualityMult: batMult, progressMult: batMult }, // Reused for form
    Harmonia: { qualityMult: harmMult, progressMult: harmMult }
  };
}

// --- 6. CALCULATE TURN PREVIEW (CORE) ---

export function calculateTurnPreview(school: School, turnState: WeekTurnState, currentWeek: number): TurnPreview {
  const prep = school.preparation!;
  const minimums = computeTrackMinimums(prep, currentWeek, school);
  const multipliers = computeStaffMultipliers(school, prep);
  const moneyPerPP = prep.tracks.Alegorias.moneyPerPP; // All tracks same cost base

  const tracksPreview: Record<ProductionTrack, TrackPreview> = {} as any;
  const alertList: PreviewAlert[] = [];

  let totalSpent = 0;

  // --- A. TRACKS ---
  const trackKeys: ProductionTrack[] = ['Alegorias', 'Fantasias', 'Bateria', 'Harmonia'];

  trackKeys.forEach(track => {
    const alloc = turnState.allocations[track];
    const min = minimums[track];
    const current = prep.tracks[track];
    const mult = multipliers[track];
    const extra = Math.max(0, alloc - min);

    // Apply Card Effects
    let qualityMultCard = 1.0;
    let progressMultCard = 1.0;
    let bypassMin = false;

    // Check active cards in turnState
    turnState.activeCards.forEach(cardId => {
      const card = prep.productionCards.find(c => c.id === cardId);
      card?.effects.forEach(eff => {
        if (eff.target === track) {
          if (eff.type === 'MULTIPLY_QUALITY') qualityMultCard *= eff.value;
          if (eff.type === 'MULTIPLY_PROGRESS') progressMultCard *= eff.value;
          if (eff.type === 'BYPASS_MINIMUM') bypassMin = true;
        }
      });
    });

    const effectiveMin = bypassMin ? 0 : min;

    // Cost
    let cost = alloc * moneyPerPP;
    turnState.activeCards.forEach(cardId => {
       const card = prep.productionCards.find(c => c.id === cardId);
       card?.effects.forEach(eff => {
           if (eff.type === 'MONEY_SAVE') cost *= (1 - eff.value);
       });
    });
    totalSpent += cost;

    // Progress & Quality Logic (Alegorias & Fantasias)
    if (track === 'Alegorias' || track === 'Fantasias') {
        let progDelta = 0;
        let qualDelta = 0;
        let isDecaying = false;

        if (alloc < effectiveMin) {
            qualDelta = -2; // Neglect
        } else {
            // Progress
            const baseProg = 3;
            const extraProg = extra * 3;
            progDelta = (baseProg + extraProg) * mult.progressMult * progressMultCard;

            // Quality
            if (alloc === effectiveMin) {
                qualDelta = -0.5; // Maintenance decay
                isDecaying = true;
            } else {
                // New Quality Curve
                let rawGain = extra * 2.5 * mult.qualityMult * prep.enredoEffects.alegoriaDifficultyMult * qualityMultCard;
                if (track === 'Fantasias') rawGain *= prep.enredoEffects.fantasiaDifficultyMult;

                qualDelta = Math.min(8, rawGain);

                // Diminishing returns near 100
                if (current.quality >= 90) qualDelta *= 0.6;
                else if (current.quality >= 80) qualDelta *= 0.8;
            }
        }

        const progAfter = Math.min(100, current.progress + progDelta);
        const qualAfter = Math.max(0, Math.min(100, current.quality + qualDelta));

        // Completion Estimate
        let compWeek: number | null = null;
        if (progAfter >= 100) compWeek = currentWeek;
        else if (progDelta > 0) {
            const weeksLeft = Math.ceil((100 - progAfter) / progDelta);
            compWeek = currentWeek + weeksLeft;
        }

        tracksPreview[track] = {
            progressBefore: current.progress,
            progressAfter: progAfter,
            progressDelta: progDelta,
            qualityBefore: current.quality,
            qualityAfter: qualAfter,
            qualityDelta: qualDelta,
            completionWeek: compWeek,
            deadlineWeek: 44, // Hardcoded for now
            isOnSchedule: compWeek ? compWeek <= 40 : false,
            isDecaying
        };

        if (qualDelta < 0 && alloc >= effectiveMin) {
             alertList.push({ type: 'warning', message: `Qualidade de ${track} estagnada (apenas manutenção)`, track });
        }
    }
  });

  // --- B. BATERIA ---
  const batAlloc = turnState.allocations.Bateria;
  const batMin = minimums.Bateria;
  const batMult = multipliers.Bateria;
  const batExtra = Math.max(0, batAlloc - batMin);
  const batState = prep.bateria;

  let formDelta = 0;
  let energyDelta = 0;
  let isOvertraining = false;

  if (batAlloc < batMin) {
      formDelta = -3;
      energyDelta = 5;
  } else if (batAlloc === batMin) {
      formDelta = 0;
      energyDelta = -2;
  } else {
      const formGain = batExtra * 3.5 * batMult.qualityMult;
      formDelta = Math.min(10, formGain);
      energyDelta = -(2 + batExtra * 2);

      // Peak maintenance penalty
      if (batState.form >= 95) energyDelta *= 1.5;

      // Exhaustion checks
      if (batState.energy + energyDelta < 20) {
          formDelta *= 0.5;
          alertList.push({ type: 'warning', message: 'Bateria exausta: ganho de forma reduzido', track: 'Bateria' });
      }
      if (batState.energy + energyDelta <= 0) {
          formDelta = -5; // Collapse
          alertList.push({ type: 'danger', message: 'Bateria em colapso! Energia zerada.', track: 'Bateria' });
      }
  }

  const formAfter = Math.max(0, Math.min(100, batState.form + formDelta));
  const energyAfter = Math.max(0, Math.min(100, batState.energy + energyDelta));

  // Overtraining heuristic: > 4 PP allocated?
  if (batAlloc > 4) isOvertraining = true;

  const bateriaPreview: BateriaPreview = {
      formBefore: batState.form,
      formAfter,
      formDelta,
      energyBefore: batState.energy,
      energyAfter,
      energyDelta,
      weeksUntilExhaustion: energyDelta < 0 ? Math.floor(batState.energy / Math.abs(energyDelta)) : null,
      isOvertraining
  };

  // Mock TrackPreview for Bateria to satisfy type
  tracksPreview.Bateria = {
      progressBefore: 0, progressAfter: 0, progressDelta: 0,
      qualityBefore: batState.form, qualityAfter: formAfter, qualityDelta: formDelta,
      completionWeek: null, deadlineWeek: 44, isOnSchedule: true, isDecaying: formDelta < 0
  };


  // --- C. HARMONIA ---
  const harmAlloc = turnState.allocations.Harmonia;
  const harmMin = minimums.Harmonia;
  const harmMult = multipliers.Harmonia;
  const harmExtra = Math.max(0, harmAlloc - harmMin);
  const harmState = prep.harmoniaState;

  let sambaDelta = 0, marchaDelta = 0, vocalDelta = 0;
  let baseGain = harmAlloc >= harmMin ? 2 : 0; // Maintenance base

  // Distribution weights
  let wS = 0.33, wM = 0.33, wV = 0.33;
  if (harmState.diretorFocus === 'Samba') { wS = 0.6; wM = 0.2; wV = 0.2; }
  else if (harmState.diretorFocus === 'Marcha') { wS = 0.2; wM = 0.6; wV = 0.2; }
  else if (harmState.diretorFocus === 'Vocal') { wS = 0.2; wM = 0.2; wV = 0.6; }

  const extraGainTotal = harmExtra * 6 * harmMult.qualityMult; // 2.0 per extra PP distributed

  sambaDelta = baseGain + extraGainTotal * wS;
  marchaDelta = baseGain + extraGainTotal * wM;
  vocalDelta = baseGain + extraGainTotal * wV;

  // Card Effects for Harmonia
  turnState.activeCards.forEach(cardId => {
      const card = prep.productionCards.find(c => c.id === cardId);
      card?.effects.forEach(eff => {
          if (eff.target === 'Harmonia' && eff.type === 'MULTIPLY_QUALITY') {
              sambaDelta *= eff.value;
              marchaDelta *= eff.value;
              vocalDelta *= eff.value;
          }
      });
  });

  const harmoniaPreview: HarmoniaPreview = {
      sambaFixadoBefore: harmState.sambaFixado,
      sambaFixadoAfter: Math.min(100, harmState.sambaFixado + sambaDelta),
      marchaBefore: harmState.marchaSincronizada,
      marchaAfter: Math.min(100, harmState.marchaSincronizada + marchaDelta),
      vocalBefore: harmState.densidadeVocal,
      vocalAfter: Math.min(100, harmState.densidadeVocal + vocalDelta),
      cardEffectDescription: null
  };

  // Mock TrackPreview for Harmonia
  const avgHarmBefore = (harmState.sambaFixado + harmState.marchaSincronizada + harmState.densidadeVocal) / 3;
  const avgHarmAfter = (harmoniaPreview.sambaFixadoAfter + harmoniaPreview.marchaAfter + harmoniaPreview.vocalAfter) / 3;
  tracksPreview.Harmonia = {
      progressBefore: 0, progressAfter: 0, progressDelta: 0,
      qualityBefore: avgHarmBefore, qualityAfter: avgHarmAfter, qualityDelta: avgHarmAfter - avgHarmBefore,
      completionWeek: null, deadlineWeek: 44, isOnSchedule: true, isDecaying: false
  };


  // --- D. FINANCE ---
  // Add crisis costs
  Object.values(turnState.crisisAllocations).forEach(ca => {
      const crisis = prep.activeCrises.find(c => c.options[ca.optionIndex]); // Need logic to find crisis by ID... tricky without ID in Alloc
      // Alloc is Record<string, ...>. Key is crisisId.
  });
  // Iterating crisisAllocations keys
  Object.entries(turnState.crisisAllocations).forEach(([cid, alloc]) => {
      const crisis = prep.activeCrises.find(c => c.id === cid);
      if (crisis) {
          totalSpent += crisis.options[alloc.optionIndex].budgetCost;
      }
  });

  // Add card costs
  turnState.activeCards.forEach(cid => {
      const card = prep.productionCards.find(c => c.id === cid);
      if (card) totalSpent += card.budgetCost;
  });

  const budgetAfter = school.budget - totalSpent;
  const runway = totalSpent > 0 ? budgetAfter / totalSpent : 99;

  const financePreview: FinancePreview = {
      budgetBefore: school.budget,
      spendThisTurn: totalSpent,
      budgetAfter,
      weeksUntilParade: prep.weeksUntilParade,
      avgBurnPerWeek: totalSpent, // Rough estimate
      weeksOfRunway: runway,
      isDangerous: runway < prep.weeksUntilParade
  };

  if (financePreview.isDangerous) {
      alertList.push({ type: 'danger', message: 'Orçamento não dura até o desfile neste ritmo!' });
  }

  // --- E. STAFF STRESS ---
  const staffPreviews: StaffPreview[] = [];
  prep.staffStress.forEach(ss => {
      const member = school.staff.find(s => s.id === ss.staffId);
      if (!member) return;

      let delta = 3; // Base
      // Check track responsibility
      const roleMap: Record<StaffRole, ProductionTrack | null> = {
          Carnavalesco: 'Alegorias',
          MestreDeBarracao: 'Alegorias', // Simplified mapping
          MestreDeBateria: 'Bateria',
          DiretorDeHarmonia: 'Harmonia',
          DiretorDeCarnaval: 'Fantasias',
          // Others ignore
          Interprete: null, MestreSala: null, PortaBandeira: null, RainhaDeBateria: null, Coreografo: null
      };

      const track = roleMap[member.role];
      if (track) {
          const alloc = turnState.allocations[track];
          const min = minimums[track];
          if (alloc > min) delta += 2;
          if (alloc > min + 3) delta += 2; // +4 total
      }

      if (ss.stressLevel >= 90) delta = 1; // Cap accumulation if broken

      // Reduce stress card
      turnState.activeCards.forEach(cid => {
          const card = prep.productionCards.find(c => c.id === cid);
          card?.effects.forEach(eff => {
              if (eff.type === 'REDUCE_STRESS' && eff.staffRole === member.role) {
                  delta -= eff.value;
              }
          });
      });

      const after = Math.max(0, Math.min(100, ss.stressLevel + delta));
      staffPreviews.push({
          staffId: ss.staffId,
          name: member.name,
          role: member.role,
          stressBefore: ss.stressLevel,
          stressAfter: after,
          stressDelta: delta,
          bonusActive: after < 70,
          bonusDescription: after < 70 ? 'Bônus Ativo' : 'Sem Bônus',
          warningThreshold: after >= 70,
          burnoutThreshold: after >= 90
      });

      if (after >= 90) alertList.push({ type: 'danger', message: `${member.name} está em risco de Burnout!` });
  });

  // --- F. CRISES ---
  const crisisPreviews: CrisisPreviewItem[] = [];
  prep.activeCrises.filter(c => !c.isResolved).forEach(c => {
      const alloc = turnState.crisisAllocations[c.id];
      if (alloc) {
          const opt = c.options[alloc.optionIndex];
          crisisPreviews.push({
              crisisId: c.id,
              title: c.title,
              isBeingResolved: true,
              ppCost: opt.ppCost,
              moneyCost: opt.budgetCost,
              resolutionEffectText: "Resolvendo...",
              ignoreEffectText: "",
              turnsUntilExpiry: c.expiresAtWeek - currentWeek
          });
      } else {
          crisisPreviews.push({
              crisisId: c.id,
              title: c.title,
              isBeingResolved: false,
              ppCost: 0,
              moneyCost: 0,
              resolutionEffectText: "",
              ignoreEffectText: c.inactionConsequence,
              turnsUntilExpiry: c.expiresAtWeek - currentWeek
          });
      }
  });

  // --- G. BASELINE (Minimal) ---
  // Simplified baseline
  const baseline: BaselinePreview = {
      tracks: {
          Alegorias: { progressDelta: 3, qualityDelta: -0.5 },
          Fantasias: { progressDelta: 3, qualityDelta: -0.5 },
          Bateria: { progressDelta: 0, qualityDelta: 0 },
          Harmonia: { progressDelta: 0, qualityDelta: 0 }
      },
      totalCost: 0
  };

  return {
      tracks: tracksPreview,
      bateria: bateriaPreview,
      harmonia: harmoniaPreview,
      finance: financePreview,
      staff: staffPreviews,
      crises: crisisPreviews,
      alerts: alertList,
      baselineComparison: baseline
  };
}

// --- 7. CONFIRM TURN (REPLACES TICK) ---

export function confirmTurn(school: School, turnState: WeekTurnState, currentWeek: number): { updatedSchool: School; newsItems: string[] } {
  const prep = school.preparation!;
  const preview = calculateTurnPreview(school, turnState, currentWeek);
  const news: string[] = [];

  // 1. Apply Tracks
  (['Alegorias', 'Fantasias', 'Harmonia', 'Bateria'] as ProductionTrack[]).forEach(track => {
      const p = preview.tracks[track];
      // Update state
      prep.tracks[track].progress = p.progressAfter;
      prep.tracks[track].quality = p.qualityAfter;
      prep.tracks[track].budgetAllocated += (turnState.allocations[track] * prep.tracks[track].moneyPerPP); // Approx
  });

  // 2. Apply Bateria Specifics
  prep.bateria.form = preview.bateria.formAfter;
  prep.bateria.energy = preview.bateria.energyAfter;

  // 3. Apply Harmonia Specifics
  prep.harmoniaState.sambaFixado = preview.harmonia.sambaFixadoAfter;
  prep.harmoniaState.marchaSincronizada = preview.harmonia.marchaAfter;
  prep.harmoniaState.densidadeVocal = preview.harmonia.vocalAfter;

  // 4. Apply Staff Stress
  preview.staff.forEach(s => {
      const ss = prep.staffStress.find(stress => stress.staffId === s.staffId);
      if (ss) ss.stressLevel = s.stressAfter;
  });

  // 5. Budget Deduction
  school.budget = preview.finance.budgetAfter;
  prep.totalBudgetSpent += preview.finance.spendThisTurn;

  // 6. Crisis Resolution
  Object.entries(turnState.crisisAllocations).forEach(([cid, alloc]) => {
      const crisis = prep.activeCrises.find(c => c.id === cid);
      if (crisis) {
          const opt = crisis.options[alloc.optionIndex];
          // Apply effects
          opt.effectCodes.forEach(code => {
              const res = resolveEventEffect(code, school, crisis.title);
              // Merge results manually or via helper
              if (res.fanbaseMorale !== undefined) school.fanbaseMorale = res.fanbaseMorale;
              // Other effects... simplified for now as many are specific
          });
          crisis.isResolved = true;
          crisis.resolvedAtWeek = currentWeek;
          news.push(`✅ Crise resolvida: ${crisis.title}`);
      }
  });

  // 7. Deduct Card Uses
  turnState.activeCards.forEach(cid => {
      const card = prep.productionCards.find(c => c.id === cid);
      if (card && card.usesRemaining > 0) {
          card.usesRemaining--;
      }
  });

  // 8. Generate New Crises
  const newCrises = generateCrisesForWeek(prep, school, currentWeek, 1);
  newCrises.forEach(c => {
      prep.crises.push(c);
      prep.activeCrises.push(c);
      news.push(`🔥 Nova Crise: ${c.title}`);
  });

  // 9. Morale Effects from Enredo
  const moraleEffect = prep.enredoEffects.appealMoraleEffect;
  if (moraleEffect !== 0) {
      school.fanbaseMorale = Math.max(0, Math.min(100, school.fanbaseMorale + moraleEffect));
  }

  // 10. Update Act
  if (currentWeek + 1 >= 37) prep.currentAct = 3;
  else if (currentWeek + 1 >= 23) prep.currentAct = 2;

  // 11. Clear Turn State
  prep.currentTurn = null;

  return { updatedSchool: school, newsItems: news };
}

// --- 8. INITIALIZE PREPARATION ---

export function initializePreparationState(school: School): PreparationState {
  const enredoEffects = computeEnredoEffects(school.enredo!, school);
  const moneyPerPP = computeMoneyPerPP(school.currentDivision);

  // Initialize Tracks with Quality Floor
  const initTrack = (track: ProductionTrack): TrackState => {
      // Base quality from staff
      let staffMult = 1.0; // Calc logic or reuse computeStaffMultipliers logic roughly
      // Simplification: use basic logic
      let baseQ = 20;
      if (school.archetype === 'Potencia') baseQ += 5;
      if (enredoEffects.difficultyTier === 'Facil') baseQ += 5;

      return {
          track,
          progress: 0,
          quality: baseQ,
          budgetAllocated: 0,
          ppAllocatedThisWeek: 0,
          ppMinimum: 0, // Set later
          moneyPerPP,
          staffQualityMultiplier: 1.0,
          staffProgressMultiplier: 1.0,
          enredoDifficultyMultiplier: 1.0,
          projectedCompletionWeek: null,
          deadlineWeek: 44,
          carCountBonus: 0
      };
  };

  const prep: PreparationState = {
      tracks: {
          Alegorias: initTrack('Alegorias'),
          Fantasias: initTrack('Fantasias'),
          Bateria: initTrack('Bateria'),
          Harmonia: initTrack('Harmonia')
      },
      bateria: {
          form: 20, energy: 100, peakWeek: null, availabilityThisWeek: 100, outsideGigActive: false, gigIncome: 0, rehearsalsHeld: 0, rehearsalsMissed: 0
      },
      staffStress: school.staff.map(s => ({ staffId: s.id, stressLevel: 0, energy: 100, isResting: false })),
      events: [],
      pendingEvent: null,
      isBiWeekly: true,
      weeksUntilParade: 36,
      totalBudgetSpent: 0,
      majorEventFiredThisSeason: false,
      alegoriaCarCount: null,
      isBankrupt: false,
      bankruptAtWeek: null,
      alegoriaStages: [], // Populate standard
      passistas: school.currentDivision === 'Grupo de Avaliação' ? null : { form: 10, energy: 100, peakWeek: null, rehearsalIntensity: 'Leve', starPassistas: [] },
      mspb: { quimica: 30, preparacao: 0, coreografiaApproach: null, rehearsalsCompleted: 0, ensaioGeralResult: null, mestreStress: 0, pbStress: 0, pbResistenciaFisica: 80 },
      comissaoDeFrente: { approach: null, quality: 0, rehearsalWeeksSpent: 0, isApproachLocked: false },
      harmoniaState: { sambaFixado: 0, marchaSincronizada: 0, densidadeVocal: 0, diretorFocus: 'Equilibrado', conflictWithMestre: false },
      fantasia: { approach: null, designQuality: 0, participationRate: 1, deliveryRisk: 0, budgetSpent: 0 },
      stageEvents: [],
      pendingStageEvent: null,
      consequenceFlags: [],
      enredoEffects,
      currentTurn: null,
      productionCards: generateProductionCards(school, enredoEffects),
      crises: [],
      activeCrises: [],
      currentAct: 1,
      bateriaOptimalMin: 85,
      bateriaOptimalMax: 100
  };

  // Populate Multipliers & Minimums initial
  const mults = computeStaffMultipliers(school, prep);
  Object.keys(prep.tracks).forEach(key => {
      const k = key as ProductionTrack;
      prep.tracks[k].staffQualityMultiplier = mults[k].qualityMult;
      prep.tracks[k].staffProgressMultiplier = mults[k].progressMult;
  });

  return prep;
}

// --- 9. GENERATE CARDS ---

export function generateProductionCards(school: School, enredoEffects: EnredoProductionEffects): ProductionCard[] {
  const cards: ProductionCard[] = [];
  const divisionScale = computeMoneyPerPP(school.currentDivision) / 8000;

  cards.push({
      id: 'mutirao-barracao', label: 'Mutirão no Barracão', description: 'A comunidade se mobiliza. PP em Alegorias rendem 1.5x qualidade esta semana.',
      budgetCost: 10000 * divisionScale, effects: [{ type: 'MULTIPLY_QUALITY', target: 'Alegorias', value: 1.5 }],
      usesPerSeason: 3, usesRemaining: 3, availableFromWeek: 12, availableUntilWeek: 38, unlockedBy: 'always'
  });

  if (school.enredo && (school.enredo.category === 'AfroBrasileiro' || school.enredo.category === 'ComunitarioLocal')) {
      cards.push({
          id: 'conexao-raiz', label: 'Conexão com a Raiz', description: 'O enredo ressoa com a comunidade. PP em Harmonia valem 2x qualidade.',
          budgetCost: 3000 * divisionScale, effects: [{ type: 'MULTIPLY_QUALITY', target: 'Harmonia', value: 2.0 }],
          usesPerSeason: 2, usesRemaining: 2, availableFromWeek: 9, availableUntilWeek: 44, unlockedBy: 'enredo_afrobrasileiro_or_comunitario'
      });
  }

  const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
  if (carnavalesco && carnavalesco.skills.criatividade >= 150) {
      cards.push({
          id: 'inspiracao-carnavalesco', label: 'Golpe de Gênio', description: 'O Carnavalesco tem uma epifania. +20 qualidade em um track à escolha.',
          budgetCost: 0, effects: [{ type: 'MULTIPLY_QUALITY', target: undefined, value: 999 }],
          usesPerSeason: 1, usesRemaining: 1, availableFromWeek: 9, availableUntilWeek: 40, unlockedBy: 'carnavalesco_criatividade_150'
      });
  }

  cards.push({
      id: 'feijoada-beneficente', label: 'Feijoada Beneficente', description: '+3 PP este turno. Bateria gasta 5 energia extra (festa).',
      budgetCost: 5000 * divisionScale, effects: [{ type: 'GENERATE_PP', value: 3 }, { type: 'special:BATERIA_ENERGY_DOWN', value: 5 }],
      usesPerSeason: 4, usesRemaining: 4, availableFromWeek: 9, availableUntilWeek: 40, unlockedBy: 'always'
  });

  cards.push({
      id: 'hora-extra-barracao', label: 'Hora Extra no Barracão', description: '+2 PP. Mestre de Barracão stress +10.',
      budgetCost: 8000 * divisionScale, effects: [{ type: 'GENERATE_PP', value: 2 }],
      usesPerSeason: -1, usesRemaining: -1, availableFromWeek: 9, availableUntilWeek: 44, unlockedBy: 'always'
  });

  if (school.archetype === 'Guerreira') {
      cards.push({
          id: 'gambiarra-criativa', label: 'Gambiarra Criativa', description: 'Fantasias não exigem PP mínimo esta semana. Qualidade cap em 70.',
          budgetCost: 2000 * divisionScale, effects: [{ type: 'BYPASS_MINIMUM', target: 'Fantasias', value: 0 }],
          usesPerSeason: 3, usesRemaining: 3, availableFromWeek: 20, availableUntilWeek: 44, unlockedBy: 'archetype_guerreira'
      });
  }

  cards.push({
      id: 'virada-barracao', label: 'Virada no Barracão', description: 'Alegorias ganha +15% progresso. Se qualidade < 60, perde 5 qualidade.',
      budgetCost: 12000 * divisionScale, effects: [{ type: 'RUSH', target: 'Alegorias', value: 15, qualityThreshold: 60, riskPenalty: 5 }],
      usesPerSeason: 2, usesRemaining: 2, availableFromWeek: 25, availableUntilWeek: 42, unlockedBy: 'always'
  });

  cards.push({
      id: 'retiro-carnavalesco', label: 'Retiro Criativo', description: 'Carnavalesco descansa. Stress -20, mas Alegorias perde -1 qualidade.',
      budgetCost: 3000 * divisionScale, effects: [{ type: 'REDUCE_STRESS', staffRole: 'Carnavalesco', value: 20 }],
      usesPerSeason: 2, usesRemaining: 2, availableFromWeek: 9, availableUntilWeek: 38, unlockedBy: 'always'
  });

  cards.push({
      id: 'ensaio-show', label: 'Ensaio Show na Quadra', description: 'Moral +10. Bateria forma +3, energia -8.',
      budgetCost: 6000 * divisionScale, effects: [{ type: 'MORALE_BOOST', value: 10 }],
      usesPerSeason: 3, usesRemaining: 3, availableFromWeek: 15, availableUntilWeek: 42, unlockedBy: 'always'
  });

  if (school.enredo?.category === 'Patrocinado') {
      cards.push({
          id: 'patrocinio-pontual', label: 'Patrocínio Pontual', description: 'Custo por PP reduzido em 40% esta semana.',
          budgetCost: 0, effects: [{ type: 'MONEY_SAVE', value: 0.4 }],
          usesPerSeason: 1, usesRemaining: 1, availableFromWeek: 9, availableUntilWeek: 44, unlockedBy: 'enredo_patrocinado'
      });
  }

  if (school.enredo && school.enredo.controversy > 50) {
      cards.push({
          id: 'transformar-polemica', label: 'Transformar Polêmica em Arte', description: 'Harmonia +8 qualidade. Só disponível se controversy > 50.',
          budgetCost: 0, effects: [{ type: 'MULTIPLY_QUALITY', target: 'Harmonia', value: 1.8 }],
          usesPerSeason: 2, usesRemaining: 2, availableFromWeek: 20, availableUntilWeek: 44, unlockedBy: 'enredo_controversy_50'
      });
  }

  if (school.enredo && school.enredo.difficulty >= 65) {
      cards.push({
          id: 'simplificar-conceito', label: 'Simplificar o Conceito', description: 'Reduz penalidade de difficulty em 50% permanentemente. Teto de nota -3.',
          budgetCost: 0, effects: [], // Special effect
          usesPerSeason: 1, usesRemaining: 1, availableFromWeek: 9, availableUntilWeek: 30, unlockedBy: 'enredo_difficulty_65'
      });
  }

  return cards;
}

// --- 10. GENERATE CRISES ---

export function generateCrisesForWeek(prep: PreparationState, school: School, currentWeek: number, weeksAdvanced: number): CrisisCard[] {
  // Mock implementation for structure - integrate full CRISIS_POOL
  if (Math.random() > 0.3) return []; // 30% chance

  // Example Crisis
  return [{
      id: `crisis-${Date.now()}`,
      tier: 'Atencao',
      domain: 'Production',
      title: 'Atraso de Material',
      description: 'O fornecedor atrasou.',
      inactionConsequence: 'Perde qualidade',
      inactionEffectCodes: [],
      options: [
          { label: 'Pagar Expresso', description: 'Resolve', budgetCost: 5000, ppCost: 1, staffRequired: null, effectCodes: [] },
          { label: 'Esperar', description: 'Risco', budgetCost: 0, ppCost: 0, staffRequired: null, effectCodes: [] }
      ],
      weekCreated: currentWeek,
      expiresAtWeek: currentWeek + 3,
      isResolved: false,
      resolvedAtWeek: null,
      chosenOptionIndex: null
  }];
}

// --- 11. HELPERS ---

export function getQualityLabel(quality: number): { label: string; color: string } {
  if (quality >= 95) return { label: '★ Nota 10', color: '#FFD700' };
  if (quality >= 85) return { label: 'Competitivo', color: '#2ECC71' };
  if (quality >= 75) return { label: 'Na média', color: '#F39C12' };
  if (quality >= 65) return { label: 'Preocupante', color: '#E67E22' };
  if (quality >= 50) return { label: 'Zona de perigo', color: '#E74C3C' };
  return { label: 'Desastre', color: '#C0392B' };
}

export function resolveEventEffect(
  effectCode: string,
  school: School,
  eventTitle?: string,
  choice?: 'A' | 'B'
): Partial<School> {
  const updates: any = { preparation: school.preparation ? { ...school.preparation } : null };
  // Copy nested objects to avoid mutation reference issues
  if (updates.preparation) {
      updates.preparation.tracks = { ...school.preparation!.tracks };
      updates.preparation.tracks.Alegorias = { ...school.preparation!.tracks.Alegorias };
      updates.preparation.tracks.Fantasias = { ...school.preparation!.tracks.Fantasias };
      updates.preparation.tracks.Harmonia = { ...school.preparation!.tracks.Harmonia };
      updates.preparation.tracks.Bateria = { ...school.preparation!.tracks.Bateria };
      updates.preparation.bateria = { ...school.preparation!.bateria };
      updates.preparation.staffStress = [...school.preparation!.staffStress];
      updates.preparation.fantasia = { ...school.preparation!.fantasia };
      updates.preparation.comissaoDeFrente = { ...school.preparation!.comissaoDeFrente };
      updates.preparation.harmoniaState = { ...school.preparation!.harmoniaState };
      updates.preparation.alegoriaStages = school.preparation!.alegoriaStages.map(s => ({ ...s }));
      if (school.preparation!.mspb) {
          updates.preparation.mspb = { ...school.preparation!.mspb };
      }
  }

  // Split by _AND_ first to handle multiple effects
  const effects = effectCode.split('_AND_');

  for (const part of effects) {
    // --- STAGE EFFECTS ---
    if (part === 'FANTASIA_APPROACH_ALTACOSTURA') updates.preparation.fantasia.approach = 'AltaCostura';
    if (part === 'FANTASIA_APPROACH_INTERMEDIARIA') updates.preparation.fantasia.approach = 'Intermediaria';
    if (part === 'FANTASIA_APPROACH_POPULAR') updates.preparation.fantasia.approach = 'Popular';

    if (part === 'COMISSAO_TRADICIONAL') {
       updates.preparation.comissaoDeFrente.approach = 'Tradicional';
       updates.preparation.comissaoDeFrente.isApproachLocked = true;
       updates.preparation.comissaoDeFrente.quality = 72;
    }
    if (part === 'COMISSAO_TEMATICA') {
       updates.preparation.comissaoDeFrente.approach = 'Tematica';
       updates.preparation.comissaoDeFrente.isApproachLocked = true;
    }
    if (part === 'COMISSAO_IMPACTO') {
       updates.preparation.comissaoDeFrente.approach = 'Impacto';
       updates.preparation.comissaoDeFrente.isApproachLocked = true;
       updates.budget = (school.budget ?? 0) - 12000;
    }
    if (part === 'COMISSAO_EXPERIMENTAL') {
       updates.preparation.comissaoDeFrente.approach = 'Experimental';
       updates.preparation.comissaoDeFrente.isApproachLocked = true;
    }

    if (part === 'MSPB_OUSADA') {
        if (updates.preparation.mspb) {
            updates.preparation.mspb.coreografiaApproach = 'Ousada';
            // Ousada: chemistry must be >= 40 or this backfires
            const quimica = updates.preparation.mspb.quimica;
            if (quimica < 40) {
                updates.preparation.mspb.mestreStress = Math.min(100, updates.preparation.mspb.mestreStress + 20);
                updates.preparation.mspb.pbStress = Math.min(100, updates.preparation.mspb.pbStress + 15);
            }
        }
    }
    if (part === 'MSPB_CLASSICA') {
        if (updates.preparation.mspb) {
            updates.preparation.mspb.coreografiaApproach = 'Classica';
            // Stable, slight quimica boost from mutual comfort
            updates.preparation.mspb.quimica = Math.min(100, updates.preparation.mspb.quimica + 5);
        }
    }
    if (part === 'MSPB_NEGOCIAR') {
        if (updates.preparation.mspb) {
            // Outcome depends on quimica — high chemistry = they land on Ousada, low = Classica
            const quimica = updates.preparation.mspb.quimica;
            updates.preparation.mspb.coreografiaApproach = quimica >= 60 ? 'Ousada' : 'Classica';
            // Always a chemistry boost — the act of deciding together helps
            updates.preparation.mspb.quimica = Math.min(100, quimica + 10);
        }
    }

    if (part.includes('FANTASIAS_QUALITY_DOWN')) {
       const amount = parseInt(part.match(/FANTASIAS_QUALITY_DOWN_(\d+)/)?.[1] ?? '0');
       updates.preparation.fantasia.designQuality = Math.max(0, updates.preparation.fantasia.designQuality - amount);
       // Sync to track
       updates.preparation.tracks.Fantasias.quality = updates.preparation.fantasia.designQuality;
    }

    // Budget effects
    if (part.includes('BUDGET_MINUS')) {
      const match = part.match(/BUDGET_MINUS_(\d+)K/);
      if (match) {
        const amount = parseInt(match[1]) * 1000;
        updates.budget = (school.budget ?? 0) - amount;
      }
      const matchPct = part.match(/BUDGET_MINUS_PCT_(\d+)/);
      if (matchPct) {
         const pct = parseInt(matchPct[1]) / 100;
         updates.budget = Math.floor((school.budget ?? 0) * (1 - pct));
      }
    }
    if (part.includes('BUDGET_PLUS')) {
      const match = part.match(/BUDGET_PLUS_(\d+)K/);
      if (match) {
          const amount = parseInt(match[1]) * 1000;
          updates.budget = (school.budget ?? 0) + amount;
      }
    }
    // Morale effects
    if (part.includes('MORALE_UP')) {
      const amount = parseInt(part.match(/MORALE_UP_(\d+)/)?.[1] ?? '0');
      updates.fanbaseMorale = Math.min(100, (school.fanbaseMorale ?? 50) + amount);
    }
    if (part.includes('MORALE_DOWN')) {
      const amount = parseInt(part.match(/MORALE_DOWN_(\d+)/)?.[1] ?? '0');
      updates.fanbaseMorale = Math.max(0, (school.fanbaseMorale ?? 50) - amount);
    }
    // Track progress effects — if preparation exists
    if (updates.preparation) {
      if (part.includes('ALEGORIAS_PROGRESS_MINUS')) {
        const amount = parseInt(part.match(/ALEGORIAS_PROGRESS_MINUS_(\d+)/)?.[1] ?? '0');
        updates.preparation.tracks.Alegorias.progress = Math.max(0,
          updates.preparation.tracks.Alegorias.progress - amount);
      }
      if (part.includes('ALEGORIAS_QUALITY_DOWN')) {
        const amount = parseInt(part.match(/ALEGORIAS_QUALITY_DOWN_(\d+)/)?.[1] ?? '0');
        updates.preparation.tracks.Alegorias.quality = Math.max(0,
          updates.preparation.tracks.Alegorias.quality - amount);
      }
      if (part.includes('ALEGORIAS_QUALITY_UP')) {
        const amount = parseInt(part.match(/ALEGORIAS_QUALITY_UP_(\d+)/)?.[1] ?? '0');
        updates.preparation.tracks.Alegorias.quality = Math.min(100,
          updates.preparation.tracks.Alegorias.quality + amount);
      }

      if (part.includes('BATERIA_FORM_DOWN')) {
        const amount = parseInt(part.match(/BATERIA_FORM_DOWN_(\d+)/)?.[1] ?? '0');
        updates.preparation.bateria.form = Math.max(0,
          updates.preparation.bateria.form - amount);
      }
      if (part.includes('BATERIA_FORM_UP')) {
        const amount = parseInt(part.match(/BATERIA_FORM_UP_(\d+)/)?.[1] ?? '0');
        updates.preparation.bateria.form = Math.min(100,
          updates.preparation.bateria.form + amount);
      }
      if (part.includes('BATERIA_ENERGY_DOWN')) {
        const amount = parseInt(part.match(/BATERIA_ENERGY_DOWN_(\d+)/)?.[1] ?? '0');
        updates.preparation.bateria.energy = Math.max(0,
          updates.preparation.bateria.energy - amount);
      }
      if (part.includes('HARMONIA_DOWN')) {
        const amount = parseInt(part.match(/HARMONIA_DOWN_(\d+)/)?.[1] ?? '0');
        updates.preparation.tracks.Harmonia.quality = Math.max(0,
          updates.preparation.tracks.Harmonia.quality - amount);
      }
      if (part.includes('HARMONIA_UP')) {
        const amount = parseInt(part.match(/HARMONIA_UP_(\d+)/)?.[1] ?? '0');
        updates.preparation.tracks.Harmonia.quality = Math.min(100,
          updates.preparation.tracks.Harmonia.quality + amount);
      }

      // Progress Loss Effects (Week Equivalents)
      // 1 week ~ 4.5% progress
      if (part.includes('_PROGRESS_LOSE_1WEEK')) {
          ['Alegorias', 'Fantasias', 'Harmonia', 'Bateria'].forEach(t => {
              if (part.includes(t.toUpperCase())) {
                  updates.preparation.tracks[t].progress = Math.max(0, updates.preparation.tracks[t].progress - 4.5);
              }
          });
      }
      if (part.includes('_PROGRESS_LOSE_05WEEK') || part.includes('_PROGRESS_MINUS_HALF_WEEK')) {
          ['Alegorias', 'Fantasias', 'Harmonia', 'Bateria'].forEach(t => {
              if (part.includes(t.toUpperCase())) {
                  updates.preparation.tracks[t].progress = Math.max(0, updates.preparation.tracks[t].progress - 2.25);
              }
          });
      }

      // ALEGORIAS_PAUSE (Assume 1 week loss)
      if (part.includes('ALEGORIAS_PAUSE')) {
          updates.preparation.tracks.Alegorias.progress = Math.max(0, updates.preparation.tracks.Alegorias.progress - 4.5);
      }

      // Burn Rate Cut
      if (part.includes('ALL_TRACKS_BURN_RATE_DOWN_20PCT')) {
          ['Alegorias', 'Fantasias', 'Bateria', 'Harmonia'].forEach(t => {
              const tr = t as ProductionTrack;
              updates.preparation.tracks[tr].weeklyBurnRate = Math.floor(updates.preparation.tracks[tr].weeklyBurnRate * 0.8);
          });
      }

       // Burn Rate Cut 30%
      if (part.includes('ALL_TRACKS_BURN_RATE_DOWN_30PCT')) {
          ['Alegorias', 'Fantasias', 'Bateria', 'Harmonia'].forEach(t => {
              const tr = t as ProductionTrack;
              updates.preparation.tracks[tr].weeklyBurnRate = Math.floor(updates.preparation.tracks[tr].weeklyBurnRate * 0.7);
          });
      }

      // Bankruptcy Trigger
      if (part.includes('TRIGGER_BANKRUPTCY')) {
          updates.preparation.isBankrupt = true;
          if (updates.preparation.weeksUntilParade !== undefined) {
             updates.preparation.bankruptAtWeek = 45 - updates.preparation.weeksUntilParade;
          }
      }

      // Staff Effects
      if (part.includes('CARNAVALESCO_REST')) {
          const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
          if (carnavalesco) {
              const idx = updates.preparation.staffStress.findIndex((s: any) => s.staffId === carnavalesco.id);
              if (idx !== -1) {
                  updates.preparation.staffStress[idx] = { ...updates.preparation.staffStress[idx], isResting: true };
              }
          }
      }

      if (part.includes('STRESS_ALL_UP')) {
          const amount = parseInt(part.match(/STRESS_ALL_UP_(\d+)/)?.[1] ?? '0');
          updates.preparation.staffStress = updates.preparation.staffStress.map((ss: any) => ({
              ...ss,
              stressLevel: Math.min(100, ss.stressLevel + amount)
          }));
      }

      // Enredo Effects
      if (school.enredo) {
          if (part.includes('CONTROVERSY_SCORE_UP')) {
              const amount = parseInt(part.match(/CONTROVERSY_SCORE_UP_(\d+)/)?.[1] ?? '0');
              updates.enredo = { ...school.enredo, controversy: Math.min(100, school.enredo.controversy + amount) };
          }
          if (part.includes('CONTROVERSY_DOWN')) {
              updates.enredo = { ...school.enredo, controversy: Math.max(0, school.enredo.controversy - 10) };
          }
      }

      // --- REDESIGN NEW EFFECTS ---

      // ALEGORIAS STAGES
      if (part.includes('ALEGORIAS_ACTIVE_STAGE_PROGRESS_')) {
          const amount = parseInt(part.match(/ALEGORIAS_ACTIVE_STAGE_PROGRESS_(PLUS|MINUS)_(\d+)/)?.[2] ?? '0');
          const type = part.includes('PLUS') ? 1 : -1;
          const stages = updates.preparation.alegoriaStages as AlegoriaStage[];
          const activeIdx = stages.findIndex(s => s.isUnlocked && !s.isComplete);
          if (activeIdx !== -1) {
              stages[activeIdx].progress = Math.max(0, Math.min(100, stages[activeIdx].progress + amount * type));
          }
      }
      if (part === 'ALEGORIAS_ACABAMENTO_PROGRESS_MINUS_30') {
          const stages = updates.preparation.alegoriaStages as AlegoriaStage[];
          const acabamento = stages.find(s => s.id === 'Acabamento');
          if (acabamento) acabamento.progress = Math.max(0, acabamento.progress - 30);
      }
      if (part === 'ALEGORIAS_CEILING_UP_10') {
          updates.preparation.qualityCeilingBonus = (updates.preparation.qualityCeilingBonus ?? 0) + 10;
      }
      if (part === 'ALEGORIAS_RAIN_GAMBLE_40PCT') {
          if (Math.random() < 0.4) {
              updates.preparation.tracks.Alegorias.quality = Math.max(0, updates.preparation.tracks.Alegorias.quality - 20);
          }
      }
      if (part === 'ALEGORIAS_VISTORIA_PENALTY_FLAG') {
          updates.preparation.consequenceFlags = [...(updates.preparation.consequenceFlags || []), 'alegorias_vistoria_penalty'];
      }

      // FANTASIA
      if (part === 'FANTASIAS_DELIVERY_RISK_RESET') {
          updates.preparation.fantasia.deliveryRisk = 0;
      }
      if (part === 'FANTASIAS_DELIVERY_RISK_DOWN_15') {
          updates.preparation.fantasia.deliveryRisk = Math.max(0, updates.preparation.fantasia.deliveryRisk - 15);
      }
      if (part === 'FANTASIAS_DELIVERY_RISK_UP_20') {
          updates.preparation.fantasia.deliveryRisk = Math.min(100, updates.preparation.fantasia.deliveryRisk + 20);
      }
      if (part === 'FANTASIAS_DELIVERY_RISK_UP_8_PER_WEEK') {
          updates.preparation.fantasia.deliveryRisk = Math.min(100, updates.preparation.fantasia.deliveryRisk + 8);
      }
      if (part === 'FANTASIAS_CEILING_UP_10') {
          // This increases quality ceiling via global bonus or specific logic.
          // Since Fantasia ceiling is derived from Approach, we can hack it by adding to designQuality directly or adding a global bonus.
          // Let's assume it adds to global qualityCeilingBonus which affects everything, or we handle it in advanceFantasia.
          // For simplicity, we add to global qualityCeilingBonus as it seems to be the intent "Action Card: ...eleva o teto".
          // But description says "Qualidade Fantasias +12, eleva o teto".
          // If we add to global, it affects Alegorias too. Let's assume that's acceptable or we add a specific field later.
          // For now, let's boost current quality.
          updates.preparation.qualityCeilingBonus = (updates.preparation.qualityCeilingBonus ?? 0) + 5; // Conservative
      }
      if (part === 'FANTASIAS_QUALITY_UP_12') {
          updates.preparation.fantasia.designQuality = Math.min(100, updates.preparation.fantasia.designQuality + 12);
      }
      if (part === 'FANTASIAS_QUALITY_UP_5') {
          updates.preparation.fantasia.designQuality = Math.min(100, updates.preparation.fantasia.designQuality + 5);
      }

      // STAFF STRESS/ENERGY
      const applyStaffEffect = (role: string, type: 'STRESS' | 'ENERGY', amount: number) => {
          const staff = school.staff.find(s => s.role === role);
          if (staff) {
              const idx = updates.preparation.staffStress.findIndex((s: any) => s.staffId === staff.id);
              if (idx !== -1) {
                  const current = updates.preparation.staffStress[idx];
                  if (type === 'STRESS') {
                      updates.preparation.staffStress[idx].stressLevel = Math.max(0, Math.min(100, current.stressLevel + amount));
                  } else {
                      updates.preparation.staffStress[idx].energy = Math.max(0, Math.min(100, current.energy + amount));
                  }
              }
          }
      };

      if (part.includes('CARNAVALESCO_ENERGY_UP')) applyStaffEffect('Carnavalesco', 'ENERGY', 15);
      if (part.includes('CARNAVALESCO_ENERGY_DOWN')) applyStaffEffect('Carnavalesco', 'ENERGY', -20);
      if (part.includes('CARNAVALESCO_STRESS_DOWN')) applyStaffEffect('Carnavalesco', 'STRESS', -parseInt(part.split('_').pop()!));
      if (part.includes('CARNAVALESCO_STRESS_UP')) applyStaffEffect('Carnavalesco', 'STRESS', parseInt(part.split('_').pop()!));
      if (part === 'CARNAVALESCO_REST_FORCED') {
          // Handled by CARNAVALESCO_REST + ensuring no action
          const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
          if (carnavalesco) {
              const idx = updates.preparation.staffStress.findIndex((s: any) => s.staffId === carnavalesco.id);
              if (idx !== -1) updates.preparation.staffStress[idx].isResting = true;
          }
      }

      if (part.includes('MESTRE_STRESS_UP')) applyStaffEffect('MestreDeBateria', 'STRESS', 10);
      if (part.includes('MESTRE_STRESS_DOWN')) applyStaffEffect('MestreDeBateria', 'STRESS', -10);

      // BATERIA
      if (part === 'BATERIA_AVAILABILITY_DOWN_15') {
          updates.preparation.bateria.availabilityThisWeek = Math.max(0, updates.preparation.bateria.availabilityThisWeek - 15);
      }
      if (part === 'BATERIA_ENERGY_UP_15') {
          updates.preparation.bateria.energy = Math.min(100, updates.preparation.bateria.energy + 15);
      }

      // HARMONIA
      if (part === 'HARMONIA_ALL_DOWN_5') {
          updates.preparation.harmoniaState.sambaFixado = Math.max(0, updates.preparation.harmoniaState.sambaFixado - 5);
          updates.preparation.harmoniaState.marchaSincronizada = Math.max(0, updates.preparation.harmoniaState.marchaSincronizada - 5);
          updates.preparation.harmoniaState.densidadeVocal = Math.max(0, updates.preparation.harmoniaState.densidadeVocal - 5);
      }
      if (part.startsWith('HARMONIA_ALL_UP_')) {
          const amount = parseInt(part.split('_').pop()!);
          updates.preparation.harmoniaState.sambaFixado = Math.min(100, updates.preparation.harmoniaState.sambaFixado + amount);
          updates.preparation.harmoniaState.marchaSincronizada = Math.min(100, updates.preparation.harmoniaState.marchaSincronizada + amount);
          updates.preparation.harmoniaState.densidadeVocal = Math.min(100, updates.preparation.harmoniaState.densidadeVocal + amount);
      }
      if (part === 'HARMONIA_SAMBA_FIXADO_UP_10') updates.preparation.harmoniaState.sambaFixado = Math.min(100, updates.preparation.harmoniaState.sambaFixado + 10);
      if (part === 'HARMONIA_SAMBA_FIXADO_UP_12') updates.preparation.harmoniaState.sambaFixado = Math.min(100, updates.preparation.harmoniaState.sambaFixado + 12);
      if (part === 'HARMONIA_SAMBA_FIXADO_DOWN_15') updates.preparation.harmoniaState.sambaFixado = Math.max(0, updates.preparation.harmoniaState.sambaFixado - 15);
      if (part === 'HARMONIA_MARCHA_UP_8') updates.preparation.harmoniaState.marchaSincronizada = Math.min(100, updates.preparation.harmoniaState.marchaSincronizada + 8);
      if (part === 'HARMONIA_PAUSE_2_WEEKS') {
          updates.preparation.consequenceFlags = [...(updates.preparation.consequenceFlags || []), 'harmonia_paused'];
      }

      // MSPB
      if (part === 'MSPB_QUIMICA_UP_5' && updates.preparation.mspb) {
          updates.preparation.mspb.quimica = Math.min(100, updates.preparation.mspb.quimica + 5);
      }
      if (part === 'MSPB_PREPARACAO_UP_6' && updates.preparation.mspb) {
          updates.preparation.mspb.preparacao = Math.min(100, updates.preparation.mspb.preparacao + 6);
      }
      if (part === 'MSPB_QUIMICA_HIGH_RISK_HIGH_REWARD' && updates.preparation.mspb) {
          if (Math.random() < 0.5) {
              updates.preparation.mspb.quimica = Math.min(100, updates.preparation.mspb.quimica + 15);
          } else {
              updates.preparation.mspb.quimica = Math.max(0, updates.preparation.mspb.quimica - 8);
          }
      }

      // COMISSAO
      if (part === 'COMISSAO_QUALITY_UP_6') {
          updates.preparation.comissaoDeFrente.quality = Math.min(100, updates.preparation.comissaoDeFrente.quality + 6);
      }
      if (part === 'COMISSAO_QUALITY_UP_10_OR_DOWN_8_GAMBLE') {
          if (Math.random() < 0.5) {
              updates.preparation.comissaoDeFrente.quality = Math.min(100, updates.preparation.comissaoDeFrente.quality + 10);
          } else {
              updates.preparation.comissaoDeFrente.quality = Math.max(0, updates.preparation.comissaoDeFrente.quality - 8);
          }
      }

      // INTERPRETE & EXTERNAL
      if (part === 'INTERPRETE_DESFILE_BONUS_10') updates.preparation.consequenceFlags = [...(updates.preparation.consequenceFlags || []), 'interprete_bonus_10'];
      if (part === 'INTERPRETE_GAMBLE_30PCT_AGRAVAMENTO') {
          if (Math.random() < 0.3) {
              updates.preparation.harmoniaState.sambaFixado = Math.max(0, updates.preparation.harmoniaState.sambaFixado - 15);
              updates.preparation.consequenceFlags = [...(updates.preparation.consequenceFlags || []), 'desfile_interprete_risk'];
          }
      }
      if (part === 'DESFILE_INTERPRETE_RISK_FLAG') updates.preparation.consequenceFlags = [...(updates.preparation.consequenceFlags || []), 'desfile_interprete_risk'];
      if (part === 'EXTERNAL_VISTORIA_RESCHEDULED_50PCT') {
          if (Math.random() < 0.5) {
              // Success
          } else {
              updates.preparation.consequenceFlags = [...(updates.preparation.consequenceFlags || []), 'alegorias_vistoria_penalty'];
          }
      }

      // BUDGET EXTRA
      if (part === 'BUDGET_ADVANCE_MINUS_10K_INTEREST') {
          updates.budget = (school.budget ?? 0) + 10000; // Get money now
          updates.preparation.consequenceFlags = [...(updates.preparation.consequenceFlags || []), 'debt_repay_10k']; // Pay later (logic needs to be in tick)
          // Simplified: just add money now, debt logic is implicit or we add a debt mechanic later.
          // For now, let's just give money and assume debt is narrative or implemented elsewhere.
          // Or we can subtract it in 4 weeks via a scheduled event? Too complex for now.
      }
      if (part === 'BUDGET_UNBLOCK_NEXT_WEEK') {
          // Flag to restore budget? Narrative only for now.
      }

      // CRISIS CONTROL
      if (part === 'CRISIS_ESCALATE') {
          // Handled in generateCrises/tick logic if we had a reference to the crisis.
          // But resolveEventEffect is stateless.
          // We rely on the caller to handle escalation if this code is returned?
          // No, this is an *outcome* code.
          // Logic: "Se não resolver, vira Urgente". This is an inaction consequence.
          // In `tickPreparation`, we check `inactionEffectCodes`.
          // If `CRISIS_ESCALATE` is there, we need to find the crisis and escalate it.
          // But `tickPreparation` iterates crises.
          // It's easier if we handle `CRISIS_ESCALATE` specifically in `tickPreparation` loop.
          // But `resolveEventEffect` is called.
          // We can return a flag here?
          // Actually `resolveEventEffect` modifies `school`. We can't modify the crisis object easily here unless we pass it.
          // We'll handle this by ignoring it here and handling it in `tickPreparation` loop special case.
      }

      // META RESOLVE
      if (part === 'RESOLVE_COMMUNITY_CRISIS_IF_ACTIVE') {
          const crisis = updates.preparation.activeCrises.find((c: CrisisCard) => c.domain === 'Community' && !c.isResolved);
          if (crisis) {
              crisis.isResolved = true;
              crisis.resolvedAtWeek = school.preparation?.weeksUntilParade ? 45 - school.preparation.weeksUntilParade : 0;
          }
      }
      if (part === 'RESOLVE_STAFF_CRISIS_IF_ACTIVE') {
          const crisis = updates.preparation.activeCrises.find((c: CrisisCard) => c.domain === 'Staff' && !c.isResolved);
          if (crisis) {
              crisis.isResolved = true;
              crisis.resolvedAtWeek = school.preparation?.weeksUntilParade ? 45 - school.preparation.weeksUntilParade : 0;
          }
      }

      // ENREDO
      if (part === 'ENREDO_RESEARCH_BONUS_5' && updates.enredo) {
          // This should increase the *visible* quality index.
          // We don't have a field for "bonus points" other than hiddenBonus.
          // Let's add to hiddenBonus for now, or potentialScore?
          // PotentialScore is fixed cap.
          // Let's add to hiddenBonus.
          updates.enredo = { ...updates.enredo, hiddenBonus: (updates.enredo.hiddenBonus || 0) + 5 };
      }
      if (part === 'ENREDO_CONTROVERSY_SCORE_UP_15' && updates.enredo) {
          updates.enredo = { ...updates.enredo, controversy: Math.min(100, updates.enredo.controversy + 15) };
      }
      if (part === 'ENREDO_CONTROVERSY_UP_10' && updates.enredo) {
          updates.enredo = { ...updates.enredo, controversy: Math.min(100, updates.enredo.controversy + 10) };
      }
      if (part === 'ENREDO_HIDDEN_RISK_UP_10' && updates.enredo) {
          updates.enredo = { ...updates.enredo, hiddenRisk: Math.min(100, (updates.enredo.hiddenRisk || 0) + 10) };
      }
    }
  }

  // --- CONSEQUENCE SEEDING ---
  if (updates.preparation && eventTitle && choice) {
    const flags = updates.preparation.consequenceFlags ?? [];

    const CONSEQUENCE_SEEDS: Record<string, string> = {
      'Dissidência na Bateria_A':         'ritmistas_pagos',
      'Dissidência na Bateria_B':         'ritmistas_revoltados',
      'Polêmica pública com o enredo_A':  'enredo_defendido',
      'Polêmica pública com o enredo_B':  'enredo_modificado',
      'Barracão precisando de reforma_B': 'risco_chuva_ativo',
      'Proposta de outro evento_A':       'interprete_fez_show',
      'Vender equipamentos_A':            'equipamentos_vendidos',   // from Alerta Vermelho event
      'Patrocinador principal desiste_A': 'novo_patrocinador_buscado',
      'Fornecedor atrasou entrega_A':     'frete_expresso_pago',
    };

    const seedKey = `${eventTitle}_${choice}`;
    const flag = CONSEQUENCE_SEEDS[seedKey];
    if (flag && !flags.includes(flag)) {
      flags.push(flag);
    }
    updates.preparation.consequenceFlags = flags;
  }

  return updates;
}

// Re-export needed legacy functions for now if they are not replaced
export { chooseAlegoriaCarCount, STAFF_ACTION_POOL } from './legacyPreparationUtils';
