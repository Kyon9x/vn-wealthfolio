import { getGoalsAllocation } from "@/commands/goal";
import { getHistoricalValuations } from "@/commands/portfolio";
import { QueryKeys } from "@/lib/query-keys";
import type { AccountValuation, Goal, GoalAllocation } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachMonthOfInterval,
  eachWeekOfInterval,
  eachYearOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { useMemo } from "react";
import { calculateProjectedValueByDate, calculateDailyInvestment } from "../lib/goal-utils";

// ============ TYPES ============
export type TimePeriodOption = "weeks" | "months" | "years" | "all";

export interface GoalChartDataPoint {
  date: string;
  dateLabel: string;
  projected: number;
  actual: number | null;
}

export interface UseGoalValuationHistoryResult {
  chartData: GoalChartDataPoint[];
  isLoading: boolean;
  error: Error | null;
}

interface DateRange {
  displayStart: Date;
  displayEnd: Date;
}

interface AllocationDetails {
  percentage: number;
  initialContribution: number;
  startDate?: string;
}

interface DateRangeConfig {
  startDate: string;
  endDate: string;
  goalStartDate: string;
}

// ============ HELPERS ============
/**
 * Get display count config for each time period
 */
function getDisplayCounts(period: Exclude<TimePeriodOption, "all">): { past: number; future: number } {
  const config: Record<Exclude<TimePeriodOption, "all">, { past: number; future: number }> = {
    weeks: { past: 12, future: 12 },
    months: { past: 12, future: 12 },
    years: { past: 3, future: 5 },
  };
  return config[period];
}

/**
 * Calculate display date range centered around today
 */
function calculateDisplayDateRange(period: TimePeriodOption, goalStartDate: Date, goalDueDate: Date): DateRange {
  const today = startOfDay(new Date());

  if (period === "all") {
    return { displayStart: goalStartDate, displayEnd: goalDueDate };
  }

  const counts = getDisplayCounts(period);
  let displayStart: Date;
  let displayEnd: Date;

  switch (period) {
    case "weeks":
      displayStart = subWeeks(today, counts.past);
      displayEnd = addWeeks(today, counts.future);
      break;
    case "months":
      displayStart = subMonths(today, counts.past);
      displayEnd = addMonths(today, counts.future);
      break;
    case "years":
      displayStart = subYears(today, counts.past);
      displayEnd = addYears(today, counts.future);
      break;
  }

  // Constrain to goal boundaries
  if (isBefore(displayStart, goalStartDate)) displayStart = goalStartDate;
  if (isAfter(displayEnd, goalDueDate)) displayEnd = goalDueDate;
  if (isAfter(displayStart, displayEnd)) displayEnd = displayStart;

  return { displayStart, displayEnd };
}

/**
 * Generate date intervals based on the selected time period
 */
function generateDateIntervals(startDate: Date, endDate: Date, period: TimePeriodOption): Date[] {
  const today = startOfDay(new Date());
  const effectiveEndDate = period === "all" ? endDate : isAfter(endDate, today) ? endDate : today;

  switch (period) {
    case "weeks":
      return eachWeekOfInterval({ start: startDate, end: effectiveEndDate }).map((w) => endOfWeek(w));
    case "months":
      return eachMonthOfInterval({ start: startDate, end: effectiveEndDate }).map((m) => endOfMonth(m));
    case "years":
    case "all":
      return eachYearOfInterval({ start: startDate, end: effectiveEndDate }).map((y) => endOfYear(y));
    default:
      return eachMonthOfInterval({ start: startDate, end: effectiveEndDate }).map((m) => endOfMonth(m));
  }
}

/**
 * Format date label based on the time period
 */
function formatDateLabel(date: Date, period: TimePeriodOption, specialLabel?: string | null): string {
  const baseLabel = (() => {
    switch (period) {
      case "weeks":
        return format(date, "d MMM");
      case "months":
        return format(date, "MMM ''yy");
      case "years":
      case "all":
        return format(date, "yyyy");
      default:
        return format(date, "MMM ''yy");
    }
  })();

  // Append special label if this is a boundary date
  if (specialLabel) {
    return `${baseLabel}\n(${specialLabel})`;
  }

  return baseLabel;
}

