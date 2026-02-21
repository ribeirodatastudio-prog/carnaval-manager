import escolasData from './escolas_db.json';
import escolasCores from './logos/escolas_cores_v2.json';
import { FLAG_IMAGES } from './flagImages';
import { School, SchoolHistory, SchoolHistoryEntry, Division } from '../types/models';

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
  id?: number;
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

    // Calculate dynamic budget
    const calculatedBudget = 2000000 + (data.prestige * 25000);

    // Calculate dynamic morale
    const calculatedMorale = Math.min(100, Math.round(data.prestige / 2));

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
      flag: flagUrl,
      budget: calculatedBudget,
      fanbaseMorale: calculatedMorale,
      staff: [],
      isPlayerControlled: false,
      prestige: data.prestige,
      currentDivision: data.divisao_atual as Division,
      score_bruto: data.score_bruto,
      anos_no_especial: data.anos_no_especial || 0,
      anos_em_acesso: 0,
      history: history,
      enredo: null,
    };

    schools.push(school);
  }

  // Sort by prestige descending
  return schools.sort((a, b) => b.prestige - a.prestige);
}
