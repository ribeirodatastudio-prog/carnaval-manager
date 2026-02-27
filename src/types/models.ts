
// types/models.ts

/**
 * StaffRole defines the key roles in a Samba School.
 * These are the main positions that the player can hire and manage.
 */
export type StaffRole =
  | 'DiretorDeCarnaval'
  | 'Carnavalesco'
  | 'Interprete'
  | 'MestreDeBateria'
  | 'MestreSala'
  | 'PortaBandeira'
  | 'RainhaDeBateria'
  | 'Coreografo'
  | 'DiretorDeHarmonia'
  | 'MestreDeBarracao';

/**
 * StaffSkills defines the granular skill set for a staff member.
 * All skills are evaluated internally from 1 to 200.
 */
export interface StaffSkills {
  // Technical
  plastica: number;
  ritmica: number;
  expressaoCorporal: number;

  // Mental
  lideranca: number;
  criatividade: number;
  resiliencia: number;

  // Organizational/Other
  logistica: number;
  gestaoDeRecursos: number;
  fama: number; // Mainly for Rainha
}

/**
 * Archetypes for Rainha de Bateria.
 */
export type RainhaArchetype = 'Celebridade' | 'PostoPago' | 'CriaDaComunidade';

/**
 * Represents a specific achievement in a staff member's career.
 */
export interface StaffAchievement {
  type: 'Title' | 'Vice' | 'Estandarte' | 'Nota10';
  year?: number; // If year is unknown, it's a generic count
  division?: Division; // Defaults to Grupo Especial if not specified
  count?: number; // For "15 titles", count = 15
}

/**
 * StaffMember represents an individual hired by a Samba School.
 * Each staff member has specific skills and costs associated with them.
 */
export interface StaffMember {
  id: string; // Unique identifier for the staff member
  name: string; // Full name of the staff member
  role: StaffRole; // The specific role they fulfill in the school
  salary: number; // The cost per turn/season for this staff member (actual contracted salary)
  skills: StaffSkills; // Detailed skill breakdown
  contractYears: number; // Number of years remaining on their contract
  currentSchoolId: string | null; // The ID of the school they currently work for, or null if free agent
  salaryExpectation: number; // The salary they expect when negotiating a new contract
  reputation: number; // The fame/prestige of the staff member (1-200), heavily influences salary expectation
  partnerId?: string; // ID of the partner (for MestreSala/PortaBandeira couples)
  synergy?: number; // Synergy level for couples (1-100 or similar scale, TBD)
  archetype?: RainhaArchetype; // Specific archetype for Rainha de Bateria
  age: number; // Age of the staff member
  potential?: number; // Maximum reputation ceiling (1-200) for generated staff

  // Historical Data
  historyText?: string; // "Cargos Históricos" (e.g., "Mangueira (2016-22), Imperatriz (2023-24)")
  achievements?: StaffAchievement[]; // Structured achievements for reputation calculation
}

/**
 * Represents a transfer offer made by a school to a staff member.
 */
export interface TransferOffer {
  id: string;
  fromSchoolId: string;
  toStaffId: string;
  offeredSalary: number;
  contractYears: number;        // 1, 2, or 3
  weekMade: number;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Countered';
  counterSalary?: number;
  counterYears?: number;
}

/**
 * EnredoCategory defines the thematic classification of an Enredo.
 * Replaces the old taxonomy with a richer, research-based set.
 */
export type EnredoCategory =
  | 'AfroBrasileiro'        // Afro-Brazilian history, quilombos, orixás, resistance
  | 'Religioso'             // Catholic, Candomblé, or syncretic spirituality
  | 'Historico'             // Official Brazilian history, national heroes, colonial era
  | 'Biografico'            // Tribute to a living or dead artist, athlete, or cultural figure
  | 'PoliticoSocial'        // Social critique, labor, inequality, police violence
  | 'Folclorico'            // Regional folklore, legends, festas populares
  | 'Ambiental'             // Ecological/environmental themes
  | 'Indigena'              // Indigenous peoples and cultures
  | 'Patrocinado'           // Commercially sponsored theme
  | 'Abstrato'              // Conceptual, artistic, philosophical
  | 'ComunitarioLocal';     // Neighborhood/community tribute

