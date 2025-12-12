import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Icons, MoneyInput, DatePickerInput } from "@wealthvn/ui";

import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { newGoalSchema } from "@/lib/schemas";
import { useGoalMutations } from "@/pages/goals/use-goal-mutations";

// Infer type from schema (input type = works with Date)
type NewGoal = z.infer<typeof newGoalSchema>;

interface GoalFormProps {
  defaultValues?: Partial<NewGoal>;
  onSuccess?: () => void;
}

export function GoalForm({ defaultValues, onSuccess = () => undefined }: GoalFormProps) {
  const { t } = useTranslation("settings");
  const { addGoalMutation, updateGoalMutation } = useGoalMutations();

  const form = useForm<NewGoal>({
    resolver: zodResolver(newGoalSchema),
    defaultValues: {
      id: defaultValues?.id,
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      targetAmount: defaultValues?.targetAmount || 0,
      targetReturnRate: defaultValues?.targetReturnRate,
      dueDate: defaultValues?.dueDate,
      monthlyInvestment: defaultValues?.monthlyInvestment,
      isAchieved: defaultValues?.isAchieved || false,
    },
  });

  function onSubmit(data: NewGoal) {
    const { id, ...rest } = data;
    if (id) {
      return updateGoalMutation.mutate({ id, ...rest }, { onSuccess });
    }
    return addGoalMutation.mutate(rest, { onSuccess });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? t("goals.form.updateTitle") : t("goals.form.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {defaultValues?.id ? t("goals.form.updateDescription") : t("goals.form.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hidden ID field */}
          <input type="hidden" name="id" />

          {/* Goal Name - Full Width */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("goals.form.fields.title.label")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("goals.form.fields.title.placeholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Target Amount and Due Date - 2 Column Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("goals.form.fields.targetAmount.label")}</FormLabel>
                  <FormControl>
                    <MoneyInput
                      placeholder={t("goals.form.fields.targetAmount.placeholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <DatePickerInput
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Investment Plan Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Icons.HandCoins className="text-primary h-5 w-5" />
              <h3 className="text-foreground text-lg font-medium">
                {t("goals.form.fields.investmentPlan.title")}
              </h3>
            </div>

            <div className="bg-muted/50 border-border space-y-4 rounded-lg border p-4">
              {/* Monthly Investment (DCA) */}
              <FormField
                control={form.control}
                name="monthlyInvestment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Investment (DCA)</FormLabel>
                    <FormControl>
                      <MoneyInput
                        placeholder="e.g., 1,000"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Regular monthly investment amount for Dollar Cost Averaging
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Return Rate */}
              <FormField
                control={form.control}
                name="targetReturnRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("goals.form.fields.targetReturnRate.label")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder={t("goals.form.fields.targetReturnRate.placeholder")}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : parseFloat(value));
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="pr-16"
                        />
                        <span className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                          {t("goals.form.fields.targetReturnRate.suffix")}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t("goals.form.fields.targetReturnRate.hint")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Goal Achieved Toggle - Only show in edit mode */}
          {defaultValues?.id ? (
            <FormField
              control={form.control}
              name="isAchieved"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="mt-0!">
                    {t("goals.form.fields.isAchieved.label")}
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <DialogTrigger asChild>
            <Button variant="outline">{t("goals.form.buttons.cancel")}</Button>
          </DialogTrigger>
          <Button type="submit">
            <Icons.Save className="mr-2 h-4 w-4" />
            <span>
              {defaultValues?.id ? t("goals.form.buttons.update") : t("goals.form.buttons.add")}
            </span>
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
