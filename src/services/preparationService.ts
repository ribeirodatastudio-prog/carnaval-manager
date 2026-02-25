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
  StaffAttentionAction,
  StaffRole,
  ActionCard,
  ActionCardUnlockSource,
  WeeklyBudgetCompass,
  WeekPreview,
  WeekPreviewItem
} from '../types/models';

const RECOMMENDED_BURN: Record<string, Record<ProductionTrack, number>> = {
  'Grupo Especial': { Alegorias: 45000, Fantasias: 25000, Bateria: 15000, Harmonia: 15000 },
  'Série Ouro':     { Alegorias: 8000,  Fantasias: 4000,  Bateria: 2500,  Harmonia: 2500  },
  'Série Prata':    { Alegorias: 2200,  Fantasias: 1200,  Bateria: 800,   Harmonia: 800   },
  'Série Bronze':   { Alegorias: 650,   Fantasias: 350,   Bateria: 250,   Harmonia: 250   },
  'Grupo de Avaliação': { Alegorias: 165, Fantasias: 85,  Bateria: 65,    Harmonia: 65    },
};

const WEEKLY_RECOMMENDED_SPEND: Record<string, Record<'BiWeekly' | 'RetaFinal', number>> = {
  'Grupo Especial':     { BiWeekly: 85000,  RetaFinal: 120000 },
  'Série Ouro':         { BiWeekly: 16000,  RetaFinal: 22000  },
  'Série Prata':        { BiWeekly: 5000,   RetaFinal: 7000   },
  'Série Bronze':       { BiWeekly: 1400,   RetaFinal: 2000   },
  'Grupo de Avaliação': { BiWeekly: 380,    RetaFinal: 550    },
};

// --- EVENTS DEFINITIONS (Stage Events) ---
const FANTASIA_APPROACH_CHOICE_EVENT: StageEvent = {
  id: 'fantasia-approach-choice',
  week: 9,
  stage: 'Fantasia',
  title: 'Escolha da Linha das Fantasias',
  description: 'O Diretor de Carnaval apresenta três abordagens para as fantasias deste ano. Cada escolha tem implicações diferentes para o orçamento e a qualidade.',
  options: [
    {
      label: 'Alta Costura',
      effect: 'FANTASIA_APPROACH_ALTACOSTURA',
      // No conditions — always visible
    },
    {
      label: 'Linha Intermediária',
      effect: 'FANTASIA_APPROACH_INTERMEDIARIA',
    },
    {
      label: 'Fantasia Popular',
      effect: 'FANTASIA_APPROACH_POPULAR',
    },
  ],
  chosenOptionIndex: null,
  resolved: false,
};

const MSPB_COREOGRAFIA_EVENT: StageEvent = {
  id: 'mspb-coreografia-choice',
  week: 16,
  stage: 'MSPB',
  title: '💃 Escolha da Coreografia do Casal',
  description: 'O Mestre-Sala e a Porta-Bandeira precisam definir a abordagem coreográfica para o desfile. Cada caminho tem riscos e recompensas diferentes.',
  options: [
    {
      label: '🔥 Coreografia Ousada',
      effect: 'MSPB_OUSADA',
      // Show only if quimica >= 40 — risky without chemistry
      conditions: [{ type: 'quimiaAbove', numericValue: 39 }],
    },
    {
      label: '✨ Coreografia Clássica',
      effect: 'MSPB_CLASSICA',
      // Always visible — the safe choice
    },
    {
      label: '🤝 Deixar o Casal Decidir',
      effect: 'MSPB_NEGOCIAR',
      // Always visible — outcome depends on quimica
    },
  ],
  chosenOptionIndex: null,
  resolved: false,
};

const COMISSAO_APPROACH_EVENT: StageEvent = {
  id: 'comissao-approach',
  week: 15,
  stage: 'ComissaoDeFrente',
  title: 'Conceito da Comissão de Frente',
  description: 'Como a Comissão vai abrir o seu desfile?',
  options: [
    {
      label: '🎩 Tradicional e Elegante',
      effect: 'COMISSAO_TRADICIONAL',
      // Always visible
    },
    {
      label: '🎭 Coreografia Temática',
      effect: 'COMISSAO_TEMATICA',
      // Always visible
    },
    {
      label: '💥 Performance de Impacto',
      effect: 'COMISSAO_IMPACTO',
      // Requires external choreographer budget — only visible if budget > threshold
      conditions: [
        { type: 'budgetAbove', numericValue: 50000 }  // adjust per division
      ],
    },
    {
      label: '🌀 Conceito Experimental',
      effect: 'COMISSAO_EXPERIMENTAL',
      // Only available to high prestige schools or high reputation carnavalesco
      conditions: [
        // Show if prestige > 120 OR carnavalesco reputation > 140
        // Jules: implement as OR logic — show if ANY condition group passes
        { type: 'skillAbove', staffRole: 'Carnavalesco', skillKey: 'reputation', numericValue: 140 },
      ],
    },
  ],
  chosenOptionIndex: null,
  resolved: false,
};

// --- CRISIS POOL ---

