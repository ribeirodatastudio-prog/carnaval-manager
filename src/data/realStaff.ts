
import { StaffMember, StaffRole, StaffSkills, StaffAchievement, RainhaArchetype } from '../types/models';

interface RealStaffRaw extends Omit<StaffMember, 'currentSchoolId' | 'skills' | 'salary' | 'contractYears' | 'salaryExpectation' | 'reputation'> {
  currentSchoolName: string | null;
  baseSkill: number; // To generate random skills around this level
  achievementsRaw?: StaffAchievement[];
}

const createSkills = (base: number): StaffSkills => {
  const variance = () => Math.floor(Math.random() * 11) - 5; // -5 to +5
  const clamp = (val: number) => Math.max(1, Math.min(200, val));

  return {
    plastica: clamp(base + variance()),
    ritmica: clamp(base + variance()),
    expressaoCorporal: clamp(base + variance()),
    lideranca: clamp(base + variance()),
    criatividade: clamp(base + variance()),
    resiliencia: clamp(base + variance()),
    logistica: clamp(base + variance()),
    gestaoDeRecursos: clamp(base + variance()),
    fama: clamp(base + variance()), // Will be overridden for Rainhas if needed
  };
};

const calculateRealStaffAge = (role: StaffRole, baseSkill: number): number => {
  const averages: Record<StaffRole, number> = {
    RainhaDeBateria: 28,
    MestreSala: 32,
    PortaBandeira: 30,
    Interprete: 45,
    MestreDeBateria: 52,
    Coreografo: 40,
    Carnavalesco: 48,
    DiretorDeCarnaval: 50,
    DiretorDeHarmonia: 46,
    MestreDeBarracao: 48
  };

  const avg = averages[role] || 40;
  let variance = Math.floor(Math.random() * 11) - 5; // -5 to +5

  if (baseSkill > 185) {
     // Elite veterans: bias upward. e.g. -2 to +8
     variance = Math.floor(Math.random() * 11) - 2;
  }

  // Ensure we don't go below min realistic ages
  return Math.max(18, avg + variance);
};

// Helper to construct the object
const defineStaff = (
  id: string,
  name: string,
  role: StaffRole,
  currentSchoolName: string | null,
  historyText: string,
  achievements: StaffAchievement[],
  baseSkill: number,
  age?: number,
  archetype?: RainhaArchetype,
  partnerId?: string
): RealStaffRaw => {
  return {
    id,
    name,
    role,
    currentSchoolName,
    historyText,
    achievementsRaw: achievements,
    baseSkill,
    age: age || calculateRealStaffAge(role, baseSkill),
    archetype,
    partnerId
  };
};

