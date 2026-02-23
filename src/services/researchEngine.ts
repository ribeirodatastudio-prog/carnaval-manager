import { Enredo, EnredoCategory, School, Division } from '../types/models';

/**
 * Stat ranges for each Enredo Category.
 */
const CATEGORY_STAT_RANGES: Record<EnredoCategory, {
  complexity: [number, number];
  difficulty: [number, number];
  controversy: [number, number];
  appeal: [number, number];
  sponsorValue: [number, number];
}> = {
  AfroBrasileiro: { complexity: [55, 85], difficulty: [45, 75], controversy: [35, 70], appeal: [60, 90], sponsorValue: [10, 30] },
  Religioso: { complexity: [60, 90], difficulty: [50, 80], controversy: [40, 90], appeal: [50, 80], sponsorValue: [5, 20] },
  Historico: { complexity: [40, 70], difficulty: [30, 60], controversy: [10, 35], appeal: [45, 70], sponsorValue: [20, 50] },
  Biografico: { complexity: [30, 60], difficulty: [25, 50], controversy: [20, 55], appeal: [55, 85], sponsorValue: [30, 60] },
  PoliticoSocial: { complexity: [50, 80], difficulty: [55, 85], controversy: [55, 95], appeal: [55, 80], sponsorValue: [0, 15] },
  Folclorico: { complexity: [35, 65], difficulty: [30, 55], controversy: [10, 30], appeal: [60, 85], sponsorValue: [20, 45] },
  Ambiental: { complexity: [45, 70], difficulty: [40, 65], controversy: [25, 55], appeal: [55, 80], sponsorValue: [25, 55] },
  Indigena: { complexity: [55, 80], difficulty: [45, 70], controversy: [30, 65], appeal: [55, 80], sponsorValue: [10, 30] },
  Patrocinado: { complexity: [20, 45], difficulty: [20, 45], controversy: [15, 40], appeal: [20, 50], sponsorValue: [60, 100] },
  Abstrato: { complexity: [70, 100], difficulty: [75, 100], controversy: [20, 60], appeal: [35, 65], sponsorValue: [5, 20] },
  ComunitarioLocal: { complexity: [15, 40], difficulty: [15, 35], controversy: [5, 20], appeal: [70, 95], sponsorValue: [5, 25] },
};

/**
 * Category Weights by Division.
 */
const DIVISION_CATEGORY_WEIGHTS: Record<Division, Partial<Record<EnredoCategory, number>>> = {
  'Grupo Especial': {
    AfroBrasileiro: 20, Religioso: 12, Historico: 10, Biografico: 12,
    PoliticoSocial: 12, Folclorico: 8, Ambiental: 8, Indigena: 8,
    Patrocinado: 5, Abstrato: 3, ComunitarioLocal: 2
  },
  'Série Ouro': {
    AfroBrasileiro: 15, Religioso: 10, Historico: 15, Biografico: 15,
    PoliticoSocial: 8, Folclorico: 12, Ambiental: 8, Indigena: 7,
    Patrocinado: 5, Abstrato: 1, ComunitarioLocal: 4
  },
  'Série Prata': {
    AfroBrasileiro: 10, Religioso: 10, Historico: 15, Biografico: 15,
    PoliticoSocial: 5, Folclorico: 18, Ambiental: 7, Indigena: 5,
    Patrocinado: 3, Abstrato: 0, ComunitarioLocal: 12
  },
  'Série Bronze': {
    Historico: 20, Biografico: 20, Folclorico: 20, ComunitarioLocal: 20,
    AfroBrasileiro: 8, Religioso: 8, Ambiental: 4
  },
  'Grupo de Avaliação': {
    ComunitarioLocal: 40, Folclorico: 25, Historico: 15, Biografico: 15, Religioso: 5
  }
};

/**
 * Title Templates.
 */