const CRISIS_POOL: Omit<CrisisCard, 'id' | 'weekCreated' | 'expiresAtWeek' | 'isResolved' | 'resolvedAtWeek' | 'chosenOptionIndex'>[] = [
  // PRODUCTION
  {
    tier: 'Urgente', domain: 'Production',
    title: 'Carpinteiro principal hospitalizado',
    description: 'O carpinteiro-chefe do barracão foi internado. Sem reposição, a etapa de Acabamento perde três semanas.',
    inactionConsequence: 'Etapa Acabamento: -3 semanas de progresso. Risco de entrega Fantasias +20%.',
    inactionEffectCodes: ['ALEGORIAS_ACTIVE_STAGE_PROGRESS_MINUS_30', 'FANTASIAS_DELIVERY_RISK_UP_20'],
    expiresInWeeks: 2,
    options: [
      {
        label: 'Contratar reforço emergencial',
        description: 'Resolve completamente. Custo alto, sem penalidade de progresso.',
        budgetCost: 14000, attentionCost: 1, staffRequired: 'MestreDeBarracao',
        effectCodes: ['NONE'],
      },
      {
        label: 'Redistribuir equipe do barracão',
        description: 'Carnavalesco absorve a gestão. Resolve a crise, mas aumenta seu stress.',
        budgetCost: 0, attentionCost: 2, staffRequired: 'Carnavalesco',
        effectCodes: ['CARNAVALESCO_STRESS_UP_20', 'ALEGORIAS_PROGRESS_PARTIAL_KEEP'],
      },
    ],
  },
  {
    tier: 'Atencao', domain: 'Production',
    title: 'Fornecedor de penas atrasou entrega',
    description: 'O fornecedor principal atrasou. Cada semana sem resolução: +8% no risco de entrega das Fantasias.',
    inactionConsequence: 'Risco de entrega Fantasias +8% por semana sem resolução.',
    inactionEffectCodes: ['FANTASIAS_DELIVERY_RISK_UP_8_PER_WEEK'],
    expiresInWeeks: 4,
    options: [
      {
        label: 'Frete expresso',
        description: 'Elimina o risco completamente. Custo financeiro.',
        budgetCost: 8000, attentionCost: 0, staffRequired: null,
        effectCodes: ['FANTASIAS_DELIVERY_RISK_RESET'],
      },
      {
        label: 'Fornecedor alternativo',
        description: 'Sem custo extra, mas material de qualidade inferior.',
        budgetCost: 0, attentionCost: 1, staffRequired: null,
        effectCodes: ['FANTASIAS_QUALITY_DOWN_6', 'FANTASIAS_DELIVERY_RISK_RESET'],
      },
      {
        label: 'Aguardar mais uma semana',
        description: 'Risco sobe esta semana. Se não resolver, vira Urgente.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['CRISIS_PARTIAL_ESCALATE'],
      },
    ],
  },
  {
    tier: 'Urgente', domain: 'Production',
    title: 'Telhado do barracão cedendo',
    description: 'Chuvas pesadas ameaçam o barracão. Uma alegoria em construção pode ser destruída.',
    inactionConsequence: 'Alegoria ativa perde 20% de qualidade e 2 semanas de progresso.',
    inactionEffectCodes: ['ALEGORIAS_QUALITY_DOWN_20', 'ALEGORIAS_ACTIVE_STAGE_PROGRESS_MINUS_20'],
    expiresInWeeks: 1,
    options: [
      {
        label: 'Reforma emergencial',
        description: 'Protege completamente o barracão.',
        budgetCost: 12000, attentionCost: 0, staffRequired: null,
        effectCodes: ['NONE'],
      },
      {
        label: 'Cobrir com lona e torcer',
        description: 'Mais barato. 40% de chance de chuva causar dano mesmo assim.',
        budgetCost: 2000, attentionCost: 0, staffRequired: null,
        effectCodes: ['ALEGORIAS_RAIN_GAMBLE_40PCT'],
      },
    ],
  },
  {
    tier: 'Oportunidade', domain: 'Production',
    title: 'Artista da comunidade quer colaborar',
    description: 'Um escultor local renomado ofereceu trabalho pró-bono em uma alegoria. Se não aceitar esta semana, ele fecha com a escola rival.',
    inactionConsequence: 'Oportunidade fecha permanentemente.',
    inactionEffectCodes: ['CONSEQUENCE_RIVAL_GAINS_ARTIST'],
    expiresInWeeks: 1,
    options: [
      {
        label: 'Incorporar ao projeto',
        description: 'Melhora a qualidade da alegoria ativa.',
        budgetCost: 2000, attentionCost: 1, staffRequired: 'Carnavalesco',
        effectCodes: ['ALEGORIAS_QUALITY_UP_8'],
      },
      {
        label: 'Declinar gentilmente',
        description: 'Nenhum efeito.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['NONE'],
      },
    ],
  },
  // STAFF
  {
    tier: 'Urgente', domain: 'Staff',
    title: 'Carnavalesco com crise criativa',
    description: 'Há duas semanas o Carnavalesco está travado no conceito do terceiro carro. A equipe do barracão espera.',
    inactionConsequence: 'Alegorias perdem 2 semanas de progresso. Stress do Carnavalesco +15.',
    inactionEffectCodes: ['ALEGORIAS_ACTIVE_STAGE_PROGRESS_MINUS_20', 'CARNAVALESCO_STRESS_UP_15'],
    expiresInWeeks: 2,
    options: [
      {
        label: 'Dar uma semana de descanso',
        description: 'Progresso pausa, mas ele volta mais criativo.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['CARNAVALESCO_REST_FORCED', 'CARNAVALESCO_STRESS_DOWN_20'],
      },
      {
        label: 'Trazer um consultor criativo externo',
        description: 'Desbloqueio imediato. Carnavalesco pode não gostar.',
        budgetCost: 9000, attentionCost: 1, staffRequired: null,
        effectCodes: ['ALEGORIAS_QUALITY_UP_5', 'CARNAVALESCO_STRESS_UP_5'],
      },
      {
        label: 'Pressionar para resolver',
        description: 'Progresso continua, mas stress explode.',
        budgetCost: 0, attentionCost: 2, staffRequired: 'DiretorDeCarnaval',
        effectCodes: ['CARNAVALESCO_STRESS_UP_25', 'ALEGORIAS_PROGRESS_CONTINUE'],
      },
    ],
  },
  {
    tier: 'Atencao', domain: 'Staff',
    title: 'Conflito entre Mestre e Diretor de Harmonia',
    description: 'Desacordo sobre o andamento do samba está criando dois campos na escola.',
    inactionConsequence: 'Bateria e Harmonia perdem 5 pontos de qualidade cada.',
    inactionEffectCodes: ['BATERIA_FORM_DOWN_5', 'HARMONIA_ALL_DOWN_5'],
    expiresInWeeks: 3,
    options: [
      {
        label: 'Apoiar o Mestre de Bateria',
        description: 'Bateria mantém o andamento. Diretor de Harmonia fica insatisfeito.',
        budgetCost: 0, attentionCost: 1, staffRequired: null,
        effectCodes: ['HARMONIA_ALL_DOWN_5', 'BATERIA_FORM_UP_3'],
      },
      {
        label: 'Apoiar o Diretor de Harmonia',
        description: 'Harmonia melhora. Mestre aceita, mas bateria perde punch.',
        budgetCost: 0, attentionCost: 1, staffRequired: null,
        effectCodes: ['BATERIA_FORM_DOWN_3', 'HARMONIA_ALL_UP_5'],
      },
      {
        label: 'Convocar reunião conjunta',
        description: 'Custo de atenção alto mas resolve sem penalizar nenhum lado.',
        budgetCost: 0, attentionCost: 3, staffRequired: null,
        effectCodes: ['NONE'],
      },
    ],
  },
  {
    tier: 'Urgente', domain: 'Staff',
    title: 'Intérprete com problema vocal',
    description: 'O intérprete apresentou rouquidão severa. Médico recomenda repouso de 2 semanas.',
    inactionConsequence: 'Harmonia perde 15 pontos. Risco de nota baixa em SambaEnredo no desfile.',
    inactionEffectCodes: ['HARMONIA_SAMBA_FIXADO_DOWN_15', 'DESFILE_INTERPRETE_RISK_FLAG'],
    expiresInWeeks: 1,
    options: [
      {
        label: 'Respeitar o repouso médico',
        description: 'Harmonia pausa 2 semanas. Intérprete chega ao desfile 100%.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['HARMONIA_PAUSE_2_WEEKS', 'INTERPRETE_DESFILE_BONUS_10'],
      },
      {
        label: 'Tratamento intensivo e manter ensaios',
        description: 'Harmonia continua. 30% de chance de agravar o problema.',
        budgetCost: 6000, attentionCost: 1, staffRequired: null,
        effectCodes: ['INTERPRETE_GAMBLE_30PCT_AGRAVAMENTO'],
      },
    ],
  },
  // COMMUNITY
  {
    tier: 'Atencao', domain: 'Community',
    title: 'Ala ameaça não desfilar',
    description: 'Uma ala importante está insatisfeita com a fantasia designada. Ameaçam não aparecer no desfile.',
    inactionConsequence: 'Fantasia perde 8 pontos de qualidade. Harmonia perde 5.',
    inactionEffectCodes: ['FANTASIAS_QUALITY_DOWN_8', 'HARMONIA_ALL_DOWN_5'],
    expiresInWeeks: 3,
    options: [
      {
        label: 'Redesenhar a fantasia da ala',
        description: 'Satisfaz a ala. Custa tempo de produção.',
        budgetCost: 5000, attentionCost: 1, staffRequired: null,
        effectCodes: ['ALEGORIAS_ACTIVE_STAGE_PROGRESS_MINUS_10', 'MORALE_UP_5'],
      },
      {
        label: 'Negociar e ceder parcialmente',
        description: 'Troca um elemento. Ala aceita, qualidade cai menos.',
        budgetCost: 2000, attentionCost: 2, staffRequired: 'DiretorDeCarnaval',
        effectCodes: ['FANTASIAS_QUALITY_DOWN_3'],
      },
      {
        label: 'Não ceder. Manter o projeto original.',
        description: 'Moral cai. Risco de a ala faltar no desfile.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['MORALE_DOWN_8', 'CRISIS_ESCALATE'],
      },
    ],
  },
  {
    tier: 'Oportunidade', domain: 'Community',
    title: 'Patrocinador local interessado',
    description: 'Uma empresa do bairro quer patrocinar uma ala. Prazo: esta semana.',
    inactionConsequence: 'Oportunidade fecha. Empresa assina com a escola rival.',
    inactionEffectCodes: ['CONSEQUENCE_RIVAL_GETS_SPONSOR'],
    expiresInWeeks: 1,
    options: [
      {
        label: 'Fechar o patrocínio',
        description: 'Verba extra imediata. Empresa vai querer visibilidade na ala.',
        budgetCost: -25000, attentionCost: 1, staffRequired: null,
        effectCodes: ['BUDGET_PLUS_25K', 'MORALE_UP_5'],
        consequenceFlags: ['sponsor_local_ativo'],
      },
      {
        label: 'Declinar por conflito criativo',
        description: 'Mantém a liberdade artística.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['NONE'],
      },
    ],
  },
  {
    tier: 'Informacao', domain: 'Community',
    title: 'Escola rival lançou samba nas redes',
    description: 'O samba da escola rival está viralizando. A torcida já está fazendo comparações.',
    inactionConsequence: 'Nenhuma ação necessária agora.',
    inactionEffectCodes: [],
    expiresInWeeks: 99,
    options: [
      {
        label: 'Ok, entendido.',
        description: '',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['NONE'],
      },
    ],
  },
  // EXTERNAL
  {
    tier: 'Urgente', domain: 'External',
    title: 'Prefeitura bloqueou a verba',
    description: 'Um bloqueio administrativo segurou o repasse da prefeitura. Caixa vai apertar drasticamente.',
    inactionConsequence: 'Todos os burn rates caem 30% por 2 semanas.',
    inactionEffectCodes: ['ALL_TRACKS_BURN_RATE_DOWN_30PCT_2WEEKS'],
    expiresInWeeks: 2,
    options: [
      {
        label: 'Acionar advogado e escalar',
        description: 'Verba liberada em 1 semana. Custo jurídico.',
        budgetCost: 8000, attentionCost: 2, staffRequired: null,
        effectCodes: ['BUDGET_UNBLOCK_NEXT_WEEK'],
      },
      {
        label: 'Solicitar adiantamento ao banco',
        description: 'Caixa se mantém mas com juros.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['BUDGET_ADVANCE_MINUS_10K_INTEREST'],
      },
      {
        label: 'Cortar gastos temporariamente',
        description: 'Sem custo extra, mas produção atrasa.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['ALL_TRACKS_BURN_RATE_DOWN_20PCT_2WEEKS'],
      },
    ],
  },
  {
    tier: 'Atencao', domain: 'External',
    title: 'Vistoria técnica da LIESA antecipada',
    description: 'A LIESA marcou vistoria das alegorias para daqui a 3 semanas. Carros incompletos podem ser multados.',
    inactionConsequence: 'Multa de R$15.000 e penalidade de vistoria.',
    inactionEffectCodes: ['BUDGET_MINUS_15K', 'ALEGORIAS_VISTORIA_PENALTY_FLAG'],
    expiresInWeeks: 3,
    options: [
      {
        label: 'Acelerar produção (hora extra)',
        description: 'Investimento para ter os carros prontos para a vistoria.',
        budgetCost: 18000, attentionCost: 1, staffRequired: null,
        effectCodes: ['ALEGORIAS_ACTIVE_STAGE_PROGRESS_PLUS_15'],
      },
      {
        label: 'Solicitar reagendamento',
        description: 'Pode funcionar. 50% de chance de a LIESA aceitar.',
        budgetCost: 0, attentionCost: 1, staffRequired: null,
        effectCodes: ['EXTERNAL_VISTORIA_RESCHEDULED_50PCT'],
      },
    ],
  },
  // BATERIA
  {
    tier: 'Atencao', domain: 'Bateria',
    title: 'Rolo entre ritmistas históricos',
    description: 'Uma briga entre veteranos após um ensaio deixou o clima pesado.',
    inactionConsequence: 'Bateria perde 8 pontos de forma. Disponibilidade cai 15%.',
    inactionEffectCodes: ['BATERIA_FORM_DOWN_8', 'BATERIA_AVAILABILITY_DOWN_15'],
    expiresInWeeks: 3,
    options: [
      {
        label: 'O Mestre resolve internamente',
        description: 'Mestre usa sua autoridade. Funciona mas desgasta.',
        budgetCost: 0, attentionCost: 2, staffRequired: 'MestreDeBateria',
        effectCodes: ['BATERIA_FORM_DOWN_3', 'MESTRE_STRESS_UP_10'],
      },
      {
        label: 'Presidente intervém diretamente',
        description: 'Você vai ao barracão pessoalmente. Custo alto de atenção, gesto surte efeito.',
        budgetCost: 0, attentionCost: 3, staffRequired: null,
        effectCodes: ['BATERIA_FORM_STABLE', 'MORALE_UP_5'],
      },
    ],
  },
  {
    tier: 'Oportunidade', domain: 'Bateria',
    title: 'Ritmista talentoso sem escola',
    description: 'Um ritmista jovem de alta reputação está livre. Quer ensaiar sem contrato formal esta temporada.',
    inactionConsequence: 'Oportunidade fecha — outro clube o recruta.',
    inactionEffectCodes: [],
    expiresInWeeks: 1,
    options: [
      {
        label: 'Incorporar imediatamente',
        description: 'Sem custo. Melhora a forma da bateria.',
        budgetCost: 0, attentionCost: 1, staffRequired: 'MestreDeBateria',
        effectCodes: ['BATERIA_FORM_UP_5'],
      },
      {
        label: 'Não há vagas no momento',
        description: 'Nenhum efeito.',
        budgetCost: 0, attentionCost: 0, staffRequired: null,
        effectCodes: ['NONE'],
      },
    ],
  },
];

