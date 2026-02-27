const fs = require('fs');

const path = 'src/services/preparationService.ts';
let code = fs.readFileSync(path, 'utf8');

const crisisRegex = /const CRISIS_POOL: any\[\] = \[\s*\/\/\s*Mock implementation for structure\s*\{\s*tier: 'Urgente',\s*domain: 'Production',\s*title: 'Teste',\s*description: 'Teste',\s*inactionConsequence: 'Nada',\s*inactionEffectCodes: \['NONE'\],\s*expiresInWeeks: 1,\s*options: \[\s*\{\s*label: 'Opcao 1', description: 'desc', budgetCost: 0, ppCost: 1, staffRequired: null, effectCodes: \['NONE'\] \}\s*\]\s*\}\s*\];/g;

const oldPrepStr = fs.readFileSync('/tmp/old_preparationService.ts', 'utf8');

// We need to extract the original CRISIS_POOL and map attentionCost to ppCost
let oldCrisisMatch = oldPrepStr.match(/const CRISIS_POOL:.*?\[([\s\S]*?)\n\];/);

let newCrisis = '';
if (oldCrisisMatch) {
  newCrisis = `const CRISIS_POOL: any[] = [\n${oldCrisisMatch[1]}\n];`;
  // Replace attentionCost with ppCost
  newCrisis = newCrisis.replace(/attentionCost:\s*(\d+)/g, (match, p1) => `ppCost: ${p1}`);
} else {
  console.log("Could not find old CRISIS_POOL");
}

code = code.replace(crisisRegex, newCrisis);

