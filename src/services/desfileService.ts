import {
  School,
  DesfileResult,
  ParadeSegment,
  ParadeIncident,
  ParadeSegmentType,
  IncidentType,
  Quesito,
  ProductionTrack,
  StaffMember,
  Division
} from '../types/models';
import { segmentNarratives, incidentNarratives } from '../data/desfileNarratives';

// Helper to get average skill of a staff member
function avgStaffSkill(staff: StaffMember): number {
  const s = staff.skills;
  const technical = (s.plastica + s.ritmica + s.expressaoCorporal) / 3;
  const mental = (s.lideranca + s.criatividade + s.resiliencia) / 3;
  const org = (s.logistica + s.gestaoDeRecursos + s.fama) / 3;
  return (technical + mental + org) / 3; // 0-200
}

function getFeaturedStaff(segment: ParadeSegmentType, school: School): StaffMember[] {
  const staffList: StaffMember[] = [];
  const addRole = (role: string) => {
    const s = school.staff.find(st => st.role === role);
    if (s) staffList.push(s);
  };

  switch (segment) {
    case 'ComissaoDeFrente':
      addRole('DiretorDeHarmonia');
      addRole('Coreografo');
      break;
    case 'AlaInicial':
      addRole('Carnavalesco');
      break;
    case 'BateriaEntrance':
      addRole('MestreDeBateria');
      addRole('RainhaDeBateria');
      break;
    case 'AlegoriaPrincipal':
      addRole('Carnavalesco');
      addRole('MestreDeBarracao');
      break;
    case 'AlasDesenvolvimento':
      addRole('Coreografo');
      addRole('DiretorDeHarmonia');
      break;
    case 'AlegoriasSecundarias':
      addRole('MestreDeBarracao');
      break;
    case 'DestaquesECasais':
      addRole('MestreSala');
      addRole('PortaBandeira');
      break;
    case 'InterpretePeak':
      addRole('Interprete');
      break;
    case 'AlegoriaConclusao':
      addRole('Carnavalesco');
      break;
    case 'CabosDaEscola':
      addRole('DiretorDeCarnaval');
      break;
  }
  return staffList;
}

function calcSegmentQuality(segment: ParadeSegmentType, school: School): number {
  // 1. Preparation Tracks
  let trackQuality = 0;
  if (school.preparation) {
      const prep = school.preparation;
      const trackMap: Partial<Record<ParadeSegmentType, ProductionTrack[]>> = {
        BateriaEntrance: ['Bateria'],
        AlegoriaPrincipal: ['Alegorias'],
        AlegoriasSecundarias: ['Alegorias'],
        AlegoriaConclusao: ['Alegorias'],
        AlasDesenvolvimento: ['Harmonia', 'Fantasias'],
        DestaquesECasais: ['Harmonia'],
        ComissaoDeFrente: ['Harmonia'],
        AlaInicial: ['Fantasias', 'Harmonia'],
        AlaComunidade: ['Harmonia'],
        InterpretePeak: ['Bateria', 'Harmonia'],
        CabosDaEscola: ['Harmonia'],
      };

      const tracks = trackMap[segment] ?? ['Harmonia'];
      trackQuality = tracks.reduce((sum, t) => sum + prep.tracks[t].quality, 0) / tracks.length;
  } else {
      // AI Fallback
      trackQuality = 60 + (school.prestige / 200) * 35 + (Math.random() * 10);
  }

  // 2. Staff Contribution
  const featuredStaff = getFeaturedStaff(segment, school);
  const avgSkill = featuredStaff.length
    ? featuredStaff.reduce((sum, s) => sum + avgStaffSkill(s), 0) / featuredStaff.length
    : 100; // Default average if no staff found (AI or vacancies)

  // Normalize skill to 0-100 (it's 0-200 internally)
  const normSkill = avgSkill / 2;

  // 3. Enredo Bonus
  const enredoBonus = school.enredo ? (school.enredo.potentialScore / 100) * 15 : 0;

  // 4. Random Noise
  const noise = (Math.random() - 0.5) * 10;

  // Weighted Sum
  // Track (60%) + Staff (25%) + Enredo (15%) + Noise
  let raw = trackQuality * 0.6 + normSkill * 0.25 + enredoBonus + noise;

  return Math.max(0, Math.min(100, raw));
}

