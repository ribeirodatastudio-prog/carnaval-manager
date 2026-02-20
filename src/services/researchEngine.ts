
import { Enredo, EnredoCategory } from '../types/models';

/**
 * Categories for Enredos.
 */
const CATEGORIES: EnredoCategory[] = ['History', 'Culture', 'Abstract', 'Political', 'Religious'];

/**
 * Generates a title based on the category.
 * In a real game, this could use a more complex generator or AI.
 */
const generateTitle = (category: EnredoCategory): string => {
  const prefixes = ['O Canto da', 'A Saga de', 'Mistérios da', 'Luz de', 'Caminhos da', 'Vozes da'];
  const suffixes: Record<EnredoCategory, string[]> = {
    History: ['Revolução', 'Coroa', 'Liberdade', 'Terra', 'Ancestralidade'],
    Culture: ['Arte', 'Dança', 'Festa', 'Alma', 'Brasilidade'],
    Abstract: ['Imaginação', 'Essência', 'Vida', 'Eternidade', 'Sonho'],
    Political: ['Luta', 'Esperança', 'Justiça', 'Igualdade', 'Pátria'],
    Religious: ['Fé', 'Devoção', 'Oração', 'Divindade', 'Criação'],
  };

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffixList = suffixes[category];
  const suffix = suffixList[Math.floor(Math.random() * suffixList.length)];

  return `${prefix} ${suffix}`;
};

/**
 * Researches and generates a new Enredo based on the Carnavalesco's skill and invested budget.
 *
 * Logic:
 * - Budget increases the floor of the potential score (resources for research).
 * - Skill increases the ceiling and consistency.
 * - Complexity is correlated with Potential Score but has variance.
 *
 * @param carnavalescoSkill The skill level of the Carnavalesco (1-200).
 * @param budgetInvested The amount of money invested in research.
 * @returns A newly generated Enredo object.
 */
export const researchEnredo = (carnavalescoSkill: number, budgetInvested: number): Enredo => {
  // 1. Determine Category
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  // 2. Calculate Potential Score
  // Base score from 50 to 70
  const baseScore = 50 + Math.random() * 20;

  // Budget Bonus: Up to 15 points (Max out at 500k invested)
  const budgetBonus = Math.min(budgetInvested / 33000, 15);

  // Skill Bonus: Up to 20 points (Max out at 200 skill)
  const skillBonus = (carnavalescoSkill / 200) * 20;

  // RNG Factor: +/- 5 points
  const rngFactor = (Math.random() * 10) - 5;

  let potentialScore = Math.floor(baseScore + budgetBonus + skillBonus + rngFactor);
  potentialScore = Math.max(50, Math.min(100, potentialScore));

  // 3. Calculate Complexity
  // Generally, higher potential themes are more complex.
  // Complexity = Potential Score * (0.8 to 1.2)
  const complexityMultiplier = 0.8 + (Math.random() * 0.4);
  let complexity = Math.floor(potentialScore * complexityMultiplier);

  // High skill Carnavalescos might find ways to simplify complex themes slightly (optimization)
  if (carnavalescoSkill > 150) {
    complexity -= Math.floor((carnavalescoSkill - 150) / 10); // Reduce complexity by up to 5 points
  }

  // Ensure complexity is within bounds
  complexity = Math.max(10, Math.min(100, complexity));

  return {
    id: `enredo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: generateTitle(category),
    category,
    complexity,
    potentialScore,
  };
};