/**
 * Aggregate valuation data by the specified period
 */
function aggregateValuationsByPeriod(
  valuations: Map<string, number>,
  dates: Date[],
  period: TimePeriodOption
): Map<string, number> {
  const aggregated = new Map<string, number>();
  const sortedDates = Array.from(valuations.keys()).sort();

  dates.forEach((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    let value: number | null = null;

    if (period === "years" || period === "all") {
      // For yearly aggregation, get the last valuation in that year
      const year = date.getFullYear();
      for (const valDate of sortedDates) {
        const valDateObj = parseISO(valDate);
        if (valDateObj.getFullYear() === year && 
            (isBefore(valDateObj, new Date(year + "-12-31")) || isEqual(valDateObj, date))) {
          value = valuations.get(valDate) ?? null;
        }
      }
    } else {
      // For weekly/monthly, find the closest valuation on or before this date
      for (const valDate of sortedDates) {
        const valDateObj = parseISO(valDate);
        if (isBefore(valDateObj, date) || isEqual(valDateObj, date)) {
          value = valuations.get(valDate) ?? null;
        } else {
          break;
        }
      }
    }

    if (value !== null) {
      aggregated.set(dateStr, value);
    }
  });

  return aggregated;
}

/**
 * Build allocation details map from allocations
 */
function buildAllocationDetailsMap(
  allocations: GoalAllocation[] | undefined,
  goalId: string,
  goalStartDate: string
): Map<string, AllocationDetails> {
  const detailsMap = new Map<string, AllocationDetails>();

  allocations?.forEach((alloc) => {
    if (alloc.goalId === goalId) {
      detailsMap.set(alloc.accountId, {
        percentage: alloc.allocatedPercent / 100,
        initialContribution: alloc.initialContribution,
        startDate: alloc.allocationDate 
          ? alloc.allocationDate.split("T")[0] 
          : goalStartDate.split("T")[0],
      });
    }
  });

  return detailsMap;
}

/**
 * Calculate actual values from historical valuations
 */
function calculateActualValuesByDate(
  historicalValuations: Map<string, AccountValuation[]> | undefined,
  allocationDetailsMap: Map<string, AllocationDetails>,
  goalStartDate: string
): { actualValuesByDate: Map<string, number>; latestActualValue: number | null } {
  const actualValuesByDate = new Map<string, number>();
  let latestActualValue: number | null = null;

  if (!historicalValuations) {
    return { actualValuesByDate, latestActualValue };
  }

  const allDates = new Set<string>();
  historicalValuations.forEach((valuations) => {
    valuations.forEach((val) => allDates.add(val.valuationDate));
  });

  Array.from(allDates)
    .sort()
    .forEach((dateStr) => {
      let totalValue = 0;

      allocationDetailsMap.forEach((allocationDetails, accountId) => {
        const { initialContribution, percentage, startDate } = allocationDetails;
        totalValue += initialContribution;

        const valuations = historicalValuations.get(accountId);
        const valuation = valuations?.find((v) => v.valuationDate === dateStr);

        if (valuation && valuations) {
          let startAccountValue = 0;
          const baselineDate = startDate || goalStartDate.split("T")[0];

          if (baselineDate) {
            const startValuation = valuations.find((v) => v.valuationDate === baselineDate);
            if (startValuation) {
              startAccountValue = startValuation.totalValue;
            } else if (valuations.length > 0) {
              // Fallback: use earliest available valuation
              const earliestValuation = valuations.reduce((prev, curr) =>
                prev.valuationDate < curr.valuationDate ? prev : curr
              );
              startAccountValue = earliestValuation.totalValue;
            }
          }

          const accountGrowth = valuation.totalValue - startAccountValue;
          const allocatedGrowth = accountGrowth * percentage;
          totalValue += allocatedGrowth;
        }
      });

      if (totalValue > 0) {
        actualValuesByDate.set(dateStr, totalValue);
        latestActualValue = totalValue;
      }
    });

  return { actualValuesByDate, latestActualValue };
}