function selectNarrative(segment: ParadeSegmentType, quality: number, school: School): string {
    const pool = segmentNarratives[segment];
    let template = '';
    if (quality >= 80) template = pool.high[Math.floor(Math.random() * pool.high.length)];
    else if (quality >= 50) template = pool.mid[Math.floor(Math.random() * pool.mid.length)];
    else template = pool.low[Math.floor(Math.random() * pool.low.length)];

    const staff = getFeaturedStaff(segment, school);
    const staffName = staff.length > 0 ? staff[0].name : 'O Responsável';

    return template
        .replace(/{staffName}/g, staffName)
        .replace(/{schoolName}/g, school.name)
        .replace(/{enredoTitle}/g, school.enredo?.title || 'Enredo');
}

export function generateParadeSegments(school: School): ParadeSegment[] {
    const types: ParadeSegmentType[] = [
        'ComissaoDeFrente',
        'AlaInicial',
        'BateriaEntrance',
        'AlegoriaPrincipal',
        'AlasDesenvolvimento',
        'AlegoriasSecundarias',
        'DestaquesECasais',
        'AlaComunidade',
        'InterpretePeak',
        'AlegoriaConclusao',
        'CabosDaEscola'
    ];

    const labels: Record<ParadeSegmentType, string> = {
        ComissaoDeFrente: 'Comissão de Frente',
        AlaInicial: 'Abre-Alas Humano',
        BateriaEntrance: 'Entrada da Bateria',
        AlegoriaPrincipal: 'Alegoria 1 (Abre-Alas)',
        AlasDesenvolvimento: 'Desenvolvimento do Enredo',
        AlegoriasSecundarias: 'Alegorias Intermediárias',
        DestaquesECasais: 'Mestre-Sala e Porta-Bandeira',
        AlaComunidade: 'Chão da Escola',
        InterpretePeak: 'Apogeu do Samba',
        AlegoriaConclusao: 'Alegoria Final',
        CabosDaEscola: 'Dispersão'
    };

    return types.map((type, index) => {
        const quality = calcSegmentQuality(type, school);
        const featured = getFeaturedStaff(type, school).map(s => s.role);

        let crowdReaction: ParadeSegment['crowdReaction'] = 'Frio';
        if (quality > 90) crowdReaction = 'Delirio';
        else if (quality > 75) crowdReaction = 'Empolgado';
        else if (quality > 60) crowdReaction = 'Aquecendo';

        return {
            index,
            type,
            label: labels[type],
            staffFeatured: featured,
            qualityRating: quality,
            crowdReaction,
            isComplete: false,
            narrativeText: selectNarrative(type, quality, school)
        };
    });
}

function generateIncidents(school: School): ParadeIncident[] {
    const incidents: ParadeIncident[] = [];
    const prep = school.preparation;

    // Only generate specific incidents if we have prep data (Player School)
    if (!prep) return [];

    // Calculate dynamic risk
    const completionRisk = (100 - prep.tracks.Alegorias.progress) * 1.5;

    // 1. Float Breakdown
    if (completionRisk > 20 || (prep.tracks.Alegorias.quality < 60 && Math.random() < 0.3)) {
        if (Math.random() < 0.4) {
            incidents.push({
                id: `inc-float-${Date.now()}`,
                type: 'FloatBreakdown',
                segmentIndex: Math.random() > 0.5 ? 3 : 9,
                resolved: false,
                narrativeText: incidentNarratives['FloatBreakdown'][0].description,
                quitoImpact: { AlegoriasAderecos: -15, Evolucao: -10 }
            });
        }
    }

    // 2. Bateria Falter (Using energy/form logic)
    const batForm = prep.bateria.form;
    const batEnergy = prep.bateria.energy;
    if (batEnergy < 20 || batForm < 60) {
        if (Math.random() < 0.3) {
            incidents.push({
                id: `inc-bat-${Date.now()}`,
                type: 'BateriaFalter',
                segmentIndex: 2,
                resolved: false,
                narrativeText: incidentNarratives['BateriaFalter'][0].description,
                quitoImpact: { Bateria: -12, Harmonia: -8 }
            });
        }
    }

    // ... (Keep other incident logic similar, adapted to new fields if necessary)

    return incidents.slice(0, 3).sort((a, b) => a.segmentIndex - b.segmentIndex);
}

