import {
  School,
  DesfileResult,
  ParadeSegment,
  ParadeIncident,
  ParadeSegmentType,
  IncidentType,
  Quesito,
  ProductionTrack,
  StaffMember
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
      trackQuality = 50 + (school.prestige / 200) * 40 + (Math.random() * 10);
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

    // 1. Float Breakdown
    // Condition: finishingRisk > 60
    if (prep.tracks.Alegorias.finishingRisk > 60 || (prep.tracks.Alegorias.progress < 100 && Math.random() < 0.3)) {
        if (Math.random() < 0.4) { // 40% chance if risky
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

    // 2. Bateria Falter
    // Condition: form > 95 (burnout) or form < 60 (unprepared)
    if (prep.bateria.form > 95 || prep.bateria.form < 60) {
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

    // 3. Wing Gap
    if (prep.tracks.Harmonia.progress < 90 || prep.tracks.Fantasias.progress < 90) {
        if (Math.random() < 0.25) {
             incidents.push({
                id: `inc-wing-${Date.now()}`,
                type: 'WingGap',
                segmentIndex: Math.random() > 0.5 ? 4 : 7,
                resolved: false,
                narrativeText: incidentNarratives['WingGap'][0].description,
                quitoImpact: { Evolucao: -10, Harmonia: -5 }
            });
        }
    }

    // 4. Interprete Crack
    const interprete = school.staff.find(s => s.role === 'Interprete');
    if (interprete && (interprete.skills.resiliencia < 100 || Math.random() < 0.05)) { // Low resilience or bad luck
         if (Math.random() < 0.15) {
             incidents.push({
                id: `inc-vox-${Date.now()}`,
                type: 'InterpreteCrack',
                segmentIndex: 8,
                resolved: false,
                narrativeText: incidentNarratives['InterpreteCrack'][0].description,
                quitoImpact: { SambaEnredo: -15, Harmonia: -5 }
            });
         }
    }

    // 5. Flag Dropped (Rare, devastating)
    const pb = school.staff.find(s => s.role === 'PortaBandeira');
    if (pb && ((pb.skills.expressaoCorporal + pb.skills.plastica) / 2 < 140)) {
         if (Math.random() < 0.05) { // 5% chance for weak PB
             incidents.push({
                id: `inc-flag-${Date.now()}`,
                type: 'FlagDropped',
                segmentIndex: 6,
                resolved: false,
                narrativeText: incidentNarratives['FlagDropped'][0].description,
                quitoImpact: { MestreSalaPortaBandeira: -30 } // Massive penalty
            });
         }
    }

    // 6. Rainha Fall
    const rainha = school.staff.find(s => s.role === 'RainhaDeBateria');
    if (rainha && rainha.skills.plastica < 140) {
        if (Math.random() < 0.1) {
             incidents.push({
                id: `inc-queen-${Date.now()}`,
                type: 'RainhaFall',
                segmentIndex: 2,
                resolved: false,
                narrativeText: incidentNarratives['RainhaFall'][0].description,
                quitoImpact: { Bateria: -5, Evolucao: -5 } // Minor impact
            });
        }
    }

    // 7. Unexpected Brilhance (Good event)
    // Condition: High quality tracks
    if (prep.tracks.Alegorias.quality > 85 && prep.tracks.Fantasias.quality > 85 && prep.bateria.form >= 75 && prep.bateria.form <= 95) {
        if (Math.random() < 0.2) {
             incidents.push({
                id: `inc-shine-${Date.now()}`,
                type: 'UnexpectedBrilhance',
                segmentIndex: Math.random() > 0.5 ? 7 : 8,
                resolved: false,
                narrativeText: incidentNarratives['UnexpectedBrilhance'][0].description,
                quitoImpact: { Evolucao: 8, Harmonia: 8 }
            });
        }
    }

    // Limit to 2-3 incidents max to avoid chaos
    return incidents.slice(0, 3).sort((a, b) => a.segmentIndex - b.segmentIndex);
}

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

    // Helper to get full average skill (0-100)
    const getAvgSkill = (role: string) => {
        const s = school.staff.find(st => st.role === role);
        return s ? avgStaffSkill(s) / 2 : 50;
    };

    if (school.preparation) {
        const p = school.preparation;

        // 1. Bateria
        // Base: Form (optimal 75-95)
        let batBase = 0;
        if (p.bateria.form >= 75 && p.bateria.form <= 95) batBase = 95;
        else if (p.bateria.form > 95) batBase = 80; // Burnout
        else batBase = 60 + (p.bateria.form / 75) * 30; // 60-90 ramping up

        const mestreSkill = (getSkill('MestreDeBateria', 'ritmica') + getSkill('MestreDeBateria', 'lideranca')) / 2;
        indexes.Bateria = batBase * 0.6 + mestreSkill * 0.4;

        // 2. Samba-Enredo
        const interprete = (getSkill('Interprete', 'expressaoCorporal') + getSkill('Interprete', 'resiliencia')) / 2;
        let sambaStats = 70;
        if (school.sambaEnredo) {
            const s = school.sambaEnredo;
            sambaStats = (s.melodia + s.grito + s.emocao + s.ritmo) / 4;
        }
        indexes.SambaEnredo = sambaStats * 0.5 + interprete * 0.3 + (batBase * 0.2);

        // 3. Harmonia
        // Logistica helps ensure components are there. Quality helps them sing.
        const harmoniaTrack = p.tracks.Harmonia.quality;
        const diretorHarm = getSkill('DiretorDeHarmonia', 'logistica');
        indexes.Harmonia = harmoniaTrack * 0.5 + diretorHarm * 0.3 + (p.tracks.Harmonia.progress >= 100 ? 10 : -10);

        // 4. Evolucao
        // Hard to simulate perfectly without spatial logic, so we use averages
        const avgTrackProgress = Object.values(p.tracks).reduce((s, t) => s + t.progress, 0) / 4;
        const crowd = school.fanbaseMorale; // Morale helps evolution (energy)
        indexes.Evolucao = avgTrackProgress * 0.6 + crowd * 0.2 + 20; // Base 20

        // 5. Enredo
        let enredoPot = school.enredo ? school.enredo.potentialScore : 70;
        const carnavalesco = getSkill('Carnavalesco', 'criatividade');
        // Difficulty Penalty: if difficulty > carnavalesco skill, penalty
        const diff = school.enredo ? school.enredo.difficulty : 50;
        const diffPenalty = Math.max(0, diff - carnavalesco);
        indexes.Enredo = enredoPot * 0.6 + carnavalesco * 0.4 - (diffPenalty * 0.2);

        // 6. Alegorias
        const alegTrack = p.tracks.Alegorias.quality;
        const barracao = getSkill('MestreDeBarracao', 'gestaoDeRecursos');
        // Finishing risk penalty
        const riskPenalty = p.tracks.Alegorias.finishingRisk > 50 ? (p.tracks.Alegorias.finishingRisk - 50) * 0.5 : 0;
        indexes.AlegoriasAderecos = alegTrack * 0.6 + barracao * 0.4 - riskPenalty;

        // 7. Fantasia
        const fantTrack = p.tracks.Fantasias.quality;
        // Carnavalesco creativity matters here too
        indexes.Fantasia = fantTrack * 0.6 + carnavalesco * 0.4;
        if (p.tracks.Fantasias.progress < 100) indexes.Fantasia -= 15;

        // 8. Comissao de Frente
        const coreografo = (getSkill('Coreografo', 'criatividade') + getSkill('Coreografo', 'expressaoCorporal')) / 2;
        const comissaoTrack = p.tracks.Harmonia.quality; // Uses Harmonia budget usually
        indexes.ComissaoDeFrente = comissaoTrack * 0.4 + coreografo * 0.6;

        // 9. MSPB
        const ms = (getSkill('MestreSala', 'plastica') + getSkill('MestreSala', 'expressaoCorporal')) / 2;
        const pb = (getSkill('PortaBandeira', 'plastica') + getSkill('PortaBandeira', 'expressaoCorporal')) / 2;
        // Synergy? We don't have explicit synergy field on staff yet, using random or average
        const synergy = 80;
        indexes.MestreSalaPortaBandeira = (ms + pb + synergy) / 3;

    } else {
        // AI Synthetic Logic
        // Base on Prestige (40-70) + Random
        const prestigeBase = 50 + (school.prestige / 200) * 40;

        for (const q of Object.keys(indexes) as Quesito[]) {
            indexes[q] = prestigeBase + (Math.random() - 0.5) * 15;
            // Clamp
            indexes[q] = Math.max(50, Math.min(100, indexes[q]));
        }
    }

    // Apply Incident Impacts
    incidents.forEach(inc => {
        if (inc.quitoImpact) {
            Object.entries(inc.quitoImpact).forEach(([q, mod]) => {
                if (mod && indexes[q as Quesito]) {
                    // Check if player intervened to mitigate?
                    // The prompt says "quitoImpact: modifier...".
                    // `resolveDesfileIncident` should probably adjust this value based on choice.
                    // But here we just apply what's in the incident object.
                    // The incident object in `incidents` array passed here should already have the FINAL impact values.
                    indexes[q as Quesito] += mod;
                }
            });
        }
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
