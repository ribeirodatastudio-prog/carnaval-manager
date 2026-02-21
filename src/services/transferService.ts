import { StaffMember, School, TransferOffer, StaffRole } from '../types/models';

export function calculateOfferProbability(
  staff: StaffMember,
  school: School,
  offeredSalary: number,
  contractYears: number
): { prob: number; minSalary: number; idealYears: number } {
  const gap = Math.max(0, staff.reputation - school.prestige);
  const repFactor = 1 + (gap / 150);

  // Base expectation adjusted by reputation gap
  const minSalary = staff.salaryExpectation * repFactor;

  // Staff with high reputation compared to school prefer shorter contracts
  // gap 0 -> 3 years
  // gap 60 -> 2 years
  // gap 120 -> 1 year
  const idealYears = Math.max(1, 3 - Math.floor(gap / 60));

  // Penalty: +5% to minSalary for each year offered above idealYears
  const yearsDiff = Math.max(0, contractYears - idealYears);
  const contractPenalty = yearsDiff * 0.05;

  const adjustedMin = minSalary * (1 + contractPenalty);

  // School prestige makes the offer more attractive (the "shirt weight")
  // Prestige 100 -> 1.0x
  // Prestige 200 -> 1.2x
  // Prestige 50 -> 0.9x
  const prestigeMultiplier = 1 + ((school.prestige - 100) / 500);

  // Effective value of the offer to the staff member
  const effectiveSalary = offeredSalary * prestigeMultiplier;

  // Calculate surplus/deficit percentage
  // If effective == adjustedMin, surplus is 0.
  const salarySurplus = (effectiveSalary - adjustedMin) / (adjustedMin || 1); // Avoid div/0

  // Base probability is 50% if offer matches expectation exactly
  let prob = 0.5 + salarySurplus;

  // Clamp probability between 5% and 95%
  prob = Math.max(0.05, Math.min(0.95, prob));

  return { prob, minSalary: adjustedMin, idealYears };
}

export function resolveOffer(
  offer: TransferOffer,
  staff: StaffMember,
  school: School
): TransferOffer {
  const { prob, minSalary, idealYears } = calculateOfferProbability(
    staff,
    school,
    offer.offeredSalary,
    offer.contractYears
  );

  const roll = Math.random();
  const result: TransferOffer = { ...offer };

  if (roll < prob) {
    result.status = 'Accepted';
  } else if (prob >= 0.2 && prob < 0.5) {
    result.status = 'Countered';
    // Counter with slightly more than minimum required
    result.counterSalary = Math.ceil(minSalary * 1.05);
    result.counterYears = idealYears;
  } else {
    result.status = 'Rejected';
  }

  return result;
}

export function processAITransfers(
  schools: School[],
  availableStaff: StaffMember[],
  currentWeek: number
): { updatedSchools: School[]; updatedStaff: StaffMember[]; news: string[] } {
  const updatedSchools = [...schools];
  const updatedStaff = [...availableStaff];
  const news: string[] = [];
  const hiredStaffIds = new Set<string>();

  updatedSchools.forEach((school, index) => {
    // Skip player school
    if (school.isPlayerControlled) return;

    // 40% chance to attempt a signing
    if (Math.random() > 0.4) return;

    // AI Logic:
    // 1. Identify needs? (For now, just random upgrade or fill empty?)
    // The prompt says: "Target: find 1 staff from availableStaff that the school can afford"
    // It implies filling any role or upgrading.
    // Simplifying: AI looks for *any* available staff that is an upgrade or fills a hole.
    // Actually prompt says "prioritizing highest reputation".

    // Let's check which roles the school currently has.
    // If it's missing a role appropriate for its division, prioritize that.
    // If full, look for upgrades?
    // Prompt: "Find 1 staff from availableStaff... Resolve immediately... If accepted: assign staff to school, replace..."

    // We filter available staff by budget.
    // We assume AI offers `salaryExpectation`.
    const candidates = updatedStaff.filter(s =>
      !hiredStaffIds.has(s.id) &&
      school.budget >= s.salaryExpectation * 0.8 // Can afford approx
    );

    if (candidates.length === 0) return;

    // Sort by reputation descending
    candidates.sort((a, b) => b.reputation - a.reputation);

    // Find the first candidate that is actually an upgrade or fills a vacancy
    let candidate: StaffMember | undefined;

    for (const cand of candidates) {
        const currentStaff = school.staff.find(st => st.role === cand.role);
        if (!currentStaff) {
            candidate = cand;
            break;
        }
        if (cand.reputation > currentStaff.reputation) {
            candidate = cand;
            break;
        }
    }

    if (!candidate) return;

    // AI makes an offer
    // Offer: salaryExpectation, 1 year (safe bet)
    // Adjust offer based on school prestige? AI might overpay slightly if desperate?
    // Let's stick to salaryExpectation.
    const offerSalary = candidate.salaryExpectation;
    const offerYears = 1;

    // Calculate probability
    const { prob } = calculateOfferProbability(candidate, school, offerSalary, offerYears);

    // Roll
    if (Math.random() < prob) {
      // Accepted!

      // 1. Remove from available
      const staffIdx = updatedStaff.findIndex(s => s.id === candidate.id);
      if (staffIdx !== -1) {
        updatedStaff.splice(staffIdx, 1);
      }
      hiredStaffIds.add(candidate.id);

      // 2. Handle replacement at school
      const existingStaffIdx = school.staff.findIndex(s => s.role === candidate.role);
      if (existingStaffIdx !== -1) {
        const fired = school.staff[existingStaffIdx];
        // Release back to pool
        fired.currentSchoolId = null;
        fired.salary = 0;
        fired.contractYears = 0;
        updatedStaff.push(fired);

        school.staff.splice(existingStaffIdx, 1);
      }

      // 3. Add to school
      const newStaff = {
        ...candidate,
        currentSchoolId: school.id,
        salary: offerSalary,
        contractYears: offerYears
      };
      school.staff.push(newStaff);

      // 4. Update Budget
      school.budget -= offerSalary;

      // 5. Prestige Bonus (as per prompt rules for player, applying to AI too for consistency)
      const prestigeBonus = Math.max(0, (candidate.reputation - school.prestige) * 0.02);
      school.prestige = Math.min(195, school.prestige + prestigeBonus);

      // 6. Log News
      news.push(`${school.name} signed ${candidate.name} (${candidate.role})`);
    }
  });

  return { updatedSchools, updatedStaff, news };
}
