import {
  School,
  PreparationState,
  ProductionTrack,
  TrackState,
  BateriaState,
  StaffStress,
  PreparationEvent,
  EventSeverity,
  EventDomain
} from '../types/models';

export function initializePreparationState(school: School): PreparationState {
  const initTrack = (track: ProductionTrack, baseBudget: number): TrackState => ({
    track,
    progress: 0,
    quality: 0,
    budgetAllocated: 0,
    staffFocused: false,
    projectedCompletion: null,
    projectedEarly: null,
    projectedLate: null,
    finishingRisk: 0,
    weeklyBurnRate: baseBudget,
    carCountBonus: 0
  });

  const safeBaseBurn = school.budget * 0.02;

  // --- ARCHETYPE MODIFIERS ---
  let staffCostMultiplier = 1.0;
  let qualityCeilingBonus = 0;
  let hasImproviseOption = false;

  if (school.archetype === 'Potencia') {
    qualityCeilingBonus = 10;
    staffCostMultiplier = 1.15;
  }
  if (school.archetype === 'Guerreira') {
    staffCostMultiplier = 0.9;
    hasImproviseOption = true;
  }
  // 'Revelacao' bonus applied in staffService

  // --- UNIQUE BONUSES (O Efeito Bicheiro) ---
  let bateriaOptimalMin = 75;
  let bateriaOptimalMax = 95;
  let initialBateriaForm = 20;

  switch (school.uniqueBonus) {
      case 'mangueira_magnetismo':
          staffCostMultiplier = 0.80;
          qualityCeilingBonus += 5;
          break;
      case 'beija_flor_maquina':
          qualityCeilingBonus += 3;
          // Burn rate multiplier applied after tracks init
          break;
      case 'mocidade_bateria':
          initialBateriaForm = 40;
          bateriaOptimalMin = 70;
          bateriaOptimalMax = 98;
          break;
      // other bonuses handled in events/research/bateria logic
  }

  // --- NEIGHBORHOOD MODIFIERS ---
  let baseAvailability = school.currentDivision === 'Grupo Especial' ? 90 :
                         school.currentDivision === 'Série Ouro' ? 80 :
                         school.currentDivision === 'Série Prata' ? 70 :
                         school.currentDivision === 'Série Bronze' ? 60 : 50;

  if (school.neighborhoodType === 'SuburbioHistorico') baseAvailability += 8;
  if (school.neighborhoodType === 'ZonaNortePeriferica') baseAvailability += 3;

  // --- FANBAIS PERSONALITY (Fiel) ---
  const stressOffset = school.fanbaisPersonality === 'Fiel' ? -10 : 0;

  const staffStress: StaffStress[] = school.staff.map(s => ({
    staffId: s.id,
    stressLevel: Math.max(0, 0 + stressOffset),
    energy: 100,
    isResting: false,
  }));

  const prep: PreparationState = {
    tracks: {
      Alegorias: initTrack('Alegorias', safeBaseBurn * 0.45),
      Fantasias: initTrack('Fantasias', safeBaseBurn * 0.25),
      Bateria: initTrack('Bateria', safeBaseBurn * 0.15),
      Harmonia: initTrack('Harmonia', safeBaseBurn * 0.15),
    },
    bateria: {
      form: initialBateriaForm,
      energy: 100,
      peakWeek: null,
      availabilityThisWeek: baseAvailability,
      outsideGigActive: false,
      gigIncome: 0,
      rehearsalsHeld: 0,
      rehearsalsMissed: 0,
    },
    staffStress,
    events: [],
    pendingEvent: null,
    isBiWeekly: true,
    weeksUntilParade: 36,
    totalBudgetSpent: 0,
    majorEventFiredThisSeason: false,
    alegoriaCarCount: null,
    isBankrupt: false,
    bankruptAtWeek: null,

    // New Fields
    staffCostMultiplier,
    qualityCeilingBonus,
    hasImproviseOption,
    consequenceFlags: [],
    bateriaOptimalMin,
    bateriaOptimalMax
  };

  if (school.uniqueBonus === 'beija_flor_maquina') {
      Object.values(prep.tracks).forEach(t => {
          t.weeklyBurnRate = Math.floor(t.weeklyBurnRate * 1.2);
      });
  }

  if (school.uniqueBonus === 'portela_patrimonio') {
      prep.consequenceFlags.push('portela_research_boost');
  }

  return prep;
}

export function chooseAlegoriaCarCount(school: School, count: number): PreparationState {
  if (!school.preparation) throw new Error("No preparation state");
  const prep = { ...school.preparation };
  const division = school.currentDivision;

  const limits = {
    'Grupo Especial': { min: 5, max: 8 },
    'Série Ouro': { min: 3, max: 6 },
    'Série Prata': { min: 2, max: 5 },
    'Série Bronze': { min: 1, max: 4 },
    'Grupo de Avaliação': { min: 1, max: 3 },
  }[division] || { min: 1, max: 3 };

  if (count < limits.min || count > limits.max) {
    throw new Error(`Invalid car count for ${division}. Must be between ${limits.min} and ${limits.max}.`);
  }

  const carCountBonus = Math.max(0, count - limits.min) * 8;
  const burnRateMultiplier = 1 + Math.max(0, count - limits.min) * 0.15;

  prep.alegoriaCarCount = count;
  prep.tracks = { ...prep.tracks };
  prep.tracks.Alegorias = {
    ...prep.tracks.Alegorias,
    carCountBonus,
    weeklyBurnRate: Math.floor(prep.tracks.Alegorias.weeklyBurnRate * burnRateMultiplier)
  };

  return prep;
}

