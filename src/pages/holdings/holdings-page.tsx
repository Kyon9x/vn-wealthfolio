import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AmountDisplay, AnimatedToggleGroup } from "@wealthfolio/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AccountSelector } from "@/components/account-selector";
import type { SwipablePageView } from "@/components/page";
import { SwipablePage } from "@/components/page";
import { useAccounts } from "@/hooks/use-accounts";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";
import { useHoldings } from "@/hooks/use-holdings";
import { usePlatform } from "@/hooks/use-platform";
import { usePortfolioDividends } from "@/hooks/use-portfolio-dividends";
import { PORTFOLIO_ACCOUNT_ID } from "@/lib/constants";
import { useSettingsContext } from "@/lib/settings-provider";
import { Account, Holding, HoldingType, Instrument } from "@/lib/types";
import { AccountAllocationChart } from "./components/account-allocation-chart";
import { CashHoldingsWidget } from "./components/cash-holdings-widget";
import { ClassesChart } from "./components/classes-chart";
import { PortfolioComposition } from "./components/composition-chart";
import { CountryChart } from "./components/country-chart";
import { HoldingCurrencyChart } from "./components/currency-chart";
import { HoldingsMobileFilterSheet } from "./components/holdings-mobile-filter-sheet";
import { HoldingsTable } from "./components/holdings-table";
import { HoldingsTableMobile } from "./components/holdings-table-mobile";
import { SectorsChart } from "./components/sectors-chart";

// Define a type for the filter criteria
type SheetFilterType = "class" | "sector" | "country" | "currency" | "account" | "composition";