// Division weight modifiers for quesito quality computation
const DIVISION_QUESITO_WEIGHTS: Record<Division, Partial<Record<Quesito, number>>> = {
  'Grupo Especial': {
    AlegoriasAderecos: 1.3, Fantasia: 1.0, Bateria: 1.2,
    MestreSalaPortaBandeira: 0.9, Evolucao: 0.9,
  },
  'Série Ouro': {
    AlegoriasAderecos: 1.0, Fantasia: 1.1, Bateria: 1.2,
    MestreSalaPortaBandeira: 1.1, Evolucao: 1.1,
  },
  'Série Prata': {
    AlegoriasAderecos: 0.8, Fantasia: 1.2, Bateria: 1.0,
    MestreSalaPortaBandeira: 1.3, Evolucao: 1.2,
  },
  'Série Bronze': {
    AlegoriasAderecos: 0.6, Fantasia: 1.3, Bateria: 0.9,
    MestreSalaPortaBandeira: 1.4, Evolucao: 1.3,
  },
  'Grupo de Avaliação': {
    AlegoriasAderecos: 0.5, Fantasia: 1.2, Bateria: 0.8,
    MestreSalaPortaBandeira: 1.5, Evolucao: 1.4,
  },
};

export function calculateQuitoQualityIndexes(school: School, incidents: ParadeIncident[]): Record<Quesito, number> {
    const indexes: Record<Quesito, number> = {
        Bateria: 50,
        SambaEnredo: 50,
        Harmonia: 50,
        Evolucao: 50,
        Enredo: 50,
        AlegoriasAderecos: 50,
        Fantasia: 50,
        ComissaoDeFrente: 50,
        MestreSalaPortaBandeira: 50
    };

    // Helper to get skill (1-200) -> 0-100
    const getSkill = (role: string, attr: keyof StaffMember['skills']) => {
        const s = school.staff.find(st => st.role === role);
        return s ? s.skills[attr] / 2 : 50;
    };

    if (school.preparation) {
        const p = school.preparation;

        // 1. Bateria (Use new PP-driven form)
        let batBase = p.bateria.form;
        const mestreSkill = (getSkill('MestreDeBateria', 'ritmica') + getSkill('MestreDeBateria', 'lideranca')) / 2;
        indexes.Bateria = batBase * 0.7 + mestreSkill * 0.3;

        // 2. Samba-Enredo
        const interprete = (getSkill('Interprete', 'expressaoCorporal') + getSkill('Interprete', 'resiliencia')) / 2;
        let sambaStats = 70;
        if (school.sambaEnredo) {
            const s = school.sambaEnredo;
            sambaStats = (s.melodia + s.grito + s.emocao + s.ritmo) / 4;
        }
        indexes.SambaEnredo = sambaStats * 0.5 + interprete * 0.3 + (batBase * 0.2);

        // 3. Harmonia
        const harmoniaTrack = p.tracks.Harmonia.quality;
        const diretorHarm = getSkill('DiretorDeHarmonia', 'logistica');
        // Penalty if incomplete
        const incompletion = Math.max(0, 100 - p.tracks.Harmonia.progress);
        indexes.Harmonia = harmoniaTrack * 0.6 + diretorHarm * 0.2 - (incompletion * 0.5);

        // 4. Evolucao
        const avgTrackProgress = Object.values(p.tracks).reduce((s, t) => s + t.progress, 0) / 4;
        const crowd = school.fanbaseMorale;
        let evolucaoBase = avgTrackProgress * 0.5 + crowd * 0.2 + 20;

        if (school.preparation.passistas) {
          const passistasBonus = (school.preparation.passistas.form / 100) * 15;
          evolucaoBase = Math.min(100, evolucaoBase + passistasBonus);
        }
        indexes.Evolucao = evolucaoBase;

        // 5. Enredo
        let enredoPot = school.enredo ? school.enredo.potentialScore : 70;
        const carnavalesco = getSkill('Carnavalesco', 'criatividade');
        const diff = school.enredo ? school.enredo.difficulty : 50;
        const diffPenalty = Math.max(0, diff - carnavalesco);
        indexes.Enredo = enredoPot * 0.6 + carnavalesco * 0.4 - (diffPenalty * 0.2);

        // 6. Alegorias
        const alegTrack = p.tracks.Alegorias.quality;
        const barracao = getSkill('MestreDeBarracao', 'gestaoDeRecursos');
        // Progress Penalty
        const alegInc = Math.max(0, 100 - p.tracks.Alegorias.progress);
        indexes.AlegoriasAderecos = alegTrack * 0.7 + barracao * 0.3 - (alegInc * 0.8);

        // 7. Fantasia
        const fantTrack = p.tracks.Fantasias.quality;
        indexes.Fantasia = fantTrack * 0.6 + carnavalesco * 0.4;
        if (p.tracks.Fantasias.progress < 100) indexes.Fantasia -= 15;

        // 8. Comissao de Frente
        const coreografo = (getSkill('Coreografo', 'criatividade') + getSkill('Coreografo', 'expressaoCorporal')) / 2;
        const comissaoQuality = p.comissaoDeFrente.quality > 0 ? p.comissaoDeFrente.quality : p.tracks.Harmonia.quality;
        indexes.ComissaoDeFrente = comissaoQuality * 0.5 + coreografo * 0.5;

        // 9. MSPB
        const ms = (getSkill('MestreSala', 'plastica') + getSkill('MestreSala', 'expressaoCorporal')) / 2;
        const pb = (getSkill('PortaBandeira', 'plastica') + getSkill('PortaBandeira', 'expressaoCorporal')) / 2;
        let mspbBase = (ms + pb) / 2;

        if (school.preparation.mspb) {
          const mspbBonus = (school.preparation.mspb.preparacao / 100) * 20;
          mspbBase += mspbBonus;
        }
        indexes.MestreSalaPortaBandeira = mspbBase;

    } else {
        // AI Synthetic Logic
        const prestigeBase = 60 + (school.prestige / 200) * 35; // 60-95 range
        const variance = (Math.random() - 0.5) * 20;

        for (const q of Object.keys(indexes) as Quesito[]) {
            indexes[q] = prestigeBase + variance + (Math.random() - 0.3) * 10;
            indexes[q] = Math.max(45, Math.min(100, indexes[q]));
        }
    }

    // Apply Incident Impacts
    incidents.forEach(inc => {
        if (inc.quitoImpact) {
            Object.entries(inc.quitoImpact).forEach(([q, mod]) => {
                if (mod && indexes[q as Quesito]) {
                    indexes[q as Quesito] += mod;
                }
            });
        }
    });

    // Apply Division Weights
    const weights = DIVISION_QUESITO_WEIGHTS[school.currentDivision] ?? {};
    Object.keys(indexes).forEach(q => {
      const quesito = q as Quesito;
      indexes[quesito] = Math.min(100, indexes[quesito] * (weights[quesito] ?? 1.0));
    });

    // Clamp all to 0-100
    for (const q in indexes) {
        indexes[q as Quesito] = Math.max(0, Math.min(100, indexes[q as Quesito]));
    }

    return indexes;
}


export function runDesfile(school: School): DesfileResult {
    const segments = generateParadeSegments(school);
    const incidents = generateIncidents(school);

    // Calculate initial crowd momentum based on fanbase morale and start
    const overallCrowdMomentum = school.fanbaseMorale;

    const quitoQualityIndexes = calculateQuitoQualityIndexes(school, incidents);

    return {
        segments,
        incidents,
        overallCrowdMomentum,
        quitoQualityIndexes
    };
}
