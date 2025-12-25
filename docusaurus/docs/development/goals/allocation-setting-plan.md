---
id: allocation-setting-plan
title: Goal Allocation Setting Plan
sidebar_label: Allocation Setting Plan
---

# Goal Allocation Setting Plan

## Overview

Hybrid approach: both **value-based** and **percentage-based** allocation to prevent double-counting while properly attributing growth across multiple goals.

**Key Features:**
- Time-aware unallocated balance calculation
- Date range overlap detection for percentage calculations
- Historical value tracking for accurate attribution

## Allocation Approach

### New Goal Initialization
When a goal is created, allocations are initialized with:
- **allocationAmount**: 0 for all accounts
- **allocationPercentage**: 0 for all accounts
- **allocationDate**: `goal.startDate` (not creation date)

This allows users to allocate values later, with the allocation date anchored to the goal's start period.

### Initial Allocation
- User specifies an **explicit amount** to allocate from unallocated account balance
- User also specifies an **allocation percentage** for this goal
- Allocation percentage = `allocated_amount / account_value_at_allocation_date`
- Init valuation is **locked in** (immutable)

### Example
- Account A balance at goal start date: $1000
- Goal 1: allocated $500
- Goal 2: allocated $300
- **Unallocated**: $200 (available for new goals)

## Growth Calculation

**Fixed init valuation, proportional growth:**
- Goal init value = $500 (locked, never changes)
- Allocation ratio = $500 / $1000 = 50%
- Account grows to $1100 (+$100 gain)
- **Goal actual gain** = 50% × $100 = $50
- **Goal current value** = $500 + $50 = $550

Growth is attributed **only to the allocation percentage**, not the entire account movement.

## Rules and Constraints

### Active/Archived Goals
- Remain **completely untouched** by other goal operations
- No value reshuffling between active goals
- Each goal maintains independent allocation and valuation tracking

### Goal Deletion (Removal)
- Goal A deleted → its current value becomes **free/unallocated**
- This unallocated balance is now available for new goal allocations
- No cascading impact on other active goals

### Reallocation to New Goal
- User can only allocate from **unallocated balance**
- Cannot take value from other active/archived goals
- New allocation uses current value as init valuation

## Allocation Editing

### Edit Amount (Init Valuation)
- User updates allocated amount (e.g., $500 → $600)
- Goal's **init valuation recalculates** to new amount
- Changes the baseline going forward
- Historical growth already locked in (no retroactive changes)
- Freed/required balance impacts unallocated pool

**Example:**
- Current allocation: $500
- User edits to $600 → init valuation becomes $600
- Unallocated pool decreases by $100

### Edit Percentage (Allocation Strategy)
- User edits percentage for a **specific historical period only**
- **Init amount stays locked** (never changes)
- Only the growth calculation for that period recalculates with new %
- Other periods and current value update accordingly
- No impact to periods before or after the edited period

**Example:**
- Account A: $1000 initial
- Goal A: $500 allocated @ 50%
- Account A grows: $1000 → $1100 (+$100)
- **Before edit:**
  - Growth = $100 × 50% = $50
  - Goal value = $500 + $50 = $550
- **User edits: 50% → 70%**
  - Init amount: $500 ✓ (unchanged)
  - Growth recalculated: $100 × 70% = $70
  - Goal value: $500 + $70 = $570
  - Impact: +$20 additional gain (only in this period)

## Allocation History & Versioning

**Track allocation changes:**
```
Allocation History:
- Version 1: Amount=$500, Percentage=50%, Date=Jan 1, Status=Active
- Version 2: Amount=$600, Percentage=50%, Date=Feb 15, Status=Active
- Version 3: Amount=$600, Percentage=60%, Date=Apr 1, Status=Active
```

**Each version stores:**
- Amount
- Percentage
- Start date (when this version became active)
- End date (when next version started, or null if current)

## Growth Calculation with History

**Segmented growth:**
1. For each allocation period (between version changes), calculate:
   - `period_gain = (account_value_end - account_value_start) × allocation_percentage`
