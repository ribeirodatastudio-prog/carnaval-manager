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

### Hiring & Negotiation
- **Market Dynamics**:
  - Staff have **Salary Expectations** based on their Skill and **Reputation**.
  - **School Prestige** (1-200) plays a crucial role. Historical schools (180+) can attract talent for lower offers.
  - Offers are evaluated using a non-deterministic formula involving money, prestige, and a small RNG factor.
- **Prestige Tiers**:
  - **Historical (180-200)**: Legends of the carnival.
  - **Elite (160-179)**: Consistent top contenders.
  - **Traditional (140-159)**: Strong history.
  - **Established (120-139)**: Solid fixtures.
  - **Rising (100-119)**: Up-and-comers.

### Enredo (Theme) Research
- **Research Engine**:
  - Players must invest budget to research a new Enredo.
  - **Mechanics**:
    - **Budget**: Raises the floor of the Potential Score.
    - **Carnavalesco Skill**: Raises the ceiling and optimizes Complexity.
    - **Result**: An Enredo with a specific `Category`, `Complexity` (difficulty), and `Potential Score` (max possible score).

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