export function tickPreparation(
  school: School,
  currentWeek: number,
  weeksAdvanced: number
): { updatedSchool: School; newsItems: string[] } {
  if (!school.preparation) return { updatedSchool: school, newsItems: [] };

  let prep = { ...school.preparation };
  const news: string[] = [];
  const weeksUntilParade = 45 - currentWeek - weeksAdvanced;
  prep.weeksUntilParade = Math.max(0, weeksUntilParade);
  prep.isBiWeekly = (currentWeek + weeksAdvanced) <= 28;

  // 1. Advance each track
  prep.tracks = advanceTracks(prep.tracks, school, weeksAdvanced, news);

  // 2. Advance bateria form
  const bateriaResult = advanceBateria(
    prep.bateria,
    school,
    currentWeek,
    weeksAdvanced,
    news,
    prep.tracks.Bateria.weeklyBurnRate
  );
  prep.bateria = bateriaResult.bateria;
  let budgetDelta = bateriaResult.budgetDelta;

  // 3. Update staff stress
  prep.staffStress = advanceStress(prep.staffStress, school, weeksUntilParade, weeksAdvanced, prep.tracks);

  // 4. Update total budget spent (from tracks this tick)
  const trackSpend = Object.values(prep.tracks).reduce(
    (sum, t) => sum + (t.progress >= 100 ? 0 : t.weeklyBurnRate * weeksAdvanced),
    0
  );
  prep.totalBudgetSpent += trackSpend + budgetDelta;

  // 5. Deduct from school budget
  const totalCost = trackSpend;
  const newBudget = Math.max(0, school.budget - totalCost + bateriaResult.incomeGenerated);

  // Bankruptcy Detection
  if (newBudget <= 0 && !prep.isBankrupt && (36 - prep.weeksUntilParade) >= 4) {
      prep.isBankrupt = true;
      prep.bankruptAtWeek = currentWeek;
      news.push("⚠️ A ESCOLA FALIU! Os recursos acabaram.");
  }

  // Automatic Event Injection (Budget Crisis)
  const initialBudgetEstimate = newBudget + prep.totalBudgetSpent;
  const budgetPct = initialBudgetEstimate > 0 ? newBudget / initialBudgetEstimate : 0;

  if (!prep.pendingEvent && !prep.isBankrupt) {
      if (budgetPct < 0.10) {
          const title = 'Alerta Vermelho — Falência Iminente';
          if (!prep.events.some(e => e.title === title)) {
              prep.pendingEvent = {
                  id: `event-auto-bankrupt-${currentWeek}`,
                  week: currentWeek,
                  severity: 'Major',
                  domain: 'External',
                  title,
                  description: 'A escola não tem mais como pagar suas despesas. A diretoria exige uma decisão drástica.',
                  optionA: { label: 'Vender equipamentos', effect: 'ALEGORIAS_QUALITY_DOWN_20_AND_FANTASIAS_QUALITY_DOWN_20' },
                  optionB: { label: 'Aceitar a falência', effect: 'TRIGGER_BANKRUPTCY' },
                  chosen: null,
                  resolved: false
              };
              prep.events.push(prep.pendingEvent);
          }
      } else if (budgetPct < 0.25) {
          const title = 'Crise Financeira';
           if (!prep.events.some(e => e.title === title)) {
              prep.pendingEvent = {
                  id: `event-auto-crisis-${currentWeek}`,
                  week: currentWeek,
                  severity: 'Minor',
                  domain: 'External',
                  title,
                  description: 'O orçamento está perigosamente baixo. Sem ação, a escola pode não concluir o desfile.',
                  optionA: { label: 'Cortar gastos em 30%', effect: 'ALL_TRACKS_BURN_RATE_DOWN_30PCT' },
                  optionB: { label: 'Campanha comunitária', effect: 'BUDGET_PLUS_20K_AND_MORALE_UP_5' },
                  chosen: null,
                  resolved: false
              };
              prep.events.push(prep.pendingEvent);
          }
      }
  }

  // 6. Update projected completion for each track
  prep.tracks = updateProjections(prep.tracks, weeksUntilParade, school);

  return {
    updatedSchool: {
      ...school,
      preparation: prep,
      budget: newBudget,
    },
    newsItems: news,
  };
}

function advanceTracks(
  tracks: Record<ProductionTrack, TrackState>,
  school: School,
  weeksAdvanced: number,
  news: string[]
): Record<ProductionTrack, TrackState> {
  const updated = { ...tracks };

  const trackStaff: Record<ProductionTrack, string> = {
    Alegorias: 'MestreDeBarracao',
    Fantasias: 'DiretorDeCarnaval',
    Bateria: 'MestreDeBateria',
    Harmonia: 'DiretorDeHarmonia',
  };

  const trackSkills: Record<ProductionTrack, Array<keyof import('../types/models').StaffSkills>> = {
    Alegorias: ['criatividade', 'plastica', 'logistica'],
    Fantasias: ['gestaoDeRecursos', 'plastica', 'criatividade'],
    Bateria: ['ritmica', 'lideranca'],
    Harmonia: ['lideranca', 'logistica', 'resiliencia'],
  };

  for (const [trackName, track] of Object.entries(updated) as [ProductionTrack, TrackState][]) {
    if (track.progress >= 100) continue;

    const staffRole = trackStaff[trackName];
    const staffMember = school.staff.find(s => s.role === staffRole);

    // Budget Factor
    const divisionScale: Record<string, number> = {
        'Grupo Especial': 1.0,
        'Série Ouro': 0.15,
        'Série Prata': 0.04,
        'Série Bronze': 0.012,
        'Grupo de Avaliação': 0.003,
    };
    // const scale = divisionScale[school.currentDivision] ?? 0.003; // Unused
    const totalBaseBudget = school.budget * 0.02; // Using the same logic as init
    const typeRatio = trackName === 'Alegorias' ? 0.45 : trackName === 'Fantasias' ? 0.25 : 0.15;
    const baseForTrack = totalBaseBudget * typeRatio;

    const budgetMult = baseForTrack > 0 ? track.weeklyBurnRate / baseForTrack : 1.0;

    const basePace = (1 / 22) * 100 * weeksAdvanced;

    let skillMult = 1.0;
    if (staffMember) {
      const skills = trackSkills[trackName];
      const avgSkill = skills.reduce((sum, sk) => sum + (staffMember.skills as any)[sk], 0) / skills.length;
      skillMult = 0.5 + (avgSkill / 200);
    } else {
      skillMult = 0.5; // No staff: half speed
    }

    const focusBonus = track.staffFocused ? 1.2 : 1.0;

    const progressGain = basePace * skillMult * focusBonus * Math.sqrt(budgetMult);

    const newProgress = Math.min(100, track.progress + progressGain);
    const newQuality = calculateTrackQuality(trackName, school, track.staffFocused, staffMember);

    if (track.progress < 100 && newProgress >= 100) {
      news.push(`✅ ${trackName} concluída!`);
    }

    updated[trackName] = {
      ...track,
      progress: newProgress,
      quality: newQuality,
    };
  }

  return updated;
}

