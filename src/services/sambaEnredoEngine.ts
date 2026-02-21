import { School, StaffRole, StaffSkills, Enredo, SambaEnredo, SambaSelectionProcess, EnredoCategory } from '../types/models';

const COMPOSITOR_NAMES = [
  "Betinho do Cavaco", "Zé da Cuíca", "Paulinho Poeta", "Marquinhos Melodia", "Dinho do Pandeiro",
  "Almir da Vila", "Toninho Gerais", "Chico do Partido", "Serginho Meriti", "Wilsinho Paz",
  "Arlindo Neto", "Claudio Russo", "Moacyr Luz", "Samir Trindade", "André Diniz",
  "Gustavo Clarão", "Junior Fionda", "Thiago Meiners", "Lequinho", "Gabriel Teixeira"
];

const TITLES_BY_CATEGORY: Record<EnredoCategory, string[]> = {
  'AfroBrasileiro': ["Tambores d'África", "Raízes do Quilombo", "Orixás na Avenida", "Negra Herança", "Vozes dos Ancestrais"],
  'Religioso': ["Fé e Devoção", "Sagrado Manto", "Procissão de Luz", "Milagres da Santa", "Sincretismo Divino"],
  'Historico': ["Memórias do Império", "Brasil Colonial", "Gritos de Independência", "Heróis Esquecidos", "Lágrimas da História"],
  'Biografico': ["O Poeta da Vila", "Traços de um Mestre", "Vida de Artista", "Canto da Sereia", "Eterno Campeão"],
  'PoliticoSocial': ["O Povo na Rua", "Brasil Desigual", "Luta e Esperança", "Voz da Comunidade", "Futuro da Nação"],
  'Folclorico': ["Lendas do Sertão", "Mistérios da Floresta", "Contos de Fadas BR", "Saci e Curupira", "Festa do Divino"],
  'Ambiental': ["Clamor da Natureza", "Verde que te Quero Verde", "Águas da Vida", "Amazônia em Chamas", "O Futuro é Verde"],
  'Indigena': ["Terra Vermelha", "Filhos da Pindorama", "Guerreiros da Mata", "Canto da Aldeia", "Espírito da Floresta"],
  'Patrocinado': ["A Força da Energia", "Brasil que Cresce", "Conectando Mundos", "Sabor da Alegria", "Velocidade e Paixão"],
  'Abstrato': ["Devaneios de um Sonhador", "A Cor do Som", "Universo Infinito", "Além da Imaginação", "O Tempo não Para"],
  'ComunitarioLocal': ["Minha Escola, Minha Vida", "O Morro Desce", "Samba na Veia", "Orgulho do Bairro", "Raízes do Pavilhão"]
};

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getStaffSkillBonus(school: School, role: StaffRole, skills: (keyof StaffSkills)[]): number {
  const staff = school.staff.find(s => s.role === role);
  if (!staff) return 0;

  const total = skills.reduce((sum, sk) => sum + staff.skills[sk], 0);
  const avg = total / skills.length;

  // Normalize: skill 100 = 0 bonus, skill 150 = +10, skill 50 = -10
  // Range: 1-200. Avg 100. (150-100)/5 = 10. (200-100)/5 = 20.
  // Max bonus +20, Min bonus -20.
  return Math.round((avg - 100) / 5);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function generateSambaStats(school: School, isEncomendado: boolean): Omit<SambaEnredo, 'id' | 'title' | 'compositors' | 'isEncomendado'> {
  // Staff Bonuses
  const interpreteBonus = getStaffSkillBonus(school, 'Interprete', ['fama', 'expressaoCorporal']);
  const mestreBonus = getStaffSkillBonus(school, 'MestreDeBateria', ['ritmica', 'lideranca']);
  const carnavalescoBonus = getStaffSkillBonus(school, 'Carnavalesco', ['criatividade', 'plastica']);
  const diretorBonus = getStaffSkillBonus(school, 'DiretorDeCarnaval', ['gestaoDeRecursos', 'lideranca']);

  // Base range: 40-80 + Bonus + Variance (-10 to +10)
  const baseMin = 40;
  const baseMax = 80;

  const roll = (bonus: number) => {
    const base = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    const variance = Math.floor(Math.random() * 21) - 10; // -10 to 10

    let val = base + bonus + variance;

    // Encomendado: Higher floor, less variance (handled by tighter range in logic below if needed,
    // but user said "slightly higher floor stats but less variance")
    if (isEncomendado) {
       // Boost floor by 10, reduce variance effect by clamping
       val = Math.max(val, 60);
    }

    return clamp(val, 1, 100);
  };

  return {
    melodia: roll(interpreteBonus),
    grito: roll(interpreteBonus),
    apeloComunidade: roll(diretorBonus),
    letra: roll(carnavalescoBonus),
    ritmo: roll(mestreBonus),
    sinergiaBateria: roll(mestreBonus),
    emocao: roll((interpreteBonus + carnavalescoBonus) / 2),
    aderenciaAoEnredo: roll(carnavalescoBonus),
    versatilidade: roll(diretorBonus)
  };
}

export function generateSambaSelectionProcess(enredo: Enredo, school: School): SambaSelectionProcess {
  const candidates: SambaEnredo[] = [];
  const categoryTitles = TITLES_BY_CATEGORY[enredo.category] || TITLES_BY_CATEGORY['Abstrato'];

  // Always 3 candidates
  const titles = getRandomItems(categoryTitles, 3);

  // Candidate 1: Competition (Generic)
  candidates.push({
    id: `samba-1-${Date.now()}`,
    title: titles[0],
    compositors: getRandomItems(COMPOSITOR_NAMES, 3),
    isEncomendado: false,
    ...generateSambaStats(school, false)
  });

  // Candidate 2: Competition (Generic)
  candidates.push({
    id: `samba-2-${Date.now()}`,
    title: titles[1],
    compositors: getRandomItems(COMPOSITOR_NAMES, 4),
    isEncomendado: false,
    ...generateSambaStats(school, false)
  });

  // Candidate 3: Could be Encomendado or Competition?
  // "Subheader explaining the model: 'Ala de Compositores' (competition) or 'Samba Encomendado' (commissioned)"
  // The prompt implies the whole process can be one or the other, OR the candidates can be mixed?
  // "Encomendado sambas should have slightly higher floor stats... Competition sambas have more variance"
  // Usually a school picks ONE model. But here we are generating 3 candidates.
  // Maybe we simulate that one partnership is "Pro" (Encomendado style) or just high level?
  // Let's stick to 3 competition sambas for now unless there's a setting.
  // Wait, if it's "Samba Encomendado", usually you don't choose between 3 options in the same way (you pay for one).
  // But the UI shows 3 cards.
  // Let's assume these are 3 finalist sambas from the "Ala de Compositores".
  // I will make one of them "Encomendado" style (High Floor) just to vary the gameplay,
  // representing a "heavyweight partnership".
  // Or maybe randomize if one is Encomendado.
  // Let's make the 3rd one have a chance to be "Encomendado" (meaning a Star Partnership).

  const isThirdEncomendado = Math.random() > 0.7;

  candidates.push({
    id: `samba-3-${Date.now()}`,
    title: titles[2],
    compositors: getRandomItems(COMPOSITOR_NAMES, 5),
    isEncomendado: isThirdEncomendado,
    ...generateSambaStats(school, isThirdEncomendado)
  });

  return {
    candidates,
    chosen: null
  };
}
