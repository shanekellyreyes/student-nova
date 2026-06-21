export type SignalCount = {
  label: string;
  count: number;
};

export type TrendingOpportunity = {
  id: string;
  title: string;
  count: number;
};

export type SignalsApiResponse = {
  redisPowered: boolean;
  degraded: boolean;
  topCities: SignalCount[];
  topInterests: SignalCount[];
  topSupportTypes: SignalCount[];
  topOpportunities: TrendingOpportunity[];
};

export function signalsHaveData(signals: SignalsApiResponse): boolean {
  return (
    signals.topCities.length > 0 ||
    signals.topInterests.length > 0 ||
    signals.topSupportTypes.length > 0 ||
    signals.topOpportunities.length > 0
  );
}