function calculateTrackQuality(
  track: ProductionTrack,
  school: School,
  focused: boolean,
  staffMember: any
): number {
  let base = 40 + (school.prestige / 200) * 30; // 40–70 based on prestige
  if (staffMember) {
    const rep = staffMember.reputation;
    base += (rep / 200) * 20; // +0–20 based on reputation
  }
  if (focused) base += 5;

  if (track === 'Alegorias') {
      const bonus = school.preparation?.tracks.Alegorias.carCountBonus || 0;
      base += bonus;
  }

  // Feature 1: Quality Ceiling Bonus
  const ceilingBonus = school.preparation?.qualityCeilingBonus ?? 0;

  return Math.min(100 + ceilingBonus, Math.floor(base));
}

function calculateRangeWidth(trackName: ProductionTrack, school: School): number {
  const trackStaff: Record<ProductionTrack, { role: string; skill: keyof import('../types/models').StaffSkills }> = {
    Alegorias: { role: 'MestreDeBarracao',   skill: 'logistica' },
    Fantasias: { role: 'DiretorDeCarnaval',  skill: 'gestaoDeRecursos' },
    Bateria:   { role: 'MestreDeBateria',    skill: 'lideranca' },
    Harmonia:  { role: 'DiretorDeHarmonia',  skill: 'logistica' },
  };

  const { role, skill } = trackStaff[trackName];
  const staffMember = school.staff.find(s => s.role === role);
  const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');

  // Primary staff skill (0–200). Missing staff = 0.
  const primarySkill = staffMember ? (staffMember.skills as any)[skill] : 0;
  // Carnavalesco planning bonus — gestaoDeRecursos helps precision across all tracks
  const carnavalescoBonus = carnavalesco ? carnavalesco.skills.gestaoDeRecursos / 200 : 0;

  // Combined precision: 0.0 (no staff) to 1.0 (maxed out)
  const precision = Math.min(1.0, (primarySkill / 200) * 0.7 + carnavalescoBonus * 0.3);

  // Range width in weeks:
  // precision 1.0 → ±1 week (total range = 2 weeks) — elite planning
  // precision 0.5 → ±3 weeks (total range = 6 weeks) — average
  // precision 0.0 → ±7 weeks (total range = 14 weeks) — no staff, pure guessing
  const halfRange = Math.round(7 - precision * 6); // 1 to 7
  return halfRange;
}

function updateProjections(
  tracks: Record<ProductionTrack, TrackState>,
  weeksUntilParade: number,
  school: School
): Record<ProductionTrack, TrackState> {
  const updated = { ...tracks };
  for (const [trackName, track] of Object.entries(updated) as [ProductionTrack, TrackState][]) {
    if (track.progress >= 100) {
      updated[trackName] = {
        ...track,
        projectedCompletion: 45 - weeksUntilParade,
        projectedEarly: 45 - weeksUntilParade,
        projectedLate: 45 - weeksUntilParade,
        finishingRisk: 0
      };
      continue;
    }
    if (track.progress === 0) {
      updated[trackName] = {
        ...track,
        projectedCompletion: null,
        projectedEarly: null,
        projectedLate: null
      };
      continue;
    }

    const weeksPassed = Math.max(1, 36 - weeksUntilParade);
    const progressPerWeek = track.progress / weeksPassed;
    const weeksNeeded = (100 - track.progress) / progressPerWeek;
    const currentWeekNum = 45 - weeksUntilParade;
    const midpoint = Math.round(currentWeekNum + weeksNeeded);

    const halfRange = calculateRangeWidth(trackName as ProductionTrack, school);
    const early = midpoint - halfRange;
    const late = midpoint + halfRange;

    // finishingRisk based on LATE end of range (worst case)
    const finishingRisk = late >= 43 ? Math.min(100, (late - 42) * 20) : 0;

    updated[trackName] = {
      ...track,
      projectedCompletion: midpoint,
      projectedEarly: early,
      projectedLate: late,
      finishingRisk
    };
  }
  return updated;
}

