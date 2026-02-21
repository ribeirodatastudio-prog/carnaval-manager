import { StaffMember, StaffRole, StaffSkills, Division, RainhaArchetype } from '../types/models';
import { calculateSalaryExpectation } from '../utils/staffUtils';

const MALE_FIRST_NAMES = [
  'Carlos', 'João', 'Pedro', 'Lucas', 'Mateus', 'Gabriel', 'Rafael', 'Felipe', 'Bruno', 'Thiago', 'Jorge', 'Luiz', 'Antônio', 'José', 'Francisco', 'Paulo', 'Roberto', 'Marcos', 'Ricardo', 'Eduardo', 'André', 'Daniel', 'Diego', 'Fábio', 'Gustavo', 'Henrique', 'Igor', 'Júnior', 'Kleber', 'Leonardo', 'Márcio', 'Nélson', 'Oswaldo', 'Renato', 'Sandro', 'Túlio', 'Vagner', 'Wellington', 'Xande', 'Alessandro', 'Bernardo', 'Caio', 'Danilo', 'Evandro', 'Flávio', 'Gilberto', 'Haroldo', 'Ivaldo', 'Jeremias', 'Kleiton'
];

const FEMALE_FIRST_NAMES = [
  'Ana', 'Maria', 'Julia', 'Beatriz', 'Fernanda', 'Camila', 'Larissa', 'Amanda', 'Bruna', 'Mariana', 'Aline', 'Bianca', 'Carla', 'Daiane', 'Elaine', 'Fabiana', 'Gisele', 'Helena', 'Isabela', 'Jéssica', 'Karina', 'Letícia', 'Mônica', 'Natália', 'Olivia', 'Patrícia', 'Raquel', 'Sandra', 'Tatiana', 'Valéria', 'Wanessa', 'Yara', 'Adriana', 'Cláudia', 'Débora', 'Elza', 'Fátima', 'Graça', 'Heloísa', 'Ingrid', 'Joana', 'Keila', 'Lívia', 'Marta', 'Nair', 'Odete', 'Priscila', 'Rosana', 'Silvana'
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Nascimento', 'Medeiros', 'Moura', 'Dias', 'Castro', 'Pinto', 'Cardoso', 'Marques', 'Teixeira', 'Mendes', 'Cunha', 'Araújo', 'Ramos', 'Melo', 'Xavier', 'Fonseca', 'Nunes', 'Monteiro', 'Bezerra', 'Cavalcante', 'Correia', 'Machado', 'Paiva', 'Queiroz', 'Rocha', 'Tavares', 'Valente', 'Azevedo', 'Batista', 'Campos', 'Duarte', 'Esteves'
];

const DIVISION_SALARY_FACTOR: Record<Division, number> = {
  'Grupo Especial': 0.55,
  'Série Ouro': 0.40,
  'Série Prata': 0.28,
  'Série Bronze': 0.18,
  'Grupo de Avaliação': 0.10,
};

const SKILL_RANGES: Record<Division, { baseMin: number; baseMax: number; repMin: number; repMax: number; ageMin: number; ageMax: number }> = {
  'Grupo Especial': { baseMin: 100, baseMax: 145, repMin: 95, repMax: 145, ageMin: 28, ageMax: 52 },
  'Série Ouro': { baseMin: 80, baseMax: 120, repMin: 75, repMax: 120, ageMin: 24, ageMax: 48 },
  'Série Prata': { baseMin: 60, baseMax: 100, repMin: 55, repMax: 100, ageMin: 20, ageMax: 45 },
  'Série Bronze': { baseMin: 40, baseMax: 80, repMin: 35, repMax: 80, ageMin: 18, ageMax: 42 },
  'Grupo de Avaliação': { baseMin: 20, baseMax: 60, repMin: 15, repMax: 60, ageMin: 17, ageMax: 38 },
};