// Now for cards
const oldCards = `export function generateProductionCards(school: School, enredoEffects: EnredoProductionEffects): ProductionCard[] {
  const cards: ProductionCard[] = [];
  const divisionScale = computeMoneyPerPP(school.currentDivision) / 8000;

  cards.push({
      id: 'mutirao-barracao', label: 'Mutirão no Barracão', description: 'A comunidade se mobiliza. PP em Alegorias rendem 1.5x qualidade esta semana.',
      budgetCost: 10000 * divisionScale, effects: [{ type: 'MULTIPLY_QUALITY', target: 'Alegorias', value: 1.5 }],
      usesPerSeason: 3, usesRemaining: 3, availableFromWeek: 12, availableUntilWeek: 38, unlockedBy: 'always'
  });

  if (school.enredo.category === 'AfroBrasileiro' || school.enredo.category === 'ComunitarioLocal') {
      cards.push({
          id: 'conexao-raiz', label: 'Conexão com a Raiz', description: 'O enredo ressoa com a comunidade. PP em Harmonia valem 2x qualidade.',
          budgetCost: 3000 * divisionScale, effects: [{ type: 'MULTIPLY_QUALITY', target: 'Harmonia', value: 2.0 }],
          usesPerSeason: 2, usesRemaining: 2, availableFromWeek: 9, availableUntilWeek: 44, unlockedBy: 'enredo_afrobrasileiro_or_comunitario'
      });
  }

  const carnavalesco = school.staff.find(s => s.role === 'Carnavalesco');
  if (carnavalesco && carnavalesco.skills.criatividade >= 150) {
      cards.push({
          id: 'inspiracao-carnavalesco', label: 'Golpe de Gênio', description: 'O Carnavalesco tem uma epifania. +20 qualidade em um track à escolha.',
          budgetCost: 0, effects: [{ type: 'MULTIPLY_QUALITY', target: undefined, value: 999 }],
          usesPerSeason: 1, usesRemaining: 1, availableFromWeek: 9, availableUntilWeek: 40, unlockedBy: 'carnavalesco_criatividade_150'
      });
  }

  cards.push({
      id: 'feijoada-beneficente', label: 'Feijoada Beneficente', description: '+3 PP este turno. Bateria gasta 5 energia extra (festa).',
      budgetCost: 5000 * divisionScale, effects: [{ type: 'GENERATE_PP', value: 3 }, { type: 'special:BATERIA_ENERGY_DOWN', value: 5 }],
      usesPerSeason: 4, usesRemaining: 4, availableFromWeek: 9, availableUntilWeek: 40, unlockedBy: 'always'
  });

  cards.push({
      id: 'hora-extra-barracao', label: 'Hora Extra no Barracão', description: '+2 PP. Mestre de Barracão stress +10.',
      budgetCost: 8000 * divisionScale, effects: [{ type: 'GENERATE_PP', value: 2 }],
      usesPerSeason: -1, usesRemaining: -1, availableFromWeek: 9, availableUntilWeek: 44, unlockedBy: 'always'
  });

  if (school.archetype === 'Guerreira') {
      cards.push({
          id: 'gambiarra-criativa', label: 'Gambiarra Criativa', description: 'Fantasias não exigem PP mínimo esta semana. Qualidade cap em 70.',
          budgetCost: 2000 * divisionScale, effects: [{ type: 'BYPASS_MINIMUM', target: 'Fantasias', value: 0 }],
          usesPerSeason: 3, usesRemaining: 3, availableFromWeek: 20, availableUntilWeek: 44, unlockedBy: 'archetype_guerreira'
      });
  }

  cards.push({
      id: 'virada-barracao', label: 'Virada no Barracão', description: 'Alegorias ganha +15% progresso. Se qualidade < 60, perde 5 qualidade.',
      budgetCost: 12000 * divisionScale, effects: [{ type: 'RUSH', target: 'Alegorias', value: 15, qualityThreshold: 60, riskPenalty: 5 }],
      usesPerSeason: 2, usesRemaining: 2, availableFromWeek: 25, availableUntilWeek: 42, unlockedBy: 'always'
  });

  cards.push({
      id: 'retiro-carnavalesco', label: 'Retiro Criativo', description: 'Carnavalesco descansa. Stress -20, mas Alegorias perde -1 qualidade.',
      budgetCost: 3000 * divisionScale, effects: [{ type: 'REDUCE_STRESS', staffRole: 'Carnavalesco', value: 20 }],
      usesPerSeason: 2, usesRemaining: 2, availableFromWeek: 9, availableUntilWeek: 38, unlockedBy: 'always'
  });

  cards.push({
      id: 'ensaio-show', label: 'Ensaio Show na Quadra', description: 'Moral +10. Bateria forma +3, energia -8.',
      budgetCost: 6000 * divisionScale, effects: [{ type: 'MORALE_BOOST', value: 10 }],
      usesPerSeason: 3, usesRemaining: 3, availableFromWeek: 15, availableUntilWeek: 42, unlockedBy: 'always'
  });

  if (school.enredo.category === 'Patrocinado') {
      cards.push({
          id: 'patrocinio-pontual', label: 'Patrocínio Pontual', description: 'Custo por PP reduzido em 40% esta semana.',
          budgetCost: 0, effects: [{ type: 'MONEY_SAVE', value: 0.4 }],
          usesPerSeason: 1, usesRemaining: 1, availableFromWeek: 9, availableUntilWeek: 44, unlockedBy: 'enredo_patrocinado'
      });
  }

  if (school.enredo.controversy > 50) {
      cards.push({
          id: 'transformar-polemica', label: 'Transformar Polêmica em Arte', description: 'Harmonia +8 qualidade. Só disponível se controversy > 50.',
          budgetCost: 0, effects: [{ type: 'MULTIPLY_QUALITY', target: 'Harmonia', value: 1.8 }],
          usesPerSeason: 2, usesRemaining: 2, availableFromWeek: 20, availableUntilWeek: 44, unlockedBy: 'enredo_controversy_50'
      });
  }

  if (school.enredo.difficulty >= 65) {
      cards.push({
          id: 'simplificar-conceito', label: 'Simplificar o Conceito', description: 'Reduz penalidade de difficulty em 50% permanentemente. Teto de nota -3.',
          budgetCost: 0, effects: [], // Special effect
          usesPerSeason: 1, usesRemaining: 1, availableFromWeek: 9, availableUntilWeek: 30, unlockedBy: 'enredo_difficulty_65'
      });
  }

  return cards;
}`;

const cardRegex = /export function generateProductionCards.*?\n\}/s;
code = code.replace(cardRegex, oldCards);


// And finally the Event Resolver
const oldResolverMatch = oldPrepStr.match(/export function resolveEventEffect[\s\S]*?\n\}/);
const resolverRegex = /export function resolveEventEffect.*?\n\}/s;

if (oldResolverMatch) {
  let resolverText = oldResolverMatch[0];
  // Remove reference to updates.budget missing? It expects updates.budget etc.
  // Wait, let's keep the user's old logic and adapt.
  code = code.replace(resolverRegex, resolverText);
}


fs.writeFileSync(path, code);