/**
 * Determine if a date is in the same period as today
 */
function isSamePeriod(date: Date, today: Date, period: TimePeriodOption): boolean {
  switch (period) {
    case "weeks":
      return format(date, "yyyy-ww") === format(today, "yyyy-ww");
    case "months":
      return format(date, "yyyy-MM") === format(today, "yyyy-MM");
    case "years":
    case "all":
      return format(date, "yyyy") === format(today, "yyyy");
    default:
      return false;
  }
}

/**
 * Get actual value for a date point
 */
function getActualValue(
  date: Date,
  today: Date,
  goalStartDate: Date,
  aggregatedActuals: Map<string, number>,
  latestActualValue: number | null,
  period: TimePeriodOption
): number | null {
  const dateStr = format(date, "yyyy-MM-dd");
  const isInPast = isBefore(date, today) || isEqual(date, today);
  const isAfterGoalStart = !isBefore(date, goalStartDate);

  let actual = isInPast && isAfterGoalStart ? (aggregatedActuals.get(dateStr) ?? null) : null;

  // Special handling for current period
  if (actual === null && latestActualValue !== null && isSamePeriod(date, today, period)) {
    actual = latestActualValue;
  }

  return actual;
}

/**
 * Detect if a date is a special boundary (start or end of goal)
 */
function getSpecialDateLabel(
  date: Date,
  goalStartDate: Date,
  goalDueDate: Date,
  period: TimePeriodOption
): string | null {
  // Check if this is the exact start date (and not already at period boundary)
  if (isEqual(format(date, "yyyy-MM-dd"), format(goalStartDate, "yyyy-MM-dd"))) {
    const startEndOfPeriod = getEndOfPeriod(goalStartDate, period);
    if (!isEqual(format(date, "yyyy-MM-dd"), format(startEndOfPeriod, "yyyy-MM-dd"))) {
      return "Start";
    }
  }

  // Check if this is the exact due date (and not already at period boundary)
  if (isEqual(format(date, "yyyy-MM-dd"), format(goalDueDate, "yyyy-MM-dd"))) {
    const dueEndOfPeriod = getEndOfPeriod(goalDueDate, period);
    if (!isEqual(format(date, "yyyy-MM-dd"), format(dueEndOfPeriod, "yyyy-MM-dd"))) {
      return "End";
    }
  }

  return null;
}

/**
 * Get the end-of-period date for a given date
 */
function getEndOfPeriod(date: Date, period: TimePeriodOption): Date {
  switch (period) {
    case "weeks":
      return endOfWeek(date);
    case "months":
      return endOfMonth(date);
    case "years":
    case "all":
      return endOfYear(date);
    default:
      return endOfMonth(date);
  }
}

/**
 * Add interpolation points between two dates to create smooth curves
 * This prevents straight line gaps between period boundaries and exact goal dates
 * 
 * @param lastPeriodDate - Last period-end date
 * @param nextDate - Next date (e.g., exact goal end)
 * @param maxGapDays - Maximum gap before adding interpolation (default: 2 days)
 * @returns Array of interpolated dates, or empty if gap is small enough
 */
