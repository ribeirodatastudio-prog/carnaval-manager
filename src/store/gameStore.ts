  submitTransferOffer: (schoolId, staffId, offeredSalary, contractYears) => {
    const state = get();
    const { currentWeek, currentPhase, pendingOffers } = state.gameState;

    if (currentPhase !== 'Market') return 'Transfer market is closed.';

    const school = state.schools.find(s => s.id === schoolId);
    let staff = state.availableStaff.find(s => s.id === staffId);
    if (!staff) {
        for (const s of state.schools) {
            staff = s.staff.find(st => st.id === staffId);
            if (staff) break;
        }
    }

    if (!school) return 'School not found.';
    if (!staff) return 'Staff not found.';

    // Validation (Copied from original logic)
    const isVolunteer = (staff.salaryExpectation ?? 0) === 0;

    if (!isVolunteer) {
        if (offeredSalary <= 0) return 'Invalid salary';
        if (school.budget < offeredSalary) return 'Insufficient budget.';
    } else {
        // For volunteers, allow 0 salary, but not negative
        if (offeredSalary < 0) return 'Invalid salary';
        // If they offer positive money to a volunteer, check budget
        if (offeredSalary > 0 && school.budget < offeredSalary) return 'Insufficient budget.';
    }

    const conflict = pendingOffers.find(o => {
        if (o.fromSchoolId !== schoolId || o.status !== 'Pending' || o.weekMade !== currentWeek) return false;
        let targetStaff = state.availableStaff.find(s => s.id === o.toStaffId);
        if (!targetStaff) {
             for (const s of state.schools) {
                targetStaff = s.staff.find(st => st.id === o.toStaffId);
                if (targetStaff) break;
            }
        }
        return targetStaff && targetStaff.role === staff!.role;
    });

    if (conflict) return 'You can only make one offer per role per week.';

    const offer: TransferOffer = {
        id: `offer-${Date.now()}-${Math.random()}`,
        fromSchoolId: schoolId,
        toStaffId: staffId,
        offeredSalary,
        contractYears,
        weekMade: currentWeek,
        status: 'Pending'
    };

    set(state => ({
        gameState: {
            ...state.gameState,
            pendingOffers: [...state.gameState.pendingOffers, offer]
        }
    }));

    return 'Offer submitted successfully.';
  },