/**
 * Enredo represents the theme (Samba-Enredo) chosen by a school for the year.
 * Expanded to include detailed attributes that affect simulation and strategy.
 */
export interface Enredo {
  id: string;
  title: string;
  category: EnredoCategory;        // existing
  complexity: number;               // RENAMED meaning: Research Depth required (1-100)
  difficulty: number;               // NEW: How hard to translate to a desfile (1-100)
  potentialScore: number;           // existing: max score if executed perfectly (1-100)
  controversy: number;              // NEW: see below (0-100)
  appeal: number;                   // NEW: see below (1-100)
  sponsorValue: number;             // NEW: see below (0-100)
  trend: 'Rising' | 'Stable' | 'Saturated'; // NEW: cultural moment timing

  // Hidden stats — revealed by research
  hiddenRisk?: number;              // hidden: chance of judging deduction (0-100)
  hiddenBonus?: number;             // hidden: chance of bonus points from crowd/media (0-100)

  // Research Progress
  statsRevealed: number;            // 0=None, 1=Complexity, 2=Difficulty, 3=Potential, 4=Risk, 5=Bonus
  researchProgress: number;         // 0.0–1.0+ fractional progress toward next stat reveal.
}

/**
 * Division defines the league tiers in the carnival.
 */
export type Division =
  | 'Grupo Especial'
  | 'Série Ouro'
  | 'Série Prata'
  | 'Série Bronze'
  | 'Grupo de Avaliação';

/**
 * Represents a specific achievement in a school's history.
 */
export interface SchoolHistoryEntry {
  divisao: Division;
  ano: number;
}

/**
 * Detailed history of a school's performance.
 */
export interface SchoolHistory {
  // Counts (for quick display)
  totalTitles: number;
  totalRunnerUps: number;

  // Detailed lists
  titulos: SchoolHistoryEntry[];
  vices: SchoolHistoryEntry[];
  terceiros: SchoolHistoryEntry[];
  quartos: SchoolHistoryEntry[];
  quintos: SchoolHistoryEntry[];
}

/**
 * SambaEnredo represents a candidate or chosen samba for the school.
 */
export interface SambaEnredo {
  id: string;
  title: string; // e.g. "Canto Livre das Pedras"
  compositors: string[]; // names of the parceria members

  // All stats 1–100
  // Visible from the start:
  melodia: number;           // How catchy/memorable the tune is
  grito: number;             // The crowd singalong factor — "everybody screams this part"
  apeloComunidade: number;   // Did the quadra embrace it at the eliminatória nights?

  // Revealed only after the player picks this samba (post-competition):
  letra: number;             // Lyric quality and enredo narrative faithfulness
  ritmo: number;             // Rhythmic drive — fits the bateria's pulse
  sinergiaBateria: number;   // Was it written for THIS school's bateria style?
  emocao: number;            // Emotional depth (nostalgia, pride, tears)
  aderenciaAoEnredo: number; // How faithfully it translates the carnavalesco's vision
  versatilidade: number;     // Can the intérprete/bateria adapt it live?

  isEncomendado: boolean;    // Commissioned samba vs competition entry
  scoutHint: string;         // One-line community reaction hinting at hidden stats
}

export interface SambaSelectionProcess {
  candidates: SambaEnredo[]; // Always exactly 3
  chosen: SambaEnredo | null;
}

// --- Preparation Phase Types ---

export type ProductionTrack = 'Alegorias' | 'Fantasias' | 'Bateria' | 'Harmonia';

