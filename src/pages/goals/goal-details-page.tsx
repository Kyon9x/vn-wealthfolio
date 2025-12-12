import { getGoals, getGoalsAllocation } from "@/commands/goal";
import { useAccounts } from "@/hooks/use-accounts";
import { QueryKeys } from "@/lib/query-keys";
import type { Goal, GoalAllocation } from "@/lib/types";
import { formatTimeRemaining } from "@/lib/date-utils";
import { useQuery } from "@tanstack/react-query";
import { Button, formatAmount, Icons, Page, Skeleton } from "@wealthvn/ui";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import GoalsAllocations from "./components/goal-allocations";
import { GoalEditModal } from "./components/goal-edit-modal";
import { useGoalMutations } from "./use-goal-mutations";
import { useGoalProgress } from "./use-goal-progress";

export default function GoalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: goals, isLoading: isGoalsLoading } = useQuery<Goal[], Error>({
    queryKey: [QueryKeys.GOALS],
    queryFn: getGoals,
  });

  const { data: allocations, isLoading: isAllocationsLoading } = useQuery<GoalAllocation[], Error>({
    queryKey: [QueryKeys.GOALS_ALLOCATIONS],
    queryFn: getGoalsAllocation,
  });

  const { accounts } = useAccounts();
  const [visibleModal, setVisibleModal] = useState(false);
  const { saveAllocationsMutation } = useGoalMutations();
  const { getGoalProgress } = useGoalProgress(goals);

  const goal = goals?.find((g) => g.id === id);
  const goalProgress = id ? getGoalProgress(id) : undefined;

  if (isGoalsLoading || isAllocationsLoading) {
    return (
      <Page className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </Page>
    );
  }

  if (!goal) {
    return (
      <Page className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Goal not found</h1>
        <Button onClick={() => navigate("/goals")}>Back to Goals</Button>
      </Page>
    );
  }

  // Get actual values from hook instead of mocked data
  const currentAmount = goalProgress?.currentValue ?? 0;
  const progress = goalProgress?.progress ?? 0;

  const chartData = [
    { name: 'Jan', projected: goal.targetAmount * 0.1, actual: goal.targetAmount * 0.1 },
    { name: 'Feb', projected: goal.targetAmount * 0.15, actual: goal.targetAmount * 0.14 },
    { name: 'Mar', projected: goal.targetAmount * 0.2, actual: goal.targetAmount * 0.19 },
    { name: 'Apr', projected: goal.targetAmount * 0.25, actual: goal.targetAmount * 0.22 },
    { name: 'May', projected: goal.targetAmount * 0.3, actual: goal.targetAmount * 0.28 },
    { name: 'Jun', projected: goal.targetAmount * 0.35, actual: null },
    { name: 'Jul', projected: goal.targetAmount * 0.40, actual: null },
    { name: 'Aug', projected: goal.targetAmount * 0.45, actual: null },
  ];

  const handleAddAllocation = (allocationData: GoalAllocation[]) => {
    saveAllocationsMutation.mutate(allocationData);
  };

  return (
    <Page className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-foreground font-mono text-2xl font-bold">
            Goals Detail: {goal.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Review progress and configure your "{goal.title}" investment goal.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setVisibleModal(true)}>
            <Icons.Pencil className="mr-2 h-4 w-4" />
            Edit Goal
          </Button>
          <Button onClick={() => navigate("/goals")}>
            <Icons.ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Top Card */}
      <div className="bg-card border-border flex flex-col justify-between rounded-xl border p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full">
            <Icons.Goal className="text-primary h-8 w-8" />
          </div>
          <div>
            <h2 className="text-foreground text-xl font-bold">{goal.title}</h2>
            <p className="text-muted-foreground text-sm">Target Amount</p>
          </div>
        </div>
        <div className="mt-4 text-right md:mt-0">
          <div className="text-primary font-mono text-3xl font-bold">
            {formatAmount(goal.targetAmount, "USD", false)}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Current Progress: <span className="text-foreground font-bold">{progress.toFixed(1)}%</span>
            {" • "}
            {formatAmount(currentAmount, "USD", false)}
          </p>
        </div>
      </div>

      {/* Chart & Stats Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-card border-border lg:col-span-2 rounded-xl border p-6 shadow-sm">
          <h3 className="text-foreground mb-6 text-lg font-bold">Growth Projection</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#colorProjected)"
                    name="Projected"
                />
                <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorActual)"
                    name="Actual"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
            <div className="bg-card border-border rounded-xl border p-4">
                <div className="text-muted-foreground mb-1 text-xs">Monthly Investment (DCA)</div>
                <div className="text-foreground font-mono text-xl font-bold">
                  {goal.monthlyInvestment ? formatAmount(goal.monthlyInvestment, "USD", false) : "Not set"}
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Regular monthly investment
                </div>
            </div>
            <div className="bg-card border-border rounded-xl border p-4">
                <div className="text-muted-foreground mb-1 text-xs">Target Return Rate</div>
                <div className="text-foreground font-mono text-xl font-bold">
                  {goal.targetReturnRate ? `${goal.targetReturnRate}%` : "Not set"}
                  <span className="text-muted-foreground text-xs font-normal">/ year</span>
                </div>
            </div>
             <div className="bg-card border-border rounded-xl border p-4">
                 <div className="text-muted-foreground mb-1 text-xs">Time Remaining</div>
                 <div className="text-foreground font-mono text-xl font-bold">
                   {formatTimeRemaining(goal.dueDate)}
                 </div>
             </div>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="mb-8">
        <h3 className="text-foreground mb-2 text-xl font-bold">Allocations</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Click on a cell to specify the percentage of each account's allocation to this goal.
        </p>
        <GoalsAllocations
            goals={[goal]} // Only pass this goal
            existingAllocations={allocations || []}
            accounts={accounts || []}
            onSubmit={handleAddAllocation}
        />
      </div>

      <GoalEditModal
        goal={goal}
        open={visibleModal}
        onClose={() => setVisibleModal(false)}
      />
    </Page>
  );
}
