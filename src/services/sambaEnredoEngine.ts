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
  return Math.round((avg - 100) / 5);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function generateSambaStats(school: School, isEncomendado: boolean): Omit<SambaEnredo, 'id' | 'title' | 'compositors' | 'isEncomendado' | 'scoutHint'> {
  const interpreteBonus = getStaffSkillBonus(school, 'Interprete', ['fama', 'expressaoCorporal']);
  const mestreBonus = getStaffSkillBonus(school, 'MestreDeBateria', ['ritmica', 'lideranca']);
  const carnavalescoBonus = getStaffSkillBonus(school, 'Carnavalesco', ['criatividade', 'plastica']);
  const diretorBonus = getStaffSkillBonus(school, 'DiretorDeCarnaval', ['gestaoDeRecursos', 'lideranca']);

  const baseMin = 40;
  const baseMax = 80;

  const roll = (bonus: number) => {
    const base = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    const variance = Math.floor(Math.random() * 21) - 10;
    let val = base + bonus + variance;

    if (isEncomendado) {
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

function generateScoutHint(stats: {
  letra: number; ritmo: number; sinergiaBateria: number;
  emocao: number; aderenciaAoEnredo: number; versatilidade: number;
}): string {
  const hidden = [
    { name: 'ritmo', val: stats.ritmo },
    { name: 'sinergiaComBateria', val: stats.sinergiaBateria },
    { name: 'letra', val: stats.letra },
    { name: 'emocao', val: stats.emocao },
    { name: 'aderencia', val: stats.aderenciaAoEnredo },
    { name: 'versatilidade', val: stats.versatilidade },
  ];

  const best = [...hidden].sort((a, b) => b.val - a.val)[0];
  const worst = [...hidden].sort((a, b) => a.val - b.val)[0];

  const HINT_MAP: Record<string, { high: string[]; low: string[] }> = {
    ritmo: {
      high: [
        'A bateria aprendeu em dois ensaios. O groove encaixa perfeitamente.',
        'Os ritmistas já marcam o tempo sozinhos. Samba feito para a nossa bateria.',
      ],
      low: [
        'O andamento confunde a bateria. Vai precisar de muita adaptação.',
        'Os mestres de ala reclamaram do tempo — não é natural para o repique.',
      ],
    },
    sinergiaComBateria: {
      high: [
        'O Mestre sorriu quando ouviu. Disse que é o samba que ele esperava.',
        'Parece que foi escrito especificamente para a nossa bateria.',
      ],
      low: [
        'O Mestre de Bateria saiu do ensaio sem comentar. Mau sinal.',
        'Vai funcionar, mas não é o que a nossa bateria pede naturalmente.',
      ],
    },
    letra: {
      high: [
        'Compositores experientes. A letra vai emocionar os juízes.',
        'Cada verso tem a ver com o enredo. Perfeito para a comissão julgadora.',
      ],
      low: [
        'A letra é fraca — mistura temas sem conexão clara com o enredo.',
        'Bonito de cantar, mas a letra confunde mais do que conta.',
      ],
    },
    emocao: {
      high: [
        'Teve componente chorando no ensaio. Samba que vai emocionar a Sapucaí.',
        'A torcida pediu bis duas vezes. Carrega muito sentimento.',
      ],
      low: [
        'Animado, mas não toca fundo. Falta alma para a passarela.',
        'Tecnicamente bom, emocionalmente neutro.',
      ],
    },
    aderencia: {
      high: [
        'O Carnavalesco ficou feliz. Cada parte do samba conta o enredo.',
        'Os alegoristas disseram que parece que o samba foi feito junto com os carros.',
      ],
      low: [
        'O samba canta outra coisa. A ligação com o enredo é forçada.',
        'Parece que os compositores não leram o enredo com cuidado.',
      ],
    },
    versatilidade: {
      high: [
        'O puxador testou variações na quadra e todas funcionaram.',
        'Fácil de adaptar ao vivo — o Intérprete vai ter liberdade na avenida.',
      ],
      low: [
        'Só funciona do jeito que está. Qualquer variação soa estranha.',
        'O intérprete vai precisar ser cirúrgico — não tem margem para improvisos.',
      ],
    },
  };

  const bestHints = HINT_MAP[best.name]?.high ?? ['Forte nos bastidores.'];
  const worstHints = HINT_MAP[worst.name]?.low ?? ['Ponto fraco identificado.'];

  if (Math.random() < 0.6) {
    return bestHints[Math.floor(Math.random() * bestHints.length)];
  } else {
    return worstHints[Math.floor(Math.random() * worstHints.length)];
  }
}

export function generateSambaSelectionProcess(enredo: Enredo, school: School): SambaSelectionProcess {
  const candidates: SambaEnredo[] = [];
  const categoryTitles = TITLES_BY_CATEGORY[enredo.category] || TITLES_BY_CATEGORY['Abstrato'];

  const titles = getRandomItems(categoryTitles, 3);

  // Helper to generate and enhance
  const createCandidate = (id: string, title: string, compositorCount: number, isEncomendado: boolean) => {
      let stats = generateSambaStats(school, isEncomendado);

      // Feature 2: Estácio Bonus
      if (school.uniqueBonus === 'estacio_bercoBerco') {
          stats.letra = Math.min(100, stats.letra + 8);
          stats.emocao = Math.min(100, stats.emocao + 8);
      }

      const scoutHint = generateScoutHint(stats);

      return {
        id,
        title,
        compositors: getRandomItems(COMPOSITOR_NAMES, compositorCount),
        isEncomendado,
        ...stats,
        scoutHint
      };
  };

  candidates.push(createCandidate(`samba-1-${Date.now()}`, titles[0], 3, false));
  candidates.push(createCandidate(`samba-2-${Date.now()}`, titles[1], 4, false));

  const isThirdEncomendado = Math.random() > 0.7;
  candidates.push(createCandidate(`samba-3-${Date.now()}`, titles[2], 5, isThirdEncomendado));

  return {
    candidates,
    chosen: null
  };
}