export interface TrackState {
  track: ProductionTrack;
  progress: number;                    // 0–100. 100 = complete.
  quality: number;                     // 0–100.
  budgetAllocated: number;             // Total R$ committed so far this season.
  ppAllocatedThisWeek: number;         // How many PP the player allocated here this turn.
  ppMinimum: number;                   // Minimum PP required this turn (varies by act + enredo complexity).
  moneyPerPP: number;                  // R$ cost per PP (varies by division).
  staffQualityMultiplier: number;      // Staff bonus on quality gain per PP (0.8–1.4).
  staffProgressMultiplier: number;     // Staff bonus on progress gain per PP (0.8–1.4). Primarily for MestreDeBarracao on Alegorias.
  enredoDifficultyMultiplier: number;  // Enredo difficulty effect on quality (0.75–1.15).
  projectedCompletionWeek: number | null;
  deadlineWeek: number;                // Last acceptable week to reach 100%.
  carCountBonus: number;               // Keep existing — quality ceiling from cars.
}

export interface EnredoProductionEffects {
  complexityTier: 'Simples' | 'Moderado' | 'Profundo' | 'Enciclopedico';
  difficultyTier: 'Facil' | 'Normal' | 'Abstrato' | 'QuaseImpossivel';
  alegoriaMinPPBonus: number;        // 0 or +1 (from complexity >= 61)
  fantasiaMinPPBonus: number;        // 0 or +1 (from complexity >= 61)
  alegoriaDifficultyMult: number;    // 0.75 to 1.15
  fantasiaDifficultyMult: number;    // 0.80 to 1.10
  crisisChanceBonus: number;         // 0.0 to 0.20 (from complexity)
  communityChanceBonus: number;      // 0.0 to 0.15 (from controversy)
  appealMoraleEffect: number;        // -2, 0, or positive bonus per turn
  exclusiveCrisisIds: string[];      // IDs of crises unlocked by this enredo
  enredoCeilingBonus: number;        // Bonus to desfile Enredo quesito if executed well
}

export interface WeekTurnState {
  totalPP: number;
  ppBreakdown: {
    base: number;                   // Always 10
    staffBonus: number;             // 0 to +6
    moraleBonus: number;            // -1, 0, +1, or +2
    archetypeBonus: number;         // 0 or +1 (Potencia)
    burnoutPenalty: number;         // 0 to -N
    crisisPenalty: number;          // 0, -1, or -2
  };
  allocations: Record<ProductionTrack, number>;
  crisisAllocations: Record<string, { ppCost: number; optionIndex: number }>;
  activeCards: string[];            // Card IDs, max 2 (3 for Guerreira)
  maxCards: number;
  isConfirmed: boolean;
}

export interface TurnPreview {
  tracks: Record<ProductionTrack, TrackPreview>;
  bateria: BateriaPreview;
  harmonia: HarmoniaPreview;
  finance: FinancePreview;
  staff: StaffPreview[];
  crises: CrisisPreviewItem[];
  alerts: PreviewAlert[];
  baselineComparison: BaselinePreview; // "if I only allocate minimums"
}

export interface TrackPreview {
  progressBefore: number;
  progressAfter: number;
  progressDelta: number;
  qualityBefore: number;
  qualityAfter: number;
  qualityDelta: number;
  completionWeek: number | null;
  deadlineWeek: number;
  isOnSchedule: boolean;
  isDecaying: boolean;              // true if at minimum and quality drops
}

export interface BateriaPreview {
  formBefore: number;
  formAfter: number;
  formDelta: number;
  energyBefore: number;
  energyAfter: number;
  energyDelta: number;
  weeksUntilExhaustion: number | null;
  isOvertraining: boolean;
}

export interface HarmoniaPreview {
  sambaFixadoBefore: number;
  sambaFixadoAfter: number;
  marchaBefore: number;
  marchaAfter: number;
  vocalBefore: number;
  vocalAfter: number;
  cardEffectDescription: string | null;
}

