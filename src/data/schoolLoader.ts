import escolasData from './escolas_db.json';
import assetsData from './schoolAssets.json';
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
  id?: number; // Some entries might not have ID in the raw JSON? They should.
}

interface EscolasDB {
  metadata: unknown;
  escolas: Record<string, EscolaRaw>;
}

interface SchoolAssetData {
  colors: string[];
  logo: string | null;
}

const db = escolasData as unknown as EscolasDB;
const assets = assetsData as unknown as Record<string, SchoolAssetData>;

/**
 * Slugify helper to generate consistent keys for asset lookup.
 * Must match the logic used in scripts/migrate_assets.js
 */
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Normalize to NFD form (decompose accents)
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

/**
 * Loads all schools from the JSON database.
 * Calculates initial budget and morale based on prestige.
 */
export function loadAllSchools(): School[] {
  const schools: School[] = [];
  let generatedIdCounter = 1;

  for (const [name, data] of Object.entries(db.escolas)) {
    // Determine ID: Use data.id if available, otherwise generate one
    const id = data.id ? data.id.toString() : `generated-${generatedIdCounter++}`;

    // Calculate dynamic budget: Base 2M + (Prestige * 25k)
    const calculatedBudget = 2000000 + (data.prestige * 25000);

    // Calculate dynamic morale: Prestige / 2, capped at 100
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

    // Lookup Assets
    const slug = slugify(name);
    const assetData = assets[slug];

    const colors = (assetData && assetData.colors && assetData.colors.length > 0)
      ? assetData.colors
      : ['#CCCCCC', '#333333']; // Default fallback colors (Grey)

    // If no logo is found, use a placeholder or null string if UI handles it
    // Using a default placeholder path for now
    const logo = (assetData && assetData.logo)
      ? assetData.logo
      : '/logos/default_shield.png';

    const school: School = {
      id: id,
      name: name,
      colors: colors,
      logo: logo,
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
