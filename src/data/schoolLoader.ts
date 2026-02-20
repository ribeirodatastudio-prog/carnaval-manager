import escolasData from './escolas_db.json';
import { School } from '../types/models';

interface EscolaRaw {
  divisao_atual: string;
  score_bruto: number;
  prestige: number;
  titulos: number;
  vices: number;
  terceiros: number;
  anos_no_especial: number;
  historico: {
    titulos: number[];
    vices: number[];
    terceiros: number[];
  };
  id: number;
}

interface EscolasDB {
  metadata: any;
  escolas: Record<string, EscolaRaw>;
}

const db = escolasData as unknown as EscolasDB;

/**
 * Loads schools from the JSON database, filtering for the Special Group.
 * Calculates initial budget and morale based on prestige.
 */
export function loadSpecialGroupSchools(): School[] {
  const schools: School[] = [];

  for (const [name, data] of Object.entries(db.escolas)) {
    if (data.divisao_atual === 'Grupo Especial') {
      // Calculate dynamic budget: Base 2M + (Prestige * 25k)
      const calculatedBudget = 2000000 + (data.prestige * 25000);

      // Calculate dynamic morale: Prestige / 2, capped at 100
      const calculatedMorale = Math.min(100, Math.round(data.prestige / 2));

      const school: School = {
        id: data.id.toString(), // Convert number ID to string
        name: name,
        colors: [], // Placeholder
        budget: calculatedBudget,
        fanbaseMorale: calculatedMorale,
        staff: [],
        isPlayerControlled: false,
        prestige: data.prestige,
        currentDivision: data.divisao_atual,
        history: {
          titles: data.titulos,
          runnerUps: data.vices,
        },
        enredo: null,
      };

      schools.push(school);
    }
  }

  // Sort by prestige descending for consistent initial order (optional but nice)
  return schools.sort((a, b) => b.prestige - a.prestige);
}