// --- STAFF ACTION POOL ---

export const STAFF_ACTION_POOL: Record<StaffRole, StaffAttentionAction[]> = {
  Carnavalesco: [
    {
      id: 'carn-revisar-carro',
      label: 'Revisar projeto do carro ativo',
      description: 'Carnavalesco revisa pessoalmente o carro em construção. +qualidade Alegorias.',
      attentionCost: 1, budgetCost: 0,
      effectCodes: ['ALEGORIAS_QUALITY_UP_4'],
      availableWeeks: [9, 35],
    },
    {
      id: 'carn-acompanhar-barracao',
      label: 'Acompanhar o barracão pessoalmente',
      description: 'Presença física acelera a equipe. +progresso Alegorias esta semana.',
      attentionCost: 1, budgetCost: 0,
      effectCodes: ['ALEGORIAS_ACTIVE_STAGE_PROGRESS_PLUS_8'],
      availableWeeks: [9, 40],
    },
    {
      id: 'carn-resolver-conflito-ala',
      label: 'Resolver conflito com ala',
      description: 'Carnavalesco intervém na crise da ala. Pode resolver crise ativa de comunidade.',
      attentionCost: 1, budgetCost: 0,
      effectCodes: ['RESOLVE_COMMUNITY_CRISIS_IF_ACTIVE'],
      availableWeeks: [9, 44],
    },
    {
      id: 'carn-sprint-criativo',
      label: 'Sprint criativo intenso',
      description: 'Carnavalesco trabalha 80h esta semana. Progresso alto, energia cai muito.',
      attentionCost: 3, budgetCost: 0,
      effectCodes: ['ALEGORIAS_ACTIVE_STAGE_PROGRESS_PLUS_20', 'CARNAVALESCO_ENERGY_DOWN_20'],
      availableWeeks: [9, 38],
    },
    {
      id: 'carn-descanso',
      label: 'Dia de descanso',
      description: 'Sem output esta semana. Recupera energia e reduz stress.',
      attentionCost: 0, budgetCost: 0,
      effectCodes: ['CARNAVALESCO_REST', 'CARNAVALESCO_ENERGY_UP_15', 'CARNAVALESCO_STRESS_DOWN_15'],
      availableWeeks: [9, 44],
    },
  ],
  MestreDeBateria: [
    {
      id: 'mestre-ensaio-fechado',
      label: 'Ensaio fechado intenso',
      description: 'Ensaio técnico sem plateia. Forma sobe, energia cai.',
      attentionCost: 2, budgetCost: 4000,
      effectCodes: ['BATERIA_FORM_UP_8', 'BATERIA_ENERGY_DOWN_6'],
      availableWeeks: [9, 44],
    },
    {
      id: 'mestre-ensaio-aberto',
      label: 'Ensaio aberto na quadra',
      description: 'Galera presente. Moral sobe mas bateria gasta mais energia.',
      attentionCost: 2, budgetCost: 2000,
      effectCodes: ['BATERIA_FORM_UP_5', 'BATERIA_ENERGY_DOWN_8', 'MORALE_UP_6'],
      availableWeeks: [9, 44],
    },
    {
      id: 'mestre-ajuste-tecnico',
      label: 'Ajuste técnico de naipe',
      description: 'Trabalho focado em naipe específico. Forma moderada, sem desgaste.',
      attentionCost: 1, budgetCost: 0,
      effectCodes: ['BATERIA_FORM_UP_4'],
      availableWeeks: [9, 44],
    },
    {
      id: 'mestre-descanso',
      label: 'Semana de recuperação',
      description: 'Sem ensaio formal. Energia recupera, forma estabiliza.',
      attentionCost: 0, budgetCost: 0,
      effectCodes: ['BATERIA_ENERGY_UP_15', 'MESTRE_STRESS_DOWN_10'],
      availableWeeks: [9, 44],
    },
  ],
  DiretorDeHarmonia: [
    {
      id: 'harmonia-fixar-samba',
      label: 'Sessão de fixação do samba',
      description: 'Foco total na letra e melodia. Samba Fixado sobe.',
      attentionCost: 2, budgetCost: 0,
      effectCodes: ['HARMONIA_SAMBA_FIXADO_UP_10'],
      availableWeeks: [9, 40],
    },
    {
      id: 'harmonia-sincronia-marcha',
      label: 'Treino de sincronia de marcha',
      description: 'Alas mais coordenadas. Marcha Sincronizada sobe.',
      attentionCost: 2, budgetCost: 0,
      effectCodes: ['HARMONIA_MARCHA_UP_8'],
      availableWeeks: [9, 40],
    },
    {
      id: 'harmonia-equilibrado',
      label: 'Sessão equilibrada',
      description: 'Progresso moderado em todos os sub-metros.',
      attentionCost: 1, budgetCost: 0,
      effectCodes: ['HARMONIA_ALL_UP_4'],
      availableWeeks: [9, 44],
    },
  ],
  DiretorDeCarnaval: [
    {
      id: 'diretor-mediar-conflito',
      label: 'Mediar conflito interno',
      description: 'Resolve uma crise de Staff ativa sem custo extra.',
      attentionCost: 2, budgetCost: 0,
      effectCodes: ['RESOLVE_STAFF_CRISIS_IF_ACTIVE'],
      availableWeeks: [9, 44],
    },
    {
      id: 'diretor-pressionar-producao',
      label: 'Pressionar produção',
      description: 'Acompanha o barracão. Progresso extra, sem custo.',
      attentionCost: 2, budgetCost: 0,
      effectCodes: ['ALEGORIAS_ACTIVE_STAGE_PROGRESS_PLUS_6'],
      availableWeeks: [9, 38],
    },
  ],
  MestreDeBarracao: [
    {
      id: 'barracao-logistica',
      label: 'Otimizar logística do barracão',
      description: 'Reorganiza a linha de produção. Progresso extra esta semana.',
      attentionCost: 2, budgetCost: 0,
      effectCodes: ['ALEGORIAS_ACTIVE_STAGE_PROGRESS_PLUS_10'],
      availableWeeks: [9, 40],
    },
    {
      id: 'barracao-qualidade',
      label: 'Inspeção de qualidade',
      description: 'Revisa acabamento. Qualidade Alegorias sobe moderadamente.',
      attentionCost: 1, budgetCost: 0,
      effectCodes: ['ALEGORIAS_QUALITY_UP_5'],
      availableWeeks: [20, 44],
    },
  ],
  // These roles are not in the attention system — empty arrays required for type safety
  Interprete: [], MestreSala: [], PortaBandeira: [], RainhaDeBateria: [], Coreografo: [],
};

// --- ACTION CARD DEFINITIONS ---

