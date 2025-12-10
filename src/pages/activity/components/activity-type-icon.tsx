
import { ActivityType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
    ArrowDownLeft,
    ArrowLeftFromLine,
    ArrowRightLeft,
    ArrowRightToLine,
    ArrowUpRight,
    Banknote,
    CircleDollarSign,
    HandCoins,
    Landmark,
    LucideIcon,
    MinusCircle,
    Percent,
    PlusCircle,
    Receipt,
    Split,
    Wallet,
} from "lucide-react";

export const ActivityIcons: Record<ActivityType, LucideIcon> = {
  // Trading
  [ActivityType.BUY]: ArrowDownLeft,
  [ActivityType.SELL]: ArrowUpRight,

  // Income
  [ActivityType.DIVIDEND]: HandCoins,
  [ActivityType.INTEREST]: Percent,

  // Cash
  [ActivityType.DEPOSIT]: Wallet,
  // Fallback to CircleDollarSign if Banknote implies cash specifically, but Banknote is good for spending/withdrawal
  [ActivityType.WITHDRAWAL]: Banknote,

  // Holdings Management
  [ActivityType.ADD_HOLDING]: PlusCircle,
  [ActivityType.REMOVE_HOLDING]: MinusCircle,

  // Transfers
  [ActivityType.TRANSFER_IN]: ArrowRightToLine,
  [ActivityType.TRANSFER_OUT]: ArrowLeftFromLine,
  [ActivityType.TRANSFER]: ArrowRightLeft,

  // Costs
  [ActivityType.FEE]: Receipt,
  [ActivityType.TAX]: Landmark,

  // Corporate Actions
  [ActivityType.SPLIT]: Split,
};

interface ActivityTypeIconProps {
  type: ActivityType;
  className?: string;
}

export function ActivityTypeIcon({ type, className }: ActivityTypeIconProps) {
  // Fallback to CircleDollarSign if type is missing
  const Icon = ActivityIcons[type] || CircleDollarSign;

  return <Icon className={cn("size-4", className)} strokeWidth={2} />;
}