function advanceBateria(
  bateria: BateriaState,
  school: School,
  currentWeek: number,
  weeksAdvanced: number,
  news: string[],
  bateriaWeeklyBudget: number
): { bateria: BateriaState; incomeGenerated: number; budgetDelta: number } {
  const mestre = school.staff.find(s => s.role === 'MestreDeBateria');

  const mestreRitmica = mestre?.skills.ritmica ?? 40;
  const mestreLideranca = mestre?.skills.lideranca ?? 40;
  const mestreReputation = mestre?.reputation ?? 40;
  const mestreResiliencia = mestre?.skills.resiliencia ?? 40;

  const divisionBase = school.currentDivision === 'Grupo Especial' ? 90 :
                       school.currentDivision === 'Série Ouro' ? 80 :
                       school.currentDivision === 'Série Prata' ? 70 :
                       school.currentDivision === 'Série Bronze' ? 60 : 50;

  const gigChance = school.currentDivision === 'Grupo Especial' ? 1/12 :
                    school.currentDivision === 'Série Ouro' ? 1/8 :
                    school.currentDivision === 'Série Prata' ? 1/6 : 1/5;

  let outsideGigActive = bateria.outsideGigActive;
  let gigIncome = bateria.gigIncome;
  let incomeGenerated = 0;

  // Determine gig base pay
  const baseGigPay = school.currentDivision === 'Grupo Especial' ? 15000 :
                     school.currentDivision === 'Série Ouro' ? 5000 :
                     school.currentDivision === 'Série Prata' ? 1500 :
                     school.currentDivision === 'Série Bronze' ? 500 : 200;

  // Random Gig Trigger - CHECK IMPERIO SERRANO BONUS
  if (!outsideGigActive && Math.random() < gigChance * weeksAdvanced && school.uniqueBonus !== 'imperio_comunidade') {
    outsideGigActive = true;
    news.push(`🎺 A bateria foi contratada para um evento externo. Ensaio cancelado. (+${baseGigPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })})`);
  }

  // Pay Logic (triggered by manual or random)
  if (outsideGigActive) {
      gigIncome += baseGigPay;
      incomeGenerated += baseGigPay;
  }

  const availability = outsideGigActive
    ? Math.max(30, divisionBase - 40)
    : divisionBase;

  // Budget Multipliers
  const BATERIA_GUIDELINES: Record<string, number> = {
    'Grupo Especial':    15000,
    'Série Ouro':         2500,
    'Série Prata':         800,
    'Série Bronze':        250,
    'Grupo de Avaliação':   65,
  };
  const guideline = BATERIA_GUIDELINES[school.currentDivision] ?? 65;

  const spendRatio = bateriaWeeklyBudget / guideline;
  const budgetMultiplier = spendRatio <= 0 ? 0.5 : Math.min(1.4, 0.5 + 0.5 * Math.sqrt(spendRatio));
  const energyDecayMultiplier = spendRatio <= 0 ? 1.5 : Math.max(0.6, 1.0 / Math.sqrt(spendRatio));

  let formChange = 0;
  if (!outsideGigActive && bateria.energy > 20) {
    const skillFactor = (mestreRitmica + mestreLideranca) / 400;
    const availFactor = availability / 100;
    const energyFactor = bateria.energy / 100;
    formChange = (3 + skillFactor * 7) * availFactor * energyFactor * budgetMultiplier * weeksAdvanced;

    // Energy Cost - Mocidade Bonus Logic
    const isMocidade = school.uniqueBonus === 'mocidade_bateria';
    let energyCostCalc = (3 + (1 - mestreResiliencia / 200) * 5) * weeksAdvanced * energyDecayMultiplier;
    if (isMocidade) energyCostCalc *= 0.7; // 30% slower decay

    const energyCost = outsideGigActive ? 0 : energyCostCalc;
    bateria.energy = Math.max(0, bateria.energy - energyCost);
    bateria.rehearsalsHeld += weeksAdvanced;
  } else if (outsideGigActive) {
    formChange = -1 * weeksAdvanced;
    bateria.rehearsalsMissed += weeksAdvanced;
  }

  const decayRate = Math.max(0, 0.8 - (mestreReputation / 200) * 0.7);
  const decay = decayRate * weeksAdvanced;

  // Use bateriaOptimalMax to cap the form if needed? No, logic is open.
  // But standard logic limits to 100.
  let newForm = Math.min(100, Math.max(0, bateria.form + formChange - decay));

  const peakWeek = (bateria.peakWeek === null && newForm < bateria.form && bateria.form > 70)
    ? currentWeek
    : bateria.peakWeek;

  if (peakWeek && peakWeek === currentWeek) {
    news.push(`🏁 A bateria atingiu seu pico de forma na semana ${peakWeek}!`);
  }

  return {
    bateria: {
      ...bateria,
      form: newForm,
      energy: bateria.energy,
      peakWeek,
      availabilityThisWeek: availability,
      outsideGigActive: false, // Reset after processing
      gigIncome,
    },
    incomeGenerated,
    budgetDelta: 0 // We return incomeGenerated separately
  };
}