export interface FinancePreview {
  budgetBefore: number;
  spendThisTurn: number;
  budgetAfter: number;
  weeksUntilParade: number;
  avgBurnPerWeek: number;
  weeksOfRunway: number;
  isDangerous: boolean;
}

export interface StaffPreview {
  staffId: string;
  name: string;
  role: StaffRole;
  stressBefore: number;
  stressAfter: number;
  stressDelta: number;
  bonusActive: boolean;
  bonusDescription: string;
  warningThreshold: boolean;        // stress will cross 70
  burnoutThreshold: boolean;        // stress will cross 90
}

export interface CrisisPreviewItem {
  crisisId: string;
  title: string;
  isBeingResolved: boolean;
  ppCost: number;
  moneyCost: number;
  resolutionEffectText: string;
  ignoreEffectText: string;
  turnsUntilExpiry: number;
}

export interface PreviewAlert {
  type: 'danger' | 'warning' | 'info' | 'positive';
  message: string;
  track?: ProductionTrack;
}

export interface BaselinePreview {
  tracks: Record<ProductionTrack, { progressDelta: number; qualityDelta: number }>;
  totalCost: number;
}

export type CardEffectType =
  | 'MULTIPLY_QUALITY'     // PP quality output × N for a track
  | 'MULTIPLY_PROGRESS'    // PP progress output × N for a track
  | 'GENERATE_PP'          // +N PP this turn
  | 'BYPASS_MINIMUM'       // A track's minimum PP is 0 this turn
  | 'RUSH'                 // +flat progress, but quality risk if quality < this
  | 'REDUCE_STRESS'        // -N stress on a specific role
  | 'MORALE_BOOST'         // +N morale this turn
  | 'MONEY_SAVE'          // Reduce R$ cost per PP by X% this turn
  | 'special:BATERIA_ENERGY_DOWN'; // Special case

export interface CardEffect {
  type: CardEffectType;
  target?: ProductionTrack;         // Which track this affects, if applicable
  value: number;                    // Multiplier, PP amount, percentage, etc.
  qualityThreshold?: number;        // For RUSH: risk fires if quality < this
  riskPenalty?: number;             // For RUSH: quality lost if threshold not met
  staffRole?: StaffRole;            // For REDUCE_STRESS
}

export interface ProductionCard {
  id: string;
  label: string;
  description: string;
  flavorText?: string;              // Thematic one-liner
  budgetCost: number;
  effects: CardEffect[];
  usesPerSeason: number;            // -1 = unlimited
  usesRemaining: number;
  availableFromWeek: number;
  availableUntilWeek: number;
  unlockedBy: string;               // What unlocked this: 'enredo_afro', 'staff_carnavalesco_high', 'archetype_guerreira', 'crisis_resolved_X', etc.
}


export interface BateriaState {
  form: number;              // 0–100. The current performance level of the bateria.
  energy: number;            // 0–100. Stamina pool. Low energy = diminishing returns from rehearsals.
  peakWeek: number | null;   // The week they reached peak form. null = haven't peaked yet.
  availabilityThisWeek: number; // 0–100. % of drummers available this week.
  outsideGigActive: boolean; // True if a gig is happening this week (player-initiated or event).
  gigIncome: number;         // R$ earned from outside gigs this season.
  rehearsalsHeld: number;    // Total rehearsals held this season.
  rehearsalsMissed: number;  // Total missed due to gigs or events.
}

export interface StaffStress {
  staffId: string;
  stressLevel: number;       // 0–100. Shown as signals, not raw number, in UI.
  energy: number;            // 0–100. Depletes with focus weeks, recovers with rest weeks.
  isResting: boolean;        // True if the player assigned a rest week.
}

// --- ALEGORIA STAGES ---
export type AlegoriaStageId = 'Projeto' | 'Construcao' | 'Acabamento' | 'Transporte';

