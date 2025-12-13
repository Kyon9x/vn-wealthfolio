import { getGoals, getGoalsAllocation } from "@/commands/goal";
import { MetricDisplay } from "@/components/metric-display";
import { useAccounts } from "@/hooks/use-accounts";
import { formatTimeRemaining } from "@/lib/date-utils";
import { QueryKeys } from "@/lib/query-keys";
import type { Goal, GoalAllocation } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { AnimatedToggleGroup, Button, formatAmount, Icons, Page, Skeleton } from "@wealthvn/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GoalsAllocations from "./components/goal-allocations";
import { GoalEditModal } from "./components/goal-edit-modal";
import { isGoalOnTrack } from "./lib/goal-utils";
import { useGoalMutations } from "./use-goal-mutations";
import { useGoalProgress } from "./use-goal-progress";
import { TimePeriodOption, useGoalValuationHistory } from "./use-goal-valuation-history";

const TIME_PERIOD_OPTIONS = [
  { value: "weeks" as const, label: "Weeks" },
  { value: "months" as const, label: "Months" },
  { value: "years" as const, label: "Years" },
  { value: "all" as const, label: "All Time" },
];

export default function GoalDetailsPage() {
  const { t } = useTranslation("goals");
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
  const [timePeriod, setTimePeriod] = useState<TimePeriodOption>("months");
  const { saveAllocationsMutation } = useGoalMutations();
  const { getGoalProgress } = useGoalProgress(goals);

  const goal = goals?.find((g) => g.id === id);
  const goalProgress = id ? getGoalProgress(id) : undefined;

  // Use the new hook for chart data
  const { chartData, isLoading: isChartLoading } = useGoalValuationHistory(goal, timePeriod);

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
        <h1 className="text-2xl font-bold">{t("notFound")}</h1>
        <Button onClick={() => navigate("/goals")}>{t("backToGoals")}</Button>
      </Page>
    );
  }

  // Get actual values from hook instead of mocked data
  const currentAmount = goalProgress?.currentValue ?? 0;
  const progress = goalProgress?.progress ?? 0;

  // Get projected future value (last value in chart data)
  const projectedFutureValue = chartData.length > 0 ? chartData[chartData.length - 1]?.projected ?? 0 : 0;

  // Get projected value at today's date for on-track determination
  // Find the closest data point to today (since we use end-of-period dates)
  const today = new Date();
  const todayDateStr = today.toISOString().split("T")[0];
  let projectedValueToday = currentAmount;
  
  if (chartData.length > 0) {
    // Find the first data point that is today or in the future
    const nextDataPoint = chartData.find((d) => {
      const dataDate = new Date(d.date);
      return dataDate >= today;
    });
    projectedValueToday = nextDataPoint?.projected ?? projectedFutureValue;
  }

  // Determine if goal is on track: currentAmount >= projectedValueToday
  const onTrack = isGoalOnTrack(currentAmount, projectedValueToday);
  const actualColor = onTrack ? "var(--chart-actual-on-track)" : "var(--chart-actual-off-track)";

  const handleAddAllocation = (allocationData: GoalAllocation[]) => {
    saveAllocationsMutation.mutate(allocationData);
  };

  // Format tooltip value
  const formatTooltipValue = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return formatAmount(value, "USD", false);
  };

  return (
    <Page className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-foreground font-mono text-2xl font-bold">
            {t("details.title", { title: goal.title })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("details.description", { title: goal.title })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setVisibleModal(true)}>
            <Icons.Pencil className="mr-2 h-4 w-4" />
            {t("details.editGoal")}
          </Button>
          <Button onClick={() => navigate("/goals")}>
            <Icons.ArrowLeft className="mr-2 h-4 w-4" />
            {t("details.back")}
          </Button>
        </div>
      </div>



      {/* Chart & Stats Grid - Account Page Layout */}
      <div className="grid grid-cols-1 gap-4 pt-0 md:grid-cols-3">
        {/* Chart Card - 2 columns on desktop */}
        <div className="col-span-1 rounded-xl border border-border bg-card shadow-sm md:col-span-2">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-foreground text-lg font-bold">{t("details.chart.growthProjection")}</h3>
            <AnimatedToggleGroup
              items={TIME_PERIOD_OPTIONS}
              value={timePeriod}
              onValueChange={(value) => setTimePeriod(value as TimePeriodOption)}
              variant="secondary"
              size="sm"
            />
          </div>
          <div className="p-0">
            <div className="h-[480px] w-full">
              {isChartLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                  <Icons.TrendingUp className="mb-2 h-12 w-12 opacity-50" />
                  <p>{t("details.chart.noData")}</p>
                  <p className="text-sm">{t("details.chart.noDataDescription")}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-projected)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--chart-projected)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={actualColor} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={actualColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      minTickGap={20}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      tickFormatter={(value) => {
                        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                      width={60}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        backgroundColor: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        padding: "12px",
                      }}
                      formatter={(value, name) => [
                        formatTooltipValue(typeof value === "number" ? value : null),
                        name === "projected" ? t("details.chart.projectedGrowth") : t("details.chart.actualValue"),
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) =>
                        value === "projected" ? t("details.chart.projectedGrowth") : t("details.chart.actualValue")
                      }
                      wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="var(--chart-projected)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#colorProjected)"
                      name="projected"
                      connectNulls
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke={actualColor}
                      strokeWidth={2}
                      fill="url(#colorActual)"
                      name="actual"
                      connectNulls
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Info Card - 1 column on desktop */}
        <div className="col-span-1 rounded-xl border border-border bg-card shadow-sm flex flex-col">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-foreground text-lg font-bold">{t("details.overview.title")}</h3>
          </div>
          <div className="p-6 space-y-6 flex-1 flex flex-col">
            {/* Target Amount & Progress */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-border">
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-muted-foreground text-xs font-mono mb-1">{t("details.overview.targetAmount")}</p>
                  <p className="font-mono text-2xl font-bold" style={{ color: "var(--chart-projected)" }}>
                    {formatAmount(goal.targetAmount, "USD", false)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">{t("details.overview.currentProgress")}</p>
                  <p className="font-mono text-sm font-medium">
                    <span className="font-bold" style={{ color: actualColor }}>{progress.toFixed(1)}%</span> - <span style={{ color: actualColor }}>{formatAmount(currentAmount, "USD", false)}</span>
                  </p>
                </div>
              </div>
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icons.Goal className="text-primary h-6 w-6" />
              </div>
            </div>

            {/* Metrics Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <MetricDisplay
                label={t("details.metrics.monthlyInvestmentDCA")}
                value={undefined}
                className="border-muted/30 bg-muted/30 rounded-md border"
                labelComponent={
                  <div className="text-muted-foreground flex w-full flex-col items-center justify-center text-xs space-y-2">
                    <span className="text-center">{t("details.metrics.monthlyInvestment")}</span>
                    <span className="text-foreground font-mono font-bold text-sm">
                      {goal.monthlyInvestment
                        ? formatAmount(goal.monthlyInvestment, "USD", false)
                        : t("details.metrics.notSet")}
                    </span>
                  </div>
                }
              />
              <MetricDisplay
                label={t("details.metrics.targetReturnRate")}
                value={goal.targetReturnRate ? goal.targetReturnRate / 100 : 0}
                isPercentage={true}
                className="border-muted/30 bg-muted/30 rounded-md border"
              />
              <MetricDisplay
                label={t("details.metrics.timeRemaining")}
                value={undefined}
                className="border-muted/30 bg-muted/30 rounded-md border"
                labelComponent={
                  <div className="text-muted-foreground flex w-full flex-col items-center justify-center text-xs space-y-2">
                    <span className="text-center">{t("details.metrics.timeRemaining")}</span>
                    <span className="text-foreground font-mono font-bold text-sm">
                      {formatTimeRemaining(goal.dueDate)}
                    </span>
                  </div>
                }
              />
              <MetricDisplay
                label={t("details.metrics.projectedFutureValue")}
                value={undefined}
                className="border-muted/30 bg-muted/30 rounded-md border"
                labelComponent={
                  <div className="text-muted-foreground flex w-full flex-col items-center justify-center text-xs space-y-2">
                    <span className="text-center">{t("details.metrics.projectedFutureValue")}</span>
                    <span className="font-mono font-bold text-sm" style={{ color: "var(--chart-projected)" }}>
                      {formatAmount(projectedFutureValue, "USD", false)}
                    </span>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="mb-8">
        <h3 className="text-foreground mb-2 text-xl font-bold">{t("details.allocations.title")}</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {t("details.allocations.description")}
        </p>
        <GoalsAllocations
          goals={[goal]} // Only pass this goal
          existingAllocations={allocations || []}
          accounts={accounts || []}
          onSubmit={handleAddAllocation}
          readOnly={true}
        />
      </div>

      <GoalEditModal goal={goal} open={visibleModal} onClose={() => setVisibleModal(false)} />
    </Page>
  );
}