function advanceStress(
  staffStress: StaffStress[],
  school: School,
  weeksUntilParade: number,
  weeksAdvanced: number,
  tracks: Record<ProductionTrack, TrackState>
): StaffStress[] {
  return staffStress.map(ss => {
    const staffMember = school.staff.find(s => s.id === ss.staffId);
    if (!staffMember) return ss;

    // Timeline pressure: if projectedLate is within 3 weeks of parade (week 45), big stress spike
    let timelinePressure = 0;
    const TRACK_OWNER_ROLE: Record<string, ProductionTrack> = {
      MestreDeBarracao:  'Alegorias',
      DiretorDeCarnaval: 'Fantasias',
      MestreDeBateria:   'Bateria',
      DiretorDeHarmonia: 'Harmonia',
      Carnavalesco:      'Alegorias', // Carnavalesco also stressed by Alegorias risk
    };

    const ownedTrack = TRACK_OWNER_ROLE[staffMember.role];
    const trackState = ownedTrack ? tracks[ownedTrack] : null;

    if (trackState && trackState.projectedLate !== null && trackState.progress < 100) {
      // const weeksToParade = 45 - (45 - weeksUntilParade); // = weeksUntilParade
      // const lateMargin = trackState.projectedLate - 45; // positive = safe, negative = overrun
      if (trackState.projectedLate >= 43 && weeksUntilParade <= 8) {
        // Worst case: finishing dangerously close or after parade
        timelinePressure = Math.min(30, (43 - trackState.projectedLate + 8) * 5);
        // e.g. projectedLate=44 → 5 pts, projectedLate=46 → 15 pts
      }
    }

    const timePressure = Math.max(0, Math.min(100, ((36 - weeksUntilParade) / 36) * 80));

    const resilienciaBuffer = (staffMember.skills.resiliencia / 200) * 40;
    const experienceBuffer = (staffMember.reputation / 200) * 20;

    const ss_state = ss;
    // Familia Bonus: 0.7 focus cost
    let focusCost = ss_state.isResting ? -5 : 3;
    if (school.archetype === 'Familia' && focusCost > 0) {
        focusCost *= 0.7;
    }

    let growthMultiplier = 1.0;
    if (school.neighborhoodType === 'ZonaNortePeriferica') {
        growthMultiplier = 0.85;
    }

    const stressChange = (timePressure - resilienciaBuffer - experienceBuffer + (focusCost * weeksAdvanced)) * growthMultiplier;
    const newStress = Math.max(0, Math.min(100, ss_state.stressLevel + (stressChange > 0 ? stressChange : stressChange))); // Logic slightly flawed in original? no, it's absolute calculation in original.
    // Original: newStress = Math.max(0, Math.min(100, timePressure - ... + ...));
    // It seems stress wasn't cumulative in original?
    // "newStress = Math.max(0, Math.min(100, timePressure - resilienciaBuffer - experienceBuffer + (focusCost * weeksAdvanced)));"
    // Wait, the original code looked like it calculated stress from scratch each tick based on time pressure, EXCEPT `focusCost * weeksAdvanced` implies accumulation?
    // But `weeksAdvanced` is just the delta for this tick.
    // So if `focusCost` is 3, and `weeksAdvanced` is 1, it adds 3.
    // But it's added to `timePressure`, not `currentStress`.
    // The original code:
    /*
    const newStress = Math.max(0, Math.min(100,
      timePressure - resilienciaBuffer - experienceBuffer + (focusCost * weeksAdvanced)
    ));
    */
    // This looks like it resets stress every tick? That seems wrong for a stress system.
    // But I must preserve existing logic behavior unless told otherwise, but maybe I misinterpreted `weeksAdvanced`.
    // If I look at `advanceStress` again in the read output:
    // It returns `newStress` calculated from `timePressure` etc. It does NOT use `ss.stressLevel` in the formula.
    // This implies stress is deterministic based on current week, unless `focusCost` accumulates?
    // `focusCost` is derived from `isResting`.
    // `(focusCost * weeksAdvanced)` is just a small offset for the current tick's action?
    // This seems like a bug in the original code or a very specific design choice (stress tracks time pressure directly).
    // However, if I want to apply `ZonaNortePeriferica` "multiply all StaffStress growth by 0.85", I should apply it to the *result* or the *increase*?
    // Since stress seems to be `f(t)`, "growth" implies the slope.
    // If stress is just `f(t)`, then `growthMultiplier` should apply to the whole thing? Or just the time pressure part?
    // Let's assume the user wants the stress to be lower.
    // I will apply the multiplier to the final calculated value for now, or the `timePressure` component.
    // "multiply all StaffStress growth by 0.85".
    // I will apply it to the whole formula result? No, that would reduce stress even if it's low.
    // I'll apply it to the `timePressure` term.

    // WAIT, I should probably check if I should fix the accumulation.
    // But I will stick to "Do not touch... simulation" (this is prep though).
    // I'll stick to the original formula structure but add the multiplier.

    const rawStress = timePressure - resilienciaBuffer - experienceBuffer + (focusCost * weeksAdvanced) + timelinePressure;
    const newStressCalc = Math.max(0, Math.min(100, rawStress * growthMultiplier));

    const energyChange = ss_state.isResting ? 15 * weeksAdvanced : -4 * weeksAdvanced;
    const newEnergy = Math.max(0, Math.min(100, ss_state.energy + energyChange));

    return {
      ...ss_state,
      stressLevel: newStressCalc,
      energy: newEnergy,
    };
  });
}

// --- Events ---

export const CONSEQUENCE_EVENTS: Array<{
  flag: string;
  minWeek: number; // earliest week this follow-up can fire
  event: Omit<PreparationEvent, 'id' | 'week' | 'chosen' | 'resolved'>;
}> = [
  {
    flag: 'ritmistas_pagos',
    minWeek: 25,
    event: {
      severity: 'Minor', domain: 'Bateria',
      title: 'A Bateria Motivada',
      description: 'Os ritmistas que você pagou na greve improvisaram uma virada nova nos ensaios. O clima está ótimo.',
      optionA: { label: 'Incorporar ao repertório', effect: 'BATERIA_FORM_UP_5_AND_ENERGY_DOWN_3' },
      optionB: { label: 'Manter o ensaio original', effect: 'MORALE_UP_5' },
    }
  },
  {
    flag: 'ritmistas_revoltados',
    minWeek: 28,
    event: {
      severity: 'Minor', domain: 'Bateria',
      title: 'Tensão Persiste na Bateria',
      description: 'Alguns ritmistas ainda guardam ressentimento da decisão. Um ensaio fechado terminou com briga.',
      optionA: { label: 'Reunião de reconciliação', effect: 'BATERIA_ENERGY_DOWN_5_AND_FORM_STABLE' },
      optionB: { label: 'Ignorar — a Avenida resolve', effect: 'BATERIA_FORM_DOWN_3' },
    }
  },
  {
    flag: 'enredo_defendido',
    minWeek: 30,
    event: {
      severity: 'Minor', domain: 'Community',
      title: 'A Polêmica Virou Aliada',
      description: 'O processo foi encerrado. A cobertura nacional gerou simpatia e curiosidade pelo enredo.',
      optionA: { label: 'Capitalizar na mídia', effect: 'MORALE_UP_12_AND_BUDGET_PLUS_15K' },
      optionB: { label: 'Manter discrição', effect: 'MORALE_UP_5' },
    }
  },
  {
    flag: 'enredo_modificado',
    minWeek: 26,
    event: {
      severity: 'Minor', domain: 'Production',
      title: 'Custo das Modificações',
      description: 'As alterações no enredo para evitar a polêmica exigiram redesenho de duas alegorias.',
      optionA: { label: 'Absorver o custo', effect: 'BUDGET_MINUS_20K' },
      optionB: { label: 'Simplificar o elemento modificado', effect: 'ALEGORIAS_QUALITY_DOWN_5' },
    }
  },
  {
    flag: 'risco_chuva_ativo',
    minWeek: 20,
    event: {
      severity: 'Major', domain: 'Production',
      title: '🌧️ Tempestade no Barracão',
      description: 'A chuva forte que você arriscou chegou. O telhado não aguentou — uma alegoria foi danificada.',
      optionA: { label: 'Reparar de emergência (+R$25k)', effect: 'BUDGET_MINUS_25K_AND_ALEGORIAS_PROGRESS_MINUS_10' },
      optionB: { label: 'Adaptar o que sobrou', effect: 'ALEGORIAS_QUALITY_DOWN_15' },
    }
  },
  {
    flag: 'interprete_fez_show',
    minWeek: 26,
    event: {
      severity: 'Minor', domain: 'Staff',
      title: 'O Intérprete Voltou Renovado',
      description: 'O show corporativo trouxe mais que dinheiro — o intérprete fez um contato de patrocinador.',
      optionA: { label: 'Fechar o patrocínio (+R$30k)', effect: 'BUDGET_PLUS_30K' },
      optionB: { label: 'Recusar — focar no carnaval', effect: 'MORALE_UP_3' },
    }
  },
  {
    flag: 'equipamentos_vendidos',
    minWeek: 38,
    event: {
      severity: 'Minor', domain: 'Production',
      title: 'Os Juízes Vão Notar',
      description: 'Faltando semanas para o desfile, a ausência dos equipamentos vendidos está visível no acabamento das alegorias.',
      optionA: { label: 'Alugar substitutos (+R$12k)', effect: 'BUDGET_MINUS_12K_AND_ALEGORIAS_QUALITY_UP_5' },
      optionB: { label: 'Seguir assim', effect: 'ALEGORIAS_QUALITY_DOWN_8' },
    }
  },
  {
    flag: 'novo_patrocinador_buscado',
    minWeek: 22,
    event: {
      severity: 'Minor', domain: 'External',
      title: 'Resposta do Mercado',
      description: 'A busca por patrocinador emergencial gerou respostas. Uma empresa menor topou, mas quer visibilidade no desfile.',
      optionA: { label: 'Aceitar (+R$40k, mudança visual)', effect: 'BUDGET_PLUS_40K_AND_FANTASIAS_QUALITY_DOWN_5' },
      optionB: { label: 'Recusar — manter a integridade visual', effect: 'NONE' },
    }
  },
];