export interface AlegoriaStage {
  id: AlegoriaStageId;
  label: string;             // Display name in Portuguese
  isUnlocked: boolean;       // true when previous stage is complete
  isComplete: boolean;
  progress: number;          // 0–100, advances with budget spend + time
  quality: number;           // 0–100, the quality output of this stage
  budgetSpentThisStage: number;
  weekStarted: number | null;
  weekCompleted: number | null;
}

// --- PASSISTAS STATE ---
export interface PassistasState {
  form: number;              // 0–100, peaks and decays like bateria
  energy: number;            // 0–100
  peakWeek: number | null;
  rehearsalIntensity: 'Leve' | 'Completo' | 'Aberto' | 'Descanso';
  starPassistas: StarPassista[];
}

export interface StarPassista {
  id: string;
  name: string;
  expressaoCorporal: number;  // 1–200, her individual skill
  resistenciaFisica: number;  // 1–200, how much training she can handle
  confianca: number;          // 1–200, confidence under pressure
  stressLevel: number;        // 0–100 cumulative
  isAvailable: boolean;       // false if on loan/injury
}

// --- MSPB STATE ---
export interface MSPBState {
  quimica: number;           // 0–100, chemistry between the couple
  preparacao: number;        // 0–100, combined readiness score
  coreografiaApproach: 'Ousada' | 'Classica' | null;  // chosen in Stage 1
  rehearsalsCompleted: number;
  ensaioGeralResult: 'Encantou' | 'Solido' | 'Tropeçou' | null;
  mestreStress: number;      // 0–100 cumulative, separate from StaffStress
  pbStress: number;          // 0–100 cumulative
  pbResistenciaFisica: number; // copy from StaffMember at init
}

// --- COMISSAO DE FRENTE STATE ---
export interface ComissaoDeFrenteState {
  approach: 'Tradicional' | 'Tematica' | 'Impacto' | 'Experimental' | null;
  quality: number;           // 0–100, final quality output
  rehearsalWeeksSpent: number;
  isApproachLocked: boolean; // true after week 15 decision
}

// --- HARMONIA SUB-METERS ---
export interface HarmoniaState {
  sambaFixado: number;       // 0–100
  marchaSincronizada: number; // 0–100
  densidadeVocal: number;    // 0–100
  diretorFocus: 'Samba' | 'Marcha' | 'Vocal' | 'Equilibrado';
  conflictWithMestre: boolean; // true if the bateria/harmonia conflict event fired
}

// --- FANTASIA STAGE ---
export type FantasiaApproach = 'AltaCostura' | 'Popular' | 'Intermediaria';

export interface FantasiaState {
  approach: FantasiaApproach | null;
  designQuality: number;     // 0–100, from Criacao stage
  participationRate: number; // 0.0–1.0, % of members who can afford/received fantasia
  deliveryRisk: number;      // 0–100, rises if production is behind schedule
  budgetSpent: number;
}

// --- STAGE-AWARE EVENTS ---
export interface EventOption {
  label: string;
  effect: string;
  // Visibility conditions — ALL must be true for this option to appear in UI
  // If conditions array is empty or undefined, always show
  conditions?: EventOptionCondition[];
}

export interface EventOptionCondition {
  type: 'neighborhoodType' | 'archetype' | 'stressBelow' | 'stressAbove' | 'skillAbove' | 'budgetAbove' | 'uniqueBonus' | 'quimiaAbove' | 'divisionIs' | 'divisionIsNot';
  // For neighborhoodType, archetype, uniqueBonus, divisionIs, divisionIsNot: use stringValue
  stringValue?: string;
  // For numeric checks (stressBelow, stressAbove, skillAbove, budgetAbove, quimiaAbove): use numericValue
  numericValue?: number;
  // For skillAbove: which staff role and which skill
  staffRole?: string;
  skillKey?: string;
}