2. Sum all period gains for total actual gain
3. Current value = init_amount + total_actual_gain

**Unallocated balance growth:**
- Unallocated percentage = 100% - sum(all_goal_percentages)
- Unallocated balance grows with its own allocation percentage
- When user creates new goal later, they allocate from the grown unallocated balance

**Example Timeline:**
```
Initial State:
- Account A: $1000
- Goal 1: $500 @ 50%
- Goal 2: $300 @ 30%
- Unallocated: $200 @ 20%

After Account A grows to $1100 (+$100):
- Goal 1 value: $500 + ($100 × 50%) = $550
- Goal 2 value: $300 + ($100 × 30%) = $330
- Unallocated: $200 + ($100 × 20%) = $220 ← also grows!

User creates Goal 3 (allocates from unallocated):
- Goal 3 init amount: $220 (the grown unallocated balance)
- Goal 3 percentage: 20%
- From now on: Goal 3 grows with 20% of future Account A growth
```

**Validation always holds:**
- `sum(goal_values) + unallocated_value = account_current_value`

**Example with segmented periods:**
- Period 1 (Jan 1 - Feb 15): Growth $100 @ 50% = $50
- Period 2 (Feb 15 - Apr 1): Growth $150 @ 50% = $75
- Period 3 (Apr 1 - Now): Growth $80 @ 60% = $48
- **Total gain = $173**
- **Current value = $600 + $173 = $773**

## Validation Logic

```
sum(all_goal_allocations) + unallocated_balance = account_total_value
```

Before allocation:
- User selects amount `X` from unallocated balance
- Validate: `X <= unallocated_balance`
- Calculate allocation ratio: `X / account_value_at_allocation_date`
- Store ratio for future growth calculations

## Implementation Requirements

1. Track **allocation history** per account-goal pair
   - Amount allocated
   - Allocation ratio
   - Allocation date
   - Status (active/archived)

2. Calculate **actual gain** from growth
   - Current account value
   - Previous account value (at allocation date)
   - Gain = (current - previous) × allocation_ratio

3. Maintain **unallocated pool**
   - Real-time calculation: `account_value - sum(all_allocations)`
   - UI validation before allocation

4. Handle **goal deletion**
   - When goal deleted, mark as deleted
   - Add current value to unallocated pool
   - Don't touch other goals' allocations

## Edge Cases

- **Account value fluctuations**: Percentage-based growth calculation handles naturally
- **Multiple allocations same account**: Each goal gets proportional share of growth
- **Account value < sum of allocations**: Should be prevented by validation
- **Reallocating between goals**: Only from unallocated pool, not between active goals
- **Sequential goals (no overlap)**: Goals that don't overlap in time don't affect each other's percentage availability
- **Goal start date change**: Resets all allocations for that goal (requires user confirmation)
- **Goal end date change**: Updates all allocations' end dates to maintain overlap logic

---

## Time-Aware Allocation Logic

When managing multiple financial goals that share the same investment accounts, the system needs to accurately track:
1. **Unallocated Balance**: How much of an account's value is available for a new goal
2. **Unallocated Percentage**: What percentage of future growth is available for allocation

The challenge arises when goals have **different start dates and end dates**. A simple sum of allocated percentages doesn't account for:
- Goals that have already ended before the new goal starts
- Goals that haven't started yet when calculating available balance
- The actual "contributed value" of each allocation at different points in time

### Core Concepts

#### Contributed Value

The **Contributed Value** of an allocation at any point in time is:

```
ContributedValue = InitialContribution + (AccountGrowth × AllocationPercent)
```

Where:
- `InitialContribution` = The fixed dollar amount allocated when the goal started
- `AccountGrowth` = `AccountValue(QueryDate) - AccountValue(AllocationStartDate)`
- `AllocationPercent` = The percentage of growth this goal is entitled to (0-100%)

#### Time-Aware Unallocated Balance

The **Unallocated Balance** for a goal at its start date is:

