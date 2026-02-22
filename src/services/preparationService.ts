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
    finishingRisk: 0,
    weeklyBurnRate: baseBudget,
    carCountBonus: 0
  });

  const safeBaseBurn = school.budget * 0.02;

  const staffStress: StaffStress[] = school.staff.map(s => ({
    staffId: s.id,
    stressLevel: 0,
    energy: 100,
    isResting: false,
  }));

  const baseAvailability = school.currentDivision === 'Grupo Especial' ? 90 :
                           school.currentDivision === 'Série Ouro' ? 80 :
                           school.currentDivision === 'Série Prata' ? 70 :
                           school.currentDivision === 'Série Bronze' ? 60 : 50;

  return {
    tracks: {
      Alegorias: initTrack('Alegorias', safeBaseBurn * 0.45),
      Fantasias: initTrack('Fantasias', safeBaseBurn * 0.25),
      Bateria: initTrack('Bateria', safeBaseBurn * 0.15),
      Harmonia: initTrack('Harmonia', safeBaseBurn * 0.15),
    },
    bateria: {
      form: 20,
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
    bankruptAtWeek: null
  };
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
  const bateriaResult = advanceBateria(prep.bateria, school, currentWeek, weeksAdvanced, news);
  prep.bateria = bateriaResult.bateria;
  let budgetDelta = bateriaResult.budgetDelta;

  // 3. Update staff stress
  prep.staffStress = advanceStress(prep.staffStress, school, weeksUntilParade, weeksAdvanced);

  // 4. Update total budget spent (from tracks this tick)
  const trackSpend = Object.values(prep.tracks).reduce((sum, t) => sum + t.weeklyBurnRate * weeksAdvanced, 0);
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
  // Approximate initial budget as current + spent
  const initialBudgetEstimate = newBudget + prep.totalBudgetSpent;
  const budgetPct = initialBudgetEstimate > 0 ? newBudget / initialBudgetEstimate : 0;

  if (!prep.pendingEvent && !prep.isBankrupt) {
      if (budgetPct < 0.10) {
          const title = 'Alerta Vermelho — Falência Iminente';
          // Check if fired before
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
              prep.events.push(prep.pendingEvent); // Add to history so it doesn't fire again immediately if ignored (though pending blocks tick usually)
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
  prep.tracks = updateProjections(prep.tracks, weeksUntilParade);

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
    const scale = divisionScale[school.currentDivision] ?? 0.003;
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

  return Math.min(100, Math.floor(base));
}

function updateProjections(
  tracks: Record<ProductionTrack, TrackState>,
  weeksUntilParade: number
): Record<ProductionTrack, TrackState> {
  const updated = { ...tracks };
  for (const [trackName, track] of Object.entries(updated) as [ProductionTrack, TrackState][]) {
    if (track.progress >= 100) {
      updated[trackName] = { ...track, projectedCompletion: 45 - weeksUntilParade, finishingRisk: 0 };
      continue;
    }
    if (track.progress === 0) {
      updated[trackName] = { ...track, projectedCompletion: null };
      continue;
    }
    const weeksPassed = Math.max(1, 36 - weeksUntilParade);
    const progressPerWeek = track.progress / weeksPassed;
    const weeksLeft = (100 - track.progress) / progressPerWeek;
    const projectedWeek = Math.round((45 - weeksUntilParade) + weeksLeft);
    const finishingRisk = projectedWeek >= 43 ? Math.min(100, (projectedWeek - 42) * 30) : 0;
    updated[trackName] = { ...track, projectedCompletion: projectedWeek, finishingRisk };
  }
  return updated;
}

function advanceBateria(
  bateria: BateriaState,
  school: School,
  currentWeek: number,
  weeksAdvanced: number,
  news: string[]
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

  // Random Gig Trigger
  if (!outsideGigActive && Math.random() < gigChance * weeksAdvanced) {
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

  let formChange = 0;
  if (!outsideGigActive && bateria.energy > 20) {
    const skillFactor = (mestreRitmica + mestreLideranca) / 400;
    const availFactor = availability / 100;
    const energyFactor = bateria.energy / 100;
    formChange = (3 + skillFactor * 7) * availFactor * energyFactor * weeksAdvanced;

    const energyCost = outsideGigActive ? 0 : (3 + (1 - mestreResiliencia / 200) * 5) * weeksAdvanced;
    bateria.energy = Math.max(0, bateria.energy - energyCost);
    bateria.rehearsalsHeld += weeksAdvanced;
  } else if (outsideGigActive) {
    formChange = -1 * weeksAdvanced;
    bateria.rehearsalsMissed += weeksAdvanced;
  }

  const decayRate = Math.max(0, 0.8 - (mestreReputation / 200) * 0.7);
  const decay = decayRate * weeksAdvanced;

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
  weeksAdvanced: number
): StaffStress[] {
  return staffStress.map(ss => {
    const staffMember = school.staff.find(s => s.id === ss.staffId);
    if (!staffMember) return ss;

    const timePressure = Math.max(0, Math.min(100, ((36 - weeksUntilParade) / 36) * 80));

    const resilienciaBuffer = (staffMember.skills.resiliencia / 200) * 40;
    const experienceBuffer = (staffMember.reputation / 200) * 20;

    const ss_state = ss;
    const focusCost = ss_state.isResting ? -5 : 3;

    const newStress = Math.max(0, Math.min(100,
      timePressure - resilienciaBuffer - experienceBuffer + (focusCost * weeksAdvanced)
    ));

    const energyChange = ss_state.isResting ? 15 * weeksAdvanced : -4 * weeksAdvanced;
    const newEnergy = Math.max(0, Math.min(100, ss_state.energy + energyChange));

    return {
      ...ss_state,
      stressLevel: newStress,
      energy: newEnergy,
    };
  });
}

// --- Events ---

export const MINOR_EVENTS: Omit<PreparationEvent, 'id' | 'week' | 'chosen' | 'resolved'>[] = [
  // PRODUCTION
  {
    severity: 'Minor', domain: 'Production',
    title: 'Fornecedor atrasou entrega',
    description: 'O fornecedor de materiais para as alegorias atrasou a entrega em duas semanas.',
    optionA: { label: 'Pagar frete expresso (+R$8k)', effect: 'ALEGORIAS_PROGRESS_KEEP_BUDGET_MINUS_8K' }, // Fixed effect string to include budget
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
    optionA: { label: 'Reformar agora (+R$12k)', effect: 'REMOVES_ALEGORIAS_RAIN_RISK' }, // Note: Rain risk logic not fully implemented in state, assuming placebo or future use
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
  school: School
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
          // Calculate approximate week if we can, or let it stay null until next tick?
          // The prompt says "In resolveEventEffect... set prep.isBankrupt = true"
          // It doesn't strictly say set bankruptAtWeek, but better to set it if possible.
          // Since we don't have currentWeek, we can rely on weeksUntilParade.
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

  return updates;
}

export function maybeGenerateEvent(
  prep: PreparationState,
  school: School,
  currentWeek: number,
  weeksAdvanced: number
): PreparationEvent | null {
  if (prep.pendingEvent) return null; // Don't stack events

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