export const ACTION_CARD_DEFINITIONS: ActionCard[] = [
  // FANTASIA
  {
    id: 'ac-atelie-especialista',
    label: 'Consultar ateliê especialista',
    description: 'Um ateliê de alta costura revisa o projeto. Qualidade Fantasias +12, eleva o teto.',
    unlockedBy: 'FantasiaAltaCostura',
    budgetCost: 22000, attentionCost: 1, staffRequired: null,
    effectCodes: ['FANTASIAS_QUALITY_UP_12', 'FANTASIAS_CEILING_UP_10'],
    usesPerSeason: 1, usesRemaining: 1,
    availableFromWeek: 15, availableUntilWeek: 35, phase: 'Construcao',
  },
  {
    id: 'ac-mutirao-comunidade',
    label: 'Mutirão do bairro',
    description: 'A comunidade se mobiliza para ajudar nas fantasias. Risco de entrega cai, moral sobe.',
    unlockedBy: 'FantasiaPopular',
    budgetCost: 0, attentionCost: 1, staffRequired: null,
    effectCodes: ['FANTASIAS_DELIVERY_RISK_DOWN_15', 'MORALE_UP_8'],
    usesPerSeason: 2, usesRemaining: 2,
    availableFromWeek: 12, availableUntilWeek: 40, phase: 'Both',
  },
  {
    id: 'ac-fornecedor-parceiro',
    label: 'Acordo com fornecedor parceiro',
    description: 'Contrato estável. Risco de entrega zerado.',
    unlockedBy: 'FantasiaIntermediaria',
    budgetCost: 8000, attentionCost: 0, staffRequired: null,
    effectCodes: ['FANTASIAS_DELIVERY_RISK_RESET', 'FANTASIAS_QUALITY_UP_5'],
    usesPerSeason: 1, usesRemaining: 1,
    availableFromWeek: 12, availableUntilWeek: 30, phase: 'Construcao',
  },
  // MSPB
  {
    id: 'ac-ensaio-galeria',
    label: 'Ensaio aberto do casal',
    description: 'Apresentação pública do casal. Química sobe muito se der certo, cai se tropeçar.',
    unlockedBy: 'MSPBOusada',
    budgetCost: 3000, attentionCost: 1, staffRequired: 'MestreSala',
    effectCodes: ['MSPB_QUIMICA_HIGH_RISK_HIGH_REWARD'],
    usesPerSeason: 2, usesRemaining: 2,
    availableFromWeek: 16, availableUntilWeek: 40, phase: 'Both',
  },
  {
    id: 'ac-ajuste-tecnico-mspb',
    label: 'Ajuste técnico coreográfico',
    description: 'Sessão fechada de refinamento. Química e preparação sobem consistentemente.',
    unlockedBy: 'MSPBClassica',
    budgetCost: 0, attentionCost: 1, staffRequired: 'MestreSala',
    effectCodes: ['MSPB_QUIMICA_UP_5', 'MSPB_PREPARACAO_UP_6'],
    usesPerSeason: -1, usesRemaining: -1,
    availableFromWeek: 15, availableUntilWeek: 44, phase: 'Both',
  },
  // COMISSÃO
  {
    id: 'ac-pre-estreia',
    label: 'Pré-estreia privada',
    description: 'Show fechado para imprensa e patrocinadores. Gera interesse e receita potencial.',
    unlockedBy: 'ComissaoImpacto',
    budgetCost: 12000, attentionCost: 2, staffRequired: null,
    effectCodes: ['MORALE_UP_10', 'CONSEQUENCE_SPONSOR_APPROACH'],
    usesPerSeason: 1, usesRemaining: 1,
    availableFromWeek: 20, availableUntilWeek: 35, phase: 'Construcao',
  },
  {
    id: 'ac-manifesto-artistico',
    label: 'Manifesto artístico público',
    description: 'Comissão experimental gera debate. Alto risco/recompensa em Enredo e ComissaoDeFrente.',
    unlockedBy: 'ComissaoExperimental',
    budgetCost: 0, attentionCost: 2, staffRequired: 'Carnavalesco',
    effectCodes: ['COMISSAO_QUALITY_UP_10_OR_DOWN_8_GAMBLE', 'ENREDO_CONTROVERSY_UP_10'],
    usesPerSeason: 1, usesRemaining: 1,
    availableFromWeek: 20, availableUntilWeek: 40, phase: 'Both',
  },
  {
    id: 'ac-coreografia-comunitaria',
    label: 'Coreografia com a comunidade',
    description: 'Comissão temática incorpora dançarinos do bairro. Moral alta, qualidade moderada.',
    unlockedBy: 'ComissaoTematica',
    budgetCost: 3000, attentionCost: 1, staffRequired: null,
    effectCodes: ['COMISSAO_QUALITY_UP_6', 'MORALE_UP_10'],
    usesPerSeason: 2, usesRemaining: 2,
    availableFromWeek: 15, availableUntilWeek: 40, phase: 'Both',
  },
  // ENREDO
  {
    id: 'ac-pesquisa-imersiva',
    label: 'Pesquisa imersiva de campo',
    description: 'Carnavalesco visita locações do enredo. Qualidade Enredo e Alegorias sobem.',
    unlockedBy: 'EnredoHighDifficulty',
    budgetCost: 15000, attentionCost: 2, staffRequired: 'Carnavalesco',
    effectCodes: ['ALEGORIAS_QUALITY_UP_8', 'ENREDO_RESEARCH_BONUS_5'],
    usesPerSeason: 1, usesRemaining: 1,
    availableFromWeek: 10, availableUntilWeek: 25, phase: 'Construcao',
  },
  {
    id: 'ac-abracar-polemica',
    label: 'Abraçar a polêmica publicamente',
    description: 'Enredo controverso ganha visibilidade. Alto potencial, risco de desvantagem nos julgamentos.',
    unlockedBy: 'EnredoHighControversy',
    budgetCost: 0, attentionCost: 1, staffRequired: 'DiretorDeCarnaval',
    effectCodes: ['MORALE_UP_15', 'ENREDO_CONTROVERSY_SCORE_UP_15', 'ENREDO_HIDDEN_RISK_UP_10'],
    usesPerSeason: 1, usesRemaining: 1,
    availableFromWeek: 10, availableUntilWeek: 35, phase: 'Both',
  },
  {
    id: 'ac-memoria-viva',
    label: 'Memória viva — entrevistas da comunidade',
    description: 'Enredo comunitário ganha profundidade. Harmonia fixa o samba mais rápido.',
    unlockedBy: 'EnredoComunitario',
    budgetCost: 0, attentionCost: 1, staffRequired: null,
    effectCodes: ['HARMONIA_SAMBA_FIXADO_UP_12', 'MORALE_UP_6'],
    usesPerSeason: 2, usesRemaining: 2,
    availableFromWeek: 9, availableUntilWeek: 30, phase: 'Construcao',
  },
  {
    id: 'ac-ativacao-patrocinador',
    label: 'Ativação do patrocinador',
    description: 'Enredo patrocinado permite ativações de marketing. Verba extra, mas visibilidade comercial.',
    unlockedBy: 'EnredoPatrocinado',
    budgetCost: 0, attentionCost: 1, staffRequired: null,
    effectCodes: ['BUDGET_PLUS_30K', 'MORALE_DOWN_3'],
    usesPerSeason: 2, usesRemaining: 2,
    availableFromWeek: 9, availableUntilWeek: 40, phase: 'Both',
  },
  {
    id: 'ac-celebracao-raizes',
    label: 'Celebração das raízes afro-brasileiras',
    description: 'Enredo afro-brasileiro ativa o orgulho da comunidade. Bonificação em Harmonia e moral.',
    unlockedBy: 'EnredoAfroBrasileiro',
    budgetCost: 0, attentionCost: 1, staffRequired: null,
    effectCodes: ['HARMONIA_ALL_UP_8', 'MORALE_UP_10'],
    usesPerSeason: 2, usesRemaining: 2,
    availableFromWeek: 9, availableUntilWeek: 40, phase: 'Both',
  },
];

// --- HELPER FUNCTIONS ---

function calculateInitialQuimica(school: School): number {
  const mestre = school.staff.find(s => s.role === 'MestreSala');
  const pb = school.staff.find(s => s.role === 'PortaBandeira');
  if (!mestre || !pb) return 0;
  // Same school for multiple years (partnerId match) = higher base
  if (mestre.partnerId === pb.id) return 55; // established couple
  return 25; // new pairing
}

