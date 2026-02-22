
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
  progress: number;          // 0–100. 100 = complete.
  quality: number;           // 0–100. Affected by budget invested and staff skill.
  budgetAllocated: number;   // Total R$ committed to this track so far this season.
  staffFocused: boolean;     // Is the responsible staff member focused here this week?
  projectedCompletion: number | null; // Week number it will finish at current pace. null = not started.
  projectedEarly: number | null; // Best case completion week (tight management)
  projectedLate: number | null; // Worst case completion week (loose management)
  finishingRisk: number;     // 0–100. Risk of problems if completed within 2 weeks of parade.
  weeklyBurnRate: number;    // R$ consumed per week at current allocation.
  carCountBonus: number;     // Quality ceiling addition from cars
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

export interface PreparationState {
  tracks: Record<ProductionTrack, TrackState>;
  bateria: BateriaState;
  staffStress: StaffStress[];
  events: PreparationEvent[];          // All events fired this season
  pendingEvent: PreparationEvent | null; // Event awaiting player decision
  isBiWeekly: boolean;                 // true for weeks 9–28, false for 29–44
  weeksUntilParade: number;            // Countdown. 36 at start, 0 at parade.
  totalBudgetSpent: number;            // Total R$ spent across all tracks this season.
  majorEventFiredThisSeason: boolean;  // Only one major per season.

  alegoriaCarCount: number | null;     // null = not yet chosen
  isBankrupt: boolean;
  bankruptAtWeek: number | null;

  // New Fields
  staffCostMultiplier: number;   // Default 1.0. Potencia = 1.15, Guerreira = 0.9 (cheaper staff possible)
  qualityCeilingBonus: number;   // Default 0. Potencia = +10. Added to all track quality calculations.
  hasImproviseOption: boolean;   // Default false. Guerreira schools get a 3rd event option sometimes.
  consequenceFlags: string[];    // List of string flags from event choices that seed follow-up events.
  bateriaOptimalMin: number;     // default 75
  bateriaOptimalMax: number;     // default 95
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
