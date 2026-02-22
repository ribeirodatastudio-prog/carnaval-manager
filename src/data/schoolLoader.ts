import escolasData from './escolas_db.json';
import escolasCores from './logos/escolas_cores_v2.json';
import { FLAG_IMAGES } from './flagImages';
import { REAL_STAFF_DATA } from './realStaff';
import { generateSchoolRoster } from './genericStaffSeed';
import { School, SchoolHistory, SchoolHistoryEntry, Division, SchoolArchetype, NeighborhoodType, FanbaisPersonality } from '../types/models';
import { getProLevelForDivision } from '../utils/helpers';

interface EscolaRaw {
  divisao_atual: string;
  score_bruto: number;
  prestige: number;
  titulos: number;
  vices: number;
  terceiros: number;
  anos_no_especial: number;
  historico: {
    titulos: SchoolHistoryEntry[];
    vices: SchoolHistoryEntry[];
    terceiros: SchoolHistoryEntry[];
    quartos?: SchoolHistoryEntry[];
    quintos?: SchoolHistoryEntry[];
  };
  cores?: {
    primaria: string;
    secundaria: string;
  };
  logo?: string;
  id?: number; // Some entries might not have ID in the raw JSON? They should.
}

interface EscolasDB {
  metadata: Record<string, unknown>;
  escolas: Record<string, EscolaRaw>;
}

interface ColorEntry {
  escola: string;
  cor_principal: string;
  cor_secundaria: string;
}

const db = escolasData as unknown as EscolasDB;

// Helper to normalize strings for matching (remove accents, lowercase, remove special chars)
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Pre-process colors into a map for fast lookup
const colorMap = new Map<string, string[]>();
(escolasCores as ColorEntry[]).forEach((entry) => {
  // Try to match by name
  const normName = normalize(entry.escola);
  // Also handle "Bandeira do GRES..." or similar if present in JSON names (it seems they are clean names but title cased)
  // Check the JSON content again if needed, but the python script output showed names like "Acadêmicos Da Abolição"
  colorMap.set(normName, [entry.cor_principal, entry.cor_secundaria]);
});

function calculateDivisionBudget(division: Division, prestige: number): number {
  // Budget is division-anchored with prestige as a modifier within the division's range
  const DIVISION_BUDGETS: Record<Division, { base: number; perPrestige: number }> = {
    'Grupo Especial':    { base: 2_500_000, perPrestige: 28_000 },
    'Série Ouro':        { base: 200_000,   perPrestige: 5_000  },
    'Série Prata':       { base: 40_000,    perPrestige: 1_500  },
    'Série Bronze':      { base: 8_000,     perPrestige: 600    },
    'Grupo de Avaliação':{ base: 2_000,     perPrestige: 150    },
  };

  const { base, perPrestige } = DIVISION_BUDGETS[division];
  let budget = Math.floor(base + prestige * perPrestige);

  // Apply multipliers for lower divisions (Feature 2d)
  if (division === 'Série Ouro') {
    budget = Math.max(1_500_000, budget * 3);
  } else if (division === 'Série Prata') {
    budget = Math.max(400_000, budget * 3);
  }

  return budget;
}

const SCHOOL_DNA_MAP: Record<string, {
  archetype: SchoolArchetype;
  neighborhoodType: NeighborhoodType;
  fanbaisPersonality: FanbaisPersonality;
  uniqueBonus: string | null;
}> = {
  'Estação Primeira de Mangueira':        { archetype: 'Potencia',  neighborhoodType: 'SuburbioHistorico',   fanbaisPersonality: 'Apaixonada', uniqueBonus: 'mangueira_magnetismo' },
  'Beija-Flor de Nilópolis':              { archetype: 'Potencia',  neighborhoodType: 'BaixadaFluminense',   fanbaisPersonality: 'Exigente',   uniqueBonus: 'beija_flor_maquina' },
  'Portela':                              { archetype: 'Potencia',  neighborhoodType: 'SuburbioHistorico',   fanbaisPersonality: 'Exigente',   uniqueBonus: 'portela_patrimonio' },
  'Acadêmicos do Salgueiro':              { archetype: 'Familia',   neighborhoodType: 'SuburbioHistorico',   fanbaisPersonality: 'Apaixonada', uniqueBonus: null },
  'Imperatriz Leopoldinense':             { archetype: 'Potencia',  neighborhoodType: 'ZonaNortePeriferica', fanbaisPersonality: 'Exigente',   uniqueBonus: null },
  'Império Serrano':                      { archetype: 'Familia',   neighborhoodType: 'SuburbioHistorico',   fanbaisPersonality: 'Fiel',       uniqueBonus: 'imperio_comunidade' },
  'Mocidade Independente de Padre Miguel':{ archetype: 'Familia',   neighborhoodType: 'BaixadaFluminense',   fanbaisPersonality: 'Apaixonada', uniqueBonus: 'mocidade_bateria' },
  'Unidos do Viradouro':                  { archetype: 'Guerreira', neighborhoodType: 'Interior',            fanbaisPersonality: 'Apaixonada', uniqueBonus: null },
  'Unidos da Tijuca':                     { archetype: 'Comercial', neighborhoodType: 'ZonaSulCentro',       fanbaisPersonality: 'Fiel',       uniqueBonus: null },
  'Acadêmicos do Grande Rio':             { archetype: 'Guerreira', neighborhoodType: 'BaixadaFluminense',   fanbaisPersonality: 'Apaixonada', uniqueBonus: null },
  'Unidos de Vila Isabel':                { archetype: 'Familia',   neighborhoodType: 'ZonaSulCentro',       fanbaisPersonality: 'Fiel',       uniqueBonus: null },
  'Paraíso do Tuiuti':                    { archetype: 'Guerreira', neighborhoodType: 'ZonaNortePeriferica', fanbaisPersonality: 'Apaixonada', uniqueBonus: null },
  'Acadêmicos de Niterói':               { archetype: 'Revelacao', neighborhoodType: 'Interior',            fanbaisPersonality: 'Fiel',       uniqueBonus: null },
  'Estácio de Sá':                        { archetype: 'Familia',   neighborhoodType: 'SuburbioHistorico',   fanbaisPersonality: 'Apaixonada', uniqueBonus: 'estacio_bercoBerco' },
  'União da Ilha do Governador':          { archetype: 'Familia',   neighborhoodType: 'ZonaNortePeriferica', fanbaisPersonality: 'Fiel',       uniqueBonus: null },
  'Inocentes de Belford Roxo':            { archetype: 'Revelacao', neighborhoodType: 'BaixadaFluminense',   fanbaisPersonality: 'Apaixonada', uniqueBonus: null },
};