export interface StageEvent {
  id: string;
  week: number;
  stage: AlegoriaStageId | 'Passistas' | 'MSPB' | 'Harmonia' | 'Fantasia' | 'ComissaoDeFrente';
  title: string;
  description: string;
  options: EventOption[];   // 2–4 options, each with conditions for visibility
  chosenOptionIndex: number | null;
  resolved: boolean;
}

export type EventSeverity = 'Minor' | 'Major';
export type EventDomain = 'Production' | 'Staff' | 'Community' | 'External' | 'Bateria';

export interface PreparationEvent {
  id: string;
  week: number;              // The week it fired.
  severity: EventSeverity;
  domain: EventDomain;
  title: string;
  description: string;
  optionA: { label: string; effect: string; };  // effect is a description string for display
  optionB: { label: string; effect: string; };
  chosen: 'A' | 'B' | null; // null = pending player decision
  resolved: boolean;
}

// --- MESA DE CRISE ---

export type CrisisTier = 'Urgente' | 'Atencao' | 'Oportunidade' | 'Informacao';
// Urgente = red, expires in 1-2 weeks, resolves badly if ignored
// Atencao = yellow, 3-5 week window, escalates to Urgente if unaddressed
// Oportunidade = green, closes permanently (does not escalate), different urgency
// Informacao = blue, no action needed, context only

export interface CrisisOption {
  label: string;
  description: string;           // One sentence: what happens if you choose this
  budgetCost: number;            // R$ cost shown to player before confirming (negative = income)
  ppCost: number;                // NEW: PP cost to resolve this option
  attentionCost: number;         // Deprecated, keeping for compatibility if needed or removed? Removing as per instructions.
  staffRequired: StaffRole | null; // If set, only that staff member can execute this option
  effectCodes: string[];         // Applied immediately on resolve
  consequenceFlags?: string[];   // Consequence flags set after resolve — seed follow-up crises
}

export interface CrisisCard {
  id: string;
  tier: CrisisTier;
  domain: EventDomain;           // reuse existing: 'Production' | 'Staff' | 'Community' | 'External' | 'Bateria'
  title: string;
  description: string;           // 1-2 sentences. The situation.
  inactionConsequence: string;   // Quantified cost of doing nothing, shown clearly to player
  inactionEffectCodes: string[]; // Applied when timer expires without resolution
  options: CrisisOption[];       // 2-3 options. Last option can be "Ignorar por agora" when Atencao.
  weekCreated: number;
  expiresAtWeek: number;         // Week when inaction effects fire automatically
  expiresInWeeks?: number;       // Template field; converted to expiresAtWeek on instantiation
  isResolved: boolean;
  resolvedAtWeek: number | null;
  chosenOptionIndex: number | null;
  minWeek?: number;
  maxWeek?: number;
  requiresFlag?: string;         // Only fires if this consequenceFlag is set
}


export interface PreparationState {
  tracks: Record<ProductionTrack, TrackState>;
  bateria: BateriaState;               // Keep as-is
  staffStress: StaffStress[];          // Keep as-is
  events: PreparationEvent[];          // Keep — legacy event log
  pendingEvent: PreparationEvent | null;
  isBiWeekly: boolean;
  weeksUntilParade: number;
  totalBudgetSpent: number;
  majorEventFiredThisSeason: boolean;

  // Kept from current
  alegoriaCarCount: number | null;
  isBankrupt: boolean;
  bankruptAtWeek: number | null;
  alegoriaStages: AlegoriaStage[];     // Keep stage system
  passistas: PassistasState | null;
  mspb: MSPBState | null;
  comissaoDeFrente: ComissaoDeFrenteState;
  harmoniaState: HarmoniaState;
  fantasia: FantasiaState;
  stageEvents: StageEvent[];
  pendingStageEvent: StageEvent | null;
  consequenceFlags: string[];