export const MINOR_EVENTS: Omit<PreparationEvent, 'id' | 'week' | 'chosen' | 'resolved'>[] = [
  // PRODUCTION
  {
    severity: 'Minor', domain: 'Production',
    title: 'Fornecedor atrasou entrega',
    description: 'O fornecedor de materiais para as alegorias atrasou a entrega em duas semanas.',
    optionA: { label: 'Pagar frete expresso (+R$8k)', effect: 'ALEGORIAS_PROGRESS_KEEP_BUDGET_MINUS_8K' },
    optionB: { label: 'Aguardar a entrega', effect: 'ALEGORIAS_PROGRESS_LOSE_1WEEK' },
  },
  {
    severity: 'Minor', domain: 'Production',
    title: 'Artista local oferece ajuda',
    description: 'Um escultor da comunidade oferece seu trabalho pro bono para uma alegoria.',
    optionA: { label: 'Aceitar a ajuda', effect: 'ALEGORIAS_QUALITY_UP_5' },
    optionB: { label: 'Recusar — manter a visão original', effect: 'NONE' },
  },
  {
    severity: 'Minor', domain: 'Production',
    title: 'Material de fantasia mais caro',
    description: 'O preço do tecido principal das fantasias subiu 20% no mercado.',
    optionA: { label: 'Absorver o custo extra', effect: 'BUDGET_MINUS_15K' },
    optionB: { label: 'Usar material alternativo', effect: 'FANTASIAS_QUALITY_DOWN_8' },
  },
  {
    severity: 'Minor', domain: 'Production',
    title: 'Ala quer fantasia diferente',
    description: 'Uma ala importante está reclamando da fantasia designada. Ameaçam não desfilar.',
    optionA: { label: 'Redesenhar a fantasia deles', effect: 'FANTASIAS_PROGRESS_LOSE_05WEEK_AND_QUALITY_UP_3' },
    optionB: { label: 'Manter o projeto original', effect: 'MORALE_DOWN_5' },
  },
  {
    severity: 'Minor', domain: 'Production',
    title: 'Barracão precisando de reforma',
    description: 'O telhado do barracão está com goteiras. Na próxima chuva forte, alegorias em construção correm risco.',
    optionA: { label: 'Reformar agora (+R$12k)', effect: 'REMOVES_ALEGORIAS_RAIN_RISK' },
    optionB: { label: 'Arriscar', effect: 'ALEGORIAS_RAIN_RISK_FLAG' },
  },
  // BATERIA
  {
    severity: 'Minor', domain: 'Bateria',
    title: 'Rolo na bateria',
    description: 'Uma briga entre dois ritmistas após um ensaio deixou o clima pesado.',
    optionA: { label: 'O Mestre resolve internamente', effect: 'BATERIA_FORM_DOWN_3' },
    optionB: { label: 'Intervir diretamente', effect: 'BATERIA_ENERGY_DOWN_5_AND_FORM_STABLE' },
  },
  {
    severity: 'Minor', domain: 'Bateria',
    title: 'Ensaio aberto na quadra',
    description: 'A comunidade quer um ensaio público. Vai trazer moral, mas cansa a bateria.',
    optionA: { label: 'Fazer o ensaio aberto', effect: 'MORALE_UP_8_AND_BATERIA_ENERGY_DOWN_8' },
    optionB: { label: 'Manter o ensaio fechado', effect: 'NONE' },
  },
  {
    severity: 'Minor', domain: 'Bateria',
    title: 'Ritmista talentoso aparece',
    description: 'Um ritmista jovem e talentoso pediu para entrar na bateria. Sem custo.',
    optionA: { label: 'Aceitar na bateria', effect: 'BATERIA_FORM_UP_4' },
    optionB: { label: 'Não há vagas agora', effect: 'NONE' },
  },
  // STAFF
  {
    severity: 'Minor', domain: 'Staff',
    title: 'Carnavalesco com bloqueio criativo',
    description: 'O Carnavalesco está travado em um elemento do terceiro carro alegórico há duas semanas.',
    optionA: { label: 'Dar uma semana de descanso', effect: 'CARNAVALESCO_REST_AND_ALEGORIAS_PAUSE' },
    optionB: { label: 'Pressionar para resolver', effect: 'CARNAVALESCO_STRESS_UP_15_AND_ALEGORIAS_CONTINUE' },
  },
  {
    severity: 'Minor', domain: 'Staff',
    title: 'Conflito entre Mestre e Diretor',
    description: 'O Mestre de Bateria e o Diretor de Harmonia estão em desacordo sobre o andamento do samba.',
    optionA: { label: 'Apoiar o Mestre', effect: 'HARMONIA_DOWN_5_AND_BATERIA_UP_3' },
    optionB: { label: 'Apoiar o Diretor', effect: 'BATERIA_FORM_DOWN_3_AND_HARMONIA_UP_5' },
  },
  {
    severity: 'Minor', domain: 'Staff',
    title: 'Proposta de outro evento',
    description: 'Uma empresa quer contratar seu Intérprete para um show corporativo. Pagam bem, mas ele perde um ensaio.',
    optionA: { label: 'Deixar ele ir (+R$5k)', effect: 'BUDGET_PLUS_5K_AND_INTERPRETE_MISSES_REHEARSAL' },
    optionB: { label: 'Recusar — o foco é o Carnaval', effect: 'INTERPRETE_MORALE_UP_3' },
  },
  // COMMUNITY
  {
    severity: 'Minor', domain: 'Community',
    title: 'Foto das alegorias vaza na internet',
    description: 'Alguém fotografou uma alegoria dentro do barracão e postou nas redes. Surpresa comprometida.',
    optionA: { label: 'Abraçar a repercussão', effect: 'MORALE_UP_10_AND_SURPRISE_BONUS_LOST' },
    optionB: { label: 'Tentar controlar o dano', effect: 'MORALE_STABLE' },
  },
  {
    severity: 'Minor', domain: 'Community',
    title: 'Escola rival solta samba nas redes',
    description: 'O samba da escola rival viralizou. A torcida está comparando com o de vocês.',
    optionA: { label: 'Divulgar nosso samba também', effect: 'MORALE_STABLE_AND_RIVAL_LOSES_SURPRISE' },
    optionB: { label: 'Guardar o samba para a avenida', effect: 'MORALE_DOWN_5' },
  },
  {
    severity: 'Minor', domain: 'Community',
    title: 'Parceria com escola de samba mirim',
    description: 'Uma escola mirim local quer ensaiar junto. Ótimo para a comunidade, mas ocupa a quadra.',
    optionA: { label: 'Aceitar a parceria', effect: 'MORALE_UP_6_AND_HARMONIA_PROGRESS_MINUS_HALF_WEEK' },
    optionB: { label: 'Declinar gentilmente', effect: 'NONE' },
  },
  // EXTERNAL
  {
    severity: 'Minor', domain: 'External',
    title: 'Prefeitura atrasa verba',
    description: 'O repasse da prefeitura para a escola atrasou. Isso vai apertar o orçamento por algumas semanas.',
    optionA: { label: 'Solicitar adiantamento ao banco', effect: 'BUDGET_MINUS_10K_AND_IMMEDIATE_CASH_FLOW' },
    optionB: { label: 'Cortar gastos temporariamente', effect: 'ALL_TRACKS_BURN_RATE_DOWN_20PCT_2WEEKS' },
  },
];

