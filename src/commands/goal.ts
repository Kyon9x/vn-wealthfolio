import { getRunEnv, invokeTauri, invokeWeb, logger, RUN_ENV } from "@/adapters";
import { newGoalSchema } from "@/lib/schemas";
import { Goal, GoalAllocation } from "@/lib/types";
import z from "zod";

// Form schema type (uses Date for date fields)
type NewGoalForm = z.infer<typeof newGoalSchema>;

// API input type (uses string for date fields, matching the backend)
export type NewGoalInput = Omit<NewGoalForm, "deadline"> & {
  deadline?: string;
};

export const getGoals = async (): Promise<Goal[]> => {
  try {
    switch (getRunEnv()) {
      case RUN_ENV.DESKTOP:
        return invokeTauri("get_goals");
      case RUN_ENV.WEB:
        return invokeWeb("get_goals");
      default:
        throw new Error(`Unsupported`);
    }
  } catch (error) {
    logger.error("Error fetching goals.");
    throw error;
  }
};

export const createGoal = async (goal: NewGoalInput): Promise<Goal> => {
  const newGoal = {
    ...goal,
    yearlyContribution: 0,
    goalType: "NEEDS",
    isAchieved: false,
  };
  try {
    switch (getRunEnv()) {
      case RUN_ENV.DESKTOP:
        return invokeTauri("create_goal", { goal: newGoal });
      case RUN_ENV.WEB:
        return invokeWeb("create_goal", { goal: newGoal });
      default:
        throw new Error(`Unsupported`);
    }
  } catch (error) {
    logger.error("Error creating goal.");
    throw error;
  }
};

export const updateGoal = async (goal: Goal): Promise<Goal> => {
  try {
    switch (getRunEnv()) {
      case RUN_ENV.DESKTOP:
        return invokeTauri("update_goal", { goal });
      case RUN_ENV.WEB:
        return invokeWeb("update_goal", { goal });
      default:
        throw new Error(`Unsupported`);
    }
  } catch (error) {
    logger.error("Error updating goal.");
    throw error;
  }
};

export const deleteGoal = async (goalId: string): Promise<void> => {
  try {
    switch (getRunEnv()) {
      case RUN_ENV.DESKTOP:
        await invokeTauri("delete_goal", { goalId });
        return;
      case RUN_ENV.WEB:
        await invokeWeb("delete_goal", { goalId });
        return;
      default:
        throw new Error(`Unsupported`);
    }
  } catch (error) {
    logger.error("Error deleting goal.");
    throw error;
  }
};

export const updateGoalsAllocations = async (allocations: GoalAllocation[]): Promise<void> => {
  try {
    switch (getRunEnv()) {
      case RUN_ENV.DESKTOP:
        await invokeTauri("update_goal_allocations", { allocations });
        return;
      case RUN_ENV.WEB:
        await invokeWeb("update_goal_allocations", { allocations });
        return;
      default:
        throw new Error(`Unsupported`);
    }
  } catch (error) {
    logger.error("Error saving goals allocations.");
    throw error;
  }
};

export const getGoalsAllocation = async (): Promise<GoalAllocation[]> => {
  try {
    switch (getRunEnv()) {
      case RUN_ENV.DESKTOP:
        return invokeTauri("load_goals_allocations");
      case RUN_ENV.WEB:
        return invokeWeb("load_goals_allocations");
      default:
        throw new Error(`Unsupported`);
    }
  } catch (error) {
    logger.error("Error fetching goals allocations.");
    throw error;
  }
};
