# Goal Actual Growth Business Logic

## Overview

This document describes the complete business logic for calculating goal actual growth. The system tracks how allocated portfolio values grow over time and attributes that growth correctly across multiple accounts and goals.

## Core Concepts

### 1. Allocation Model

Each goal has allocations across one or more accounts:
- **allocationAmount**: The initial dollar amount allocated (locked at allocation date)
- **allocationPercentage**: The percentage of account growth attributed to this goal (0-100%)
- **allocationDate**: When the allocation was made (typically goal.startDate for initial allocations)

### 2. Growth Attribution Principle

```
Goal Growth = Sum of (Account Growth × Allocation Percentage) for all accounts
```

Where:
- **Account Growth** = Current Account Value - Account Value at Goal Start Date
- **Allocation Percentage** = The percentage of account growth attributed to this goal

This allows multiple goals to grow from a single account without double-counting.

### 3. Current Value vs Init Value

Under the new allocation system:

- **init_value**: The originally allocated amount (locked in at allocation date)
- **current_value**: init_value + attributed_growth
- **growth**: current_value - init_value

**Important**: All allocations are initialized with amount=0 and percentage=0 when a goal is created. Users then allocate from the unallocated pool.

## Calculation Scenarios

### Scenario 1: Single Account, Single Goal

**Setup:**
- Account A: Value at goal start (2024-01-01) = 0
- Account A: Current value (today) = 100,000,000
- Goal created today with startDate=2024-01-01
- User allocates: amount=50,000,000, percentage=50%

**Calculation:**
```
Account growth = 100,000,000 - 0 = 100,000,000
Goal growth = 100,000,000 × 50% = 50,000,000
Goal current value = 50,000,000 + 50,000,000 = 100,000,000
```

### Scenario 2: Single Account, Multiple Goals

**Setup:**
- Account A: Value at goal start = 0
- Account A: Current value = 100,000,000
- Goal 1: allocated 50,000,000 @ 50%
- Goal 2: allocated 30,000,000 @ 30%
- Unallocated: 20,000,000 @ 20%

**Calculation:**
```
Account growth = 100,000,000

Goal 1:
  growth = 100,000,000 × 50% = 50,000,000
  current = 50,000,000 + 50,000,000 = 100,000,000

Goal 2:
  growth = 100,000,000 × 30% = 30,000,000
  current = 30,000,000 + 30,000,000 = 60,000,000

Unallocated:
  growth = 100,000,000 × 20% = 20,000,000
  current = 20,000,000 + 20,000,000 = 40,000,000

Validation: 100M + 60M + 40M = 200M ✓
```

### Scenario 3: Multiple Accounts, Single Goal

**Setup:**
- Account 1: Value at goal start = 0, Current = 100,000,000
- Account 2: Value at goal start = 0, Current = 100,000,000
- Account 3: Value at goal start = 0, Current = 100,000,000
- Goal 1: 
  - Account 1: allocated 50,000,000 @ 30%
  - Account 2: allocated 50,000,000 @ 30%
  - Account 3: allocated 50,000,000 @ 30%

**Calculation:**
```
Account 1 growth = 100,000,000 × 30% = 30,000,000
Account 2 growth = 100,000,000 × 30% = 30,000,000
Account 3 growth = 100,000,000 × 30% = 30,000,000

Goal 1:
  total_growth = 30M + 30M + 30M = 90,000,000
  current = (50M + 50M + 50M) + 90M = 240,000,000
```

### Scenario 4: Allocation Edits (Amount Change)

**Setup:**
- Account A: Value at goal start = 1,000, Current = 1,100
- Goal allocation: amount=500, percentage=50%
- User edits allocation to: amount=600

**Before Edit:**
```
Growth = (1,100 - 1,000) × 50% = 50
Current = 500 + 50 = 550
Unallocated = 1,100 - 500 = 600
```

**After Edit:**
```
Growth = (1,100 - 1,000) × 50% = 50 (unchanged - still from historical baseline)
Current = 600 + 50 = 650
Unallocated = 1,100 - 600 = 500

Impact: 
- Allocation increased by 100
- Unallocated decreased by 100
```

**Key**: The historical growth (50) doesn't change. Only the init_amount changes.

### Scenario 5: Allocation Edits (Percentage Change)

**Setup:**
- Account A: Value at goal start = 1,000, Current = 1,100
- Goal allocation: amount=500, percentage=50%
- User edits percentage to: 70%

**Before Edit:**
```
Growth = (1,100 - 1,000) × 50% = 50
Current = 500 + 50 = 550
```

**After Edit:**
```
Growth = (1,100 - 1,000) × 70% = 70
Current = 500 + 70 = 570

Impact:
- Growth increases by 20 (from the 20% percentage change)
- Amount stays locked at 500 (never changes)
```