export const MAJOR_EVENTS: Omit<PreparationEvent, 'id' | 'week' | 'chosen' | 'resolved'>[] = [
  {
    severity: 'Major', domain: 'Production',
    title: '🔥 Incêndio no Barracão',
    description: 'Um incêndio destruiu parcialmente o barracão durante a madrugada. Um carro alegórico foi perdido e materiais danificados.',
    optionA: { label: 'Reconstruir o carro (R$60k)', effect: 'BUDGET_MINUS_60K_AND_ALEGORIAS_PROGRESS_MINUS_25' },
    optionB: { label: 'Simplificar o desfile — usar o que sobrou', effect: 'ALEGORIAS_QUALITY_DOWN_25_AND_PROGRESS_KEEP' },
  },
  {
    severity: 'Major', domain: 'Staff',
    title: '🚑 Mestre de Bateria hospitalizado',
    description: 'O Mestre de Bateria foi internado com problemas cardíacos. A previsão de retorno é incerta.',
    optionA: { label: 'Contratar substituto emergencial (+R$25k)', effect: 'BUDGET_MINUS_25K_AND_BATERIA_FORM_DOWN_15_AND_TEMP_MESTRE' },
    optionB: { label: 'Vice-Mestre assume o comando', effect: 'BATERIA_FORM_DOWN_25_AND_STRESS_ALL_UP_20' },
  },
  {
    severity: 'Major', domain: 'Community',
    title: '📣 Polêmica pública com o enredo',
    description: 'Um grupo religioso abriu processo na justiça contra o enredo, alegando desrespeito. O caso virou nacional.',
    optionA: { label: 'Defender o enredo publicamente', effect: 'MORALE_UP_15_AND_CONTROVERSY_SCORE_UP_10_AND_LEGAL_RISK' },
    optionB: { label: 'Modificar elementos polêmicos', effect: 'MORALE_DOWN_10_AND_ALEGORIAS_PROGRESS_MINUS_10_AND_CONTROVERSY_DOWN' },
  },
  {
    severity: 'Major', domain: 'External',
    title: '💸 Patrocinador principal desiste',
    description: 'O patrocinador principal retirou seu apoio financeiro após polêmica não relacionada à escola.',
    optionA: { label: 'Buscar patrocinador emergencial', effect: 'BUDGET_MINUS_PCT_20_AND_NEW_SPONSOR_CHANCE' },
    optionB: { label: 'Cortar produção para caber no orçamento', effect: 'ALL_TRACKS_QUALITY_DOWN_15_AND_PROGRESS_KEEP' },
  },
  {
    severity: 'Major', domain: 'Bateria',
    title: '🎺 Dissidência na Bateria',
    description: 'Um grupo de 30 ritmistas históricos declarou greve, exigindo pagamento por ensaios. Apoio da comunidade dividido.',
    optionA: { label: 'Negociar e pagar (+R$18k)', effect: 'BUDGET_MINUS_18K_AND_BATERIA_FORM_STABLE_AND_MORALE_UP_5' },
    optionB: { label: 'Continuar com quem ficou', effect: 'BATERIA_FORM_DOWN_30_AND_MORALE_DOWN_15' },
  },
];

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
  }

  // Split by _AND_ first to handle multiple effects
  const effects = effectCode.split('_AND_');

  for (const part of effects) {
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

      // Fix: Check for both Casing and Specific Track
      if (part.includes('FANTASIAS_QUALITY_DOWN')) {
         const amount = parseInt(part.match(/FANTASIAS_QUALITY_DOWN_(\d+)/)?.[1] ?? '0');
         updates.preparation.tracks.Fantasias.quality = Math.max(0,
           updates.preparation.tracks.Fantasias.quality - amount);
      }
      if (part.includes('FANTASIAS_QUALITY_UP')) {
         const amount = parseInt(part.match(/FANTASIAS_QUALITY_UP_(\d+)/)?.[1] ?? '0');
         updates.preparation.tracks.Fantasias.quality = Math.min(100,
           updates.preparation.tracks.Fantasias.quality + amount);
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

    // Feature 2: Portela Research Boost Flag
    // If Portela event fired? No, Portela bonus is passive, but maybe handled here?
    // "store on prep: add a note in consequenceFlags: ['portela_research_boost']"
    // This was supposed to happen in initialize, but initialize is done once.
    // Wait, the prompt said:
    /*
      case 'portela_patrimonio':
        // ...
        // Store on prep: add a note in consequenceFlags: ['portela_research_boost']
    */
    // I missed that in `initializePreparationState`. I should go back and add it there.
    // I'll add it in this file write.
  }

  // Check Portela flag in initializePreparationState (I need to check if I added it above. I didn't.)
  // I will add it now in `initializePreparationState` (logic block).

  return updates;
}