function getRandomName(role: StaffRole): string {
  const isFemaleBiased = role === 'PortaBandeira' || role === 'RainhaDeBateria';
  const isMaleBiased = role === 'MestreDeBateria' || role === 'MestreSala';

  let useFemale = Math.random() < 0.5;
  if (isFemaleBiased) useFemale = Math.random() < 0.95; // Strong bias
  if (isMaleBiased) useFemale = Math.random() < 0.05; // Strong bias

  const first = useFemale
    ? FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)]
    : MALE_FIRST_NAMES[Math.floor(Math.random() * MALE_FIRST_NAMES.length)];

  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function getSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function generateSkills(role: StaffRole, base: number): StaffSkills {
  const variance = () => Math.floor(Math.random() * 31) - 15; // ±15
  const clamp = (val: number) => Math.max(1, Math.min(200, val)); // Hard cap 200, but logic ensures <160 mostly
  // Additional strict cap for generated staff
  const strictClamp = (val: number) => Math.max(1, Math.min(160, val));

  const s: StaffSkills = {
    plastica: clamp(base + variance()),
    ritmica: clamp(base + variance()),
    expressaoCorporal: clamp(base + variance()),
    lideranca: clamp(base + variance()),
    criatividade: clamp(base + variance()),
    resiliencia: clamp(base + variance()),
    logistica: clamp(base + variance()),
    gestaoDeRecursos: clamp(base + variance()),
    fama: clamp(base + variance()),
  };

  // Boost primary skills (+10 to +20)
  const boost = () => Math.floor(Math.random() * 11) + 10;

  // Apply boosts and secondary adjustments
  switch (role) {
    case 'Carnavalesco':
      s.criatividade += boost();
      s.plastica += boost();
      break;
    case 'MestreDeBateria':
      s.ritmica += boost();
      s.lideranca += boost();
      break;
    case 'Interprete':
      s.ritmica += boost();
      s.fama += boost();
      s.expressaoCorporal += boost();
      break;
    case 'MestreSala':
    case 'PortaBandeira':
      s.expressaoCorporal += boost();
      s.plastica += boost();
      s.ritmica += boost();
      break;
    case 'RainhaDeBateria':
      s.fama += boost();
      s.expressaoCorporal += boost();
      break;
    case 'Coreografo':
      s.expressaoCorporal += boost();
      s.criatividade += boost();
      break;
    case 'DiretorDeCarnaval':
      s.gestaoDeRecursos += boost();
      s.lideranca += boost();
      s.logistica += boost();
      break;
    case 'DiretorDeHarmonia':
      s.lideranca += boost();
      s.ritmica += boost();
      s.logistica += boost();
      break;
    case 'MestreDeBarracao':
      s.logistica += boost();
      s.gestaoDeRecursos += boost();
      s.plastica += boost();
      break;
  }

  // Apply strict clamp to ALL skills to ensure no skill > 160
  (Object.keys(s) as Array<keyof StaffSkills>).forEach(key => {
    s[key] = strictClamp(s[key]);
  });

  return s;
}

function getRolesForDivision(division: Division): StaffRole[] {
  const allRoles: StaffRole[] = [
    'DiretorDeCarnaval', 'Carnavalesco', 'Interprete', 'MestreDeBateria',
    'MestreSala', 'PortaBandeira', 'RainhaDeBateria', 'Coreografo',
    'DiretorDeHarmonia', 'MestreDeBarracao'
  ];

  if (division === 'Grupo Especial') return allRoles;

  if (division === 'Série Ouro') {
    return allRoles.filter(r => r !== 'Coreografo');
  }

  if (division === 'Série Prata') {
    return allRoles.filter(r => r !== 'Coreografo' && r !== 'DiretorDeCarnaval');
  }

  if (division === 'Série Bronze') {
    return allRoles.filter(r => r !== 'Coreografo' && r !== 'DiretorDeCarnaval' && r !== 'MestreDeBarracao');
  }

  if (division === 'Grupo de Avaliação') {
    return ['DiretorDeHarmonia', 'Carnavalesco', 'Interprete', 'MestreDeBateria', 'MestreSala', 'PortaBandeira'];
  }

  return allRoles;
}

function getRainhaArchetype(division: Division): RainhaArchetype {
  const rand = Math.random();
  if (division === 'Grupo Especial') {
    if (rand < 0.3) return 'Celebridade';
    if (rand < 0.7) return 'PostoPago';
    return 'CriaDaComunidade';
  } else if (division === 'Série Ouro') {
    if (rand < 0.15) return 'Celebridade';
    if (rand < 0.6) return 'PostoPago';
    return 'CriaDaComunidade';
  } else {
    if (rand < 0.05) return 'Celebridade';
    if (rand < 0.45) return 'PostoPago';
    return 'CriaDaComunidade';
  }
}

