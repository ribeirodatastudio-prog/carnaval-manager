
import { School } from '../types/models';

/**
 * Initial seed data for the Special Group schools.
 * This represents the starting state of the league with 12 schools.
 * Currently using generic names as placeholders.
 *
 * Prestige Tiers (approximate):
 * 180-200: Historical - Legendary status, household names.
 * 160-179: Elite - Consistent top contenders.
 * 140-159: Traditional - Strong history, but maybe fluctuating recently.
 * 120-139: Established - Solid fixture in the Special Group.
 * 100-119: Rising - Improving, aiming for the top.
 * 80-99: Aspiring/Average - Fighting to stay in the group or break through.
 */

export const INITIAL_SCHOOLS: School[] = [
  {
    id: 'school-1',
    name: 'Grêmio Recreativo Escola de Samba A',
    colors: ['#FF0000', '#FFFFFF'], // Red and White
    budget: 5000000,
    fanbaseMorale: 85,
    staff: [],
    isPlayerControlled: false,
    prestige: 175,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Elite
    enredo: null,
  },
  {
    id: 'school-2',
    name: 'Grêmio Recreativo Escola de Samba B',
    colors: ['#0000FF', '#FFFFFF'], // Blue and White
    budget: 4500000,
    fanbaseMorale: 75,
    staff: [],
    isPlayerControlled: false,
    prestige: 150,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Traditional
    enredo: null,
  },
  {
    id: 'school-3',
    name: 'Grêmio Recreativo Escola de Samba C',
    colors: ['#00FF00', '#FFFFFF', '#FFC0CB'], // Green, White, and Pink
    budget: 6000000,
    fanbaseMorale: 90,
    staff: [],
    isPlayerControlled: false,
    prestige: 195,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Historical
    enredo: null,
  },
  {
    id: 'school-4',
    name: 'Grêmio Recreativo Escola de Samba D',
    colors: ['#FFFF00', '#000000'], // Yellow and Black
    budget: 3500000,
    fanbaseMorale: 60,
    staff: [],
    isPlayerControlled: false,
    prestige: 120,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Established
    enredo: null,
  },
  {
    id: 'school-5',
    name: 'Grêmio Recreativo Escola de Samba E',
    colors: ['#800080', '#FFFFFF'], // Purple and White
    budget: 5500000,
    fanbaseMorale: 82,
    staff: [],
    isPlayerControlled: false,
    prestige: 170,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Elite
    enredo: null,
  },
  {
    id: 'school-6',
    name: 'Grêmio Recreativo Escola de Samba F',
    colors: ['#FFA500', '#000000'], // Orange and Black
    budget: 4000000,
    fanbaseMorale: 65,
    staff: [],
    isPlayerControlled: false,
    prestige: 130,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Established
    enredo: null,
  },
  {
    id: 'school-7',
    name: 'Grêmio Recreativo Escola de Samba G',
    colors: ['#FF0000', '#000000'], // Red and Black
    budget: 7000000,
    fanbaseMorale: 95,
    staff: [],
    isPlayerControlled: false,
    prestige: 198,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Historical
    enredo: null,
  },
  {
    id: 'school-8',
    name: 'Grêmio Recreativo Escola de Samba H',
    colors: ['#0000FF', '#FFFF00'], // Blue and Yellow
    budget: 3000000,
    fanbaseMorale: 55,
    staff: [],
    isPlayerControlled: false,
    prestige: 110,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Rising
    enredo: null,
  },
  {
    id: 'school-9',
    name: 'Grêmio Recreativo Escola de Samba I',
    colors: ['#008000', '#FFFF00'], // Green and Yellow
    budget: 4800000,
    fanbaseMorale: 78,
    staff: [],
    isPlayerControlled: false,
    prestige: 165,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Elite
    enredo: null,
  },
  {
    id: 'school-10',
    name: 'Grêmio Recreativo Escola de Samba J',
    colors: ['#A52A2A', '#FFFFFF'], // Brown and White
    budget: 3800000,
    fanbaseMorale: 70,
    staff: [],
    isPlayerControlled: false,
    prestige: 140,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Traditional
    enredo: null,
  },
  {
    id: 'school-11',
    name: 'Grêmio Recreativo Escola de Samba K',
    colors: ['#4B0082', '#FFD700'], // Indigo and Gold
    budget: 6500000,
    fanbaseMorale: 88,
    staff: [],
    isPlayerControlled: false,
    prestige: 185,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Historical
    enredo: null,
  },
  {
    id: 'school-12',
    name: 'Grêmio Recreativo Escola de Samba L',
    colors: ['#FF1493', '#00FFFF'], // Deep Pink and Cyan
    budget: 4200000,
    fanbaseMorale: 72,
    staff: [],
    isPlayerControlled: false,
    prestige: 145,
    currentDivision: 'Grupo Especial',
    history: { titles: 0, runnerUps: 0 }, // Traditional
    enredo: null,
  },
];
