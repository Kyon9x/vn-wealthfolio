import { TickerAvatar } from "@/components/ticker-avatar";
import type { OpenPosition } from "@/pages/trading/types";
import {
  Badge,
  DataTable,
  GainAmount,
  GainPercent,
} from "@wealthfolio/ui";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface OpenTradesTableProps {
  positions: OpenPosition[];
  showFilters?: boolean;
  showSearch?: boolean;
}

export function OpenTradesTable({ positions, showFilters = true, showSearch = true }: OpenTradesTableProps) {
  const { t } = useTranslation("trading");
  
  console.log('[OpenTradesTable] props:', { showFilters, showSearch });

  // Get unique accounts for filter
  const uniqueAccounts = useMemo(() => {
    const accountMap = new Map<string, string>();
    positions.forEach((pos) => {
      if (!accountMap.has(pos.accountId)) {
        accountMap.set(pos.accountId, pos.accountName);
      }
    });
    return Array.from(accountMap.entries()).map(([id, name]) => ({
      value: id,
      label: name,
    }));
  }, [positions]);

  const columns: ColumnDef<OpenPosition>[] = useMemo(
    () => [
      {
        id: "avatar",
        cell: ({ row }) => <TickerAvatar symbol={row.original.symbol} className="h-8 w-8" />,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "symbol",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("components.openTrades.table.symbol")} />
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.symbol}</div>
            {row.original.assetName && (
              <div
                className="text-muted-foreground max-w-[120px] truncate text-xs"
                title={row.original.assetName}
              >
                {row.original.assetName}
              </div>
            )}
          </div>
        ),
        enableHiding: false,
      },
      {
        id: "account",
        accessorFn: (row) => row.accountId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("components.openTrades.table.account")} />
        ),
        cell: ({ row }) => row.original.accountName,
        filterFn: "arrIncludesSome",
        enableHiding: true,
      },
      {
        accessorKey: "quantity",
        header: ({ column }) => (
          <DataTableColumnHeader
            className="justify-end"
            column={column}
            title={t("components.openTrades.table.quantity")}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">{row.original.quantity.toLocaleString()}</div>
        ),
      },
      {
        accessorKey: "averageCost",
        header: ({ column }) => (
          <DataTableColumnHeader
            className="justify-end"
            column={column}
            title={t("components.openTrades.table.avgCost")}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.averageCost.toLocaleString("en-US", {
              style: "currency",
              currency: row.original.currency,
            })}
          </div>
        ),
      },
      {
        accessorKey: "currentPrice",
        header: ({ column }) => (
          <DataTableColumnHeader
            className="justify-end"
            column={column}
            title={t("components.openTrades.table.current")}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.currentPrice.toLocaleString("en-US", {
              style: "currency",
              currency: row.original.currency,
            })}
          </div>
        ),
      },
      {
        accessorKey: "unrealizedPL",
        header: ({ column }) => (
          <DataTableColumnHeader
            className="justify-end"
            column={column}
            title={t("components.openTrades.table.pl")}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <GainAmount value={row.original.unrealizedPL} currency={row.original.currency} />
          </div>
        ),
      },
      {
        accessorKey: "unrealizedReturnPercent",
        header: ({ column }) => (
          <DataTableColumnHeader
            className="justify-end"
            column={column}
            title={t("components.openTrades.table.returnPercent")}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <GainPercent value={row.original.unrealizedReturnPercent} />
          </div>
        ),
      },
      {
        accessorKey: "daysOpen",
        header: ({ column }) => (
          <DataTableColumnHeader
            className="justify-center"
            column={column}
            title={t("components.openTrades.table.days")}
          />
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge variant="outline" className="text-xs">
              {row.original.daysOpen}
            </Badge>
          </div>
        ),
      },
    ],
    [t],
  );

  const filters = useMemo(
    () => [
      {
        id: "account",
        title: t("components.openTrades.filter.account"),
        options: uniqueAccounts,
      },
    ],
    [t, uniqueAccounts],
  );

  return (
    <DataTable
      data={positions}
      columns={columns}
      searchBy={showSearch ? "symbol" : undefined}
      filters={showFilters ? filters : undefined}
      showColumnToggle={true}
      defaultSorting={[{ id: "daysOpen", desc: false }]}
      scrollable={false}
    />
  );
}