**Key**: Amount is immutable. Only growth recalculates based on new percentage.

### Scenario 6: Segmented Growth (Multiple Allocation Versions)

**Setup:**
- Account A: Value at goal start (Jan 1) = 1,000
- Value at Feb 15 = 1,100
- Value at Apr 1 = 1,250
- Current (today) = 1,330

**Allocation History:**
- Version 1: Jan 1 - Feb 15, percentage=50%
- Version 2: Feb 15 - Apr 1, percentage=50%
- Version 3: Apr 1 - today, percentage=60%

**Calculation:**
```
Period 1 (Jan 1 - Feb 15):
  growth = (1,100 - 1,000) × 50% = 50

Period 2 (Feb 15 - Apr 1):
  growth = (1,250 - 1,100) × 50% = 75

Period 3 (Apr 1 - today):
  growth = (1,330 - 1,250) × 60% = 48

Total growth = 50 + 75 + 48 = 173
Current value = 500 + 173 = 673
```

## Edge Cases

### Case 1: Goal Created After Account Has Grown

**Setup:**
- Account A: Value on 2024-01-01 = 0
- Account A: Current (2025-12-14) = 100,000,000
- Goal created today with startDate=2024-01-01
- User allocates: amount=50,000,000

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

**Business Logic Decision:**
According to allocation-setting-plan.md:
- When a goal is created with historical start date, unallocated is calculated at that start date
- User can only allocate from that historical unallocated balance (plus its subsequent growth)
- If user wants to allocate 50M today, it must come from the 40M unallocated that grew from 0

### Case 2: Account Value Decreases

**Setup:**
- Account A: Value at goal start = 1,000, Current = 800
- Goal allocation: amount=500, percentage=50%

**Calculation:**
```
Account growth = 800 - 1,000 = -200 (negative/loss)
Goal growth = -200 × 50% = -100 (loss proportional to allocation)
Current value = 500 + (-100) = 400
```

**Key**: Losses are attributed proportionally to allocations, just like gains.

### Case 3: Zero Account Value

**Setup:**
- Account A: Value at goal start = 0, Current = 100,000,000
- Goal allocation: amount=0, percentage=50% (default initialization)

**Calculation:**
```
Account growth = 100,000,000 - 0 = 100,000,000
Goal growth = 100,000,000 × 50% = 50,000,000
Current value = 0 + 50,000,000 = 50,000,000

This is valid and shows correct initialization behavior
```

### Case 4: Account Grows Before Allocation

**Setup:**
- Account A: Value on 2024-01-01 = 100,000
- Account A: Value on 2024-06-01 = 200,000 (grew by 100,000)
- Account A: Current = 300,000

**Scenario A: Allocate on 2024-06-01**
```
For the allocation, use:
- Goal start date: 2024-01-01
- Allocation date: 2024-06-01
- Account value at goal start: 100,000
- Account value at allocation: 200,000
- Current value: 300,000

Unallocated at goal start = 100,000
User can allocate from current unallocated value (which has grown)

If user allocates 150,000 on 2024-06-01:
- Allocation amount: 150,000 (locked in)
- Allocation percentage: 150,000 / 200,000 = 75% (of account at allocation time)

Growth calculation:
- account growth from goal start = 300,000 - 100,000 = 200,000
- goal growth = 200,000 × 75% = 150,000
- current = 150,000 + 150,000 = 300,000
```

**Key**: Allocation percentage is based on account value AT ALLOCATION TIME, not goal start time.

## Implementation Requirements

### 1. Backend Calculation (Rust)

The `GoalService.calculate_goal_progress_on_date()` must:

```rust
For each allocation:
  1. Get account value at goal.start_date (baseline)
  2. Get account value at query_date (current)
  3. Calculate account_growth = current - baseline
  4. Calculate allocated_growth = account_growth × (allocation.percentage / 100)
  5. Accumulate total_growth
  6. Return GoalProgressSnapshot with all details
```

**Current Implementation Status**: ✓ Implemented correctly in `src-core/src/goals/goals_service.rs`

### 2. Frontend Calculation (React)

The `useGoalProgress()` hook must:

```typescript
For each goal:
  1. Find all active allocations (where startDate <= today <= endDate)
  2. For each allocation:
     - Get current account value from latestValuations
     - Calculate: allocated_value = account_value × (allocation.percentage / 100)
  3. Sum all allocated_values = currentValue
  4. Calculate projectedValue using compound interest formula
  5. Compare currentValue vs projectedValue to determine isOnTrack
```

**Current Implementation Status**: ⚠️ Partially correct but mixing two calculation methods:
- Uses `percentAllocation` directly (should be `allocationPercentage`)
- Doesn't account for historical account values at goal start

