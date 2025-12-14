import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Account, Goal, GoalAllocation } from "@/lib/types";
import { formatAmount } from "@wealthvn/ui";
import { useState } from "react";
import { toast } from "sonner";

interface EditAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  accounts: Account[];
  currentAccountValues: Map<string, number>;
  existingAllocations?: GoalAllocation[]; // Current goal's allocations (for prefilling)
  allAllocations?: GoalAllocation[]; // All allocations for calculation
  onSubmit: (allocations: GoalAllocation[]) => Promise<void>;
}

export function EditAllocationModal({
  open,
  onOpenChange,
  goal,
  accounts,
  currentAccountValues,
  existingAllocations = [],
  allAllocations = [],
  onSubmit,
}: EditAllocationModalProps) {
  const [allocations, setAllocations] = useState<Record<string, { amount: number; percentage: number }>>({});
  const [availableBalances, setAvailableBalances] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Calculate available balances when modal opens
  // Available = Unallocated from other goals + Current goal's allocation for this account
  const calculateAvailableBalances = () => {
    const balances: Record<string, number> = {};

    console.log("[Modal] Calculating available balances...");
    console.log("[Modal] accounts:", accounts);
    console.log("[Modal] currentAccountValues Map:", currentAccountValues);
    console.log("[Modal] existingAllocations:", existingAllocations);
    console.log("[Modal] allAllocations:", allAllocations);

    for (const account of accounts) {
      const currentValue = currentAccountValues.get(account.id) || 0;
      console.log(`[Modal] Account ${account.id} (${account.name}): value=${currentValue}`);

      // Sum allocations for this account from OTHER goals (not this goal)
      const allocatedToOtherGoals = allAllocations.reduce((sum, alloc) => {
        if (alloc.accountId === account.id && alloc.goalId !== goal.id) {
          return sum + alloc.allocationAmount;
        }
        return sum;
      }, 0);

      // Available = Current value - Allocated to other goals
      // This gives us the max amount that can be allocated to this goal
      balances[account.id] = Math.max(0, currentValue - allocatedToOtherGoals);
    }

    setAvailableBalances(balances);
  };

  // Handle modal open
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      calculateAvailableBalances();

      // Prefill allocations with existing goal allocations
      const prefilledAllocations: Record<string, { amount: number; percentage: number }> = {};
      for (const account of accounts) {
        const currentValue = currentAccountValues.get(account.id) || 0;

        // Find existing allocation for this account in this goal
        const existingAlloc = existingAllocations.find(
          (alloc) => alloc.accountId === account.id
        );

        if (existingAlloc) {
          // Prefill with existing allocation values
          prefilledAllocations[account.id] = {
            amount: existingAlloc.allocationAmount,
            percentage: existingAlloc.allocationPercentage ||
              (currentValue > 0 ? (existingAlloc.allocationAmount / currentValue) * 100 : 0),
          };
        }
      }

      setAllocations(prefilledAllocations);
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  // Handle amount change
  const handleAmountChange = (accountId: string, value: number) => {
    const currentValue = currentAccountValues.get(accountId) || 0;
    const percentage = currentValue > 0 ? (value / currentValue) * 100 : 0;

    setAllocations((prev) => ({
      ...prev,
      [accountId]: {
        amount: value,
        percentage: Math.round(percentage * 100) / 100,
      },
    }));
    setErrors((prev) => ({ ...prev, [accountId]: "" }));
  };

  // Handle percentage change
  const handlePercentageChange = (accountId: string, value: number) => {
    const currentValue = currentAccountValues.get(accountId) || 0;
    const amount = (value / 100) * currentValue;

    setAllocations((prev) => ({
      ...prev,
      [accountId]: {
        amount: Math.round(amount * 100) / 100,
        percentage: value,
      },
    }));
    setErrors((prev) => ({ ...prev, [accountId]: "" }));
  };

  // Validate form
  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    for (const account of accounts) {
      const alloc = allocations[account.id];
      if (!alloc || (alloc.amount === 0 && alloc.percentage === 0)) continue;

      // Validate amount
      if (alloc.amount <= 0) {
        newErrors[account.id] = "Amount must be greater than 0";
        continue;
      }

      // Validate percentage
      if (alloc.percentage <= 0 || alloc.percentage > 100) {
        newErrors[account.id] = "Percentage must be between 0 and 100";
        continue;
      }

      // Check available balance (includes current goal's existing allocation)
      const available = availableBalances[account.id] || 0;
      if (alloc.amount > available) {
        newErrors[account.id] = `Amount exceeds available balance (${formatAmount(available, "USD", false)})`;
        continue;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!(await validateForm())) {
      return;
    }

    setIsLoading(true);
    try {
      const newAllocations: GoalAllocation[] = [];
      const allocationDate = new Date().toISOString().split("T")[0];

      for (const account of accounts) {
        const alloc = allocations[account.id];
        if (!alloc || (alloc.amount === 0 && alloc.percentage === 0)) continue;

        newAllocations.push({
          id: `${goal.id}-${account.id}-${Date.now()}`,
          goalId: goal.id,
          accountId: account.id,
          percentAllocation: Math.round(alloc.percentage),
          allocationAmount: alloc.amount,
          allocationPercentage: alloc.percentage,
          initAmount: alloc.amount,
          allocationDate,
          startDate: allocationDate,
        } as GoalAllocation);
      }

      await onSubmit(newAllocations);
      handleOpenChange(false);
      toast.success("Allocations Updated", {
        description: `Updated allocations for ${goal.title}`,
      });
    } catch (err) {
      toast.error("Failed to update allocations", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Allocations for {goal.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Allocations Table */}
          <div className="relative overflow-x-auto rounded-md border">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-muted">
                  <th className="sticky left-0 z-10 px-4 py-3 text-left text-sm font-semibold">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Available Balance
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Initial Contribution
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Allocation (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const alloc = allocations[account.id];
                  const available = availableBalances[account.id];
                  const hasError = errors[account.id];

                  return (
                    <tr key={account.id} className="border-t">
                      <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 font-medium text-sm">
                        {account.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-muted-foreground">
                          {formatAmount(available ?? 0, "USD", false)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={alloc?.amount ?? ""}
                          onChange={(e) =>
                            handleAmountChange(account.id, Number(e.target.value))
                          }
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          disabled={isLoading}
                          className={`w-32 ${hasError ? "border-red-500" : ""}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={alloc?.percentage ?? ""}
                          onChange={(e) =>
                            handlePercentageChange(account.id, Number(e.target.value))
                          }
                          placeholder="0"
                          step="0.1"
                          min="0"
                          max="100"
                          disabled={isLoading}
                          className={`w-24 ${hasError ? "border-red-500" : ""}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Error messages */}
          {Object.entries(errors).map(([accountId, error]) => {
            const account = accounts.find((a) => a.id === accountId);
            return (
              error && (
                <div key={accountId} className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">{account?.name}:</span> {error}
                  </p>
                </div>
              )
            );
          })}

          {/* Summary */}
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-900">Summary</p>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              {accounts.map((account) => {
                const alloc = allocations[account.id];
                if (!alloc || (alloc.amount === 0 && alloc.percentage === 0)) return null;
                return (
                  <div key={account.id} className="flex justify-between">
                    <span>{account.name}:</span>
                    <span>
                      {formatAmount(alloc.amount, "USD", false)} ({alloc.percentage.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Allocations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
