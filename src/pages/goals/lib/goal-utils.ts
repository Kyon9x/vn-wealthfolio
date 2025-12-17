import { getMonthsDiff } from "@/lib/date-utils";
import type { Goal } from "@/lib/types";
import { format, isAfter, parseISO } from "date-fns";

/**
 * Calculate projected value using compound interest formula with regular contributions (MONTHLY compounding)
 * FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]
 *
 * @param startValue - Initial principal (starting allocation)
 * @param monthlyInvestment - Monthly contribution (PMT)
 * @param annualReturnRate - Annual return rate as percentage (e.g., 7 for 7%)
 * @param monthsFromStart - Number of months from goal start date
 * @returns Future value with monthly compound interest
 */
export function calculateProjectedValue(
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
 * Calculate the number of days between two dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates
 */
export function getDaysDiff(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate projected value using compound interest with DAILY compounding (more precise)
 * FV = PV × (1 + r)^n + PMT_daily × [((1 + r)^n - 1) / r]
 *
 * Where daily investment is back-calculated to match target at goal due date.
 * For current date projections, uses the monthly-equivalent daily investment.
 *
 * @param startValue - Initial principal (starting allocation)
 * @param monthlyInvestment - Monthly contribution (used to derive daily)
 * @param annualReturnRate - Annual return rate as percentage (e.g., 7 for 7%)
 * @param startDate - Goal start date
 * @param currentDate - Date to calculate projected value for
 * @returns Future value with daily compound interest
 */
export function calculateProjectedValueByDate(
  startValue: number,
  monthlyInvestment: number,
  annualReturnRate: number,
  startDate: Date,
  currentDate: Date,
): number {
  const daysFromStart = getDaysDiff(startDate, currentDate);

  if (daysFromStart <= 0) return startValue;

  // Convert monthly investment to daily equivalent (approximate: month = 30 days)
  const dailyInvestment = monthlyInvestment / 30;

  const dailyRate = annualReturnRate / 100 / 365;

  if (dailyRate === 0) {
    return startValue + dailyInvestment * daysFromStart;
  }

  const compoundFactor = Math.pow(1 + dailyRate, daysFromStart);
  const futurePV = startValue * compoundFactor;
  const futureContributions = dailyInvestment * ((compoundFactor - 1) / dailyRate);

  return futurePV + futureContributions;
}

/**
 * Determines if a goal is on track by comparing actual vs projected value
 * On track: currentValue >= projectedValue (at current time)
 * Off track: currentValue < projectedValue (at current time)
 *
 * @param currentValue - Current actual value of the goal
 * @param projectedValue - Projected value at current date
 * @returns true if on track, false if off track
 */
export function isGoalOnTrack(currentValue: number, projectedValue: number): boolean {
  return currentValue >= projectedValue;
}

/**
 * Determines if a goal is on track with daily precision
 * Uses daily compounding for more accurate projection
 *
 * @param currentValue - Current actual value of the goal
 * @param startValue - Initial principal
 * @param monthlyInvestment - Monthly contribution
 * @param annualReturnRate - Annual return rate as percentage
 * @param startDate - Goal start date
 * @returns true if on track, false if off track
 */
export function isGoalOnTrackByDate(
  currentValue: number,
  startValue: number,
  monthlyInvestment: number,
  annualReturnRate: number,
  startDate: Date,
): boolean {
  const today = new Date();
  const projectedValue = calculateProjectedValueByDate(
    startValue,
    monthlyInvestment,
    annualReturnRate,
    startDate,
    today,
  );
  return currentValue >= projectedValue;
}

/**
 * Checks if a goal is scheduled for the future (hasn't started yet)
 */
export function isGoalScheduled(goal: Goal): boolean {
  if (!goal.startDate) return false;
  const startDate = parseISO(goal.startDate);
  return isAfter(startDate, new Date());
}

/**
 * Gets the display status for a goal (for UI rendering)
 */
export function getGoalStatus(goal: Goal, isOnTrack: boolean) {
  if (goal.isAchieved) {
    return {
      text: "Done",
      colorClass: "text-success", // Will use CSS variable
      statusText: "Completed",
      statusClass: "text-success bg-success/10",
    };
  }

  // Check if goal is scheduled for the future
  if (isGoalScheduled(goal)) {
    const startDate = parseISO(goal.startDate!);
    return {
      text: "Scheduled",
      colorClass: "text-muted-foreground",
      statusText: `Starts ${format(startDate, "MMM d, yyyy")}`,
      statusClass: "text-muted-foreground bg-muted/10",
    };
  }

  if (isOnTrack) {
    return {
      text: "On track",
      colorClass: "text-chart-actual-on-track", // Will use CSS variable
      statusText: "Ongoing",
      statusClass: "text-primary bg-primary/10",
    };
  }

  return {
    text: "Off track",
    colorClass: "text-chart-actual-off-track", // Will use CSS variable
    statusText: "Ongoing",
    statusClass: "text-primary bg-primary/10",
  };
}