### 3. Modal Display (Edit Allocation)

The `EditAllocationModal` must display:

```
For each account:
  - Value at goal.startDate (historical baseline)
  - Unallocated at that date
  - Current user allocation amount
  - Current allocation percentage
  
Validation:
  - Sum of allocations <= unallocated balance at goal start
  - Amount delta fits within available unallocated
```

**Current Implementation Status**: ✓ Updated in this task

### 4. Data Models

Required fields on `GoalAllocation`:

```
- id: string (unique per goal-account pair)
- goalId: string
- accountId: string
- allocationAmount: f64 (the init_amount, locked)
- allocationPercentage: f64 (0-100, the growth attribution %)
- allocationDate: string (when allocated, typically goal.startDate)
- initAmount: f64 (same as allocationAmount, for clarity)
- startDate: string (goal.startDate, when this allocation begins)
- endDate: string (goal.dueDate, when this allocation ends)
```

## Growth Line Chart Calculation

### Actual Growth Line

For each date in chart:

```
1. Get account values at that date (historical)
2. For each allocation:
   - Lookup allocation version active on that date
   - Calculate: growth = (account_value_at_date - account_value_at_goal_start) × percentage
3. Sum all growth = actual_value at that date
```

**Key**: Use historical account valuations, not current values.

### Projected Growth Line

For each date in chart:

```
1. Calculate months from goal start to that date
2. Use compound interest formula:
   FV = PMT × [((1 + r)^n - 1) / r]
   
   Where:
   - PMT = monthly_investment from goal
   - r = annual_return_rate / 12 / 100
   - n = months_from_start
```

**Current Implementation Status**: ✓ Implemented in `src/pages/goals/use-goal-valuation-history.ts`

## Validation Rules

### 1. Allocation Constraints

```
For each account on any date:
  Sum(allocation_amounts for active allocations) <= account_value_at_that_date
```

### 2. Percentage Constraints

```
For each account on any date:
  Sum(allocation_percentages for active allocations) <= 100%
```

### 3. Unallocated Balance

```
unallocated_value = account_current_value - sum(allocation_amounts)
unallocated_value must be >= 0
```

### 4. Retroactive Allocation

When allocating to a goal with historical start date:

```
Check at goal start date:
  requested_allocation <= unallocated_at_goal_start

If violated:
  Error: "Cannot allocate more than available at goal start date (YYYY-MM-DD)"
```

## Configuration & Flexibility

The actual growth line becomes configurable through:

### 1. Allocation Amount Changes
- User edits the init_amount
- Growth recalculates automatically
- Unallocated pool adjusts by the delta

### 2. Allocation Percentage Changes
- User edits the growth attribution percentage
- Only future/historical growth recalculates
- Init_amount remains locked

### 3. Allocation History
- Each edit creates a new version
- Growth segments by time period
- Total growth = sum of all period gains

### 4. Account Selection
- User can allocate from different accounts
- Each account's growth is tracked independently
- Multi-account goals show per-account breakdown

## Testing Scenarios

All scenarios from "Calculation Scenarios" section should have tests covering:

1. ✓ Single account, single goal
2. ✓ Single account, multiple goals
3. ✓ Multiple accounts, single goal
4. ✓ Allocation amount edits
5. ✓ Allocation percentage edits
6. ✓ Segmented growth (version history)
7. ✓ Negative growth (losses)
8. ✓ Zero baseline values
9. ✓ Retroactive allocation to historical start date

## Issues & Known Gaps

### 1. React Hook Mismatch
- `useGoalProgress()` doesn't fetch historical account values at goal start date
- Should use account values at `goal.startDate`, not just current values
- This causes incorrect calculations for accounts with pre-goal history

### 2. Chart Data Generation
- `use-goal-valuation-history.ts` needs access to historical account valuations
- Currently may not have this data for all dates in the display range

### 3. Allocation Field Names
- Frontend uses `percentAllocation` but backend uses `allocation_percentage`
- Should standardize naming (prefer `allocationPercentage`)

### 4. Init Value Display
- Currently showing init_value=0 for all goals
- Should show actual `allocationAmount` from first allocation

### 5. Modal Integration
- Modal needs parent component to provide historical account values
- Parent must calculate unallocated balance at goal start date
- Validation on parent side before calling modal's onSubmit

## References

- `docs/.temporary/allocation-setting-plan.md` - Allocation model design
- `src-core/src/goals/goals_service.rs` - Core growth calculation logic
- `src-core/src/goals/goal_progress_model.rs` - Data models
- `src/pages/goals/use-goal-progress.ts` - Frontend progress calculation
- `src/pages/goals/use-goal-valuation-history.ts` - Chart data generation
- `src/pages/goals/components/edit-allocation-modal.tsx` - UI for allocation editing
