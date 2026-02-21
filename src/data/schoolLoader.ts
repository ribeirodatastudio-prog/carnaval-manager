import escolasData from './escolas_db.json';
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
  cores?: {
    primaria: string;
    secundaria: string;
  };
  logo?: string;
  id?: number; // Some entries might not have ID in the raw JSON? They should.
}

interface EscolasDB {
  metadata: any;
  escolas: Record<string, EscolaRaw>;
}

const db = escolasData as unknown as EscolasDB;

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
    // Adjust for lower divisions to be realistic?
    // For now, use the same formula but maybe scale down base for lower divisions?
    // The prompt only specified: "Initial School Budget is calculated as 2,000,000 + (Prestige * 25,000)."
    // I will stick to that formula as it scales with prestige anyway.
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

    // Parse colors
    const colors = data.cores ? [data.cores.primaria, data.cores.secundaria] : [];

    const school: School = {
      id: id,
      name: name,
      colors: colors,
      logo: data.logo,
      budget: calculatedBudget,
      fanbaseMorale: calculatedMorale,
      staff: [],
      isPlayerControlled: false,
      prestige: data.prestige,
      currentDivision: data.divisao_atual as Division,
      score_bruto: data.score_bruto,
      anos_no_especial: data.anos_no_especial || 0,
      anos_em_acesso: 0, // Default to 0 as it's not in the JSON
      history: history,
      enredo: null,
    };

    schools.push(school);
  }

  // Sort by prestige descending
  return schools.sort((a, b) => b.prestige - a.prestige);
}