const ENREDO_TITLE_TEMPLATES: Record<EnredoCategory, string[]> = {
  AfroBrasileiro: [
    "O Rei que Não Morreu: A Saga de [Hero]",
    "Tambores de [Place]: A Resistência Negra que o Brasil Tentou Esquecer",
    "Da Senzala ao Terreiro: O Axé que Nos Une",
    "Filhos de [Orixá]: Uma Herança que Atravessa o Atlântico",
    "[Hero] Vive! A Chama do Quilombo que Nunca se Apagou"
  ],
  Religioso: [
    "O Itã de [Orixá]: Quando os Deuses Desceram à Terra",
    "Fé, Pólvora e Folhas: A Encruzilhada do Sagrado e o Profano",
    "Nossa Senhora de [Place]: A Mãe que o Brasil Sempre Teve",
    "Entre o Santo e o Orixá: O Sincretismo que Fez o Brasil"
  ],
  Historico: [
    "[Figure]: O Herói que a História Oficial Tentou Calar",
    "1888: O Ano em que o Brasil Fingiu Ser Livre",
    "A Epopeia de [Place]: Da Capitania ao Sonho de Nação",
    "Os Construtores do Brasil: Mãos Anônimas, Grandeza Eterna"
  ],
  Biografico: [
    "A Voz que o Brasil Não Merecia: Homenagem a [Artist]",
    "[Artist]: Toda Forma de Amor Merece Existir",
    "O Poeta do Povo: Um Canto para [Figure]",
    "[Artist] e Seus Brasis: Uma Viagem pela Alma de um Gênio"
  ],
  PoliticoSocial: [
    "Parabéns pra Você: Um País em Festa, um Povo em Luta",
    "A Fome que Não Aparece no Noticiário",
    "Não Foi Golpe, Foi Carnaval: A Democracia em Forma de Samba",
    "Quem Protege os Protetores? A Violência que o Estado Nega"
  ],
  Folclorico: [
    "O Bicho-Papão e Outras Verdades: O Folclore que nos Criou",
    "Na Beira do Rio: As Lendas que o [Region] Guarda",
    "Bumba meu Brasil: Do Boi-Bumbá ao Frevo, o País em Festa",
    "Conto de Fadas à Brasileira: O Imaginário que a Floresta Esconde"
  ],
  Ambiental: [
    "Pororoca: Quando o Rio Encontra o Mar e o Homem Esquece de Respeitar",
    "A Última Árvore: Um Réquiem Verde para o Cerrado",
    "Guardiões da Floresta: Os Povos que o Brasil Insiste em Ignorar",
    "Água: O Novo Ouro que Estamos Perdendo"
  ],
  Indigena: [
    "[Tribe]: Os Primeiros Donos deste Chão que Chamamos de Brasil",
    "Antes de Cabral: O Brasil que Existia Antes de Existir",
    "A Aldeia Global: Da Tradição Indígena à Resistência Contemporânea",
    "Yanomami: O Grito que o Mundo Precisava Ouvir"
  ],
  Patrocinado: [
    "Sabores do [Region]: Uma Viagem pelos Tesouros Gastronômicos do Brasil",
    "[Brand/Industry]: A Força que Move o Nosso País",
    "Turismo é Amor: [Destination] de Braços Abertos para o Mundo",
    "[Region]: Terra de Oportunidades e Gente Forte"
  ],
  Abstrato: [
    "O Tempo Não Existe: Uma Meditação sobre o Efêmero e o Eterno",
    "Caos e Beleza: Quando a Desordem se Torna Arte",
    "O Avesso do Avesso: O Brasil que se Vê no Espelho e Não se Reconhece",
    "Metamorfose: A Transformação como Única Constante"
  ],
  ComunitarioLocal: [
    "Nossa Laje, Nossa Raiz: Um Canto para o [Neighborhood]",
    "De Geração em Geração: A História que Nossas Mãos Guardam",
    "O Morro Tem Memória: [Neighborhood] como Epicentro do Mundo",
    "Aqui Nasceu um Povo: A Identidade que o Concreto Não Apagou"
  ]
};

const PLACEHOLDERS = {
  Hero: ['Zumbi', 'Tiradentes', 'Dandara', 'Anita Garibaldi', 'Sepé Tiaraju', 'Chico Mendes', 'Lampião'],
  Artist: ['Cartola', 'Beth Carvalho', 'Clara Nunes', 'Adoniran', 'Villa-Lobos', 'Pixinguinha', 'Ary Barroso', 'Elza Soares'],
  Region: ['Bahia', 'Amazônia', 'Nordeste', 'Sertão', 'Pantanal', 'Minas Gerais', 'Recife', 'Pernambuco'],
  Orixá: ['Xangô', 'Oxum', 'Iemanjá', 'Ogum', 'Exu', 'Oxóssi', 'Obaluaê', 'Iansã'],
  Place: ['Quilombo', 'Favela', 'Terreiro', 'Senzala', 'Mangue', 'Cais do Valongo'],
  Figure: ['Getúlio', 'Dom Pedro', 'Santos Dumont', 'Ruy Barbosa', 'Barão de Mauá'],
  Tribe: ['Yanomami', 'Guarani', 'Tupinambá', 'Pataxó', 'Xavante', 'Kayapó'],
  'Brand/Industry': ['Petrobras', 'Vale', 'Agro', 'Indústria', 'Comércio', 'Tecnologia'],
  Destination: ['Salvador', 'Rio de Janeiro', 'Manaus', 'Foz do Iguaçu', 'Bonito'],
  Neighborhood: ['Madureira', 'Bangu', 'Tijuca', 'Vila Isabel', 'Ramos', 'Penha', 'Lapa']
};

