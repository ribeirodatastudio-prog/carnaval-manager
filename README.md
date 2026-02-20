# Carnival Manager

## Overview
Carnival Manager is a simulation game focused on managing a Samba School in Rio de Janeiro's Special Group. Built with Next.js, React, and TypeScript, the game challenges players to manage resources, hire staff, and lead their school to victory in the Carnaval parade.

## Game Mechanics

### Time Engine
The game operates on a weekly turn-based system.
- **Year**: Starts at Year 1 (displayed as 2024).
- **Week**: 52 weeks per year.
- **Phases**: The year is divided into distinct phases based on the week number.

### Phases
1. **Market (Weeks 1-12)**
   - Focus: Hiring staff, securing contracts, and initial planning.
   - Strategy: Manage budget wisely to secure top talent.

2. **Preparation (Weeks 13-44)**
   - Focus: Developing the theme (enredo), costumes, floats, and rehearsing.
   - Strategy: Balance quality vs. cost, manage staff morale and skill progression.

3. **Parade (Week 45)**
   - Focus: The main event! The school parades at the Sambadrome.
   - Strategy: Execution of the planned elements. Staff skills and school morale directly impact performance.

4. **Results/Offseason (Weeks 46-52)**
   - Focus: Scoring, rankings, promotion/relegation, and end-of-year review.
   - Strategy: Analyze performance and prepare for the next season.

### Staff & Skills
- **Roles**: Carnavalesco, Mestre de Bateria, Intérprete, Mestre-Sala & Porta-Bandeira.
- **Skill Scale**:
  - **Internal**: 1-200 (for precise simulation).
  - **Display**: 1-20 (Football Manager style).
  - **Mapping**:
    - 1-19 -> 1
    - 20-29 -> 2
    - ...
    - 200 -> 20

### Schools
- The game simulates the "Grupo Especial" with 12 schools.
- Players control one school, while the AI manages the others.

## Tech Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS.
- **State Management**: Zustand.
- **Language**: TypeScript.

## Getting Started
1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Build for production: `npm run build`
