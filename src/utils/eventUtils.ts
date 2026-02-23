import { School, EventOptionCondition } from '../types/models';

export function evaluateConditions(
  conditions: EventOptionCondition[] | undefined,
  school: School
): boolean {
  if (!conditions || conditions.length === 0) return true; // No conditions = always visible

  // For multiple conditions within one option: ANY passing = show (OR logic)
  // If you need AND logic for a specific option, use multiple separate conditions
  // that must all pass — implement as: conditions.every(c => evaluateSingleCondition(c, school))
  // Current design: OR (any condition passes = show the option)
  return conditions.some(c => evaluateSingleCondition(c, school));
}

function evaluateSingleCondition(c: EventOptionCondition, school: School): boolean {
  switch (c.type) {
    case 'neighborhoodType':
      return school.neighborhoodType === c.stringValue;

    case 'archetype':
      return school.archetype === c.stringValue;

    case 'uniqueBonus':
      return school.uniqueBonus === c.stringValue;

    case 'divisionIs':
      return school.currentDivision === c.stringValue;

    case 'divisionIsNot':
      return school.currentDivision !== c.stringValue;

    case 'budgetAbove':
      return school.budget > (c.numericValue ?? 0);

    case 'stressBelow': {
      if (!c.staffRole) return true;
      const stress = school.preparation?.staffStress.find(ss => {
        return school.staff.find(s => s.id === ss.staffId && s.role === c.staffRole);
      })?.stressLevel ?? 0;
      return stress < (c.numericValue ?? 100);
    }

    case 'stressAbove': {
      if (!c.staffRole) return true;
      const stress = school.preparation?.staffStress.find(ss => {
        return school.staff.find(s => s.id === ss.staffId && s.role === c.staffRole);
      })?.stressLevel ?? 0;
      return stress > (c.numericValue ?? 0);
    }

    case 'skillAbove': {
      if (!c.staffRole || !c.skillKey) return false;
      const staffMember = school.staff.find(s => s.role === c.staffRole);
      if (!staffMember) return false;
      // Special case: 'reputation' is a top-level field, not in skills
      if (c.skillKey === 'reputation') return staffMember.reputation > (c.numericValue ?? 0);
      return (staffMember.skills as any)[c.skillKey] > (c.numericValue ?? 0);
    }

    case 'quimiaAbove': {
      const quimia = school.preparation?.mspb?.quimica ?? 0;
      return quimia > (c.numericValue ?? 0);
    }

    default:
      return true;
  }
}