  // NEW — PP System
  enredoEffects: EnredoProductionEffects;  // Calculated once at init
  currentTurn: WeekTurnState | null;       // Active during player's turn, null after confirmed
  productionCards: ProductionCard[];       // All available cards this season
  crises: CrisisCard[];                   // All crises (resolved + active)
  activeCrises: CrisisCard[];             // Unresolved crises
  currentAct: 1 | 2 | 3;                 // Derived from week number

  bateriaOptimalMin: number;     // default 75
  bateriaOptimalMax: number;     // default 95

  // DEPRECATED/REMOVED fields from old system (removed here):
  // staffAttention, unlockedActionCards, weeklyCompass, weekPreview,
  // actionsUsedThisWeek, weeklyActionBudgetSpent, pendingStaffActions, pendingActionCards
  // staffCostMultiplier, qualityCeilingBonus, hasImproviseOption
}

// --------------------------------

export type SchoolArchetype =
  | 'Potencia'      // Mangueira, Beija-Flor, Portela — the giants
  | 'Familia'       // Império Serrano, Vila Isabel — community-rooted identity
  | 'Guerreira'     // Viradouro, smaller schools fighting above their weight
  | 'Comercial'     // Sponsor-heavy, media-friendly schools
  | 'Revelacao';    // Access division climbers, hungry underdogs

export type NeighborhoodType =
  | 'SuburbioHistorico'    // Estácio, Mangueira roots — old samba heartland
  | 'ZonaNortePeriferica'  // Madureira, Oswaldo Cruz area
  | 'ZonaSulCentro'        // Tijuca, Centro, Flamengo-adjacent
  | 'BaixadaFluminense'    // Nilópolis, Nova Iguaçu, Padre Miguel
  | 'Interior';            // Niterói, São Gonçalo, further out

export type FanbaisPersonality =
  | 'Apaixonada'  // Wild swings — community explodes or implodes
  | 'Exigente'    // Only quality earns morale; titles demanded
  | 'Fiel';       // Slow to move, hard to break, staff love it here

/**
 * School represents a Samba School in the game.
 * It holds all data related to the school's resources, personnel, and status.
 */
export interface School {
  id: string; // Unique identifier for the school
  name: string; // The display name of the school
  logo?: string; // Path to the school's logo image
  colors: string[]; // Array of hex codes or color names representing the school's identity
  flag?: string; // URL/Path to the school's flag image
  budget: number; // Current funds available for hiring and events
  fanbaseMorale: number; // Represents the happiness/engagement of the fans (0-100)
  staff: StaffMember[]; // Collection of staff members currently hired by the school
  isPlayerControlled: boolean; // Flag indicating if this is the school managed by the player
  prestige: number; // The school's historical importance and reputation (1-200). 180-200 = Historical.
  currentDivision: Division; // The current league/division the school is competing in.
  proLevel: 'Professional' | 'SemiProfessional' | 'SemiAmateur' | 'Amateur'; // The professionalism level of the school

  // Prestige Calculation Metrics
  score_bruto?: number; // Raw score from the prestige formula (for simulation/debugging)
  anos_no_especial: number; // Consecutive/Total years in Special Group
  anos_em_acesso: number; // Years outside Special Group

  history: SchoolHistory; // Detailed history

  enredo: Enredo | null; // The current year's theme. Null if not yet researched/chosen.
  enredoCandidates?: Enredo[]; // The pool of available themes to research/choose from.
  researchFocusId?: string | null; // The ID of the candidate currently being researched.
  sambaEnredo?: SambaEnredo | null; // The chosen samba-enredo for the year.
  preparation: PreparationState | null;  // null during Market phase, initialized at week 9.

  // New Fields
  archetype: SchoolArchetype;
  neighborhoodType: NeighborhoodType;
  fanbaisPersonality: FanbaisPersonality;
  uniqueBonus: string | null; // Identifier for school-specific legendary bonuses
}

// --- Desfile & Apuração Types ---