export const REAL_STAFF_DATA: RealStaffRaw[] = [
  // 1. Leandro Vieira
  defineStaff(
    'leandro-vieira', 'Leandro Vieira', 'Carnavalesco', 'Estação Primeira de Mangueira',
    'Mangueira (2016-22, 2025), Imperatriz (2023-24)',
    [
      { type: 'Title', year: 2016, division: 'Grupo Especial' },
      { type: 'Title', year: 2019, division: 'Grupo Especial' },
      { type: 'Title', year: 2023, division: 'Grupo Especial' }
    ],
    195,
    47 // Hardcoded
  ),
  // 2. Neguinho da Beija-Flor
  defineStaff(
    'neguinho', 'Neguinho da Beija-Flor', 'Interprete', 'Beija-Flor de Nilópolis',
    'Beija-Flor de Nilópolis (1976-2025)',
    [
      { type: 'Title', count: 15, division: 'Grupo Especial' } // 15 titles generic
    ],
    198,
    73 // Hardcoded
  ),
  // 3. Paulo Barros
  defineStaff(
    'paulo-barros', 'Paulo Barros', 'Carnavalesco', 'Unidos de Vila Isabel',
    'Tijuca, Mocidade, Portela, Vila Isabel',
    [
      { type: 'Title', year: 2010, division: 'Grupo Especial' },
      { type: 'Title', year: 2012, division: 'Grupo Especial' },
      { type: 'Title', year: 2014, division: 'Grupo Especial' },
      { type: 'Title', year: 2017, division: 'Grupo Especial' }
    ],
    196,
    60 // Hardcoded
  ),
  // 4. Selminha Sorriso (Partner: Claudinho)
  defineStaff(
    'selminha', 'Selminha Sorriso', 'PortaBandeira', 'Beija-Flor de Nilópolis',
    'Beija-Flor de Nilópolis (1996-2025)',
    [
      { type: 'Title', count: 10, division: 'Grupo Especial' }
    ],
    197,
    55, // Hardcoded
    undefined,
    'claudinho'
  ),
  // 5. Mestre Ciça
  defineStaff(
    'mestre-cica', 'Mestre Ciça', 'MestreDeBateria', 'Unidos do Viradouro',
    'Unidos do Viradouro (2019-2024)',
    [
      { type: 'Title', year: 2020, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    195,
    58 // Hardcoded
  ),
  // 6. Tarcísio Zanon
  defineStaff(
    'tarcisio-zanon', 'Tarcísio Zanon', 'Carnavalesco', 'Unidos do Viradouro',
    'Unidos do Viradouro (2020-2024)',
    [
      { type: 'Title', year: 2020, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    192,
    undefined
  ),
  // 7. Lucinha Nobre
  defineStaff(
    'lucinha-nobre', 'Lucinha Nobre', 'PortaBandeira', 'Unidos da Tijuca',
    'Portela (2018-23), Unidos da Tijuca (2024-25)',
    [
      { type: 'Estandarte', count: 10 },
      { type: 'Nota10', count: 20 }
    ],
    190,
    undefined
  ),
  // 8. Zé Paulo Sierra
  defineStaff(
    'ze-paulo', 'Zé Paulo Sierra', 'Interprete', 'Mocidade Independente de Padre Miguel',
    'Viradouro (2014-23), Mocidade (2024-25)',
    [
      { type: 'Title', year: 2020, division: 'Grupo Especial' }
    ],
    188,
    undefined
  ),
  // 9. Alex Neoral
  defineStaff(
    'alex-neoral', 'Alex Neoral', 'Coreografo', 'Unidos do Viradouro',
    'Unidos do Viradouro (2019-2024)',
    [
      { type: 'Title', year: 2020, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    185,
    undefined
  ),
  // 10. Paolla Oliveira
  defineStaff(
    'paolla-oliveira', 'Paolla Oliveira', 'RainhaDeBateria', 'Acadêmicos do Grande Rio',
    'Acadêmicos do Grande Rio (2020-2024)',
    [
      { type: 'Title', year: 2022, division: 'Grupo Especial' }
    ],
    195, // Fame
    undefined,
    'Celebridade'
  ),
  // 11. Erika Januza
  defineStaff(
    'erika-januza', 'Erika Januza', 'RainhaDeBateria', 'Unidos do Viradouro',
    'Unidos do Viradouro (2022-2024)',
    [
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    185,
    undefined,
    'Celebridade'
  ),
  // 12. Sabrina Sato
  defineStaff(
    'sabrina-sato', 'Sabrina Sato', 'RainhaDeBateria', 'Unidos de Vila Isabel',
    'Vila Isabel (2011-24), Gaviões (2018-24)',
    [
      { type: 'Title', year: 2013, division: 'Grupo Especial' }
    ],
    198,
    undefined,
    'Celebridade'
  ),
  // 13. Marcelo Misailidis
  defineStaff(
    'marcelo-misailidis', 'Marcelo Misailidis', 'Coreografo', 'Imperatriz Leopoldinense',
    'Beija-Flor (2014-22), Imperatriz (2023-24)',
    [
      { type: 'Title', year: 2015, division: 'Grupo Especial' },
      { type: 'Title', year: 2018, division: 'Grupo Especial' },
      { type: 'Title', year: 2023, division: 'Grupo Especial' }
    ],
    190,
    undefined
  ),
  // 14. Gabriel Haddad
  defineStaff(
    'gabriel-haddad', 'Gabriel Haddad', 'Carnavalesco', 'Acadêmicos do Grande Rio',
    'Acadêmicos do Grande Rio (2019-2024)',
    [
      { type: 'Title', year: 2022, division: 'Grupo Especial' }
    ],
    185,
    undefined
  ),
  // 15. Leonardo Bora
  defineStaff(
    'leonardo-bora', 'Leonardo Bora', 'Carnavalesco', 'Acadêmicos do Grande Rio',
    'Acadêmicos do Grande Rio (2019-2024)',
    [
      { type: 'Title', year: 2022, division: 'Grupo Especial' }
    ],
    185,
    undefined
  ),
  // 16. Tinga
  defineStaff(
    'tinga', 'Tinga', 'Interprete', 'Unidos de Vila Isabel',
    'Unidos da Tijuca (2014-18), Vila Isabel (2019-25)',
    [
      { type: 'Title', year: 2014, division: 'Grupo Especial' }
    ],
    188,
    undefined
  ),
  // 17. Alexandre Louzada
  defineStaff(
    'alexandre-louzada', 'Alexandre Louzada', 'Carnavalesco', 'Beija-Flor de Nilópolis',
    'Mocidade (2016-18), Beija-Flor (2022-24)',
    [
      { type: 'Title', year: 2017, division: 'Grupo Especial' },
      { type: 'Title', year: 2018, division: 'Grupo Especial' }
    ],
    192,
    undefined
  ),
  // 18. Claudinho (Partner: Selminha)
  defineStaff(
    'claudinho', 'Claudinho', 'MestreSala', 'Beija-Flor de Nilópolis',
    'Beija-Flor de Nilópolis (1996-2025)',
    [
      { type: 'Title', count: 10, division: 'Grupo Especial' }
    ],
    197,
    undefined,
    undefined,
    'selminha'
  ),
  // 19. Mauro Quintaes
  defineStaff(
    'mauro-quintaes', 'Mauro Quintaes', 'Carnavalesco', 'Unidos do Porto da Pedra',
    'Unidos do Porto da Pedra (2023-2024)',
    [
      { type: 'Title', year: 2023, division: 'Série Ouro' }
    ],
    180,
    undefined
  ),
  // 20. Mestre Sombra (SP -> Market)
  defineStaff(
    'mestre-sombra', 'Mestre Sombra', 'MestreDeBateria', 'Mocidade Alegre',
    'Mocidade Alegre (2010-2024)',
    [
      { type: 'Title', year: 2012, division: 'Grupo Especial' }, // SP Titles counted as Special
      { type: 'Title', year: 2014, division: 'Grupo Especial' },
      { type: 'Title', year: 2023, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    193,
    undefined
  ),
  // 21. Aline Oliveira (SP -> Market)
  defineStaff(
    'aline-oliveira', 'Aline Oliveira', 'RainhaDeBateria', 'Mocidade Alegre',
    'Mocidade Alegre (2012-2024)',
    [
      { type: 'Title', year: 2012, division: 'Grupo Especial' },
      { type: 'Title', year: 2014, division: 'Grupo Especial' },
      { type: 'Title', year: 2023, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    190,
    undefined,
    'CriaDaComunidade'
  ),
  // 22. Marcus Ferreira
  defineStaff(
    'marcus-ferreira', 'Marcus Ferreira', 'Carnavalesco', 'Mocidade Independente de Padre Miguel',
    'Viradouro (2020-22), Mocidade (2023-24)',
    [
      { type: 'Title', year: 2020, division: 'Grupo Especial' },
      { type: 'Title', year: 2022, division: 'Grupo Especial' }
    ],
    188,
    undefined
  ),
  // 23. Jorge Silveira (SP -> Market)
  defineStaff(
    'jorge-silveira', 'Jorge Silveira', 'Carnavalesco', 'Mocidade Alegre',
    'São Clemente, Mocidade Alegre (SP)',
    [
      { type: 'Title', year: 2023, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    185,
    undefined
  ),
  // 24. Igor Sorriso (SP -> Market)
  defineStaff(
    'igor-sorriso', 'Igor Sorriso', 'Interprete', 'Mocidade Alegre',
    'Mocidade Alegre (2023-2024)',
    [
      { type: 'Title', year: 2023, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    185,
    undefined
  ),
  // 25. Celsinho Mody (SP -> Market)
  defineStaff(
    'celsinho-mody', 'Celsinho Mody', 'Interprete', 'Acadêmicos do Tatuapé',
    'Acadêmicos do Tatuapé (2017-2024)',
    [
      { type: 'Title', year: 2017, division: 'Grupo Especial' },
      { type: 'Title', year: 2018, division: 'Grupo Especial' }
    ],
    185,
    undefined
  ),
  // 26. Alex Fab
  defineStaff(
    'alex-fab', 'Alex Fab', 'DiretorDeCarnaval', 'Unidos do Viradouro',
    'Unidos do Viradouro (2019-2024)',
    [
      { type: 'Title', year: 2020, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    185,
    undefined
  ),
  // 27. Mestre Fafá
  defineStaff(
    'mestre-fafa', 'Mestre Fafá', 'MestreDeBateria', 'Acadêmicos do Grande Rio',
    'Acadêmicos do Grande Rio (2019-2024)',
    [
      { type: 'Title', year: 2022, division: 'Grupo Especial' }
    ],
    182,
    undefined
  ),
  // 28. Rute Alves (Partner: Julinho)
  defineStaff(
    'rute-alves', 'Rute Alves', 'PortaBandeira', 'Unidos do Viradouro',
    'Unidos do Viradouro (2019-2024)',
    [
      { type: 'Title', year: 2020, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    192,
    undefined,
    undefined,
    'julinho'
  ),
  // 29. Julinho Nascimento (Partner: Rute)
  defineStaff(
    'julinho', 'Julinho Nascimento', 'MestreSala', 'Unidos do Viradouro',
    'Unidos do Viradouro (2019-2024)',
    [
      { type: 'Title', year: 2020, division: 'Grupo Especial' },
      { type: 'Title', year: 2024, division: 'Grupo Especial' }
    ],
    192,
    undefined,
    undefined,
    'rute-alves'
  ),
  // 30. Leandro Valente
  defineStaff(
    'leandro-valente', 'Leandro Valente', 'Carnavalesco', 'Unidos de Padre Miguel',
    'Unidos de Padre Miguel (2024)',
    [
      { type: 'Title', year: 2024, division: 'Série Ouro' }
    ],
    175,
    undefined
  ),
  // 31. Wic Tavares
  defineStaff(
    'wic-tavares', 'Wic Tavares', 'Interprete', 'Unidos da Tijuca',
    'Unidos da Tijuca (2022-2024)',
    [],
    170,
    undefined
  ),
  // 32. Mestre Rodney
  defineStaff(
    'mestre-rodney', 'Mestre Rodney', 'MestreDeBateria', 'Beija-Flor de Nilópolis',
    'Beija-Flor de Nilópolis (2019-2025)',
    [
        { type: 'Title', year: 2025, division: 'Grupo Especial' } // Future title!
    ],
    185,
    undefined
  ),
  // 33. Ana Beatriz Godói
  defineStaff(
    'ana-beatriz', 'Ana Beatriz Godói', 'RainhaDeBateria', 'Rosas de Ouro',
    'Rosas de Ouro (2024-2025)',
    [],
    180,
    undefined,
    'PostoPago' // Est.
  )
];

/**
 * Transforms the raw data into full StaffMember objects, calculating skills.
 * Note: Reputation is calculated later via service.
 */
export const loadRealStaff = (): Omit<StaffMember, 'salary' | 'contractYears' | 'salaryExpectation' | 'reputation'>[] => {
  return REAL_STAFF_DATA.map(raw => ({
    id: raw.id,
    name: raw.name,
    role: raw.role,
    currentSchoolId: null, // To be resolved
    skills: createSkills(raw.baseSkill),
    partnerId: raw.partnerId,
    archetype: raw.archetype,
    age: raw.age,
    historyText: raw.historyText,
    achievements: raw.achievementsRaw || [],
    // Tmp props for linking
    _schoolName: raw.currentSchoolName
  } as any));
};
