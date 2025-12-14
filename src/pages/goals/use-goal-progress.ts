import { getGoalsAllocation } from "@/commands/goal";
import { getHistoricalValuations } from "@/commands/portfolio";
import { useAccounts } from "@/hooks/use-accounts";
import { useLatestValuations } from "@/hooks/use-latest-valuations";
import { QueryKeys } from "@/lib/query-keys";
import type { AccountValuation, Goal, GoalAllocation } from "@/lib/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { useMemo } from "react";
import { isGoalOnTrack } from "./lib/goal-utils";

interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetAmount: number;
  progress: number; // percentage (actual)
  expectedProgress: number; // percentage (based on timeline)
  isOnTrack: boolean;
  projectedValue: number; // projected value at today's date
}

/**
 * Calculate projected value using compound interest formula with regular contributions
 * FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]
 */
function calculateProjectedValue(
  startValue: number,
  monthlyInvestment: number,
  annualReturnRate: number,
  monthsFromStart: number,
): number {
  if (monthsFromStart <= 0) return startValue;

  const monthlyRate = annualReturnRate / 100 / 12;

  if (monthlyRate === 0) {
    return startValue + monthlyInvestment * monthsFromStart;
  }

  const compoundFactor = Math.pow(1 + monthlyRate, monthsFromStart);
  const futurePV = startValue * compoundFactor;
  const futureContributions = monthlyInvestment * ((compoundFactor - 1) / monthlyRate);

  return futurePV + futureContributions;
}

/**
 * Hook to calculate goal progress based on account allocations and their values.
 *
 * For each goal, we:
 * 1. Find all allocations for that goal
 * 2. For each allocation, get the account's current value
 * 3. Multiply account value by allocation percentage
 * 4. Sum up all the allocated values to get the goal's current value
 * 5. Calculate projected value at today's date
 * 6. Compare actual vs projected to determine if on track
 */
export function useGoalProgress(goals: Goal[] | undefined) {
  const { accounts } = useAccounts();
  const accountIds = useMemo(() => accounts?.map((acc) => acc.id) ?? [], [accounts]);

  const { latestValuations, isLoading: isLoadingValuations } = useLatestValuations(accountIds);

  const { data: allocations, isLoading: isLoadingAllocations } = useQuery<GoalAllocation[], Error>({
    queryKey: [QueryKeys.GOALS_ALLOCATIONS],
    queryFn: getGoalsAllocation,
  });

  // Identify unique (accountId, date) pairs needed for historical valuations
  const requiredHistory = useMemo(() => {
    if (!goals || !allocations) return [];

    const reqs = new Set<string>(); // key: "accountId|date"
    const result: { accountId: string; date: string }[] = [];

    allocations.forEach(alloc => {
       const goal = goals.find(g => g.id === alloc.goalId);
       // Use allocation date if available, otherwise goal start date
       const startDate = alloc.allocationDate || goal?.startDate;

       if (goal && startDate) {
         const key = `${alloc.accountId}|${startDate}`;
         if (!reqs.has(key)) {
           reqs.add(key);
           result.push({ accountId: alloc.accountId, date: startDate });
         }
       }
    });
    return result;
  }, [goals, allocations]);

  // Fetch historical valuations
  const historyQueries = useQueries({
    queries: requiredHistory.map(({ accountId, date }) => ({
       queryKey: ['historicalValuation', accountId, date],
       queryFn: async () => {
          const vals = await getHistoricalValuations(accountId, date, date);
          return vals?.[0]?.totalValue ?? 0;
       },
       staleTime: 1000 * 60 * 60, // 1 hour cache
    }))
  });

  const isLoadingHistory = historyQueries.some(q => q.isLoading);

  const goalProgressMap = useMemo(() => {
    const progressMap = new Map<string, GoalProgress>();

    if (!goals || !allocations || !latestValuations) {
      return progressMap;
    }

    // Create a map of account ID to valuation for quick lookup
    const valuationMap = new Map<string, AccountValuation>();
    latestValuations.forEach((val) => valuationMap.set(val.accountId, val));

    // Create a lookup for historical values: "accountId|date" -> value
    const historyMap = new Map<string, number>();
    historyQueries.forEach((q, i) => {
        if (q.data !== undefined) {
           const { accountId, date } = requiredHistory[i];
           historyMap.set(`${accountId}|${date}`, q.data);
        }
    });

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate progress for each goal
    goals.forEach((goal) => {
      let currentValue = 0;
      let totalInitialContribution = 0;

      // Find all allocations for this goal
      const goalAllocations = allocations.filter((alloc) => alloc.goalId === goal.id);

      // Sum up the allocated values from each account
      goalAllocations.forEach((alloc) => {
        // Filter by allocationDate if it exists and is in the future
        if (alloc.allocationDate && alloc.allocationDate > todayStr) {
           return;
        }

        const currentAccountValuation = valuationMap.get(alloc.accountId);

        // Get account value at baseline start date (allocation date or goal start date)
        let startAccountValue = 0;
        const baselineDate = alloc.allocationDate || goal.startDate;

        if (baselineDate) {
            startAccountValue = historyMap.get(`${alloc.accountId}|${baselineDate}`) ?? 0;
        }

        // If we have current valuation, calculate growth
        if (currentAccountValuation) {
          const currentAccountValue = currentAccountValuation.totalValue;
          const initialContribution = alloc.initialContribution ?? 0;
          const percentage = (alloc.allocatedPercent ?? 0) / 100;

          // Formula: Initial Contribution + (Account Growth * Percentage)
          // Account Growth = Current - Start

          const accountGrowth = currentAccountValue - startAccountValue;
          const allocatedGrowth = accountGrowth * percentage;

          const allocatedValue = initialContribution + allocatedGrowth;

          currentValue += allocatedValue;
          totalInitialContribution += initialContribution;
        }
      });

      const progress = goal.targetAmount > 0
        ? Math.min((currentValue / goal.targetAmount) * 100, 100)
        : 0;

      // Calculate projected value at today's date based on goal start
      const monthlyInvestment = goal.monthlyInvestment ?? 0;
      const annualReturnRate = goal.targetReturnRate ?? 0;

      // Calculate months from goal start to today
      let monthsFromStart = 0;
      if (goal.startDate) {
        const goalStartDate = parseISO(goal.startDate);
        const today = new Date();
        const yearDiff = today.getFullYear() - goalStartDate.getFullYear();
        const monthDiff = today.getMonth() - goalStartDate.getMonth();
        const daysDiff = today.getDate() - goalStartDate.getDate();
        monthsFromStart = yearDiff * 12 + monthDiff + daysDiff / 30;
      }

      // Use totalInitialContribution as the starting principal for projection
      const startValue = totalInitialContribution;

      const projectedValue = calculateProjectedValue(
        startValue,
        monthlyInvestment,
        annualReturnRate,
        Math.max(0, monthsFromStart),
      );

      progressMap.set(goal.id, {
        goalId: goal.id,
        currentValue,
        targetAmount: goal.targetAmount,
        progress,
        expectedProgress: 0,
        isOnTrack: isGoalOnTrack(currentValue, projectedValue),
        projectedValue,
      });
    });

    return progressMap;
  }, [goals, allocations, latestValuations, historyQueries, requiredHistory]);

  const isLoading = isLoadingValuations || isLoadingAllocations || isLoadingHistory;

  return {
    goalProgressMap,
    isLoading,
    getGoalProgress: (goalId: string) => goalProgressMap.get(goalId),
  };
}