function getInterpolationPoints(lastPeriodDate: Date, nextDate: Date, maxGapDays: number = 2): Date[] {
  const daysBetween = Math.floor((nextDate.getTime() - lastPeriodDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // If gap is small (1-2 days), just connect directly (looks fine visually)
  if (daysBetween <= maxGapDays) {
    return [];
  }
  
  // For larger gaps, add daily points to create smooth curve
  const interpolated: Date[] = [];
  let currentDate = addDays(lastPeriodDate, 1);
  
  while (isBefore(currentDate, nextDate)) {
    interpolated.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return interpolated;
}

// ============ HOOK ============
/**
 * Hook to fetch and calculate goal valuation history for the chart
 */
export function useGoalValuationHistory(
  goal: Goal | undefined,
  period: TimePeriodOption = "months"
): UseGoalValuationHistoryResult {
  const {
    data: allocations,
    isLoading: isLoadingAllocations,
    error: allocationsError,
  } = useQuery<GoalAllocation[], Error>({
    queryKey: [QueryKeys.GOALS_ALLOCATIONS],
    queryFn: getGoalsAllocation,
  });

  const allocatedAccountIds = useMemo(() => {
    if (!allocations || !goal) return [];
    return allocations
      .filter((alloc) => alloc.goalId === goal.id && alloc.allocatedPercent > 0)
      .map((alloc) => alloc.accountId);
  }, [allocations, goal]);

  const dateRange = useMemo((): DateRangeConfig | null => {
    if (!goal) return null;

    const today = new Date();
    let goalStartDate: Date;

    if (goal.startDate) {
      goalStartDate = parseISO(goal.startDate);
    } else {
      goalStartDate = new Date();
      goalStartDate.setFullYear(goalStartDate.getFullYear() - 1);
    }

    const dataStartDate = isAfter(goalStartDate, today) ? today : goalStartDate;
    const endDate = goal.dueDate ? parseISO(goal.dueDate) : new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    return {
      startDate: format(dataStartDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      goalStartDate: format(goalStartDate, "yyyy-MM-dd"),
    };
  }, [goal]);

  const {
    data: historicalValuations,
    isLoading: isLoadingValuations,
    error: valuationsError,
  } = useQuery<Map<string, AccountValuation[]>, Error>({
    queryKey: [QueryKeys.GOAL_VALUATION_HISTORY, goal?.id, allocatedAccountIds, dateRange],
    queryFn: async () => {
      if (allocatedAccountIds.length === 0 || !dateRange) return new Map();

      const valuationsMap = new Map<string, AccountValuation[]>();

      await Promise.all(
        allocatedAccountIds.map(async (accountId) => {
          const valuations = await getHistoricalValuations(
            accountId,
            dateRange.startDate,
            dateRange.endDate
          );
          valuationsMap.set(accountId, valuations);
        })
      );

      return valuationsMap;
    },
    enabled: allocatedAccountIds.length > 0 && !!dateRange,
  });

  const chartData = useMemo((): GoalChartDataPoint[] => {
    if (!goal || !dateRange) return [];

    const goalStartDate = parseISO(dateRange.goalStartDate);
    const endDate = parseISO(dateRange.endDate);
    const today = startOfDay(new Date());

    const isGoalInFuture = isAfter(goalStartDate, today);
    const goalDueDate = goal.dueDate ? parseISO(goal.dueDate) : endDate;

    const { displayStart, displayEnd } = calculateDisplayDateRange(
      period,
      isGoalInFuture ? goalStartDate : parseISO(dateRange.startDate),
      goalDueDate
    );

    let dateIntervals = generateDateIntervals(displayStart, displayEnd, period);

    // For "all" view, add the exact due date if not already included
    if (period === "all" && dateIntervals.length > 0) {
      const lastInterval = dateIntervals[dateIntervals.length - 1];
      const lastIntervalYear = format(lastInterval, "yyyy");
      const dueDateYear = format(goalDueDate, "yyyy");
      if (lastIntervalYear !== dueDateYear && !isAfter(goalDueDate, displayEnd)) {
        dateIntervals = [...dateIntervals, goalDueDate];
      }
    }

    // Add special boundary dates if they're not already period endpoints
    const specialDates: Date[] = [];
    
    // Add start date if it's not already in the intervals
    if (!dateIntervals.some((d) => isEqual(format(d, "yyyy-MM-dd"), format(goalStartDate, "yyyy-MM-dd")))) {
      if (!isBefore(goalStartDate, displayStart) && !isAfter(goalStartDate, displayEnd)) {
        specialDates.push(goalStartDate);
      }
    }

    // Add due date if it's not already in the intervals
    if (!dateIntervals.some((d) => isEqual(format(d, "yyyy-MM-dd"), format(goalDueDate, "yyyy-MM-dd")))) {
      if (!isBefore(goalDueDate, displayStart) && !isAfter(goalDueDate, displayEnd)) {
        specialDates.push(goalDueDate);
      }
    }

    dateIntervals = [...dateIntervals, ...specialDates];

    // Remove duplicates and sort
    const uniqueDates = Array.from(new Set(dateIntervals.map((d) => d.getTime())))
      .map((t) => new Date(t))
      .sort((a, b) => a.getTime() - b.getTime());
    dateIntervals = uniqueDates;

    // Add interpolation points only at the end (between last period and goal due date)
    // This prevents straight lines between period boundaries and exact goal dates
    // WITHOUT creating too many intermediate points
    if (dateIntervals.length > 0) {
      const lastPeriodDate = dateIntervals[dateIntervals.length - 1];
      
      // Only interpolate if goal due date is not already the last date
      if (!isEqual(format(lastPeriodDate, "yyyy-MM-dd"), format(goalDueDate, "yyyy-MM-dd"))) {
        const interpolation = getInterpolationPoints(lastPeriodDate, goalDueDate);
        dateIntervals = [...dateIntervals, ...interpolation];
      }
    }

    // Build allocation details map
    const allocationDetailsMap = buildAllocationDetailsMap(allocations, goal.id, dateRange.goalStartDate);

    // Calculate actual values
    const { actualValuesByDate, latestActualValue } = calculateActualValuesByDate(
      historicalValuations,
      allocationDetailsMap,
      dateRange.goalStartDate
    );

    const aggregatedActuals = aggregateValuationsByPeriod(actualValuesByDate, dateIntervals, period);

    // Update for current period in years/all view
    if ((period === "years" || period === "all") && latestActualValue !== null) {
      const currentYearKey = format(endOfYear(today), "yyyy-MM-dd");
      const existingValue = aggregatedActuals.get(currentYearKey);
      if (!existingValue || latestActualValue > existingValue) {
        aggregatedActuals.set(currentYearKey, latestActualValue);
      }
    }

    // Build chart data points
    const monthlyInvestment = goal.monthlyInvestment ?? 0;
    const annualReturnRate = goal.targetReturnRate ?? 0;

    // CRITICAL: Back-calculate daily investment to match target at due date
    // This ensures the projected line reaches the target amount at the goal's due date
    let dailyInvestment = monthlyInvestment / 30;
    
    if (goal.targetAmount > 0 && monthlyInvestment > 0 && annualReturnRate >= 0) {
      dailyInvestment = calculateDailyInvestment(
        0, // startValue - not using initial contributions in projection
        goal.targetAmount,
        annualReturnRate,
        goalStartDate,
        goalDueDate
      );
    }

    return dateIntervals.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const specialLabel = getSpecialDateLabel(date, goalStartDate, goalDueDate, period);

      // Calculate projected value
      // Important: This does NOT include initial contributions, only projected growth from investments
      const projected = calculateProjectedValueByDate(
        0, // startValue not included
        dailyInvestment,
        annualReturnRate,
        goalStartDate,
        date
      );

      const actual = getActualValue(date, today, goalStartDate, aggregatedActuals, latestActualValue, period);

      return {
        date: dateStr,
        dateLabel: formatDateLabel(date, period, specialLabel),
        projected: Math.round(projected * 100) / 100,
        actual: actual !== null ? Math.round(actual * 100) / 100 : null,
      };
    });
  }, [goal, dateRange, period, allocations, historicalValuations]);

  return {
    chartData,
    isLoading: isLoadingAllocations || isLoadingValuations,
    error: allocationsError || valuationsError,
  };
}