export function generateSchoolRoster(schoolName: string, division: Division): StaffMember[] {
  const roster: StaffMember[] = [];
  const range = SKILL_RANGES[division];
  const slug = getSlug(schoolName);

  const roles = getRolesForDivision(division);
  const processedRoles = new Set<StaffRole>();

  // Handle Couple first if present
  if (roles.includes('MestreSala') && roles.includes('PortaBandeira')) {
    const synergy = Math.floor(Math.random() * 51) + 50; // 50-100
    const msId = `gen-${slug}-mestresala`;
    const pbId = `gen-${slug}-portabandeira`;
    const baseSkill = Math.floor(Math.random() * (range.baseMax - range.baseMin + 1)) + range.baseMin;

    // Mestre Sala
    const msSkills = generateSkills('MestreSala', baseSkill);
    const msRep = Math.min(160, Math.floor(Math.random() * (range.repMax - range.repMin + 1)) + range.repMin);
    const msAge = Math.floor(Math.random() * (range.ageMax - range.ageMin + 1)) + range.ageMin;

    const ms: StaffMember = {
      id: msId,
      name: getRandomName('MestreSala'),
      role: 'MestreSala',
      skills: msSkills,
      reputation: msRep,
      salaryExpectation: 0,
      salary: 0,
      contractYears: Math.floor(Math.random() * 3) + 1, // 1-3
      currentSchoolId: null,
      partnerId: pbId,
      synergy,
      age: msAge
    };
    ms.salaryExpectation = calculateSalaryExpectation('MestreSala', msSkills, msRep);
    ms.salary = Math.floor(ms.salaryExpectation * DIVISION_SALARY_FACTOR[division]);
    roster.push(ms);
    processedRoles.add('MestreSala');

    // Porta Bandeira
    const pbSkills = generateSkills('PortaBandeira', baseSkill);
    const pbRep = Math.min(160, Math.floor(Math.random() * (range.repMax - range.repMin + 1)) + range.repMin);
    const pbAge = Math.floor(Math.random() * (range.ageMax - range.ageMin + 1)) + range.ageMin;

    const pb: StaffMember = {
      id: pbId,
      name: getRandomName('PortaBandeira'),
      role: 'PortaBandeira',
      skills: pbSkills,
      reputation: pbRep,
      salaryExpectation: 0,
      salary: 0,
      contractYears: Math.floor(Math.random() * 3) + 1,
      currentSchoolId: null,
      partnerId: msId,
      synergy,
      age: pbAge
    };
    pb.salaryExpectation = calculateSalaryExpectation('PortaBandeira', pbSkills, pbRep);
    pb.salary = Math.floor(pb.salaryExpectation * DIVISION_SALARY_FACTOR[division]);
    roster.push(pb);
    processedRoles.add('PortaBandeira');
  }

  roles.forEach(role => {
    if (processedRoles.has(role)) return;

    const baseSkill = Math.floor(Math.random() * (range.baseMax - range.baseMin + 1)) + range.baseMin;
    const skills = generateSkills(role, baseSkill);
    let reputation = Math.min(160, Math.floor(Math.random() * (range.repMax - range.repMin + 1)) + range.repMin);
    const age = Math.floor(Math.random() * (range.ageMax - range.ageMin + 1)) + range.ageMin;

    let archetype: RainhaArchetype | undefined;
    if (role === 'RainhaDeBateria') {
      archetype = getRainhaArchetype(division);
      if (archetype === 'Celebridade') {
        skills.fama = Math.min(160, skills.fama + 20);
        reputation = Math.min(155, reputation + 10);
      } else if (archetype === 'PostoPago') {
        skills.ritmica = Math.max(1, skills.ritmica - 15);
        skills.expressaoCorporal = Math.max(1, skills.expressaoCorporal - 15);
      }
    }

    const staff: StaffMember = {
      id: `gen-${slug}-${getSlug(role)}`,
      name: getRandomName(role),
      role,
      skills,
      reputation,
      salaryExpectation: 0,
      salary: 0,
      contractYears: Math.floor(Math.random() * 3) + 1,
      currentSchoolId: null,
      archetype,
      age
    };

    staff.salaryExpectation = calculateSalaryExpectation(role, skills, reputation, archetype);
    staff.salary = Math.floor(staff.salaryExpectation * DIVISION_SALARY_FACTOR[division]);

    roster.push(staff);
    processedRoles.add(role);
  });

  return roster;
}

