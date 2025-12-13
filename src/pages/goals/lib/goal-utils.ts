import type { Goal } from "@/lib/types";
import { format, isAfter, parseISO } from "date-fns";

/**
 * Determines if a goal is on track by comparing actual vs projected value
 * On track: currentValue >= projectedValue (at current time)
 * Off track: currentValue < projectedValue (at current time)
 */
export function isGoalOnTrack(currentValue: number, projectedValue: number): boolean {
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