```
UnallocatedBalance = AccountValueAtGoalStart - Σ(OtherAllocations' ContributedValues)
```

This is calculated by:
1. Getting the account value at the **current goal's start date**
2. For each **other goal's allocation** on this account:
   - Calculate its contributed value UP TO the current goal's start date
3. Subtract the sum of contributed values from the account value

#### Date Range Overlap

For **percentage calculations**, allocations are only counted if their time periods **overlap** with the current goal. Two date ranges overlap if:

```
A.startDate < B.endDate AND A.endDate > B.startDate
```

This means:
- Goals that end before the current goal starts → **Not counted**
- Goals that start after the current goal ends → **Not counted**
- Goals that partially or fully overlap → **Counted**

### Utility Functions

Located in `src/pages/goals/lib/goal-utils.ts`:

#### `doDateRangesOverlap()`

Checks if two date ranges overlap.

```typescript
export function doDateRangesOverlap(
  startA: string | Date | undefined,
  endA: string | Date | undefined,
  startB: string | Date | undefined,
  endB: string | Date | undefined,
): boolean {
  if (!startA || !endA || !startB || !endB) {
    return false; // Conservative: if dates missing, assume no overlap
  }

  const dateStartA = new Date(startA);
  const dateEndA = new Date(endA);
  const dateStartB = new Date(startB);
  const dateEndB = new Date(endB);

  return dateStartA < dateEndB && dateEndA > dateStartB;
}
```

#### `calculateAllocationContributedValue()`

Calculates the contributed value of an allocation at a specific date.

```typescript
export function calculateAllocationContributedValue(
  initialContribution: number,
  allocationPercentage: number,
  accountValueAtAllocationStart: number,
  accountValueAtQueryDate: number,
  allocationStartDate: Date,
  queryDate: Date
): number {
  // If query date is before allocation started, no contribution yet
  if (queryDate < allocationStartDate) {
    return 0;
  }

  // Calculate account growth since allocation start
  const accountGrowth = Math.max(0, accountValueAtQueryDate - accountValueAtAllocationStart);

  // Allocated portion of growth
  const allocatedGrowth = accountGrowth * (allocationPercentage / 100);

  // Total contributed value = initial + growth
  return initialContribution + allocatedGrowth;
}
```

#### `calculateUnallocatedBalance()`

Calculates the remaining unallocated balance.

```typescript
export function calculateUnallocatedBalance(
  accountValueAtQueryDate: number,
  otherAllocationsContributedValues: number[]
): number {
  const totalContributed = otherAllocationsContributedValues.reduce((sum, v) => sum + v, 0);
  return Math.max(0, accountValueAtQueryDate - totalContributed);
}
```

### Component Implementation

#### Edit Allocations Modal

Located in `src/pages/goals/components/edit-allocations-modal.tsx`:

**Historical Values Fetching:**

The modal fetches account valuations at multiple dates:
1. **Current goal's start date** - For calculating the base value
2. **Each other allocation's start date** - For calculating their contributed values

```typescript
// Fetch requests for historical values
const fetchRequests: { accountId: string; date: string }[] = [];

// 1. Current goal's start date (for all accounts)
for (const account of accounts) {
  fetchRequests.push({ accountId: account.id, date: currentGoalStartDate });
}

// 2. Other allocations' start dates
for (const alloc of allAllocations) {
  if (alloc.goalId === goal.id) continue; // Skip current goal
  const allocStartDate = alloc.allocationDate || alloc.startDate;
  fetchRequests.push({ accountId: alloc.accountId, date: allocStartDate });
}
```

**Unallocated Balance Calculation:**