export const HoldingsPage = () => {
  const { t } = useTranslation("holdings");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>({
    id: PORTFOLIO_ACCOUNT_ID,
    name: t("page.allPortfolio"),
    accountType: "PORTFOLIO" as unknown as Account["accountType"],
    balance: 0,
    currency: "USD",
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Account);

  const { settings } = useSettingsContext();

  const { holdings, isLoading } = useHoldings(selectedAccount?.id ?? PORTFOLIO_ACCOUNT_ID);
  const { data: dividendsMap } = usePortfolioDividends();
  const { accounts } = useAccounts();
  const { isMobile: isMobilePlatform } = usePlatform();
  const triggerHaptic = useHapticFeedback();

  // Adjust holdings with dividends
  const adjustedHoldings = useMemo(() => {
    if (!holdings) return null;
    if (!dividendsMap) return holdings;

    return holdings.map((holding) => {
      const symbol = holding.instrument?.symbol;
      if (!symbol) return holding;

      const totalDividends = dividendsMap.get(symbol) || 0;
      if (totalDividends === 0) return holding;

      // Clone holding to avoid mutating original data
      const adjusted = { ...holding };
      
      // Adjust total gain: Original Gain + Total Dividends
      if (adjusted.totalGain) {
        const adjustedLocalGain = (adjusted.totalGain.local || 0) + totalDividends;
        
        // Calculate base gain using fxRate if available
        // fxRate is typically Local -> Base rate (e.g. 0.000043 for VND->USD)
        const fxRate = adjusted.fxRate ?? 1;
        // If we don't have fxRate, we can try to infer it from existing values if possible, 
        // or just fallback to adding totalDividends if we assume currencies match (risky but better than nothing)
        // But we have fxRate on the holding object usually.
        
        // If totalGain.base exists, we should update it too
        const originalBaseGain = adjusted.totalGain.base || 0;
        const dividendsInBase = totalDividends * fxRate;
        
        adjusted.totalGain = {
          ...adjusted.totalGain,
          local: adjustedLocalGain,
          base: originalBaseGain + dividendsInBase,
        };
      }

      // Adjust cost basis: Cost Basis - Total Dividends
      if (adjusted.costBasis) {
        const originalCostLocal = adjusted.costBasis.local || 0;
        const adjustedCostLocal = Math.max(0, originalCostLocal - totalDividends);
        
        const fxRate = adjusted.fxRate ?? 1;
        const originalCostBase = adjusted.costBasis.base || 0;
        const dividendsInBase = totalDividends * fxRate;
        const adjustedCostBase = Math.max(0, originalCostBase - dividendsInBase);

        adjusted.costBasis = {
          ...adjusted.costBasis,
          local: adjustedCostLocal,
          base: adjustedCostBase,
        };
      }

      // Recalculate total gain percent
      if (adjusted.marketValue?.local && adjusted.costBasis?.local) {
        const cost = adjusted.costBasis.local;
        const value = adjusted.marketValue.local;
        if (cost > 0) {
          adjusted.totalGainPct = (value - cost) / cost;
        } else {
          adjusted.totalGainPct = 0; // Or handle infinite return
        }
      }

      return adjusted;
    });
  }, [holdings, dividendsMap]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetFilterType, setSheetFilterType] = useState<SheetFilterType | null>(null);
  const [sheetFilterName, setSheetFilterName] = useState<string | null>(null);
  const [sheetCompositionFilter, setSheetCompositionFilter] = useState<Instrument["id"] | null>(
    null,
  );

  // Mobile filter state
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const handleChartSectionClick = (
    type: SheetFilterType,
    name: string,
    title?: string,
    compositionId?: Instrument["id"],
    _accountIdsForFilter?: string[],
  ) => {
    setSheetFilterType(type);
    setSheetFilterName(name);
    setSheetTitle(title ?? t("page.detailsFor", { name }));
    if (type === "composition" && compositionId) {
      setSheetCompositionFilter(compositionId);
    } else {
      setSheetCompositionFilter(null);
    }
    setIsSheetOpen(true);
  };

  const holdingsForSheet = useMemo(() => {
    if (!sheetFilterType || !adjustedHoldings) {
      return [];
    }

    let filteredHoldings: Holding[] = [];

    switch (sheetFilterType) {
      case "class":
        filteredHoldings = adjustedHoldings.filter((h) => {
          const isCash = h.holdingType === HoldingType.CASH;
          const assetSubClass = isCash ? t("page.cash") : (h.instrument?.assetSubclass ?? "Other");
          return assetSubClass === sheetFilterName;
        });
        break;
      case "sector":
        filteredHoldings = adjustedHoldings.filter((h) =>
          h.instrument?.sectors?.some((s) => s.name === sheetFilterName),
        );
        break;
      case "country":
        filteredHoldings = adjustedHoldings.filter((h) =>
          h.instrument?.countries?.some((c) => c.name === sheetFilterName),
        );
        break;
      case "currency":
        filteredHoldings = adjustedHoldings.filter((h) => h.localCurrency === sheetFilterName);
        break;
      case "composition":
        if (sheetCompositionFilter) {
          filteredHoldings = adjustedHoldings.filter((h) => h.instrument?.id === sheetCompositionFilter);
        } else if (sheetFilterName) {
          filteredHoldings = adjustedHoldings.filter(
            (h) =>
              h.instrument?.assetSubclass === sheetFilterName ||
              h.instrument?.assetClass === sheetFilterName,
          );
        }
        break;
      default:
        break;
    }

    return filteredHoldings.sort((a, b) => {
      const bBase = b.marketValue?.base ?? 0;
      const aBase = a.marketValue?.base ?? 0;
      return Number(bBase) - Number(aBase);
    });
  }, [adjustedHoldings, sheetFilterType, sheetFilterName, sheetCompositionFilter]);

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
  };

  const { cashHoldings, nonCashHoldings, filteredNonCashHoldings } = useMemo(() => {
    const currentHoldings = adjustedHoldings || [];
    const cash =
      currentHoldings.filter((holding) => holding.holdingType?.toLowerCase() === HoldingType.CASH) ?? [];
    const nonCash =
      currentHoldings.filter((holding) => holding.holdingType?.toLowerCase() !== HoldingType.CASH) ?? [];

    // Apply asset type filter
    const filtered =
      selectedTypes.length > 0
        ? nonCash.filter(
            (holding) =>
              holding.instrument?.assetSubclass &&
              selectedTypes.includes(holding.instrument.assetSubclass),
          )
        : nonCash;

    return { cashHoldings: cash, nonCashHoldings: nonCash, filteredNonCashHoldings: filtered };
  }, [adjustedHoldings, selectedTypes]);

  const hasActiveFilters = useMemo(() => {
    const hasAccountFilter = selectedAccount?.id !== PORTFOLIO_ACCOUNT_ID;
    const hasTypeFilter = selectedTypes.length > 0;
    return hasAccountFilter || hasTypeFilter;
  }, [selectedAccount, selectedTypes]);

  const renderHoldingsView = () => (
    <div className="space-y-4 p-2 lg:p-4">
      <div className="hidden md:block">
        <HoldingsTable holdings={filteredNonCashHoldings ?? []} isLoading={isLoading} />
      </div>
      <div className="block md:hidden">
        <HoldingsTableMobile
          holdings={nonCashHoldings ?? []}
          isLoading={isLoading}
          selectedTypes={selectedTypes}
          setSelectedTypes={setSelectedTypes}
          selectedAccount={selectedAccount}
          accounts={accounts ?? []}
          onAccountChange={handleAccountSelect}
          showSearch={true}
          showFilterButton={false}
        />
      </div>
    </div>
  );

  const renderAnalyticsView = () => (
    <div className="space-y-4 p-2 lg:p-4">
      {/* Cash Holdings Widget */}
      <CashHoldingsWidget cashHoldings={cashHoldings ?? []} isLoading={isLoading} />

      {/* Top row: Summary widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HoldingCurrencyChart
          holdings={[...cashHoldings, ...filteredNonCashHoldings]}
          baseCurrency={settings?.baseCurrency ?? "USD"}
          isLoading={isLoading}
          onCurrencySectionClick={(currencyName) =>
            handleChartSectionClick(
              "currency",
              currencyName,
              t("charts.holdingsIn", { name: currencyName }),
            )
          }
        />

        <AccountAllocationChart isLoading={isLoading} />

        <ClassesChart
          holdings={[...cashHoldings, ...filteredNonCashHoldings]}
          isLoading={isLoading}
          onClassSectionClick={(className) =>
            handleChartSectionClick("class", className, t("charts.assetClass", { name: className }))
          }
        />

        <CountryChart
          holdings={filteredNonCashHoldings}
          isLoading={isLoading}
          onCountrySectionClick={(countryName) =>
            handleChartSectionClick(
              "country",
              countryName,
              t("charts.holdingsIn", { name: countryName }),
            )
          }
        />
      </div>

      {/* Second row: Composition and Sector */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="col-span-1 lg:col-span-3">
          <PortfolioComposition holdings={filteredNonCashHoldings ?? []} isLoading={isLoading} />
        </div>

        {/* Sectors Chart - Now self-contained */}
        <div className="col-span-1">
          <SectorsChart
            holdings={filteredNonCashHoldings}
            isLoading={isLoading}
            onSectorSectionClick={(sectorName) =>
              handleChartSectionClick(
                "sector",
                sectorName,
                t("charts.sector", { name: sectorName }),
              )
            }
          />
        </div>
      </div>
    </div>
  );

  const views: SwipablePageView[] = [
    { value: "holdings", label: t("page.viewHoldings"), content: renderHoldingsView() },
    { value: "analytics", label: t("page.viewInsights"), content: renderAnalyticsView() },
  ];

  const filterButton = (
    <Button
      variant="outline"
      size="icon"
      className="relative size-9 flex-shrink-0"
      onClick={() => setIsFilterSheetOpen(true)}
    >
      <Icons.ListFilter className="h-4 w-4" />
      {hasActiveFilters && (
        <span className="bg-destructive absolute top-0.5 right-0 h-2 w-2 rounded-full" />
      )}
    </Button>
  );

  const renderActions = (currentView: string, onViewChange: (view: string) => void) => (
    <div className="flex items-center gap-2">
      {/* Mobile: Only show filter button */}
      <div className="md:hidden">{filterButton}</div>

      {/* Desktop: Show account selector + toggle */}
      <div className="hidden md:flex md:items-center md:gap-2">
        <AccountSelector
          selectedAccount={selectedAccount}
          setSelectedAccount={handleAccountSelect}
          variant="dropdown"
          includePortfolio={true}
          className="h-9"
        />
        <AnimatedToggleGroup
          items={views.map((v) => ({ value: v.value, label: v.label }))}
          value={currentView}
          onValueChange={onViewChange}
          className="max-w-full"
        />
      </div>
    </div>
  );

  return (
    <>
      <SwipablePage
        views={views}
        heading={t("page.title")}
        defaultView="holdings"
        isMobile={isMobilePlatform}
        actions={renderActions}
        withPadding={false}
        onViewChange={triggerHaptic}
      />

      {/* Mobile Filter Sheet */}
      <HoldingsMobileFilterSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        selectedAccount={selectedAccount}
        accounts={accounts ?? []}
        onAccountChange={handleAccountSelect}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
      />

      {/* Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          className="w-full overflow-y-auto sm:max-w-lg [&>button]:top-[max(calc(env(safe-area-inset-top,0px)+1rem),2.5rem)]"
          style={{
            paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)",
          }}
        >
          <SheetHeader className="mt-8">
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="py-8">
            {holdingsForSheet.length > 0 ? (
              <ul className="space-y-2">
                {holdingsForSheet.map((holding) => {
                  let displayName = "N/A";
                  let symbol = "-";
                  if (holding.holdingType === HoldingType.CASH) {
                    displayName = holding.localCurrency
                      ? `Cash (${holding.localCurrency})`
                      : "Cash";
                    symbol = `$CASH-${holding.localCurrency}`;
                  } else if (holding.instrument) {
                    displayName =
                      holding.instrument.name ?? holding.instrument.symbol ?? "Unnamed Security";
                    symbol = holding.instrument.symbol ?? "-";
                  }

                  return (
                    <Card key={holding.id} className="flex items-center justify-between text-sm">
                      <CardHeader className="flex w-full flex-row items-center justify-between space-x-2 p-4">
                        <div className="flex items-center space-x-2">
                          <Badge className="flex min-w-[50px] cursor-pointer items-center justify-center rounded-sm">
                            {symbol}
                          </Badge>
                          <CardTitle className="line-clamp-1 text-sm font-normal">
                            {displayName}
                          </CardTitle>
                        </div>
                        <div className="text-right font-semibold">
                          <AmountDisplay
                            value={Number(holding.marketValue?.base ?? 0)}
                            currency={holding.baseCurrency}
                          />
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </ul>
            ) : (
              <p>{t("page.noHoldings")}</p>
            )}
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">{t("page.close")}</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default HoldingsPage;