function generateMarketPool(): StaffMember[] {
  const pool: StaffMember[] = [];
  const tiers: { division: Division; count: number }[] = [
    { division: 'Grupo Especial', count: 8 },
    { division: 'Série Ouro', count: 15 },
    { division: 'Série Prata', count: 20 },
    { division: 'Série Bronze', count: 12 },
    { division: 'Grupo de Avaliação', count: 5 },
  ];

  const allRoles: StaffRole[] = [
    'DiretorDeCarnaval', 'Carnavalesco', 'Interprete', 'MestreDeBateria',
    'MestreSala', // Couple handled specially
    'RainhaDeBateria', 'Coreografo', 'DiretorDeHarmonia', 'MestreDeBarracao'
  ];

  tiers.forEach(({ division, count }) => {
    const range = SKILL_RANGES[division];
    for (let i = 0; i < count; i++) {
        // 15% chance for couple
        const isCouple = Math.random() < 0.15;
        const baseSkill = Math.floor(Math.random() * (range.baseMax - range.baseMin + 1)) + range.baseMin;
        const uuid = Math.random().toString(36).substr(2, 9);
        const age = Math.floor(Math.random() * (range.ageMax - range.ageMin + 1)) + range.ageMin;

        if (isCouple) {
            const synergy = Math.floor(Math.random() * 51) + 50;
            const msId = `gen-market-${uuid}-ms`;
            const pbId = `gen-market-${uuid}-pb`;

             // MS
            const msSkills = generateSkills('MestreSala', baseSkill);
            const msRep = Math.min(160, Math.floor(Math.random() * (range.repMax - range.repMin + 1)) + range.repMin);
            const ms: StaffMember = {
                id: msId,
                name: getRandomName('MestreSala'),
                role: 'MestreSala',
                skills: msSkills,
                reputation: msRep,
                salaryExpectation: 0, // Calculated below
                salary: 0,
                contractYears: 0,
                currentSchoolId: null,
                partnerId: pbId,
                synergy,
                age
            };
            ms.salaryExpectation = calculateSalaryExpectation('MestreSala', msSkills, msRep);
            pool.push(ms);
            // Count as 1 iteration or 2? Let's count as 1 "unit" of work, but adds 2 staff.

            // PB
            const pbSkills = generateSkills('PortaBandeira', baseSkill);
            const pbRep = Math.min(160, Math.floor(Math.random() * (range.repMax - range.repMin + 1)) + range.repMin);
            const pb: StaffMember = {
                id: pbId,
                name: getRandomName('PortaBandeira'),
                role: 'PortaBandeira',
                skills: pbSkills,
                reputation: pbRep,
                salaryExpectation: 0,
                salary: 0,
                contractYears: 0,
                currentSchoolId: null,
                partnerId: msId,
                synergy,
                age
            };
            pb.salaryExpectation = calculateSalaryExpectation('PortaBandeira', pbSkills, pbRep);
            pool.push(pb);

        } else {
            const role = allRoles[Math.floor(Math.random() * allRoles.length)];
            // Skip Coreografo/etc for lower divisions? Market implies "free agents", so maybe they exist even if division doesn't use them?
            // "Distribute roles roughly evenly."
            // I'll assume all roles are valid for market, but lower divisions won't hire them.

            const skills = generateSkills(role, baseSkill);
            let reputation = Math.min(160, Math.floor(Math.random() * (range.repMax - range.repMin + 1)) + range.repMin);

            let archetype: RainhaArchetype | undefined;
            if (role === 'RainhaDeBateria') {
                archetype = getRainhaArchetype(division);
                 if (archetype === 'Celebridade') {
                    skills.fama = Math.min(160, skills.fama + 20);
                    reputation = Math.min(155, reputation + 10);
                } else if (archetype === 'PostoPago') {
                    skills.ritmica = Math.max(1, skills.ritmica - 15);
                    skills.expressaoCorporal = Math.max(1, skills.expressaoCorporal - 15);
                }
            }

            const staff: StaffMember = {
                id: `gen-market-${uuid}`,
                name: getRandomName(role),
                role,
                skills,
                reputation,
                salaryExpectation: 0,
                salary: 0,
                contractYears: 0,
                currentSchoolId: null,
                archetype,
                age
            };
            staff.salaryExpectation = calculateSalaryExpectation(role, skills, reputation, archetype);
            pool.push(staff);
        }
    }
  });

  return pool;
}

export const GENERIC_MARKET_POOL = generateMarketPool();
