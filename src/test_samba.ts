import { generateSambaSelectionProcess } from './services/sambaEnredoEngine';
import { School, Enredo } from './types/models';

const mockEnredo: Enredo = {
    id: 'e1',
    title: 'Test Enredo',
    category: 'AfroBrasileiro',
    complexity: 50,
    difficulty: 50,
    potentialScore: 100,
    controversy: 20,
    appeal: 80,
    sponsorValue: 0,
    trend: 'Rising',
    statsRevealed: 5,
    researchProgress: 0
};

const mockSchool: School = {
    id: 's1',
    name: 'Test School',
    colors: ['#000', '#fff'],
    budget: 1000000,
    fanbaseMorale: 100,
    staff: [
        {
            id: 'st1', name: 'Singer', role: 'Interprete', salary: 100, skills: {
                plastica: 100, ritmica: 100, expressaoCorporal: 150, lideranca: 100, criatividade: 100, resiliencia: 100, logistica: 100, gestaoDeRecursos: 100, fama: 150
            }, contractYears: 1, currentSchoolId: 's1', salaryExpectation: 100, reputation: 150, age: 30
        } as any
    ],
    isPlayerControlled: true,
    prestige: 100,
    currentDivision: 'Grupo Especial',
    proLevel: 'Professional',
    anos_no_especial: 10,
    anos_em_acesso: 0,
    history: { totalTitles: 0, totalRunnerUps: 0, titulos: [], vices: [], terceiros: [], quartos: [], quintos: [] },
    enredo: mockEnredo,
    preparation: null, archetype: "Potencia", neighborhoodType: "ZonaNortePeriferica", fanbaisPersonality: "Exigente", uniqueBonus: null
};

console.log("Generating Samba Selection Process...");
const sambaProcess = generateSambaSelectionProcess(mockEnredo, mockSchool);

console.log(`Generated ${sambaProcess.candidates.length} candidates.`);
sambaProcess.candidates.forEach((c, i) => {
    console.log(`Candidate ${i+1}: ${c.title} (Encomendado: ${c.isEncomendado})`);
    console.log(`  Visible Stats: Melodia=${c.melodia}, Grito=${c.grito}, Apelo=${c.apeloComunidade}`);
    console.log(`  Hidden Stats: Letra=${c.letra}, Ritmo=${c.ritmo}`);
});

if (sambaProcess.candidates.length !== 3) {
    console.error("FAIL: Expected 3 candidates.");
    throw new Error("FAIL");
}

console.log("SUCCESS: Samba Engine works.");