```typescript
const calculateAvailableBalances = () => {
  for (const account of accounts) {
    // Get account value at current goal's start date
    let accountValueAtGoalStart: number;
    if (isPastGoal) {
      accountValueAtGoalStart = historicalValuesCache[getCacheKey(account.id, currentGoalStartDate)] ?? 0;
    } else {
      accountValueAtGoalStart = currentAccountValues.get(account.id) || 0;
    }

    // Calculate contributed values from OTHER goals' allocations
    const contributedValues: number[] = [];
    for (const alloc of allAllocations) {
      if (alloc.goalId === goal.id) continue;
      if (alloc.accountId !== account.id) continue;

      const contributedValue = calculateAllocationContributedValue(
        alloc.initialContribution || 0,
        alloc.allocatedPercent || 0,
        accountValueAtAllocStart,
        accountValueAtGoalStart,
        allocStartDateObj,
        goalStartDateObj
      );
      contributedValues.push(contributedValue);
    }

    // Unallocated balance = Account value - Sum of contributed values
    balances[account.id] = calculateUnallocatedBalance(accountValueAtGoalStart, contributedValues);
  }
};
```

**Time-Aware Percentage Calculation:**

```typescript
const otherGoalsPercent = allAllocations.reduce((sum, existingAlloc) => {
  if (existingAlloc.accountId !== account.id) return sum;
  if (existingAlloc.goalId === goal.id) return sum;

  // Only count allocations that OVERLAP with current goal's time period
  const overlaps = doDateRangesOverlap(
    goal.startDate,           // Current goal start
    goal.dueDate,             // Current goal end
    existingAlloc.startDate,  // Other allocation start
    existingAlloc.endDate     // Other allocation end
  );

  if (!overlaps) return sum;

  return sum + (existingAlloc.allocatedPercent || 0);
}, 0);

const remainingUnallocatedPercent = Math.max(0, 100 - otherGoalsPercent - currentInputPercent);
```

### Examples

#### Example 1: Sequential Goals (No Overlap)

| Goal | Start Date | End Date | Account A | Initial | Alloc % |
|------|------------|----------|-----------|---------|---------|
| Goal 1 | 2025-01-01 | 2030-12-31 | $100,000 | $50,000 | 100% |
| Goal 2 | 2031-01-01 | 2035-12-31 | ? | ? | ? |

**Account A value at 2031-01-01**: $200,000 (grew from $100,000)

**Calculating Goal 2's unallocated balance:**

1. Goal 1's contributed value at 2031-01-01:
   - Initial: $50,000
   - Growth: ($200,000 - $100,000) × 100% = $100,000
   - **Contributed: $150,000**

2. Unallocated Balance: $200,000 - $150,000 = **$50,000**

3. Unallocated Percentage:
   - Goal 1 period (2025-2030) does NOT overlap with Goal 2 (2031-2035)
   - Goal 1's 100% is **not counted**
   - **Unallocated: 100%**

#### Example 2: Overlapping Goals

| Goal | Start Date | End Date | Account A | Initial | Alloc % |
|------|------------|----------|-----------|---------|---------|
| Goal 1 | 2025-01-01 | 2030-12-31 | $100,000 | $50,000 | 50% |
| Goal 2 | 2028-01-01 | 2032-12-31 | ? | ? | ? |

**Account A value at 2028-01-01**: $150,000

**Calculating Goal 2's unallocated balance:**

1. Goal 1's contributed value at 2028-01-01:
   - Initial: $50,000
   - Growth: ($150,000 - $100,000) × 50% = $25,000
   - **Contributed: $75,000**

2. Unallocated Balance: $150,000 - $75,000 = **$75,000**

3. Unallocated Percentage:
   - Goal 1 (2025-2030) OVERLAPS with Goal 2 (2028-2032)
   - Goal 1's 50% IS counted
   - **Unallocated: 50%**

#### Example 3: Future Goal

| Goal | Start Date | End Date | Account A (Current) |
|------|------------|----------|---------------------|
| Goal 1 | 2025-01-01 | 2030-12-31 | $100,000 → $150,000 |
| Goal 3 | 2026-01-01 | 2028-12-31 | ? |

**Today**: 2024-12-24 (Goal 3 is in the future)

**Calculating Goal 3's unallocated balance:**

1. Since Goal 3 is in the future, use **current account value**: $150,000
2. Goal 1's contributed value at current time:
   - Initial: $50,000
   - Growth: ($150,000 - $100,000) × 50% = $25,000
   - **Contributed: $75,000**
