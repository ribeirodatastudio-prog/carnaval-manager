
import { StaffRole } from '../types/models';

/**
 * Formats a StaffRole string into a human-readable title.
 * Handles CamelCase and Portuguese prepositions correctly.
 *
 * Example: 'MestreDeBateria' -> 'Mestre de Bateria'
 */
export const formatRole = (role: StaffRole): string => {
  switch (role) {
    case 'DiretorDeCarnaval':
      return 'Diretor de Carnaval';
    case 'MestreDeBateria':
      return 'Mestre de Bateria';
    case 'RainhaDeBateria':
      return 'Rainha de Bateria';
    case 'DiretorDeHarmonia':
      return 'Diretor de Harmonia';
    case 'MestreDeBarracao':
      return 'Mestre de Barracão';
    case 'MestreSala':
      return 'Mestre Sala';
    case 'PortaBandeira':
      return 'Porta Bandeira';
    case 'Carnavalesco':
      return 'Carnavalesco';
    case 'Interprete':
      return 'Intérprete'; // Add accent
    case 'Coreografo':
      return 'Coreógrafo'; // Add accent
    default:
      // Fallback for any unknown roles or if they are already formatted
      return role.replace(/([A-Z])/g, ' $1').trim();
  }
};

export const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
};
