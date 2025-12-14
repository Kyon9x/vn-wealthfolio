# Fix Growth Logic Tasks

Based on the updated business logic in `docs/goal-actual-growth-business-logic.md`, we need to ensure the implementation correctly handles the following scenarios.

## 1. Fix Scenario 1: Single Account, Single Goal

**Objective**: Ensure the system correctly calculates goal capabilities when the account value was 0 at the goal start date.

**Setup:**
- Account A: Value at goal start (2024-01-01) = 0
- Account A: Current value (today) = 100,000,000
- Goal created today with startDate=2024-01-01
- User allocates: initialContribution=0 (cannot be greater than value at start date), allocatedPercent=50%

**Calculation Logic:**
```
Account growth = 100,000,000 - 0 = 100,000,000
Goal growth = 100,000,000 × 50% = 50,000,000
Goal current value = initialContribution + growth = 0 + 50,000,000 = 50,000,000
```

**Implementation Steps:**
- [x] Verify `initialContribution` validation prevents setting > 0 if account value at start date was 0.
- [x] Verify `GoalService` calculates growth correctly for this scenario.
- [x] Verify `useGoalProgress` hook displays the correct current value (50M).


## 2. Fix Scenario 2: Single Account, Multiple Goals

**Objective**: Ensure multiple goals can correctly split growth from a single account without double-counting, starting from zero value.

**Setup:**
- Account A: Value at goal start = 0
- Account A: Current value = 100,000,000
- Goal 1: initialContribution=0 (cannot be greater than value at start date), allocatedPercent=50%
- Goal 2: initialContribution=0 (cannot be greater than value at start date), allocatedPercent=30%
- Unallocated: 20,000,000 @ 20%
- Unallocated growth = 20,000,000

**Calculation Logic:**
```
Account growth = 100,000,000 (from 0 - 100M)

Goal 1:
  growth = 100,000,000 × 50% = 50,000,000
  contributedValue = 0 + 50,000,000 = 50,000,000

Goal 2:
  growth = 100,000,000 × 30% = 30,000,000
  contributedValue = 0 + 30,000,000 = 30,000,000

Unallocated:
  growth = 100,000,000 × 20% = 20,000,000
  unallocatedValue = 20,000,000

Validation: 50M + 30M + 20M = 100M  = Goal Growth (from 0 - 100M)
```

**Implementation Steps:**
- [x] Verify validation ensures sum of allocated percentages <= 100%.
- [x] Verify `GoalService` correctly attributes growth to multiple goals on the same account.
- [x] Ensure unallocated growth is correctly implicitly tracked (remaining percentage).


## 3. Fix Scenario 3: Multiple Accounts, Single Goal

**Objective**: Ensure a single goal can aggregate contributions and growth from multiple accounts, even when starting values were zero.

**Setup:**
- Account 1: Value at goal start = 0, Current = 100,000,000
- Account 2: Value at goal start = 0, Current = 100,000,000
- Account 3: Value at goal start = 0, Current = 100,000,000
- Goal 1:
  - Account 1: initialContribution=0 (cannot be greater than value at start date), allocatedPercent=30%
  - Account 2: initialContribution=0 (cannot be greater than value at start date), allocatedPercent=30%
  - Account 3: initialContribution=0 (cannot be greater than value at start date), allocatedPercent=30%

**Calculation Logic:**
```
Account 1 growth = 100,000,000 × 30% = 30,000,000
Account 2 growth = 100,000,000 × 30% = 30,000,000
Account 3 growth = 100,000,000 × 30% = 30,000,000

Goal 1:
  total_growth = 30M + 30M + 30M = 90,000,000
  current = (0 + 0 + 0) + 90M = 90,000,000
```

**Implementation Steps:**
- [x] Verify aggregation logic in `GoalService`.
- [x] Verify `useGoalProgress` correctly sums up growth from multiple sources.


## 4. Fix Scenario 4: Allocation Edits (Amount Change)

**Objective**: Verify correct behavior when changing the initial capital allocation after growth has occurred.

**Setup:**
- Account A: Value at goal start = 1,000, Current account value = 1,100
- Goal allocation: initialContribution=500, allocatedPercent=50%
- User edits allocation to: initialContribution=600

**Calculation Logic (Before Edit):**
```
Growth = (1,100 - 1,000) × 50% = 50
Contributed Value = 500 + 50 = 550
Unallocated = 1,100 - 550 = 550
```

**Calculation Logic (After Edit):**
```
Growth = (1,100 - 1,000) × 50% = 50 (unchanged - still from historical baseline)
Contributed Value = 600 + 50 = 650
Unallocated = 1,100 - 650 = 450

Impact:
- Allocation increased by 100. The initialContribution is now 600.
- Note: The init point of actual growth line is start at 600 after make change.
- Unallocated decreased by 100
```

**Key**: The historical growth (50) doesn't change. Only the initialContribution changes.

**Implementation Steps:**
- [x] Verify that changing `initialContribution` does not affect the calculation of historical growth attribution.
- [x] Ensure that the Unallocated balance validation correctly accounts for the new `initialContribution`.
- [x] Verify that charts reflect the new starting baseline (600) while maintaining the correct growth curve.


## 5. Fix Scenario 5: Allocation Edits (Percentage Change)

**Objective**: Verify that changing the allocation percentage only affects the growth attribution and not the initial capital.