function getFallbackDNA(division: Division): { archetype: SchoolArchetype, neighborhoodType: NeighborhoodType, fanbaisPersonality: FanbaisPersonality, uniqueBonus: string | null } {
  if (division === 'Grupo Especial') return { archetype: 'Potencia', neighborhoodType: 'ZonaNortePeriferica', fanbaisPersonality: 'Exigente', uniqueBonus: null };
  if (division === 'Série Ouro') return { archetype: 'Familia', neighborhoodType: 'ZonaNortePeriferica', fanbaisPersonality: 'Fiel', uniqueBonus: null };
  if (division === 'Série Prata') return { archetype: 'Guerreira', neighborhoodType: 'BaixadaFluminense', fanbaisPersonality: 'Apaixonada', uniqueBonus: null };
  return { archetype: 'Revelacao', neighborhoodType: 'BaixadaFluminense', fanbaisPersonality: 'Fiel', uniqueBonus: null };
}

function assignSchoolDNA(name: string, division: Division) {
    return SCHOOL_DNA_MAP[name] || getFallbackDNA(division);
}

/**
 * Loads all schools from the JSON database.
 * Calculates initial budget and morale based on prestige.
 */
export function loadAllSchools(): School[] {
  const schools: School[] = [];
  let generatedIdCounter = 1;

  for (const [name, data] of Object.entries(db.escolas)) {
    // Determine ID
    const id = data.id ? data.id.toString() : `generated-${generatedIdCounter++}`;
    const division = data.divisao_atual as Division;

    // Calculate dynamic budget
    const calculatedBudget = calculateDivisionBudget(division, data.prestige);

    // Calculate dynamic morale
    let calculatedMorale = Math.min(100, Math.round(data.prestige / 2));

    // Get DNA first to check for bonuses
    const dna = assignSchoolDNA(name, division);

    // Feature 2: Portela Morale Bonus
    if (dna.uniqueBonus === 'portela_patrimonio') {
        calculatedMorale = Math.min(100, calculatedMorale + 10);
    }

    // Construct History Object
    const history: SchoolHistory = {
      totalTitles: data.titulos,
      totalRunnerUps: data.vices,
      titulos: data.historico.titulos || [],
      vices: data.historico.vices || [],
      terceiros: data.historico.terceiros || [],
      quartos: data.historico.quartos || [],
      quintos: data.historico.quintos || [],
    };

    // Resolve Colors
    const normName = normalize(name);
    let colors = colorMap.get(normName);

    // Fallback if not found directly
    if (!colors) {
      // Try fuzzy match? Or just default.
      // Let's try to find if one contains the other
      for (const [key, val] of colorMap.entries()) {
        if (key.includes(normName) || normName.includes(key)) {
            colors = val;
            break;
        }
      }
    }

    if (!colors) {
        colors = ['#CCCCCC', '#333333']; // Default Grey/Dark Grey
    }

    // Resolve Flag
    // FLAG_IMAGES keys are exact matches from escolas_db keys
    const flagUrl = FLAG_IMAGES[name];

    const school: School = {
      id: id,
      name: name,
      colors: colors,
      logo: data.logo,
      flag: flagUrl,
      budget: calculatedBudget,
      fanbaseMorale: calculatedMorale,
      staff: [],
      isPlayerControlled: false,
      prestige: data.prestige,
      currentDivision: division,
      proLevel: getProLevelForDivision(division),
      score_bruto: data.score_bruto,
      anos_no_especial: data.anos_no_especial || 0,
      anos_em_acesso: 0,
      history: history,
      enredo: null,
      preparation: null,
      // New DNA fields
      archetype: dna.archetype,
      neighborhoodType: dna.neighborhoodType,
      fanbaisPersonality: dna.fanbaisPersonality,
      uniqueBonus: dna.uniqueBonus
    };

    // Identify roles covered by REAL staff
    // Note: REAL_STAFF_DATA uses the exact name from the JSON
    const coveredRoles = new Set(
      REAL_STAFF_DATA
        .filter(s => s.currentSchoolName === name)
        .map(s => s.role)
    );

    // Generate full roster for the division
    const genericRoster = generateSchoolRoster(name, school.currentDivision);

    // Filter out generic staff whose role is already covered by a real staff member
    const filteredRoster = genericRoster.filter(s => !coveredRoles.has(s.role));

    // Assign school ID to the generic staff
    filteredRoster.forEach(s => {
      s.currentSchoolId = school.id;
    });

    school.staff = filteredRoster;

    schools.push(school);
  }

  // Sort by prestige descending
  return schools.sort((a, b) => b.prestige - a.prestige);
}