export function initializePreparationState(school: School): PreparationState {
  const getRecommendedBurn = (track: ProductionTrack): number => {
    return RECOMMENDED_BURN[school.currentDivision]?.[track] ?? 100;
  };

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

  // --- STAFF ATTENTION INIT ---
  const keyRoles: StaffRole[] = [
    'Carnavalesco', 'DiretorDeCarnaval', 'MestreDeBateria',
    'DiretorDeHarmonia', 'MestreDeBarracao'
  ];

  const staffAttention = keyRoles
    .filter(role => school.staff.some(s => s.role === role))
    .map(role => {
      const member = school.staff.find(s => s.role === role)!;
      return {
        staffId: member.id,
        role,
        totalPoints: 3,
        usedPoints: 0,
        assignedActions: [],
        energyWarning: false,
        burnoutRisk: false,
      };
    });

  const prep: PreparationState = {
    tracks: {
      Alegorias: initTrack('Alegorias', getRecommendedBurn('Alegorias')),
      Fantasias: initTrack('Fantasias', getRecommendedBurn('Fantasias')),
      Bateria: initTrack('Bateria', getRecommendedBurn('Bateria')),
      Harmonia: initTrack('Harmonia', getRecommendedBurn('Harmonia')),
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
    bateriaOptimalMax,

    // REDESIGN FIELDS
    crises: [],
    activeCrises: [],
    staffAttention,
    unlockedActionCards: [],
    weeklyCompass: null,
    weekPreview: null,
    actionsUsedThisWeek: 0,
    weeklyActionBudgetSpent: 0,

    // Extended State
    alegoriaStages: [
      { id: 'Projeto',     label: 'Projeto Criativo',  isUnlocked: true,  isComplete: false, progress: 0, quality: 0, budgetSpentThisStage: 0, weekStarted: null, weekCompleted: null },
      { id: 'Construcao',  label: 'Construção',         isUnlocked: false, isComplete: false, progress: 0, quality: 0, budgetSpentThisStage: 0, weekStarted: null, weekCompleted: null },
      { id: 'Acabamento',  label: 'Acabamento',         isUnlocked: false, isComplete: false, progress: 0, quality: 0, budgetSpentThisStage: 0, weekStarted: null, weekCompleted: null },
      { id: 'Transporte',  label: 'Transporte',         isUnlocked: false, isComplete: false, progress: 0, quality: 0, budgetSpentThisStage: 0, weekStarted: null, weekCompleted: null },
    ],

    passistas: school.currentDivision === 'Grupo de Avaliação' ? null : {
      form: 10,
      energy: 100,
      peakWeek: null,
      rehearsalIntensity: 'Leve',
      starPassistas: [], // populated by seed data per school — see below (omitted for now)
    },

    mspb: (school.staff.some(s => s.role === 'MestreSala') && school.staff.some(s => s.role === 'PortaBandeira')) ? {
      quimica: calculateInitialQuimica(school),
      preparacao: 0,
      coreografiaApproach: null,
      rehearsalsCompleted: 0,
      ensaioGeralResult: null,
      mestreStress: 0,
      pbStress: 0,
      pbResistenciaFisica: school.staff.find(s => s.role === 'PortaBandeira')?.skills.resiliencia ?? 80,
    } : null,

    comissaoDeFrente: {
      approach: null,
      quality: 0,
      rehearsalWeeksSpent: 0,
      isApproachLocked: false,
    },

    harmoniaState: {
      sambaFixado: 0,
      marchaSincronizada: 0,
      densidadeVocal: 0,
      diretorFocus: 'Equilibrado',
      conflictWithMestre: false,
    },

    fantasia: {
      approach: null,
      designQuality: 0,
      participationRate: 1.0,
      deliveryRisk: 0,
      budgetSpent: 0,
    },

    stageEvents: [],
    pendingStageEvent: null,
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

// --- NEW REDESIGN FUNCTIONS ---

export function generateCrisesForWeek(
  prep: PreparationState,
  school: School,
  currentWeek: number,
  weeksAdvanced: number
): CrisisCard[] {
  const newCrises: CrisisCard[] = [];

  // Never exceed 4 active crises on the board at once
  const activeCrisisCount = prep.activeCrises.filter(c => !c.isResolved).length;
  if (activeCrisisCount >= 4) return [];

  const phase = prep.isBiWeekly ? 'BiWeekly' : 'RetaFinal';
  const baseChance = phase === 'RetaFinal' ? 0.65 : 0.40;
  if (Math.random() > baseChance * weeksAdvanced) return [];

  const firedTitles = prep.crises.map(c => c.title);
  const eligible = CRISIS_POOL.filter(template => {
    if (firedTitles.includes(template.title)) return false;
    if (template.minWeek && currentWeek < template.minWeek) return false;
    if (template.maxWeek && currentWeek > template.maxWeek) return false;
    if (template.requiresFlag && !prep.consequenceFlags.includes(template.requiresFlag)) return false;
    return true;
  });

  if (eligible.length === 0) return [];

  let selected = eligible[Math.floor(Math.random() * eligible.length)];

  // In Reta Final, bias toward Urgente
  if (phase === 'RetaFinal') {
    const urgentes = eligible.filter(e => e.tier === 'Urgente');
    if (urgentes.length > 0 && Math.random() < 0.5) {
      selected = urgentes[Math.floor(Math.random() * urgentes.length)];
    }
  }

  const crisis: CrisisCard = {
    ...selected,
    id: `crisis-${currentWeek}-${Math.random().toString(36).substr(2, 4)}`,
    weekCreated: currentWeek,
    expiresAtWeek: currentWeek + (selected.expiresInWeeks ?? 3),
    isResolved: false,
    resolvedAtWeek: null,
    chosenOptionIndex: null,
  };

  newCrises.push(crisis);
  return newCrises;
}

export function computeUnlockedActionCards(school: School): ActionCard[] {
  const prep = school.preparation;
  if (!prep) return [];

  const sources: ActionCardUnlockSource[] = [];

  if (prep.fantasia.approach === 'AltaCostura') sources.push('FantasiaAltaCostura');
  if (prep.fantasia.approach === 'Popular') sources.push('FantasiaPopular');
  if (prep.fantasia.approach === 'Intermediaria') sources.push('FantasiaIntermediaria');
  if (prep.mspb?.coreografiaApproach === 'Ousada') sources.push('MSPBOusada');
  if (prep.mspb?.coreografiaApproach === 'Classica') sources.push('MSPBClassica');
  if (prep.comissaoDeFrente.approach === 'Impacto') sources.push('ComissaoImpacto');
  if (prep.comissaoDeFrente.approach === 'Experimental') sources.push('ComissaoExperimental');
  if (prep.comissaoDeFrente.approach === 'Tematica') sources.push('ComissaoTematica');

  if (school.enredo) {
    if (school.enredo.difficulty >= 70) sources.push('EnredoHighDifficulty');
    if (school.enredo.controversy >= 60) sources.push('EnredoHighControversy');
    if (school.enredo.category === 'ComunitarioLocal') sources.push('EnredoComunitario');
    if (school.enredo.category === 'AfroBrasileiro') sources.push('EnredoAfroBrasileiro');
    if (school.enredo.category === 'Patrocinado') sources.push('EnredoPatrocinado');
  }

  return ACTION_CARD_DEFINITIONS
    .filter(card => sources.includes(card.unlockedBy))
    .map(card => {
      // Preserve usesRemaining from existing state if already tracked
      const existing = prep.unlockedActionCards?.find(c => c.id === card.id);
      return existing ? existing : { ...card };
    });
}

export function computeWeeklyCompass(school: School): WeeklyBudgetCompass {
  const prep = school.preparation!;
  const phase = prep.isBiWeekly ? 'BiWeekly' : 'RetaFinal';
  const recommended = WEEKLY_RECOMMENDED_SPEND[school.currentDivision]?.[phase] ?? 1000;
  const weeksAdvanced = prep.isBiWeekly ? 2 : 1;

  const activeBurnTotal = Object.values(prep.tracks).reduce(
    (sum, t) => sum + (t.progress >= 100 ? 0 : t.weeklyBurnRate), 0
  );
  const projectedSpend = activeBurnTotal * weeksAdvanced;
  const runwayWeeks = Math.floor(school.budget / Math.max(activeBurnTotal, 1));
  const dangerThreshold = activeBurnTotal * 8;

  return {
    totalBudgetRemaining: school.budget,
    recommendedSpendThisWeek: recommended * weeksAdvanced,
    projectedSpendThisWeek: projectedSpend,
    runwayWeeksAtCurrentRate: runwayWeeks,
    dangerThreshold,
    isOverRecommended: projectedSpend > recommended * weeksAdvanced,
    overspendAmount: Math.max(0, projectedSpend - recommended * weeksAdvanced),
  };
}

export function computeWeekPreview(
  prep: PreparationState,
  school: School,
  currentWeek: number
): WeekPreview {
  const items: WeekPreviewItem[] = [];
  const weeksAdvanced = prep.isBiWeekly ? 2 : 1;
  const compass = prep.weeklyCompass;

  if (compass) {
    items.push({
      type: 'spend',
      label: 'Gasto estimado',
      severity: compass.isOverRecommended ? 'warning' : 'info',
      quantifiedImpact: `R$ ${compass.projectedSpendThisWeek.toLocaleString('pt-BR')}`,
    });
  }

  prep.activeCrises.filter(c => !c.isResolved).forEach(crisis => {
    const weeksLeft = crisis.expiresAtWeek - currentWeek;
    if (weeksLeft <= weeksAdvanced) {
      items.push({
        type: crisis.tier === 'Oportunidade' ? 'opportunity-close' : 'crisis-expire',
        label: crisis.tier === 'Oportunidade'
          ? `Oportunidade fecha: "${crisis.title}"`
          : `Crise sem resolução: "${crisis.title}"`,
        severity: crisis.tier === 'Oportunidade' ? 'warning' : 'danger',
        quantifiedImpact: crisis.inactionConsequence,
      });
    } else if (weeksLeft <= weeksAdvanced + 2) {
      items.push({
        type: 'crisis-escalate',
        label: `Crise vai escalar: "${crisis.title}"`,
        severity: 'warning',
        quantifiedImpact: `${weeksLeft} semana(s) restantes`,
      });
    }
  });

  if (prep.bateria.energy < 30 && prep.bateria.outsideGigActive) {
    items.push({
      type: 'staff-effect',
      label: 'Bateria com energia baixa + gig externa ativa',
      severity: 'danger',
      quantifiedImpact: 'Forma pode cair se avançar agora',
    });
  }

  const totalUsed = prep.staffAttention.reduce((sum, sa) => sum + sa.usedPoints, 0);
  const totalAvailable = prep.staffAttention.reduce((sum, sa) => sum + sa.totalPoints, 0);
  const unusedActions = totalAvailable - totalUsed;

  if (unusedActions > 3) {
    items.push({
      type: 'warning',
      label: `${unusedActions} pontos de atenção não utilizados`,
      severity: 'warning',
      quantifiedImpact: 'Considere usar ações da equipe antes de avançar',
    });
  }

  const expiringSoon = prep.activeCrises.filter(
    c => !c.isResolved && c.expiresAtWeek - currentWeek <= weeksAdvanced
  ).length;

  return {
    items,
    projectedSpend: compass?.projectedSpendThisWeek ?? 0,
    unusedActionsRemaining: unusedActions,
    unusedCrisesCount: expiringSoon,
  };
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

  // --- 0. Reset Staff Attention (Player Only) ---
  if (school.isPlayerControlled && prep.staffAttention) {
    prep.staffAttention = prep.staffAttention.map(sa => {
      const stressEntry = prep.staffStress.find(s => s.staffId === sa.staffId);
      const energy = stressEntry?.energy ?? 100;
      const stress = stressEntry?.stressLevel ?? 0;

      let totalPoints = 3;
      if (energy < 20) totalPoints = 1;
      else if (energy < 40) totalPoints = 2;

      return {
        ...sa,
        totalPoints,
        usedPoints: 0,
        assignedActions: [],
        energyWarning: stress >= 60,
        burnoutRisk: stress >= 80,
      };
    });
    prep.actionsUsedThisWeek = 0;
    prep.weeklyActionBudgetSpent = 0;
  }

  // --- 1. Advance Tracks (Standard Progress) ---
  prep.tracks = advanceTracks(prep.tracks, school, weeksAdvanced, news);

  // --- 2. Advance Alegoria Stages (Overrides standard Alegoria track progress/quality) ---
  const alegResult = advanceAlegoriaStages(
    prep.alegoriaStages,
    school,
    currentWeek,
    weeksAdvanced,
    prep.tracks.Alegorias.weeklyBurnRate,
    news
  );
  prep.alegoriaStages = alegResult.stages;
  prep.tracks.Alegorias.quality = alegResult.qualityOutput;
  // Approximation of progress for UI based on stages
  const activeStageIdx = prep.alegoriaStages.findIndex(s => s.isUnlocked && !s.isComplete);
  if (activeStageIdx === -1) {
     prep.tracks.Alegorias.progress = 100;
  } else {
     // Weighted: P=15%, C=50%, A=30%, T=5%
     const weights = [15, 50, 30, 5];
     let progress = 0;
     for (let i = 0; i < activeStageIdx; i++) progress += weights[i];
     progress += (prep.alegoriaStages[activeStageIdx].progress / 100) * weights[activeStageIdx];
     prep.tracks.Alegorias.progress = progress;
  }

  // --- 3. Advance Fantasia State ---
  prep.fantasia = advanceFantasia(
    prep.fantasia,
    school,
    currentWeek,
    weeksAdvanced,
    prep.tracks.Fantasias.weeklyBurnRate,
    news
  );
  // Update Fantasia track quality/risk
  prep.tracks.Fantasias.quality = prep.fantasia.designQuality;
  prep.tracks.Fantasias.finishingRisk = prep.fantasia.deliveryRisk;

  // --- 4. Advance MSPB ---
  if (prep.mspb) {
    prep.mspb = advanceMSPB(prep.mspb, school, currentWeek, weeksAdvanced, news);
  }

  // --- 5. Advance Harmonia State ---
  prep.harmoniaState = advanceHarmoniaState(prep.harmoniaState, school, weeksAdvanced, news);
  prep.tracks.Harmonia.quality = computeHarmoniaQuality(prep.harmoniaState);

  // --- 6. Advance Passistas ---
  if (prep.passistas) {
    prep.passistas = advancePassistas(prep.passistas, school, currentWeek, weeksAdvanced, news);
  }

  // --- 7. Advance Comissao ---
  prep.comissaoDeFrente = advanceComissao(prep.comissaoDeFrente, school, weeksAdvanced);

  // --- 8. Advance Bateria (Standard) ---
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

  // --- 9. Update Staff Stress (New Cumulative) ---
  prep.staffStress = advanceStress(prep.staffStress, school, weeksUntilParade, weeksAdvanced, prep);

  // --- 10. Update total budget spent ---
  const trackSpend = Object.values(prep.tracks).reduce(
    (sum, t) => sum + (t.progress >= 100 ? 0 : t.weeklyBurnRate * weeksAdvanced),
    0
  );
  prep.totalBudgetSpent += trackSpend + budgetDelta;

  // --- 11. Deduct from school budget ---
  const totalCost = trackSpend;
  let newBudget = Math.max(0, school.budget - totalCost + bateriaResult.incomeGenerated);

  // Bankruptcy Detection
  if (newBudget <= 0 && !prep.isBankrupt && (36 - prep.weeksUntilParade) >= 8) {
      prep.isBankrupt = true;
      prep.bankruptAtWeek = currentWeek;
      news.push("⚠️ A ESCOLA FALIU! Os recursos acabaram.");
  }

  // --- CRISIS MANAGEMENT (Player Only) ---
  if (school.isPlayerControlled) {
    // 1. Check expiration / escalation
    prep.activeCrises = prep.activeCrises.map(crisis => {
      if (crisis.isResolved) return crisis;
      if (currentWeek + weeksAdvanced >= crisis.expiresAtWeek) {
        // Apply inaction effects
        crisis.inactionEffectCodes.forEach(code => {
          // Note: we can't easily call resolveEventEffect here because it returns partial state
          // and we are inside the tick loop. We need a way to apply effect to `prep` directly or defer it.
          // For now, let's assume resolveEventEffect is pure enough or we call it carefully.
          // Actually, we must use resolveEventEffect logic.
          // We'll create a news item and assume the effect is applied by the game loop if we were outside.
          // But we are inside.
          // Solution: Call resolveEventEffect and merge the result into `prep` and `school`.
          // We need to pass the current `prep` state to it?
          // `resolveEventEffect` takes a school. We can construct a temp school with current prep.
          // This is getting complex.
          // Simplified: We just log it for now, and maybe apply critical effects manually or allow resolveEventEffect to work on the object.
          // Since `resolveEventEffect` is stateless (pure), we can use it.
          const tempSchool = { ...school, preparation: prep, budget: newBudget };
          const updates = resolveEventEffect(code, tempSchool, crisis.title);
          // Merge updates back
          if (updates.preparation) {
             Object.assign(prep, updates.preparation);
          }
          if (updates.budget !== undefined) {
             // Apply budget change
             // Note: `updates.budget` is the absolute new budget returned by resolveEventEffect
             // which calculated it based on `tempSchool.budget` (which was `newBudget`).
             // So it is safe to assign.
             newBudget = updates.budget;
          }
        });
        crisis.isResolved = true;
        crisis.resolvedAtWeek = currentWeek;
        news.push(`⏰ Crise ignorada: "${crisis.title}" — consequências aplicadas.`);
      }
      return crisis;
    });

    // 2. Generate new crises
    const newCrises = generateCrisesForWeek(prep, school, currentWeek, weeksAdvanced);
    newCrises.forEach(c => {
      prep.activeCrises.push(c);
      prep.crises.push(c);
      news.push(`🔥 Nova Crise: ${c.title}`);
    });

    // 3. Unlock Action Cards
    prep.unlockedActionCards = computeUnlockedActionCards({ ...school, preparation: prep });

    // 4. Update Compass
    prep.weeklyCompass = computeWeeklyCompass({ ...school, budget: newBudget, preparation: prep });

    // 5. Update Week Preview
    prep.weekPreview = computeWeekPreview(prep, school, currentWeek);

  } else {
    // AI EVENT LOGIC (Keep existing)
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
  }

  // --- 12. Update projected completion for each track ---
  prep.tracks = updateProjections(prep.tracks, weeksUntilParade, school);

  // --- 13. Forced Stage Events ---
  // Fantasia Choice Week 9
  if (currentWeek === 9 && !prep.fantasia.approach && !prep.pendingStageEvent) {
    prep.pendingStageEvent = { ...FANTASIA_APPROACH_CHOICE_EVENT };
  }
  // Comissao Choice Week 15
  if (currentWeek >= 15 && !prep.comissaoDeFrente.isApproachLocked && !prep.pendingStageEvent) {
    prep.pendingStageEvent = { ...COMISSAO_APPROACH_EVENT };
  }
  // Fire MSPB coreografia choice at week 16 if they have a couple and haven't chosen yet
  if (
    currentWeek >= 16
    && prep.mspb !== null
    && prep.mspb.coreografiaApproach === null
    && !prep.pendingStageEvent
  ) {
    prep.pendingStageEvent = { ...MSPB_COREOGRAFIA_EVENT, week: currentWeek };
  }

  // Staff Stress Threshold Checks (Keep for AI & Player info)
  prep.staffStress.forEach(ss => {
    const staff = school.staff.find(s => s.id === ss.staffId);
    if (!staff) return;
    if (ss.stressLevel >= 100 && !prep.events.some(e => e.title.includes('Colapso'))) {
      news.push(`🚨 ${staff.name} entrou em colapso! Consequências imediatas.`);
      // Inject Major event for this staff member's role (not implemented fully here, just news)
    } else if (ss.stressLevel >= 85 && !prep.pendingEvent) {
      news.push(`😰 ${staff.name} está no limite. Descanse-o ou enfrente consequências.`);
    } else if (ss.stressLevel >= 60 && ss.stressLevel < 65) {
      news.push(`⚠️ ${staff.name} está sob pressão crescente.`);
    }
  });


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

    const recommended = RECOMMENDED_BURN[school.currentDivision]?.[trackName] ?? 100;
    // budgetMult = 1.0 when spending at recommended. Below = slower. Above = faster but diminishing.
    const budgetMult = Math.min(1.5, (track.weeklyBurnRate / recommended));

    const basePace = (1 / 36) * 100 * weeksAdvanced;

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

// --- NEW ADVANCE FUNCTIONS ---

function advanceAlegoriaStages(
  stages: AlegoriaStage[],
  school: School,
  currentWeek: number,
  weeksAdvanced: number,
  weeklyBurnRate: number,   // from prep.tracks.Alegorias.weeklyBurnRate
  news: string[]
): { stages: AlegoriaStage[]; qualityOutput: number } {
  const updated = stages.map(s => ({ ...s }));

  const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
  const mestre = school.staff.find(s => s.role === 'MestreDeBarracao');

  // Find current active stage (first unlocked, not complete)
  const activeIdx = updated.findIndex(s => s.isUnlocked && !s.isComplete);
  if (activeIdx === -1) {
    // All stages complete — compute final quality output
    const qualityOutput = computeFinalAlegoriaQuality(updated, school);
    return { stages: updated, qualityOutput };
  }

  const stage = updated[activeIdx];
  if (!stage.weekStarted) stage.weekStarted = currentWeek;
  stage.budgetSpentThisStage += weeklyBurnRate * weeksAdvanced;

  // Stage-specific pace and quality
  switch (stage.id) {
    case 'Projeto': {
      // Driven by Carnavalesco creativity and hours invested
      const creatividade = carnavalesco?.skills.criatividade ?? 60;
      const pacePerWeek = (creatividade / 200) * 8 + 2; // 2-10% per week
      stage.progress = Math.min(100, stage.progress + pacePerWeek * weeksAdvanced);
      // Design quality: function of skill + budget invested (for references, materials)
      const budgetFactor = Math.min(1.0, stage.budgetSpentThisStage / (weeklyBurnRate * 6));
      stage.quality = Math.min(100, (creatividade / 200) * 70 + budgetFactor * 20 + (school.prestige / 200) * 10);

      if (stage.progress >= 100 && !stage.isComplete) {
        stage.isComplete = true;
        stage.weekCompleted = currentWeek;
        // Unlock Construcao
        updated[1].isUnlocked = true;
        news.push(`🎨 Projeto Criativo das Alegorias concluído! Construção liberada.`);
      }
      break;
    }

    case 'Construcao': {
      // Driven by MestreDeBarracao logistics skill + heavy budget
      const logistica = mestre?.skills.logistica ?? 60;
      // Budget is the primary driver here — more money = faster builds
      const RECOMMENDED = (RECOMMENDED_BURN[school.currentDivision]?.Alegorias ?? 100) * 1.5;
      const budgetMult = Math.min(1.5, weeklyBurnRate / RECOMMENDED);
      const pacePerWeek = ((logistica / 200) * 5 + 2) * budgetMult;
      stage.progress = Math.min(100, stage.progress + pacePerWeek * weeksAdvanced);

      // Quality ceiling is gated by Projeto quality
      const projetoQuality = updated[0].quality;
      const skillBonus = (logistica / 200) * 20;
      // Elastic returns: spending more gives more quality but with diminishing returns
      const spendRatio = weeklyBurnRate / (RECOMMENDED_BURN[school.currentDivision]?.Alegorias ?? 100);
      const budgetQualityBonus = Math.min(25, 25 * (1 - Math.exp(-spendRatio)));
      stage.quality = Math.min(projetoQuality, Math.floor(skillBonus + budgetQualityBonus + (school.prestige / 200) * 15));

      // Car count bonus applies here
      stage.quality = Math.min(100, stage.quality + (school.preparation?.tracks.Alegorias.carCountBonus ?? 0));

      if (stage.progress >= 100 && !stage.isComplete) {
        stage.isComplete = true;
        stage.weekCompleted = currentWeek;
        updated[2].isUnlocked = true;
        news.push(`🏗️ Construção das Alegorias concluída! Acabamento liberado.`);
      }
      break;
    }

    case 'Acabamento': {
      // Quality-defining stage. Driven by Carnavalesco reputation + budget.
      // CANNOT be rushed — pace is slow by design.
      // Carnavalesco stress reduces efficiency (see stress system below).
      const carnavalescoStress = school.preparation?.staffStress.find(
        ss => ss.staffId === carnavalesco?.id
      )?.stressLevel ?? 0;
      const stressPenalty = carnavalescoStress > 70 ? 0.5 : carnavalescoStress > 50 ? 0.75 : 1.0;

      const pacePerWeek = 3.5 * stressPenalty * weeksAdvanced; // Slow: ~10 weeks to complete
      stage.progress = Math.min(100, stage.progress + pacePerWeek);

      // Quality: constrained by Construcao quality, boosted by budget and reputation
      const construcaoQuality = updated[1].quality;
      const reputation = carnavalesco?.reputation ?? 80;
      const spendRatio = stage.budgetSpentThisStage / (weeklyBurnRate * 8);
      const budgetQuality = Math.min(20, 20 * (1 - Math.exp(-spendRatio)));
      stage.quality = Math.min(construcaoQuality + 10, // Can slightly exceed construcao quality
        Math.floor((reputation / 200) * 30 + budgetQuality + construcaoQuality * 0.7));

      // Qualidade Ceiling Bonus from school archetype
      const ceilingBonus = school.preparation?.qualityCeilingBonus ?? 0;
      stage.quality = Math.min(100 + ceilingBonus, stage.quality);

      if (stage.progress >= 100 && !stage.isComplete) {
        stage.isComplete = true;
        stage.weekCompleted = currentWeek;
        updated[3].isUnlocked = true;
        news.push(`✨ Acabamento concluído! Alegorias prontas para transporte.`);
      }
      break;
    }

    case 'Transporte': {
      // Only activates week 43+
      if (currentWeek < 43) break;

      const logistica = mestre?.skills.logistica ?? 60;
      const mestreStress = school.preparation?.staffStress.find(
        ss => ss.staffId === mestre?.id
      )?.stressLevel ?? 0;

      // Roll the transport outcome (once, when stage activates)
      if (stage.progress === 0) {
        const criseChance = Math.max(0.03,
          0.10
          - (logistica / 200) * 0.07   // good logistica reduces risk
          + (mestreStress / 100) * 0.15 // high stress increases risk
          - (school.budget > 0 ? 0.02 : 0.08) // no budget margin = higher risk
        );
        const roll = Math.random();
        if (roll < criseChance) {
          stage.quality = updated[2].quality * 0.5; // Serious incident
          news.push(`🚚 CRISE DE TRANSPORTE! Uma alegoria teve um sério problema no traslado.`);
        } else if (roll < criseChance + 0.25) {
          stage.quality = updated[2].quality * 0.9; // Minor incident
          news.push(`⚠️ Incidente no transporte — uma alegoria chegou com pequeno dano.`);
        } else {
          stage.quality = Math.min(100, updated[2].quality + 3); // Perfect delivery bonus
          news.push(`✅ Alegorias chegaram em perfeito estado na Marquês de Sapucaí!`);
        }
        stage.progress = 100;
        stage.isComplete = true;
        stage.weekCompleted = currentWeek;
      }
      break;
    }
  }

  return {
    stages: updated,
    qualityOutput: computeFinalAlegoriaQuality(updated, school)
  };
}

function computeFinalAlegoriaQuality(stages: AlegoriaStage[], school: School): number {
  const transporte = stages.find(s => s.id === 'Transporte');
  if (transporte?.isComplete) return transporte.quality;
  const acabamento = stages.find(s => s.id === 'Acabamento');
  if (acabamento?.isComplete) return acabamento.quality;
  const construcao = stages.find(s => s.id === 'Construcao');
  if (construcao?.isComplete) return construcao.quality * 0.8; // Incomplete penalty
  return stages.find(s => s.id === 'Projeto')?.quality ?? 0;
}

function advanceFantasia(
  fantasia: FantasiaState,
  school: School,
  currentWeek: number,
  weeksAdvanced: number,
  weeklyBurnRate: number,
  news: string[]
): FantasiaState {
  const updated = { ...fantasia };
  const diretor = school.staff.find(s => s.role === 'DiretorDeCarnaval');

  if (!updated.approach) return updated; // Player must choose approach first

  // Approach defines quality ceiling and participation rate
  const approachConfig = {
    AltaCostura:    { qualityCeiling: 95, baseCost: 800, participationPenalty: 0.15 },
    Intermediaria:  { qualityCeiling: 83, baseCost: 480, participationPenalty: 0.05 },
    Popular:        { qualityCeiling: 72, baseCost: 250, participationPenalty: 0.0  },
  }[updated.approach];

  // Design quality (Criacao phase, weeks 9–22)
  if (currentWeek <= 22) {
    const criatividade = diretor?.skills.criatividade ?? 60;
    const gestao = diretor?.skills.gestaoDeRecursos ?? 60;
    const avgSkill = (criatividade + gestao) / 2;
    // Elastic quality: more budget spent = closer to ceiling, but diminishing returns
    const RECOMMENDED = RECOMMENDED_BURN[school.currentDivision]?.Fantasias ?? 100;
    const spendRatio = weeklyBurnRate / RECOMMENDED;
    const budgetQuality = approachConfig.qualityCeiling * (1 - Math.exp(-spendRatio * 1.2));
    const skillFactor = (avgSkill / 200) * approachConfig.qualityCeiling;
    updated.designQuality = Math.min(approachConfig.qualityCeiling,
      Math.floor(budgetQuality * 0.6 + skillFactor * 0.4));
  }

  // Delivery risk (Producao phase, weeks 23–40)
  if (currentWeek > 22) {
    const RECOMMENDED = RECOMMENDED_BURN[school.currentDivision]?.Fantasias ?? 100;
    const isUnderfunded = weeklyBurnRate < RECOMMENDED * 0.6;
    if (isUnderfunded) updated.deliveryRisk = Math.min(100, updated.deliveryRisk + 3 * weeksAdvanced);
    if (updated.deliveryRisk > 70 && !news.includes('⚠️ Fantasias em risco de atraso')) {
      news.push(`⚠️ Fantasias em risco de atraso na entrega. Membros podem não receber a tempo.`);
    }
    // Late delivery penalty applied in desfile quality calculation
    if (currentWeek >= 42 && updated.deliveryRisk > 70) {
      updated.designQuality = Math.max(0, updated.designQuality - 15);
      news.push(`❌ Fantasias chegaram tarde — qualidade comprometida.`);
    }
  }

  // Participation rate: affected by approach cost and budget
  updated.participationRate = Math.max(0.6,
    1.0 - approachConfig.participationPenalty
    - (updated.deliveryRisk / 100) * 0.2
  );

  return updated;
}

function advanceMSPB(
  mspb: MSPBState,
  school: School,
  currentWeek: number,
  weeksAdvanced: number,
  news: string[]
): MSPBState {
  const updated = { ...mspb };
  const mestre = school.staff.find(s => s.role === 'MestreSala');
  const pb = school.staff.find(s => s.role === 'PortaBandeira');
  if (!mestre || !pb) return updated;

  // Chemistry builds slowly with joint rehearsals, faster if same partnerId
  const isEstablishedCouple = mestre.partnerId === pb.id;
  const weeklyQuimiaGain = isEstablishedCouple ? 1.5 : 0.8;
  updated.quimica = Math.min(100, updated.quimica + weeklyQuimiaGain * weeksAdvanced);

  // Preparacao: joint function of individual skills × chemistry multiplier
  const mestreScore = (mestre.skills.lideranca + mestre.skills.expressaoCorporal) / 2;
  const pbScore = (pb.skills.expressaoCorporal + pb.skills.resiliencia) / 2;
  const quimiaMultiplier = 1.0 + (updated.quimica / 200); // up to 1.5x
  const coreografiaBonus = updated.coreografiaApproach === 'Ousada' ? 1.2 : 1.0;
  updated.preparacao = Math.min(100,
    ((mestreScore + pbScore) / 2 / 200 * 80 + 10) * quimiaMultiplier * coreografiaBonus
  );

  // Physical toll on Porta-Bandeira: resiliencia determines how much training she can absorb
  const physicalToll = Math.max(0, (100 - updated.pbResistenciaFisica) / 200 * 2 * weeksAdvanced);
  updated.pbStress = Math.min(100, updated.pbStress + physicalToll);

  // Ensaio Geral fires at week 42 (one time)
  if (currentWeek >= 42 && updated.ensaioGeralResult === null) {
    const roll = Math.random();
    const successChance = updated.preparacao / 100 * (1 - updated.mestreStress / 200);
    if (roll > 0.85 || updated.preparacao > 85) {
      updated.ensaioGeralResult = 'Encantou';
      news.push(`💃 O ensaio geral do casal ENCANTOU a quadra. A torcida está emocionada.`);
      // Give mestre confidence boost
      updated.mestreStress = Math.max(0, updated.mestreStress - 15);
    } else if (successChance > 0.5) {
      updated.ensaioGeralResult = 'Solido';
      news.push(`✅ Ensaio geral do casal foi sólido. Prontos para a avenida.`);
    } else {
      updated.ensaioGeralResult = 'Tropeçou';
      news.push(`😬 O Mestre-Sala tropeçou no ensaio geral. Ele está abalado.`);
      updated.mestreStress = Math.min(100, updated.mestreStress + 25);
    }
  }

  return updated;
}

function advanceHarmoniaState(
  harmoniaState: HarmoniaState,
  school: School,
  weeksAdvanced: number,
  news: string[]
): HarmoniaState {
  const updated = { ...harmoniaState };
  const diretor = school.staff.find(s => s.role === 'DiretorDeHarmonia');
  const lideranca = diretor?.skills.lideranca ?? 60;
  const logistica = diretor?.skills.logistica ?? 60;

  const focusGain = ((lideranca + logistica) / 400) * 8 * weeksAdvanced;

  switch (updated.diretorFocus) {
    case 'Samba':
      updated.sambaFixado = Math.min(100, updated.sambaFixado + focusGain * 1.5);
      updated.marchaSincronizada = Math.max(0, updated.marchaSincronizada - 1 * weeksAdvanced);
      updated.densidadeVocal = Math.min(100, updated.densidadeVocal + focusGain * 0.5);
      break;
    case 'Marcha':
      updated.marchaSincronizada = Math.min(100, updated.marchaSincronizada + focusGain * 1.5);
      updated.densidadeVocal = Math.max(0, updated.densidadeVocal - 1.5 * weeksAdvanced); // tiring
      updated.sambaFixado = Math.min(100, updated.sambaFixado + focusGain * 0.3);
      break;
    case 'Vocal':
      updated.densidadeVocal = Math.min(100, updated.densidadeVocal + focusGain * 1.5);
      updated.marchaSincronizada = Math.min(100, updated.marchaSincronizada + focusGain * 0.5);
      break;
    case 'Equilibrado':
      updated.sambaFixado = Math.min(100, updated.sambaFixado + focusGain);
      updated.marchaSincronizada = Math.min(100, updated.marchaSincronizada + focusGain);
      updated.densidadeVocal = Math.min(100, updated.densidadeVocal + focusGain);
      break;
  }

  return updated;
}

export function computeHarmoniaQuality(state: HarmoniaState): number {
  return Math.floor((state.sambaFixado + state.marchaSincronizada + state.densidadeVocal) / 3);
}

function advancePassistas(
  passistas: PassistasState,
  school: School,
  currentWeek: number,
  weeksAdvanced: number,
  news: string[]
): PassistasState {
  if (!passistas) return passistas;
  const updated = { ...passistas, starPassistas: passistas.starPassistas.map(p => ({ ...p })) };

  const coreografo = school.staff.find(s => s.role === 'Coreografo');
  const skillBase = coreografo?.skills.expressaoCorporal ?? 60;

  switch (updated.rehearsalIntensity) {
    case 'Leve':
      updated.form = Math.min(100, updated.form + (2 + skillBase / 200 * 3) * weeksAdvanced);
      updated.energy = Math.min(100, updated.energy - 2 * weeksAdvanced);
      break;
    case 'Completo':
      updated.form = Math.min(100, updated.form + (5 + skillBase / 200 * 5) * weeksAdvanced);
      updated.energy = Math.max(0, updated.energy - 8 * weeksAdvanced);
      break;
    case 'Aberto':
      updated.form = Math.min(100, updated.form + (3 + skillBase / 200 * 4) * weeksAdvanced);
      updated.energy = Math.max(0, updated.energy - 5 * weeksAdvanced);
      // handled by event system for morale bonus
      break;
    case 'Descanso':
      updated.form = Math.max(0, updated.form - 2 * weeksAdvanced);
      updated.energy = Math.min(100, updated.energy + 15 * weeksAdvanced);
      break;
  }

  // Peak detection
  if (updated.peakWeek === null && updated.form > 85 && updated.energy < 40) {
    updated.peakWeek = currentWeek;
    news.push(`💃 As passistas atingiram o pico de forma! Cuidado com o esgotamento.`);
  }

  // Star passistas: individual stress accumulates with Completo intensity
  updated.starPassistas = updated.starPassistas.map(sp => {
    if (updated.rehearsalIntensity === 'Completo') {
      const physicalToll = Math.max(0, (100 - sp.resistenciaFisica) / 100 * 3);
      return { ...sp, stressLevel: Math.min(100, sp.stressLevel + physicalToll * weeksAdvanced) };
    }
    return { ...sp, stressLevel: Math.max(0, sp.stressLevel - 2 * weeksAdvanced) };
  });

  return updated;
}

function advanceComissao(
  comissao: ComissaoDeFrenteState,
  school: School,
  weeksAdvanced: number
): ComissaoDeFrenteState {
  if (!comissao.isApproachLocked) return comissao;
  const updated = { ...comissao };
  if (comissao.approach === 'Tematica') {
    updated.rehearsalWeeksSpent += weeksAdvanced;
  }
  return updated;
}


// --- EXISTING HELPERS ---

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
  prep: PreparationState   // pass full prep so we can see stage states
): StaffStress[] {
  return staffStress.map(ss => {
    const staffMember = school.staff.find(s => s.id === ss.staffId);
    if (!staffMember) return ss;

    // --- STRESS DELTA CALCULATION (additive, not replacement) ---
    let stressDelta = 0;

    // 1. Time pressure (small, constant background)
    const weeksPassed = 36 - weeksUntilParade;
    const timePressure = (weeksPassed / 36) * 1.5; // 0–1.5 per week, grows linearly
    stressDelta += timePressure * weeksAdvanced;

    // 2. Track/stage risk (staff-specific)
    const TRACK_OWNER: Record<string, string> = {
      MestreDeBarracao:  'Construcao',   // watches alegoria stages
      DiretorDeCarnaval: 'Fantasias',
      MestreDeBateria:   'Bateria',
      DiretorDeHarmonia: 'Harmonia',
      Carnavalesco:      'Acabamento',   // stressed by alegoria finishing
    };

    const ownedElement = TRACK_OWNER[staffMember.role];
    if (ownedElement) {
      // Alegoria stage owners: check stage progress vs time
      if (['Projeto','Construcao','Acabamento','Transporte'].includes(ownedElement)) {
        const activeStage = prep.alegoriaStages?.find(s => s.id === ownedElement);
        if (activeStage && activeStage.isUnlocked && !activeStage.isComplete && weeksUntilParade < 10) {
          stressDelta += 3 * weeksAdvanced; // Deadline panic
        }
      } else {
        // Track owners: check finishingRisk
        const track = prep.tracks[ownedElement as ProductionTrack];
        if (track && track.finishingRisk > 50) {
          stressDelta += 2 * weeksAdvanced;
        }
      }
    }

    // 3. Budget crisis
    if (prep.isBankrupt) stressDelta += 5 * weeksAdvanced;

    // 4. Major event pending (everyone stressed)
    if (prep.pendingEvent?.severity === 'Major') stressDelta += 4;

    // 5. Natural recovery (resiliencia buffers baseline stress)
    const resilienciaRecovery = (staffMember.skills.resiliencia / 200) * 1.5 * weeksAdvanced;
    stressDelta -= resilienciaRecovery;

    // 6. Rest week: strong recovery, track stalls (handled in advanceTracks)
    if (ss.isResting) stressDelta -= 6 * weeksAdvanced;

    // 7. Archetype bonus (Familia reduces stress accrual)
    if (school.archetype === 'Familia') stressDelta *= 0.8;

    // 8. Neighborhood bonus (ZonaNortePeriferica: community support reduces stress)
    if (school.neighborhoodType === 'ZonaNortePeriferica') stressDelta *= 0.9;

    // --- APPLY DELTA (cumulative) ---
    const newStress = Math.max(0, Math.min(100, ss.stressLevel + stressDelta));

    // Energy
    const energyChange = ss.isResting ? 15 * weeksAdvanced : -4 * weeksAdvanced;
    const newEnergy = Math.max(0, Math.min(100, ss.energy + energyChange));

    return {
      ...ss,
      stressLevel: newStress,
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