export type Quesito =
  | 'Bateria'
  | 'SambaEnredo'
  | 'Harmonia'
  | 'Evolucao'
  | 'Enredo'
  | 'AlegoriasAderecos'
  | 'Fantasia'
  | 'ComissaoDeFrente'
  | 'MestreSalaPortaBandeira';

export interface QuitoResult {
  allScores: number[];          // 6 scores (9.0–10.0)
  discarded: number[];          // 3 discarded scores
  surviving: number[];          // 3 surviving scores
  total: number;                // Sum of surviving (0–30.0)
}

export interface SchoolApuracaoResult {
  schoolId: string;
  schoolName: string;
  quesitos: Record<Quesito, QuitoResult>;
  finalTotal: number;           // Sum of all 9 quesito totals (0–270.0)
  finalRank: number;
}

export type ParadeSegmentType =
  | 'ComissaoDeFrente'
  | 'AlaInicial'
  | 'BateriaEntrance'
  | 'AlegoriaPrincipal'
  | 'AlasDesenvolvimento'
  | 'AlegoriasSecundarias'
  | 'DestaquesECasais'
  | 'AlaComunidade'
  | 'InterpretePeak'
  | 'AlegoriaConclusao'
  | 'CabosDaEscola';

export type IncidentType =
  | 'BateriaFalter'
  | 'FloatBreakdown'
  | 'WingGap'
  | 'InterpreteCrack'
  | 'CrowdInvasion'
  | 'RainhaFall'
  | 'FlagDropped'
  | 'UnexpectedBrilhance'
  | 'JudgeControversy';

export interface ParadeIncident {
  id: string;
  type: IncidentType;
  segmentIndex: number;
  resolved: boolean;
  playerChoice?: 'intervene' | 'accept';
  narrativeText: string;
  // Stored for flavor in apuração narrative — affects qualityIndex, not raw scores
  quitoImpact: Partial<Record<Quesito, number>>; // modifier to qualityIndex (-15 to +15)
}

export interface ParadeSegment {
  index: number;
  type: ParadeSegmentType;
  label: string;
  staffFeatured: string[];
  qualityRating: number;
  crowdReaction: 'Frio' | 'Aquecendo' | 'Empolgado' | 'Delirio';
  isComplete: boolean;
  incidentId?: string;
  narrativeText: string;
}

export interface DesfileResult {
  segments: ParadeSegment[];
  incidents: ParadeIncident[];
  overallCrowdMomentum: number;  // 0–100, final state
  // These feed into apuração quesito quality indexes
  quitoQualityIndexes: Record<Quesito, number>;
}

/**
 * GameState tracks the global progression of the game.
 * It manages the timeline and the player's current context.
 */
export interface GameState {
  currentYear: number; // The current year in the game simulation (starts at 1 or 2026)
  currentWeek: number; // The current week of the year (1-52)
  currentPhase: 'Market' | 'Preparation' | 'Parade' | 'Apuracao' | 'Results/Offseason'; // The current phase of the game loop
  playerSchoolId: string | null; // The ID of the school the player is currently managing
  pendingOffers: TransferOffer[]; // Offers waiting for resolution
  resolvedOffers: TransferOffer[]; // Offers resolved this week
  transferNews: string[]; // Market activity log
  hallOfFame: StaffMember[]; // Retired legends with >= 200 reputation

  // Enredo & Samba Flow Control
  showEnredoDeadlineScreen: boolean; // true = block UI, show enredo selection
  pendingSambaSelection: SambaSelectionProcess | null;
  chosenSambaEnredo: SambaEnredo | null;
  preparationSubPhase: 'BiWeekly' | 'Weekly' | null;  // null outside Preparation phase

  startPhaseChosen: boolean;
  playerFired: boolean;
  firedFromSchoolId: string | null;

  // Act I & II State
  desfileResult: DesfileResult | null;
  paradeSegmentIndex: number;
  paradeIncidentPending: ParadeIncident | null;
  apuracaoResults: SchoolApuracaoResult[] | null;
}