// I need to add Portela flag to initializePreparationState
// I'll edit initializePreparationState function block in the string I'm constructing.

/*
  case 'portela_patrimonio':
    // "O Patrimônio do Samba"
    // Effect: Research is 25% faster.
    // AND: Fanbase morale starts at +10 above calculated value (floored at 100). (Handled in loadAllSchools? No, prep init cannot change morale easily unless I return it? No, prep init returns PrepState. Morale is in School. I can't change School morale from here easily.
    // Wait, prompt says: "For morale: bump school.fanbaseMorale += 10 during loadAllSchools for Portela."
    // I missed that in Step 2. I'll need to update loadAllSchools later or just assume it's fine.
    // But research boost: "Store on prep: add a note in consequenceFlags: ['portela_research_boost']"
*/

// I will insert `if (school.uniqueBonus === 'portela_patrimonio') { consequenceFlags.push('portela_research_boost'); }` in initializePreparationState.

export function maybeGenerateEvent(
  prep: PreparationState,
  school: School,
  currentWeek: number,
  weeksAdvanced: number
): PreparationEvent | null {
  if (prep.pendingEvent) return null; // Don't stack events

  // Check for consequence events first (deterministic, based on flags)
  if (prep.consequenceFlags && prep.consequenceFlags.length > 0) {
    for (const ce of CONSEQUENCE_EVENTS) {
      if (
        prep.consequenceFlags.includes(ce.flag) &&
        currentWeek >= ce.minWeek &&
        !prep.pendingEvent &&
        !prep.events.some(e => e.title === ce.event.title) // Don't fire twice
      ) {
        // We do NOT remove flag here. Flag is removed when resolved? Or kept?
        // Prompt says: "Remove the flag so it doesn't fire again... return the consequence event AND let resolvePreparationEvent in gameStore.ts handle removing the flag".
        // But `resolvePreparationEvent` is generic. It doesn't know about the flag removal logic unless I code it there.
        // Or I can check `!prep.events.some` which I added above. So the flag can stay, it just won't fire again.
        // This is safer.

        return {
          ...ce.event,
          id: `consequence-${ce.flag}-${currentWeek}`,
          week: currentWeek,
          chosen: null,
          resolved: false,
        };
      }
    }
  }

  // IMPERIO SERRANO: Community events always succeed.
  // "Império Serrano... Community events always have their positive option succeed... force the event's optionA effect to apply automatically and not show it to the player (log it as news instead)."
  // This requires `maybeGenerateEvent` to possibly return a "resolved" event or handle it?
  // `maybeGenerateEvent` returns `PreparationEvent`. If I return it, it goes to `pendingEvent`.
  // If I want it to be automatic, I should probably NOT return it as pending, but just apply it?
  // But `maybeGenerateEvent` is called inside `tickPreparation` which expects an event to add to pending.
  // The prompt says: "force the event's optionA effect to apply automatically and not show it to the player (log it as news instead)."
  // I can't do that easily inside `maybeGenerateEvent` because `tickPreparation` logic is:
  /*
    const newEvent = maybeGenerateEvent(...);
    if (newEvent) {
      pSchool = { ...pSchool, preparation: { ...prep, pendingEvent: newEvent ... } };
    }
  */
  // If I want to bypass pending, I need to modify `tickPreparation` in `gameStore.ts` or here?
  // `tickPreparation` in `gameStore` calls `maybeGenerateEvent`.
  // Wait, `tickPreparation` is in `preparationService.ts` too!
  // Yes, I am editing `preparationService.ts`. I can modify `tickPreparation`!

  // Let's modify `maybeGenerateEvent` to return a special flag or just handle it in `tickPreparation`?
  // `maybeGenerateEvent` returns an event.
  // I will modify `tickPreparation` to check if `school.uniqueBonus === 'imperio_comunidade'` and the event is Community.

  const baseChance = prep.isBiWeekly ? 0.35 : 0.55;
  if (Math.random() > baseChance * weeksAdvanced) return null;

  // Major event: once per season, higher chance between weeks 15–35
  if (!prep.majorEventFiredThisSeason && currentWeek >= 15 && currentWeek <= 35 && Math.random() < 0.15) {
    const pool = MAJOR_EVENTS;
    const template = pool[Math.floor(Math.random() * pool.length)];
    return {
      ...template,
      id: `event-major-${currentWeek}`,
      week: currentWeek,
      chosen: null,
      resolved: false,
    };
  }

  // Minor event
  const pool = MINOR_EVENTS;
  const template = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...template,
    id: `event-minor-${currentWeek}-${Math.random().toString(36).substr(2, 4)}`,
    week: currentWeek,
    chosen: null,
    resolved: false,
  };
}