3. Unallocated Balance: $150,000 - $75,000 = **$75,000**

### Backend Date Handling

#### Allocation Dates in Database

The `goals_allocation` table stores:
- `allocation_date`: Legacy field (often NULL)
- `start_date`: Backfilled from goal's `start_date`
- `end_date`: Backfilled from goal's `due_date`

#### Start Date Change Behavior

When a goal's `start_date` is changed:
1. All allocations for that goal are **reset** (values set to 0)
2. User is shown a confirmation dialog before proceeding
3. This is handled in `goals_service.rs`

```rust
// When start_date changes, reset all allocations
if new_goal.start_date != existing_goal.start_date {
    self.repository.reset_allocations_for_goal(&goal.id).await?;
}
```

#### End Date Change Behavior

When a goal's `due_date` is changed:
1. All allocations' `end_date` is updated to match
2. This maintains the time-aware overlap logic

```rust
// When due_date changes, update allocations' end_date
if new_goal.due_date != existing_goal.due_date {
    self.repository.update_allocations_end_date(&goal.id, &new_goal.due_date).await?;
}
```

### Frontend Components

#### EditAllocationsModal

**Location**: `src/pages/goals/components/edit-allocations-modal.tsx`

**Props**:
- `goal: Goal` - Current goal (includes startDate, dueDate)
- `allAllocations: GoalAllocation[]` - All allocations across all goals
- `currentAccountValues: Map<string, number>` - Current account values

**Features**:
- Fetches historical valuations at multiple dates
- Calculates time-aware unallocated balance
- Shows dynamic update as user types
- Validates against unallocated balance

#### EditSingleAllocationModal

**Location**: `src/pages/goals/components/edit-single-allocation-modal.tsx`

**Props**:
- `goal: { id, title, startDate, dueDate }` - Goal info
- `allAllocations: GoalAllocation[]` - All allocations
- `currentAccountValue: number` - Current account value

**Features**:
- Same time-aware logic as multi-allocation modal
- Single account focus
- Real-time unallocated balance display

---

## Completed Goals

When a goal is marked as completed (`isAchieved: true`), special behavior is applied:

### Allocation Release

Completed goals' allocations are **NOT counted** in unallocated calculations for other goals:

```typescript
// In allocation calculations:
if (isGoalAchieved(alloc.goalId)) {
  return sum; // Skip - allocations are released
}
```

This means:
- **Percentage Released**: Other goals see the full percentage available (e.g., if Goal 1 had 100%, new goals see 100% available)
- **Balance Available**: The contributed value is still tracked historically, but not subtracted from available balance for *new* goals

### Historical Records

Completed goals preserve their historical data:
- **Chart**: Shows the final achievement record (read-only)
- **Allocation History**: Displays the allocations as they were at completion
- **No Editing**: Edit/delete buttons are hidden for completed goals

### UI Changes

When viewing a completed goal's detail page:

| Element | Active Goal | Completed Goal |
|---------|-------------|----------------|
| Header | Normal | Shows ✅ "Completed" badge |
| Description | Normal | "Goal achieved. Allocations released." |
| "Edit Allocations" button | Visible | Hidden |
| Allocations Section | "Current Allocations" with edit actions | "Allocation History" (read-only) |
| Info Message | - | Green box: "Allocations have been released..." |

### Technical Implementation

**Files Modified:**
- `edit-allocations-modal.tsx` - Skip completed goals in calculations
- `edit-single-allocation-modal.tsx` - Skip completed goals in calculations
- `goal-details-page.tsx` - Conditional UI for completed goals
- `allocation-history-table.tsx` - Pass `allGoals` prop

**New Props:**
- `allGoals: Goal[]` - Passed to allocation modals/tables to check `isAchieved` status

---

## Related Documentation

- [Goal Detail Page](./goal-details-page.md) - UI Components
- [Projected Value Business Logic](./projected-value-business-logic.md) - Growth calculations