/**
 * Helpers
 */
function randomInRange([min, max]: [number, number]): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getCategoryWeightsForDivision(division: Division): Partial<Record<EnredoCategory, number>> {
  return DIVISION_CATEGORY_WEIGHTS[division];
}

export function weightedRandomCategory(weights: Partial<Record<EnredoCategory, number>>): EnredoCategory {
  let totalWeight = 0;
  const entries = Object.entries(weights) as [EnredoCategory, number][];

  for (const [, weight] of entries) {
    totalWeight += weight;
  }

  let random = Math.random() * totalWeight;

  for (const [category, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return category;
    }
  }

  return 'Historico'; // Fallback
}

/**
 * Calculates Trend Map based on AI choices.
 */
export function calculateTrendMap(aiEnredoCategories: EnredoCategory[]): Map<EnredoCategory, 'Rising' | 'Stable' | 'Saturated'> {
  const counts = new Map<EnredoCategory, number>();

  for (const cat of aiEnredoCategories) {
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }

  const trendMap = new Map<EnredoCategory, 'Rising' | 'Stable' | 'Saturated'>();
  const totalAI = aiEnredoCategories.length;

  // Logic:
  // If > 20% of schools do a category -> Saturated
  // If < 5% or 0 -> Rising (opportunity)
  // Else Stable
  // Note: For small number of schools (e.g. 11 AI), 4+ is Saturated.

  const categories: EnredoCategory[] = Object.keys(CATEGORY_STAT_RANGES) as EnredoCategory[];

  for (const cat of categories) {
    const count = counts.get(cat) || 0;
    if (count >= 4) {
      trendMap.set(cat, 'Saturated');
    } else if (count === 0 || count === 1) { // 1 is still low enough to be rising/fresh? Maybe 0 is better.
      // Let's stick to user prompt: "Rising: Fresh territory... Saturated: Too many schools"
      if (count === 0) trendMap.set(cat, 'Rising');
      else trendMap.set(cat, 'Stable');
    } else {
      trendMap.set(cat, 'Stable');
    }
  }

  return trendMap;
}

/**
 * Generates a Title.
 */
export function generateEnredoTitle(category: EnredoCategory): string {
  const templates = ENREDO_TITLE_TEMPLATES[category];
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Replace placeholders
  return template.replace(/\[(.*?)\]/g, (match, p1) => {
    const key = p1 as keyof typeof PLACEHOLDERS;
    const list = PLACEHOLDERS[key];
    if (list) {
      return list[Math.floor(Math.random() * list.length)];
    }
    return p1; // Fallback if not found
  });
}

/**
 * Generates a single Enredo Candidate.
 */
export function generateSingleEnredo(
  category: EnredoCategory,
  school: School,
  trendMap: Map<EnredoCategory, 'Rising' | 'Stable' | 'Saturated'>,
  year: number
): Enredo {
  const ranges = CATEGORY_STAT_RANGES[category];

  const complexity = randomInRange(ranges.complexity);
  const difficulty = randomInRange(ranges.difficulty);
  const controversy = randomInRange(ranges.controversy);
  const appeal = randomInRange(ranges.appeal);
  const sponsorValue = randomInRange(ranges.sponsorValue);

  // Potential score
  const basePotential = 40 + Math.floor(Math.random() * 30);
  const prestigeBonus = Math.floor((school.prestige / 200) * 25);
  const complexityBonus = Math.floor((complexity / 100) * 10);
  const potentialScore = Math.min(100, basePotential + prestigeBonus + complexityBonus);

  // Hidden stats
  // High controversy increases hiddenRisk floor
  const hiddenRisk = controversy > 60
    ? Math.floor(Math.random() * 40) + 10 // 10-50
    : Math.floor(Math.random() * 20);      // 0-20

  // High potential increases hiddenBonus probability
  const hiddenBonus = potentialScore > 75
    ? Math.floor(Math.random() * 35) + 10 // 10-45
    : Math.floor(Math.random() * 15);      // 0-15

  const trend = trendMap.get(category) ?? 'Stable';

  return {
    id: `enredo-${year}-${Math.random().toString(36).substr(2, 9)}`,
    title: generateEnredoTitle(category),
    category,
    complexity,
    difficulty,
    potentialScore,
    controversy,
    appeal,
    sponsorValue,
    trend,
    hiddenRisk,
    hiddenBonus,
    statsRevealed: 0, // Start hidden
    researchProgress: 0
  };
}

