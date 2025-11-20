import { searchActivities } from "@/commands/activity";
import { useQuery } from "@tanstack/react-query";
import { ActivityType } from "@/lib/constants";

export function usePortfolioDividends() {
  return useQuery({
    queryKey: ["portfolio-dividends"],
    queryFn: async () => {
      const response = await searchActivities(
        0,
        10000, // Fetch a large number to ensure we get all dividends
        { activityType: [ActivityType.DIVIDEND] },
        "",
        { id: "date", desc: true },
      );

      // Aggregate dividends by symbol
      const dividendsMap = new Map<string, number>();
      
      for (const activity of response.data) {
        const symbol = activity.assetSymbol;
        const amount = activity.amount || 0;
        
        if (symbol) {
          const current = dividendsMap.get(symbol) || 0;
          dividendsMap.set(symbol, current + amount);
        }
      }

      return dividendsMap;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