**Setup:**
- Account A: Value at goal start = 1,000, Current = 1,100
- Goal allocation: initialContribution=500, allocatedPercent=50%
- User edits percentage to: 70%

**Calculation Logic (Before Edit):**
```
Growth = (1,100 - 1,000) × 50% = 50
Contributed Value = 500 + 50 = 550
Unallocated = 1,100 - 550 = 550
```

**Calculation Logic (After Edit):**
```
Growth = (1,100 - 1,000) × 70% = 70
Contributed Value = 500 + 70 = 570
Unallocated = 1,100 - 570 = 530

Impact:
- Growth increases by 20 (from the 20% percentage change)
- initialContribution stays locked at 500 (no changes)
```

**Key**: initialContribution is immutable. Only growth recalculates based on new percentage. The growth line will start from the new initialContribution point.

**Implementation Steps:**
- [x] Verify that editing `allocatedPercent` recalculates the `Growth` component correctly.
- [x] Ensure `initialContribution` remains unchanged.
- [x] Verify `useGoalProgress` updates the Contributed Value to reflect the new growth attribution percentage.


## 6. Fix Scenario 6: Segmented Growth (Multiple Allocation Versions)

**Objective**: Ensure growth is calculated correctly across different time periods with varying allocation percentages.

**Setup:**
- Account A: Value at goal start (Jan 1) = 1,000
- Value at Feb 15 = 1,100
- Value at Apr 1 = 1,250
- Current (today) = 1,330

**Allocation History:**
Assign Acount A to goal
- initialContribution=0
- Version 1: Jan 1 - Feb 15, allocatedPercent=50%
- Version 2: Feb 15 - Apr 1, allocatedPercent=50%
- Version 3: Apr 1 - today, allocatedPercent=60%

**Calculation Logic:**
```
Period 1 (Jan 1 - Feb 15):
  goal growth = (1,100 - 1,000) × 50% = 50
  goal contributedValue = 0 + 50 = 50

Period 2 (Feb 15 - Apr 1):
  goal growth = (1,250 - 1,100) × 50% = 75
  goal contributedValue = 50 + 75 = 125

Period 3 (Apr 1 - today):
  goal growth = (1,330 - 1,250) × 60% = 48
  goal contributedValue = 125 + 48 = 173

Total goal growth = 50 + 75 + 48 = 173
Total goal contributedValue = 0 + 173 = 173
```
**Note**: The initialContribution is 0, so the contributed value is the same as the growth. The line in chart only change following the changes of growth.

**Implementation Steps:**
- [ ] Verify `GoalService` correctly segments growth based on allocation history versions.
- [ ] Ensure the total growth is the sum of growth from each period.
- [ ] Verify that charts render the growth curve accurately reflecting changes over time.


## 7. Fix Edge Cases

### Case 1: Goal Created After Account Has Grown

**Setup:**
- Account A: Value on 2024-01-01 = 0
- Account A: Current (2025-12-14) = 100,000,000
- Goal created today with startDate=2024-01-01
- User allocates: initialContribution=0 (not allowed to greater than value at start date), allocatedPercent=50%

**Result:**
```
Unallocated at goal start date (2024-01-01) = 0
Cannot allocate 50,000,000 when unallocated was 0

This is INVALID. The system should prevent this with validation:
"Allocation amount exceeds historical unallocated balance at goal start date"

Correct approach:
- User can only allocate UP TO the current unallocated balance
- OR the system allocates from the grown balance retroactively
```

**Implementation Steps:**
- [x] Verify validation logic in `EditAllocationModal` prevents allocating more than available at goal start date.

### Case 2: Account Value Decreases

**Setup:**
- Account A: Value at goal start = 1,000, Current value = 800
- Goal allocation: initialContribution=500, allocatedPercent=50%

**Calculation:**
```
Account growth = 800 - 1,000 = -200 (negative/loss)
Goal growth = -200 × 50% = -100 (loss proportional to allocation)
Contributed value = 500 + (-100) = 400
```

**Implementation Steps:**
- [x] Verify system handles negative growth correctly (losses shared).

### Case 3: Zero Account Value

**Setup:**
- Account A: Value at goal start = 0, Current value = 100,000,000
- Goal allocation: initialContribution=0, allocatedPercent=50% (default initialization)

**Calculation:**
```
Account growth = 100,000,000 - 0 = 100,000,000
Goal growth = 100,000,000 × 50% = 50,000,000
Contributed value = 0 + 50,000,000 = 50,000,000
```

**Implementation Steps:**
- [x] Verify system handles zero value initialization correctly.

### Case 4: Account Grows Before Allocation

**Setup:**
- Account A: Value on 2024-01-01 = 100,000
- Account A: Value on 2024-06-01 = 200,000 (grew by 100,000)
- Account A: Current value = 300,000

**Scenario A: Allocate on 2024-06-01**
- initialContribution: 150,000 (locked in)
- unallocated: 200,000 - 150,000 = 50,000
- allocation percentage: manual input (20%)

**Growth Calculation:**
```
- account growth from goal allocation date = 300,000 - 200,000 = 100,000
- goal growth = 100,000 × 20% = 20,000
- contributedValue = 150,000 + 20,000 = 170,000
- unallocated = 50,000 + 100,000* (100% - 20%) = 50,000 + 80,000 = 130,000
```

**Implementation Steps:**
- [x] Verify that allocations made at a later date use the account value at THAT date as the baseline for percentage calculations.
- [x] Ensure future growth is calculated from the allocation date, not the goal start date.