/**
 * Calculates how much research progress accumulates per week tick.
 * Returns a number between ~0.1 and ~2.0 (fractions of one stat reveal per week).
 *
 * Base rate = 1 reveal per N weeks, where N varies by division.
 * Staff modifier: Carnavalesco's criatividade skill speeds or slows research.
 */
export function calculateWeeklyResearchIncrement(school: School): number {
  // Base weeks-per-reveal by division
  const baseWeeksPerReveal: Record<Division, number> = {
    'Grupo Especial':    0.55,
    'Série Ouro':        0.80,
    'Série Prata':       1.10,
    'Série Bronze':      1.60,
    'Grupo de Avaliação': 2.20,
  };

  let weeksPerReveal = baseWeeksPerReveal[school.currentDivision] ?? 4.0;

  // Find Carnavalesco on staff
  const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');

  if (!carnavalesco) {
    // No specialist: 50% slower
    weeksPerReveal *= 1.5;
  } else {
    // Speed multiplier from criatividade: 0.5 (skill=0) to 1.5 (skill=200)
    // At skill=100 → multiplier=1.0 (no change)
    const speedMultiplier = 0.5 + (carnavalesco.skills.criatividade / 200);
    // Higher multiplier = faster research = fewer weeks needed
    weeksPerReveal = weeksPerReveal / speedMultiplier;
  }

  // Return the fraction of a reveal earned per week
  return 1 / weeksPerReveal;
}

/**
 * Generates a Pool of Enredos for a School.
 */
export function generateEnredoPool(school: School, currentYear: number, aiEnredoCategories: EnredoCategory[]): Enredo[] {
  const categoryWeights = getCategoryWeightsForDivision(school.currentDivision);
  const trendMap = calculateTrendMap(aiEnredoCategories);

  const pool: Enredo[] = [];
  const poolSize = school.currentDivision === 'Grupo Especial' ? 12 :
                   school.currentDivision === 'Série Ouro' ? 10 : 8;

  const usedTitles = new Set<string>();

  // Feature 2: Estácio Bonus (Berço do Samba)
  if (school.uniqueBonus === 'estacio_bercoBerco') {
    const trendMap = calculateTrendMap(aiEnredoCategories);
    const estacioCandidate = generateSingleEnredo('AfroBrasileiro', school, trendMap, currentYear);
    estacioCandidate.potentialScore = Math.max(estacioCandidate.potentialScore, 75);
    // Ensure it's not a duplicate title (unlikely for first item but good practice)
    usedTitles.add(estacioCandidate.title);
    pool.push(estacioCandidate);
  }

  const loopCount = school.uniqueBonus === 'estacio_bercoBerco' ? poolSize - 1 : poolSize;

  for (let i = 0; i < loopCount; i++) {
    const category = weightedRandomCategory(categoryWeights);
    let enredo = generateSingleEnredo(category, school, trendMap, currentYear);

    // Retry to avoid duplicate titles (max 5 attempts)
    let attempts = 0;
    while (usedTitles.has(enredo.title) && attempts < 5) {
        enredo = generateSingleEnredo(category, school, trendMap, currentYear);
        attempts++;
    }
    usedTitles.add(enredo.title);
    pool.push(enredo);
  }

  return pool;
}

/**
 * Logic to reveal the next stat.
 * Order: Complexity -> Difficulty -> Potential -> Hidden Risk -> Hidden Bonus
 */
export function revealNextStat(enredo: Enredo): Enredo {
  // Return a new object to ensure immutability in store
  const newEnredo = { ...enredo };
  if (newEnredo.statsRevealed < 5) {
    newEnredo.statsRevealed += 1;
  }
  return newEnredo;
}
