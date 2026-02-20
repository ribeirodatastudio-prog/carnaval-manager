
import { StaffRole, StaffSkills } from '../types/models';

/**
 * Converts the internal skill value (1-200) to a display value (1-20).
 *
 * Logic:
 * - Returns 1 for values 1-19.
 * - Returns Math.floor(value / 10) for values >= 20.
 * - Caps at 20 (so 200 returns 20).
 *
 * @param internalSkill - The internal skill level (1-200).
 * @returns The display skill level (1-20).
 */
export const getDisplaySkill = (internalSkill: number): number => {
  if (internalSkill < 20) {
    return 1;
  }
  const displaySkill = Math.floor(internalSkill / 10);
  return Math.min(displaySkill, 20);
};

export const getKeySkills = (role: StaffRole, skills: StaffSkills): { name: string; value: number }[] => {
  const allSkills: Record<string, number> = {
    'Plástica': skills.plastica,
    'Rítmica': skills.ritmica,
    'Expressão': skills.expressaoCorporal,
    'Liderança': skills.lideranca,
    'Criatividade': skills.criatividade,
    'Resiliência': skills.resiliencia,
    'Logística': skills.logistica,
    'Gestão': skills.gestaoDeRecursos,
    'Fama': skills.fama,
  };

  const selectSkills = (keys: (keyof typeof allSkills)[]) => keys.map(k => ({ name: k, value: getDisplaySkill(allSkills[k]) }));

  switch (role) {
    case 'Carnavalesco':
      return selectSkills(['Criatividade', 'Plástica', 'Resiliência']);
    case 'MestreDeBateria':
      return selectSkills(['Rítmica', 'Liderança']);
    case 'Interprete':
      return selectSkills(['Rítmica', 'Expressão', 'Fama']);
    case 'MestreSala':
    case 'PortaBandeira':
      return selectSkills(['Expressão', 'Plástica', 'Rítmica']);
    case 'RainhaDeBateria':
      return selectSkills(['Fama', 'Expressão']);
    case 'Coreografo':
      return selectSkills(['Expressão', 'Criatividade']);
    case 'DiretorDeCarnaval':
      return selectSkills(['Gestão', 'Liderança', 'Logística']);
    case 'DiretorDeHarmonia':
      return selectSkills(['Liderança', 'Rítmica']);
    case 'MestreDeBarracao':
      return selectSkills(['Logística', 'Gestão']);
    default:
      return selectSkills(['Liderança']);
  }
};
